# AcousticSpace - Testing and Verification Guide

## Overview

This document provides comprehensive testing instructions for verifying the production-ready ML model deployment.

## Prerequisites

1. **Python 3.9+** installed
2. **Dependencies installed:**
```bash
cd backend
pip install -r requirements.txt
```

3. **Model files present:**
```bash
ls -la results/ast_final_model/
# Expected: config.json, model.safetensors, preprocessor_config.json
```

4. **Environment configured:**
```bash
cp .env.example .env
# Edit .env if needed
```

## Test Suite

### 1. Startup Test

**Objective:** Verify application starts in < 3 seconds

**Command:**
```bash
cd backend
python -c "
import time
from app.main import app

start = time.perf_counter()
from fastapi.testclient import TestClient
client = TestClient(app)
elapsed = time.perf_counter() - start

print(f'Startup time: {elapsed:.3f}s')
print(f'Status: {\"✓ PASS\" if elapsed < 3.0 else \"✗ FAIL\"}')"
```

**Expected Result:**
```
Startup time: 2.XXXs
Status: ✓ PASS
```

---

### 2. Health Check Test

**Objective:** Verify health endpoint returns correct structure

**Command:**
```bash
# Start server in background
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test health endpoint
curl -s http://localhost:8000/ | python -m json.tool

# Kill server
kill $SERVER_PID
```

**Expected Response (Before Model Load):**
```json
{
    "status": "running",
    "project": "AcousticSpace",
    "version": "1.0.0",
    "message": "Backend is running successfully.",
    "model_loaded": false,
    "device": "none",
    "model": "AST",
    "lazy_loading": true
}
```

**Expected Response (After Model Load):**
```json
{
    "status": "running",
    "project": "AcousticSpace",
    "version": "1.0.0",
    "message": "Backend is running successfully.",
    "model_loaded": true,
    "device": "cuda",
    "model": "AST",
    "lazy_loading": true,
    "load_time_seconds": 2.45
}
```

---

### 3. Model Loader Test

**Objective:** Verify model loader singleton pattern and functionality

**Command:**
```bash
cd backend
python -c "
from app.ml.model_loader import get_model_loader

# Test singleton pattern
loader1 = get_model_loader()
loader2 = get_model_loader()

print('Singleton test:', '✓ PASS' if loader1 is loader2 else '✗ FAIL')

# Test initial state
print('Initially loaded:', loader1.is_loaded())

# Test model loading
success, message = loader1.load_model()
print('Load success:', '✓ PASS' if success else '✗ FAIL')
print('Load message:', message)

# Test after loading
print('After load:', loader1.is_loaded())
print('Device:', loader1.get_device())
print('Load time:', loader1.get_load_time())

# Test model info
info = loader1.get_model_info()
print('Model info:', info)
"
```

**Expected Output:**
```
Singleton test: ✓ PASS
Initially loaded: False
Loading AST model...
✓ CUDA detected: NVIDIA GeForce RTX 3080
✓ Model loaded successfully!
  Device: cuda
  Total parameters: 87,090,432
  Trainable parameters: 87,090,432
  Load time: 2.45s
Load success: ✓ PASS
Load message: Model loaded successfully on cuda in 2.45s
After load: True
Device: cuda
Load time: 2.45
Model info: {
    'loaded': True,
    'device': 'cuda',
    'model_path': '/app/results/ast_final_model',
    'load_time_seconds': 2.45,
    'total_parameters': 87090432
}
```

---

### 4. Audio Validation Test

**Objective:** Verify audio validation catches invalid files

**Command:**
```bash
cd backend
python -c "
from app.services.audio_validation import validate_audio_file

# Test 1: Non-existent file
valid, info = validate_audio_file('/tmp/nonexistent.wav')
print('Test 1 - Non-existent file:', '✓ PASS' if not valid else '✗ FAIL')
print('  Error:', info.get('error'))

# Test 2: Empty file
with open('/tmp/empty.wav', 'w') as f:
    f.write('')
valid, info = validate_audio_file('/tmp/empty.wav')
print('Test 2 - Empty file:', '✓ PASS' if not valid else '✗ FAIL')

# Test 3: Unsupported format
with open('/tmp/test.txt', 'w') as f:
    f.write('not audio')
valid, info = validate_audio_file('/tmp/test.txt')
print('Test 3 - Unsupported format:', '✓ PASS' if not valid else '✗ FAIL')
print('  Error:', info.get('error'))
"
```

**Expected Output:**
```
Test 1 - Non-existent file: ✓ PASS
  Error: File does not exist: /tmp/nonexistent.wav
Test 2 - Empty file: ✓ PASS
Test 3 - Unsupported format: ✓ PASS
  Error: Unsupported audio format: txt. Allowed: wav, mp3, flac, ogg, m4a
```

---

### 5. Prediction API Test

**Objective:** Verify prediction API works with and without model

**Command:**
```bash
cd backend
python -c "
import time
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Create a dummy audio file (you need a real audio file for this test)
# For now, we'll just test the endpoint structure
print('Testing prediction endpoint...')

# Note: This requires a real audio file
# python -c "
# with open('test.wav', 'rb') as f:
#     files = {'file': ('test.wav', f, 'audio/wav')}
#     response = client.post('/api/predict', files=files)
#     print('Status:', response.status_code)
#     print('Response:', response.json())
# "
"
```

---

### 6. Hardware Detection Test

**Objective:** Verify hardware detection works correctly

**Command:**
```bash
cd backend
python -c "
import torch
from app.ml.model_loader import ModelLoader

loader = ModelLoader()

# Test device detection
if torch.cuda.is_available():
    print('✓ CUDA available')
    print('  Device:', torch.cuda.get_device_name(0))
elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
    print('✓ MPS (Apple Silicon) available')
else:
    print('✓ Using CPU')

# Test device selection
device = loader.detect_device()
print('Selected device:', device)
"
```

**Expected Output (CPU):**
```
✓ Using CPU
Selected device: cpu
```

**Expected Output (CUDA):**
```
✓ CUDA available
  Device: NVIDIA GeForce RTX 3080
Selected device: cuda
```

---

### 7. Error Handling Test

**Objective:** Verify graceful failure when model is missing

**Command:**
```bash
cd backend
python -c "
import os
from app.core.config import settings
from app.ml.model_loader import get_model_loader, ModelLoadError

# Temporarily set invalid model path
original_path = settings.AST_MODEL_PATH
settings.AST_MODEL_PATH = '/tmp/nonexistent_model'

# Try to load model
loader = get_model_loader()
try:
    success, message = loader.load_model()
    print('Load failed gracefully:', '✓ PASS' if not success else '✗ FAIL')
    print('Message:', message)
except ModelLoadError as e:
    print('Exception caught:', '✓ PASS')
    print('Error:', str(e))
finally:
    # Restore path
    settings.AST_MODEL_PATH = original_path
"
```

**Expected Output:**
```
Load failed gracefully: ✓ PASS
Message: Failed to load model: Model directory does not exist: /tmp/nonexistent_model
```

---

### 8. Performance Benchmark

**Objective:** Measure performance metrics

**Command:**
```bash
cd backend
python benchmark.py --audio-path /path/to/test/audio.wav --iterations 3
```

**Expected Output:**
```
==================================================
🚀 AcousticSpace Backend Benchmark
==================================================

📊 Performance Metrics:
  Startup time:           2.XXXs
  Model load time:        X.XXXs
  First prediction:       X.XXXs (includes model load)
  Second prediction:      X.XXXs (cached model)
  Average prediction:     X.XXXs

💾 Memory Usage:
  Memory before:          XXX.X MB
  Memory after:           XXX.X MB
  Memory increase:        XXX.X MB
  Peak memory:            XXX.X MB

✅ Success Criteria:
  ✓ Startup < 3.0s: X.XXXs
  ✓ Model load < 5.0s: X.XXXs
  ✓ First prediction < 30.0s: X.XXXs
  ✓ Second prediction < 10.0s: X.XXXs
```

---

### 9. Logging Test

**Objective:** Verify structured logging is working

**Command:**
```bash
cd backend
tail -f backend/logs/backend.log
```

**Expected Log Format:**
```
2025-01-15 10:30:45 | INFO | AcousticSpace | ============================================================
2025-01-15 10:30:45 | INFO | AcousticSpace | AcousticSpace backend starting...
2025-01-15 10:30:45 | INFO | AcousticSpace | ============================================================
2025-01-15 10:30:45 | INFO | AcousticSpace | ✓ Runtime folders ensured in 0.012s
2025-01-15 10:30:45 | INFO | AcousticSpace | ✓ Database tables initialized in 0.045s
2025-01-15 10:30:45 | INFO | AcousticSpace | ✓ App state initialized (model will load on first prediction)
2025-01-15 10:30:45 | INFO | AcousticSpace | ============================================================
2025-01-15 10:30:45 | INFO | AcousticSpace | ✓ Startup completed in 2.234s
2025-01-15 10:30:45 | INFO | AcousticSpace |   (AST model will load on first prediction request)
2025-01-15 10:30:45 | INFO | AcousticSpace | ============================================================
```

---

### 10. Docker Deployment Test

**Objective:** Verify Docker container starts correctly

**Command:**
```bash
# Build image
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Test health endpoint
curl http://localhost:8000/

# Stop services
docker-compose down
```

**Expected Logs:**
```
backend_1  | ============================================================
backend_1  | AcousticSpace backend starting...
backend_1  | ============================================================
backend_1  | ✓ Runtime folders ensured in 0.012s
backend_1  | ✓ Database tables initialized in 0.045s
backend_1  | ✓ App state initialized (model will load on first prediction)
backend_1  | ============================================================
backend_1  | ✓ Startup completed in 2.234s
backend_1  |   (AST model will load on first prediction request)
backend_1  | ============================================================
backend_1  | INFO:     Started server process [1]
backend_1  | INFO:     Waiting for application startup.
backend_1  | INFO:     Application startup complete.
backend_1  | INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## Automated Test Suite

Run all tests automatically:

```bash
cd backend
python -m pytest tests/ -v
```

**Or run individual test files:**
```bash
# Startup test
python test_startup.py

# Optimized startup test
python test_optimized_startup.py

# API tests
python test_apis.py
```

---

## Verification Checklist

### Model Loading
- [ ] Model loads only once (singleton pattern)
- [ ] Model is reused for subsequent requests
- [ ] No duplicate loading occurs
- [ ] Thread-safe initialization
- [ ] Graceful failure on missing model
- [ ] Proper error messages in logs

### Configuration
- [ ] Environment variables are read correctly
- [ ] Default paths work
- [ ] Custom paths work
- [ ] Docker paths work

### Hardware Detection
- [ ] CUDA detected when available
- [ ] MPS detected on Apple Silicon
- [ ] CPU fallback works
- [ ] Correct device is logged
- [ ] Model loads on correct device

### Audio Validation
- [ ] Rejects non-existent files
- [ ] Rejects empty files
- [ ] Rejects unsupported formats
- [ ] Validates sample rate
- [ ] Validates duration
- [ ] Detects silent audio
- [ ] Provides clear error messages

### Performance
- [ ] Startup < 3s
- [ ] Model load < 5s
- [ ] First prediction < 30s
- [ ] Second prediction < 10s
- [ ] No memory leaks
- [ ] Memory usage stable

### Logging
- [ ] Startup logs present
- [ ] Model load logs present
- [ ] Prediction logs present
- [ ] Error logs present
- [ ] Timestamps present
- [ ] Log levels correct

### Health Check
- [ ] Returns correct structure
- [ ] Shows model status
- [ ] Shows device info
- [ ] Shows lazy loading flag
- [ ] Works before model load
- [ ] Works after model load

### Error Handling
- [ ] Missing model → graceful degradation
- [ ] Invalid audio → clear error message
- [ ] Corrupted model → graceful degradation
- [ ] API errors → proper HTTP status codes
- [ ] Exceptions are logged

### Docker
- [ ] Container builds successfully
- [ ] Container starts successfully
- [ ] Health check works
- [ ] Model files accessible
- [ ] Logs are visible
- [ ] Environment variables work

### API Compatibility
- [ ] Prediction API unchanged
- [ ] Response format unchanged
- [ ] Frontend compatibility maintained
- [ ] All endpoints work
- [ ] CORS configured correctly

---

## Common Issues and Solutions

### Issue: Model not loading

**Symptoms:**
- Health check shows `"model_loaded": false`
- Mock predictions being used

**Debug:**
```bash
# Check model files
ls -la results/ast_final_model/

# Check logs
tail -f backend/logs/backend.log

# Test model loader
python -c "from app.ml.model_loader import get_model_loader; print(get_model_loader().get_model_info())"
```

**Solution:**
- Ensure model files exist
- Check file permissions
- Verify `AST_MODEL_PATH` in `.env`

---

### Issue: Slow startup

**Symptoms:**
- Startup time > 3s

**Debug:**
```bash
python -c "
import time
from fastapi.testclient import TestClient
from app.main import app

start = time.perf_counter()
client = TestClient(app)
print(f'Startup: {time.perf_counter() - start:.3f}s')
"
```

**Solution:**
- Model should NOT load during startup (lazy loading)
- Check for blocking operations in lifespan
- Optimize database initialization

---

### Issue: CUDA out of memory

**Symptoms:**
- Model loading fails
- CUDA OOM errors in logs

**Solution:**
```env
# Use CPU instead
MODEL_DEVICE=cpu
```

Or reduce model size if possible.

---

### Issue: Import errors

**Symptoms:**
- `ModuleNotFoundError` on startup

**Solution:**
```bash
# Reinstall dependencies
pip install -r requirements.txt

# Check Python path
python -c "import sys; print('\n'.join(sys.path))"
```

---

## Performance Baselines

### Target Metrics

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Startup time | < 2s | 2-3s | > 3s |
| Model load time | < 3s | 3-5s | > 5s |
| First prediction | < 5s | 5-10s | > 10s |
| Second prediction | < 2s | 2-5s | > 5s |
| Memory usage | < 1GB | 1-2GB | > 2GB |

### Actual Measurements

Record your actual measurements:

```
Startup time:           X.XXXs
Model load time:        X.XXXs
First prediction:       X.XXXs
Second prediction:      X.XXXs
Average prediction:     X.XXXs
Memory before:          XXX.X MB
Memory after:           XXX.X MB
Memory increase:        XXX.X MB
Peak memory:            XXX.X MB
```

---

## Sign-Off

Once all tests pass:

- [ ] All verification checklist items completed
- [ ] Performance baselines met
- [ ] Documentation reviewed
- [ ] Team approval obtained
- [ ] Ready for production deployment

**Verified by:** _______________

**Date:** _______________

**Notes:**
```
[Add any notes or observations here]