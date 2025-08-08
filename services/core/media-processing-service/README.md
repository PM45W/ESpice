# Media Processing Service

The Media Processing Service consolidates image and table processing capabilities for the ESpice platform. It provides comprehensive media analysis, data extraction, and processing functionality for semiconductor datasheets and technical documents.

## Features

### 🖼️ **Image Processing**
- **Color Detection**: Automatic color detection in images using HSV color space
- **Curve Extraction**: Extract curves from graphs with customizable parameters
- **Graph Processing**: Process different graph types (IV curves, CV curves, transfer curves)
- **Quality Validation**: Validate image quality and curve extraction results
- **Image Enhancement**: Improve image quality for better extraction

### 📊 **Table Processing**
- **Data Extraction**: Extract structured data from tables
- **Parameter Validation**: Validate semiconductor parameters against standards
- **SPICE Formatting**: Format parameters for SPICE model generation
- **Cross-Reference**: Cross-reference parameters with reference data
- **Pattern Recognition**: Recognize semiconductor parameter patterns

### 🔍 **Data Analysis**
- **Parameter Extraction**: Extract electrical and mechanical parameters
- **Unit Conversion**: Automatic unit conversion and standardization
- **Data Validation**: Validate extracted data against known ranges
- **Quality Assessment**: Assess data quality and reliability
- **Error Detection**: Detect and flag potential data errors

### 📈 **Curve Analysis**
- **Multi-Color Support**: Support for red, blue, green, yellow, cyan, magenta, orange, purple
- **Axis Detection**: Automatic axis detection and scaling
- **Smoothing**: Apply smoothing algorithms to extracted curves
- **Interpolation**: Interpolate missing data points
- **Export Formats**: Export curves in various formats (CSV, JSON)

## API Endpoints

### Health
- `GET /health` — Service health check

### Image Processing
- `POST /api/image/detect-colors` — Detect colors in uploaded image
- `POST /api/image/extract-curves` — Extract curves from graph image
- `POST /api/image/process-graph` — Process specific graph types
- `POST /api/image/validate-quality` — Validate image quality

### Table Processing
- `POST /api/table/extract-data` — Extract data from table
- `POST /api/table/validate-parameters` — Validate semiconductor parameters
- `POST /api/table/format-for-spice` — Format parameters for SPICE
- `POST /api/table/cross-reference` — Cross-reference parameters

## Example Usage

### Image Processing
```bash
# Detect colors in image
curl -X POST http://localhost:8012/api/image/detect-colors \
  -F "file=@/path/to/graph.png" \
  -F "request={\"min_pixel_count\":100,\"include_hsv_values\":true};type=application/json"

# Extract curves from graph
curl -X POST http://localhost:8012/api/image/extract-curves \
  -F "file=@/path/to/graph.png" \
  -F "request={\"selected_colors\":[\"red\",\"blue\"],\"x_min\":0,\"x_max\":10,\"y_min\":0,\"y_max\":20};type=application/json"

# Process specific graph type
curl -X POST http://localhost:8012/api/image/process-graph \
  -F "file=@/path/to/iv_curve.png" \
  -F "request={\"graph_type\":\"iv_curve\",\"auto_detect_axes\":true};type=application/json"
```

### Table Processing
```bash
# Extract data from table
curl -X POST http://localhost:8012/api/table/extract-data \
  -H "Content-Type: application/json" \
  -d '{
    "table_data": {
      "headers": ["Parameter", "Value", "Unit"],
      "rows": [["V_th", "2.5", "V"], ["R_ds_on", "50", "mΩ"]],
      "title": "Electrical Parameters"
    },
    "extract_parameters": true,
    "validate_data": true
  }'

# Validate parameters
curl -X POST http://localhost:8012/api/table/validate-parameters \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": [
      {"name": "V_th", "value": 2.5, "unit": "V"},
      {"name": "R_ds_on", "value": 50, "unit": "mΩ"}
    ],
    "device_type": "gan_hemt"
  }'

# Format for SPICE
curl -X POST http://localhost:8012/api/table/format-for-spice \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": [
      {"name": "V_th", "value": 2.5, "unit": "V"},
      {"name": "R_ds_on", "value": 50, "unit": "mΩ"}
    ],
    "model_type": "asm_hemt",
    "include_units": true
  }'
```

## Configuration
- **Port**: 8012
- **Supported Colors**: red, blue, green, yellow, cyan, magenta, orange, purple
- **Graph Types**: iv_curve, cv_curve, transfer_curve
- **Parameter Patterns**: V_th, R_ds_on, I_d_max, V_ds_max, C_iss, etc.

## Development
```bash
cd services/core/media-processing-service
pip install -r requirements.txt
python main.py
```

## Docker
The service is included in `docker-compose.yml` and will be started with the rest of the ESpice stack.

## Integration
- Integrates with PDF Service for document processing
- Connects with Curve Extraction Service for advanced analysis
- Supports Data Processing Service for batch operations
- Provides data to SPICE Generation Service

## Supported Parameter Types

### Electrical Parameters
- **V_th**: Threshold voltage
- **R_ds_on**: Drain-source on-resistance
- **I_d_max**: Maximum drain current
- **V_ds_max**: Maximum drain-source voltage
- **C_iss**: Input capacitance
- **C_oss**: Output capacitance
- **C_rss**: Reverse transfer capacitance

### Thermal Parameters
- **T_j_max**: Maximum junction temperature
- **R_th_jc**: Junction-to-case thermal resistance
- **R_th_ja**: Junction-to-ambient thermal resistance

### Package Parameters
- **Package**: Package type
- **Pin_Count**: Number of pins
- **Dimensions**: Package dimensions

## Future Enhancements
- Machine learning-based parameter recognition
- Advanced image preprocessing algorithms
- Support for more graph types and formats
- Real-time processing capabilities
- Integration with external parameter databases 