# UI/UX Guide for Curve Extraction API

## Design System
- Respect colorful, visually distinct plotting (avoid harsh black/white only). Use hex colors from `display_colors` for clarity.
- Provide soft-contrast plot grid (dashed, alpha ~0.7) to keep curves visually prominent.

## Parameter Controls (Client/UI)
- Required inputs:
  - Image file (PNG/JPG)
  - Axis ranges `x_min`, `x_max`, `y_min`, `y_max`
  - Axis scales `x_scale_type`, `y_scale_type` (linear|log)
  - Scaling factors `x_scale`, `y_scale`
  - `selected_colors` (array), normalized to base colors (`red2`→`red`)
- Optional toggles (default off for legacy parity):
  - `use_plot_area`, `use_annotation_mask`, `use_edge_guided`, `use_adaptive_binning`
  - `use_auto_color` (explicit opt-in)
- Sensitivity & thresholds:
  - `min_size` default 1000 (legacy parity); warn if user reduces below image-noise threshold
  - `color_tolerance` 0 by default; expose as expert control only

## Visualization
- Preview plot returned as base64 PNG; render with:
  - Axis labels from request
  - Log/linear scales matching request
  - Legend using base-color representations
- Prefer softer grid lines and clear color mapping for accessibility

## Accessibility & Responsiveness
- Ensure keyboard navigation and descriptive labels for controls
- Avoid high-contrast extremes; use softer contrast palettes as default

## Error Messaging
- Provide concise validation messages on bad ranges (e.g., log scale requires positive bounds)
- Indicate when no curves are detected and suggest increasing `min_size` or enabling enhanced features

## Component Library Organization
- API client component (upload + params)
- Results viewer (plot image + stats)
- Advanced settings accordion (feature flags/tuning)

## User Journey
1. Upload graph image
2. Select graph type or set ranges/scales
3. Choose colors (auto-detected helper) → normalize
4. Run legacy mode (default) → preview
5. If poor extraction, enable enhanced toggles progressively

## References
- Colors: align with `display_colors` in `services/curve-extraction-service/main.py`
- Scales: adhere to axis mapping rules for log/linear
