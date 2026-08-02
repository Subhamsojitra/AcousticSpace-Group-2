# ==========================================
# AcousticSpace - Docker Deployment Guide
# ==========================================

## Overview

This guide provides complete instructions for deploying the AcousticSpace backend using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB of available RAM
- At least 2GB of available disk space

## Project Structure

```
AcousticSpace/
├── backend/
│   ├── Dockerfile              # Multi-stage production Dockerfile
│   ├── .dockerignore           # Files to exclude from Docker build
│   ├── .env.example            # Environment variables template
│   ├── requirements.txt        # Python dependencies
│   ├── app/                    # FastAPI application code
│   ├── uploads/                # Uploaded audio files (volume)
│   ├── extracted_features/     # Extracted features (volume)
│   ├── saved_models/           # Saved models (volume)
│   ├── logs/                   # Application logs (volume)
│   └── acousticspace.db        # SQLite database (volume)
├── results/
│   └── ast_final_model/        # AST model files (volume)
│       ├── config.json
│       ├── model.safetensors
│       └── preprocessor_config.json
├── docker-compose.yml          # Docker Compose configuration
└── DOCKER.md                   # This file
```

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd AcousticSpace
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp backend/.env.example backend/.env

# Edit the .env file with your settings
# IMPORTANT: Change SECRET_KEY in production!
```

### 3. Ensure Model Files Exist

The AST model should be located at `results/ast_final_model/`. If you have the model files:

```bash
# The model directory should contain:
# - config.json
# - model.safetensors
# - preprocessor_config.json
```

If the model is not present, the system will use mock predictions.

### 4. Build and Start the Container

```bash
# Build and start all services
docker compose up --build

# Or run in detached mode (background)
docker compose up --build -d
```

### 5. Verify the Deployment

```bash
# Check container status
docker compose ps

# View logs
docker compose logs -f backend

# Test the health endpoint
curl http://localhost:8000/

# Access Swagger UI
# Open browser: http://localhost:8000/docs
```

## Docker Compose Commands

### Start Services

```bash
# Start in foreground
docker compose up

# Start in background
docker compose up -d

# Rebuild and start
docker compose up --build

# Rebuild without cache
docker compose build --no-cache
```

### Stop Services

```bash
# Stop services
docker compose stop

# Stop and remove containers
docker compose down

# Stop, remove containers and volumes (WARNING: deletes data!)
docker compose down -v
```

### View Logs

```bash
# View all logs
docker compose logs

# Follow logs in real-time
docker compose logs -f

# View logs for specific service
docker compose logs backend
```

### Execute Commands in Container

```bash
# Open bash shell in container
docker compose exec backend bash

# Run Python commands
docker compose exec backend python -c "import sys; print(sys.version)"

# Check container health
docker compose exec backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/')"
```

## Environment Variables

All configuration is done through environment variables. See `backend/.env.example` for all available options.

### Key Variables

| Variable | Description | Default | Docker Value |
|----------|-------------|---------|--------------|
| `HOST` | Server host | `0.0.0.0` | `0.0.0.0` |
| `PORT` | Server port | `8000` | `8000` |
| `DEBUG` | Debug mode | `True` | `False` |
| `DATABASE_URL` | Database URL | `sqlite:///backend/acousticspace.db` | `sqlite:///app/data/acousticspace.db` |
| `AST_MODEL_PATH` | AST model path | Auto-detected | `/app/results/ast_final_model` |
| `UPLOAD_DIR` | Upload directory | `backend/uploads` | `/app/uploads` |
| `SECRET_KEY` | Secret key | `change-this-secret-key` | **CHANGE IN PRODUCTION!** |
| `CORS_ALLOW_ORIGINS` | CORS origins | `http://localhost:5173` | Set to your frontend URL |

## Volumes

The following Docker volumes are used for data persistence:

| Volume | Container Path | Purpose |
|--------|---------------|---------|
| `uploads` | `/app/uploads` | Uploaded audio files |
| `extracted_features` | `/app/extracted_features` | Extracted audio features |
| `saved_models` | `/app/saved_models` | Saved ML models |
| `logs` | `/app/logs` | Application logs |
| `database` | `/app/data` | SQLite database |
| `results` | `/app/results` | AST model files |

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect a volume
docker volume inspect acousticspace-uploads

# Remove a volume (WARNING: deletes data!)
docker volume rm acousticspace-uploads
```

## Health Check

The container includes a health check that verifies the service is running:

```bash
# Check container health status
docker compose ps

# Health check runs every 30 seconds
# - Interval: 30s
# - Timeout: 10s
# - Start period: 5s
# - Retries: 3
```

## Performance

### Startup Time

- **Target**: < 3 seconds
- **Current**: ~2.4 seconds
- **Model Loading**: Lazy (on first prediction request)

### Resource Limits

The docker-compose.yml includes resource limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
    reservations:
      cpus: '0.5'
      memory: 1G
```

## API Endpoints

Once the container is running, the following endpoints are available:

### Health Check
- `GET /` - Health check endpoint

### API Documentation
- `GET /docs` - Swagger UI
- `GET /redoc` - ReDoc documentation

### Core Endpoints
- `POST /api/upload` - Upload audio files
- `POST /api/predict` - Run prediction
- `POST /api/analysis` - Analyze audio
- `GET /api/history` - Get prediction history

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs backend

# Common issues:
# 1. Port 8000 already in use
#    - Change port mapping in docker-compose.yml
#    - Or stop the service using port 8000

# 2. Model files not found
#    - Ensure results/ast_final_model/ exists
#    - Check AST_MODEL_PATH environment variable

# 3. Permission issues
#    - Check volume permissions
#    - Ensure directories exist
```

### Model Loading Issues

```bash
# Verify model files exist
docker compose exec backend ls -la /app/results/ast_final_model/

# Check model path in logs
docker compose logs backend | grep "AST model"

# Test model loading
docker compose exec backend python -c "
from transformers import ASTForAudioClassification
model = ASTForAudioClassification.from_pretrained('/app/results/ast_final_model')
print('Model loaded successfully')
"
```

### Database Issues

```bash
# Check database file
docker compose exec backend ls -la /app/data/

# Verify database URL
docker compose exec backend env | grep DATABASE_URL

# Reset database (WARNING: deletes data!)
docker compose down -v
docker compose up -d
```

### Performance Issues

```bash
# Check container resource usage
docker stats

# View container logs for slow operations
docker compose logs backend | grep "Timing breakdown"

# Increase resource limits in docker-compose.yml if needed
```

## Production Deployment

### Security Checklist

- [ ] Change `SECRET_KEY` to a strong random value
- [ ] Set `DEBUG=False`
- [ ] Configure `CORS_ALLOW_ORIGINS` with actual frontend URLs
- [ ] Use environment variables instead of .env file
- [ ] Enable HTTPS with reverse proxy (nginx, traefik, etc.)
- [ ] Restrict container resources
- [ ] Use secrets management (Docker secrets, vault, etc.)

### Production docker-compose.yml

For production, consider:

1. **Use Docker secrets** for sensitive values:
```yaml
secrets:
  secret_key:
    file: ./secrets/secret_key.txt
```

2. **Add reverse proxy** (nginx/traefik) for HTTPS

3. **Use external volumes** for better backup strategies

4. **Enable monitoring** (Prometheus, Grafana)

### Backup Strategy

```bash
# Backup database
docker compose exec backend cp /app/data/acousticspace.db ./backup/

# Backup volumes
docker run --rm -v acousticspace-database:/data -v $(pwd):/backup alpine tar cvf /backup/database.tar /data

# Restore volumes
docker run --rm -v acousticspace-database:/data -v $(pwd):/backup alpine tar xvf /backup/database.tar -C /
```

## Development vs Production

### Development

```bash
# Use local .env file
docker compose up --build

# Access at http://localhost:8000
# Swagger UI at http://localhost:8000/docs
```

### Production

```bash
# Use environment variables
export SECRET_KEY="your-secure-secret-key"
export CORS_ALLOW_ORIGINS="https://yourdomain.com"
export DEBUG=False

docker compose up -d

# Use reverse proxy for HTTPS
# Monitor with docker logs and docker stats
```

## Additional Notes

### Model Loading

The AST model is loaded lazily on the first prediction request. This means:

1. Container starts quickly (~2.4s)
2. First prediction takes longer (model loading time)
3. Subsequent predictions are fast (model cached in memory)

### File Uploads

Uploaded files are stored in the `uploads` volume and persist across container restarts.

### Database

The SQLite database is stored in the `database` volume and persists across container restarts.

### Logs

Application logs are stored in the `logs` volume and can be accessed via:

```bash
docker compose logs backend
# or
docker compose exec backend tail -f /app/logs/*.log
```

## Support

For issues or questions:
1. Check the logs: `docker compose logs backend`
2. Verify health: `curl http://localhost:8000/`
3. Check container status: `docker compose ps`
4. Review this guide and the main README.md