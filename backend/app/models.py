from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, JSON, Float, func
from sqlalchemy.orm import relationship
from .database import Base

# -------------------- User --------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)

    # Relationships
    campaigns = relationship("Campaign", back_populates="owner")


# -------------------- Contact --------------------
class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    linkedin_url = Column(String, nullable=True)
    extra_data = Column(JSON, nullable=True)  # store phone, company, etc.
    unsubscribed = Column(Boolean, default=False)  # unsubscribe flag

    # Relationships
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    campaign = relationship("Campaign", back_populates="contacts")


# -------------------- Campaign --------------------
class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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

    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    campaign = relationship("Campaign", back_populates="templates")


# -------------------- Email Log --------------------
class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String, default="pending")  # pending, sent, bounced, replied
    sent_at = Column(DateTime(timezone=True), nullable=True)

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
