# Graph Extraction Rust Backend Implementation

## Overview

The graph extraction functionality has been successfully migrated from mock implementations to a robust Rust backend using Tauri. This implementation provides high-performance image processing and curve extraction capabilities for semiconductor datasheet analysis.

## Architecture

### Frontend-Backend Communication
- **Frontend**: React/TypeScript application with curve extraction UI
- **Backend**: Rust-based image processing engine using Tauri
- **Communication**: Tauri invoke commands for seamless frontend-backend integration

### Core Components

#### 1. Rust Backend (`apps/desktop/src-tauri/src/curve_extraction.rs`)
- **Color Detection**: Advanced HSV-based color detection with tolerance
- **Curve Extraction**: Morphological operations and connected component analysis
- **Image Processing**: OpenCV-style operations using the `image` crate
- **Data Structures**: Comprehensive type definitions matching frontend interfaces

#### 2. Frontend Service (`apps/desktop/src/services/curveExtractionService.ts`)
- **API Wrapper**: Clean interface to Rust backend functions
- **Error Handling**: Comprehensive error management and fallback strategies
- **Data Processing**: Post-processing and enhancement of extracted curves
- **Configuration Management**: Graph type presets and user configurations

#### 3. UI Components (`apps/desktop/src/pages/GraphExtractionPage.tsx`)
- **File Upload**: Drag-and-drop image upload with validation
- **Color Selection**: Interactive color detection and selection
- **Configuration Panel**: Graph type presets and axis configuration
- **Results Display**: Real-time curve visualization and export options

## Key Features

### Enhanced Color Detection
```rust
// HSV-based color detection with tolerance
fn color_matches_range(h: f32, s: f32, v: f32, range: &ColorRange) -> bool {
    let h_normalized = h / 2.0; // Convert to 0-180 range
    
    // Handle red color wraparound
    let h_match = if range.lower[0] > range.upper[0] {
        h_normalized >= range.lower[0] as f32 || h_normalized <= range.upper[0] as f32
    } else {
        h_normalized >= range.lower[0] as f32 && h_normalized <= range.upper[0] as f32
    };
    
    // More lenient saturation and value matching with tolerance
    let s_match = s * 255.0 >= range.lower[1] as f32 * (1.0 - range.tolerance) 
                  && s * 255.0 <= range.upper[1] as f32 * (1.0 + range.tolerance);
    let v_match = v * 255.0 >= range.lower[2] as f32 * (1.0 - range.tolerance) 
                  && v * 255.0 <= range.upper[2] as f32 * (1.0 + range.tolerance);
    
    h_match && s_match && v_match
}
```

### Advanced Curve Extraction
```rust
// Main curve extraction function with enhanced algorithm
pub fn extract_curves(
    image_data: &[u8],
    selected_colors: &[String],
    config: &GraphConfig,
) -> Result<ExtractionResult, String> {
    // Load and process image
    let image = image::load_from_memory(image_data)?;
    let rgb_image = image.to_rgb8();
    
    // Auto-detect grid size and apply morphological operations
    let (_rows, _cols) = auto_detect_grid_size(&rgb_image);
    
    // Process each selected color with enhanced filtering
    for color_name in selected_colors {
        let mask = create_color_mask(&rgb_image, color_range);
        let cleaned_mask = morphological_open(&mask, width, height);
        let filtered_mask = filter_connected_components(&cleaned_mask, width, height, min_size);
        
        // Extract and process curve points
        // Apply coordinate conversion and smoothing
    }
}
```

### Graph Type Presets
The system includes predefined configurations for common semiconductor graph types:

- **Output Characteristics**: Vds vs Id curves
- **Transfer Characteristics**: Vgs vs Id curves  
- **Capacitance Characteristics**: Vds vs C curves
- **Resistance Characteristics**: Vgs vs Rds curves
- **Custom**: User-defined configurations

## API Functions

### Color Detection
```typescript
// Frontend call
const colors = await curveExtractionService.detectColors(imageData);

// Rust backend function
#[tauri::command]
fn detect_colors_enhanced(image_data: Vec<u8>) -> Result<Vec<DetectedColor>, String>
```

### Curve Extraction
```typescript
// Frontend call
const result = await curveExtractionService.extractCurves(
    imageData,
    selectedColors,
    config
);

// Rust backend function
#[tauri::command]
fn extract_curves_enhanced(
    image_data: Vec<u8>,
    selected_colors: Vec<String>,
    config: GraphConfig,
) -> Result<ExtractionResult, String>
```

### Database Integration
```typescript
// Frontend call
await curveExtractionService.saveToDatabase(
    productId,
    curves,
    config,
    colorRepresentations
);

// Rust backend function
#[tauri::command]
fn save_curves_to_database(
    product_id: String,
    curves: Vec<CurveData>,
    config: GraphConfig,
) -> Result<String, String>
```

## Data Types

### Frontend Types (TypeScript)
```typescript
interface DetectedColor {
  name: string;
  display_name?: string;
  color: string;
  pixelCount: number;
  hsv?: { h: number; s: number; v: number; };
  confidence?: number;
}

interface GraphConfig {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  x_scale: number;
  y_scale: number;
  x_scale_type: 'linear' | 'log';
  y_scale_type: 'linear' | 'log';
  graph_type: string;
  x_axis_name?: string;
  y_axis_name?: string;
}

interface CurveExtractionResult {
  curves: CurveData[];
  totalPoints: number;
  processingTime: number;
  success?: boolean;
  error?: string;
  metadata?: {
    imageWidth?: number;
    imageHeight?: number;
    detectedColors?: number;
    extractionMethod?: string;
    qualityScore?: number;
  };
}
```

### Backend Types (Rust)
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedColor {
    pub name: String,
    pub display_name: Option<String>,
    pub color: String,
    pub pixel_count: usize,
    pub hsv: Option<HSV>,
    pub confidence: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphConfig {
    pub x_min: f64,
    pub x_max: f64,
    pub y_min: f64,
    pub y_max: f64,
    pub x_scale: f64,
    pub y_scale: f64,
    pub x_scale_type: String,
    pub y_scale_type: String,
    pub graph_type: String,
    pub x_axis_name: Option<String>,
    pub y_axis_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionResult {
    pub success: bool,
    pub curves: Vec<CurveData>,
    pub total_points: usize,
    pub processing_time: f64,
    pub error: Option<String>,
    pub metadata: Option<ExtractionMetadata>,
}
```

## Performance Optimizations

### Rust Backend Optimizations
- **Memory Efficiency**: Direct image processing without unnecessary allocations
- **Algorithm Efficiency**: Optimized morphological operations and connected component analysis
- **Parallel Processing**: Rayon-based parallel processing for large images
- **Caching**: Intelligent caching of color ranges and processing results

### Frontend Optimizations
- **Lazy Loading**: On-demand loading of image data and processing results
- **Debounced Updates**: Efficient UI updates with debounced state changes
- **Memory Management**: Proper cleanup of large image data and processing results
- **Error Recovery**: Graceful error handling with user-friendly fallbacks

## Testing and Validation

### Test Button
A test button has been added to the UI to verify Rust backend integration:
- Tests color detection with a simple PNG image
- Tests curve extraction with basic configuration
- Provides immediate feedback on backend functionality

### Error Handling
- Comprehensive error messages for debugging
- Fallback strategies for failed operations
- User-friendly error display in the UI

## Usage Instructions

### Basic Workflow
1. **Upload Image**: Drag and drop or select an image file containing graphs
2. **Detect Colors**: The system automatically detects prominent colors in the image
3. **Select Colors**: Choose which colors to extract as curves
4. **Configure Graph**: Set axis ranges, scales, and graph type
5. **Extract Curves**: Process the image to extract curve data
6. **View Results**: Visualize extracted curves and export data

### Advanced Features
- **Batch Processing**: Process multiple images simultaneously
- **Custom Configurations**: Save and reuse graph type configurations
- **Data Export**: Export curves to CSV format
- **Database Integration**: Save extracted data to the application database

## Dependencies

### Rust Dependencies
```toml
[dependencies]
image = "0.24"           # Image processing
imageproc = "0.23"       # Image processing utilities
nalgebra = "0.32"        # Linear algebra
ndarray = "0.15"         # Numerical arrays
rustfft = "6.0"          # Fast Fourier Transform
rayon = "1.7"            # Parallel processing
serde = { version = "1", features = ["derive"] }  # Serialization
```

### Frontend Dependencies
```json
{
  "@tauri-apps/api": "^2.7.0",
  "react": "^18.3.1",
  "typescript": "^5.6.3"
}
```

## Future Enhancements

### Planned Improvements
1. **Machine Learning Integration**: AI-powered curve detection and validation
2. **Advanced Filtering**: More sophisticated noise reduction algorithms
3. **Real-time Processing**: Live curve extraction during image upload
4. **Multi-format Support**: Support for additional image formats
5. **Cloud Processing**: Offload heavy processing to cloud services

### Performance Targets
- **Processing Speed**: < 2 seconds for typical datasheet images
- **Accuracy**: > 95% curve detection accuracy
- **Memory Usage**: < 100MB for standard processing
- **Scalability**: Support for images up to 4K resolution

## Conclusion

The Rust backend implementation provides a robust, high-performance foundation for graph extraction functionality. The integration between frontend and backend is seamless, providing users with a professional-grade tool for semiconductor datasheet analysis.

The implementation successfully replaces the previous mock functionality with real image processing capabilities, enabling accurate curve extraction from semiconductor datasheet graphs. 