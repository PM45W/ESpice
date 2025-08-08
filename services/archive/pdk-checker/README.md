# PDK Compatibility Checker Service

The PDK Compatibility Checker Service validates SPICE models against foundry Process Design Kit (PDK) rules and requirements. It ensures that extracted or generated models comply with foundry-specific design rules, parameter ranges, and device limitations.

## Features

### 🏭 **Foundry Support**
- **TSMC**: 7nm, 5nm, 3nm process nodes
- **GlobalFoundries**: 12LP, 7LP process nodes
- **SMIC**: 14nm and other nodes
- **UMC**: 28nm and other nodes
- **Intel**: Various process nodes
- **Samsung**: Advanced process nodes
- **Custom**: User-defined foundry rules

### 🔍 **Device Types**
- **NMOS/PMOS**: Standard MOSFET devices
- **HEMT**: High Electron Mobility Transistors
- **BJT**: Bipolar Junction Transistors
- **Diode**: Diode devices
- **Resistor**: Passive resistors
- **Capacitor**: Passive capacitors

### 📋 **Validation Rules**
- **Parameter Ranges**: Min/max values for device parameters
- **Device Limits**: Physical and electrical constraints
- **Temperature Ranges**: Operating temperature limits
- **Voltage Ranges**: Operating voltage constraints
- **Custom Conditions**: User-defined validation rules

### 🎯 **Validation Types**
- **Error**: Critical violations that must be fixed
- **Warning**: Issues that should be reviewed
- **Info**: Informational messages and recommendations

## API Endpoints

### Health
- `GET /health` — Service health check

### Validation
- `POST /validate` — Validate model against PDK rules
- `GET /validate/{validation_id}` — Get validation result
- `GET /validate` — List all validation results
- `DELETE /validate/{validation_id}` — Delete validation result

### Rulesets
- `GET /rulesets` — Get available PDK rulesets
- `GET /rulesets/{foundry}/{process_node}/{device_type}` — Get specific rules
- `POST /rulesets` — Create custom ruleset

### Quick Check
- `POST /quick-check` — Quick PDK compatibility check

## Example Usage

### 1. Validate Model Against PDK Rules
```bash
curl -X POST http://localhost:8010/validate \
  -H "Content-Type: application/json" \
  -d '{
    "foundry": "tsmc",
    "process_node": "tsmc_7nm",
    "device_type": "nmos",
    "parameters": {
      "vth": 0.5,
      "l": 0.007,
      "w": 0.014,
      "vds_max": 0.75
    },
    "temperature": 25.0
  }'
```

### 2. Quick PDK Check
```bash
curl -X POST http://localhost:8010/quick-check \
  -H "Content-Type: application/json" \
  -d '{
    "foundry": "tsmc",
    "process_node": "tsmc_7nm",
    "device_type": "nmos",
    "parameters": {
      "vth": 0.5,
      "l": 0.007,
      "w": 0.014
    }
  }'
```

### 3. Get Available Rulesets
```bash
curl http://localhost:8010/rulesets
```

### 4. Get Specific Rules
```bash
curl http://localhost:8010/rulesets/tsmc/tsmc_7nm/nmos
```

### 5. Create Custom Ruleset
```bash
curl -X POST http://localhost:8010/rulesets \
  -H "Content-Type: application/json" \
  -d '{
    "ruleset_id": "custom_tsmc_7nm",
    "foundry": "tsmc",
    "process_node": "tsmc_7nm",
    "device_type": "nmos",
    "rules": [
      {
        "rule_id": "custom_vth",
        "rule_name": "Custom Threshold Voltage",
        "rule_type": "parameter_range",
        "device_type": "nmos",
        "parameter_name": "vth",
        "min_value": 0.4,
        "max_value": 0.6,
        "severity": "error",
        "description": "Custom threshold voltage range",
        "foundry": "tsmc",
        "process_node": "tsmc_7nm"
      }
    ],
    "version": "1.0.0",
    "description": "Custom TSMC 7nm rules"
  }'
```

## PDK Rules

### TSMC 7nm NMOS Rules
- **Threshold Voltage (Vth)**: 0.3V - 0.7V
- **Minimum Channel Length (L)**: 7nm
- **Minimum Channel Width (W)**: 14nm
- **Maximum VDS**: 0.75V

### TSMC 5nm NMOS Rules
- **Threshold Voltage (Vth)**: 0.25V - 0.65V
- **Minimum Channel Length (L)**: 5nm

### GlobalFoundries 12LP NMOS Rules
- **Threshold Voltage (Vth)**: 0.4V - 0.8V
- **Minimum Channel Length (L)**: 12nm

## Validation Results

### Result Structure
```json
{
  "validation_id": "uuid",
  "model_id": "optional_model_id",
  "foundry": "tsmc",
  "process_node": "tsmc_7nm",
  "device_type": "nmos",
  "status": "pass|fail|warning",
  "total_rules": 4,
  "passed_rules": 3,
  "failed_rules": 1,
  "warnings": 0,
  "results": [
    {
      "rule_id": "tsmc_7nm_nmos_vth",
      "rule_name": "Threshold Voltage Range",
      "rule_type": "parameter_range",
      "severity": "error",
      "description": "Threshold voltage must be between 0.3V and 0.7V",
      "status": "pass",
      "message": "Value 0.5 is within acceptable range",
      "parameter_name": "vth",
      "expected_range": "0.3 to 0.7",
      "actual_value": 0.5
    }
  ],
  "created_at": "2025-02-01T10:00:00"
}
```

### Quick Check Response
```json
{
  "status": "pass",
  "passed_rules": 3,
  "failed_rules": 0,
  "total_rules": 3,
  "failed_parameters": []
}
```

## Integration

### With SPICE Service
The PDK checker integrates with the SPICE service to:
- Validate generated models before storage
- Ensure compliance with foundry requirements
- Provide validation reports for model quality

### With Version Control
The version control service can:
- Store validation results with model versions
- Track compliance improvements over time
- Maintain validation history

### With Test Correlation
The test correlation service can:
- Validate test data against PDK rules
- Ensure test conditions are within PDK limits
- Provide comprehensive validation reports

## File Storage

### Directory Structure
```
/app/pdk_rules/
├── tsmc_7nm_nmos.json
├── tsmc_5nm_nmos.json
├── gf_12lp_nmos.json
└── custom_rulesets/

/app/validation_results/
├── {validation_id}.json
├── {validation_id}_summary.json
└── ...
```

### Ruleset Format
```json
{
  "ruleset_id": "tsmc_7nm_nmos",
  "foundry": "tsmc",
  "process_node": "tsmc_7nm",
  "device_type": "nmos",
  "rules": [
    {
      "rule_id": "tsmc_7nm_nmos_vth",
      "rule_name": "Threshold Voltage Range",
      "rule_type": "parameter_range",
      "device_type": "nmos",
      "parameter_name": "vth",
      "min_value": 0.3,
      "max_value": 0.7,
      "severity": "error",
      "description": "Threshold voltage must be between 0.3V and 0.7V"
    }
  ],
  "version": "1.0.0",
  "description": "TSMC 7nm NMOS device rules"
}
```

## Configuration

### Environment Variables
```bash
# Service configuration
PYTHONUNBUFFERED=1
PDK_RULES_PATH=/app/pdk_rules
VALIDATION_RESULTS_PATH=/app/validation_results

# Validation configuration
DEFAULT_SEVERITY=error
STRICT_MODE=true
```

### Docker Configuration
```yaml
pdk-checker:
  build: ./services/pdk-checker
  ports:
    - "8010:8010"
  environment:
    - PYTHONUNBUFFERED=1
  volumes:
    - ./pdk_rules:/app/pdk_rules
    - ./validation_results:/app/validation_results
  networks:
    - espice-network
```

## Development

### Local Development
```bash
cd services/pdk-checker
pip install -r requirements.txt
python main.py
```

### Testing
```bash
# Test validation
curl -X POST http://localhost:8010/validate \
  -H "Content-Type: application/json" \
  -d '{"foundry": "tsmc", "process_node": "tsmc_7nm", "device_type": "nmos", "parameters": {"vth": 0.5}}'

# Test quick check
curl -X POST http://localhost:8010/quick-check \
  -H "Content-Type: application/json" \
  -d '{"foundry": "tsmc", "process_node": "tsmc_7nm", "device_type": "nmos", "parameters": {"vth": 0.5}}'
```

## Future Enhancements

### Advanced Rules
- **Conditional Rules**: Rules that depend on other parameters
- **Statistical Rules**: Rules based on statistical distributions
- **Time-dependent Rules**: Rules that change over time
- **Process Variation**: Rules accounting for process variations

### Extended Foundry Support
- **More Foundries**: Additional foundry support
- **Advanced Nodes**: Latest process nodes
- **Specialty Processes**: RF, analog, power processes
- **Multi-project Wafers**: MPW-specific rules

### Integration Features
- **EDA Tool Integration**: Direct integration with EDA tools
- **Design Rule Check**: DRC integration
- **Layout vs. Schematic**: LVS validation
- **Parasitic Extraction**: PEX validation

### Advanced Validation
- **Monte Carlo Analysis**: Statistical validation
- **Corner Analysis**: Process corner validation
- **Temperature Analysis**: Temperature-dependent validation
- **Aging Analysis**: Reliability validation

## Monitoring

### Health Checks
- **Service Health**: `GET /health`
- **Ruleset Health**: Check ruleset availability
- **Validation Health**: Monitor validation performance

### Metrics
- **Validation Count**: Number of validations performed
- **Success Rate**: Percentage of passing validations
- **Rule Coverage**: Coverage of PDK rules
- **Processing Time**: Average validation time

### Logging
- **Validation Events**: Track validation requests
- **Rule Evaluations**: Log rule evaluation results
- **Error Tracking**: Detailed error information
- **Performance Metrics**: Processing time and resource usage

---

**PDK Compatibility Checker Service** — Comprehensive validation of SPICE models against foundry PDK rules and requirements. 