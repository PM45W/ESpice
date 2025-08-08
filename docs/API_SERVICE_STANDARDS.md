# API Service Standards and Implementation Guidelines

## Overview

This document defines the standardized patterns that all API services in the ESpice project must follow for consistency, maintainability, and reliability.

## Service Implementation Patterns

### 1. Frontend Services (TypeScript)

All frontend services must follow the standardized pattern defined in `apps/desktop/src/services/serviceTemplate.ts`.

#### Standard Pattern:

```typescript
import { BaseService, ServiceConfig } from './serviceTemplate';

export class ExampleService extends BaseService {
  private constructor(config: ServiceConfig) {
    super(config);
  }

  static getInstance(): ExampleService {
    if (!ExampleService.instance) {
      ExampleService.instance = new ExampleService({
        baseUrl: 'http://localhost:8000',
        timeout: 10000,
        retryAttempts: 3,
        healthCheckEndpoint: '/health'
      });
    }
    return ExampleService.instance;
  }

  // Service-specific methods
  async exampleMethod(): Promise<any> {
    return this.makeRequest('/api/example');
  }
}

// Export singleton instance
export const exampleService = ExampleService.getInstance();
```

#### Required Features:

1. **Singleton Pattern**: Use `getInstance()` method for consistent instantiation
2. **Service Availability Check**: Automatic checking before making requests
3. **Health Monitoring**: Built-in health check functionality
4. **Statistics Tracking**: Automatic request/response statistics
5. **Error Handling**: Standardized error handling and reporting
6. **Configuration Management**: Centralized configuration

### 2. Backend Services (Python/FastAPI)

All backend services must follow the standardized FastAPI pattern.

#### Standard Pattern:

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Service Name", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint (required)
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Service Name",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

# Service-specific endpoints
@app.post("/api/example")
async def example_endpoint():
    # Implementation
    pass

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

#### Required Features:

1. **Health Check Endpoint**: `/health` endpoint for service monitoring
2. **CORS Support**: Proper CORS configuration for frontend integration
3. **Error Handling**: Standardized HTTP error responses
4. **API Documentation**: Automatic OpenAPI documentation
5. **Logging**: Proper logging configuration
6. **Configuration**: Environment-based configuration

## Service Activation Patterns

### 1. Frontend Service Activation

All frontend services must check service availability before making requests:

```typescript
async someMethod(): Promise<any> {
  // Service availability is automatically checked by makeRequest()
  return this.makeRequest('/api/endpoint');
}
```

### 2. Backend Service Activation

All backend services must use the standardized startup script template:

```powershell
# Use the template with parameters
.\scripts\templates\start-service-template.ps1 -ServiceName "ExampleService" -Port 8000
```

Or create a dedicated startup script:

```powershell
# Example: scripts/start-example-service.ps1
& "$PSScriptRoot\templates\start-service-template.ps1" -ServiceName "ExampleService" -Port 8000 -MainFile "main.py" -HealthEndpoint "/health"
```

## Service Configuration Standards

### 1. Port Assignments

Standard port assignments for services:

- **8000**: API Gateway / MCP Server
- **8001**: MCP Server (alternative)
- **8002**: Curve Extraction Service
- **8003**: Image Service
- **8004**: Table Service
- **8005**: SPICE Service
- **8008**: Graph Queue Service
- **8011**: Web Scraper Service

### 2. Health Check Standards

All services must implement health check endpoints:

```typescript
// Frontend health check
async checkHealth(): Promise<ServiceHealth> {
  return this.makeRequest('/health');
}
```

```python
# Backend health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Service Name",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "dependencies": {
            "database": "connected",
            "external_api": "available"
        }
    }
```

### 3. Error Handling Standards

Standard error response format:

```typescript
// Frontend error handling
try {
  return await this.makeRequest('/api/endpoint');
} catch (error) {
  // Error is automatically handled and formatted
  throw new Error(`Service request failed: ${error.message}`);
}
```

```python
# Backend error handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    )
```

## Service Integration Standards

### 1. Service Discovery

All services must be discoverable through health checks:

```typescript
// Check if service is available
const isAvailable = await service.isServiceAvailable();
if (!isAvailable) {
  throw new Error('Service is not available. Please start the service first.');
}
```

### 2. Service Communication

Standard communication patterns:

```typescript
// Make service request
const result = await service.makeRequest('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

### 3. Service Monitoring

All services provide statistics:

```typescript
// Get service statistics
const stats = service.getStatistics();
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Success rate: ${(stats.successfulRequests / stats.totalRequests) * 100}%`);
```

## Migration Guide

### Converting Existing Services

#### 1. Frontend Services

**Before (Inconsistent Pattern):**
```typescript
class OldService {
  private baseUrl = 'http://localhost:8000';
  
  async makeRequest(endpoint: string) {
    // Custom implementation
  }
}

export const oldService = new OldService();
```

**After (Standardized Pattern):**
```typescript
import { BaseService, ServiceConfig } from './serviceTemplate';

export class NewService extends BaseService {
  private constructor(config: ServiceConfig) {
    super(config);
  }

  static getInstance(): NewService {
    if (!NewService.instance) {
      NewService.instance = new NewService({
        baseUrl: 'http://localhost:8000',
        timeout: 10000,
        retryAttempts: 3,
        healthCheckEndpoint: '/health'
      });
    }
    return NewService.instance;
  }

  async makeRequest(endpoint: string) {
    return this.makeRequest(endpoint);
  }
}

export const newService = NewService.getInstance();
```

#### 2. Backend Services

**Before (Inconsistent Pattern):**
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**After (Standardized Pattern):**
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import uvicorn

app = FastAPI(title="Service Name", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Service Name",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
async def root():
    return {"message": "Hello World"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## Testing Standards

### 1. Service Health Testing

```typescript
// Test service health
const health = await service.checkHealth();
expect(health.healthy).toBe(true);
expect(health.responseTime).toBeLessThan(1000);
```

### 2. Service Connection Testing

```typescript
// Test service connection
const connection = await service.testServiceConnection();
expect(connection.success).toBe(true);
```

### 3. Service Statistics Testing

```typescript
// Test service statistics
const stats = service.getStatistics();
expect(stats.totalRequests).toBeGreaterThan(0);
expect(stats.successfulRequests).toBeGreaterThan(0);
```

## Compliance Checklist

### Frontend Services

- [ ] Extends `BaseService` class
- [ ] Implements singleton pattern with `getInstance()`
- [ ] Uses `makeRequest()` for all API calls
- [ ] Implements service availability checking
- [ ] Provides health check functionality
- [ ] Tracks service statistics
- [ ] Uses standardized error handling
- [ ] Exports singleton instance

### Backend Services

- [ ] Implements `/health` endpoint
- [ ] Uses CORS middleware
- [ ] Provides proper error handling
- [ ] Uses standardized startup script
- [ ] Implements logging
- [ ] Uses environment-based configuration
- [ ] Provides API documentation
- [ ] Follows FastAPI best practices

### Service Integration

- [ ] Service availability checking
- [ ] Health monitoring
- [ ] Statistics tracking
- [ ] Error handling
- [ ] Configuration management
- [ ] Service discovery
- [ ] Service communication
- [ ] Service monitoring

## Benefits of Standardization

1. **Consistency**: All services follow the same patterns
2. **Maintainability**: Easier to maintain and update
3. **Reliability**: Built-in error handling and monitoring
4. **Observability**: Automatic statistics and health monitoring
5. **Developer Experience**: Consistent API across all services
6. **Testing**: Standardized testing patterns
7. **Documentation**: Automatic API documentation
8. **Integration**: Seamless service integration

## Conclusion

Following these standards ensures that all services in the ESpice project are consistent, reliable, and maintainable. All new services must follow these patterns, and existing services should be migrated to comply with these standards.
