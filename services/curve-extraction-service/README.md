# Curve Extraction Service - Optimized Version

## Overview

This service provides optimized curve extraction from semiconductor datasheet graphs, combining the reliability of the legacy algorithm with modern enhancements.

## Key Improvements

### 1. **Algorithm Optimization**
- **Legacy Algorithm Restoration**: Fixed coordinate mapping and smoothing to exactly match the working legacy GUI
- **Enhanced Algorithm Simplification**: Removed over-engineered features that interfered with core functionality
- **Proven Parameter Sets**: Uses tested smoothing windows (21 for red, 17 for blue, 13 for others)

### 2. **Multi-Strategy Approach**
The service now uses a progressive strategy approach:

1. **Legacy First**: Most reliable, proven algorithm
2. **Enhanced Conservative**: Modern features with strict settings
3. **Enhanced Relaxed**: Moderate tolerance and plot area detection
4. **Enhanced Very Relaxed**: Maximum tolerance for difficult images
5. **Auto-Color Clustering**: Final fallback for color-agnostic extraction

### 3. **Better Defaults**
- `color_tolerance`: 0 (legacy compatibility)
- `min_size`: 1000 (matches legacy default)
- `mode`: "legacy" (most reliable)

## API Endpoints

### 1. `/api/curve-extraction/extract-curves` (Main Endpoint)
**Default Strategy**: Legacy → Enhanced → Auto-Color

**Parameters:**
- `mode`: "legacy", "enhanced", "auto" (default: "legacy")
- `color_tolerance`: 0-60 (default: 0)
- `min_size`: Minimum pixel area (default: 1000)
- `use_plot_area`: Enable plot area detection (default: false)
- `use_auto_color`: Enable auto-color clustering (default: false)

### 2. `/api/curve-extraction/extract-curves-legacy` (Guaranteed Compatibility)
**Strategy**: Legacy algorithm only

**Use Case**: When you need guaranteed compatibility with the original GUI

### 3. `/api/curve-extraction/extract-curves-optimized` (Recommended)
**Strategy**: Legacy → Enhanced (simplified)

**Use Case**: Best balance of reliability and modern features

### 4. `/api/curve-extraction/extract-curves-llm` (AI-Assisted)
**Strategy**: LLM-based extraction

**Use Case**: Complex graphs requiring AI interpretation

## Algorithm Comparison

| Feature | Legacy | Enhanced | Auto-Color |
|---------|--------|----------|------------|
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Accuracy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Flexibility** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Complex Graphs** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## Usage Examples

### Basic Usage (Recommended)
```bash
curl -X POST "http://localhost:8002/api/curve-extraction/extract-curves-optimized" \
  -F "file=@graph.png" \
  -F "selected_colors=[\"red\",\"blue\"]" \
  -F "x_min=0" \
  -F "x_max=3" \
  -F "y_min=0" \
  -F "y_max=2.75" \
  -F "x_scale=1" \
  -F "y_scale=10"
```

### Legacy Compatibility
```bash
curl -X POST "http://localhost:8002/api/curve-extraction/extract-curves-legacy" \
  -F "file=@graph.png" \
  -F "selected_colors=[\"red\",\"blue\"]" \
  -F "x_min=0" \
  -F "x_max=3" \
  -F "y_min=0" \
  -F "y_max=2.75" \
  -F "x_scale=1" \
  -F "y_scale=10" \
  -F "min_size=1000"
```

### Advanced Usage with Enhanced Features
```bash
curl -X POST "http://localhost:8002/api/curve-extraction/extract-curves" \
  -F "file=@graph.png" \
  -F "selected_colors=[\"red\",\"blue\"]" \
  -F "x_min=0" \
  -F "x_max=3" \
  -F "y_min=0" \
  -F "y_max=2.75" \
  -F "x_scale=1" \
  -F "y_scale=10" \
  -F "mode=auto" \
  -F "color_tolerance=10" \
  -F "use_plot_area=true" \
  -F "use_auto_color=true"
```

## Troubleshooting

### Common Issues

1. **No curves extracted**
   - Try legacy mode first
   - Reduce `min_size` parameter
   - Increase `color_tolerance`
   - Enable `use_plot_area`

2. **Inaccurate coordinates**
   - Verify axis ranges (x_min, x_max, y_min, y_max)
   - Check scale types (linear vs log)
   - Use legacy mode for proven accuracy

3. **Missing colors**
   - Check `selected_colors` parameter
   - Increase `color_tolerance`
   - Try auto-color mode

### Performance Tips

1. **For reliable results**: Use `/extract-curves-optimized` or `/extract-curves-legacy`
2. **For complex graphs**: Use `/extract-curves` with `mode=auto`
3. **For speed**: Use legacy mode with appropriate `min_size`
4. **For accuracy**: Use legacy mode with `color_tolerance=0`

## Response Format

```json
{
  "success": true,
  "data": {
    "curves": [
      {
        "name": "red",
        "color": "#FF0000",
        "points": [
          {"x": 0.1, "y": 0.2, "confidence": 0.95}
        ],
        "representation": "red",
        "pointCount": 1
      }
    ],
    "total_points": 1,
    "processing_time": 0.123,
    "success": true,
    "plot_image": "base64_encoded_image",
    "metadata": {
      "extraction_method": "legacy",
      "quality_score": 1.0,
      "legacy_fallback_used": false
    }
  }
}
```

## Migration Guide

### From Legacy GUI
1. Use `/extract-curves-legacy` for guaranteed compatibility
2. Set `min_size=1000` (legacy default)
3. Set `color_tolerance=0` (legacy behavior)

### From Previous API Version
1. Update default parameters:
   - `color_tolerance`: 0 (was 20)
   - `mode`: "legacy" (was "enhanced")
2. Use `/extract-curves-optimized` for best results
3. Test with legacy mode first

## Development

### Running the Service
```bash
cd services/curve-extraction-service
python main.py
```

### Testing
```bash
# Test legacy compatibility
curl -X POST "http://localhost:8002/api/curve-extraction/extract-curves-legacy" \
  -F "file=@test_graph.png" \
  -F "selected_colors=[\"red\"]" \
  -F "x_min=0" -F "x_max=10" \
  -F "y_min=0" -F "y_max=10" \
  -F "x_scale=1" -F "y_scale=1"

# Test optimized endpoint
curl -X POST "http://localhost:8002/api/curve-extraction/extract-curves-optimized" \
  -F "file=@test_graph.png" \
  -F "selected_colors=[\"red\"]" \
  -F "x_min=0" -F "x_max=10" \
  -F "y_min=0" -F "y_max=10" \
  -F "x_scale=1" -F "y_scale=1"
```

## Version History

### v2.0.0 (Current)
- ✅ Fixed legacy algorithm compatibility
- ✅ Simplified enhanced algorithm
- ✅ Added multi-strategy approach
- ✅ Improved default parameters
- ✅ Added optimized endpoint
- ✅ Enhanced error handling and logging

### v1.x (Previous)
- ❌ Over-engineered enhanced algorithm
- ❌ Poor default parameters
- ❌ Incompatible with legacy behavior
- ❌ Complex parameter interactions
