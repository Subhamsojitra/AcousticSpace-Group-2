"""
Performance Benchmark for AcousticSpace Backend

Measures:
- Startup time
- Model loading time
- First prediction (with model loading)
- Second prediction (model cached)
- Average prediction time
- Memory usage
- Inference time breakdown

Usage:
    python benchmark.py [--audio-path PATH_TO_AUDIO_FILE]
"""

import argparse
import gc
import os
import sys
import time
from pathlib import Path
from typing import Optional

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

import psutil
import torch
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.logger import logger
from app.main import app


class BenchmarkResult:
    """Stores benchmark results."""
    
    def __init__(self):
        self.startup_time = 0.0
        self.model_load_time = 0.0
        self.first_prediction_time = 0.0
        self.second_prediction_time = 0.0
        self.avg_prediction_time = 0.0
        self.memory_before = 0.0
        self.memory_after = 0.0
        self.memory_peak = 0.0
        self.inference_times = []
    
    def print_summary(self):
        """Print benchmark summary."""
        print("\n" + "=" * 70)
        print("BENCHMARK RESULTS")
        print("=" * 70)
        
        print(f"\n📊 Performance Metrics:")
        print(f"  Startup time:           {self.startup_time:.3f}s")
        print(f"  Model load time:        {self.model_load_time:.3f}s")
        print(f"  First prediction:       {self.first_prediction_time:.3f}s (includes model load)")
        print(f"  Second prediction:      {self.second_prediction_time:.3f}s (cached model)")
        
        if self.avg_prediction_time > 0:
            print(f"  Average prediction:     {self.avg_prediction_time:.3f}s")
        
        print(f"\n💾 Memory Usage:")
        print(f"  Memory before:          {self.memory_before:.1f} MB")
        print(f"  Memory after:           {self.memory_after:.1f} MB")
        print(f"  Memory increase:        {self.memory_after - self.memory_before:.1f} MB")
        print(f"  Peak memory:            {self.memory_peak:.1f} MB")
        
        print(f"\n✅ Success Criteria:")
        print(f"  {'✓' if self.startup_time < 3.0 else '✗'} Startup < 3.0s: {self.startup_time:.3f}s")
        print(f"  {'✓' if self.model_load_time < 5.0 else '✗'} Model load < 5.0s: {self.model_load_time:.3f}s")
        print(f"  {'✓' if self.first_prediction_time < 30.0 else '✗'} First prediction < 30.0s: {self.first_prediction_time:.3f}s")
        print(f"  {'✓' if self.second_prediction_time < 10.0 else '✗'} Second prediction < 10.0s: {self.second_prediction_time:.3f}s")
        
        print("\n" + "=" * 70)


def get_memory_usage() -> float:
    """
    Get current memory usage in MB.
    
    Returns
    -------
    float
        Memory usage in MB.
    """
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024


def find_test_audio() -> Optional[str]:
    """
    Find a test audio file in the project.
    
    Returns
    -------
    Optional[str]
        Path to test audio file, or None if not found.
    """
    # Common locations to search
    search_paths = [
        backend_dir / "uploads",
        backend_dir.parent / "uploads",
        Path("/tmp"),
        Path.home() / "Downloads",
    ]
    
    # Common audio extensions
    audio_extensions = ['.wav', '.mp3', '.flac', '.ogg', '.m4a']
    
    for search_path in search_paths:
        if not search_path.exists():
            continue
        
        for ext in audio_extensions:
            files = list(search_path.glob(f"*{ext}"))
            if files:
                return str(files[0])
    
    return None


def run_benchmark(audio_path: Optional[str] = None, num_iterations: int = 3):
    """
    Run performance benchmark.
    
    Parameters
    ----------
    audio_path : Optional[str], optional
        Path to test audio file. If None, will try to find one.
    num_iterations : int, optional
        Number of prediction iterations. Default is 3.
    
    Returns
    -------
    BenchmarkResult
        Benchmark results.
    """
    results = BenchmarkResult()
    
    # Find test audio if not provided
    if not audio_path:
        audio_path = find_test_audio()
        if not audio_path:
            print("❌ Error: No test audio file found.")
            print("   Please provide an audio file with --audio-path")
            return results
    
    if not os.path.exists(audio_path):
        print(f"❌ Error: Audio file not found: {audio_path}")
        return results
    
    print(f"🎵 Test audio: {audio_path}")
    print(f"🔄 Iterations: {num_iterations}")
    print("\n" + "=" * 70)
    
    # Measure startup time
    print("\n1️⃣  Measuring startup time...")
    gc.collect()
    startup_start = time.perf_counter()
    
    # Create test client (this initializes the app)
    client = TestClient(app)
    
    results.startup_time = time.perf_counter() - startup_start
    print(f"   ✓ Startup completed in {results.startup_time:.3f}s")
    
    # Measure memory before model loading
    results.memory_before = get_memory_usage()
    print(f"   💾 Memory before model load: {results.memory_before:.1f} MB")
    
    # Measure model loading time (first prediction)
    print("\n2️⃣  Measuring model loading time (first prediction)...")
    gc.collect()
    model_load_start = time.perf_counter()
    
    # Make first prediction (triggers model loading)
    with open(audio_path, 'rb') as f:
        files = {'file': (os.path.basename(audio_path), f, 'audio/wav')}
        response = client.post("/api/predict", files=files)
    
    results.first_prediction_time = time.perf_counter() - model_load_start
    results.model_load_time = results.first_prediction_time  # First prediction includes model load
    
    if response.status_code == 200:
        print(f"   ✓ First prediction completed in {results.first_prediction_time:.3f}s")
    else:
        print(f"   ⚠️  First prediction returned status {response.status_code}")
        print(f"      Response: {response.text[:200]}")
    
    # Measure memory after model loading
    results.memory_after = get_memory_usage()
    results.memory_peak = max(results.memory_after, results.memory_peak)
    print(f"   💾 Memory after model load: {results.memory_after:.1f} MB")
    
    # Measure subsequent predictions (model cached)
    print(f"\n3️⃣  Measuring subsequent predictions ({num_iterations - 1} iterations)...")
    
    for i in range(num_iterations - 1):
        gc.collect()
        pred_start = time.perf_counter()
        
        with open(audio_path, 'rb') as f:
            files = {'file': (os.path.basename(audio_path), f, 'audio/wav')}
            response = client.post("/api/predict", files=files)
        
        pred_time = time.perf_counter() - pred_start
        results.inference_times.append(pred_time)
        results.memory_peak = max(get_memory_usage(), results.memory_peak)
        
        if response.status_code == 200:
            print(f"   ✓ Prediction {i+2}: {pred_time:.3f}s")
        else:
            print(f"   ⚠️  Prediction {i+2} returned status {response.status_code}")
    
    # Calculate average prediction time (excluding first)
    if results.inference_times:
        results.avg_prediction_time = sum(results.inference_times) / len(results.inference_times)
        results.second_prediction_time = results.inference_times[0] if results.inference_times else 0
    
    # Final memory measurement
    results.memory_peak = max(get_memory_usage(), results.memory_peak)
    
    return results


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="AcousticSpace Performance Benchmark")
    parser.add_argument(
        "--audio-path",
        type=str,
        help="Path to test audio file (WAV, MP3, FLAC, OGG, M4A)"
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=3,
        help="Number of prediction iterations (default: 3)"
    )
    
    args = parser.parse_args()
    
    print("\n" + "=" * 70)
    print("🚀 AcousticSpace Backend Benchmark")
    print("=" * 70)
    
    # Check if CUDA is available
    if torch.cuda.is_available():
        print(f"🎮 CUDA available: {torch.cuda.get_device_name(0)}")
    else:
        print("🖥️  Using CPU (CUDA not available)")
    
    # Run benchmark
    results = run_benchmark(
        audio_path=args.audio_path,
        num_iterations=args.iterations
    )
    
    # Print summary
    results.print_summary()
    
    # Save results to file
    benchmark_file = backend_dir / "BENCHMARK_RESULTS.txt"
    with open(benchmark_file, 'w') as f:
        f.write("BENCHMARK RESULTS\n")
        f.write("=" * 70 + "\n")
        f.write(f"Startup time:           {results.startup_time:.3f}s\n")
        f.write(f"Model load time:        {results.model_load_time:.3f}s\n")
        f.write(f"First prediction:       {results.first_prediction_time:.3f}s\n")
        f.write(f"Second prediction:      {results.second_prediction_time:.3f}s\n")
        f.write(f"Average prediction:     {results.avg_prediction_time:.3f}s\n")
        f.write(f"Memory before:          {results.memory_before:.1f} MB\n")
        f.write(f"Memory after:           {results.memory_after:.1f} MB\n")
        f.write(f"Memory increase:        {results.memory_after - results.memory_before:.1f} MB\n")
        f.write(f"Peak memory:            {results.memory_peak:.1f} MB\n")
    
    print(f"\n📄 Results saved to: {benchmark_file}")


if __name__ == "__main__":
    main()