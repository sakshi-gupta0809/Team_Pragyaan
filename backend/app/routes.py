import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import time
from . import models, schemas, database
from .logging_utils import add_log_context  # Import from the dedicated logging module

# Configure logger
logger = logging.getLogger(__name__)

# Create router with explicit CORS support
router = APIRouter()

# Note: The log_request_details function has been replaced by comprehensive middleware
# in main.py. For custom logging details in specific endpoints, use add_log_context()

# -------------------- DB Dependency --------------------
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -------------------- AI Service Placeholders --------------------
class AIService:
    @staticmethod
    def optimal_send_time(contact):
        # Placeholder: Calculate optimal send time
        return datetime.utcnow()

    @staticmethod
    def success_prediction(contact, email_body):
        # Placeholder: Predict success probability
        return 0.75

    @staticmethod
    def compliance_check(email_body):
        # Placeholder: GDPR / spam check
        return True


# -------------------- Users --------------------
@router.post("/users/", response_model=schemas.User)
def create_user(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Add custom context to request logs
    add_log_context(request, operation="create_user", email=user.email)
    
    # Check if user already exists
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        # Add context about the error
        add_log_context(request, error="email_exists")
        logger.warning(f"User creation failed: Email already registered: {user.email}")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create the user
    new_user = models.User(name=user.name, email=user.email)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Add success context
    add_log_context(request, user_id=new_user.id, status="success")
    logger.info(f"User created successfully with ID: {new_user.id}")
    return new_user


@router.get("/users/", response_model=List[schemas.User])
def get_users(request: Request, db: Session = Depends(get_db)):
    # Add request context
    add_log_context(request, operation="get_users")
    
    # Get users
    users = db.query(models.User).all()
    
    # Add result context
    add_log_context(request, user_count=len(users), status="success")
    logger.info(f"Retrieved {len(users)} users")
    return users


# -------------------- Campaigns --------------------
@router.options("/campaigns/")
async def campaign_options():
    # Handle OPTIONS request for CORS preflight
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600",
    }
    return JSONResponse(content={}, headers=headers)

@router.post("/campaigns/", response_model=schemas.Campaign)
def create_campaign(request: Request, campaign: schemas.CampaignCreate, db: Session = Depends(get_db)):
    # Add initial context
    add_log_context(request, operation="create_campaign", campaign_name=campaign.name)
    
    # Add CORS headers to the response
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
    
    try:
        # Create the campaign
        new_campaign = models.Campaign(name=campaign.name, description=campaign.description)
        db.add(new_campaign)
        db.commit()
        db.refresh(new_campaign)
        
        # Add success context
        add_log_context(request, campaign_id=new_campaign.id, status="success")
        logger.info(f"Campaign created successfully with ID: {new_campaign.id}")
        
        # Return the campaign model - FastAPI will handle the response serialization
        response = JSONResponse(
            content={
                "id": new_campaign.id,
                "name": new_campaign.name,
                "description": new_campaign.description,
                "created_at": new_campaign.created_at.isoformat() if hasattr(new_campaign, "created_at") else None
            },
            headers=headers
        )
        return response
    except Exception as e:
        # Add error context
        add_log_context(request, status="error", error_type=type(e).__name__)
        logger.error(f"Failed to create campaign: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Failed to create campaign"},
            headers=headers
        )


@router.get("/campaigns/", response_model=List[schemas.Campaign])
def get_campaigns(request: Request, db: Session = Depends(get_db)):
    # Add request context
    add_log_context(request, operation="get_campaigns")
    
    # Add CORS headers to the response
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
    
    # Get campaigns
    campaigns = db.query(models.Campaign).all()
    
    # Add result context
    add_log_context(request, campaign_count=len(campaigns), status="success")
    logger.info(f"Retrieved {len(campaigns)} campaigns")
    
    # Serialize campaigns to JSON
    campaign_list = []
    for campaign in campaigns:
        campaign_list.append({
            "id": campaign.id,
            "name": campaign.name,
            "description": campaign.description,
            "created_at": campaign.created_at.isoformat() if hasattr(campaign, "created_at") else None
        })
    
    return JSONResponse(content=campaign_list, headers=headers)


# -------------------- Contacts --------------------
@router.post("/campaigns/{campaign_id}/contacts/", response_model=schemas.Contact)
def add_contact(request: Request, campaign_id: int, contact: schemas.ContactCreate, db: Session = Depends(get_db)):
    # Add initial context to logs
    add_log_context(request, operation="add_contact", campaign_id=campaign_id, contact_email=contact.email)
    
    # Check if campaign exists
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        add_log_context(request, error="campaign_not_found")
        logger.warning(f"Contact creation failed: Campaign ID {campaign_id} not found")
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Check if contact with same email already exists
    existing_contact = db.query(models.Contact).filter(models.Contact.email == contact.email).first()
    if existing_contact:
        add_log_context(request, existing_contact_id=existing_contact.id, status="duplicate_warning")
        logger.warning(f"Contact with email {contact.email} already exists with ID: {existing_contact.id}")
        # You might want to decide if this should be an error or just a warning

    # Create the contact
    new_contact = models.Contact(
        name=contact.name,
        email=contact.email,
        linkedin_url=getattr(contact, "linkedin_url", None),
        extra_data=getattr(contact, "extra_data", {}),
        campaign_id=campaign_id,
    )
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    
    # Add success context
    add_log_context(request, contact_id=new_contact.id, status="success")
    logger.info(f"Contact added successfully with ID: {new_contact.id}")
    return new_contact


@router.get("/campaigns/{campaign_id}/contacts/", response_model=List[schemas.Contact])
def get_contacts(request: Request, campaign_id: int, db: Session = Depends(get_db)):
    # Add request context
    add_log_context(request, operation="get_contacts", campaign_id=campaign_id)
    
    # Check if campaign exists
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        add_log_context(request, error="campaign_not_found")
        logger.warning(f"Get contacts failed: Campaign ID {campaign_id} not found")
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get contacts
    contacts = db.query(models.Contact).filter(models.Contact.campaign_id == campaign_id).all()
    
    # Add result context
    add_log_context(request, contact_count=len(contacts), status="success")
    logger.info(f"Retrieved {len(contacts)} contacts for campaign ID: {campaign_id}")
    return contacts


@router.options("/contacts/")
async def contacts_options():
    # Handle OPTIONS request for CORS preflight
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600",
    }
    return JSONResponse(content={}, headers=headers)

@router.get("/contacts/")
def get_all_contacts(request: Request, db: Session = Depends(get_db)):
    """Get all contacts across all campaigns"""
    # Add request context
    add_log_context(request, operation="get_all_contacts")
    
    # Add CORS headers to the response
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
    
    try:
        # Get all contacts
        contacts = db.query(models.Contact).all()
        
        # Add result context
        add_log_context(request, contact_count=len(contacts), status="success")
        logger.info(f"Retrieved {len(contacts)} contacts across all campaigns")
        
        # Safely serialize contacts to JSON
        contact_list = []
        for contact in contacts:
            # Handle potential None values for optional fields
            contact_dict = {
                "id": contact.id,
                "name": contact.name,
                "email": contact.email,
                "campaign_id": contact.campaign_id,
                "unsubscribed": contact.unsubscribed if hasattr(contact, "unsubscribed") else False
            }
            
            # Add optional fields only if they exist and are not None
            if hasattr(contact, "linkedin_url") and contact.linkedin_url is not None:
                contact_dict["linkedin_url"] = contact.linkedin_url
            else:
                contact_dict["linkedin_url"] = None
                
            # Don't include extra_data in response to avoid serialization issues
            contact_list.append(contact_dict)
        
        return JSONResponse(content=contact_list, headers=headers)
        
    except Exception as e:
        logger.error(f"Error retrieving contacts: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error retrieving contacts: {str(e)}"},
            headers=headers
        )


@router.post("/contacts/import/")
def import_contacts(request: Request, db: Session = Depends(get_db)):
    """Import contacts (simplified version)"""
    # Add initial context
    add_log_context(request, operation="import_contacts", source="sample_data")
    logger.info("Starting contact import (simplified version)")
    
    try:
        # For testing, let's create some sample contacts
        sample_contacts = [
            {"name": "John Doe", "email": "john@example.com", "campaign_id": 1},
            {"name": "Jane Smith", "email": "jane@example.com", "campaign_id": 1},
            {"name": "Mike Johnson", "email": "mike@example.com", "campaign_id": 1}
        ]
        
        # Update log context with batch size information
        add_log_context(request, batch_size=len(sample_contacts))
        
        imported_count = 0
        errors = []
        skipped_count = 0
        
        logger.info(f"Processing {len(sample_contacts)} sample contacts")
        for contact_data in sample_contacts:
            # Check if contact already exists
            existing = db.query(models.Contact).filter(models.Contact.email == contact_data["email"]).first()
            
            if not existing:
                # Create new contact
                contact = models.Contact(
                    name=contact_data["name"],
                    email=contact_data["email"],
                    campaign_id=contact_data["campaign_id"]
                )
                db.add(contact)
                imported_count += 1
                logger.info(f"Adding contact: {contact_data['email']}")
            else:
                skipped_count += 1
                logger.info(f"Skipping existing contact: {contact_data['email']}")
        
        # Commit changes
        db.commit()
        
        # Update final status in log context
        add_log_context(
            request,
            imported_count=imported_count,
            skipped_count=skipped_count,
            error_count=len(errors),
            status="success"
        )
        
        logger.info(f"Contact import completed. Imported {imported_count} contacts with {len(errors)} errors")
        return {
            "imported_count": imported_count,
            "skipped_count": skipped_count,
            "errors": errors,
            "note": "This is a simplified version of the contact import function"
        }
    except Exception as e:
        # Log error details
        add_log_context(request, status="error", error_type=type(e).__name__)
        logger.error(f"Contact import failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


# -------------------- Email Templates --------------------
@router.post("/campaigns/{campaign_id}/templates/", response_model=schemas.EmailTemplate)
def create_template(request: Request, campaign_id: int, template: schemas.EmailTemplateCreate, db: Session = Depends(get_db)):
    # Add initial context
    add_log_context(request, operation="create_template", campaign_id=campaign_id, subject=template.subject[:30])
    
    # Check if campaign exists
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        add_log_context(request, error="campaign_not_found")
        logger.warning(f"Template creation failed: Campaign ID {campaign_id} not found")
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Create template
    new_template = models.EmailTemplate(
        subject=template.subject,
        body=template.body,
        campaign_id=campaign_id
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    
    # Add success context
    add_log_context(request, template_id=new_template.id, status="success")
    logger.info(f"Email template created successfully with ID: {new_template.id} for campaign: {campaign_id}")
    return new_template


@router.get("/campaigns/{campaign_id}/templates/", response_model=List[schemas.EmailTemplate])
def get_templates(request: Request, campaign_id: int, db: Session = Depends(get_db)):
    # Add request context
    add_log_context(request, operation="get_templates", campaign_id=campaign_id)
    
    # Check if campaign exists
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        add_log_context(request, error="campaign_not_found")
        logger.warning(f"Get templates failed: Campaign ID {campaign_id} not found")
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get templates
    templates = db.query(models.EmailTemplate).filter(models.EmailTemplate.campaign_id == campaign_id).all()
    
    # Add result context
    add_log_context(request, template_count=len(templates), status="success")
    logger.info(f"Retrieved {len(templates)} templates for campaign ID: {campaign_id}")
    return templates


# -------------------- Email Logs --------------------
@router.post("/campaigns/{campaign_id}/generate-emails/")
def generate_emails(request: Request, campaign_id: int, template_id: int, db: Session = Depends(get_db)):
    # Add initial context
    add_log_context(request, operation="generate_emails", campaign_id=campaign_id, template_id=template_id)
    
    # Check campaign and template existence
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    template = db.query(models.EmailTemplate).filter(models.EmailTemplate.id == template_id).first()
    
    if not campaign:
        add_log_context(request, error="campaign_not_found")
        logger.warning(f"Email generation failed: Campaign ID {campaign_id} not found")
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    if not template:
        add_log_context(request, error="template_not_found")
        logger.warning(f"Email generation failed: Template ID {template_id} not found")
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Update context with contact count
    contact_count = len(campaign.contacts) if hasattr(campaign, "contacts") else 0
    add_log_context(request, contact_count=contact_count)
    logger.info(f"Generating emails for {contact_count} contacts in campaign '{campaign.name}'")
    
    compliance_rejected = 0
    email_logs = []
    
    for contact in campaign.contacts:
        # AI compliance check
        compliance_result = AIService.compliance_check(template.body)
        if not compliance_result:
            compliance_rejected += 1
            continue

        # Personalize body
        body = template.body.format(name=contact.name)

        # AI predicted send time
        send_time = AIService.optimal_send_time(contact)

        # Create email log
        email = models.EmailLog(
            recipient_email=contact.email,
            subject=template.subject,
            body=body,
            status="pending",
            campaign_id=campaign_id
        )
        db.add(email)
        db.commit()
        db.refresh(email)

        # Create schedule
        schedule = models.Schedule(
            send_time=send_time,
            is_holiday=False,
            email_log_id=email.id
        )
        db.add(schedule)
        db.commit()

        email_logs.append(email)
    
    # Add final status to log context
    add_log_context(
        request,
        emails_created=len(email_logs),
        compliance_rejected=compliance_rejected,
        status="success"
    )
    
    logger.info(f"Email generation completed: {len(email_logs)} emails created, {compliance_rejected} rejected by compliance check")
    return {"emails_created": len(email_logs), "compliance_rejected": compliance_rejected}


@router.get("/campaigns/{campaign_id}/emails/", response_model=List[schemas.EmailLog])
def get_emails(request: Request, campaign_id: int, db: Session = Depends(get_db)):
    # Add request context
    add_log_context(request, operation="get_emails", campaign_id=campaign_id)
    
    # Check if campaign exists
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        add_log_context(request, error="campaign_not_found")
        logger.warning(f"Get emails failed: Campaign ID {campaign_id} not found")
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get emails
    emails = db.query(models.EmailLog).filter(models.EmailLog.campaign_id == campaign_id).all()
    
    # Add result context
    add_log_context(request, email_count=len(emails), status="success")
    logger.info(f"Retrieved {len(emails)} emails for campaign ID: {campaign_id}")
    return emails


# -------------------- Follow-ups --------------------
@router.post("/campaigns/{campaign_id}/followups/", response_model=schemas.FollowUp)
def create_followup(request: Request, campaign_id: int, followup: schemas.FollowUpCreate, db: Session = Depends(get_db)):
    # Add initial context
    add_log_context(request, operation="create_followup", campaign_id=campaign_id, delay_days=followup.delay_days)
    
    # Check if campaign exists
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        add_log_context(request, error="campaign_not_found")
        logger.warning(f"Followup creation failed: Campaign ID {campaign_id} not found")
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Create followup
    new_followup = models.FollowUp(
        delay_days=followup.delay_days,
        body=followup.body,
        campaign_id=campaign_id
    )
    db.add(new_followup)
    db.commit()
    db.refresh(new_followup)
    
    # Add success context
    add_log_context(request, followup_id=new_followup.id, status="success")
    logger.info(f"Followup created successfully with ID: {new_followup.id} for campaign: {campaign_id}")
    return new_followup


@router.get("/campaigns/{campaign_id}/followups/", response_model=List[schemas.FollowUp])
def get_followups(request: Request, campaign_id: int, db: Session = Depends(get_db)):
    # Add request context
    add_log_context(request, operation="get_followups", campaign_id=campaign_id)
    
    # Check if campaign exists
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        add_log_context(request, error="campaign_not_found")
        logger.warning(f"Get followups failed: Campaign ID {campaign_id} not found")
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get followups
    followups = db.query(models.FollowUp).filter(models.FollowUp.campaign_id == campaign_id).all()
    
    # Add result context
    add_log_context(request, followup_count=len(followups), status="success")
    logger.info(f"Retrieved {len(followups)} followups for campaign ID: {campaign_id}")
    return followups


# -------------------- Schedules --------------------
@router.post("/emails/{email_id}/schedule/", response_model=schemas.Schedule)
def schedule_email(request: Request, email_id: int, schedule: schemas.ScheduleCreate, db: Session = Depends(get_db)):
    # Add initial context
    add_log_context(
        request,
        operation="schedule_email",
        email_id=email_id,
        scheduled_time=schedule.send_time.isoformat()
    )
    
    # Check if email exists
    email = db.query(models.EmailLog).filter(models.EmailLog.id == email_id).first()
    if not email:
        add_log_context(request, error="email_not_found")
        logger.warning(f"Schedule creation failed: Email ID {email_id} not found")
        raise HTTPException(status_code=404, detail="Email not found")
    
    # Create schedule
    new_schedule = models.Schedule(
        send_time=schedule.send_time,
        is_holiday=schedule.is_holiday,
        email_log_id=email_id
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    
    # Add success context
    add_log_context(
        request,
        schedule_id=new_schedule.id,
        recipient=email.recipient_email,
        status="success"
    )
    logger.info(f"Email scheduled successfully for {schedule.send_time} with ID: {new_schedule.id}")
    return new_schedule


@router.get("/emails/schedules/", response_model=List[schemas.Schedule])
def get_schedules(request: Request, db: Session = Depends(get_db)):
    # Add request context
    add_log_context(request, operation="get_schedules")
    
    # Get schedules
    schedules = db.query(models.Schedule).all()
    
    # Add result context
    add_log_context(request, schedule_count=len(schedules), status="success")
    logger.info(f"Retrieved {len(schedules)} email schedules")
    return schedules