# backend/app/api_campaigns.py
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime
from .models import Campaign, Contact, EmailLog
from .schemas import Campaign as CampaignSchema
from .schemas import CampaignCreate, CampaignResponse, PaginatedCampaigns
from .database import get_db

router = APIRouter()

# Debug endpoint to check if the router is accessible
@router.get("/campaigns/debug")
def debug_campaigns():
    return {"message": "Campaigns API is working"}

@router.get("/campaigns/", response_model=List[CampaignSchema])
def get_campaigns(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Get all campaigns (basic list without pagination)"""
    campaigns = db.query(Campaign).order_by(Campaign.name.asc()).offset(skip).limit(limit).all()
    return campaigns

@router.get("/campaigns/paginated/", response_model=PaginatedCampaigns)
def get_paginated_campaigns(
    db: Session = Depends(get_db),
    page: int = Query(1, gt=0),
    page_size: int = Query(10, gt=0, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """Get campaigns with pagination, filtering and search"""
    query = db.query(Campaign)
    
    try:
        # Apply filters
        if status:
            query = query.filter(Campaign.status == status)
        
        if search:
            query = query.filter(Campaign.name.ilike(f"%{search}%"))
        
        # Get total count for pagination
        total = query.count()
        
        # Apply pagination - only use created_at since updated_at doesn't exist in database
        campaigns = query.order_by(desc(Campaign.created_at)).offset((page - 1) * page_size).limit(page_size).all()
        
        # Format campaign data for response
        campaign_responses = []
        for campaign in campaigns:
            try:
                # Format last edited time - use created_at for now until database is updated
                try:
                    last_edited = campaign.created_at.strftime("Created %b %d, %Y %I:%M %p") if campaign.created_at else "Unknown date"
                except Exception:
                    last_edited = "Unknown date"
                
                # Format statistics - safely handle if fields are missing
                recipients = str(campaign.recipient_count) if hasattr(campaign, 'recipient_count') and campaign.recipient_count > 0 else "-"
                opens = str(campaign.open_count) if hasattr(campaign, 'open_count') and campaign.open_count > 0 else "-"
                clicks = str(campaign.click_count) if hasattr(campaign, 'click_count') and campaign.click_count > 0 else "-"
                unsubscribed = str(campaign.unsubscribe_count) if hasattr(campaign, 'unsubscribe_count') and campaign.unsubscribe_count > 0 else "-"
                
                # Get status safely
                status = campaign.status.capitalize() if hasattr(campaign, 'status') and campaign.status else "Draft"
                
                # Create response object
                campaign_response = {
                    "id": f"#{campaign.id}",
                    "name": campaign.name,
                    "status": status,
                    "last_edited": last_edited,
                    "recipients": recipients,
                    "opens": opens,
                    "clicks": clicks,
                    "unsubscribed": unsubscribed
                }
                campaign_responses.append(campaign_response)
            except Exception as e:
                # If there's an error with a specific campaign, log it and continue
                print(f"Error processing campaign {campaign.id}: {str(e)}")
                continue
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "campaigns": campaign_responses
        }
    except Exception as e:
        # Log the full error
        print(f"Error in get_paginated_campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch campaigns: {str(e)}")

@router.post("/campaigns/", response_model=CampaignSchema)
def create_campaign(
    campaign: CampaignCreate,
    db: Session = Depends(get_db)
):
    """Create a new campaign"""
    try:
        # Create a campaign with the enhanced schema
        campaign_data = campaign.dict()
        
        # Make sure created_at is properly set
        now = datetime.now()
        if "created_at" not in campaign_data:
            campaign_data["created_at"] = now
        
        # Remove updated_at to avoid schema issues
        if "updated_at" in campaign_data:
            del campaign_data["updated_at"]
            
        # Create campaign with default values for metrics
        db_campaign = Campaign(
            **campaign_data,
            recipient_count=0,
            open_count=0,
            click_count=0,
            unsubscribe_count=0
        )
        db.add(db_campaign)
    except Exception as e:
        print(f"Error creating campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create campaign: {str(e)}")
    db.commit()
    db.refresh(db_campaign)
    return db_campaign

@router.get("/campaigns/{campaign_id}", response_model=CampaignSchema)
def get_campaign(
    campaign_id: int = Path(..., gt=0),
    db: Session = Depends(get_db)
):
    """Get a specific campaign by ID"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.put("/campaigns/{campaign_id}", response_model=CampaignSchema)
def update_campaign(
    campaign_id: int = Path(..., gt=0),
    campaign: CampaignCreate = None,
    db: Session = Depends(get_db)
):
    """Update a campaign"""
    db_campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not db_campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Update fields
    for key, value in campaign.dict().items():
        setattr(db_campaign, key, value)
    
    db.commit()
    db.refresh(db_campaign)
    return db_campaign

@router.delete("/campaigns/{campaign_id}")
def delete_campaign(
    campaign_id: int = Path(..., gt=0),
    db: Session = Depends(get_db)
):
    """Delete a campaign"""
    db_campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not db_campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    db.delete(db_campaign)
    db.commit()
    return {"message": "Campaign deleted successfully"}

@router.put("/campaigns/{campaign_id}/status")
def update_campaign_status(
    campaign_id: int = Path(..., gt=0),
    status: str = Query(..., regex="^(draft|sent|scheduled|paused)$"),
    db: Session = Depends(get_db)
):
    """Update a campaign's status"""
    db_campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not db_campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    db_campaign.status = status
    db.commit()
    return {"message": f"Campaign status updated to {status}"}