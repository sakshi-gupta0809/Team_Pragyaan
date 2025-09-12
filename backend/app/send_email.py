import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from sqlalchemy.orm import Session
from urllib.parse import quote
from datetime import datetime
from .models import EmailLog, Contact
from .database import get_db

# ---------------- CONFIG ----------------
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
try:
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
except ValueError:
    SMTP_PORT = 587
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER)

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000")  # for tracking pixel & unsubscribe

logger = logging.getLogger(__name__)


# ---------------- SEND EMAIL ----------------
def send_email(email_log_id: int) -> bool:
    db: Session = next(get_db())
    email_log: EmailLog = db.query(EmailLog).filter(EmailLog.id == email_log_id).first()
    if not email_log:
        return False

    # Skip if recipient unsubscribed
    contact = db.query(Contact).filter(Contact.email == email_log.recipient_email).first()
    if contact and contact.unsubscribed:
        logger.info(f"Skipping {contact.email} - unsubscribed")
        return False

    # Add tracking pixel
    tracking_pixel = f'<img src="{BASE_URL}/track/open/{email_log.id}" width="1" height="1" />'

    # Add unsubscribe link
    unsubscribe_link = f'{BASE_URL}/unsubscribe/{quote(email_log.recipient_email)}'
    unsubscribe_html = f'<p>If you want to unsubscribe, <a href="{unsubscribe_link}">click here</a>.</p>'

    # Auto-linkify and wrap body with basic formatting, and add a CTA link tracked
    # Basic link tracking: replace any http(s) links with tracking redirect
    body_html = email_log.body
    try:
        import re
        def repl(m):
            url = m.group(0)
            return f'<a href="{BASE_URL}/track/click/{email_log.id}?url={url}" target="_blank">{url}</a>'
        body_html = re.sub(r"https?://[^\s<>]+", repl, body_html)
    except Exception:
        pass

    html_body = f"<div style=\"font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827;\">{body_html}</div>" \
                f"<br><br>{tracking_pixel}{unsubscribe_html}"

    # Create message
    msg = MIMEMultipart("alternative")
    from_email = SMTP_FROM or SMTP_USER
    msg["From"] = from_email
    msg["To"] = email_log.recipient_email
    msg["Subject"] = email_log.subject
    msg.attach(MIMEText(html_body, "html"))

    # Log SMTP config basics
    if not SMTP_HOST:
        logger.error("SMTP_HOST is not set")
    if not SMTP_USER or not SMTP_PASS:
        logger.warning("SMTP_USER/SMTP_PASS not fully set. If your SMTP requires auth, sending may fail.")

    try:
        logger.info(f"Sending email id={email_log.id} to={email_log.recipient_email} via {SMTP_HOST}:{SMTP_PORT} from={from_email}")
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            if SMTP_USER and SMTP_PASS:
                server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(from_email, email_log.recipient_email, msg.as_string())

        # Update DB
        email_log.status = "sent"
        email_log.sent_at = datetime.utcnow()
        db.commit()
        logger.info(f"Email sent to {email_log.recipient_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {email_log.recipient_email}: {e}")
        email_log.status = "failed"
        db.commit()
        return False
