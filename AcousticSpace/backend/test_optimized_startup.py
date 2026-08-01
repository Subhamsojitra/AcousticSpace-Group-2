"""Test optimized startup time (without model loading)."""
import time
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

print("=" * 60)
print("TESTING OPTIMIZED STARTUP TIME")
print("=" * 60)

# Measure optimized startup
start = time.perf_counter()
print("\n[1] Starting optimized imports...")

import app.core.config
t1 = time.perf_counter() - start
print(f"✓ Config imported in {t1:.3f}s")

start = time.perf_counter()
print("\n[2] Importing database...")
import app.database.db
t2 = time.perf_counter() - start
print(f"✓ Database module imported in {t2:.3f}s")

start = time.perf_counter()
print("\n[3] Importing logger...")
import app.core.logger
t3 = time.perf_counter() - start
print(f"✓ Logger imported in {t3:.3f}s")

start = time.perf_counter()
print("\n[4] Importing FastAPI and routers...")
from fastapi import FastAPI
from app.api import upload, predict, analysis, history
t4 = time.perf_counter() - start
print(f"✓ Routers imported in {t4:.3f}s")

# Measure app initialization (simulating lifespan without model loading)
start = time.perf_counter()
print("\n[5] Simulating lifespan (folders + DB, no model)...")
from pathlib import Path
from app.database.db import Base, engine

# Ensure folders
for p in [app.core.config.settings.UPLOAD_DIR, 
          app.core.config.settings.FEATURE_DIR, 
          app.core.config.settings.MODEL_DIR, 
          app.core.config.settings.LOG_DIR]:
    Path(p).mkdir(parents=True, exist_ok=True)

# Initialize DB
Base.metadata.create_all(bind=engine)

# Initialize state (no model loading)
app = FastAPI(title="Test")
app.state.cnn_model = None
app.state.ast_model = None
app.state.feature_extractor = None
app.state.model_ready = False
app.state.model_loading = False

t5 = time.perf_counter() - start
print(f"✓ Lifespan simulation completed in {t5:.3f}s")

# Summary
total = t1 + t2 + t3 + t4 + t5

print("\n" + "=" * 60)
print("OPTIMIZED RESULTS")
print("=" * 60)
print(f"Config:                     {t1:.3f}s")
print(f"Database:                   {t2:.3f}s")
print(f"Logger:                     {t3:.3f}s")
print(f"Routers:                    {t4:.3f}s")
print(f"Lifespan (no model):        {t5:.3f}s")
print(f"\nTOTAL STARTUP TIME:         {total:.3f}s")
print("=" * 60)

if total > 3.0:
    print(f"\n⚠️  Startup time {total:.3f}s exceeds 3s target")
else:
    print(f"\n✓ Startup time {total:.3f}s is within 3s target!")
    print(f"  (Model will load on first prediction request)")