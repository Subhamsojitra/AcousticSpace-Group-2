"""
Startup Benchmark Script

Measures the execution time of each startup stage to identify bottlenecks.
"""

import time
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

print("=" * 70)
print("BACKEND STARTUP BENCHMARK")
print("=" * 70)

# Stage 1: Import config
t0 = time.perf_counter()
from app.core.config import settings
t_config = time.perf_counter() - t0
print(f"Config ............ {t_config*1000:.2f} ms")

# Stage 2: Import database
t0 = time.perf_counter()
from app.database.db import Base, engine
from app.database.models import History
t_database = time.perf_counter() - t0
print(f"Database ......... {t_database*1000:.2f} ms")

# Stage 3: Import logging
t0 = time.perf_counter()
from app.core.logger import logger
t_logging = time.perf_counter() - t0
print(f"Logging .......... {t_logging*1000:.2f} ms")

# Stage 4: Import routers (this triggers service imports)
t0 = time.perf_counter()
from app.api.upload import router as upload_router
from app.api.predict import router as predict_router
from app.api.analysis import router as analysis_router
from app.api.history import router as history_router
t_routers = time.perf_counter() - t0
print(f"Routers .......... {t_routers*1000:.2f} ms")

# Stage 5: Check if ML libraries are imported
t0 = time.perf_counter()
ml_imports_started = False
try:
    import torch
    ml_imports_started = True
    t_ml_imports = time.perf_counter() - t0
    print(f"ML imports ....... {t_ml_imports*1000:.2f} ms (WARNING: Should be deferred!)")
except ImportError:
    t_ml_imports = 0
    print(f"ML imports ....... Deferred ✓")

# Stage 6: Check if transformers is imported
if not ml_imports_started:
    try:
        import transformers
        t_ml_imports = time.perf_counter() - t0
        print(f"Transformers ..... {t_ml_imports*1000:.2f} ms (WARNING: Should be deferred!)")
    except ImportError:
        print(f"Transformers ..... Deferred ✓")

# Stage 7: Create folders
t0 = time.perf_counter()
from pathlib import Path
for p in [settings.UPLOAD_DIR, settings.FEATURE_DIR, settings.MODEL_DIR, settings.LOG_DIR]:
    Path(p).mkdir(parents=True, exist_ok=True)
db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))
db_path.parent.mkdir(parents=True, exist_ok=True)
t_folders = time.perf_counter() - t0
print(f"Folder creation .. {t_folders*1000:.2f} ms")

# Stage 8: Database initialization
t0 = time.perf_counter()
Base.metadata.create_all(bind=engine)
t_db_init = time.perf_counter() - t0
print(f"DB initialization  {t_db_init*1000:.2f} ms")

# Total
total = t_config + t_database + t_logging + t_routers + t_folders + t_db_init
if ml_imports_started:
    total += t_ml_imports

print("=" * 70)
print(f"TOTAL STARTUP TIME: {total:.3f}s")
print("=" * 70)

if total < 3.0:
    print("✓ PASS: Startup time is under 3 seconds")
else:
    print("✗ FAIL: Startup time exceeds 3 seconds")
    print("\nBOTTLENECKS IDENTIFIED:")
    if t_routers > 0.5:
        print(f"  - Router imports: {t_routers:.3f}s (should be < 0.5s)")
    if ml_imports_started:
        print(f"  - ML imports during startup: {t_ml_imports:.3f}s (should be deferred)")
    if t_database > 0.5:
        print(f"  - Database initialization: {t_database:.3f}s")

sys.exit(0 if total < 3.0 else 1)