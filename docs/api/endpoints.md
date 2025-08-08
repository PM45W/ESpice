# API Endpoints

## Core Services

### PDF Service
Base URL: `http://localhost:8001`

#### Extract Text from PDF
```http
POST /api/pdf/extract
Content-Type: multipart/form-data

Parameters:
- file: PDF file (required)
- pages: Page range (optional, default: all)
- ocr: Enable OCR (optional, default: false)
```

**Response:**
```json
{
  "success": true,
  "text": "Extracted text content...",
  "pages": 5,
  "processing_time": 2.3
}
```

#### Extract Tables from PDF
```http
POST /api/pdf/tables
Content-Type: multipart/form-data

Parameters:
- file: PDF file (required)
- pages: Page range (optional)
- table_detection: Algorithm type (optional)
```

**Response:**
```json
{
  "success": true,
  "tables": [
    {
      "page": 3,
      "table_data": [
        ["Parameter", "Value", "Unit"],
        ["Vds", "650", "V"],
        ["Id", "10", "A"]
      ]
    }
  ]
}
```

### Curve Extraction Service
Base URL: `http://localhost:8002`

#### Extract Curves from Image
```http
POST /api/curve-extraction/extract
Content-Type: multipart/form-data

Parameters:
- file: Image file (required)
- colors: Color detection (optional)
- smoothing: Smoothing level (optional)
- algorithm: Extraction algorithm (optional)
```

**Response:**
```json
{
  "success": true,
  "curves": [
    {
      "name": "Id vs Vds",
      "data": [
        {"x": 0, "y": 0},
        {"x": 1, "y": 0.5},
        {"x": 2, "y": 1.2}
      ],
      "color": "#FF0000"
    }
  ],
  "processing_time": 1.8
}
```

#### Get Extraction Status
```http
GET /api/curve-extraction/status/{job_id}
```

**Response:**
```json
{
  "job_id": "abc123",
  "status": "completed",
  "progress": 100,
  "result": {...}
}
```

### SPICE Generation Service
Base URL: `http://localhost:8003`

#### Generate SPICE Model
```http
POST /api/spice/generate
Content-Type: application/json

Body:
{
  "device_type": "GaN-HEMT",
  "parameters": {
    "Vds_max": 650,
    "Id_max": 10,
    "Rds_on": 0.1
  },
  "template": "standard"
}
```

**Response:**
```json
{
  "success": true,
  "model": ".MODEL Device1 NMOS\n+ LEVEL=1\n+ VTO=2.5\n+ KP=0.1\n+ LAMBDA=0.01",
  "parameters_used": {...},
  "validation": "passed"
}
```

#### List Available Models
```http
GET /api/spice/models
```

**Response:**
```json
{
  "models": [
    {
      "id": "gan-hemt-standard",
      "name": "GaN HEMT Standard",
      "device_type": "GaN-HEMT",
      "description": "Standard GaN HEMT model"
    }
  ]
}
```

### Data Management Service
Base URL: `http://localhost:8004`

#### List Products
```http
GET /api/data/products
Query Parameters:
- page: Page number (optional)
- limit: Items per page (optional)
- search: Search term (optional)
- manufacturer: Filter by manufacturer (optional)
```

**Response:**
```json
{
  "products": [
    {
      "id": "1",
      "name": "EPC2010C",
      "part_number": "EPC2010C",
      "manufacturer": "EPC",
      "device_type": "GaN-HEMT",
      "parameters": {...}
    }
  ],
  "total": 150,
  "page": 1,
  "pages": 15
}
```

#### Create Product
```http
POST /api/data/products
Content-Type: application/json

Body:
{
  "name": "New Device",
  "part_number": "DEV001",
  "manufacturer": "Manufacturer",
  "device_type": "Si-MOSFET",
  "parameters": {...}
}
```

**Response:**
```json
{
  "success": true,
  "product": {
    "id": "123",
    "name": "New Device",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Update Product
```http
PUT /api/data/products/{id}
Content-Type: application/json

Body:
{
  "name": "Updated Device",
  "parameters": {...}
}
```

#### Delete Product
```http
DELETE /api/data/products/{id}
```

## Authentication Service
Base URL: `http://localhost:8005`

#### Login
```http
POST /api/auth/login
Content-Type: application/json

Body:
{
  "username": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "1",
    "username": "user@example.com",
    "role": "user"
  }
}
```

#### Register
```http
POST /api/auth/register
Content-Type: application/json

Body:
{
  "username": "newuser@example.com",
  "password": "password",
  "confirm_password": "password"
}
```

## Monitoring Service
Base URL: `http://localhost:8006`

#### Health Check
```http
GET /api/monitoring/health
```

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "pdf-service": "running",
    "curve-extraction": "running",
    "spice-generation": "running"
  },
  "uptime": 3600,
  "version": "1.0.0"
}
```

#### System Metrics
```http
GET /api/monitoring/metrics
```

**Response:**
```json
{
  "cpu_usage": 45.2,
  "memory_usage": 67.8,
  "disk_usage": 23.1,
  "active_connections": 5
}
```

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "file",
      "issue": "File is required"
    }
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Invalid input parameters
- `FILE_TOO_LARGE`: File exceeds size limit
- `UNSUPPORTED_FORMAT`: File format not supported
- `PROCESSING_ERROR`: Error during processing
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `INTERNAL_ERROR`: Server error

## Rate Limiting

All endpoints are rate-limited:
- **Default**: 100 requests per minute
- **File uploads**: 10 requests per minute
- **Authentication**: 5 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Authentication

Most endpoints require authentication:
```http
Authorization: Bearer <jwt_token>
```

Public endpoints:
- Health check
- System metrics
- Documentation

## File Upload Limits

- **PDF files**: 50MB maximum
- **Image files**: 20MB maximum
- **Supported formats**: PDF, PNG, JPG, JPEG, TIFF 