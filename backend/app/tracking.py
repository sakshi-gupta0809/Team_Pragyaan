import logging
from fastapi import APIRouter, Response, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from .database import get_db
from .models import EmailLog, Contact, Campaign

# Configure logger
logger = logging.getLogger(__name__)

router = APIRouter()

# ------------------- Open Tracking -------------------
@router.get("/track/open/{email_id}")
def track_open(email_id: int, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    logger.info(f"Email open tracking request: ID={email_id}, IP={client_ip}")
    
    try:
        email = db.query(EmailLog).filter(EmailLog.id == email_id).first()
        if not email:
            logger.warning(f"Open tracking: Email ID {email_id} not found")
        elif email.is_opened:
            logger.info(f"Email ID {email_id} already marked as opened")
        else:
            email.is_opened = True
            # Increment campaign open count if available
            try:
                if email.campaign_id:
                    campaign = db.query(Campaign).filter(Campaign.id == email.campaign_id).first()
                    if campaign is not None and hasattr(campaign, 'open_count'):
                        campaign.open_count = (campaign.open_count or 0) + 1
            except Exception as ce:
                logger.error(f"Failed to increment campaign open_count for email {email_id}: {ce}")
            db.commit()
            logger.info(f"Email ID {email_id} marked as opened, User-Agent: {user_agent[:100]}")
    except Exception as e:
        logger.error(f"Error tracking email open: {str(e)}")
    
    # Return a 1x1 transparent GIF
    pixel = b'GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xFF\xFF\xFF!\xF9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
    return Response(content=pixel, media_type="image/gif")


# ------------------- Unsubscribe -------------------
@router.get("/unsubscribe/{email}")
def unsubscribe(email: str, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    logger.info(f"Unsubscribe request: Email={email}, IP={client_ip}")
    
    try:
        contact = db.query(Contact).filter(Contact.email == email).first()
        if not contact:
            logger.warning(f"Unsubscribe: Contact with email {email} not found")
            return {"message": f"Email {email} not found or already unsubscribed."}
        
        if contact.unsubscribed:
            logger.info(f"Contact {email} was already unsubscribed")
            return {"message": f"{email} was already unsubscribed."}
            
        contact.unsubscribed = True
        logger.info(f"Contact {email} marked as unsubscribed")
        
        # Mark all pending emails for this contact as cancelled
        pending_emails = db.query(EmailLog).filter(
            EmailLog.recipient_email == email,
            EmailLog.status == "pending"
        ).all()
        
        cancelled_count = 0
        for em in pending_emails:
            em.status = "cancelled"
            em.unsubscribe_clicked = True
            cancelled_count += 1
            
        # Increment campaign unsubscribe count
        try:
            if contact.campaign_id:
                campaign = db.query(Campaign).filter(Campaign.id == contact.campaign_id).first()
                if campaign is not None and hasattr(campaign, 'unsubscribe_count'):
                    campaign.unsubscribe_count = (campaign.unsubscribe_count or 0) + 1
        except Exception as ce:
            logger.error(f"Failed to increment campaign unsubscribe_count for {email}: {ce}")

        db.commit()
        logger.info(f"Unsubscribe successful for {email}. Cancelled {cancelled_count} pending emails. User-Agent: {user_agent[:100]}")
    except Exception as e:
        logger.error(f"Error processing unsubscribe for {email}: {str(e)}")
        return {"message": "An error occurred while processing your unsubscribe request."}
        
    return {"message": f"{email} unsubscribed successfully."}

# Track link clicks
@router.get("/track/click/{email_id}")
def track_click(email_id: int, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    logger.info(f"Link click tracking: Email ID={email_id}, IP={client_ip}")
    
    try:
        email = db.query(EmailLog).filter(EmailLog.id == email_id).first()
        if not email:
            logger.warning(f"Click tracking: Email ID {email_id} not found")
        else:
            email.is_clicked = True
            # Increment campaign click count if available
            try:
                if email.campaign_id:
                    campaign = db.query(Campaign).filter(Campaign.id == email.campaign_id).first()
                    if campaign is not None and hasattr(campaign, 'click_count'):
                        campaign.click_count = (campaign.click_count or 0) + 1
            except Exception as ce:
                logger.error(f"Failed to increment campaign click_count for email {email_id}: {ce}")
            db.commit()
            logger.info(f"Email ID {email_id} marked as clicked, User-Agent: {user_agent[:100]}")
    except Exception as e:
        logger.error(f"Error tracking link click: {str(e)}")
    
    # Redirect to original URL if provided as query param ?url=
    target_url = request.query_params.get("url")
    if target_url:
        return RedirectResponse(url=target_url, status_code=302)
    return {"message": "Click tracked successfully"}
