from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional
from .models import Contact, Campaign
from .database import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.options("/contacts")
async def contacts_options():
    # Handle OPTIONS request for CORS preflight
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600",
    }
    return JSONResponse(content={}, headers=headers)

@router.get("/contacts")
def get_contacts(
    search: Optional[str] = Query(None),
    campaign_id: Optional[int] = Query(None),
    status: Optional[str] = Query("all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    # Add CORS headers to the response
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
    
    query = db.query(Contact).options(joinedload(Contact.campaign))
    if search:
        query = query.filter(or_(Contact.name.ilike(f"%{search}%"), Contact.email.ilike(f"%{search}%")))
    if campaign_id:
        query = query.filter(Contact.campaign_id == campaign_id)
    if status == "subscribed":
        query = query.filter(Contact.unsubscribed == False)
    elif status == "unsubscribed":
        query = query.filter(Contact.unsubscribed == True)
    total = query.count()
    contacts = query.order_by(Contact.id).offset((page - 1) * page_size).limit(page_size).all()
    contact_list = []
    for c in contacts:
        contact_list.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "campaign_name": c.campaign.name if c.campaign else None,
            "unsubscribed": c.unsubscribed,
            "linkedin_url": c.linkedin_url
        })
    return JSONResponse(
        content={
            "total": total,
            "page": page,
            "page_size": page_size,
            "contacts": contact_list
        },
        headers=headers
    )

@router.options("/campaigns")
async def campaigns_options():
    # Handle OPTIONS request for CORS preflight
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600",
    }
    return JSONResponse(content={}, headers=headers)

@router.get("/campaigns")
def get_campaigns(db: Session = Depends(get_db)):
    # Add CORS headers to the response
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
    
    campaigns = db.query(Campaign).order_by(Campaign.name).all()
    campaign_list = [{"id": c.id, "name": c.name} for c in campaigns]
    
    return JSONResponse(content=campaign_list, headers=headers)
