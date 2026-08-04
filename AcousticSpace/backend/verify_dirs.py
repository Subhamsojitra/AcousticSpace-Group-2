from app.core.config import settings
from pathlib import Path

dirs = [
    settings.UPLOAD_DIR,
    settings.FEATURE_DIR,
    settings.MODEL_DIR,
    settings.LOG_DIR,
    settings.RESULTS_DIR,
    settings.DATABASE_DIR,
]

print("Runtime directories:")
for d in dirs:
    path = Path(d)
    exists = path.exists()
    print(f"  {d}: {'EXISTS' if exists else 'MISSING'}")