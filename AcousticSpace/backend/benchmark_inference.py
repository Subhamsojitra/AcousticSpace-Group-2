"""
Benchmark script to profile inference pipeline performance.

Measures execution time for each stage:
- Audio loading
- Feature extraction
- RIR processing
- Breathing analysis
- Cadence alignment
- Model loading
- AST inference
- Confidence computation
- Response serialization
"""

import time
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.core.logger import log_info
from app.services.audio_loader import load_audio
from app.services.audio_validation import validate_audio_file
from app.services.breathing_analysis import analyze_breathing
from app.services.cadence_alignment import analyze_cadence_alignment
from app.services.feature_extractor import extract_features
from app.services.preprocessing import preprocess_audio
from app.services.rir_extractor import extract_rir_features
from app.ml.model_loader import get_model_loader
from app.services.mock_prediction import predict as mock_predict


def benchmark_prediction(file_path: str, use_real_model: bool = False):
    """
    Benchmark a single prediction request.
    
    Parameters
    ----------
    file_path : str
        Path to audio file
    use_real_model : bool
        If True, use real AST model. If False, use mock prediction.
    """
    log_info("=" * 60)
    log_info("BENCHMARK STARTED")
    log_info("=" * 60)
    
    timings = {}
    
    # Step 0: Validate audio file
    t0 = time.perf_counter()
    is_valid, validation_info = validate_audio_file(file_path)
    timings['validation'] = time.perf_counter() - t0
    
    if not is_valid:
        log_info(f"Audio validation failed: {validation_info.get('error')}")
        return None
    
    log_info(f"✓ Audio validation: {timings['validation']*1000:.2f} ms")
    
    # Step 1: Load audio
    t0 = time.perf_counter()
    audio, sample_rate = load_audio(file_path)
    timings['audio_loading'] = time.perf_counter() - t0
    log_info(f"✓ Audio loading: {timings['audio_loading']*1000:.2f} ms")
    
    # Step 2: Preprocess audio
    t0 = time.perf_counter()
    processed_audio = preprocess_audio(audio, sample_rate)
    timings['preprocessing'] = time.perf_counter() - t0
    log_info(f"✓ Preprocessing: {timings['preprocessing']*1000:.2f} ms")
    
    # Step 3: Extract features
    t0 = time.perf_counter()
    acoustic_features = extract_features(processed_audio, sample_rate)
    timings['feature_extraction'] = time.perf_counter() - t0
    log_info(f"✓ Feature extraction: {timings['feature_extraction']*1000:.2f} ms")
    
    # Step 4: Extract RIR features
    t0 = time.perf_counter()
    rir_features = extract_rir_features(processed_audio, sample_rate)
    timings['rir_analysis'] = time.perf_counter() - t0
    log_info(f"✓ RIR analysis: {timings['rir_analysis']*1000:.2f} ms")
    
    # Step 5: Breathing analysis
    t0 = time.perf_counter()
    breathing_features = analyze_breathing(processed_audio, sample_rate)
    timings['breathing_analysis'] = time.perf_counter() - t0
    log_info(f"✓ Breathing analysis: {timings['breathing_analysis']*1000:.2f} ms")
    
    # Step 6: Cadence alignment
    t0 = time.perf_counter()
    cadence_features = analyze_cadence_alignment(processed_audio, sample_rate)
    timings['cadence_alignment'] = time.perf_counter() - t0
    log_info(f"✓ Cadence alignment: {timings['cadence_alignment']*1000:.2f} ms")
    
    # Step 7: Model loading (if using real model)
    timings['model_loading'] = 0.0
    if use_real_model:
        t0 = time.perf_counter()
        model_loader = get_model_loader()
        if not model_loader.is_loaded():
            success, message = model_loader.load_model()
            if not success:
                log_info(f"Model loading failed: {message}")
                use_real_model = False
        timings['model_loading'] = time.perf_counter() - t0
        log_info(f"✓ Model loading: {timings['model_loading']*1000:.2f} ms")
    
    # Step 8: AST inference
    timings['ast_inference'] = 0.0
    timings['confidence_computation'] = 0.0
    
    if use_real_model:
        import librosa
        import torch
        import numpy as np
        
        t0 = time.perf_counter()
        
        model_loader = get_model_loader()
        ast_model = model_loader.get_model()
        feature_extractor = model_loader.get_feature_extractor()
        device = model_loader.get_device()
        
        # Load audio for AST model
        audio_for_ast, _ = librosa.load(file_path, sr=16000, mono=True)
        
        # Prepare inputs
        inputs = feature_extractor(
            audio_for_ast,
            sampling_rate=16000,
            return_tensors="pt"
        )
        input_values = inputs["input_values"].to(device)
        
        # Run inference
        with torch.no_grad():
            outputs = ast_model(input_values)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=1)[0]
            confidence_score = probs[1].item()
            predicted_class = torch.argmax(probs).item()
        
        timings['ast_inference'] = time.perf_counter() - t0
        log_info(f"✓ AST inference: {timings['ast_inference']*1000:.2f} ms")
        
        t0 = time.perf_counter()
        # Confidence computation (already done above, but measuring separately)
        confidence = round(confidence_score * 100, 2)
        prediction = "Fake" if confidence_score > 0.5 else "Real"
        timings['confidence_computation'] = time.perf_counter() - t0
        log_info(f"✓ Confidence computation: {timings['confidence_computation']*1000:.2f} ms")
    else:
        # Mock prediction
        t0 = time.perf_counter()
        processing_time = sum(timings.values())
        prediction_result = mock_predict(
            acoustic_features=acoustic_features,
            rir_features=rir_features,
            breathing_features=breathing_features,
            cadence_features=cadence_features,
            processing_time=processing_time,
        )
        timings['mock_prediction'] = time.perf_counter() - t0
        log_info(f"✓ Mock prediction: {timings['mock_prediction']*1000:.2f} ms")
    
    # Calculate total
    total_time = sum(timings.values())
    
    # Print summary
    log_info("=" * 60)
    log_info("BENCHMARK RESULTS")
    log_info("=" * 60)
    log_info(f"Audio Loading ........... {timings['audio_loading']*1000:>8.2f} ms")
    log_info(f"Preprocessing ........... {timings['preprocessing']*1000:>8.2f} ms")
    log_info(f"Feature Extraction ...... {timings['feature_extraction']*1000:>8.2f} ms")
    log_info(f"RIR Analysis ............ {timings['rir_analysis']*1000:>8.2f} ms")
    log_info(f"Breathing Analysis ...... {timings['breathing_analysis']*1000:>8.2f} ms")
    log_info(f"Cadence Alignment ....... {timings['cadence_alignment']*1000:>8.2f} ms")
    if use_real_model:
        log_info(f"Model Loading ........... {timings['model_loading']*1000:>8.2f} ms")
        log_info(f"AST Inference ........... {timings['ast_inference']*1000:>8.2f} ms")
        log_info(f"Confidence Computation .. {timings['confidence_computation']*1000:>8.2f} ms")
    else:
        log_info(f"Mock Prediction ......... {timings.get('mock_prediction', 0)*1000:>8.2f} ms")
    log_info(f"Total ................... {total_time*1000:>8.2f} ms ({total_time:.2f}s)")
    log_info("=" * 60)
    
    return timings


if __name__ == "__main__":
    # Test with a sample audio file
    test_file = "dataset/test/ht1_fake_fixed.wav"
    
    # If test file doesn't exist, create a synthetic one
    if not Path(test_file).exists():
        log_info(f"Test file not found: {test_file}")
        log_info("Creating synthetic test audio file...")
        
        # Create synthetic audio for testing
        import numpy as np
        import soundfile as sf
        
        # Generate 5 seconds of synthetic audio
        duration = 5.0
        sample_rate = 16000
        samples = int(duration * sample_rate)
        
        # Create synthetic speech-like signal
        t = np.arange(samples) / sample_rate
        audio = np.sin(2 * np.pi * 150 * t) * 0.5  # 150 Hz fundamental
        audio += np.random.randn(samples) * 0.1  # Add noise
        
        # Normalize
        audio = audio / np.max(np.abs(audio)) * 0.8
        
        # Save to file
        Path("dataset/test").mkdir(parents=True, exist_ok=True)
        sf.write(test_file, audio, sample_rate)
        log_info(f"Created synthetic test file: {test_file}")
    
    log_info(f"Testing with file: {test_file}")
    
    # Benchmark with mock prediction first
    log_info("\n" + "=" * 60)
    log_info("BENCHMARK 1: Mock Prediction (no model loading)")
    log_info("=" * 60)
    benchmark_prediction(test_file, use_real_model=False)
    
    # Benchmark with real model
    log_info("\n" + "=" * 60)
    log_info("BENCHMARK 2: Real AST Model (cold start)")
    log_info("=" * 60)
    benchmark_prediction(test_file, use_real_model=True)
    
    # Second run with real model (warm)
    log_info("\n" + "=" * 60)
    log_info("BENCHMARK 3: Real AST Model (warm - model already loaded)")
    log_info("=" * 60)
    benchmark_prediction(test_file, use_real_model=True)