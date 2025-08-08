from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from datetime import datetime
import json
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
import httpx
import asyncio

# Create FastAPI app
app = FastAPI(
    title="ESpice API Gateway",
    description="API Gateway for microservices orchestration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service configuration
SERVICES = {
    "pdf": {
        "url": os.getenv("PDF_SERVICE_URL", "http://localhost:8002"),
        "health_endpoint": "/health",
        "routes": ["/api/pdf/*"]
    },
    "image": {
        "url": os.getenv("IMAGE_SERVICE_URL", "http://localhost:8003"),
        "health_endpoint": "/health",
        "routes": ["/api/image/*"]
    },
    "table": {
        "url": os.getenv("TABLE_SERVICE_URL", "http://localhost:8004"),
        "health_endpoint": "/health",
        "routes": ["/api/table/*"]
    },
    "spice": {
        "url": os.getenv("SPICE_SERVICE_URL", "http://localhost:8005"),
        "health_endpoint": "/health",
        "routes": ["/api/spice/*"]
    },
    "pdk-checker": {
        "url": os.getenv("PDK_CHECKER_SERVICE_URL", "http://localhost:8010"),
        "health_endpoint": "/health",
        "routes": ["/api/pdk/*"]
    },
    "web-scraper": {
        "url": os.getenv("WEB_SCRAPER_SERVICE_URL", "http://localhost:8011"),
        "health_endpoint": "/health",
        "routes": ["/api/scraper/*"]
    },
    "customization-manager": {
        "url": os.getenv("CUSTOMIZATION_MANAGER_SERVICE_URL", "http://localhost:8012"),
        "health_endpoint": "/health",
        "routes": ["/api/customization/*"]
    },
    "auth-service": {
        "url": os.getenv("AUTH_SERVICE_URL", "http://localhost:8013"),
        "health_endpoint": "/health",
        "routes": ["/api/auth/*"]
    },
    "notification-service": {
        "url": os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8014"),
        "health_endpoint": "/health",
        "routes": ["/api/notify/*", "/api/notifications/*", "/api/preferences/*", "/api/ws/*"]
    },
    "monitoring-service": {
        "url": os.getenv("MONITORING_SERVICE_URL", "http://localhost:8015"),
        "health_endpoint": "/health",
        "routes": ["/api/monitoring/*", "/api/metrics/*", "/api/alerts/*", "/api/traces/*", "/api/logs/*"]
    },
    "data-analytics": {
        "url": os.getenv("DATA_ANALYTICS_SERVICE_URL", "http://localhost:8016"),
        "health_endpoint": "/health",
        "routes": ["/api/analytics/*", "/api/reports/*", "/api/dashboards/*", "/api/visualizations/*"]
    },
    "rate-limiter": {
        "url": os.getenv("RATE_LIMITER_SERVICE_URL", "http://localhost:8017"),
        "health_endpoint": "/health",
        "routes": ["/api/rate-limiter/*", "/api/throttle/*", "/api/quotas/*"]
    },
    "backup-recovery": {
        "url": os.getenv("BACKUP_RECOVERY_SERVICE_URL", "http://localhost:8018"),
        "health_endpoint": "/health",
        "routes": ["/api/backup/*", "/api/recovery/*", "/api/restore/*"]
    },
    "load-balancer": {
        "url": os.getenv("LOAD_BALANCER_SERVICE_URL", "http://localhost:8019"),
        "health_endpoint": "/health",
        "routes": ["/api/load-balancer/*", "/api/backends/*", "/api/lb/*"]
    }
}

# Pydantic models
class ServiceHealth(BaseModel):
    service: str
    status: str
    url: str
    response_time: float
    last_check: str

class GatewayResponse(BaseModel):
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None
    metadata: Dict[str, Any]

def create_metadata(processing_time: float, service: str = "api-gateway") -> Dict[str, Any]:
    """Create standardized metadata for service responses"""
    return {
        "processingTime": processing_time,
        "service": service,
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

async def check_service_health(service_name: str, service_config: Dict[str, Any]) -> ServiceHealth:
    """Check health of a specific service"""
    start_time = datetime.now()
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{service_config['url']}{service_config['health_endpoint']}")
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ServiceHealth(
                service=service_name,
                status="healthy" if response.status_code == 200 else "unhealthy",
                url=service_config['url'],
                response_time=processing_time,
                last_check=datetime.utcnow().isoformat()
            )
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        return ServiceHealth(
            service=service_name,
            status="unhealthy",
            url=service_config['url'],
            response_time=processing_time,
            last_check=datetime.utcnow().isoformat()
        )

async def route_request(request: Request, service_name: str, service_config: Dict[str, Any]) -> Dict[str, Any]:
    """Route request to appropriate service"""
    start_time = datetime.now()
    
    try:
        # Get request path and method
        path = request.url.path
        method = request.method
        
        # Remove /api prefix for routing
        if path.startswith("/api/"):
            service_path = path[4:]  # Remove "/api"
        else:
            service_path = path
        
        # Build target URL
        target_url = f"{service_config['url']}{service_path}"
        
        # Get request body if present
        body = None
        if method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
            except:
                pass
        
        # Get query parameters
        query_params = dict(request.query_params)
        
        # Get headers
        headers = dict(request.headers)
        # Remove host header to avoid conflicts
        headers.pop("host", None)
        
        # Make request to service
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method == "GET":
                response = await client.get(target_url, params=query_params, headers=headers)
            elif method == "POST":
                response = await client.post(target_url, content=body, params=query_params, headers=headers)
            elif method == "PUT":
                response = await client.put(target_url, content=body, params=query_params, headers=headers)
            elif method == "DELETE":
                response = await client.delete(target_url, params=query_params, headers=headers)
            else:
                raise HTTPException(status_code=405, detail=f"Method {method} not supported")
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Parse response
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}
            
            return {
                "status_code": response.status_code,
                "data": response_data,
                "processing_time": processing_time,
                "service": service_name
            }
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        raise HTTPException(status_code=500, detail=f"Error routing request: {str(e)}")

def get_service_for_path(path: str) -> Optional[str]:
    """Determine which service should handle the request based on path"""
    for service_name, service_config in SERVICES.items():
        for route_pattern in service_config["routes"]:
            if route_pattern.endswith("*"):
                pattern_prefix = route_pattern[:-1]
                if path.startswith(pattern_prefix):
                    return service_name
            elif path == route_pattern:
                return service_name
    return None

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ESpice API Gateway",
        "version": "1.0.0",
        "services": list(SERVICES.keys())
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "api-gateway",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/gateway/services")
async def get_services():
    """Get all available services"""
    start_time = datetime.now()
    
    try:
        service_list = []
        for service_name, service_config in SERVICES.items():
            service_list.append({
                "name": service_name,
                "url": service_config["url"],
                "routes": service_config["routes"]
            })
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return GatewayResponse(
            success=True,
            data={"services": service_list},
            metadata=create_metadata(processing_time)
        )
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        return GatewayResponse(
            success=False,
            error=str(e),
            metadata=create_metadata(processing_time)
        )

@app.get("/api/gateway/health")
async def get_all_services_health():
    """Get health status of all services"""
    start_time = datetime.now()
    
    try:
        # Check health of all services concurrently
        health_tasks = []
        for service_name, service_config in SERVICES.items():
            task = check_service_health(service_name, service_config)
            health_tasks.append(task)
        
        health_results = await asyncio.gather(*health_tasks)
        
        # Calculate overall health
        healthy_services = [h for h in health_results if h.status == "healthy"]
        overall_status = "healthy" if len(healthy_services) == len(SERVICES) else "degraded"
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return GatewayResponse(
            success=True,
            data={
                "overall_status": overall_status,
                "services": [h.dict() for h in health_results],
                "healthy_count": len(healthy_services),
                "total_count": len(SERVICES)
            },
            metadata=create_metadata(processing_time)
        )
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        return GatewayResponse(
            success=False,
            error=str(e),
            metadata=create_metadata(processing_time)
        )

# Dynamic routing for all API endpoints
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def route_api_request(request: Request, path: str):
    """Route API requests to appropriate services"""
    start_time = datetime.now()
    
    try:
        # Reconstruct full path
        full_path = f"/api/{path}"
        
        # Determine target service
        service_name = get_service_for_path(full_path)
        if not service_name:
            raise HTTPException(status_code=404, detail=f"No service found for path: {full_path}")
        
        service_config = SERVICES[service_name]
        
        # Route request to service
        result = await route_request(request, service_name, service_config)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Return response with gateway metadata
        return GatewayResponse(
            success=result["status_code"] < 400,
            data=result["data"],
            error=None if result["status_code"] < 400 else str(result["data"]),
            metadata=create_metadata(processing_time)
        )
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        return GatewayResponse(
            success=False,
            error=str(e),
            metadata=create_metadata(processing_time)
        )

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content=GatewayResponse(
            success=False,
            error="Service not found",
            metadata=create_metadata(0.0)
        ).dict()
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=500,
        content=GatewayResponse(
            success=False,
            error="Internal server error",
            metadata=create_metadata(0.0)
        ).dict()
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 