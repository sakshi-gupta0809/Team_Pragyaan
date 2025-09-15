# backend/app/api_contacts.py
from typing import Optional
from fastapi import APIRouter, Query, Depends, HTTPException, Path
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc
from math import ceil

from .schemas import ContactsListOut, ContactOut
from .models import Contact, Campaign
from .database import get_db

router = APIRouter()

ALLOWED_SORT_BY = {"id", "name", "email"}

@router.get("/contacts/", response_model=ContactsListOut)
def list_contacts(
    search: Optional[str] = Query(None),
    campaign_id: Optional[int] = Query(None),
    status: str = Query("all", regex="^(all|subscribed|unsubscribed)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: str = Query("id"),
    sort_dir: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    # Use select_from and outerjoin instead of options(joinedload) to have more control over what columns are selected
    q = db.query(
        Contact,
        Campaign.id.label("campaign_id"),
        Campaign.name.label("campaign_name"),
    ).select_from(Contact).outerjoin(Campaign, Contact.campaign_id == Campaign.id)

    # Apply filters
    if campaign_id:
        q = q.filter(Contact.campaign_id == campaign_id)

    if status == "subscribed":
        q = q.filter(Contact.unsubscribed == False)
    elif status == "unsubscribed":
        q = q.filter(Contact.unsubscribed == True)

    if search:
        term = f"%{search}%"
        q = q.filter(or_(Contact.name.ilike(term), Contact.email.ilike(term)))

    # Create a query for counting total records (without joins for efficiency)
    count_q = db.query(Contact)
    if campaign_id:
        count_q = count_q.filter(Contact.campaign_id == campaign_id)
    if status == "subscribed":
        count_q = count_q.filter(Contact.unsubscribed == False)
    elif status == "unsubscribed":
        count_q = count_q.filter(Contact.unsubscribed == True)
    if search:
        count_q = count_q.filter(or_(Contact.name.ilike(f"%{search}%"), Contact.email.ilike(f"%{search}%")))
    
    total = count_q.count()

    # Apply sorting
    if sort_by not in ALLOWED_SORT_BY:
        sort_by = "id"
    sort_col = getattr(Contact, sort_by)
    order = asc(sort_col) if sort_dir == "asc" else desc(sort_col)
    q = q.order_by(order)

    offset = (page - 1) * page_size
    items = q.offset(offset).limit(page_size).all()

    contacts_out = []
    for row in items:
        contact = row[0]  # The Contact object
        campaign_name = row.campaign_name  # From the Campaign alias
        
        contacts_out.append(ContactOut(
            id=contact.id,
            name=contact.name,
            email=contact.email,
            campaign_name=campaign_name,
            unsubscribed=bool(contact.unsubscribed),
            linkedin_url=contact.linkedin_url,
            designation=contact.designation,
            company=contact.company,
            category=contact.category,
            last_contacted=contact.last_contacted,
            status=contact.status
        ))

    total_pages = ceil(total / page_size) if page_size else 1
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "contacts": contacts_out
    }


@router.delete("/contacts/{contact_id}")
def delete_contact(
    contact_id: int = Path(..., gt=0),
    db: Session = Depends(get_db)
):
    """Delete a contact by ID"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted successfully"}


@router.get("/contacts/medical-categories")
def get_medical_contact_categories(db: Session = Depends(get_db)):
    """
    Get statistics for medical contacts grouped by their categories.
    This endpoint is specifically designed for the medical dashboard.
    """
    try:
        # Get all contacts
        contacts = db.query(Contact).all()
        
        # Initialize category counters
        categories = {
            "clinical": 0,
            "research": 0,
            "administrative": 0,
            "it": 0,
            "other": 0
        }
        
        # Count contacts by category
        for contact in contacts:
            if not contact.category:
                categories["other"] += 1
                continue
                
            category = contact.category.lower()
            
            if "clinical" in category or "doctor" in category or "nurse" in category or "physician" in category:
                categories["clinical"] += 1
            elif "research" in category or "r&d" in category or "scientist" in category:
                categories["research"] += 1
            elif "admin" in category or "management" in category:
                categories["administrative"] += 1
            elif "it" in category or "tech" in category:
                categories["it"] += 1
            else:
                categories["other"] += 1
        
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch medical categories: {str(e)}")