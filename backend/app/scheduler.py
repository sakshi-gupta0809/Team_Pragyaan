import logging
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from sqlalchemy import text

from .models import Schedule, EmailLog
from .send_email import send_email
from .database import engine, SessionLocal

# Configure logger
logger = logging.getLogger(__name__)

class EmailScheduler:
    """
    Advanced email scheduling service that handles:
    - Loading pending emails from database
    - Scheduling emails based on optimal send times
    - Respecting rate limits and spreading out email sends
    - Handling failures and retries
    - Updating email status in the database
    """
    
    def __init__(self):
        """Initialize the scheduler with APScheduler"""
        logger.info("Initializing EmailScheduler")
        
        # Configure job stores and executors
        jobstores = {
            'default': SQLAlchemyJobStore(url=str(engine.url))
        }
        executors = {
            'default': ThreadPoolExecutor(10)
        }
        job_defaults = {
            'coalesce': False,
            'max_instances': 3
        }
        
        # Create scheduler
        self.scheduler = BackgroundScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults
        )
        self.is_running = False
        self.rate_limit = 50  # emails per minute (adjust based on your SMTP provider limits)
        
    def start(self):
        """Start the scheduler and load pending emails"""
        if not self.is_running:
            logger.info("Starting email scheduler")
            self.scheduler.start()
            self.is_running = True
            self.load_pending_emails()
            logger.info("Email scheduler started successfully")
        else:
            logger.warning("Email scheduler is already running")
    
    def shutdown(self):
        """Shutdown the scheduler"""
        if self.is_running:
            logger.info("Shutting down email scheduler")
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("Email scheduler shutdown complete")
        else:
            logger.warning("Email scheduler is not running")
    
    def load_pending_emails(self):
        """Load all pending emails from the database and schedule them"""
        try:
            db = SessionLocal()
            logger.info("Loading pending emails from database")
            
            # Get all schedules that haven't been sent yet
            schedules = db.query(Schedule).filter(
                Schedule.is_sent == False
            ).all()
            
            if not schedules:
                logger.info("No pending emails to schedule")
                db.close()
                return
            
            logger.info(f"Found {len(schedules)} pending emails to schedule")
            
            # Group emails by send time to respect rate limits
            time_grouped_schedules = {}
            for schedule in schedules:
                # Get send time in 5-minute buckets to spread out sending
                bucket_time = self._get_time_bucket(schedule.send_time)
                if bucket_time not in time_grouped_schedules:
                    time_grouped_schedules[bucket_time] = []
                time_grouped_schedules[bucket_time].append(schedule)
            
            # Schedule emails, spreading them out within each time bucket
            for bucket_time, bucket_schedules in time_grouped_schedules.items():
                self._schedule_email_batch(bucket_time, bucket_schedules)
            
            logger.info(f"Successfully scheduled {len(schedules)} emails")
            
        except Exception as e:
            logger.error(f"Error loading pending emails: {str(e)}")
        finally:
            db.close()
    
    def _get_time_bucket(self, send_time: datetime) -> datetime:
        """Group send times into 5-minute buckets to manage rate limits"""
        minutes = (send_time.minute // 5) * 5
        return send_time.replace(minute=minutes, second=0, microsecond=0)
    
    def _schedule_email_batch(self, bucket_time: datetime, schedules: List[Schedule]):
        """Schedule a batch of emails within a time bucket, respecting rate limits"""
        now = datetime.utcnow()
        
        # If the bucket time is in the past, schedule emails to start sending immediately
        if bucket_time < now:
            bucket_time = now
        
        # Calculate how many emails we can send per second to respect rate limit
        emails_per_second = min(self.rate_limit / 60, len(schedules) / 60)
        delay_between_emails = 1 / emails_per_second if emails_per_second > 0 else 1
        
        # Schedule each email with a slight delay to spread out sending
        for i, schedule in enumerate(schedules):
            # Calculate send time with a delay based on the index
            actual_send_time = bucket_time + timedelta(seconds=i * delay_between_emails)
            
            # Only schedule if it's not too far in the past
            if actual_send_time < now - timedelta(hours=1):
                actual_send_time = now + timedelta(seconds=i * delay_between_emails)
            
            # Schedule the job
            self.scheduler.add_job(
                func=self._send_email_job,
                trigger=DateTrigger(run_date=actual_send_time),
                args=[schedule.email_log_id, schedule.id],
                id=f"email_{schedule.email_log_id}_{schedule.id}",
                replace_existing=True
            )
            
            logger.debug(f"Scheduled email ID {schedule.email_log_id} for {actual_send_time.isoformat()}")
    
    def _send_email_job(self, email_log_id: int, schedule_id: int):
        """Send an individual email and update its status"""
        db = SessionLocal()
        try:
            logger.info(f"Preparing to send email ID {email_log_id}")
            
            # Get the latest schedule status
            schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
            if not schedule or schedule.is_sent:
                logger.info(f"Email ID {email_log_id} already sent or schedule deleted")
                return
            
            # Send the email
            send_email(email_log_id)
            
            # Update schedule status
            schedule.is_sent = True
            db.commit()
            
            logger.info(f"Successfully sent and updated status for email ID {email_log_id}")
            
        except Exception as e:
            logger.error(f"Error sending email ID {email_log_id}: {str(e)}")
            db.rollback()
            
            # Get email log for retry information
            email_log = db.query(EmailLog).filter(EmailLog.id == email_log_id).first()
            
            if email_log:
                # Update status to 'failed'
                email_log.status = "failed"
                
                # Record the error message
                if not email_log.compliance_flags:
                    email_log.compliance_flags = {}
                email_log.compliance_flags["send_error"] = str(e)
                
                db.commit()
                
                # If it's the first failure, schedule a retry
                if "retry_count" not in email_log.compliance_flags:
                    retry_time = datetime.utcnow() + timedelta(minutes=30)
                    email_log.compliance_flags["retry_count"] = 1
                    
                    # Update the schedule to retry
                    if schedule:
                        schedule.send_time = retry_time
                        schedule.is_sent = False
                        db.commit()
                        
                        # Schedule the retry
                        self.scheduler.add_job(
                            func=self._send_email_job,
                            trigger=DateTrigger(run_date=retry_time),
                            args=[email_log_id, schedule_id],
                            id=f"retry_email_{email_log_id}_{schedule_id}",
                            replace_existing=True
                        )
                        logger.info(f"Scheduled retry for email ID {email_log_id} at {retry_time.isoformat()}")
                
        finally:
            db.close()
    
    def schedule_email(self, email_log_id: int, send_time: datetime, reschedule: bool = False):
        """
        Schedule a single email to be sent at the specified time
        
        Args:
            email_log_id: The ID of the email to send
            send_time: When to send the email
            reschedule: Whether to reschedule if already scheduled
        """
        db = SessionLocal()
        try:
            logger.info(f"Scheduling email ID {email_log_id} for {send_time.isoformat()}")
            
            # Check if email exists
            email_log = db.query(EmailLog).filter(EmailLog.id == email_log_id).first()
            if not email_log:
                logger.warning(f"Cannot schedule email ID {email_log_id}: not found")
                return False
            
            # Check if already scheduled
            existing_schedule = db.query(Schedule).filter(
                Schedule.email_log_id == email_log_id
            ).first()
            
            if existing_schedule:
                if not reschedule:
                    logger.info(f"Email ID {email_log_id} already scheduled for {existing_schedule.send_time.isoformat()}")
                    return False
                
                # Update existing schedule
                existing_schedule.send_time = send_time
                existing_schedule.is_sent = False
                db.commit()
                
                # Update the job
                self.scheduler.add_job(
                    func=self._send_email_job,
                    trigger=DateTrigger(run_date=send_time),
                    args=[email_log_id, existing_schedule.id],
                    id=f"email_{email_log_id}_{existing_schedule.id}",
                    replace_existing=True
                )
                
                logger.info(f"Rescheduled email ID {email_log_id} for {send_time.isoformat()}")
                return True
            
            # Create new schedule
            new_schedule = Schedule(
                send_time=send_time,
                is_holiday=False,
                is_sent=False,
                email_log_id=email_log_id
            )
            db.add(new_schedule)
            db.commit()
            db.refresh(new_schedule)
            
            # Schedule the job
            self.scheduler.add_job(
                func=self._send_email_job,
                trigger=DateTrigger(run_date=send_time),
                args=[email_log_id, new_schedule.id],
                id=f"email_{email_log_id}_{new_schedule.id}",
                replace_existing=True
            )
            
            logger.info(f"Scheduled new email ID {email_log_id} for {send_time.isoformat()}")
            return True
            
        except Exception as e:
            logger.error(f"Error scheduling email ID {email_log_id}: {str(e)}")
            db.rollback()
            return False
        finally:
            db.close()
    
    def cancel_email(self, email_log_id: int) -> bool:
        """Cancel a scheduled email"""
        db = SessionLocal()
        try:
            logger.info(f"Cancelling scheduled email ID {email_log_id}")
            
            # Find the schedule
            schedule = db.query(Schedule).filter(
                Schedule.email_log_id == email_log_id,
                Schedule.is_sent == False
            ).first()
            
            if not schedule:
                logger.warning(f"Cannot cancel email ID {email_log_id}: no pending schedule found")
                return False
            
            # Remove the job from the scheduler
            job_id = f"email_{email_log_id}_{schedule.id}"
            try:
                self.scheduler.remove_job(job_id)
            except:
                logger.warning(f"Job {job_id} not found in scheduler")
            
            # Update email status
            email_log = db.query(EmailLog).filter(EmailLog.id == email_log_id).first()
            if email_log:
                email_log.status = "cancelled"
                
            # Delete or mark the schedule
            schedule.is_sent = True  # Mark as sent to prevent further scheduling
            db.commit()
            
            logger.info(f"Successfully cancelled email ID {email_log_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error cancelling email ID {email_log_id}: {str(e)}")
            db.rollback()
            return False
        finally:
            db.close()
    
    def get_pending_count(self) -> int:
        """Get count of pending emails"""
        db = SessionLocal()
        try:
            count = db.query(Schedule).filter(Schedule.is_sent == False).count()
            return count
        except Exception as e:
            logger.error(f"Error getting pending count: {str(e)}")
            return 0
        finally:
            db.close()
    
    def health_check(self) -> Dict[str, Any]:
        """Check the health of the scheduler"""
        status = {
            "status": "healthy" if self.is_running else "stopped",
            "pending_emails": self.get_pending_count(),
            "rate_limit": self.rate_limit,
            "job_count": len(self.scheduler.get_jobs())
        }
        
        # Check database connection
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1")).fetchall()
            status["database"] = "connected"
        except Exception as e:
            status["database"] = "error"
            status["database_error"] = str(e)
            status["status"] = "unhealthy"
        finally:
            db.close()
            
        return status

# Create a global instance for use in FastAPI
email_scheduler = EmailScheduler()

# Function to start the scheduler on app startup
def start_scheduler():
    """Start the email scheduler"""
    email_scheduler.start()

# Function to shutdown the scheduler on app shutdown
def shutdown_scheduler():
    """Shutdown the email scheduler"""
    email_scheduler.shutdown()
