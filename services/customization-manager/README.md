# Customization Manager Service

The Customization Manager Service provides comprehensive user customization capabilities for the ESpice platform. Users can create, manage, and share custom models, standards, and templates with an intuitive interface and powerful validation tools.

## Features

### 🎨 **Custom Model Creation**
- **SPICE Models**: Create custom SPICE subcircuits and models
- **Verilog-A Models**: Develop Verilog-A behavioral models
- **VHDL-AMS Models**: Build VHDL-AMS analog models
- **Custom Code**: Support for any custom modeling language
- **Template-Based Generation**: Generate models from predefined templates
- **Parameter Management**: Define and validate model parameters

### 📋 **Custom Standards**
- **IEEE Standards**: Compliance with IEEE modeling standards
- **JEDEC Standards**: JEDEC device modeling standards
- **IEC Standards**: International Electrotechnical Commission standards
- **Foundry Standards**: Foundry-specific modeling requirements
- **Company Standards**: Internal company modeling standards
- **Custom Rules**: User-defined validation rules and constraints

### 🏗️ **Model Templates**
- **Pre-built Templates**: Ready-to-use model templates
- **Custom Templates**: User-defined template creation
- **Parameter Placeholders**: Dynamic parameter substitution
- **Code Generation**: Automatic code generation from templates
- **Documentation**: Template documentation and examples

### 🔍 **Validation & Quality**
- **Standard Compliance**: Validate models against standards
- **Parameter Validation**: Check parameter ranges and types
- **Code Quality**: Syntax and semantic validation
- **Performance Analysis**: Model performance evaluation
- **Cross-Reference**: Validate against existing models

### 📊 **User Workspaces**
- **Personal Workspace**: Individual user workspace
- **Shared Workspaces**: Collaborative workspaces
- **Version Control**: Track changes and versions
- **Backup & Restore**: Export and import customizations
- **Access Control**: Manage permissions and sharing

## API Endpoints

### Health
- `GET /health` — Service health check

### Custom Models
- `POST /models` — Create new custom model
- `GET /models` — Get custom models
- `GET /models/{model_id}` — Get specific model
- `PUT /models/{model_id}` — Update model
- `DELETE /models/{model_id}` — Delete model

### Custom Standards
- `POST /standards` — Create new custom standard
- `GET /standards` — Get custom standards
- `GET /standards/{standard_id}` — Get specific standard
- `PUT /standards/{standard_id}` — Update standard
- `DELETE /standards/{standard_id}` — Delete standard

### Model Generation
- `POST /generate` — Generate model from template
- `GET /templates` — Get available templates
- `POST /templates` — Create new template

### Validation
- `POST /validate` — Validate model against standard
- `POST /validate/batch` — Batch validation

### Export/Import
- `POST /export` — Export customizations
- `POST /import` — Import customizations

## Example Usage

### 1. Create Custom SPICE Model
```bash
curl -X POST http://localhost:8012/models \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom GaN HEMT",
    "description": "Custom GaN HEMT model for power applications",
    "model_type": "spice",
    "device_category": "transistor",
    "author": "user123",
    "parameters": {
      "vth": 0.5,
      "kp": 0.1,
      "lambda": 0.01
    },
    "code": ".SUBCKT CustomGaN D G S\nM1 D G S S GaN_Model W=1e-6 L=1e-6\n.model GaN_Model NMOS(LEVEL=1 VTO=0.5 KP=0.1 LAMBDA=0.01)\n.ENDS CustomGaN",
    "tags": ["gan", "power", "custom"]
  }'
```

### 2. Create Custom Standard
```bash
curl -X POST http://localhost:8012/standards \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Power GaN Standard",
    "description": "Standard for power GaN device modeling",
    "standard_type": "custom",
    "author": "user123",
    "rules": [
      {
        "type": "parameter_range",
        "parameter": "vth",
        "min_value": 0.3,
        "max_value": 0.7,
        "severity": "error"
      },
      {
        "type": "parameter_range",
        "parameter": "kp",
        "min_value": 0.05,
        "max_value": 0.5,
        "severity": "warning"
      }
    ],
    "constraints": [
      {
        "type": "code_check",
        "required_keywords": [".SUBCKT", ".ENDS"],
        "severity": "error"
      }
    ]
  }'
```

### 3. Generate Model from Template
```bash
curl -X POST http://localhost:8012/generate \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "gan_hemt_spice",
    "parameters": {
      "model_name": "MyGaN",
      "vth": 0.5,
      "kp": 0.1,
      "lambda": 0.01,
      "w": 1e-6,
      "l": 1e-6,
      "rs": 0.1,
      "rd": 0.1,
      "cgs": 1e-12,
      "cgd": 1e-12,
      "cds": 1e-12
    },
    "user_id": "user123"
  }'
```

### 4. Validate Model Against Standard
```bash
curl -X POST http://localhost:8012/validate \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "model_uuid",
    "standard_id": "standard_uuid"
  }'
```

### 5. Export Customizations
```bash
curl -X POST http://localhost:8012/export \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "items": ["model_uuid1", "standard_uuid1"],
    "format": "json"
  }'
```

## Database Schema

### Custom Models Table
```sql
CREATE TABLE custom_models (
    model_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    model_type TEXT NOT NULL,
    device_category TEXT NOT NULL,
    author TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL,
    parameters TEXT,
    equations TEXT,
    code TEXT,
    dependencies TEXT,
    tags TEXT,
    documentation TEXT,
    examples TEXT,
    validation_rules TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    approved_by TEXT,
    approved_at TEXT
);
```

### Custom Standards Table
```sql
CREATE TABLE custom_standards (
    standard_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    standard_type TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL,
    author TEXT NOT NULL,
    rules TEXT,
    parameters TEXT,
    constraints TEXT,
    documentation TEXT,
    examples TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    approved_by TEXT,
    approved_at TEXT
);
```

### Model Templates Table
```sql
CREATE TABLE model_templates (
    template_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    model_type TEXT NOT NULL,
    device_category TEXT NOT NULL,
    template_code TEXT NOT NULL,
    parameters TEXT,
    placeholders TEXT,
    documentation TEXT,
    examples TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

## Model Types

### SPICE Models
- **Subcircuits**: `.SUBCKT` definitions
- **Device Models**: `.MODEL` statements
- **Behavioral Models**: Arbitrary expressions
- **Macro Models**: Complex subcircuits

### Verilog-A Models
- **Module Definitions**: `module` declarations
- **Analog Blocks**: `analog` blocks
- **Parameters**: `parameter` declarations
- **Functions**: Custom functions

### VHDL-AMS Models
- **Entity Definitions**: `entity` declarations
- **Architecture**: `architecture` blocks
- **Quantities**: `quantity` declarations
- **Simultaneous Statements**: `==` equations

## Standard Types

### IEEE Standards
- **IEEE 1076.1**: VHDL-AMS standard
- **IEEE 1364**: Verilog standard
- **IEEE 1800**: SystemVerilog standard

### JEDEC Standards
- **JESD77**: Device modeling standards
- **JESD84**: Memory modeling standards

### IEC Standards
- **IEC 60747**: Semiconductor device standards
- **IEC 60748**: Integrated circuit standards

## Template System

### Template Structure
```yaml
template_id: "gan_hemt_spice"
name: "GaN HEMT SPICE Template"
description: "Template for GaN HEMT SPICE models"
model_type: "spice"
device_category: "transistor"
template_code: |
  .SUBCKT {model_name} D G S
  * GaN HEMT Model
  * Parameters: {parameters}
  .param Vth={vth}
  .param Kp={kp}
  .param Lambda={lambda}
  
  M1 D G S S GaN_Model W={w} L={l}
  .model GaN_Model NMOS(LEVEL=1 VTO={vth} KP={kp} LAMBDA={lambda})
  
  .ENDS {model_name}
parameters:
  - name: "vth"
    type: "float"
    default: 0.5
    description: "Threshold voltage"
  - name: "kp"
    type: "float"
    default: 0.1
    description: "Transconductance parameter"
placeholders:
  - "model_name"
  - "parameters"
```

### Parameter Types
- **float**: Floating-point numbers
- **int**: Integer values
- **string**: Text strings
- **bool**: Boolean values
- **list**: List of values
- **dict**: Dictionary/map values

## Validation System

### Validation Rules
```json
{
  "type": "parameter_range",
  "parameter": "vth",
  "min_value": 0.3,
  "max_value": 0.7,
  "severity": "error",
  "description": "Threshold voltage must be between 0.3V and 0.7V"
}
```

### Validation Types
- **parameter_range**: Check parameter value ranges
- **parameter_type**: Validate parameter data types
- **code_syntax**: Check code syntax
- **code_semantics**: Validate code semantics
- **dependency_check**: Verify dependencies
- **performance_check**: Performance validation

### Validation Severity
- **error**: Must be fixed
- **warning**: Should be reviewed
- **info**: Informational message

## Integration

### With SPICE Service
The customization manager integrates with the SPICE service to:
- Provide custom models for simulation
- Validate model compatibility
- Generate SPICE-compatible code
- Manage model libraries

### With PDK Checker
The PDK checker can validate:
- Custom models against PDK rules
- Parameter compliance
- Foundry compatibility
- Performance requirements

### With Version Control
The version control service can:
- Track custom model versions
- Manage model evolution
- Maintain change history
- Support rollback operations

### With Web Scraper
The web scraper can:
- Import models from datasheets
- Extract parameter information
- Generate custom models
- Update existing models

## Configuration

### Environment Variables
```bash
# Service configuration
PYTHONUNBUFFERED=1
DATABASE_PATH=/app/customization_data.db
TEMPLATES_PATH=/app/templates
EXPORTS_PATH=/app/exports

# Validation configuration
VALIDATION_STRICT_MODE=true
MAX_MODEL_SIZE=1048576
MAX_PARAMETERS=100

# Template configuration
DEFAULT_TEMPLATE_VERSION=1.0.0
TEMPLATE_AUTO_SAVE=true
```

### Docker Configuration
```yaml
customization-manager:
  build: ./services/customization-manager
  ports:
    - "8012:8012"
  environment:
    - PYTHONUNBUFFERED=1
  volumes:
    - ./customization_data:/app/customization_data
    - ./templates:/app/templates
    - ./exports:/app/exports
  networks:
    - espice-network
```

## Development

### Local Development
```bash
cd services/customization-manager
pip install -r requirements.txt
python main.py
```

### Testing
```bash
# Test model creation
curl -X POST http://localhost:8012/models \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Model", "model_type": "spice", "device_category": "transistor", "author": "test"}'

# Test template generation
curl -X POST http://localhost:8012/generate \
  -H "Content-Type: application/json" \
  -d '{"template_id": "gan_hemt_spice", "parameters": {"model_name": "Test"}, "user_id": "test"}'
```

## Advanced Features

### Model Versioning
- **Semantic Versioning**: Major.Minor.Patch versioning
- **Change Tracking**: Track parameter and code changes
- **Compatibility**: Backward compatibility checking
- **Migration**: Automatic model migration

### Collaborative Features
- **Sharing**: Share models with other users
- **Comments**: Add comments and feedback
- **Reviews**: Model review and approval process
- **Forks**: Fork and modify existing models

### Advanced Validation
- **Static Analysis**: Code static analysis
- **Dynamic Testing**: Runtime model testing
- **Performance Profiling**: Model performance analysis
- **Memory Usage**: Memory consumption analysis

### Template Engine
- **Conditional Logic**: Template conditional statements
- **Loops**: Template iteration support
- **Functions**: Template function calls
- **Inheritance**: Template inheritance

## Future Enhancements

### Advanced Modeling
- **Machine Learning**: ML-based model generation
- **Auto-tuning**: Automatic parameter optimization
- **Multi-physics**: Multi-physics model support
- **Real-time**: Real-time model adaptation

### Collaboration Tools
- **Git Integration**: Git-based version control
- **Pull Requests**: Model review requests
- **CI/CD**: Continuous integration for models
- **Testing Framework**: Automated model testing

### Advanced Templates
- **Visual Editor**: Visual template editor
- **Wizard Interface**: Step-by-step model creation
- **Smart Suggestions**: Intelligent parameter suggestions
- **Auto-completion**: Code auto-completion

### Integration Features
- **EDA Integration**: Direct EDA tool integration
- **Cloud Storage**: Cloud-based model storage
- **API Marketplace**: Model marketplace
- **Plugin System**: Extensible plugin architecture

## Monitoring

### Health Checks
- **Service Health**: `GET /health`
- **Database Health**: Check database connectivity
- **Template Health**: Validate template integrity

### Metrics
- **Model Count**: Number of custom models
- **Standard Count**: Number of custom standards
- **Template Usage**: Template usage statistics
- **Validation Success**: Validation success rates

### Logging
- **Model Events**: Track model creation and updates
- **Validation Events**: Log validation activities
- **Template Events**: Monitor template usage
- **Error Tracking**: Detailed error information

---

**Customization Manager Service** — Comprehensive user customization system for creating, managing, and sharing custom models, standards, and templates. 