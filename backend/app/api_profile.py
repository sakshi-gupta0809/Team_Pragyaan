from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from . import models, schemas, database
from .auth import get_current_user

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/profile", response_model=schemas.ProfileResponse)
async def get_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile information"""
    print(f"Getting profile for user: {current_user.id}, {current_user.email}")
    
    # Get the user from the current session to ensure it's persistent
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.get("/profile/test")
async def test_profile_endpoint():
    """Test endpoint to verify profile API is working"""
    return {"message": "Profile API is working", "status": "ok"}

@router.put("/profile", response_model=schemas.ProfileResponse)
async def update_profile(
    profile_update: schemas.ProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile information"""
    
    print(f"Updating profile for user: {current_user.id}, {current_user.email}")
    print(f"Update data: {profile_update.dict()}")
    
    # Get the user from the current session to ensure it's persistent
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if email is being updated and if it's already taken
    if profile_update.email and profile_update.email != user.email:
        existing_user = db.query(models.User).filter(
            models.User.email == profile_update.email,
            models.User.id != user.id
        ).first()
        if existing_user:
            print(f"Email {profile_update.email} is already taken by user {existing_user.id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already taken"
            )
    
    # Update only provided fields
    update_data = profile_update.dict(exclude_unset=True)
    print(f"Fields to update: {update_data}")
    
    for field, value in update_data.items():
        print(f"Setting {field} = {value}")
        setattr(user, field, value)
    
    # Update the name field if first_name or last_name is provided
    if profile_update.first_name or profile_update.last_name:
        first_name = profile_update.first_name or user.first_name or ""
        last_name = profile_update.last_name or user.last_name or ""
        user.name = f"{first_name} {last_name}".strip()
        print(f"Updated name to: {user.name}")
    
    try:
        db.commit()
        db.refresh(user)
        print(f"Profile updated successfully: {user.name}, {user.email}")
        return user
    except Exception as e:
        print(f"Error updating profile: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update profile: {str(e)}"
        )

@router.get("/profile/stats")
async def get_profile_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's profile statistics"""
    
    # Get the user from the current session to ensure it's persistent
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Count campaigns
    campaigns_count = db.query(models.Campaign).filter(models.Campaign.owner_id == user.id).count()
    
    # Count contacts
    contacts_count = db.query(models.Contact).join(models.Campaign).filter(
        models.Campaign.owner_id == user.id
    ).count()
    
    # Count events
    events_count = db.query(models.Event).filter(models.Event.owner_id == user.id).count()
    
    # Count email logs
    email_logs_count = db.query(models.EmailLog).join(models.Campaign).filter(
        models.Campaign.owner_id == user.id
    ).count()
    
    return {
        "campaigns_count": campaigns_count,
        "contacts_count": contacts_count,
        "events_count": events_count,
        "email_logs_count": email_logs_count,
        "member_since": user.created_at
    }
