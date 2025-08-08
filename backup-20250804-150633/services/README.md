# ESpice Microservices Architecture

## Overview

This directory contains the microservices implementation for the ESpice project. The architecture has been transformed from a monolithic application to a scalable microservices system using MCP (Model Context Protocol) for AI agent orchestration.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   AI Agent      │
│   (Tauri App)   │◄──►│   (Port 8000)   │◄──►│   (MCP Client)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
    ┌─────────────┬───────────┼───────────┬─────────────┐
    │             │           │           │             │
    ▼             ▼           ▼           ▼             ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ PDF     │ │ Image   │ │ Table   │ │ SPICE   │ │ Redis   │
│ Service │ │ Service │ │ Service │ │ Service │ │ Cache   │
│8002     │ │8003     │ │8004     │ │8005     │ │6379     │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

## Services

### 1. API Gateway (Port 8000)
- **Purpose**: Load balancing, routing, and request/response transformation
- **Features**:
  - Dynamic routing to appropriate microservices
  - Health monitoring for all services
  - Request/response transformation
  - Error handling and logging
- **Endpoints**:
  - `GET /health` - Gateway health check
  - `GET /api/gateway/services` - List all services
  - `GET /api/gateway/health` - Health status of all services
  - `/*` - Routes all API requests to appropriate services

### 2. PDF Service (Port 8002)
- **Purpose**: PDF processing and extraction
- **Features**:
  - Text extraction with OCR
  - Table detection and extraction
  - Image extraction from PDFs
  - Metadata extraction
- **Endpoints**:
  - `POST /api/pdf/extract-text` - Extract text from PDF
  - `POST /api/pdf/extract-tables` - Extract tables from PDF
  - `POST /api/pdf/extract-images` - Extract images from PDF
  - `POST /api/pdf/extract-metadata` - Extract metadata from PDF

### 3. Image Service (Port 8003)
- **Purpose**: Image processing and curve extraction
- **Features**:
  - Color detection in images
  - Curve extraction from graphs
  - Graph processing for different types (IV, CV, transfer curves)
  - Image quality validation
- **Endpoints**:
  - `POST /api/image/detect-colors` - Detect colors in image
  - `POST /api/image/extract-curves` - Extract curves from image
  - `POST /api/image/process-graph` - Process graph image
  - `POST /api/image/validate-quality` - Validate image quality

### 4. Table Service (Port 8004)
- **Purpose**: Table data extraction and parameter validation
- **Features**:
  - Structured data extraction from tables
  - Semiconductor parameter extraction
  - Parameter validation against known ranges
  - SPICE parameter formatting
  - Cross-reference with reference data
- **Endpoints**:
  - `POST /api/table/extract-data` - Extract data from table
  - `POST /api/table/validate-parameters` - Validate parameters
  - `POST /api/table/format-for-spice` - Format for SPICE
  - `POST /api/table/cross-reference` - Cross-reference parameters

### 5. SPICE Service (Port 8005)
- **Purpose**: SPICE model generation and validation
- **Features**:
  - SPICE model generation for different device types
  - Parameter fitting from extracted data
  - Model validation and syntax checking
  - Export to different formats (LTspice, KiCad, ADS)
- **Endpoints**:
  - `GET /api/spice/models` - Get available model types
  - `POST /api/spice/generate-model` - Generate SPICE model
  - `POST /api/spice/fit-parameters` - Fit parameters from data
  - `POST /api/spice/validate-model` - Validate SPICE model
  - `POST /api/spice/export-model` - Export model in different formats

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.11+ (for local development)

### Running with Docker Compose

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **Check service health**:
   ```bash
   curl http://localhost:8000/api/gateway/health
   ```

3. **Access individual services**:
   - API Gateway: http://localhost:8000
   - PDF Service: http://localhost:8002
   - Image Service: http://localhost:8003
   - Table Service: http://localhost:8004
   - SPICE Service: http://localhost:8005

### Running Individual Services Locally

1. **Navigate to service directory**:
   ```bash
   cd services/[service-name]
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run service**:
   ```bash
   python main.py
   ```

## API Usage Examples

### 1. Process PDF and Extract Data

```bash
# Extract text from PDF
curl -X POST http://localhost:8000/api/pdf/extract-text \
  -F "file=@datasheet.pdf"

# Extract tables from PDF
curl -X POST http://localhost:8000/api/pdf/extract-tables \
  -F "file=@datasheet.pdf"
```

### 2. Process Image and Extract Curves

```bash
# Detect colors in image
curl -X POST http://localhost:8000/api/image/detect-colors \
  -F "file=@graph.png"

# Extract curves from image
curl -X POST http://localhost:8000/api/image/extract-curves \
  -F "file=@graph.png" \
  -H "Content-Type: application/json" \
  -d '{"selected_colors": ["red", "blue"], "x_min": 0, "x_max": 10, "y_min": 0, "y_max": 20}'
```

### 3. Generate SPICE Model

```bash
# Generate SPICE model
curl -X POST http://localhost:8000/api/spice/generate-model \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "GAN001",
    "device_type": "GaN-HEMT",
    "model_type": "asm_hemt",
    "parameters": {
      "v_th": 2.5,
      "r_ds_on": 0.1
    }
  }'
```

## Development

### Adding New Services

1. **Create service directory**:
   ```bash
   mkdir services/new-service
   cd services/new-service
   ```

2. **Create main.py with FastAPI app**:
   ```python
   from fastapi import FastAPI
   from fastapi.middleware.cors import CORSMiddleware
   
   app = FastAPI(title="New Service")
   
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   
   @app.get("/health")
   async def health_check():
       return {"status": "healthy", "service": "new-service"}
   ```

3. **Create requirements.txt and Dockerfile**

4. **Add to docker-compose.yml**:
   ```yaml
   new-service:
     build: ./services/new-service
     ports:
       - "8006:8006"
     networks:
       - espice-network
   ```

5. **Update API Gateway routing**

### Service Communication

Services communicate through HTTP REST APIs. For inter-service communication:

```python
import httpx

async def call_service(service_url: str, endpoint: str, data: dict):
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{service_url}{endpoint}", json=data)
        return response.json()
```

### Error Handling

All services follow a standardized error response format:

```json
{
  "success": false,
  "error": "Error description",
  "metadata": {
    "processingTime": 0.123,
    "service": "service-name",
    "version": "1.0.0",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Logging

Services use structured logging with consistent format:

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

## Monitoring and Health Checks

### Health Check Endpoints

All services provide health check endpoints:
- `GET /health` - Returns service status

### Health Check Response Format

```json
{
  "status": "healthy",
  "service": "service-name",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Monitoring Dashboard

Access the API Gateway dashboard at http://localhost:8000/docs for:
- Service health status
- API documentation
- Request/response monitoring

## Deployment

### Production Deployment

1. **Environment Variables**:
   ```bash
   export PDF_SERVICE_URL=https://pdf-service.example.com
   export IMAGE_SERVICE_URL=https://image-service.example.com
   export TABLE_SERVICE_URL=https://table-service.example.com
   export SPICE_SERVICE_URL=https://spice-service.example.com
   ```

2. **Docker Compose Production**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Load Balancer Configuration**:
   - Configure reverse proxy (nginx/traefik)
   - Set up SSL certificates
   - Configure rate limiting

### Scaling

Scale individual services:

```bash
# Scale PDF service to 3 instances
docker-compose up -d --scale pdf-service=3

# Scale all services
docker-compose up -d --scale pdf-service=3 --scale image-service=2 --scale table-service=2
```

## Troubleshooting

### Common Issues

1. **Service not starting**:
   ```bash
   docker-compose logs [service-name]
   ```

2. **Port conflicts**:
   - Check if ports are already in use
   - Modify port mappings in docker-compose.yml

3. **Network issues**:
   ```bash
   docker network ls
   docker network inspect espice_espice-network
   ```

### Debug Mode

Run services in debug mode:

```bash
# Add to docker-compose.yml
environment:
  - PYTHONUNBUFFERED=1
  - LOG_LEVEL=DEBUG
```

## Contributing

1. Follow the established service structure
2. Add comprehensive error handling
3. Include health check endpoints
4. Add API documentation
5. Write tests for new endpoints
6. Update this README with new services

## License

This project is licensed under the MIT License - see the LICENSE file for details. 