"""
Email scheduler module for handling scheduled email tasks with business-day awareness.
Handles weekend and holiday-aware scheduling for campaigns and follow-ups.
"""
import logging
from datetime import datetime, timedelta, time
from typing import List, Optional, Dict, Any, Tuple
import os
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
import holidays
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from .database import get_db
from .send_email import send_email as send_email_smtp
from . import models
from .models import Campaign, Contact, EmailLog, Schedule, FollowUp, EmailTemplate

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/scheduler",
    tags=["scheduler"],
    responses={404: {"description": "Not found"}},
)

# -------------------- Rate limiting & concurrency --------------------
SEND_CONCURRENCY = int(os.environ.get("SEND_CONCURRENCY", "3"))
RATE_LIMIT_PER_MINUTE = int(os.environ.get("RATE_LIMIT_PER_MINUTE", "60"))

# Keep timestamps of successful sends to enforce a simple per-minute limit
_SEND_TIMESTAMPS = deque(maxlen=RATE_LIMIT_PER_MINUTE * 2)

def _prune_old_sends(now: datetime) -> None:
    one_minute_ago = now - timedelta(seconds=60)
    while _SEND_TIMESTAMPS and _SEND_TIMESTAMPS[0] < one_minute_ago:
        _SEND_TIMESTAMPS.popleft()

def _rate_limit_allowance(now: datetime) -> int:
    _prune_old_sends(now)
    return max(0, RATE_LIMIT_PER_MINUTE - len(_SEND_TIMESTAMPS))

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
    us_holidays = get_us_holidays(date.year)
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
    Normalizes to 9:00 AM.
    """
    next_day = date
    while not is_business_day(next_day):
        next_day += timedelta(days=1)
    return datetime.combine(next_day.date(), time(hour=9))

def add_business_days(date: datetime, days: int) -> datetime:
    """
    Add a specified number of business days to a date.
    Normalizes to 9:00 AM.
    Ensures the result date is different from the input date.
    """
    if days <= 0:
        return datetime.combine(date.date(), time(hour=9))
    
    # Start from the next day to ensure we don't return the same date
    result_date = date + timedelta(days=1)
    days_added = 0
    
    while days_added < days:
        if is_business_day(result_date):
            days_added += 1
        
        # If we haven't added enough business days yet, move to the next day
        if days_added < days:
            result_date += timedelta(days=1)
    
    return datetime.combine(result_date.date(), time(hour=9))

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
    contacts = db.query(Contact).filter(Contact.campaign_id == campaign.id).all()
    if not contacts:
        logger.warning(f"No contacts found for campaign {campaign.id}")
        return 0
    
    templates = db.query(EmailTemplate).filter(EmailTemplate.campaign_id == campaign.id).all()
    if not templates:
        logger.warning(f"No templates found for campaign {campaign.id}")
        return 0
    
    followups = db.query(FollowUp).filter(FollowUp.campaign_id == campaign.id).all()
    
    # Normalize start date
    current_date = get_next_business_day(start_date)
    initial_email_date = current_date.date()
    
    scheduled_count = 0
    
    for contact in contacts:
        template = templates[0]
        
        # Personalize subject and body with safe fallbacks
        recipient_name = contact.name or ""
        recipient_company = contact.company or ""
        recipient_category = (contact.category or "other").lower()

        subject = (template.subject or "")
        body = (template.body or "")

        # Replace common placeholders
        subject = (subject
            .replace('{{name}}', recipient_name)
            .replace('{{company}}', recipient_company)
            .replace('{name}', recipient_name)
            .replace('{company}', recipient_company)
        )
        body = (body
            .replace('{{name}}', recipient_name)
            .replace('{{company}}', recipient_company)
            .replace('{name}', recipient_name)
            .replace('{company}', recipient_company)
        )

        # Ensure greeting and a courteous closing if missing
        trimmed_body = body.strip()
        if not trimmed_body.lower().startswith(("hi ", "hello ", "dear ")):
            greeting = f"Hi {recipient_name},\n\n" if recipient_name else "Hello,\n\n"
            body = greeting + body
        if ("thank you" not in body.lower()) and ("regards" not in body.lower()) and ("sincerely" not in body.lower()):
            body = body.rstrip() + "\n\nThank you,\nNeutrino Tech Systems"

        # Create the email
        email_log = models.EmailLog(
            recipient_email=contact.email,
            recipient_name=recipient_name or None,
            recipient_company=recipient_company or None,
            recipient_category=recipient_category,
            subject=subject,
            body=body,
            status="pending",
            campaign=campaign
        )
        db.add(email_log)
        db.flush()
        
        schedule = models.Schedule(
            send_time=current_date,
            is_holiday=False,
            is_sent=False,
            email_log=email_log
        )
        db.add(schedule)
        scheduled_count += 1
        
        last_date = current_date
        
        # Follow-ups
        for i, followup in enumerate(followups):
            delay_days = followup.delay_days or 2
            if delay_days < 2:
                delay_days = 2

            if i == 0:
                followup_date = add_business_days(current_date, delay_days)
            else:
                followup_date = add_business_days(last_date, delay_days)
            
            followup_email = models.EmailLog(
                recipient_email=contact.email,
                subject=followup.subject or f"Follow-up: {template.subject}",
                body=followup.body,
                status="pending",
                campaign=campaign,
            )
            db.add(followup_email)
            db.flush()
            
            followup_schedule = models.Schedule(
                send_time=followup_date,
                is_holiday=False,
                is_sent=False,
                email_log=followup_email
            )
            db.add(followup_schedule)
            scheduled_count += 1
            
            last_date = followup_date
    
    # Commit the transaction and mark campaign as scheduled if any were created
    if scheduled_count > 0:
        try:
            campaign.status = "scheduled"
        except Exception:
            pass
    db.commit()
    logger.info(f"Scheduled {scheduled_count} emails for campaign {campaign.id}")
    
    return scheduled_count

def process_scheduled_emails(db: Session, max_to_process: Optional[int] = None) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Process emails scheduled to be sent now or in the past.
    Returns the number of emails processed and a list of processed emails.
    """
    now = datetime.now()
    
    # Find schedules due for sending
    # Join EmailLog and optionally Contact to skip unsubscribed/cancelled
    from .models import Contact  # local import to avoid cycle at module import
    due_schedules = db.query(Schedule).join(
        Schedule.email_log
    ).outerjoin(
        Contact, EmailLog.contact_id == Contact.id
    ).filter(
        Schedule.send_time <= now,
        Schedule.is_sent == False,
        EmailLog.status.in_(["pending", "failed"]),
        # Exclude unsubscribed contacts if known
        ((Contact.id == None) | (Contact.unsubscribed == False))
    ).all()
    
    if not due_schedules:
        return 0, []
    
    # Apply rate limit and optional batch limit
    allowance = _rate_limit_allowance(now)
    if allowance == 0:
        return 0, []

    if isinstance(max_to_process, int) and max_to_process > 0:
        slice_size = min(len(due_schedules), max_to_process, allowance)
    else:
        slice_size = min(len(due_schedules), allowance)

    if slice_size <= 0:
        return 0, []

    targets = due_schedules[:slice_size]

    processed_emails = []

    # Send concurrently with a small worker pool
    futures = {}
    with ThreadPoolExecutor(max_workers=SEND_CONCURRENCY) as executor:
        for schedule in targets:
            email = schedule.email_log
            futures[executor.submit(send_email_smtp, email.id)] = schedule

        for future in as_completed(futures):
            schedule = futures[future]
            email = schedule.email_log
            success = False
            try:
                success = future.result()
            except Exception as send_error:
                logger.error(f"Error sending email ID {email.id} to {email.recipient_email}: {send_error}")
                success = False

            if success:
                schedule.is_sent = True
                _SEND_TIMESTAMPS.append(datetime.now())
                processed_emails.append({
                    "id": email.id,
                    "recipient": email.recipient_email,
                    "subject": email.subject,
                    "scheduled_time": schedule.send_time.isoformat(),
                    "sent_time": (email.sent_at or now).isoformat()
                })
            else:
                # Mark failure and push schedule for retry after backoff (15 minutes)
                # Keep previous email_log.status as set by sender (failed) or set here
                try:
                    email.status = "failed"
                except Exception:
                    pass
                try:
                    schedule.send_time = now + timedelta(minutes=15)
                except Exception:
                    pass
    
    db.commit()
    
    return len(processed_emails), processed_emails


@router.post("/process-now")
async def process_now(limit: int = 100, db: Session = Depends(get_db)):
    """Trigger processing of due scheduled emails immediately."""
    processed_count, processed = process_scheduled_emails(db, max_to_process=limit)
    return {
        "processed_count": processed_count,
        "processed": processed
    }

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
