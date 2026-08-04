"""Benchmark backend startup time."""
import time
import asyncio
from app.main import lifespan

async def benchmark():
    class MockApp:
        state = type('obj', (object,), {})()
    
    app = MockApp()
    
    # Run multiple times for average
    times = []
    for i in range(5):
        start = time.perf_counter()
        async with lifespan(app):
            pass
        elapsed = (time.perf_counter() - start) * 1000
        times.append(elapsed)
        print(f"Run {i+1}: {elapsed:.2f}ms")
    
    avg = sum(times) / len(times)
    print(f"\nAverage startup time: {avg:.2f}ms")
    print(f"Min: {min(times):.2f}ms")
    print(f"Max: {max(times):.2f}ms")

if __name__ == "__main__":
    asyncio.run(benchmark())