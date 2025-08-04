# AI Agent Service

The AI Agent Service is the central orchestration component of the ESpice microservices architecture. It provides intelligent workflow automation, AI-powered document processing, and seamless integration with all microservices through MCP (Model Context Protocol) tools.

## Overview

The AI Agent Service acts as an intelligent coordinator that:
- Orchestrates document processing workflows across microservices
- Provides AI-powered decision making using Ollama integration
- Manages workflow lifecycle and monitoring
- Offers MCP tools for external AI agent integration
- Implements intelligent document analysis and parameter extraction

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Agent      │    │   Ollama        │    │   MCP Tools     │
│   Service       │◄──►│   Integration   │    │   Interface     │
│   (Port 8006)   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PDF Service   │    │  Image Service  │    │  Table Service  │
│   (Port 8002)   │    │   (Port 8003)   │    │   (Port 8004)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │  SPICE Service  │
                    │   (Port 8005)   │
                    └─────────────────┘
```

## Features

### 🔄 Workflow Orchestration
- **Full Extraction Workflow**: Complete document processing pipeline
- **Table-Only Workflow**: Extract only tables and parameters
- **Image-Only Workflow**: Extract only images and curves
- **Custom Workflows**: Configurable processing pipelines

### 🤖 AI-Powered Processing
- **Document Intent Analysis**: Automatically determine processing requirements
- **Parameter Extraction**: AI-driven semiconductor parameter identification
- **Result Validation**: Intelligent validation of extraction results
- **SPICE Model Suggestions**: AI recommendations for model generation

### 📊 Workflow Management
- **Real-time Monitoring**: Track workflow progress and status
- **Step-by-step Execution**: Detailed workflow step tracking
- **Error Recovery**: Automatic fallback and retry mechanisms
- **Result Storage**: Persistent workflow results and metadata

### 🔧 MCP Tools Integration
- **Service Health Monitoring**: Check all microservices health
- **Workflow Control**: Start, monitor, and manage workflows
- **Batch Processing**: Process multiple documents efficiently
- **Intelligent Routing**: AI-driven service selection

## API Endpoints

### Health and Status
```
GET /health                    # Service health check
GET /services/health          # All microservices health status
```

### Workflow Management
```
POST /workflow/start          # Start a new workflow
GET /workflow/{id}            # Get workflow status and results
GET /workflow/{id}/steps      # Get detailed workflow steps
GET /workflows                # List all workflows
DELETE /workflow/{id}         # Delete a workflow
```

### Request/Response Examples

#### Start Workflow
```bash
curl -X POST http://localhost:8006/workflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_type": "full_extraction",
    "pdf_url": "https://example.com/datasheet.pdf"
  }'
```

Response:
```json
{
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Workflow started",
  "results": null,
  "created_at": "2025-02-01T10:30:00",
  "updated_at": "2025-02-01T10:30:00"
}
```

#### Get Workflow Status
```bash
curl http://localhost:8006/workflow/550e8400-e29b-41d4-a716-446655440000
```

Response:
```json
{
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "message": "Full extraction workflow completed successfully",
  "results": {
    "text": "extracted text content...",
    "tables": [...],
    "images": [...],
    "spice_model": {...}
  },
  "created_at": "2025-02-01T10:30:00",
  "updated_at": "2025-02-01T10:35:00"
}
```

## Workflow Types

### 1. Full Extraction (`full_extraction`)
Complete document processing pipeline:
1. **PDF Processing**: Extract text, tables, and images
2. **Image Processing**: Analyze curves and graphs
3. **Table Processing**: Extract parameters and data
4. **SPICE Generation**: Generate SPICE models

### 2. Table Only (`table_only`)
Focused on parameter extraction:
1. **PDF Processing**: Extract tables only
2. **Table Processing**: Extract parameters and data

### 3. Image Only (`image_only`)
Focused on curve extraction:
1. **PDF Processing**: Extract images only
2. **Image Processing**: Analyze curves and graphs

## AI Integration

### Ollama Integration
The service integrates with Ollama for AI-powered processing:

```python
from ollama_integration import OllamaIntegration

# Initialize Ollama integration
ollama = OllamaIntegration()

# Analyze document intent
intent = await ollama.analyze_document_intent(
    "Semiconductor datasheet for power MOSFET"
)

# Extract parameters
params = await ollama.extract_processing_parameters(
    "Vds: 20V, Vgs: 5V, Id: 10A"
)

# Validate results
validation = await ollama.validate_extraction_results(results)
```

### AI Capabilities
- **Document Classification**: Automatically identify document types
- **Parameter Recognition**: Extract semiconductor parameters from text
- **Quality Assessment**: Validate extraction quality and completeness
- **Model Recommendations**: Suggest appropriate SPICE models

## MCP Tools

The service provides MCP tools for external AI agent integration:

### Available Tools
- `start_document_extraction_workflow`: Start processing workflows
- `get_workflow_status`: Monitor workflow progress
- `get_workflow_steps`: Get detailed workflow information
- `list_workflows`: List all workflows
- `delete_workflow`: Remove workflows
- `check_services_health`: Monitor microservices health
- `execute_full_document_analysis`: Complete analysis with AI

### Tool Schema Example
```json
{
  "name": "start_document_extraction_workflow",
  "description": "Start a document extraction workflow",
  "inputSchema": {
    "type": "object",
    "properties": {
      "pdf_url": {
        "type": "string",
        "description": "URL to the PDF document"
      },
      "workflow_type": {
        "type": "string",
        "enum": ["full_extraction", "table_only", "image_only"],
        "description": "Type of extraction workflow"
      }
    }
  }
}
```

## Workflow Automation

### Batch Processing
```python
from workflow_automation import WorkflowAutomation

# Initialize automation
automation = WorkflowAutomation(mcp_tools)

# Process multiple documents
results = await automation.batch_process_documents(
    "path/to/pdf/directory",
    "path/to/output"
)
```

### Intelligent Processing
```python
# Intelligent document processing with AI
result = await automation.process_semiconductor_datasheet(
    "path/to/datasheet.pdf",
    "output/directory"
)
```

## Configuration

### Environment Variables
```bash
# Service configuration
PYTHONUNBUFFERED=1
OLLAMA_URL=http://host.docker.internal:11434

# Microservice URLs (auto-configured in Docker)
PDF_SERVICE_URL=http://pdf-service:8002
IMAGE_SERVICE_URL=http://image-service:8003
TABLE_SERVICE_URL=http://table-service:8004
SPICE_SERVICE_URL=http://spice-service:8005
```

### Docker Configuration
```yaml
ai-agent:
  build: ./services/ai-agent
  ports:
    - "8006:8006"
  environment:
    - PYTHONUNBUFFERED=1
    - OLLAMA_URL=http://host.docker.internal:11434
  depends_on:
    - pdf-service
    - image-service
    - table-service
    - spice-service
```

## Development

### Local Development
```bash
# Navigate to service directory
cd services/ai-agent

# Install dependencies
pip install -r requirements.txt

# Run service
python main.py
```

### Testing
```bash
# Run comprehensive tests
./test-week2-integration.ps1

# Test specific components
python -m pytest tests/
```

### API Documentation
Once the service is running, visit:
- **Swagger UI**: http://localhost:8006/docs
- **ReDoc**: http://localhost:8006/redoc

## Monitoring and Logging

### Health Checks
- **Service Health**: `GET /health`
- **Microservices Health**: `GET /services/health`
- **Workflow Status**: `GET /workflow/{id}`

### Logging
The service provides comprehensive logging:
- **Workflow Lifecycle**: Start, progress, completion, errors
- **Service Communication**: Inter-service requests and responses
- **AI Processing**: Document analysis and parameter extraction
- **Error Tracking**: Detailed error information and stack traces

### Metrics
- **Workflow Success Rate**: Percentage of successful workflows
- **Processing Time**: Average workflow completion time
- **Service Response Times**: Microservice communication latency
- **AI Processing Accuracy**: Parameter extraction confidence scores

## Troubleshooting

### Common Issues

#### 1. Ollama Connection Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Verify Docker network connectivity
docker exec ai-agent curl http://host.docker.internal:11434/api/tags
```

#### 2. Microservice Communication Issues
```bash
# Check all services health
curl http://localhost:8006/services/health

# Verify service URLs in Docker Compose
docker-compose ps
```

#### 3. Workflow Failures
```bash
# Check workflow status
curl http://localhost:8006/workflow/{workflow_id}

# Get detailed workflow steps
curl http://localhost:8006/workflow/{workflow_id}/steps
```

### Debug Mode
Enable debug logging by setting:
```bash
export LOG_LEVEL=DEBUG
```

## Performance Optimization

### Workflow Optimization
- **Parallel Processing**: Execute independent steps concurrently
- **Caching**: Cache frequently accessed data in Redis
- **Resource Management**: Optimize memory and CPU usage
- **Error Recovery**: Implement intelligent retry mechanisms

### AI Processing Optimization
- **Model Selection**: Choose appropriate Ollama models for tasks
- **Batch Processing**: Process multiple documents efficiently
- **Result Caching**: Cache AI analysis results
- **Quality Thresholds**: Set confidence thresholds for AI decisions

## Security Considerations

### API Security
- **Input Validation**: Validate all input parameters
- **Rate Limiting**: Implement request rate limiting
- **Error Handling**: Avoid information disclosure in errors
- **Authentication**: Implement proper authentication (future)

### Data Security
- **Secure Communication**: Use HTTPS for external communication
- **Data Encryption**: Encrypt sensitive data at rest
- **Access Control**: Implement proper access controls
- **Audit Logging**: Log all security-relevant events

## Future Enhancements

### Planned Features
- **Advanced AI Models**: Integration with more sophisticated AI models
- **Custom Workflows**: User-defined workflow templates
- **Real-time Collaboration**: Multi-user workflow management
- **Advanced Analytics**: Detailed processing analytics and insights
- **Plugin System**: Extensible workflow plugin architecture

### Integration Roadmap
- **Enterprise SSO**: Single sign-on integration
- **Cloud Storage**: Integration with cloud storage providers
- **Advanced EDA Tools**: Direct integration with EDA platforms
- **Mobile Support**: Mobile app for workflow monitoring

## Contributing

### Development Guidelines
1. **Code Standards**: Follow PEP 8 and type hints
2. **Testing**: Write comprehensive tests for new features
3. **Documentation**: Update documentation for API changes
4. **Error Handling**: Implement proper error handling and logging

### Testing
```bash
# Run unit tests
python -m pytest tests/unit/

# Run integration tests
python -m pytest tests/integration/

# Run full test suite
python -m pytest tests/
```

## License

This service is part of the ESpice project and follows the same licensing terms.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check service logs for detailed error information
4. Contact the development team

---

**AI Agent Service** - Intelligent workflow orchestration for ESpice microservices architecture. 