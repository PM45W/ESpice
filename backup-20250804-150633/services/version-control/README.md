# Version Control Service

The Version Control Service manages SPICE model libraries with comprehensive version tracking, metadata management, and rollback capabilities. It provides enterprise-grade version control for semiconductor device models.

## Features

### 🔄 Version Management
- **Semantic Versioning**: Automatic version number generation (1.0.0, 1.0.1, etc.)
- **Model History**: Complete version history with metadata
- **Status Tracking**: Draft, Review, Approved, Deprecated statuses
- **Rollback Support**: Revert to any previous version

### 📊 Model Organization
- **Model Types**: ASM-HEMT, MVSG, Si-MOSFET, Custom
- **Tagging System**: Flexible tagging for organization
- **Search & Filter**: Find models by name, type, or tags
- **Metadata Management**: Rich metadata for each model version

### 🔍 Comparison & Validation
- **Version Comparison**: Compare parameters between versions
- **Checksum Validation**: Ensure model integrity
- **Change Tracking**: Track parameter changes across versions

## API Endpoints

### Health
- `GET /health` — Service health check

### Model Management
- `POST /models` — Create a new model
- `GET /models` — List all models (with filtering)
- `GET /models/{model_id}` — Get model information
- `PUT /models/{model_id}` — Update model metadata
- `DELETE /models/{model_id}` — Delete model and all versions

### Version Management
- `POST /models/{model_id}/versions` — Create new version
- `GET /models/{model_id}/versions` — Get all versions
- `GET /models/{model_id}/versions/{version}` — Get specific version
- `PUT /models/{model_id}/versions/{version}/status` — Update version status
- `POST /models/{model_id}/rollback/{version}` — Rollback to version

### Comparison
- `GET /models/{model_id}/compare/{v1}/{v2}` — Compare two versions

## Example Usage

### 1. Create a New Model
```bash
curl -X POST http://localhost:8008/models \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "Power MOSFET Model",
    "model_type": "si_mosfet",
    "description": "High-power MOSFET model for switching applications",
    "model_data": {
      "device_type": "n-channel",
      "vds_max": 100,
      "id_max": 50
    },
    "parameters": {
      "vth": 2.5,
      "rds_on": 0.1,
      "ciss": 1500
    },
    "tags": ["power", "switching", "automotive"],
    "created_by": "engineer@company.com"
  }'
```

### 2. Create a New Version
```bash
curl -X POST http://localhost:8008/models/{model_id}/versions \
  -H "Content-Type: application/json" \
  -d '{
    "model_data": {
      "device_type": "n-channel",
      "vds_max": 100,
      "id_max": 50,
      "temperature_range": [-40, 150]
    },
    "parameters": {
      "vth": 2.3,
      "rds_on": 0.08,
      "ciss": 1400,
      "coss": 800
    },
    "description": "Updated parameters based on latest measurements",
    "tags": ["power", "switching", "automotive", "updated"],
    "created_by": "engineer@company.com"
  }'
```

### 3. Compare Versions
```bash
curl http://localhost:8008/models/{model_id}/compare/1.0.0/1.0.1
```

### 4. Rollback to Previous Version
```bash
curl -X POST http://localhost:8008/models/{model_id}/rollback/1.0.0
```

### 5. Search Models
```bash
# Search by name
curl "http://localhost:8008/models?query=mosfet"

# Filter by type
curl "http://localhost:8008/models?model_type=si_mosfet"

# Filter by tags
curl "http://localhost:8008/models?tags=power,automotive"
```

## Data Models

### Model Types
- **ASM_HEMT**: Advanced SPICE Model for HEMT devices
- **MVSG**: Multi-Version Surface Potential Model
- **SI_MOSFET**: Silicon MOSFET models
- **CUSTOM**: Custom or proprietary models

### Version Status
- **DRAFT**: Initial version, under development
- **REVIEW**: Ready for review and approval
- **APPROVED**: Approved for production use
- **DEPRECATED**: No longer recommended for use

### Model Structure
```json
{
  "model_id": "uuid",
  "model_name": "Power MOSFET Model",
  "model_type": "si_mosfet",
  "description": "High-power MOSFET model",
  "current_version": "1.0.1",
  "total_versions": 3,
  "created_at": "2025-02-01T10:00:00",
  "updated_at": "2025-02-01T15:30:00",
  "status": "approved",
  "tags": ["power", "switching"]
}
```

### Version Structure
```json
{
  "version_id": "uuid",
  "model_id": "uuid",
  "version_number": "1.0.1",
  "model_type": "si_mosfet",
  "model_data": {
    "device_type": "n-channel",
    "vds_max": 100
  },
  "parameters": {
    "vth": 2.3,
    "rds_on": 0.08
  },
  "metadata": {
    "foundry": "TSMC",
    "process": "28nm"
  },
  "status": "approved",
  "created_at": "2025-02-01T15:30:00",
  "created_by": "engineer@company.com",
  "description": "Updated parameters",
  "tags": ["power", "updated"],
  "checksum": "sha256_hash"
}
```

## Integration

### With SPICE Service
The version control service integrates with the SPICE service to:
- Store generated models with proper versioning
- Track parameter changes over time
- Provide model history for validation

### With Batch Processor
The batch processor can:
- Store results in version control
- Track processing improvements
- Maintain model lineage

### With AI Agent
The AI agent can:
- Query model history for training
- Validate new models against historical data
- Suggest parameter improvements

## File Storage

### Directory Structure
```
/app/models/
├── {model_id}/
│   ├── 1.0.0.json
│   ├── 1.0.0_metadata.json
│   ├── 1.0.1.json
│   ├── 1.0.1_metadata.json
│   └── ...
```

### File Formats
- **Model Files**: JSON with complete model data and parameters
- **Metadata Files**: JSON with version metadata and status

## Configuration

### Environment Variables
```bash
# Service configuration
PYTHONUNBUFFERED=1
MODEL_STORAGE_PATH=/app/models

# Database (future)
DATABASE_URL=postgresql://user:pass@db:5432/version_control
REDIS_URL=redis://redis:6379
```

### Docker Configuration
```yaml
version-control:
  build: ./services/version-control
  ports:
    - "8008:8008"
  environment:
    - PYTHONUNBUFFERED=1
  volumes:
    - ./models:/app/models
  networks:
    - espice-network
```

## Development

### Local Development
```bash
cd services/version-control
pip install -r requirements.txt
python main.py
```

### Testing
```bash
# Test model creation
curl -X POST http://localhost:8008/models \
  -H "Content-Type: application/json" \
  -d '{"model_name": "Test", "model_type": "custom", "description": "Test model", "model_data": {}, "parameters": {}, "created_by": "test"}'

# Test version creation
curl -X POST http://localhost:8008/models/{model_id}/versions \
  -H "Content-Type: application/json" \
  -d '{"model_data": {}, "parameters": {"vth": 2.5}, "description": "Test version", "created_by": "test"}'
```

## Future Enhancements

### Database Integration
- PostgreSQL for persistent storage
- Redis for caching
- Database migrations with Alembic

### Advanced Features
- **Branching**: Support for model branches
- **Merging**: Merge changes from different branches
- **Collaboration**: Multi-user editing and approval workflows
- **Validation**: Automated model validation rules
- **Export**: Export to various EDA tool formats

### Security
- **Authentication**: User authentication and authorization
- **Audit Trail**: Complete audit trail of all changes
- **Access Control**: Role-based access control
- **Encryption**: Encrypt sensitive model data

### Performance
- **Caching**: Redis caching for frequently accessed models
- **Indexing**: Database indexing for fast searches
- **Compression**: Compress large model files
- **CDN**: Content delivery network for model distribution

## Monitoring

### Health Checks
- Service health: `GET /health`
- Storage health: Check file system access
- Database health: Check database connectivity (future)

### Metrics
- **Model Count**: Total number of models
- **Version Count**: Total number of versions
- **Storage Usage**: Disk space used by models
- **API Performance**: Response times and throughput

### Logging
- **Model Operations**: Create, update, delete operations
- **Version Changes**: Version creation and status changes
- **Access Patterns**: API usage patterns
- **Error Tracking**: Detailed error information

---

**Version Control Service** — Enterprise-grade version control for SPICE model libraries. 