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
    # Always create a new session for thread safety
    db = next(get_db())
    
    try:
        # Get email log
        email_log: EmailLog = db.query(EmailLog).filter(EmailLog.id == email_log_id).first()
        if not email_log:
            return False

        # Skip if recipient unsubscribed
        contact = db.query(Contact).filter(Contact.email == email_log.recipient_email).first()
        if contact and contact.unsubscribed:
            logger.info(f"Skipping {contact.email} - unsubscribed")
            return False
        
        # Process the placeholders at send time to ensure latest data is used
        # This is crucial for ensuring all placeholders are replaced
        from .email_placeholders import process_placeholders
        
        # Extract the subject and body from the email log
        subject = email_log.subject
        body = email_log.body
        
        # Log the original content for debugging
        logger.info(f"Original subject: {subject}")
        logger.info(f"Original body contains placeholders: {'{{' in body or '{' in body}")
        
        # Process placeholders in both subject and body if contact exists
        if contact:
            logger.info(f"Processing placeholders for contact: {contact.email}")
            logger.info(f"Contact extra_data: {contact.extra_data}")
            
            # Make sure we have the contact's extra_data properly loaded
            if not hasattr(contact, 'extra_data') or contact.extra_data is None:
                contact.extra_data = {}
                # Always ensure POC City and POC State exist in extra_data
                if not contact.extra_data:
                    contact.extra_data = {}
                    
                # Use existing city/state values if available, otherwise empty string
                contact.extra_data['POC City'] = contact.extra_data.get('city', contact.extra_data.get('POC City', ''))
                contact.extra_data['POC State'] = contact.extra_data.get('state', contact.extra_data.get('POC State', ''))
                
                # Also ensure the standard city/state fields exist
                contact.extra_data['city'] = contact.extra_data.get('POC City', contact.extra_data.get('city', ''))
                contact.extra_data['state'] = contact.extra_data.get('POC State', contact.extra_data.get('state', ''))
                
                # Log the POC City and State values for debugging
                logger.info(f"POC City value: '{contact.extra_data.get('POC City', '')}'")
                logger.info(f"POC State value: '{contact.extra_data.get('POC State', '')}'")
                contact.extra_data['POC State'] = contact.extra_data['state']
            
            # Process the subject
            subject = process_placeholders(subject, contact)
            
            # Process the body
            body = process_placeholders(body, contact)
            
            # Double-check for any remaining placeholders with both formats
            if '{{' in body or '{' in body:
                logger.warning(f"Still found placeholders after first processing. Running again.")
                body = process_placeholders(body, contact)
            
            logger.info(f"Processed subject: {subject}")
            logger.info(f"Body still contains placeholders after processing: {'{{' in body or '{' in body}")
        else:
            logger.warning(f"No contact found for email {email_log.recipient_email}, placeholders won't be replaced")

        # Add tracking pixel
        tracking_pixel = f'<img src="{BASE_URL}/track/open/{email_log.id}" width="1" height="1" />'

        # Add unsubscribe link
        unsubscribe_link = f'{BASE_URL}/unsubscribe/{quote(email_log.recipient_email)}'
        unsubscribe_html = f'<p>If you want to unsubscribe, <a href="{unsubscribe_link}">click here</a>.</p>'

        # Auto-linkify and wrap body with basic formatting, and add a CTA link tracked
        # Basic link tracking: replace any http(s) links with tracking redirect
        body_html = body  # Use our processed body with placeholders replaced
        try:
            import re
            def repl(m):
                url = m.group(0)
                return f'<a href="{BASE_URL}/track/click/{email_log.id}?url={url}" target="_blank">{url}</a>'
            body_html = re.sub(r"https?://[^\s<>]+", repl, body_html)
        except Exception:
            pass

        # Log the original body for debugging
        logger.info(f"Original email body: {body_html}")
        
        # Ensure proper HTML structure and styling
        # Preserve line breaks and formatting from the original email
        # Check if email already contains HTML formatting
        if "<" in body_html and ">" in body_html and ("<p>" in body_html or "<div>" in body_html or "<br" in body_html):
            # Email already has HTML formatting, preserve it
            formatted_body = body_html
        else:
            # Detect if this is plain text or already has some HTML formatting
            is_html = bool(re.search(r'<[a-z]+[^>]*>', body_html))
            
            if is_html:
                # Has some HTML but not complete, preserve it
                formatted_body = body_html
            else:
                # Convert plain text to HTML with proper formatting
                
                # First, normalize line endings
                body_html = body_html.replace("\r\n", "\n")
                
                # Add a space after period, exclamation, question mark if followed by capital letter
                # This improves sentence detection
                body_html = re.sub(r'([.!?])([A-Z])', r'\1 \2', body_html)
                
                # Add paragraph breaks at sentences that end with period, exclamation, or question mark followed by newline
                body_html = re.sub(r'([.!?])(\n+)', r'\1\n\n', body_html)
                
                # Ensure consecutive line breaks don't create too many newlines
                body_html = re.sub(r'\n{3,}', '\n\n', body_html)
                
                # Split into paragraphs - a paragraph is separated by at least one blank line
                paragraphs = re.split(r'\n\s*\n', body_html)
                formatted_paragraphs = []
                
                for paragraph in paragraphs:
                    if not paragraph.strip():
                        continue
                    
                    # Check if it's a greeting (Hi, Hello, Dear, etc.)
                    if re.match(r'^(Hi|Hello|Dear|Hey|Good morning|Good afternoon|Good evening)\s+', paragraph.strip()):
                        formatted_paragraphs.append(f"<p>{paragraph.strip()}</p>")
                        continue
                    
                    # Check if it's a sign-off (Regards, Thanks, etc.)
                    if re.match(r'^(Warm regards|Best regards|Regards|Sincerely|Thanks|Thank you|Cheers|Best|Kind regards|Yours truly)', paragraph.strip()):
                        formatted_paragraphs.append(f"<p>{paragraph.strip()}</p>")
                        continue
                    
                    # Check if it's a list
                    lines = paragraph.split('\n')
                    if all(line.strip().startswith(('•', '*', '-')) for line in lines if line.strip()):
                        # It's a list
                        list_items = []
                        for line in lines:
                            line = line.strip()
                            if line:
                                # Remove the bullet and create a list item
                                list_items.append(f"<li>{line[1:].strip()}</li>")
                        
                        if list_items:
                            formatted_paragraphs.append(f"<ul>\n{''.join(list_items)}\n</ul>")
                    else:
                        # Regular paragraph
                        
                        # Split long sentences that should be in separate paragraphs
                        # Look for sentences that end with period, exclamation or question mark
                        # Use a more robust regex that handles multiple sentence endings
                        sub_paragraphs = re.split(r'(?<=[.!?])\s+(?=[A-Z][a-z])', paragraph.strip())
                        
                        for sub_para in sub_paragraphs:
                            if not sub_para.strip():
                                continue
                                
                            # Preserve line breaks within paragraph
                            sub_lines = sub_para.split('\n')
                            formatted_paragraph = ""
                            
                            for line in sub_lines:
                                line = line.strip()
                                if line:
                                    formatted_paragraph += line + " "  # Use space instead of <br> for continuous reading
                            
                            # Remove trailing space if present
                            if formatted_paragraph.endswith(" "):
                                formatted_paragraph = formatted_paragraph[:-1]
                            
                            if formatted_paragraph:
                                formatted_paragraphs.append(f"<p>{formatted_paragraph}</p>")
                
                # Improve paragraph detection - separate sentences that should be in different paragraphs
                formatted_body = "\n".join(formatted_paragraphs)
                
                # Check for greeting patterns and make sure they're in their own paragraph
                formatted_body = re.sub(r'<p>(Hi|Hello|Dear|Hey|Good morning|Good afternoon|Good evening)([^,]+),(.*?)</p>',
                                      r'<p>\1\2,</p><p>\3</p>', formatted_body)
                
                # Ensure signing off is in its own paragraph
                formatted_body = re.sub(r'<p>(.*?)(Warm regards|Best regards|Regards|Sincerely|Thanks|Thank you|Cheers|Best|Kind regards|Yours truly)(,?)(.*?)</p>',
                                      r'<p>\1</p><p>\2\3\4</p>', formatted_body)
                
                # Clean up any empty paragraphs that might have been created
                formatted_body = formatted_body.replace('<p></p>', '')
        
        # Create the final HTML body with proper styling
        html_body = f"""
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827; }}
                p {{ margin-bottom: 16px; margin-top: 0; }}
                b, strong {{ font-weight: bold !important; color: #000000 !important; }}
                ul {{ margin-bottom: 16px; padding-left: 20px; }}
                li {{ margin-bottom: 8px; }}
                a {{ color: #2563eb; text-decoration: underline; }}
                .email-content {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            </style>
        </head>
        <body>
            <div class="email-content">
                {formatted_body}
                <br><br>
                {tracking_pixel}
                {unsubscribe_html}
            </div>
        </body>
        </html>
        """

        # Create message
        msg = MIMEMultipart("alternative")
        from_email = SMTP_FROM or SMTP_USER
        msg["From"] = from_email
        msg["To"] = email_log.recipient_email
        msg["Subject"] = subject  # Use our processed subject with placeholders replaced
        msg.attach(MIMEText(html_body, "html"))

        # Log SMTP config basics
        if not SMTP_HOST:
            logger.error("SMTP_HOST is not set")
        if not SMTP_USER or not SMTP_PASS:
            logger.warning("SMTP_USER/SMTP_PASS not fully set. If your SMTP requires auth, sending may fail.")

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
        logger.error(f"Failed to send email to {email_log.recipient_email if 'email_log' in locals() else 'unknown'}: {e}")
        if 'email_log' in locals():
            email_log.status = "failed"
            db.commit()
        return False
    finally:
        db.close()
