# backend/app/api/contacts.py
from typing import Optional
from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc
from math import ceil

from app.schemas import ContactsListOut, ContactOut
from app.models import Contact, Campaign
from app.database import get_db  # adapt to your project

router = APIRouter()

ALLOWED_SORT_BY = {"id", "name", "email"}

@router.get("/contacts", response_model=ContactsListOut)
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
    q = db.query(Contact).options(joinedload(Contact.campaign))

    if campaign_id:
        q = q.filter(Contact.campaign_id == campaign_id)

    if status == "subscribed":
        q = q.filter(Contact.unsubscribed == False)
    elif status == "unsubscribed":
        q = q.filter(Contact.unsubscribed == True)

    if search:
        term = f"%{search}%"
        q = q.filter(or_(Contact.name.ilike(term), Contact.email.ilike(term)))

    total = q.count()

    if sort_by not in ALLOWED_SORT_BY:
        sort_by = "id"
    sort_col = getattr(Contact, sort_by)
    order = asc(sort_col) if sort_dir == "asc" else desc(sort_col)
    q = q.order_by(order)

    offset = (page - 1) * page_size
    items = q.offset(offset).limit(page_size).all()

    contacts_out = []
    for c in items:
        contacts_out.append(ContactOut(
            id=c.id,
            name=c.name,
            email=c.email,
            campaign_name=c.campaign.name if c.campaign else None,
            unsubscribed=bool(c.unsubscribed),
            linkedin_url=c.linkedin_url
        ))

    total_pages = ceil(total / page_size) if page_size else 1
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "contacts": contacts_out
    }
