from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.audio_loader import load_audio
from app.services.preprocessing import preprocess_audio
from app.services.feature_extractor import extract_features
from app.services.rir_extractor import extract_rir_features
from app.services.breathing_analysis import analyze_breathing
from app.services.inference import predict_audio

router = APIRouter()


class PredictionRequest(BaseModel):
    file_path: str


@router.post("/")
async def predict(request: PredictionRequest):
    """
    Predict whether an audio file is Real or Fake.

    Current Version:
    - Loads audio
    - Preprocesses audio
    - Extracts acoustic features
    - Performs approximate RIR extraction
    - Performs breathing analysis
    - Returns a dummy prediction

    Future Version:
    Replace dummy inference with CNN/AST model.
    """

    try:
        # Load audio
        audio, sample_rate = load_audio(request.file_path)

        # Preprocess audio
        processed_audio = preprocess_audio(audio, sample_rate)

        # Feature Extraction
        acoustic_features = extract_features(
            processed_audio,
            sample_rate
        )

        # RIR Features
        rir_features = extract_rir_features(
            processed_audio,
            sample_rate
        )

        # Breathing Analysis
        breathing_features = analyze_breathing(
            processed_audio,
            sample_rate
        )

        # ML Prediction (Dummy for now)
        prediction = predict_audio(
            acoustic_features,
            rir_features,
            breathing_features
        )

        return {
            "success": True,
            "prediction": prediction["prediction"],
            "confidence": prediction["confidence"],

            "analysis": {
                "sample_rate": sample_rate,
                "duration": round(
                    len(processed_audio) / sample_rate,
                    2
                )
            },

            "message": "Prediction completed successfully."
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )