# backend/app/api/campaigns.py (ensure it has)
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.models import Campaign
from app.schemas import CampaignOut
from app.database import get_db

router = APIRouter()

@router.get("/campaigns", response_model=List[CampaignOut])
def get_campaigns(db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).order_by(Campaign.name.asc()).all()
    return campaigns
