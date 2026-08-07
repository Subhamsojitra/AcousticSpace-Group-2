FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Install runtime system dependencies: ffmpeg for audio format decoding, libsndfile1 for Librosa
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install CPU PyTorch first to avoid installing heavy CUDA drivers
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Copy requirements file first for layer caching
COPY requirements.txt /app/backend/requirements.txt

# Install remaining dependencies from requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

# Copy the rest of the backend files
COPY . /app/backend

# Create runtime directories so they exist in the image and inherit correct ownership on volume mount
RUN mkdir -p /app/backend/logs \
             /app/backend/uploads \
             /app/backend/database \
             /app/backend/extracted_features \
             /app/backend/saved_models \
             /app/backend/results

# Create a non-root user and set permissions for directories
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -m -s /bin/bash appuser && \
    chown -R appuser:appuser /app

# Copy entrypoint script and make it executable
RUN cp /app/backend/entrypoint.sh /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Change working directory to backend folder so config.py's parents[3] resolves correctly to /app
WORKDIR /app/backend

# Expose API port
EXPOSE 8000

# Set entrypoint to fix permissions at runtime
ENTRYPOINT ["/entrypoint.sh"]

# Run the FastAPI app using Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
