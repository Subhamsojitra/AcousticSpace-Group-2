import json
import sys

manifest_path = sys.argv[1] if len(sys.argv) > 1 else "data/augmented/manifest.json"

with open(manifest_path, "r") as f:
    manifest = json.load(f)

bonafide = sum(1 for e in manifest if e["mismatch_label"] == 0)
spoof = sum(1 for e in manifest if e["mismatch_label"] == 1)

print(f"Total entries: {len(manifest)}")
print(f"Bonafide (label=0): {bonafide}")
print(f"Spoof (label=1): {spoof}")
print(f"\nSample entry:")
print(json.dumps(manifest[0], indent=2))