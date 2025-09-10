"""
Email scheduler module for handling scheduled email tasks.
This is a minimal implementation to ensure the application starts properly.
"""
import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/scheduler",
    tags=["scheduler"],
    responses={404: {"description": "Not found"}},
)

@router.get("/status")
async def scheduler_status():
    """
    Return the current status of the email scheduler.
    """
    return {
        "status": "active",
        "message": "Email scheduler is running"
    }

def init_scheduler():
    """
    Initialize the scheduler.
    """
    logger.info("Initializing email scheduler")
    return True

def shutdown_scheduler():
    """
    Shutdown the scheduler.
    """
    logger.info("Shutting down email scheduler")
    return True