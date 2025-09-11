from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any

# -------------------- User --------------------
class UserCreate(BaseModel):
    name: str
    email: EmailStr


class User(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        orm_mode = True


# -------------------- Contact --------------------
class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    linkedin_url: Optional[str] = None
    unsubscribed: bool = False
    campaign_id: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None  # flexible info (phone, company, etc.)


class Contact(BaseModel):
    id: int
    name: str
    email: EmailStr
    linkedin_url: Optional[str]
    unsubscribed: bool
    campaign_id: Optional[int]
    extra_data: Optional[Dict[str, Any]]

    class Config:
        orm_mode = True


# Contact Response (for table in frontend)
class ContactResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
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


# -------------------- Campaign --------------------
class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None


class Campaign(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    contacts: List[Contact] = []

    class Config:
        orm_mode = True


# -------------------- Email Template --------------------
class EmailTemplateCreate(BaseModel):
    subject: str
    body: str


class EmailTemplate(BaseModel):
    id: int
    subject: str
    body: str

    class Config:
        orm_mode = True


# -------------------- Email Log --------------------
class EmailLogCreate(BaseModel):
    recipient_email: EmailStr
    subject: str
    body: str


class EmailLog(BaseModel):
    id: int
    recipient_email: EmailStr
    subject: str
    body: str
    status: str
    sent_at: Optional[datetime]

    # AI fields
    predicted_best_time: Optional[datetime] = None
    engagement_score: Optional[float] = None
    compliance_flags: Optional[Dict[str, Any]] = None

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
