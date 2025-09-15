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
            # Process placeholders in subject and body
            from .email_placeholders import process_placeholders
            body = process_placeholders(template.body, contact)
            subject = process_placeholders(template.subject, contact)
            
            email_log = models.EmailLog(
                recipient_email=contact.email,
                recipient_name=contact.name,
                recipient_company=contact.company,
                recipient_category=contact.category,
                subject=subject,
                body=body,
                status="pending",
                campaign=campaign,
                contact_id=contact.id
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

    # Schedule follow-up email after X business days
    def schedule_followup(self, email_log: models.EmailLog, followup: models.FollowUp):
        logger.info(f"Scheduling follow-up for email ID {email_log.id} with delay of {followup.delay_days} business days")
        
        try:
            # Start with current date
            current_date = datetime.utcnow()
            business_days_added = 0
            followup_time = current_date
            
            # Add business days (skip weekends)
            while business_days_added < followup.delay_days:
                followup_time = followup_time + timedelta(days=1)
                # Skip weekends (5 = Saturday, 6 = Sunday)
                if followup_time.weekday() < 5:
                    business_days_added += 1
            
            # Check if the calculated date is a holiday
            # This is a placeholder for holiday checking logic
            # In a real implementation, you would check against a holiday API or database
            is_holiday = self._is_holiday(followup_time)
            
            # If it's a holiday, move to the next business day
            while is_holiday or followup_time.weekday() >= 5:
                followup_time = followup_time + timedelta(days=1)
                is_holiday = self._is_holiday(followup_time)
            
            schedule = models.Schedule(
                send_time=followup_time,
                is_holiday=False,
                email_log=email_log
            )
            
            self.db.add(schedule)
            self.db.commit()
            self.db.refresh(schedule)
            
            logger.info(f"Follow-up scheduled successfully with schedule ID: {schedule.id} for {followup_time.isoformat()} ({business_days_added} business days after {current_date.isoformat()})")
            return schedule
        except Exception as e:
            logger.error(f"Error scheduling follow-up: {str(e)}")
            self.db.rollback()
            raise
    
    # Helper method to check if a date is a holiday
    def _is_holiday(self, date):
        """
        Check if a date is a US holiday.
        This is a placeholder implementation. In a real system, you would:
        1. Use a holiday API
        2. Check against a database of holidays
        3. Use a library like holidays.py
        
        Returns:
            bool: True if the date is a holiday, False otherwise
        """
        # List of common US holidays (month, day) - simplified for example
        us_holidays = [
            (1, 1),    # New Year's Day
            (1, 15),   # Martin Luther King Jr. Day (approximate)
            (2, 15),   # Presidents' Day (approximate)
            (5, 31),   # Memorial Day (approximate)
            (7, 4),    # Independence Day
            (9, 5),    # Labor Day (approximate)
            (10, 10),  # Columbus Day (approximate)
            (11, 11),  # Veterans Day
            (11, 25),  # Thanksgiving (approximate)
            (12, 25),  # Christmas Day
        ]
        
        # Check if the date matches any holiday
        return (date.month, date.day) in us_holidays

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
