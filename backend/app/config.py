"""
Configuration module for the Neutrino Email Automation System.
Contains settings, API keys, and utility functions.
"""
import os
import holidays
from datetime import date
from typing import Dict, Optional

# API Keys
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# Email Settings
EMAIL_SENDER = os.environ.get("EMAIL_SENDER", "sender@neutrino.com")
EMAIL_SENDER_NAME = os.environ.get("EMAIL_SENDER_NAME", "Neutrino Sales Team")

# Follow-up Settings
FOLLOWUP_GAP_DAYS = int(os.environ.get("FOLLOWUP_GAP_DAYS", "2"))
MAX_FOLLOWUPS = int(os.environ.get("MAX_FOLLOWUPS", "5"))

# Time Zone Settings
DEFAULT_TIMEZONE = os.environ.get("DEFAULT_TIMEZONE", "America/Chicago")

# Business Hours (24-hour format)
BUSINESS_HOURS_START = int(os.environ.get("BUSINESS_HOURS_START", "9"))
BUSINESS_HOURS_END = int(os.environ.get("BUSINESS_HOURS_END", "17"))

# Database Settings
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://admin:admin@email_db/emaildb")

# Directory Settings
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
RESOURCES_DIR = os.path.join(BASE_DIR, "resources")
SAMPLES_DIR = os.path.join(BASE_DIR, "samples")
PROMPTS_DIR = os.path.join(BASE_DIR, "prompts")

# Ensure directories exist
for directory in [DATA_DIR, OUTPUT_DIR, RESOURCES_DIR, SAMPLES_DIR, PROMPTS_DIR]:
    os.makedirs(directory, exist_ok=True)

# US federal holidays dynamic function
def get_us_holidays(year: Optional[int] = None) -> Dict[date, str]:
    """
    Get US federal holidays for the specified year.
    If no year is provided, uses the current year.
    
    Args:
        year: The year to get holidays for
        
    Returns:
        Dictionary mapping dates to holiday names
    """
    if year is None:
        year = date.today().year
    return holidays.US(years=year)

# Contact Category Definitions
CONTACT_CATEGORIES = {
    "CLINICAL": "Clinical / Pharmacy",
    "IT": "IT / Technology",
    "RND": "R&D / Data",
    "OPERATIONS": "Operations",
    "SALES": "Sales / Partnerships",
    "EXECUTIVE": "Executive",
    "OTHER": "Other"
}

# Campaign Scenario Definitions
CAMPAIGN_SCENARIOS = {
    "COLD_OUTREACH": "cold_outreach",
    "CONFERENCE": "conference",
    "FOLLOW_UP": "follow_up",
    "PRODUCT_UPDATE": "product_update",
    "WEBINAR_INVITATION": "webinar_invitation",
    "CASE_STUDY": "case_study"
}

# Email Status Definitions
EMAIL_STATUSES = {
    "PENDING": "pending",
    "SENT": "sent",
    "BOUNCED": "bounced",
    "REPLIED": "replied",
    "FAILED": "failed"
}

# Campaign Status Definitions
CAMPAIGN_STATUSES = {
    "DRAFT": "draft",
    "SCHEDULED": "scheduled",
    "ACTIVE": "active",
    "PAUSED": "paused",
    "COMPLETED": "completed",
    "CANCELLED": "cancelled"
}