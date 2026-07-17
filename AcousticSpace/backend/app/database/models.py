from sqlalchemy import Column, DateTime, Float, Integer, String
from sqlalchemy.sql import func

from app.database.db import Base


class History(Base):
    """
    Database model for storing audio analysis history.
    """

    __tablename__ = "history"

    # -----------------------------------
    # Primary Key
    # -----------------------------------
    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # -----------------------------------
    # File Information
    # -----------------------------------
    filename = Column(
        String,
        nullable=False
    )

    original_filename = Column(
        String,
        nullable=False
    )

    file_path = Column(
        String,
        nullable=False
    )

    # -----------------------------------
    # Audio Information
    # -----------------------------------
    duration = Column(
        Float,
        nullable=True
    )

    sample_rate = Column(
        Integer,
        nullable=True
    )

    # -----------------------------------
    # Prediction Result
    # -----------------------------------
    prediction = Column(
        String,
        nullable=True
    )

    confidence = Column(
        Float,
        nullable=True
    )

    # -----------------------------------
    # Analysis Information
    # -----------------------------------
    processing_time = Column(
        Float,
        nullable=True
    )

    # -----------------------------------
    # Timestamp
    # -----------------------------------
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # -----------------------------------
    # String Representation
    # -----------------------------------
    def __repr__(self):
        return (
            f"<History(id={self.id}, "
            f"filename='{self.filename}', "
            f"prediction='{self.prediction}')>"
        )