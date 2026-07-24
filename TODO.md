# Cadence Alignment Implementation TODO

## Phase 1: Refactor scripts/cadence_alignment.py
- [x] Add overload to `analyze_breathing_alignment` accepting `(audio: np.ndarray, sr: int)` directly
- [x] Update internal functions to share code path

## Phase 2: Refactor backend/app/services/cadence_alignment.py
- [x] Remove deprecated `librosa.output.write_wav` usage
- [x] Call cadence functions directly with numpy array via `analyze_breathing_alignment_from_array`
- [x] Add proper logging for cadence metrics (score, breaths, syllables)

## Phase 3: Update backend/app/api/analysis.py
- [x] Import and call `analyze_cadence_alignment`
- [x] Include `breathing_alignment` in response
- [x] Add timing and logging for cadence analysis

## Phase 4: Update backend/app/api/predict.py
- [x] Add cadence-specific metric logging (alignment_score, cadence label)
- [x] Ensure proper error handling for cadence data in logging

## Phase 5: Verify integration
- [x] Check all imports are consistent
- [x] Verify no deprecated functions are used
- [x] Ensure PEP-8 compliance

