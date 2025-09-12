from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional

from .database import get_db
from . import models, schemas
from .auth import get_current_user_id

router = APIRouter(prefix="/api/events", tags=["events"])


def require_user(authorization: Optional[str]) -> int:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    uid = get_current_user_id(token)
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    return uid


@router.get("/", response_model=List[schemas.Event])
def list_events(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user_id = require_user(authorization)
    events = db.query(models.Event).filter(models.Event.owner_id == user_id).all()
    return events


@router.post("/", response_model=schemas.Event)
def create_event(payload: schemas.EventCreate, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user_id = require_user(authorization)
    ev = models.Event(
        title=payload.title,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        type=payload.type,
        color=payload.color,
        owner_id=user_id,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


@router.delete("/{event_id}")
def delete_event(event_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user_id = require_user(authorization)
    ev = db.query(models.Event).filter(models.Event.id == event_id, models.Event.owner_id == user_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(ev)
    db.commit()
    return {"status": "deleted"}


