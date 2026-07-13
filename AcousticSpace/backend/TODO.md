# AcousticSpace Backend TODO

## Step 0 — Plan confirmation
- [x] Confirmed execution order for lifecycle/middleware, upload hardening, and completion of preprocessing/feature/rir services.

## Step 1 — App lifecycle + middleware + config usage
- [x] Replace `print()` with structured logger in `app/main.py`.
- [x] Update lifespan to create folders and DB tables on startup.
- [x] Add request logging + exception handling middleware.
- [x] Wire CORS origins via env/config.


## Step 2 — Upload API hardening
- [x] Refactor `app/api/upload.py` to use `app.core.config.settings`.
- [x] Add proper Pydantic request/response models.
- [ ] Enforce file validation consistently.
- [ ] Ensure saved paths and returned metadata are consistent.


## Step 3 — Complete Librosa pipeline services
- [x] Implement `app/services/preprocessing.py` (mono, resample, normalize, trim silence).
- [x] Implement `app/services/feature_extractor.py` (mel/mfcc/chroma/spectral + stats incl. ZCR/RMS).
- [x] Implement `app/services/rir_extractor.py` (heuristic acoustic/RIR descriptors including RT60 approximation).
- [x] Ensure services return JSON-serializable dicts with stable keys.


## Step 4 — API schema + history persistence (follow-on)
- [ ] Add response models for analysis/predict/history endpoints.
- [ ] Persist history records for analysis/predict.

## Step 5 — Testing
- [ ] Run backend tests (`pytest`).
- [ ] Add/adjust tests for upload + analysis schema.

