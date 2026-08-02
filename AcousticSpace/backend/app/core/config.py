from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Configuration
    All paths can be overridden via environment variables for Docker deployments.
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
    # BASE_DIR is computed automatically from this file's location
    BASE_DIR: Path = Path(__file__).resolve().parents[2]

    # These paths can be absolute or relative to BASE_DIR
    # In Docker, they will typically be absolute paths like /app/uploads
    UPLOAD_DIR: str = "backend/uploads"
    FEATURE_DIR: str = "backend/extracted_features"
    MODEL_DIR: str = "backend/saved_models"
    LOG_DIR: str = "backend/logs"

    # -----------------------------------
    # AST Model (Hugging Face)
    # -----------------------------------
    # Path to the trained AST model directory
    # Can be absolute path or relative to BASE_DIR
    # In Docker, mount the model as a volume and set this to /app/results/ast_final_model
    AST_MODEL_PATH: str = ""

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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # If AST_MODEL_PATH is not set via environment, compute default path
        if not self.AST_MODEL_PATH:
            # Default: results/ast_final_model relative to BASE_DIR
            self.AST_MODEL_PATH = str(self.BASE_DIR / "results" / "ast_final_model")


settings = Settings()