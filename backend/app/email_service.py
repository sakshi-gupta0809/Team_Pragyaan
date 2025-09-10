import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import random

# Configure logger
logger = logging.getLogger(__name__)

# Fix imports - these were likely incorrect
try:
    from . import models, schemas
except ImportError:
    # Try original import if the above fails
    logger.warning("Using fallback import pattern in email_service.py")
    from .. import models, schemas

# -------------------- Email Service --------------------
class EmailService:
    def __init__(self, db: Session):
        self.db = db
        logger.info("EmailService initialized")

    # Generate email from template for a contact
    def create_email(self, contact: models.Contact, template: models.EmailTemplate, campaign: models.Campaign):
        logger.info(f"Creating email for contact: {contact.email}, template ID: {template.id}, campaign: {campaign.name}")
        
        try:
            body = template.body.replace("{name}", contact.name)
            subject = template.subject
            
            email_log = models.EmailLog(
                recipient_email=contact.email,
                subject=subject,
                body=body,
                status="pending",
                campaign=campaign
            )
            
            self.db.add(email_log)
            self.db.commit()
            self.db.refresh(email_log)
            
            logger.info(f"Email created successfully with ID: {email_log.id}")
            return email_log
        except Exception as e:
            logger.error(f"Error creating email: {str(e)}")
            self.db.rollback()
            raise

    # Schedule email respecting holidays and working hours
    def schedule_email(self, email_log: models.EmailLog, send_time: datetime):
        logger.info(f"Scheduling email ID {email_log.id} for {send_time.isoformat()}")
        
        try:
            # Skip holidays (is_holiday could be determined via a holiday API)
            schedule = models.Schedule(
                send_time=send_time,
                is_holiday=False,
                email_log=email_log
            )
            self.db.add(schedule)
            self.db.commit()
            self.db.refresh(schedule)
            
            logger.info(f"Email scheduled successfully with schedule ID: {schedule.id}")
            return schedule
        except Exception as e:
            logger.error(f"Error scheduling email: {str(e)}")
            self.db.rollback()
            raise

    # Schedule follow-up email after X days
    def schedule_followup(self, email_log: models.EmailLog, followup: models.FollowUp):
        logger.info(f"Scheduling follow-up for email ID {email_log.id} with delay of {followup.delay_days} days")
        
        try:
            followup_time = datetime.utcnow() + timedelta(days=followup.delay_days)
            
            schedule = models.Schedule(
                send_time=followup_time,
                is_holiday=False,
                email_log=email_log
            )
            
            self.db.add(schedule)
            self.db.commit()
            self.db.refresh(schedule)
            
            logger.info(f"Follow-up scheduled successfully with schedule ID: {schedule.id} for {followup_time.isoformat()}")
            return schedule
        except Exception as e:
            logger.error(f"Error scheduling follow-up: {str(e)}")
            self.db.rollback()
            raise

    # AI-based engagement scoring (placeholder)
    def predict_success(self, email_log: models.EmailLog):
        logger.info(f"Predicting success probability for email ID {email_log.id}")
        
        # Example: Random success prediction, replace with AI model later
        score = random.uniform(0, 1)
        
        logger.info(f"Success prediction for email ID {email_log.id}: {score:.2f}")
        return score

    # Compliance check (GDPR / spam rules)
    def compliance_check(self, email_log: models.EmailLog):
        logger.info(f"Performing compliance check for email ID {email_log.id}")
        
        # Basic example: check email domain
        blocked_domains = ["spam.com"]
        recipient_domain = email_log.recipient_email.split("@")[1]
        
        if recipient_domain in blocked_domains:
            logger.warning(f"Compliance check failed for email ID {email_log.id}: blocked domain {recipient_domain}")
            return False
        
        # Additional compliance checks could be added here
        logger.info(f"Compliance check passed for email ID {email_log.id}")
        return True
        
    def health_check(self):
        """Check if the email service is functioning correctly"""
        logger.info("Email service health check")
        
        health_status = {
            "status": "healthy",
            "checks": {}
        }
        
        # Check database connection
        try:
            # Try a simple query
            self.db.execute("SELECT 1").fetchall()
            health_status["checks"]["database"] = {"status": "up"}
        except Exception as e:
            logger.error(f"Email service health check failed: database error: {str(e)}")
            health_status["status"] = "unhealthy"
            health_status["checks"]["database"] = {"status": "down", "error": str(e)}
            
        # Additional service-specific health checks could be added here
        
        return health_status
