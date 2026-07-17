import logging
import os
from pathlib import Path

from app.core.config import settings

# ----------------------------------------------------
# Create Log Directory
# ----------------------------------------------------
LOG_DIR = Path(settings.LOG_DIR)
LOG_DIR.mkdir(parents=True, exist_ok=True)

LOG_FILE = LOG_DIR / "backend.log"


# ----------------------------------------------------
# Logger Configuration
# ----------------------------------------------------
logger = logging.getLogger("AcousticSpace")

logger.setLevel(logging.INFO)

# Prevent duplicate logs
if not logger.handlers:

    # -----------------------------
    # File Handler
    # -----------------------------
    file_handler = logging.FileHandler(
        LOG_FILE,
        encoding="utf-8"
    )

    file_handler.setLevel(logging.INFO)

    # -----------------------------
    # Console Handler
    # -----------------------------
    console_handler = logging.StreamHandler()

    console_handler.setLevel(logging.INFO)

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
    logger.info(message)


def log_warning(message: str):
    logger.warning(message)


def log_error(message: str):
    logger.error(message)


def log_exception(message: str):
    logger.exception(message)