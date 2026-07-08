from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.audio_loader import load_audio
from app.services.preprocessing import preprocess_audio
from app.services.feature_extractor import extract_features
from app.services.rir_extractor import extract_rir_features
from app.services.breathing_analysis import analyze_breathing

router = APIRouter()


class AnalysisRequest(BaseModel):
    file_path: str


@router.post("/")
async def analyze_audio(request: AnalysisRequest):
    """
    Analyze an uploaded audio file.

    Workflow:
    1. Load audio
    2. Preprocess audio
    3. Extract acoustic features
    4. Extract approximate RIR features
    5. Analyze breathing patterns
    """

    try:
        # Load audio
        audio, sample_rate = load_audio(request.file_path)

        # Preprocess
        processed_audio = preprocess_audio(audio, sample_rate)

        # Acoustic Features
        features = extract_features(processed_audio, sample_rate)

        # RIR Features
        rir_features = extract_rir_features(processed_audio, sample_rate)

        # Breathing Analysis
        breathing_features = analyze_breathing(
            processed_audio,
            sample_rate
        )

        return {
            "success": True,
            "message": "Audio analysis completed successfully.",

            "audio": {
                "sample_rate": sample_rate,
                "duration": len(processed_audio) / sample_rate
            },

            "features": features,

            "rir_features": rir_features,

            "breathing_analysis": breathing_features
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )