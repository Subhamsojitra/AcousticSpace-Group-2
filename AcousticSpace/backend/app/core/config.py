import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Configuration

    All values can be overridden via environment variables or a `.env` file.
    Relative paths are resolved to absolute paths under the project root.
    """

    # -----------------------------------
    # App Information
    # -----------------------------------
    APP_NAME: str = "AcousticSpace API"
    APP_VERSION: str = "1.0.0"

    # -----------------------------------
    # Server
    # -----------------------------------
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # CORS origins (comma-separated) - configurable for production
    CORS_ALLOW_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL
    LOG_LEVEL: str = "INFO"

    # -----------------------------------
    # Project Paths
    # -----------------------------------
    # BASE_DIR is computed automatically from this file's location
    # Path: app/core/config.py -> parents[3] = project root (AcousticSpace/)
    BASE_DIR: Path = Path(__file__).resolve().parents[3]

    # These paths can be absolute or relative to BASE_DIR
    UPLOAD_DIR: str = "backend/uploads"
    FEATURE_DIR: str = "backend/extracted_features"
    MODEL_DIR: str = "backend/saved_models"
    LOG_DIR: str = "backend/logs"
    RESULTS_DIR: str = "backend/results"
    DATABASE_DIR: str = "backend/database"

    # -----------------------------------
    # AST Model (Hugging Face)
    # -----------------------------------
    # Path to the trained AST model directory
    # Can be absolute path or relative to BASE_DIR
    AST_MODEL_PATH: str = ""

    # Model device: cuda, mps, cpu (auto-detected if not set)
    MODEL_DEVICE: str = ""

    # Model name for logging and identification
    MODEL_NAME: str = "AST"

    # Model cache directory for Hugging Face
    MODEL_CACHE_DIR: str = ""

    # Enable lazy model loading (recommended for faster startup)
    ENABLE_LAZY_LOADING: bool = True

    # -----------------------------------
    # Database
    # -----------------------------------
    DATABASE_URL: str = "sqlite:///backend/acousticspace.db"
    
    # Database connection pool settings
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800  # 30 minutes

    # -----------------------------------
    # File Upload
    # -----------------------------------
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024

    ALLOWED_EXTENSIONS: str = ".wav,.mp3,.flac,.ogg,.m4a"

    # -----------------------------------
    # Logging
    # -----------------------------------
    LOG_MAX_BYTES: int = 10 * 1024 * 1024  # 10 MB rotation
    LOG_BACKUP_COUNT: int = 5

    # -----------------------------------
    # Security
    # -----------------------------------
    # NOTE: In production, override this via environment variable.
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-secret-key-in-production")
    
    # Allowed hosts for CORS (comma-separated)
    # In production, specify exact origins instead of wildcards
    ALLOWED_HOSTS: str = "localhost,127.0.0.1"
    
    # Maximum filename length for uploaded files
    MAX_FILENAME_LENGTH: int = 255
    
    # Enable request validation logging
    LOG_VALIDATION_ERRORS: bool = True

    # -----------------------------------
    # Pydantic Configuration
    # -----------------------------------
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

    def _resolve_path(self, value: str) -> Path:
        """Resolve a possibly-relative path to an absolute path under BASE_DIR."""
        path = Path(value)
        if path.is_absolute():
            return path
        return (self.BASE_DIR / path).resolve()

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Resolve all relative paths to absolute for cross-platform compatibility.
        self.UPLOAD_DIR = str(self._resolve_path(self.UPLOAD_DIR))
        self.FEATURE_DIR = str(self._resolve_path(self.FEATURE_DIR))
        self.MODEL_DIR = str(self._resolve_path(self.MODEL_DIR))
        self.LOG_DIR = str(self._resolve_path(self.LOG_DIR))
        self.RESULTS_DIR = str(self._resolve_path(self.RESULTS_DIR))
        self.DATABASE_DIR = str(self._resolve_path(self.DATABASE_DIR))

        # Resolve database URL (only for sqlite relative paths).
        if self.DATABASE_URL.startswith("sqlite:///"):
            db_rel = self.DATABASE_URL.replace("sqlite:///", "")
            # Only rewrite if it is a relative path (not an absolute or in-memory).
            if db_rel and not Path(db_rel).is_absolute() and db_rel != ":memory:":
                self.DATABASE_URL = f"sqlite:///{self._resolve_path(db_rel)}"

        # If AST_MODEL_PATH is not set via environment, compute default path.
        if not self.AST_MODEL_PATH:
            # Default: results/ast_final_model relative to project root.
            # BASE_DIR is now the project root (AcousticSpace/).
            self.AST_MODEL_PATH = str((self.BASE_DIR / "results" / "ast_final_model").resolve())
        else:
            self.AST_MODEL_PATH = str(self._resolve_path(self.AST_MODEL_PATH))


settings = Settings()
