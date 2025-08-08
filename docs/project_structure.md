# Project Structure

## Root Directory
```
ESpice/
├── services/
│   └── curve-extraction-service/
│       ├── main.py                 # FastAPI with legacy/enhanced/auto-color pipelines
│       └── (future) utils/         # Optional: helpers (warp, mask, binning, smoothing)
├── Docs/
│   ├── Implementation.md
│   ├── project_structure.md
│   └── UI_UX_doc.md
└── examples/
    └── curve_extract_gui_legacy.py  # Legacy reference GUI/script
```

## Detailed Structure
- `services/curve-extraction-service/main.py`
  - REST endpoints: `/api/curve-extraction/detect-colors`, `/extract-curves`, `/extract-curves-legacy`, `/extract-curves-llm`
  - Pipelines:
    - `process_image_legacy(...)` – strict legacy-parity mode
    - `process_image_enhanced(...)` – optional robustness features (feature flags)
    - `process_image_autocolor(...)` – optional clustering fallback
  - Utilities (inline for now): perspective rectification, plotting-area detection, annotation mask creation, binning, smoothing

- `Docs/Implementation.md`
  - End-to-end plan with stages, checklists, and modification details

- `Docs/UI_UX_doc.md`
  - API usage and visualization guidelines for preview images, color mapping, and parameter controls (to be completed)

## Configuration Locations
- No environment files required for core extraction; optional LLM key via `KIMI_API_KEY`
- Feature flags exposed as form params in `/extract-curves` (planned: `use_plot_area`, `use_annotation_mask`, `use_edge_guided`, `use_adaptive_binning`, `use_auto_color`)

## Build and Deployment
- Run service locally:
```
python services/curve-extraction-service/main.py
```
- Containerization out of scope for this task

## Testing
- Add image fixtures under `services/curve-extraction-service/tests/fixtures/`
- Add unit tests for: legacy parity, plotting-area detection, annotation masking thresholds, log-scale mapping correctness
