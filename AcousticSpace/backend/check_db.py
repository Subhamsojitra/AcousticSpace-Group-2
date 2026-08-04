from app.core.config import settings
from pathlib import Path

print("Database URL:", settings.DATABASE_URL)
db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))
print("Database file path:", db_path)
print("Database parent:", db_path.parent)
print("Parent exists:", db_path.parent.exists())
print("Database file exists:", db_path.exists())