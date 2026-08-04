from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

from app.core.config import settings
from app.core.logger import logger

# ----------------------------------------
# Database URL
# ----------------------------------------
DATABASE_URL = settings.DATABASE_URL

# ----------------------------------------
# SQLAlchemy Engine with Production Pool Settings
# ----------------------------------------
# Use QueuePool for better connection management
# SQLite doesn't support connection pooling well, so we use NullPool for SQLite
if DATABASE_URL.startswith("sqlite"):
    # SQLite: Use NullPool (no pooling) with thread safety
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=None,  # Default pool for SQLite
        echo=settings.DEBUG,  # Log SQL queries in debug mode
    )
else:
    # PostgreSQL/MySQL: Use QueuePool with configured settings
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_pre_ping=True,  # Verify connections before using them
        echo=settings.DEBUG,  # Log SQL queries in debug mode
    )

# ----------------------------------------
# Session Factory
# ----------------------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)

# ----------------------------------------
# Base Class
# ----------------------------------------
Base = declarative_base()


# ----------------------------------------
# Dependency
# ----------------------------------------
def get_db():
    """
    Returns a database session.

    Automatically closes the session
    after the request is completed.
    
    Note: Endpoints are responsible for committing transactions.
    This function only ensures proper cleanup and rollback on errors.
    """

    db = SessionLocal()

    try:
        yield db
    except Exception as exc:
        db.rollback()  # Rollback on any error
        logger.error(f"Database session error: {exc}", exc_info=True)
        raise
    finally:
        db.close()  # Always close the session
