# Graph Extraction in ESpice Tauri App

## Overview

The ESpice Tauri app includes a comprehensive graph extraction feature that can extract curves from semiconductor datasheet graphs using advanced image processing techniques. The app supports multiple extraction methods:

1. **FastAPI Service** (Recommended) - High-performance Python-based extraction
2. **Tauri Backend** - Rust-based extraction (fallback)
3. **Web-based Processing** - Browser-based extraction (final fallback)

## Architecture

```
┌─────────────────┐    HTTP/JSON    ┌─────────────────────┐
│   Tauri App     │ ──────────────► │  FastAPI Service    │
│  (Frontend)     │                 │  (Python/OpenCV)    │
└─────────────────┘                 └─────────────────────┘
         │                                    │
         │ Tauri Invoke                       │
         ▼                                    ▼
┌─────────────────┐                 ┌─────────────────────┐
│  Rust Backend   │                 │   OpenCV Processing │
│  (Fallback)     │                 │   - Color Detection │
└─────────────────┘                 │   - Curve Extraction│
         │                          │   - Data Processing │
         │ Canvas API               └─────────────────────┘
         ▼
┌─────────────────┐
│  Web Processing │
│  (Final Fallback)│
└─────────────────┘
```

## Getting Started

### 1. Start the FastAPI Service

The FastAPI service provides the best performance and accuracy for curve extraction.

```powershell
# From the ESpice root directory
./scripts/start-curve-extraction-service.ps1
```

This will:
- Create a Python virtual environment
- Install required dependencies (OpenCV, NumPy, FastAPI, etc.)
- Start the service on http://localhost:8002
- Provide API documentation at http://localhost:8002/docs

### 2. Test the Service

```powershell
./scripts/test-curve-extraction-service.ps1
```

### 3. Start the Tauri App

```powershell
cd apps/desktop
npm run tauri dev
```

## Using Graph Extraction

### 1. Navigate to Graph Extraction

In the Tauri app, navigate to the **Graph Extraction** page.

### 2. Upload an Image

- Click "Select Image" to choose a datasheet graph image
- Supported formats: PNG, JPG, JPEG, BMP
- The image should contain clear, colored curves on a grid

### 3. Configure Extraction Settings

#### Graph Presets

The app includes predefined configurations for common graph types:

- **Output Characteristics** - Vds vs Id curves
- **Transfer Characteristics** - Vgs vs Id curves  
- **Capacitance Characteristics** - Coss, Ciss, Crss curves
- **Resistance Characteristics** - Rds vs Vgs curves
- **Custom** - User-defined configuration

#### Manual Configuration

You can manually adjust:
- **X-axis range** (x_min, x_max)
- **Y-axis range** (y_min, y_max)
- **Scale factors** (x_scale, y_scale)
- **Scale types** (linear/log)
- **Minimum point count**

### 4. Detect Colors

Click "Detect Colors" to automatically identify colors in the image:
- The service analyzes the image using OpenCV
- Detects dominant colors with confidence scores
- Shows pixel counts for each color
- Allows manual selection of colors to extract

### 5. Extract Curves

Click "Extract Curves" to process the image:
- Processes each selected color
- Extracts coordinate points
- Applies smoothing and filtering
- Generates curve data with metadata

### 6. View Results

The results include:
- **Curve visualization** with extracted points
- **Statistics** (point count, processing time)
- **Metadata** (average slope, quality metrics)
- **Export options** (CSV download)

## Advanced Features

### Batch Processing

The app supports batch processing of multiple images:

1. Upload multiple images
2. Configure extraction settings
3. Process all images simultaneously
4. Export results as a single CSV file

### Database Integration

Extracted curves can be saved to the database:

1. Select a product from the database
2. Configure color representations
3. Save curves with metadata
4. Link to product specifications

### Custom Graph Types

You can save custom graph configurations:

1. Configure extraction parameters
2. Set color representations
3. Save as a named graph type
4. Reuse for similar graphs

## Service Endpoints

The FastAPI service provides these endpoints:

### Health Check
```
GET /health
```

### Color Detection
```
POST /api/curve-extraction/detect-colors
Content-Type: multipart/form-data
Body: file (image file)
```

### Curve Extraction
```
POST /api/curve-extraction/extract-curves
Content-Type: multipart/form-data
Body: 
  - file (image file)
  - selected_colors (JSON string)
  - x_min, x_max, y_min, y_max (float)
  - x_scale, y_scale (float)
  - x_scale_type, y_scale_type (string)
  - min_size (int)
```

## Troubleshooting

### Service Not Starting

1. **Check Python installation**:
   ```powershell
   python --version
   ```

2. **Check dependencies**:
   ```powershell
   pip list | findstr opencv
   pip list | findstr fastapi
   ```

3. **Check port availability**:
   ```powershell
   netstat -an | findstr :8002
   ```

### Poor Extraction Quality

1. **Image Quality**:
   - Use high-resolution images
   - Ensure good contrast between curves and background
   - Avoid JPEG compression artifacts

2. **Color Selection**:
   - Select only the colors you want to extract
   - Avoid background colors
   - Use color confidence scores as guidance

3. **Configuration**:
   - Adjust axis ranges to match the graph
   - Use appropriate scale factors
   - Set minimum point count based on curve complexity

### Fallback Behavior

The app automatically falls back to alternative extraction methods:

1. **FastAPI Service** (Primary)
2. **Tauri Backend** (Secondary)
3. **Web-based Processing** (Final)

Check the console for fallback messages and service status.

## Performance Optimization

### FastAPI Service
- Uses OpenCV for efficient image processing
- Implements parallel processing for multiple colors
- Caches processed results
- Optimized algorithms for curve extraction

### Memory Management
- Processes images in chunks
- Releases memory after processing
- Implements garbage collection
- Monitors memory usage

## API Documentation

For detailed API documentation, visit:
- **Swagger UI**: http://localhost:8002/docs
- **ReDoc**: http://localhost:8002/redoc

## Development

### Adding New Graph Types

1. Add preset to `GRAPH_PRESETS` in `GraphExtractionPage.tsx`
2. Define color representations
3. Set appropriate axis ranges
4. Test with sample images

### Customizing Extraction Algorithms

1. Modify `extract_curves_enhanced()` in `main.py`
2. Adjust color detection parameters
3. Fine-tune smoothing algorithms
4. Update error handling

### Extending the Service

1. Add new endpoints to `main.py`
2. Implement additional processing algorithms
3. Add new data formats
4. Enhance error reporting

## Best Practices

1. **Image Preparation**:
   - Use high-quality, well-lit images
   - Ensure curves are clearly visible
   - Avoid overlapping curves
   - Use consistent color schemes

2. **Configuration**:
   - Start with preset configurations
   - Adjust parameters incrementally
   - Test with known data
   - Document custom settings

3. **Quality Assurance**:
   - Verify extracted data visually
   - Compare with known values
   - Use multiple extraction methods
   - Validate results statistically

## Support

For issues and questions:
1. Check the console for error messages
2. Verify service status with test script
3. Review API documentation
4. Check troubleshooting guide
5. Create GitHub issue with details 