"""Startup time measurement script."""
import time
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

print("=" * 60)
print("MEASURING STARTUP TIME")
print("=" * 60)

# Measure 1: Import time
start = time.perf_counter()
print("\n[1] Starting imports...")
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

# Measure 2: App initialization (without model loading)
start = time.perf_counter()
print("\n[5] Creating FastAPI app (no model loading)...")
app = FastAPI(title="Test", lifespan=None)
t5 = time.perf_counter() - start
print(f"✓ FastAPI app created in {t5:.3f}s")

# Measure 3: Heavy imports (torch, transformers)
start = time.perf_counter()
print("\n[6] Importing torch...")
import torch
t6a = time.perf_counter() - start
print(f"✓ Torch imported in {t6a:.3f}s")

start = time.perf_counter()
print("\n[7] Importing transformers...")
from transformers import ASTForAudioClassification, ASTFeatureExtractor
t6b = time.perf_counter() - start
print(f"✓ Transformers imported in {t6b:.3f}s")

# Measure 4: Model loading (if model exists)
model_path = Path(__file__).parent / "results" / "ast_final_model"
if model_path.exists():
    start = time.perf_counter()
    print(f"\n[8] Loading AST model from {model_path}...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = ASTForAudioClassification.from_pretrained(str(model_path)).to(device)
    model.eval()
    feature_extractor = ASTFeatureExtractor.from_pretrained(str(model_path))
    t7 = time.perf_counter() - start
    print(f"✓ AST model loaded in {t7:.3f}s on {device}")
else:
    print(f"\n[8] Model not found at {model_path}, skipping...")
    t7 = 0

# Summary
total_imports = t1 + t2 + t3 + t4 + t5
total_heavy = t6a + t6b + t7
total = total_imports + total_heavy

print("\n" + "=" * 60)
print("BASELINE RESULTS")
print("=" * 60)
print(f"Lightweight imports:        {total_imports:.3f}s")
print(f"  - Config:                 {t1:.3f}s")
print(f"  - Database:               {t2:.3f}s")
print(f"  - Logger:                 {t3:.3f}s")
print(f"  - Routers:                {t4:.3f}s")
print(f"  - FastAPI app:            {t5:.3f}s")
print(f"\nHeavy imports + model:      {total_heavy:.3f}s")
print(f"  - Torch:                  {t6a:.3f}s")
print(f"  - Transformers:           {t6b:.3f}s")
if t7 > 0:
    print(f"  - AST model loading:      {t7:.3f}s")
print(f"\nTOTAL STARTUP TIME:         {total:.3f}s")
print("=" * 60)

if total > 3.0:
    print(f"\n⚠️  Startup time {total:.3f}s exceeds 3s target")
    print(f"   Model loading accounts for {t7:.3f}s ({100*t7/total:.1f}%)")
else:
    print(f"\n✓ Startup time {total:.3f}s is within 3s target")