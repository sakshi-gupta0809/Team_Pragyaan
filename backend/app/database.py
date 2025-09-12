import os
import logging
from sqlalchemy import create_engine, event, text, inspect, MetaData, Table, Column
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

# ---------- Auto Migration ----------
def auto_migrate():
    """
    Automatically check for missing columns in the database and add them.
    This ensures that the database schema matches the SQLAlchemy models.
    """
    logger.info("Starting automatic schema migration check")
    try:
        # Create an inspector to examine the database
        inspector = inspect(engine)
        
        # Import all models to ensure they're registered with Base
        from .models import User, Contact, Campaign, EmailTemplate, EmailLog, Schedule, FollowUp
        
        # Check each table in the models
        for table_name, table in Base.metadata.tables.items():
            logger.info(f"Checking table {table_name} for schema updates")
            
            # Skip if table doesn't exist yet
            if not inspector.has_table(table_name):
                logger.warning(f"Table {table_name} doesn't exist yet, skipping")
                continue
                
            # Get existing columns in the database
            existing_columns = {col['name'] for col in inspector.get_columns(table_name)}
            
            # Get columns defined in the model
            model_columns = {col.name for col in table.columns}
            
            # Find missing columns
            missing_columns = model_columns - existing_columns
            
            if missing_columns:
                logger.info(f"Found missing columns in table {table_name}: {missing_columns}")
                
                # Add each missing column
                for col_name in missing_columns:
                    # Get column definition from model
                    col = next(c for c in table.columns if c.name == col_name)
                    
                    # Create ALTER TABLE statement
                    col_type = col.type.compile(dialect=engine.dialect)
                    alter_stmt = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"
                    
                    # Add nullable constraint if needed
                    if not col.nullable:
                        alter_stmt += " NOT NULL"
                        
                    # Add default value if specified and it's a simple value
                    if col.default is not None and not col.default.is_callable:
                        default_val = col.default.arg
                        if isinstance(default_val, bool):
                            default_val = "TRUE" if default_val else "FALSE"
                        elif isinstance(default_val, (int, float)):
                            default_val = str(default_val)
                        elif isinstance(default_val, str):
                            default_val = f"'{default_val}'"
                        else:
                            # Skip complex defaults
                            default_val = None
                            
                        if default_val is not None:
                            alter_stmt += f" DEFAULT {default_val}"
                    
                    # Execute the ALTER TABLE statement
                    logger.info(f"Executing: {alter_stmt}")
                    try:
                        with engine.connect() as conn:
                            conn.execute(text(alter_stmt))
                            conn.commit()
                        logger.info(f"Successfully added column {col_name} to table {table_name}")
                    except Exception as e:
                        logger.error(f"Error adding column {col_name}: {str(e)}")
            else:
                logger.info(f"No missing columns found in table {table_name}")
                
        logger.info("Database schema check completed successfully")
    except Exception as e:
        logger.error(f"Error during automatic schema migration: {str(e)}")

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
