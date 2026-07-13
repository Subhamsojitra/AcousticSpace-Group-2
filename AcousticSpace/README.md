# AcousticSpace Backend

Backend implementation for the **AcousticSpace-Group-2** project.

Backend implementation for **AcousticSpace**, an AI-powered Deepfake Audio Detection platform that analyzes uploaded audio using acoustic features extracted with Librosa and serves results through a FastAPI REST API.

---

## Project Overview

The backend is responsible for:

- FastAPI REST API
- Audio upload handling
- Audio preprocessing
- Feature extraction using Librosa
- Room Impulse Response (RIR) feature extraction
- Breathing pattern analysis
- Database management
- Logging
- Configuration management
- Preparing data for future CNN/AST model inference

> **Note:** Model training (CNN/AST) is not part of this backend implementation and will be integrated in future development phases.

---

# Backend Architecture

```
backend
│
├── app
│   ├── api
│   ├── core
│   ├── database
│   ├── ml
│   ├── services
│   ├── utils
│   └── main.py
│
├── uploads
├── extracted_features
├── dataset
├── logs
├── saved_models
├── tests
│
├── requirements.txt
└── Dockerfile
```

---

# Technology Stack

| Category | Technology |
|----------|------------|
| Backend Framework | FastAPI |
| Language | Python 3 |
| Database | SQLite + SQLAlchemy |
| Audio Processing | Librosa |
| Data Processing | NumPy, SciPy |
| Configuration | Pydantic Settings |
| Logging | Python Logging |
| API Documentation | Swagger UI |
| Future ML | PyTorch, Hugging Face AST |

---

# Features

## FastAPI Backend

- REST API
- Modular architecture
- Dependency injection
- Exception handling
- Request validation
- Swagger documentation

---

## Audio Upload

- WAV audio upload
- File validation
- Secure file storage
- Unique filenames

---

## Audio Processing Pipeline

The backend processes audio through the following pipeline:

```
Upload Audio
      │
      ▼
Load Audio
      │
      ▼
Preprocessing
      │
      ▼
Feature Extraction
      │
      ▼
RIR Analysis
      │
      ▼
Breathing Analysis
      │
      ▼
Inference Service
```

---

## Audio Features

Current backend extracts:

- Mel Spectrogram
- MFCC
- Chroma Features
- Spectral Contrast
- Spectral Centroid
- Spectral Bandwidth
- Spectral Roll-off
- Zero Crossing Rate
- RMS Energy

---

## Acoustic Features

The backend prepares:

- Room Impulse Response descriptors
- Reverberation estimation
- Background noise estimation
- Breathing statistics
- Pause analysis

---

# API Endpoints

## Upload

```
POST /upload
```

Upload an audio file.

---

## Analysis

```
POST /analysis
```

Extract acoustic features.

---

## Prediction

```
POST /predict
```

Runs inference.

(Currently prepared for future ML model integration.)

---

## History

```
GET /history
```

Returns analysis history.

---

# Configuration

Environment variables are stored in:

```
.env
```

Example:

```env
APP_NAME=AcousticSpace
APP_VERSION=1.0.0
DEBUG=True

DATABASE_URL=sqlite:///./acousticspace.db

UPLOAD_DIR=uploads
LOG_LEVEL=INFO
```

---

# Installation

Clone repository

```bash
git clone <repository-url>
```

Move into backend

```bash
cd backend
```

Install dependencies

```bash
pip install -r requirements.txt
```

Run server

```bash
uvicorn app.main:app --reload
```

Open Swagger

```
http://127.0.0.1:8000/docs
```

---

# Project Status

Completed

- Backend Architecture
- FastAPI Setup
- API Routing
- Configuration
- Database Layer
- Logging
- Audio Upload
- Audio Processing Pipeline
- Feature Extraction
- Utility Modules

In Progress

- Integration with CNN Model
- Integration with Audio Spectrogram Transformer (AST)
- Production Deployment

---

# Future Improvements

- CNN integration
- HuggingFace AST integration
- Docker deployment
- CI/CD pipeline
- Model optimization
- Real-time inference
- PostgreSQL support

---

# Author

**Backend Developer**

**Srikrishna Samanta**

AcousticSpace Project

Infotact Solutions Internship

2026