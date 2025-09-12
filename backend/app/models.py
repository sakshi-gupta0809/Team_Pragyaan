from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, JSON, Float, func
from sqlalchemy.orm import relationship
from .database import Base

# -------------------- User --------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=True)

    # Relationships
    campaigns = relationship("Campaign", back_populates="owner")


# -------------------- Contact --------------------
class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    linkedin_url = Column(String, nullable=True)
    designation = Column(String, nullable=True, index=True)  # Job title or role
    company = Column(String, nullable=True, index=True)
    industry = Column(String, nullable=True)
    category = Column(String, nullable=True, index=True)  # Clinical, IT, R&D, etc.
    extra_data = Column(JSON, nullable=True)  # store phone, location, etc.
    unsubscribed = Column(Boolean, default=False)  # unsubscribe flag
    last_contacted = Column(DateTime(timezone=True), nullable=True)  # Test field for auto migration
    status = Column(String, default="active", nullable=True)  # Test field for auto migration

    # Relationships
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    campaign = relationship("Campaign", back_populates="contacts")


# -------------------- Campaign --------------------
class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    scenario = Column(String, default="cold_outreach", index=True)  # cold_outreach, conference, etc.
    start_date = Column(DateTime(timezone=True), nullable=True)  # When to start sending
    followup_gap_days = Column(Integer, default=2)  # Default follow-up gap in business days
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    status = Column(String, default="draft", index=True)  # draft, sent, scheduled, paused
    
    # Campaign metrics
    recipient_count = Column(Integer, default=0)
    open_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    unsubscribe_count = Column(Integer, default=0)

    # Relationships
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="campaigns")

    contacts = relationship("Contact", back_populates="campaign", cascade="all, delete-orphan")
    templates = relationship("EmailTemplate", back_populates="campaign", cascade="all, delete-orphan")
    emails = relationship("EmailLog", back_populates="campaign", cascade="all, delete-orphan")
    followups = relationship("FollowUp", back_populates="campaign", cascade="all, delete-orphan")


# -------------------- Email Template --------------------
class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    category = Column(String, nullable=True, index=True)  # Which contact category this template is for
    step = Column(Integer, default=1)  # Email step (1 for initial, 2+ for follow-ups)

    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    campaign = relationship("Campaign", back_populates="templates")


# -------------------- Email Log --------------------
class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String, nullable=False)
    recipient_name = Column(String, nullable=True)
    recipient_company = Column(String, nullable=True)
    recipient_category = Column(String, nullable=True)  # Category of the recipient
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String, default="pending")  # pending, sent, bounced, replied
    sent_at = Column(DateTime(timezone=True), nullable=True)
    step = Column(Integer, default=1)  # Email step (1 for initial, 2+ for follow-ups)

    # AI Enhancements
    predicted_best_time = Column(DateTime(timezone=True), nullable=True)
    engagement_score = Column(Float, nullable=True)
    compliance_flags = Column(JSON, nullable=True)

    # Tracking / Email Analytics
    is_opened = Column(Boolean, default=False)
    is_clicked = Column(Boolean, default=False)
    unsubscribe_clicked = Column(Boolean, default=False)

    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    campaign = relationship("Campaign", back_populates="emails")
    
    # Recipient contact
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    contact = relationship("Contact")


# -------------------- Schedule --------------------
class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    send_time = Column(DateTime(timezone=True), nullable=False)
    is_holiday = Column(Boolean, default=False)
    is_sent = Column(Boolean, default=False)

    email_log_id = Column(Integer, ForeignKey("email_logs.id"))
    email_log = relationship("EmailLog")


# -------------------- Follow-up --------------------
class FollowUp(Base):
    __tablename__ = "followups"

    id = Column(Integer, primary_key=True, index=True)
    delay_days = Column(Integer, default=3)  # send after X days
    subject = Column(String, nullable=True)
    body = Column(Text, nullable=False)

    # Relationships
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    campaign = relationship("Campaign", back_populates="followups")

    parent_email_id = Column(Integer, ForeignKey("email_logs.id"))
    parent_email = relationship("EmailLog")
