import logging
from fastapi import APIRouter, Response, Depends, Request
from sqlalchemy.orm import Session
from .database import get_db
from .models import EmailLog, Contact

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
            
        db.commit()
        logger.info(f"Unsubscribe successful for {email}. Cancelled {cancelled_count} pending emails. User-Agent: {user_agent[:100]}")
    except Exception as e:
        logger.error(f"Error processing unsubscribe for {email}: {str(e)}")
        return {"message": "An error occurred while processing your unsubscribe request."}
        
    return {"message": f"{email} unsubscribed successfully."}

# Track link clicks
@router.get("/track/click/{email_id}/{link_id}")
def track_click(email_id: int, link_id: str, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    logger.info(f"Link click tracking: Email ID={email_id}, Link ID={link_id}, IP={client_ip}")
    
    try:
        email = db.query(EmailLog).filter(EmailLog.id == email_id).first()
        if not email:
            logger.warning(f"Click tracking: Email ID {email_id} not found")
        else:
            email.is_clicked = True
            db.commit()
            logger.info(f"Email ID {email_id} marked as clicked, Link={link_id}, User-Agent: {user_agent[:100]}")
    except Exception as e:
        logger.error(f"Error tracking link click: {str(e)}")
    
    # In a real implementation, this would redirect to the actual link
    # For now, just return a success message
    return {"message": "Click tracked successfully"}
