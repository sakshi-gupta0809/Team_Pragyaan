import logging
import time
import sys
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from . import models, database, routes
from .logging_utils import log_requests
from .tracking import router as tracking_router
from .scheduler import router as scheduler_router, init_scheduler, shutdown_scheduler
import sys
import os

# Import the local API routers (moved into app directory to avoid import issues)
from .api_campaigns import router as campaigns_router
from .api_contacts import router as contacts_api_router

# -------------------- Logging --------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# -------------------- FastAPI App --------------------
app = FastAPI(title="Scalable Email Platform")
logger.info("Starting Scalable Email Platform API")

# -------------------- Middleware --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)
app.middleware("http")(log_requests)
logger.info("CORS and logging middleware configured")

# -------------------- Database Utility --------------------
def wait_for_db(max_retries=10, delay=2):
    """Wait for the database to be ready before continuing."""
    for i in range(max_retries):
        try:
            db = database.SessionLocal()
            db.execute(text("SELECT 1")).fetchall()
            db.close()
            logger.info("Database is ready")
            return True
        except Exception:
            logger.warning(f"Database not ready, retrying in {delay}s... ({i+1}/{max_retries})")
            time.sleep(delay)
    raise Exception("Database is not ready after multiple retries")

def create_tables():
    """Create tables safely after DB is ready."""
    try:
        logger.info("Creating database tables if they do not exist")
        models.Base.metadata.create_all(bind=database.engine)
        logger.info("Database tables ready")
    except Exception as e:
        logger.error(f"Failed to create database tables: {str(e)}")
        raise

# -------------------- API Routes --------------------
app.include_router(routes.router)
app.include_router(tracking_router)
app.include_router(contacts_api_router, prefix="/api", tags=["contacts"])
app.include_router(campaigns_router, prefix="/api", tags=["campaigns"])

# Add a debug endpoint at the root level
@app.get("/api/debug")
def api_debug():
    return {
        "message": "API is working",
        "endpoints": [
            "/api/campaigns/debug",
            "/api/campaigns/",
            "/api/campaigns/paginated/"
        ]
    }
logger.info("API routes registered")

# Include scheduler endpoints
app.include_router(scheduler_router)

# -------------------- Dependencies --------------------
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------- Health Check Endpoints --------------------
@app.get("/")
def read_root():
    return {
        "message": "🚀 Scalable Email Platform API is running!",
        "status": "healthy",
        "timestamp": time.time()
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    start_time = time.time()
    status = {"status": "healthy", "checks": {}}
    
    try:
        db.execute(text("SELECT 1")).fetchall()
        status["checks"]["database"] = {"status": "up"}
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        status["status"] = "unhealthy"
        status["checks"]["database"] = {"status": "down", "error": str(e)}

    status["response_time_ms"] = round((time.time() - start_time) * 1000, 2)
    return status

# -------------------- Startup & Shutdown Events --------------------
@app.on_event("startup")
async def startup_event():
    logger.info("Application startup: waiting for database")
    wait_for_db()
    create_tables()
    # Initialize scheduler
    init_scheduler()
    logger.info("Application ready to receive requests")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")
    # Shutdown scheduler
    shutdown_scheduler()
    logger.info("Email scheduler shutdown complete")
