import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from app.core.config import settings

# ----------------------------------------------------
# Create Log Directory
# ----------------------------------------------------
LOG_DIR = Path(settings.LOG_DIR)
LOG_DIR.mkdir(parents=True, exist_ok=True)

LOG_FILE = LOG_DIR / "backend.log"

# ----------------------------------------------------
# Log Level (configurable via LOG_LEVEL env var)
# ----------------------------------------------------
LOG_LEVEL = getattr(logging, str(settings.LOG_LEVEL).upper(), logging.INFO)


# ----------------------------------------------------
# Logger Configuration
# ----------------------------------------------------
logger = logging.getLogger("AcousticSpace")

logger.setLevel(LOG_LEVEL)

# Prevent duplicate handlers on reload (e.g. uvicorn --reload)
if not logger.handlers:

    # -----------------------------
    # File Handler (with rotation)
    # -----------------------------
    file_handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=settings.LOG_MAX_BYTES,
        backupCount=settings.LOG_BACKUP_COUNT,
        encoding="utf-8",
    )

    file_handler.setLevel(LOG_LEVEL)

    # -----------------------------
    # Console Handler
    # -----------------------------
    console_handler = logging.StreamHandler()

    console_handler.setLevel(LOG_LEVEL)

    # -----------------------------
    # Log Format
    # -----------------------------
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    # -----------------------------
    # Attach Handlers
    # -----------------------------
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)


# ----------------------------------------------------
# Logging Helper Functions
# ----------------------------------------------------
def log_info(message: str):
    """Log info level message."""
    logger.info(message)


def log_warning(message: str):
    """Log warning level message."""
    logger.warning(message)


def log_error(message: str, exc_info: bool = False):
    """Log error level message.
    
    Parameters
    ----------
    message : str
        The error message to log.
    exc_info : bool
        Whether to include exception traceback information.
    """
    logger.error(message, exc_info=exc_info)


def log_exception(message: str):
    """Log exception with traceback."""
    logger.exception(message)


def log_critical(message: str):
    """Log critical level message."""
    logger.critical(message)


def log_shutdown():
    """Log application shutdown."""
    logger.info("=" * 60)
    logger.info("AcousticSpace backend shutting down...")
    logger.info("=" * 60)


# ----------------------------------------------------
# Structured Lifecycle Logging Helpers
# ----------------------------------------------------
def log_startup_complete(duration_seconds: float):
    """Log that the backend finished starting up."""
    logger.info("Backend Started", extra={"startup_time_seconds": round(duration_seconds, 3)})


def log_model_loaded(message: str, load_time_seconds: float = 0.0):
    """Log that the ML model was loaded."""
    logger.info(
        f"Model Loaded: {message}",
        extra={"model_load_time_seconds": round(load_time_seconds, 3)},
    )


def log_prediction_started(file_path: str, request_id: str = ""):
    """Log that a prediction has started."""
    logger.info("Prediction Started", extra={"file_path": file_path, "request_id": request_id})


def log_prediction_finished(prediction: str, confidence: float, duration_seconds: float):
    """Log that a prediction has finished."""
    logger.info(
        "Prediction Finished",
        extra={
            "prediction": prediction,
            "confidence": confidence,
            "processing_time_seconds": round(duration_seconds, 3),
        },
    )


def log_upload_completed(uploaded_file: str, size_bytes: int):
    """Log that an upload was completed."""
    logger.info("Upload Completed", extra={"uploaded_file": uploaded_file, "size_bytes": size_bytes})


def log_analysis_started(file_path: str, request_id: str = ""):
    """Log that an analysis has started."""
    logger.info("Analysis Started", extra={"file_path": file_path, "request_id": request_id})


def log_analysis_finished(processing_time_seconds: float):
    """Log that an analysis has finished."""
    logger.info(
        "Analysis Finished",
        extra={"processing_time_seconds": round(processing_time_seconds, 3)},
    )


def log_file_deleted(filename: str, file_path: str):
    """Log that a file was deleted."""
    logger.info("File Deleted", extra={"filename": filename, "file_path": file_path})


def log_history_cleared(deleted_count: int):
    """Log that history was cleared."""
    logger.info("History Cleared", extra={"deleted_count": deleted_count})


def log_history_retrieved(count: int):
    """Log that history was retrieved."""
    logger.info("History Retrieved", extra={"count": count})
