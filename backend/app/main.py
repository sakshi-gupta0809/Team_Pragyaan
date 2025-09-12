import logging
import time
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file at startup
# Try multiple potential locations for the .env file
potential_paths = [
    Path('/app/.env'),                   # Docker container path
    Path(os.path.dirname(os.path.dirname(__file__))) / '.env',  # Backend directory
    Path(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))) / '.env'  # Project root
]

env_loaded = False
for env_path in potential_paths:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        logging.info(f"Loaded environment variables from {env_path}")
        env_loaded = True
        # Log if OpenAI API key is present (only showing if it exists, not the actual key)
        openai_key = os.environ.get("OPENAI_API_KEY")
        if openai_key:
            logging.info(f"OpenAI API key found: starts with {openai_key[:5]}...")
            # Check if openai module is available
            try:
                import openai
                logging.info(f"OpenAI package is installed: version {openai.__version__}")
                logging.info("LLM-based template generation should be ENABLED")
            except ImportError:
                logging.error("OpenAI API key found but package is not installed!")
        else:
            logging.warning("OpenAI API key not found in environment")
        break

if not env_loaded:
    logging.warning(f"Could not find .env file in any of the expected locations")

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from . import models, database, routes
from .logging_utils import log_requests
from .tracking import router as tracking_router
from .api_neutrino import router as neutrino_router
from .scheduler import router as scheduler_router, init_scheduler, shutdown_scheduler
from .api_workflow import router as workflow_router

# Import the local API routers (moved into app directory to avoid import issues)
from .api_campaigns import router as campaigns_router
from .api_contacts import router as contacts_api_router
from .campaign_workflow import CampaignWorkflow
from .contact_categorization import categorize_designation, CONTACT_CATEGORIES
from .template_generation import TemplateGenerator, CAMPAIGN_SCENARIOS

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
# Ensure CORS headers are added to all responses, including errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:8080",
        "http://localhost:9090"
    ],  # Frontend origins
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
        
        # Run automatic schema migration to add missing columns
        logger.info("Running automatic schema migration")
        database.auto_migrate()
        logger.info("Automatic schema migration completed")
    except Exception as e:
        logger.error(f"Failed to create database tables: {str(e)}")
        raise

# -------------------- API Routes --------------------
app.include_router(routes.router)
app.include_router(tracking_router)
app.include_router(contacts_api_router, prefix="/api", tags=["contacts"])
app.include_router(campaigns_router, prefix="/api", tags=["campaigns"])
app.include_router(workflow_router, prefix="/api", tags=["workflow"])
app.include_router(neutrino_router, prefix="/api/neutrino", tags=["neutrino"])

# Add a debug endpoint at the root level
@app.get("/api/debug")
def api_debug():
    return {
        "message": "API is working",
        "endpoints": [
            "/api/campaigns/debug",
            "/api/campaigns/",
            "/api/campaigns/paginated/",
            "/api/workflow/campaigns/create",
            "/api/workflow/campaigns/{campaign_id}/upload-contacts",
            "/api/workflow/campaigns/run-workflow"
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

@app.get("/test/email-generator")
async def test_email_generator(name: str = "John Smith", job_title: str = "Software Engineer", company: str = "TechCorp"):
    """Test endpoint for the email generator."""
    try:
        # Import here to avoid circular imports
        from .email_generator import EmailGenerator
        
        # Try to get the API key from the environment
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return {
                "status": "error",
                "message": "OpenAI API key not found in environment variables",
                "environment_vars": list(os.environ.keys())
            }
        
        # Create the generator
        generator = EmailGenerator(openai_api_key=api_key)
        
        # Generate a test email
        test_email = generator.generate_business_email(
            name=name,
            job_title=job_title,
            company=company
        )
        
        return {
            "status": "success",
            "api_key_found": bool(api_key),
            "api_key_prefix": api_key[:5] + "..." if api_key else None,
            "use_llm": generator.use_llm,
            "input": {
                "name": name,
                "job_title": job_title,
                "company": company
            },
            "generated_email": test_email
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }

# -------------------- Startup & Shutdown Events --------------------
@app.on_event("startup")
async def startup_event():
    logger.info("Application startup: waiting for database")
    wait_for_db()
    create_tables()
    
    # Create required directories
    from pathlib import Path
    import os
    
    data_dir = Path(__file__).parent.parent / "data"
    output_dir = Path(__file__).parent.parent / "output"
    resources_dir = Path(__file__).parent.parent / "resources"
    samples_dir = Path(__file__).parent.parent / "samples"
    prompts_dir = Path(__file__).parent.parent / "prompts"
    
    for directory in [data_dir, output_dir, resources_dir, samples_dir, prompts_dir]:
        directory.mkdir(exist_ok=True)
        logger.info(f"Created directory: {directory}")
    
    # Initialize scheduler
    init_scheduler()
    logger.info("Application ready to receive requests")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")
    # Shutdown scheduler
    shutdown_scheduler()
    logger.info("Email scheduler shutdown complete")
