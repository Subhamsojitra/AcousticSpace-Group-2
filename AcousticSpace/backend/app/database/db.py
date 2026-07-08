from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# ----------------------------------------
# Database URL
# ----------------------------------------
DATABASE_URL = settings.DATABASE_URL

# ----------------------------------------
# SQLAlchemy Engine
# ----------------------------------------
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# ----------------------------------------
# Session Factory
# ----------------------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
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
    """

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()