# Test Data Correlation Service

The Test Data Correlation Service validates extracted SPICE model parameters against production silicon test data. It provides comprehensive correlation analysis, accuracy assessment, and validation tools for ensuring model quality and reliability.

## Features

### 📊 **Data Processing**
- **Multi-format Support**: CSV, JSON, and other common test data formats
- **Automatic Parameter Extraction**: Extract key parameters from test curves
- **Data Validation**: Validate test data integrity and completeness
- **Metadata Management**: Track test conditions and device information

### 🔍 **Correlation Analysis**
- **Parameter Comparison**: Compare extracted vs. measured parameters
- **Statistical Analysis**: Calculate correlation scores and error metrics
- **Tolerance Checking**: Validate parameters against acceptable tolerances
- **Confidence Assessment**: Determine confidence levels for correlations

### 📈 **Test Data Types**
- **I-V Curves**: Current-voltage characteristics
- **C-V Curves**: Capacitance-voltage characteristics
- **Temperature Data**: Temperature-dependent parameters
- **Frequency Data**: Frequency response measurements
- **Noise Data**: Noise characteristics
- **Aging Data**: Reliability and aging effects

### 📋 **Validation Tools**
- **Quick Validation**: Rapid parameter validation
- **Batch Processing**: Process multiple test datasets
- **Trend Analysis**: Track parameter changes over time
- **Quality Metrics**: Comprehensive quality assessment

## API Endpoints

### Health
- `GET /health` — Service health check

### Test Data Management
- `POST /test-data/upload` — Upload test data file
- `GET /test-data/{test_data_id}` — Get test data information
- `GET /test-data` — List all test data files
- `DELETE /test-data/{test_data_id}` — Delete test data file

### Correlation Analysis
- `POST /correlate` — Start correlation analysis
- `GET /correlate/{correlation_id}` — Get correlation results
- `GET /correlate` — List all correlations

### Validation
- `POST /validate/{test_data_id}` — Quick parameter validation

## Example Usage

### 1. Upload Test Data
```bash
curl -X POST http://localhost:8009/test-data/upload \
  -F "file=@/path/to/iv_curve.csv" \
  -F "device_id=DMOS001" \
  -F "test_type=iv_curve" \
  -F "temperature=25" \
  -F "voltage_range=0,100" \
  -F "description=I-V curve measurement at 25°C"
```

### 2. Correlate Extracted Parameters
```bash
curl -X POST http://localhost:8009/correlate \
  -H "Content-Type: application/json" \
  -d '{
    "test_data_id": "test_data_uuid",
    "extracted_parameters": {
      "vth": 2.5,
      "rds_on": 0.1,
      "id_max": 50.0
    },
    "tolerance_percentage": 10.0,
    "confidence_threshold": 0.8
  }'
```

### 3. Get Correlation Results
```bash
curl http://localhost:8009/correlate/{correlation_id}
```

### 4. Quick Validation
```bash
curl -X POST http://localhost:8009/validate/{test_data_id} \
  -H "Content-Type: application/json" \
  -d '{
    "vth": 2.5,
    "rds_on": 0.1,
    "id_max": 50.0
  }'
```

## Data Formats

### CSV Format (I-V Curve)
```csv
Vds,Vgs,Ids
0,5,0
1,5,0.1
2,5,0.2
...
```

### JSON Format
```json
{
  "test_type": "iv_curve",
  "device_id": "DMOS001",
  "temperature": 25,
  "data": [
    {"vds": 0, "vgs": 5, "ids": 0},
    {"vds": 1, "vgs": 5, "ids": 0.1},
    {"vds": 2, "vgs": 5, "ids": 0.2}
  ]
}
```

## Parameter Extraction

### I-V Curve Parameters
- **Vth (Threshold Voltage)**: Voltage where current starts to flow
- **Rds_on (On-resistance)**: Resistance in the on-state
- **Id_max (Maximum Current)**: Maximum drain current
- **Vds_max (Maximum Voltage)**: Maximum drain-source voltage

### C-V Curve Parameters
- **Ciss (Input Capacitance)**: Gate-source capacitance
- **Coss (Output Capacitance)**: Drain-source capacitance
- **Crss (Reverse Transfer Capacitance)**: Gate-drain capacitance

### Temperature Parameters
- **Temperature Coefficient**: Parameter change with temperature
- **Room Temperature Value**: Parameter value at 25°C

## Correlation Metrics

### Error Calculation
```
Error = |Extracted_Value - Measured_Value|
Error_Percentage = (Error / Measured_Value) × 100
```

### Correlation Score
```
Correlation_Score = max(0, 1 - (Error_Percentage / 100))
```

### Confidence Level
```
Confidence_Level = min(1.0, Correlation_Score / Confidence_Threshold)
```

### Tolerance Checking
```
Within_Tolerance = Error_Percentage ≤ Tolerance_Percentage
```

## Integration

### With SPICE Service
The test correlation service integrates with the SPICE service to:
- Validate generated models against silicon data
- Provide accuracy metrics for model quality
- Track model improvements over time

### With Version Control
The version control service can:
- Store correlation results with model versions
- Track parameter accuracy improvements
- Maintain validation history

### With AI Agent
The AI agent can:
- Use correlation results for model training
- Validate AI-generated parameters
- Improve extraction accuracy

## File Storage

### Directory Structure
```
/app/test_data/
├── {test_data_id}_filename.csv
├── {test_data_id}_filename.json
└── ...

/app/correlation_results/
├── {correlation_id}.json
├── {correlation_id}_summary.json
└── ...
```

### Result Format
```json
{
  "correlation_id": "uuid",
  "created_at": "2025-02-01T10:00:00",
  "results": [
    {
      "parameter_name": "vth",
      "extracted_value": 2.5,
      "measured_value": 2.3,
      "correlation_score": 0.92,
      "error_percentage": 8.7,
      "within_tolerance": true,
      "confidence_level": 0.92
    }
  ],
  "summary": {
    "total_parameters": 3,
    "within_tolerance": 2,
    "average_correlation_score": 0.89,
    "average_error_percentage": 7.2
  }
}
```

## Configuration

### Environment Variables
```bash
# Service configuration
PYTHONUNBUFFERED=1
TEST_DATA_PATH=/app/test_data
CORRELATION_RESULTS_PATH=/app/correlation_results

# Processing configuration
DEFAULT_TOLERANCE_PERCENTAGE=10.0
DEFAULT_CONFIDENCE_THRESHOLD=0.8
MAX_FILE_SIZE=100MB
```

### Docker Configuration
```yaml
test-correlation:
  build: ./services/test-correlation
  ports:
    - "8009:8009"
  environment:
    - PYTHONUNBUFFERED=1
  volumes:
    - ./test_data:/app/test_data
    - ./correlation_results:/app/correlation_results
  networks:
    - espice-network
```

## Development

### Local Development
```bash
cd services/test-correlation
pip install -r requirements.txt
python main.py
```

### Testing
```bash
# Test file upload
curl -X POST http://localhost:8009/test-data/upload \
  -F "file=@test_data.csv" \
  -F "device_id=TEST001" \
  -F "test_type=iv_curve"

# Test correlation
curl -X POST http://localhost:8009/correlate \
  -H "Content-Type: application/json" \
  -d '{"test_data_id": "test_id", "extracted_parameters": {"vth": 2.5}}'
```

## Future Enhancements

### Advanced Analytics
- **Machine Learning**: ML-based parameter extraction
- **Statistical Modeling**: Advanced statistical analysis
- **Trend Analysis**: Long-term parameter trends
- **Outlier Detection**: Automatic outlier identification

### Data Management
- **Database Integration**: PostgreSQL for persistent storage
- **Data Versioning**: Version control for test data
- **Data Validation**: Automated data quality checks
- **Metadata Standards**: Industry-standard metadata

### Visualization
- **Interactive Plots**: Web-based data visualization
- **Comparison Charts**: Side-by-side parameter comparison
- **Trend Graphs**: Parameter evolution over time
- **Quality Dashboards**: Real-time quality metrics

### Integration
- **EDA Tool Integration**: Direct integration with EDA tools
- **Test Equipment**: Automated data collection
- **Cloud Storage**: Cloud-based data storage
- **API Standards**: Industry-standard API protocols

## Monitoring

### Health Checks
- **Service Health**: `GET /health`
- **Storage Health**: Check file system access
- **Processing Health**: Monitor correlation performance

### Metrics
- **Upload Count**: Number of test data files uploaded
- **Correlation Count**: Number of correlations performed
- **Success Rate**: Percentage of successful correlations
- **Processing Time**: Average correlation processing time

### Logging
- **Upload Events**: Test data upload tracking
- **Processing Events**: Correlation processing logs
- **Error Tracking**: Detailed error information
- **Performance Metrics**: Processing time and resource usage

---

**Test Data Correlation Service** — Comprehensive validation and correlation of SPICE models against silicon test data. 