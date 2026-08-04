"""Test that the app starts up and creates all directories."""
from app.main import lifespan
from app.core.config import settings
from pathlib import Path

# Simulate startup by triggering lifespan
async def test_startup():
    # Create a mock app object
    class MockApp:
        state = type('obj', (object,), {})()
    
    app = MockApp()
    async with lifespan(app):
        pass

import asyncio
asyncio.run(test_startup())

# Check all directories
dirs = {
    "UPLOAD_DIR": settings.UPLOAD_DIR,
    "FEATURE_DIR": settings.FEATURE_DIR,
    "MODEL_DIR": settings.MODEL_DIR,
    "LOG_DIR": settings.LOG_DIR,
    "RESULTS_DIR": settings.RESULTS_DIR,
    "DATABASE_DIR": settings.DATABASE_DIR,
}

print("Runtime directories after startup:")
all_exist = True
for name, path in dirs.items():
    exists = Path(path).exists()
    status = "EXISTS" if exists else "MISSING"
    print(f"  {name}: {path} - {status}")
    if not exists:
        all_exist = False

print()
if all_exist:
    print("✓ All directories created successfully!")
else:
    print("✗ Some directories are missing")