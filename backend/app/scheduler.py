"""
Email scheduler module for handling scheduled email tasks with business-day awareness.
Handles weekend and holiday-aware scheduling for campaigns and follow-ups.
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
import holidays
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from .database import get_db
from . import models
from .models import Campaign, Contact, EmailLog, Schedule, FollowUp, EmailTemplate

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/scheduler",
    tags=["scheduler"],
    responses={404: {"description": "Not found"}},
)

@router.get("/status")
async def scheduler_status():
    """
    Return the current status of the email scheduler.
    """
    return {
        "status": "active",
        "message": "Email scheduler is running with business-day awareness"
    }

@router.get("/next-business-day")
async def next_business_day(date_str: Optional[str] = None):
    """
    Calculate the next business day from a given date, skipping weekends and holidays.
    If no date is provided, uses the current date.
    """
    if date_str:
        try:
            date = datetime.fromisoformat(date_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (YYYY-MM-DD).")
    else:
        date = datetime.now()
    
    next_day = get_next_business_day(date)
    return {
        "original_date": date.isoformat(),
        "next_business_day": next_day.isoformat(),
        "is_business_day": is_business_day(date)
    }

@router.get("/pending-emails")
async def get_pending_emails(
    db: Session = Depends(get_db),
    limit: int = 100
):
    """
    Get emails scheduled to be sent now or in the past that haven't been sent yet.
    """
    now = datetime.now()
    pending_schedules = db.query(Schedule).join(
        Schedule.email_log
    ).filter(
        Schedule.send_time <= now,
        Schedule.is_sent == False,
        EmailLog.status == "pending"
    ).limit(limit).all()
    
    return {
        "count": len(pending_schedules),
        "schedules": [
            {
                "id": schedule.id,
                "email_id": schedule.email_log_id,
                "recipient": schedule.email_log.recipient_email,
                "subject": schedule.email_log.subject,
                "scheduled_time": schedule.send_time.isoformat()
            }
            for schedule in pending_schedules
        ]
    }

@router.post("/schedule-campaign/{campaign_id}")
async def schedule_campaign(
    campaign_id: int,
    start_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Schedule all emails for a campaign starting from the given date.
    If no date is provided, uses the current date.
    """
    # Validate campaign exists
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Parse start date or use current date
    if start_date:
        try:
            start = datetime.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (YYYY-MM-DD).")
    else:
        start = datetime.now()
    
    # Get the next business day from the start date
    start_business_day = get_next_business_day(start)
    
    # Schedule all emails and follow-ups
    try:
        scheduled_count = schedule_campaign_emails(db, campaign, start_business_day)
        
        # Update campaign status
        campaign.status = "scheduled"
        db.commit()
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "scheduled_emails": scheduled_count,
            "start_date": start_business_day.isoformat(),
            "status": "scheduled"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to schedule campaign {campaign_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to schedule campaign: {str(e)}")

# -------------------- Business Day Functions --------------------

def get_us_holidays(year: Optional[int] = None) -> Dict[datetime, str]:
    """
    Get US federal holidays for the specified year.
    If no year is provided, uses the current year.
    """
    if year is None:
        year = datetime.now().year
    return holidays.US(years=year)

def is_weekend(date: datetime) -> bool:
    """
    Check if a date falls on a weekend (Saturday or Sunday).
    """
    return date.weekday() >= 5  # 5 = Saturday, 6 = Sunday

def is_holiday(date: datetime) -> bool:
    """
    Check if a date is a US federal holiday.
    """
    # Get holidays for the date's year
    us_holidays = get_us_holidays(date.year)
    # Check if the date is in the holidays
    return date.date() in us_holidays

def is_business_day(date: datetime) -> bool:
    """
    Check if a date is a business day (not a weekend or holiday).
    """
    return not (is_weekend(date) or is_holiday(date))

def get_next_business_day(date: datetime) -> datetime:
    """
    Get the next business day from a given date.
    If the date is already a business day, returns the same date.
    """
    # If the date is already a business day, return it
    if is_business_day(date):
        return date
    
    # Otherwise, find the next business day
    next_day = date + timedelta(days=1)
    while not is_business_day(next_day):
        next_day += timedelta(days=1)
    
    return next_day

def add_business_days(date: datetime, days: int) -> datetime:
    """
    Add a specified number of business days to a date.
    """
    if days <= 0:
        return date
    
    result_date = date
    days_added = 0
    
    while days_added < days:
        result_date += timedelta(days=1)
        if is_business_day(result_date):
            days_added += 1
    
    return result_date

# -------------------- Scheduling Functions --------------------

def schedule_campaign_emails(
    db: Session, 
    campaign: Campaign, 
    start_date: datetime
) -> int:
    """
    Schedule all emails for a campaign starting from the given date.
    Returns the number of emails scheduled.
    """
    # Get all contacts for the campaign
    contacts = db.query(Contact).filter(Contact.campaign_id == campaign.id).all()
    if not contacts:
        logger.warning(f"No contacts found for campaign {campaign.id}")
        return 0
    
    # Get templates for the campaign
    templates = db.query(EmailTemplate).filter(EmailTemplate.campaign_id == campaign.id).all()
    if not templates:
        logger.warning(f"No templates found for campaign {campaign.id}")
        return 0
    
    # Get follow-ups for the campaign
    followups = db.query(FollowUp).filter(FollowUp.campaign_id == campaign.id).all()
    
    # Count of scheduled emails
    scheduled_count = 0
    
    # Schedule initial emails for all contacts
    current_date = start_date
    for contact in contacts:
        # Find appropriate template (use first template for now, later will match by category)
        template = templates[0]
        
        # Create the email
        email_log = models.EmailLog(
            recipient_email=contact.email,
            subject=template.subject,
            body=template.body,
            status="pending",
            campaign=campaign
        )
        db.add(email_log)
        db.flush()  # Generate ID for the email
        
        # Schedule the email
        schedule = models.Schedule(
            send_time=current_date,
            is_holiday=False,
            is_sent=False,
            email_log=email_log
        )
        db.add(schedule)
        scheduled_count += 1
        
        # Schedule follow-ups if any
        last_date = current_date
        for followup in followups:
            # Calculate send date based on follow-up delay
            followup_date = add_business_days(last_date, followup.delay_days)
            
            # Create the follow-up email
            followup_email = models.EmailLog(
                recipient_email=contact.email,
                subject=followup.subject or f"Follow-up: {template.subject}",
                body=followup.body,
                status="pending",
                campaign=campaign,
            )
            db.add(followup_email)
            db.flush()
            
            # Schedule the follow-up
            followup_schedule = models.Schedule(
                send_time=followup_date,
                is_holiday=False,
                is_sent=False,
                email_log=followup_email
            )
            db.add(followup_schedule)
            scheduled_count += 1
            
            # Update last date for next follow-up
            last_date = followup_date
    
    # Commit the transaction
    db.commit()
    logger.info(f"Scheduled {scheduled_count} emails for campaign {campaign.id}")
    
    return scheduled_count

def process_scheduled_emails(db: Session) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Process emails scheduled to be sent now or in the past.
    Returns the number of emails processed and a list of processed emails.
    """
    now = datetime.now()
    
    # Find schedules due for sending
    due_schedules = db.query(Schedule).join(
        Schedule.email_log
    ).filter(
        Schedule.send_time <= now,
        Schedule.is_sent == False,
        EmailLog.status == "pending"
    ).all()
    
    if not due_schedules:
        return 0, []
    
    processed_emails = []
    
    for schedule in due_schedules:
        email = schedule.email_log
        
        # In a real implementation, this would call the actual email sending logic
        # For now, just mark as sent
        email.status = "sent"
        email.sent_at = now
        schedule.is_sent = True
        
        processed_emails.append({
            "id": email.id,
            "recipient": email.recipient_email,
            "subject": email.subject,
            "scheduled_time": schedule.send_time.isoformat(),
            "sent_time": now.isoformat()
        })
    
    # Commit the changes
    db.commit()
    
    return len(processed_emails), processed_emails

def init_scheduler():
    """
    Initialize the scheduler.
    """
    logger.info("Initializing email scheduler with business-day awareness")
    return True

def shutdown_scheduler():
    """
    Shutdown the scheduler.
    """
    logger.info("Shutting down email scheduler")
    return True