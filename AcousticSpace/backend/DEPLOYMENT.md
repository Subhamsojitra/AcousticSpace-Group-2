# AcousticSpace - ML Model Deployment Guide

## Overview

This document describes the production-ready ML model deployment architecture for AcousticSpace's deepfake audio detection system.

## Architecture

### Model Loading Strategy

**Lazy Loading with Singleton Pattern**

The AST model uses a production-ready lazy loading strategy:

1. **Startup**: Model is NOT loaded during application startup
2. **First Request**: Model loads on first prediction request
3. **Subsequent Requests**: Model is reused from memory (singleton)
4. **Benefits**: 
   - Fast startup (< 3 seconds)
   - Memory efficient
   - Graceful degradation if model fails to load

### Key Components

#### 1. Model Loader (`app/ml/model_loader.py`)

**Features:**
- Thread-safe singleton pattern
- Hardware detection (CUDA > MPS > CPU)
- Model file validation
- Graceful error handling
- Resource cleanup
- Detailed logging

**Usage:**
```python
from app.ml.model_loader import get_model_loader

# Get singleton instance
model_loader = get_model_loader()

# Load model (only loads once)
success, message = model_loader.load_model()

# Get loaded components
model = model_loader.get_model()
feature_extractor = model_loader.get_feature_extractor()
device = model_loader.get_device()

# Check status
is_loaded = model_loader.is_loaded()
load_time = model_loader.get_load_time()
model_info = model_loader.get_model_info()
```

#### 2. Configuration (`app/core/config.py`)

**Environment Variables:**

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `AST_MODEL_PATH` | Path to model directory | `BASE_DIR/results/ast_final_model` | `/app/results/ast_final_model` |
| `MODEL_DEVICE` | Device override (auto-detected if empty) | `""` (auto) | `cuda`, `mps`, `cpu` |
| `MODEL_NAME` | Model identifier | `AST` | `AST` |
| `MODEL_CACHE_DIR` | HuggingFace cache directory | `""` (default) | `/root/.cache/huggingface` |

**Example `.env` configuration:**
```env
# Model Configuration
AST_MODEL_PATH=/app/results/ast_final_model
MODEL_DEVICE=cuda
MODEL_NAME=AST
MODEL_CACHE_DIR=/root/.cache/huggingface
```

#### 3. Hardware Detection

**Automatic Device Selection:**

The system automatically detects and uses the best available hardware:

1. **CUDA** (NVIDIA GPU) - Highest priority
2. **MPS** (Apple Silicon) - Medium priority  
3. **CPU** - Fallback

**Logging:**
```
✓ CUDA detected: NVIDIA GeForce RTX 3080
✓ Model loaded successfully on cuda
```

Or:
```
✓ MPS (Apple Silicon) detected
✓ Model loaded successfully on mps
```

Or:
```
✓ Using CPU (no GPU detected)
✓ Model loaded successfully on cpu
```

#### 4. Audio Validation (`app/services/audio_validation.py`)

**Validation Checks:**

Before processing, all audio files are validated:

- ✅ File existence
- ✅ File readability
- ✅ File format (WAV, MP3, FLAC, OGG, M4A)
- ✅ Sample rate (16000, 22050, 44100, 48000 Hz)
- ✅ Duration (1s - 5min)
- ✅ Non-empty audio (not all zeros)

**Error Handling:**
```python
# Returns detailed error messages
{
    "error": "Audio too short: 0.50s. Minimum: 1.0s",
    "file_exists": True,
    "format_valid": True,
    "duration_valid": False
}
```

## Deployment

### Local Development

1. **Install dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Run server:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

4. **Test health endpoint:**
```bash
curl http://localhost:8000/
```

**Expected response:**
```json
{
    "status": "running",
    "project": "AcousticSpace",
    "version": "1.0.0",
    "model_loaded": false,
    "device": "none",
    "model": "AST",
    "lazy_loading": true
}
```

### Docker Deployment

1. **Build image:**
```bash
docker-compose build
```

2. **Start services:**
```bash
docker-compose up -d
```

3. **Check logs:**
```bash
docker-compose logs -f backend
```

4. **Test endpoint:**
```bash
curl http://localhost:8000/
```

**Docker Configuration:**

The `docker-compose.yml` should include:
```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./results/ast_final_model:/app/results/ast_final_model
      - ./backend/uploads:/app/uploads
    environment:
      - AST_MODEL_PATH=/app/results/ast_final_model
      - MODEL_DEVICE=cuda  # or cpu for CPU-only
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### Production Deployment

**Recommendations:**

1. **Use Gunicorn with Uvicorn workers:**
```bash
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --keep-alive 5
```

2. **Environment variables:**
```env
DEBUG=False
SECRET_KEY=<strong-secret-key>
CORS_ALLOW_ORIGINS=https://your-frontend-domain.com
```

3. **Reverse proxy (Nginx):**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

4. **Monitoring:**
```bash
# Check health
curl https://api.yourdomain.com/

# Monitor logs
tail -f backend/logs/backend.log
```

## Performance

### Startup Time

- **Target**: < 3 seconds
- **Actual**: ~2.4 seconds (without model loading)
- **Model loading**: Deferred to first request

### Model Loading

- **First prediction**: Includes model loading (~2-5s)
- **Subsequent predictions**: Uses cached model (~0.5-2s)
- **Memory usage**: ~500MB - 1GB (depending on model size)

### Inference Time

| Scenario | Time |
|----------|------|
| First prediction (with model load) | 2-5s |
| Subsequent predictions (cached) | 0.5-2s |
| Mock predictions (no model) | 0.1-0.5s |

## Monitoring

### Health Check Endpoint

**URL:** `GET /`

**Response:**
```json
{
    "status": "running",
    "project": "AcousticSpace",
    "version": "1.0.0",
    "model_loaded": true,
    "device": "cuda",
    "model": "AST",
    "lazy_loading": true,
    "load_time_seconds": 2.45
}
```

### Structured Logs

All operations are logged with timestamps:

```
2025-01-15 10:30:45 | INFO | AcousticSpace | Loading AST model...
2025-01-15 10:30:45 | INFO | AcousticSpace | ✓ CUDA detected: NVIDIA GeForce RTX 3080
2025-01-15 10:30:47 | INFO | AcousticSpace | ✓ Model loaded successfully!
2025-01-15 10:30:47 | INFO | AcousticSpace |   Device: cuda
2025-01-15 10:30:47 | INFO | AcousticSpace |   Load time: 2.45s
2025-01-15 10:30:48 | INFO | AcousticSpace | Prediction request received for: audio.wav
2025-01-15 10:30:48 | INFO | AcousticSpace | Audio validation passed in 0.02s
2025-01-15 10:30:49 | INFO | AcousticSpace | Prediction completed: Fake (confidence=95.5%)
```

### Key Metrics to Monitor

1. **Startup time**: Should be < 3s
2. **Model load time**: Should be < 5s
3. **Prediction time**: Should be < 10s (cached model)
4. **Memory usage**: Should be stable (no leaks)
5. **Error rate**: Should be < 1%
6. **Model status**: `model_loaded` in health check

## Error Handling

### Model Loading Failures

If model loading fails, the system gracefully degrades to mock predictions:

```python
try:
    model_loader = get_model_loader()
    model_loader.load_model()
except ModelLoadError as e:
    log_warning(f"Failed to load model: {e}. Using mock predictions.")
    # Continue with mock predictions
```

**Error scenarios:**
- Missing model files → Mock predictions
- Corrupted model → Mock predictions
- Insufficient memory → Mock predictions
- CUDA out of memory → Falls back to CPU

### Audio Validation Failures

Invalid audio files are rejected with clear error messages:

```json
{
    "detail": "Invalid audio file: Audio too short: 0.50s. Minimum: 1.0s"
}
```

**Common validation errors:**
- File not found
- Unsupported format
- Invalid sample rate
- Too short/long duration
- Empty audio (silence)

## Testing

### Run Benchmark

```bash
cd backend
python benchmark.py --audio-path /path/to/test/audio.wav --iterations 5
```

**Output:**
```
==================================================
🚀 AcousticSpace Backend Benchmark
==================================================

📊 Performance Metrics:
  Startup time:           2.234s
  Model load time:        3.456s
  First prediction:       3.456s (includes model load)
  Second prediction:      1.234s (cached model)
  Average prediction:     1.456s

💾 Memory Usage:
  Memory before:          245.3 MB
  Memory after:           876.5 MB
  Memory increase:        631.2 MB
  Peak memory:            890.1 MB

✅ Success Criteria:
  ✓ Startup < 3.0s: 2.234s
  ✓ Model load < 5.0s: 3.456s
  ✓ First prediction < 30.0s: 3.456s
  ✓ Second prediction < 10.0s: 1.234s
```

### Test Health Endpoint

```bash
# Before model load
curl http://localhost:8000/

# After first prediction
curl http://localhost:8000/
```

### Test Prediction API

```bash
# Upload audio first, then predict
curl -X POST "http://localhost:8000/api/predict" \
  -H "Content-Type: application/json" \
  -d '{"file_path": "/app/uploads/audio.wav"}'
```

## Troubleshooting

### Model Not Loading

**Symptoms:**
- Health check shows `"model_loaded": false`
- Predictions use mock mode

**Solutions:**
1. Check model files exist:
```bash
ls -la results/ast_final_model/
# Should have: config.json, model.safetensors, preprocessor_config.json
```

2. Check logs for errors:
```bash
tail -f backend/logs/backend.log
```

3. Verify model path in `.env`:
```env
AST_MODEL_PATH=/app/results/ast_final_model
```

### Out of Memory

**Symptoms:**
- Model loading fails
- CUDA out of memory errors

**Solutions:**
1. Use CPU instead of GPU:
```env
MODEL_DEVICE=cpu
```

2. Reduce batch size (if applicable)

3. Increase system swap space

### Slow Predictions

**Symptoms:**
- First prediction takes > 10s
- Subsequent predictions also slow

**Solutions:**
1. Check device is set correctly:
```bash
curl http://localhost:8000/ | jq .device
# Should show: cuda, mps, or cpu
```

2. Use GPU if available:
```env
MODEL_DEVICE=cuda
```

3. Check audio file size (large files take longer)

## Production Checklist

- [ ] Model files are present and valid
- [ ] Environment variables are configured
- [ ] Health check returns `"model_loaded": true`
- [ ] Startup time < 3s
- [ ] Model loads on first request
- [ ] Subsequent requests use cached model
- [ ] Logs are being written
- [ ] Error handling works (test with missing model)
- [ ] Audio validation rejects invalid files
- [ ] Docker container starts successfully
- [ ] Reverse proxy configured (if using)
- [ ] Monitoring is set up
- [ ] Backup model files are available

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Hugging Face Transformers](https://huggingface.co/docs/transformers/)
- [PyTorch Documentation](https://pytorch.org/docs/stable/index.html)
- [Audio Spectrogram Transformer](https://huggingface.co/docs/transformers/model_doc/audio-spectrogram-transformer)