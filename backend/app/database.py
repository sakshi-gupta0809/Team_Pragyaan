import os
import logging
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.engine import Engine
from dotenv import load_dotenv

# Configure logger
logger = logging.getLogger(__name__)

logger.info("Loading database configuration")
load_dotenv()

DB_USER = os.getenv("POSTGRES_USER", "admin")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "admin")
DB_NAME = os.getenv("POSTGRES_DB", "emaildb")

# If running inside Docker, default host is "db"
# Otherwise (running on Windows), default to "localhost"
DB_HOST = os.getenv("POSTGRES_HOST", "db" if os.getenv("DOCKER_ENV") == "true" else "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")

logger.info(f"Database configuration: Host={DB_HOST}, Port={DB_PORT}, DB={DB_NAME}, User={DB_USER}")

# ---------- SYNC ENGINE (for Alembic, scripts) ----------
SYNC_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
logger.info("Creating synchronous database engine")
engine = create_engine(SYNC_DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Add connection pool events for diagnostics
@event.listens_for(Engine, "connect")
def connect(dbapi_connection, connection_record):
    logger.info("Database connection established")

@event.listens_for(Engine, "checkout")
def checkout(dbapi_connection, connection_record, connection_proxy):
    logger.debug("Database connection checked out from pool")

@event.listens_for(Engine, "checkin")
def checkin(dbapi_connection, connection_record):
    logger.debug("Database connection returned to pool")

# ---------- ASYNC ENGINE (for FastAPI) ----------
ASYNC_DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
logger.info("Creating asynchronous database engine")
async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=True, future=True)
AsyncSessionLocal = sessionmaker(
    bind=async_engine, expire_on_commit=False, class_=AsyncSession
)

# ---------- Base ----------
Base = declarative_base()

# ---------- Dependencies ----------
def get_db():
    """Synchronous database session dependency"""
    logger.debug("Creating new synchronous database session")
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        raise
    finally:
        logger.debug("Closing synchronous database session")
        db.close()

async def get_async_db():
    """Asynchronous database session dependency"""
    logger.debug("Creating new asynchronous database session")
    try:
        async with AsyncSessionLocal() as session:
            yield session
            logger.debug("Asynchronous database session completed")
    except Exception as e:
        logger.error(f"Asynchronous database session error: {str(e)}")
        raise

# Function to test database connection
def test_db_connection():
    """Test database connection and return diagnostic information"""
    logger.info("Testing database connection")
    try:
        db = SessionLocal()
        # Execute a simple query with text()
        result = db.execute(text("SELECT version()")).fetchone()
        db.close()
        logger.info(f"Database connection successful: {result[0]}")
        return {"status": "connected", "version": result[0]}
    except Exception as e:
        logger.error(f"Database connection test failed: {str(e)}")
        return {"status": "error", "error": str(e)}
