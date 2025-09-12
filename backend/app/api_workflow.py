"""
API routes for the campaign workflow functionality.
"""
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Path
from sqlalchemy.orm import Session
from pydantic import BaseModel

from .database import get_db
from . import models, schemas
from .campaign_workflow import CampaignWorkflow

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/workflow",
    tags=["workflow"],
    responses={404: {"description": "Not found"}},
)

# -------------------- Campaign Workflow API --------------------

@router.post("/campaigns/create")
async def create_campaign(
    campaign: schemas.CampaignCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new campaign with the provided data.
    """
    workflow = CampaignWorkflow(db)
    try:
        result = await workflow.create_campaign(campaign)
        return {
            "success": True,
            "campaign_id": result.id,
            "name": result.name
        }
    except Exception as e:
        logger.error(f"Error creating campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating campaign: {str(e)}")

@router.post("/campaigns/{campaign_id}/upload-contacts")
async def upload_contacts(
    campaign_id: int = Path(..., gt=0),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a contacts file (Excel/CSV) for a campaign.
    """
    workflow = CampaignWorkflow(db)
    return await workflow.process_contacts_file(campaign_id, file)

@router.post("/campaigns/{campaign_id}/generate-templates")
async def generate_templates(
    campaign_id: int = Path(..., gt=0),
    db: Session = Depends(get_db)
):
    """
    Generate email templates for each contact category in the campaign.
    """
    workflow = CampaignWorkflow(db)
    return await workflow.generate_templates(campaign_id)

@router.post("/campaigns/{campaign_id}/personalize")
async def personalize_emails(
    campaign_id: int = Path(..., gt=0),
    db: Session = Depends(get_db)
):
    """
    Personalize emails for each contact in the campaign.
    """
    workflow = CampaignWorkflow(db)
    return await workflow.personalize_emails(campaign_id)

@router.post("/campaigns/{campaign_id}/schedule")
async def schedule_campaign(
    campaign_id: int = Path(..., gt=0),
    start_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Schedule a campaign for sending.
    """
    workflow = CampaignWorkflow(db)
    
    # Parse start date if provided
    parsed_date = None
    if start_date:
        try:
            parsed_date = datetime.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (YYYY-MM-DD).")
    
    return await workflow.schedule_campaign(campaign_id, parsed_date)

@router.get("/campaigns/{campaign_id}/export")
async def export_campaign(
    campaign_id: int = Path(..., gt=0),
    db: Session = Depends(get_db)
):
    """
    Export a campaign's personalized emails to CSV.
    """
    workflow = CampaignWorkflow(db)
    csv_path = await workflow.export_campaign_to_csv(campaign_id)
    
    return {
        "success": True,
        "campaign_id": campaign_id,
        "export_path": csv_path
    }

@router.post("/campaigns/run-workflow")
async def run_workflow(
    campaign_name: str = Form(...),
    description: Optional[str] = Form(None),
    scenario: Optional[str] = Form(None),
    start_date: Optional[str] = Form(None),
    followup_gap_days: Optional[int] = Form(2),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Run the full campaign workflow from creation to scheduling.
    """
    workflow = CampaignWorkflow(db)
    
    # Parse start date if provided
    parsed_date = None
    if start_date:
        try:
            parsed_date = datetime.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (YYYY-MM-DD).")
    
    # Create campaign data
    campaign_data = schemas.CampaignCreate(
        name=campaign_name,
        description=description,
        scenario=scenario,
        start_date=parsed_date,
        followup_gap_days=followup_gap_days
    )
    
    return await workflow.run_full_workflow(campaign_data, file)

# -------------------- Category Management API --------------------

@router.get("/categories")
def get_categories():
    """
    Get all available contact categories.
    """
    from .contact_categorization import CONTACT_CATEGORIES
    
    return {
        "categories": list(CONTACT_CATEGORIES.values())
    }

@router.post("/categorize-designation")
def categorize_designation_api(
    designation: str = Form(...)
):
    """
    Categorize a designation/job title into one of the predefined categories.
    """
    from .contact_categorization import categorize_designation
    
    category = categorize_designation(designation)
    
    return {
        "designation": designation,
        "category": category
    }

# -------------------- Template Management API --------------------

@router.get("/scenarios")
def get_scenarios():
    """
    Get all available campaign scenarios.
    """
    from .template_generation import CAMPAIGN_SCENARIOS
    
    return {
        "scenarios": list(CAMPAIGN_SCENARIOS.values())
    }

@router.post("/infer-scenario")
def infer_scenario(
    description: str = Form(...)
):
    """
    Infer the campaign scenario from a description.
    """
    from .template_generation import TemplateGenerator
    
    generator = TemplateGenerator()
    scenario = generator.infer_campaign_scenario(description)
    
    return {
        "description": description,
        "scenario": scenario
    }

@router.get("/templates/preview")
def preview_template(
    category: str = Query(...),
    scenario: str = Query(...),
    step: int = Query(1)
):
    """
    Generate a preview of an email template for a specific category and scenario.
    """
    from .template_generation import TemplateGenerator
    
    generator = TemplateGenerator()
    template = generator.generate_template_for_category(category, scenario, step)
    
    return {
        "category": category,
        "scenario": scenario,
        "step": step,
        "template": template
    }