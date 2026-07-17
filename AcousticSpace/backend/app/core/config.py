from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Configuration
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

    # -----------------------------------
    # Project Paths
    # -----------------------------------
    BASE_DIR: Path = Path(__file__).resolve().parents[2]

    UPLOAD_DIR: str = "backend/uploads"
    FEATURE_DIR: str = "backend/extracted_features"
    MODEL_DIR: str = "backend/saved_models"
    LOG_DIR: str = "backend/logs"

    # -----------------------------------
    # Database
    # -----------------------------------
    DATABASE_URL: str = "sqlite:///backend/acousticspace.db"

    # -----------------------------------
    # File Upload
    # -----------------------------------
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024

    ALLOWED_EXTENSIONS: str = ".wav,.mp3,.flac,.ogg,.m4a"

    # -----------------------------------
    # Security
    # -----------------------------------
    SECRET_KEY: str = "change-this-secret-key"

    # -----------------------------------
    # Pydantic Configuration
    # -----------------------------------
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()