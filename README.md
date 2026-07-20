# AcousticSpace — ML Module

Deepfake audio detection via acoustic-spatial mismatch (Room Impulse Response inconsistency), not just vocal artifacts.

## Project Structure
```
acousticspace/
├── scripts/
│   ├── download_data.py       # Downloads/organizes ASVspoof + RIR data
│   ├── augment.py             # Convolves speech with RIRs (matched/mismatched)
│   ├── features.py            # Librosa spectrogram/MFCC extraction
│   ├── dataset.py             # PyTorch Dataset + train/val/test split
│   ├── train_baseline.py      # Trains CNN baseline
│   ├── train_ast.py           # Fine-tunes AST on augmented data
│   ├── breathing_detector.py  # Simple breathing/energy heuristic
│   ├── evaluate.py            # EER, F1, accuracy, confusion matrix
│   └── analyze.py             # Final combined inference function (for backend handoff)
├── models/
│   └── cnn_baseline.py        # CNN architecture
├── results/                   # Saved metrics, comparison tables
├── notebooks/                 # Mid-review / final-review summaries
└── requirements.txt
```

## How to run (in Kaggle Notebook with GPU enabled)

1. Attach ASVspoof dataset in Kaggle (Add Input → search `awsaf49/asvpoof-2019-dataset`)
2. Download RIR data:
   ```bash
   wget https://www.openslr.org/resources/28/rirs_noises.zip
   unzip rirs_noises.zip -d /kaggle/working/rirs_noises
   ```
3. Run scripts in order:
   ```bash
   python scripts/augment.py
   python scripts/features.py
   python scripts/train_baseline.py
   python scripts/train_ast.py
   python scripts/evaluate.py
   ```
4. Test the final function:
   ```bash
   python scripts/analyze.py --audio path/to/test_clip.wav
   ```

## Handoff to backend (FastAPI)
Backend team should import `analyze()` from `scripts/analyze.py` and call it with an uploaded audio file path. It returns:
```json
{
  "confidence_score": 0.87,
  "prediction": "fake",
  "reverb_mismatch_flag": true,
  "breathing_flag": false
}
```

## v2 additions: RT60/DRR/Clarity + real breathing detection

**`scripts/acoustic_features.py`** — blind, single-channel estimation of RT60,
a Direct-to-Reverberant Ratio (DRR) proxy, and a clarity proxy. These are
estimated from naturally-occurring "free decay" regions (the reverberant
tail right after speech cuts off) — not from a true measured impulse
response, which isn't possible from a single reverberant recording alone.

Tested against synthetic dry vs. reverberant clips:
- **RT60**: correctly returns `None` (no measurable decay) for a dry clip
  vs. a finite estimate for a reverberant one — good directional signal,
  but the absolute value is not precisely calibrated (expected for a blind,
  short-window method — treat it as relative/comparative evidence, not an
  exact RT60 measurement).
- **DRR proxy**: correctly moves in the expected direction (higher for the
  dry clip, lower for the reverberant one).
- **Clarity proxy**: works mechanically but the current formulation doesn't
  cleanly correspond to a real C50 clarity index — treat this one as
  experimental/lower-confidence output, and consider it a candidate for
  further refinement rather than a finished feature.

**`scripts/breathing_detector.py` (v2)** — replaces the v1 silence-gap
heuristic with a combined energy + spectral-flatness VAD that distinguishes
speech / breath / silence per frame, then groups breath frames into discrete
events and checks inter-breath interval regularity. Verified against a
synthetic clip with injected breath-noise bursts: correctly detected all 3
injected events within ~10ms of their true timestamps.

Both modules are still heuristics (not trained models) — a genuinely
stronger and more defensible version of what the spec asks for, but not a
literal RIR/RT60 measurement device or a supervised breath classifier. State
this scope explicitly in your report.


- **ASVspoof 2019** (real vs. fake speech): https://www.kaggle.com/datasets/awsaf49/asvpoof-2019-dataset
- **OpenSLR SLR28** (Room Impulse Responses): https://www.openslr.org/28/



# Backend (FastAPI)

The backend of AcousticSpace is built using **FastAPI** and serves as the bridge between the frontend and the machine learning model. It provides REST APIs for audio upload, preprocessing, feature extraction, deepfake prediction, and prediction history while integrating seamlessly with the trained Audio Spectrogram Transformer (AST) model.

---

## Backend Features

- FastAPI REST API
- Audio Upload & Validation
- Feature Extraction Pipeline
- Acoustic Feature Analysis
- Breathing Pattern Analysis
- AST Model Integration
- Deepfake Prediction API
- SQLite Database Support
- Prediction History
- Centralized Logging
- Configuration Management
- Swagger API Documentation

---

## Backend Structure

```text
backend/
│
├── app/
│   ├── api/                 # REST API endpoints
│   ├── core/                # Configuration and logging
│   ├── database/            # Database models and connection
│   ├── services/            # Business logic and ML inference
│   ├── models/              # Response and request schemas
│   ├── utils/               # Helper functions
│   └── main.py              # FastAPI application
│
├── uploads/                 # Uploaded audio files
├── extracted_features/      # Generated audio features
├── saved_models/            # Local model storage
├── logs/                    # Application logs
└── requirements.txt
```

---

# Backend Workflow

```
Frontend
     │
     ▼
Upload Audio
     │
     ▼
FastAPI Backend
     │
     ▼
Audio Validation
     │
     ▼
Feature Extraction
     │
     ▼
Acoustic Feature Analysis
     │
     ▼
Breathing Detection
     │
     ▼
AST Model Inference
     │
     ▼
Prediction Generation
     │
     ▼
JSON Response
```

---

# API Endpoints

## Health Check

```http
GET /
```

Returns the backend status.

---

## Upload Audio

```http
POST /upload
```

Uploads an audio file for analysis.

Supported formats

- WAV
- MP3
- FLAC
- M4A

Example Response

```json
{
    "filename": "sample.wav",
    "status": "uploaded"
}
```

---

## Predict Deepfake

```http
POST /predict
```

Runs the complete inference pipeline and returns the prediction.

Example Response

```json
{
    "prediction": "Fake",
    "confidence": 99.91,
    "rir_score": 0.91,
    "breathing_score": 0.87,
    "processing_time": 2.4
}
```

---

## Prediction History

```http
GET /history
```

Returns previously analyzed audio records.

---

# Running the Backend

## Create Virtual Environment

```bash
python -m venv venv
```

## Activate Environment

### Windows

```bash
venv\Scripts\activate
```

### Linux / macOS

```bash
source venv/bin/activate
```

---

## Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Run Backend

```bash
cd backend
uvicorn app.main:app --reload
```

The backend will start on:

```
http://127.0.0.1:8000
```

Swagger Documentation:

```
http://127.0.0.1:8000/docs
```

ReDoc Documentation:

```
http://127.0.0.1:8000/redoc
```

---

# Backend Technologies

- Python 3.11
- FastAPI
- Uvicorn
- SQLAlchemy
- SQLite
- Pydantic
- Librosa
- NumPy
- PyTorch
- Hugging Face Transformers
- Logging

---

# Backend Responsibilities

The backend is responsible for:

- Accepting audio uploads from the frontend.
- Validating uploaded audio files.
- Performing audio preprocessing.
- Extracting acoustic features.
- Running breathing pattern analysis.
- Loading the trained AST model.
- Performing deepfake prediction.
- Returning prediction results to the frontend.
- Storing prediction history.
- Providing REST APIs for frontend integration.
- Managing logs and application configuration.