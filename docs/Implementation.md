# Implementation Plan for Curve Extraction Parity and Optimization

## Feature Analysis
### Identified Features:
- Legacy-parity extraction: HSV masking → perspective warp → component filtering → bin→MAD filter→Savitzky–Golay smoothing → scaled coordinates
- Enhanced extraction: perspective rectification, plotting-area detection, annotation masking, edge-guided denoising, adaptive binning, auto-color clustering fallback, preview plot
- Color detection API: HSV band presence by color with optional tolerance
- Scaling support: linear/log axes with output scaling factors
- API responses: structured curves with points, colors, preview image

### Feature Categorization:
- **Must-Have Features:** Legacy-equivalent extraction, identical defaults, deterministic outputs, consistent color mapping, correct log-scale mapping, stable API
- **Should-Have Features:** Robust plotting-area detection and annotation masking (toggleable), edge-guided denoise (toggleable), adaptive binning (toggleable)
- **Nice-to-Have Features:** Auto-color clustering fallback, parameter auto-tuning, curve simplification (RDP) toggle, benchmark suite

## Recommended Tech Stack
### Frontend:
- **Framework:** N/A (API-only in this scope)
- **Documentation:** N/A

### Backend:
- **Framework:** FastAPI - lightweight, async-ready REST API
- **Documentation:** https://fastapi.tiangolo.com/

### Database:
- **N/A:** This scope focuses on stateless extraction endpoints
- **Documentation:** N/A

### Additional Tools:
- **OpenCV:** Image I/O, HSV masking, morphology, perspective transform
- **Documentation:** https://docs.opencv.org/
- **NumPy:** Vectorized computation, FFT for grid estimation
- **Documentation:** https://numpy.org/doc/
- **SciPy:** Savitzky–Golay smoothing
- **Documentation:** https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.savgol_filter.html
- **Matplotlib:** preview plots and log scales
- **Documentation:** https://matplotlib.org/stable/

## Implementation Stages

### Stage 1: Foundation & Setup
**Duration:** 0.5–1 day
**Dependencies:** None

#### Sub-steps:
- [ ] Establish strict legacy pipeline parity as default mode in API
- [ ] Align default parameters with legacy (e.g., min_size=1000, fixed BIN_SIZE)
- [ ] Normalize base-color mapping (merge `red2`→`red`) across all pathways
- [ ] Ensure log-scale mapping matches legacy behavior (guards without shifting valid ranges)
- [ ] Add unit tests on sample images to confirm parity

### Stage 2: Core Features
**Duration:** 1–2 days
**Dependencies:** Stage 1 completion

#### Sub-steps:
- [ ] Make plotting-area detection and annotation masking optional (feature flags)
- [ ] Make edge-guided denoising optional (feature flag)
- [ ] Make adaptive binning optional; default to fixed legacy binning
- [ ] Apply `selected_colors` consistently in all modes (after base-color normalization)
- [ ] Harmonize smoothing windows per color (red/blue/others) with legacy

### Stage 3: Advanced Features
**Duration:** 1–2 days
**Dependencies:** Stage 2 completion

#### Sub-steps:
- [ ] Auto-color clustering fallback behind explicit toggle; include caps on clusters and samples
- [ ] Optional curve simplification (Ramer–Douglas–Peucker) post-smoothing
- [ ] Heuristics to auto-tune `min_size` using resolution and stroke thickness
- [ ] Configurable annotation mask thresholds; avoid over-masking curves near axes/legend

### Stage 4: Polish & Optimization
**Duration:** 1 day
**Dependencies:** Stage 3 completion

#### Sub-steps:
- [ ] Add benchmark suite (accuracy/point-count/processing time) vs. legacy GUI
- [ ] Performance profiling; vectorize hot loops; tune morphology kernels
- [ ] Improve error messages and API schema docs; examples for log/linear cases
- [ ] Finalize tests and CI checks

## Detailed Modification Plan
- **Defaults**
  - Set `min_size` default to 1000 to match legacy GUI behavior
  - Keep fixed `BIN_SIZE` for legacy mode; adaptive binning only when enabled
- **Base color mapping**
  - Aggregate by base color in all pipelines (`red2`→`red`)
  - Use unified `display_colors` for output color selection
- **Plotting-area/annotation mask**
  - Provide flags: `use_plot_area`, `use_annotation_mask`; disabled by default for parity
  - Relax annotation mask near axes (bands) and legend; expose thresholds
- **Edge-guided denoising**
  - Gate by edges only when enabled; otherwise rely on morphology + area filtering like legacy
- **Log-scale mapping**
  - Legacy-compatible mapping; guard against non-positive mins without altering valid ranges
- **Smoothing**
  - Use legacy window presets (red=21, blue=17, others=13) in legacy mode; adaptive only when enabled
- **Selected colors**
  - Apply in all modes after base-color normalization
- **API**
  - Modes: `legacy` (default), `enhanced`, `auto_color` (explicit). Feature flags available as form params

## Implementation Notes (Code References)
- Legacy path for parity:
```1:120:services/curve-extraction-service/main.py
# process_image_legacy(...)
```
- Enhanced path with optional features:
```200:340:services/curve-extraction-service/main.py
# process_image_enhanced(...)
```
- Auto-color fallback (toggle):
```493:629:services/curve-extraction-service/main.py
# process_image_autocolor(...)
```

## Resource Links
- OpenCV (perspective transform, morphology, HSV, components): https://docs.opencv.org/
- SciPy Savitzky–Golay: https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.savgol_filter.html
- Matplotlib log scales: https://matplotlib.org/stable/users/explain/axes/scale.html
- FastAPI: https://fastapi.tiangolo.com/
