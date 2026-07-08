"""
Inference Service

Responsible for:
- Validating extracted features
- Loading ML models (future)
- Performing prediction
- Returning prediction results

Current Version:
- Returns a dummy prediction

Future Version:
- Load CNN model
- Load AST model
- Perform real inference
"""

import random
from typing import Dict

from app.core.logger import log_error, log_info


def validate_features(
    acoustic_features: Dict,
    rir_features: Dict,
    breathing_features: Dict
) -> bool:
    """
    Validate extracted features before inference.
    """

    if not acoustic_features:
        return False

    if not rir_features:
        return False

    if not breathing_features:
        return False

    return True


def predict_audio(
    acoustic_features: Dict,
    rir_features: Dict,
    breathing_features: Dict
):
    """
    Perform inference.

    Parameters
    ----------
    acoustic_features : dict
    rir_features : dict
    breathing_features : dict

    Returns
    -------
    dict
    """

    try:

        valid = validate_features(
            acoustic_features,
            rir_features,
            breathing_features
        )

        if not valid:
            raise ValueError(
                "Invalid feature set."
            )

        # ----------------------------------
        # Temporary Dummy Prediction
        # ----------------------------------

        prediction = random.choice(
            [
                "Real",
                "Fake"
            ]
        )

        confidence = round(
            random.uniform(85, 99),
            2
        )

        result = {

            "prediction": prediction,

            "confidence": confidence
        }

        log_info(
            f"Inference completed. Prediction={prediction}"
        )

        return result

    except Exception as e:

        log_error(
            f"Inference failed: {str(e)}"
        )

        raise RuntimeError(
            f"Inference failed: {str(e)}"
        )


# ----------------------------------------------------
# Future Model Loading
# ----------------------------------------------------

def load_cnn_model():
    """
    Placeholder.

    Future:
        Load trained CNN model.
    """
    return None


def load_ast_model():
    """
    Placeholder.

    Future:
        Load trained AST model.
    """
    return None