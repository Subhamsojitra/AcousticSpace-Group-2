# AcousticSpace: Deepfake Detection via Room Impulse Response (RIR)

> A physics-informed deepfake audio detector that catches synthetic voices by analyzing room acoustics — not just standard biometrics.

[![Status](https://img.shields.io/badge/status-in%20development-yellow)]()
[![Python](https://img.shields.io/badge/python-3.10%2B-blue)]()
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-61DAFB)]()
[![Backend](https://img.shields.io/badge/backend-FastAPI-009688)]()

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Use Case](#use-case)
- [Key Modules](#key-modules)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Week-wise Development Plan](#week-wise-development-plan)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Team](#team)

---

## Problem Statement

Current deepfake audio detectors focus primarily on vocal artifacts — robotic tones or unusual inflections. Modern generative AI easily bypasses these biometric checks, making standard audio fraud detection obsolete.

**AcousticSpace** addresses this gap by verifying audio at the physics level rather than the voice level.

## Use Case

A security analyst at **Infocact** uploads a suspected deepfake audio clip. AcousticSpace mathematically isolates the background **Room Impulse Response (RIR)** from voice signal. If the acoustic reflection of the generated voice does not match the surrounding background environment, the clip is flagged as artificially generated — regardless of how convincing the voice itself sounds.

## Key Modules

| Module | Description |
|---|---|
| **Audio Processing Pipeline** (Python & Librosa) | Extracts low-level acoustic features, isolating RIR and environmental reverb |
| **Transformer Classifier** (PyTorch & HuggingFace) | A fine-tuned Audio Spectrogram Transformer (AST) trained to detect mismatches between vocal cadence and spatial acoustics |
| **API Gateway** (FastAPI) | Serves the ML model for low-latency, real-time inference |
| **Analyst Dashboard** (React) | A frontend UI for uploading audio and visualizing waveform anomalies and confidence scores |

## Architecture

```
                ┌───────────────────┐
   Audio File   │   React Frontend   │
  ─────────────▶│  (Upload + Dash)   │
                └─────────┬──────────┘
                          │ REST API
                          ▼
                ┌───────────────────┐
                │   FastAPI Gateway  │
                └─────────┬──────────┘
                          ▼
                ┌───────────────────┐
                │  Librosa Pipeline  │
                │ (Feature/RIR       │
                │  Extraction)       │
                └─────────┬──────────┘
                          ▼
                ┌───────────────────┐
                │  AST Transformer   │
                │  Classifier        │
                │  (PyTorch/HF)      │
                └─────────┬──────────┘
                          ▼
                Confidence Score + Flag
```

## Tech Stack

**Backend & Machine Learning**
- Python
- PyTorch
- HuggingFace Transformers (Audio Spectrogram Transformer)
- Librosa (audio/spectral feature extraction)
- FastAPI

**Frontend**
- React
- TypeScript
- Wavesurfer.js (waveform visualization)

**Deployment**
- Docker
- CI/CD Pipeline

## Week-wise Development Plan

| Week | Backend & ML | Frontend |
|---|---|---|
| **Week 1** | Build FastAPI server core setup. Curate dataset (e.g., ASVspoof). Develop Librosa pipeline to extract spectrograms and RIR features. | Build React app, audio upload component, and static dashboard layout. |
| **Week 2** | Build baseline CNN/Transformer model to classify audio files based on extracted acoustic features. | Integrate audio waveform visualizers (e.g., Wavesurfer.js) to display uploaded clips. |
| **Mid-Project Review** | Prove Librosa pipeline successfully isolates environmental noise from vocals. Baseline model accuracy check. | Frontend handles large audio file uploads and renders basic waveform graphs. |
| **Week 3** | Fine-tune the Audio Spectrogram Transformer. Implement logic to check breathing/cadence alignment with speaker syllables. | Build the results panel, displaying model confidence scores and highlighting suspicious audio segments. |
| **Week 4** | Deploy model via Docker. Optimize API inference latency. Construct CI/CD pipelines. | Refine and polish UI/UX. Add state management for tracking analysis history. |
| **Final Project Review** | A robust deepfake detector that catches synthetic audio by analyzing physics rather than standard biometrics. | A complete, responsive analyst dashboard for interactive audio forensics. |

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- (Optional) Docker & Docker Compose

### Backend Setup

```bash
# clone the repo
git clone https://github.com/Subhamsojitra/AcousticSpace-Group-2.git
cd AcousticSpace-Group-2

# create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# install dependencies
pip install -r requirements.txt

# run the FastAPI server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The API will be available at `http://localhost:8000` and the dashboard at `http://localhost:5173` (adjust ports as configured in your project).

## Project Structure

```
AcousticSpace-Group-2/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entrypoint
│   │   ├── models/            # AST classifier & inference logic
│   │   ├── pipeline/          # Librosa feature/RIR extraction
│   │   └── api/                # API routes
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/        # Upload, waveform, results panel
│   │   └── pages/              # Dashboard views
│   └── package.json
├── data/                       # Dataset (e.g., ASVspoof) samples/scripts
├── docs/                       # Diagrams, reports, review docs
└── README.md
```

> Note: adjust this tree to match your actual repo layout if it differs.

## Team

Built by **Group 2** as part of Project 1, under **Infocact Solutions**.

## License

Specify your project's license here (e.g., MIT).