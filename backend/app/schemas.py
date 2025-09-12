from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any

# -------------------- User --------------------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class User(BaseModel):
    id: int
    name: str
    email: EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# -------------------- Events --------------------
class EventBase(BaseModel):
    title: str
    date: datetime
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    type: Optional[str] = None
    color: Optional[str] = None


class EventCreate(EventBase):
    pass


class Event(EventBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

    class Config:
        orm_mode = True


# -------------------- Contact --------------------
class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    linkedin_url: Optional[str] = None
    designation: Optional[str] = None
    company: Optional[str] = None
    industry: Optional[str] = None
    category: Optional[str] = None
    unsubscribed: bool = False
    campaign_id: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None  # flexible info (phone, location, etc.)
    last_contacted: Optional[datetime] = None
    status: Optional[str] = "active"


class Contact(BaseModel):
    id: int
    name: str
    email: EmailStr
    linkedin_url: Optional[str]
    designation: Optional[str]
    company: Optional[str]
    industry: Optional[str]
    category: Optional[str]
    unsubscribed: bool
    campaign_id: Optional[int]
    extra_data: Optional[Dict[str, Any]]
    last_contacted: Optional[datetime]
    status: Optional[str]

    class Config:
        orm_mode = True


# Contact Response (for table in frontend)
class ContactResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    designation: Optional[str]
    company: Optional[str]
    category: Optional[str]
    campaign_name: Optional[str]
    unsubscribed: bool
    linkedin_url: Optional[str]

    class Config:
        orm_mode = True


# Paginated response for contacts
class PaginatedContacts(BaseModel):
    total: int
    page: int
    page_size: int
    contacts: List[ContactResponse]

# Added for API compatibility
class ContactOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    designation: Optional[str]
    company: Optional[str]
    category: Optional[str]
    campaign_name: Optional[str]
    unsubscribed: bool
    linkedin_url: Optional[str]
    last_contacted: Optional[datetime] = None
    status: Optional[str] = None

    class Config:
        orm_mode = True

# Added for API compatibility
class ContactsListOut(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    contacts: List[ContactOut]


# -------------------- Campaign --------------------
class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    scenario: Optional[str] = "cold_outreach"
    start_date: Optional[datetime] = None
    followup_gap_days: Optional[int] = 2
    status: Optional[str] = "draft"


class Campaign(BaseModel):
    id: int
    name: str
    description: Optional[str]
    scenario: str = "cold_outreach"
    start_date: Optional[datetime]
    followup_gap_days: int = 2
    created_at: datetime
    updated_at: datetime
    status: str = "draft"
    recipient_count: int = 0
    open_count: int = 0
    click_count: int = 0
    unsubscribe_count: int = 0
    contacts: List[Contact] = []

    class Config:
        orm_mode = True


class CampaignResponse(BaseModel):
    id: str
    name: str
    status: str
    last_edited: str
    recipients: str
    opens: str
    clicks: str
    unsubscribed: str

    class Config:
        orm_mode = True


class PaginatedCampaigns(BaseModel):
    total: int
    page: int
    page_size: int
    campaigns: List[CampaignResponse]


# -------------------- Email Template --------------------
class EmailTemplateCreate(BaseModel):
    subject: str
    body: str
    category: Optional[str] = None
    step: int = 1


class EmailTemplate(BaseModel):
    id: int
    subject: str
    body: str
    category: Optional[str]
    step: int = 1

    class Config:
        orm_mode = True


# -------------------- Email Log --------------------
class EmailLogCreate(BaseModel):
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    recipient_company: Optional[str] = None
    recipient_category: Optional[str] = None
    subject: str
    body: str
    step: int = 1
    contact_id: Optional[int] = None


class EmailLog(BaseModel):
    id: int
    recipient_email: EmailStr
    recipient_name: Optional[str]
    recipient_company: Optional[str]
    recipient_category: Optional[str]
    subject: str
    body: str
    status: str
    sent_at: Optional[datetime]
    step: int = 1

    # AI fields
    predicted_best_time: Optional[datetime] = None
    engagement_score: Optional[float] = None
    compliance_flags: Optional[Dict[str, Any]] = None
    
    contact_id: Optional[int] = None

    class Config:
        orm_mode = True


# -------------------- Schedule --------------------
class ScheduleCreate(BaseModel):
    send_time: datetime
    is_holiday: bool = False


class Schedule(BaseModel):
    id: int
    send_time: datetime
    is_holiday: bool
    is_sent: bool

    class Config:
        orm_mode = True


# -------------------- FollowUp --------------------
class FollowUpCreate(BaseModel):
    delay_days: int = 3
    subject: Optional[str] = None
    body: str
    parent_email_id: Optional[int] = None


class FollowUp(BaseModel):
    id: int
    delay_days: int
    subject: Optional[str]
    body: str
    parent_email_id: Optional[int]

    class Config:
        orm_mode = True
