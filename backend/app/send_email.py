import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from sqlalchemy.orm import Session
from urllib.parse import quote
from .models import EmailLog, Contact
from .database import get_db

# ---------------- CONFIG ----------------
SMTP_HOST = "smtp.gmail.com"  # or your SMTP server
SMTP_PORT = 587
SMTP_USER = "akshaygavade106@gmail.com"
SMTP_PASS = "lpfi aalv hvma shmd"  # or use app password

BASE_URL = "http://localhost:8000"  # for tracking pixel & unsubscribe


# ---------------- SEND EMAIL ----------------
def send_email(email_log_id: int):
    db: Session = next(get_db())
    email_log: EmailLog = db.query(EmailLog).filter(EmailLog.id == email_log_id).first()
    if not email_log:
        return

    # Skip if recipient unsubscribed
    contact = db.query(Contact).filter(Contact.email == email_log.recipient_email).first()
    if contact and contact.unsubscribed:
        print(f"Skipping {contact.email} - unsubscribed")
        return

    # Add tracking pixel
    tracking_pixel = f'<img src="{BASE_URL}/track/open/{email_log.id}" width="1" height="1" />'

    # Add unsubscribe link
    unsubscribe_link = f'{BASE_URL}/unsubscribe/{quote(email_log.recipient_email)}'
    unsubscribe_html = f'<p>If you want to unsubscribe, <a href="{unsubscribe_link}">click here</a>.</p>'

    # Create HTML body
    html_body = f"{email_log.body}<br><br>{tracking_pixel}{unsubscribe_html}"

    # Create message
    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_USER
    msg["To"] = email_log.recipient_email
    msg["Subject"] = email_log.subject
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, email_log.recipient_email, msg.as_string())

        # Update DB
        email_log.status = "sent"
        from datetime import datetime
        email_log.sent_at = datetime.utcnow()
        db.commit()
        print(f"Email sent to {email_log.recipient_email}")
    except Exception as e:
        print(f"Failed to send email to {email_log.recipient_email}: {e}")
        email_log.status = "failed"
        db.commit()
