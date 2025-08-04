from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import uvicorn
import os
import json
import asyncio
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field
import logging
from dataclasses import dataclass
import aiohttp
import sqlite3
from collections import defaultdict
import random
import statistics
import threading

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="ESpice Load Balancer Service",
    description="Load balancing, traffic distribution, and high availability for microservices",
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

# Configuration
DATABASE_PATH = os.getenv("DATABASE_PATH", "/app/load_balancer_data/load_balancer.db")
HEALTH_CHECK_INTERVAL = int(os.getenv("HEALTH_CHECK_INTERVAL", "30"))  # seconds
HEALTH_CHECK_TIMEOUT = int(os.getenv("HEALTH_CHECK_TIMEOUT", "5"))  # seconds
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
SESSION_STICKINESS = os.getenv("SESSION_STICKINESS", "true").lower() == "true"
STICKY_SESSION_TIMEOUT = int(os.getenv("STICKY_SESSION_TIMEOUT", "3600"))  # 1 hour

# Pydantic models
class BackendServer(BaseModel):
    id: str
    name: str
    url: str
    port: int
    weight: int = Field(default=1, description="Load balancing weight")
    max_connections: int = Field(default=100, description="Maximum concurrent connections")
    health_check_path: str = Field(default="/health", description="Health check endpoint")
    enabled: bool = True
    tags: List[str] = Field(default_factory=list)

class LoadBalancerConfig(BaseModel):
    name: str
    description: str
    algorithm: str = Field(description="Algorithm: round_robin, least_connections, weighted, ip_hash")
    backends: List[str] = Field(description="List of backend server IDs")
    health_check_enabled: bool = True
    health_check_interval: int = 30
    health_check_timeout: int = 5
    max_retries: int = 3
    session_stickiness: bool = True
    sticky_session_timeout: int = 3600
    enabled: bool = True

class ServerHealth(BaseModel):
    server_id: str
    status: str
    response_time: float
    last_check: str
    consecutive_failures: int
    total_requests: int
    active_connections: int

class LoadBalancerStats(BaseModel):
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_response_time: float
    active_connections: int
    backend_servers: int
    healthy_servers: int

@dataclass
class BackendInstance:
    id: str
    name: str
    url: str
    port: int
    weight: int
    max_connections: int
    health_check_path: str
    enabled: bool
    tags: List[str]
    health_status: str = "unknown"
    response_time: float = 0.0
    last_check: datetime = None
    consecutive_failures: int = 0
    total_requests: int = 0
    active_connections: int = 0
    current_weight: int = 0

class LoadBalancerService:
    def __init__(self):
        self.db_path = DATABASE_PATH
        self._ensure_directories()
        self._init_database()
        self.backend_servers = {}
        self.load_balancer_configs = {}
        self.session_mapping = {}
        self.connection_counts = defaultdict(int)
        self.request_stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "response_times": []
        }
        self._load_configurations()
        self._start_health_checker()
    
    def _ensure_directories(self):
        """Ensure required directories exist"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
    
    def _init_database(self):
        """Initialize load balancer database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create backend servers table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS backend_servers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                port INTEGER NOT NULL,
                weight INTEGER DEFAULT 1,
                max_connections INTEGER DEFAULT 100,
                health_check_path TEXT DEFAULT '/health',
                enabled BOOLEAN DEFAULT 1,
                tags TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create load balancer configurations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS load_balancer_configs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                algorithm TEXT NOT NULL,
                backends TEXT NOT NULL,
                health_check_enabled BOOLEAN DEFAULT 1,
                health_check_interval INTEGER DEFAULT 30,
                health_check_timeout INTEGER DEFAULT 5,
                max_retries INTEGER DEFAULT 3,
                session_stickiness BOOLEAN DEFAULT 1,
                sticky_session_timeout INTEGER DEFAULT 3600,
                enabled BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create request logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS request_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                client_ip TEXT,
                backend_server TEXT,
                request_path TEXT,
                response_time REAL,
                status_code INTEGER,
                success BOOLEAN,
                session_id TEXT
            )
        """)
        
        # Create session mapping table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS session_mapping (
                session_id TEXT PRIMARY KEY,
                backend_server TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_used DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
    
    def _load_configurations(self):
        """Load backend servers and load balancer configurations"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Load backend servers
        cursor.execute("""
            SELECT id, name, url, port, weight, max_connections, health_check_path, enabled, tags
            FROM backend_servers
        """)
        
        servers = cursor.fetchall()
        for server in servers:
            self.backend_servers[server[0]] = BackendInstance(
                id=server[0],
                name=server[1],
                url=server[2],
                port=server[3],
                weight=server[4],
                max_connections=server[5],
                health_check_path=server[6],
                enabled=bool(server[7]),
                tags=json.loads(server[8]) if server[8] else []
            )
        
        # Load load balancer configurations
        cursor.execute("""
            SELECT id, name, description, algorithm, backends, health_check_enabled,
                   health_check_interval, health_check_timeout, max_retries,
                   session_stickiness, sticky_session_timeout, enabled
            FROM load_balancer_configs
        """)
        
        configs = cursor.fetchall()
        for config in configs:
            self.load_balancer_configs[config[0]] = {
                "id": config[0],
                "name": config[1],
                "description": config[2],
                "algorithm": config[3],
                "backends": json.loads(config[4]),
                "health_check_enabled": bool(config[5]),
                "health_check_interval": config[6],
                "health_check_timeout": config[7],
                "max_retries": config[8],
                "session_stickiness": bool(config[9]),
                "sticky_session_timeout": config[10],
                "enabled": bool(config[11])
            }
        
        conn.close()
    
    def _start_health_checker(self):
        """Start background health checker"""
        def health_checker():
            while True:
                try:
                    asyncio.run(self._check_all_backends())
                except Exception as e:
                    logger.error(f"Health checker error: {e}")
                time.sleep(HEALTH_CHECK_INTERVAL)
        
        health_thread = threading.Thread(target=health_checker, daemon=True)
        health_thread.start()
    
    async def _check_all_backends(self):
        """Check health of all backend servers"""
        for server_id, server in self.backend_servers.items():
            if server.enabled:
                await self._check_backend_health(server)
    
    async def _check_backend_health(self, server: BackendInstance):
        """Check health of a specific backend server"""
        start_time = time.time()
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=HEALTH_CHECK_TIMEOUT)) as session:
                health_url = f"{server.url}:{server.port}{server.health_check_path}"
                async with session.get(health_url) as response:
                    response_time = time.time() - start_time
                    
                    if response.status == 200:
                        server.health_status = "healthy"
                        server.consecutive_failures = 0
                    else:
                        server.health_status = "unhealthy"
                        server.consecutive_failures += 1
                    
                    server.response_time = response_time
                    server.last_check = datetime.now()
                    
        except Exception as e:
            response_time = time.time() - start_time
            server.health_status = "unhealthy"
            server.consecutive_failures += 1
            server.response_time = response_time
            server.last_check = datetime.now()
            logger.warning(f"Health check failed for {server.name}: {e}")
    
    def _get_session_backend(self, session_id: str, config: Dict[str, Any]) -> Optional[str]:
        """Get backend server for session (sticky sessions)"""
        if not config["session_stickiness"]:
            return None
        
        # Check if session is mapped
        if session_id in self.session_mapping:
            backend_id = self.session_mapping[session_id]["backend_server"]
            # Check if backend is still healthy
            if backend_id in self.backend_servers:
                server = self.backend_servers[backend_id]
                if server.enabled and server.health_status == "healthy":
                    return backend_id
        
        return None
    
    def _select_backend(self, config: Dict[str, Any], session_id: str = None) -> Optional[BackendInstance]:
        """Select backend server based on algorithm"""
        # Get available backends
        available_backends = []
        for backend_id in config["backends"]:
            if backend_id in self.backend_servers:
                server = self.backend_servers[backend_id]
                if server.enabled and server.health_status == "healthy":
                    available_backends.append(server)
        
        if not available_backends:
            return None
        
        # Check session stickiness first
        if session_id:
            sticky_backend_id = self._get_session_backend(session_id, config)
            if sticky_backend_id:
                for server in available_backends:
                    if server.id == sticky_backend_id:
                        return server
        
        # Apply load balancing algorithm
        algorithm = config["algorithm"]
        
        if algorithm == "round_robin":
            return self._round_robin_select(available_backends)
        elif algorithm == "least_connections":
            return self._least_connections_select(available_backends)
        elif algorithm == "weighted":
            return self._weighted_select(available_backends)
        elif algorithm == "ip_hash":
            return self._ip_hash_select(available_backends, session_id)
        else:
            # Default to round robin
            return self._round_robin_select(available_backends)
    
    def _round_robin_select(self, backends: List[BackendInstance]) -> BackendInstance:
        """Round robin selection"""
        # Simple round robin - could be improved with atomic counters
        return random.choice(backends)
    
    def _least_connections_select(self, backends: List[BackendInstance]) -> BackendInstance:
        """Least connections selection"""
        return min(backends, key=lambda x: x.active_connections)
    
    def _weighted_select(self, backends: List[BackendInstance]) -> BackendInstance:
        """Weighted selection"""
        total_weight = sum(server.weight for server in backends)
        if total_weight == 0:
            return random.choice(backends)
        
        # Weighted random selection
        rand = random.uniform(0, total_weight)
        current_weight = 0
        
        for server in backends:
            current_weight += server.weight
            if rand <= current_weight:
                return server
        
        return backends[-1]
    
    def _ip_hash_select(self, backends: List[BackendInstance], session_id: str) -> BackendInstance:
        """IP hash selection"""
        if not session_id:
            return random.choice(backends)
        
        # Hash the session ID to select backend
        hash_value = hash(session_id)
        index = hash_value % len(backends)
        return backends[index]
    
    async def route_request(self, request: Request, config_id: str) -> Dict[str, Any]:
        """Route request to appropriate backend"""
        if config_id not in self.load_balancer_configs:
            raise ValueError(f"Load balancer configuration {config_id} not found")
        
        config = self.load_balancer_configs[config_id]
        if not config["enabled"]:
            raise ValueError(f"Load balancer configuration {config_id} is disabled")
        
        # Get session ID for sticky sessions
        session_id = None
        if config["session_stickiness"]:
            session_id = request.headers.get("X-Session-ID") or request.cookies.get("session_id")
        
        # Select backend
        backend = self._select_backend(config, session_id)
        if not backend:
            raise HTTPException(status_code=503, detail="No healthy backend servers available")
        
        # Check connection limit
        if backend.active_connections >= backend.max_connections:
            raise HTTPException(status_code=503, detail="Backend server at capacity")
        
        # Update connection count
        backend.active_connections += 1
        backend.total_requests += 1
        
        # Map session to backend if using sticky sessions
        if session_id and config["session_stickiness"]:
            self.session_mapping[session_id] = {
                "backend_server": backend.id,
                "created_at": datetime.now().isoformat(),
                "last_used": datetime.now().isoformat()
            }
        
        try:
            # Forward request to backend
            result = await self._forward_request(request, backend)
            
            # Update stats
            self.request_stats["total_requests"] += 1
            self.request_stats["successful_requests"] += 1
            self.request_stats["response_times"].append(result["response_time"])
            
            # Keep only last 1000 response times for stats
            if len(self.request_stats["response_times"]) > 1000:
                self.request_stats["response_times"] = self.request_stats["response_times"][-1000:]
            
            return result
            
        except Exception as e:
            # Update stats
            self.request_stats["total_requests"] += 1
            self.request_stats["failed_requests"] += 1
            
            raise
        finally:
            # Decrease connection count
            backend.active_connections -= 1
    
    async def _forward_request(self, request: Request, backend: BackendInstance) -> Dict[str, Any]:
        """Forward request to backend server"""
        start_time = time.time()
        
        # Build target URL
        target_url = f"{backend.url}:{backend.port}{request.url.path}"
        if request.url.query:
            target_url += f"?{request.url.query}"
        
        # Get request body
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()
        
        # Get headers
        headers = dict(request.headers)
        headers.pop("host", None)  # Remove host header
        
        # Forward request
        async with aiohttp.ClientSession() as session:
            if request.method == "GET":
                async with session.get(target_url, headers=headers) as response:
                    response_data = await response.read()
                    response_time = time.time() - start_time
                    
                    return {
                        "status_code": response.status,
                        "headers": dict(response.headers),
                        "body": response_data,
                        "response_time": response_time,
                        "backend_server": backend.id
                    }
            
            elif request.method == "POST":
                async with session.post(target_url, data=body, headers=headers) as response:
                    response_data = await response.read()
                    response_time = time.time() - start_time
                    
                    return {
                        "status_code": response.status,
                        "headers": dict(response.headers),
                        "body": response_data,
                        "response_time": response_time,
                        "backend_server": backend.id
                    }
            
            elif request.method == "PUT":
                async with session.put(target_url, data=body, headers=headers) as response:
                    response_data = await response.read()
                    response_time = time.time() - start_time
                    
                    return {
                        "status_code": response.status,
                        "headers": dict(response.headers),
                        "body": response_data,
                        "response_time": response_time,
                        "backend_server": backend.id
                    }
            
            elif request.method == "DELETE":
                async with session.delete(target_url, headers=headers) as response:
                    response_data = await response.read()
                    response_time = time.time() - start_time
                    
                    return {
                        "status_code": response.status,
                        "headers": dict(response.headers),
                        "body": response_data,
                        "response_time": response_time,
                        "backend_server": backend.id
                    }
            
            else:
                raise HTTPException(status_code=405, detail=f"Method {request.method} not supported")
    
    async def get_backend_health(self, server_id: str) -> Optional[ServerHealth]:
        """Get health status of backend server"""
        if server_id not in self.backend_servers:
            return None
        
        server = self.backend_servers[server_id]
        return ServerHealth(
            server_id=server.id,
            status=server.health_status,
            response_time=server.response_time,
            last_check=server.last_check.isoformat() if server.last_check else None,
            consecutive_failures=server.consecutive_failures,
            total_requests=server.total_requests,
            active_connections=server.active_connections
        )
    
    async def get_load_balancer_stats(self) -> LoadBalancerStats:
        """Get load balancer statistics"""
        healthy_servers = sum(1 for server in self.backend_servers.values() 
                            if server.health_status == "healthy")
        
        avg_response_time = 0.0
        if self.request_stats["response_times"]:
            avg_response_time = statistics.mean(self.request_stats["response_times"])
        
        total_active_connections = sum(server.active_connections 
                                     for server in self.backend_servers.values())
        
        return LoadBalancerStats(
            total_requests=self.request_stats["total_requests"],
            successful_requests=self.request_stats["successful_requests"],
            failed_requests=self.request_stats["failed_requests"],
            average_response_time=avg_response_time,
            active_connections=total_active_connections,
            backend_servers=len(self.backend_servers),
            healthy_servers=healthy_servers
        )

# Initialize service
load_balancer_service = LoadBalancerService()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    stats = await load_balancer_service.get_load_balancer_stats()
    
    return {
        "status": "healthy",
        "service": "load-balancer",
        "backend_servers": stats.backend_servers,
        "healthy_servers": stats.healthy_servers,
        "active_connections": stats.active_connections,
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.api_route("/api/load-balancer/{config_id}/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def route_load_balanced_request(request: Request, config_id: str, path: str):
    """Route request through load balancer"""
    try:
        result = await load_balancer_service.route_request(request, config_id)
        
        # Create response
        response = Response(
            content=result["body"],
            status_code=result["status_code"],
            headers=result["headers"]
        )
        
        # Add load balancer headers
        response.headers["X-Backend-Server"] = result["backend_server"]
        response.headers["X-Response-Time"] = str(result["response_time"])
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Load balancer error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/load-balancer/backends")
async def get_backend_servers():
    """Get all backend servers"""
    backends = []
    for server in load_balancer_service.backend_servers.values():
        backends.append({
            "id": server.id,
            "name": server.name,
            "url": server.url,
            "port": server.port,
            "weight": server.weight,
            "max_connections": server.max_connections,
            "health_check_path": server.health_check_path,
            "enabled": server.enabled,
            "tags": server.tags
        })
    
    return {"backends": backends}

@app.get("/api/load-balancer/backends/{server_id}/health")
async def get_backend_health(server_id: str):
    """Get health status of specific backend server"""
    health = await load_balancer_service.get_backend_health(server_id)
    if health:
        return health.dict()
    else:
        raise HTTPException(status_code=404, detail="Backend server not found")

@app.get("/api/load-balancer/stats")
async def get_load_balancer_stats():
    """Get load balancer statistics"""
    stats = await load_balancer_service.get_load_balancer_stats()
    return stats.dict()

@app.get("/api/load-balancer/configs")
async def get_load_balancer_configs():
    """Get all load balancer configurations"""
    configs = []
    for config in load_balancer_service.load_balancer_configs.values():
        configs.append(config)
    
    return {"configs": configs}

@app.post("/api/load-balancer/backends")
async def add_backend_server(backend: BackendServer):
    """Add new backend server"""
    try:
        conn = sqlite3.connect(load_balancer_service.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO backend_servers 
            (id, name, url, port, weight, max_connections, health_check_path, enabled, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (backend.id, backend.name, backend.url, backend.port, backend.weight,
              backend.max_connections, backend.health_check_path, backend.enabled,
              json.dumps(backend.tags)))
        
        conn.commit()
        conn.close()
        
        # Add to in-memory cache
        load_balancer_service.backend_servers[backend.id] = BackendInstance(
            id=backend.id,
            name=backend.name,
            url=backend.url,
            port=backend.port,
            weight=backend.weight,
            max_connections=backend.max_connections,
            health_check_path=backend.health_check_path,
            enabled=backend.enabled,
            tags=backend.tags
        )
        
        return {
            "success": True,
            "backend_id": backend.id,
            "message": "Backend server added successfully"
        }
    except Exception as e:
        logger.error(f"Error adding backend server: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/load-balancer/configs")
async def add_load_balancer_config(config: LoadBalancerConfig):
    """Add new load balancer configuration"""
    try:
        config_id = f"lb_{int(time.time())}"
        
        conn = sqlite3.connect(load_balancer_service.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO load_balancer_configs 
            (id, name, description, algorithm, backends, health_check_enabled,
             health_check_interval, health_check_timeout, max_retries,
             session_stickiness, sticky_session_timeout, enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (config_id, config.name, config.description, config.algorithm,
              json.dumps(config.backends), config.health_check_enabled,
              config.health_check_interval, config.health_check_timeout,
              config.max_retries, config.session_stickiness,
              config.sticky_session_timeout, config.enabled))
        
        conn.commit()
        conn.close()
        
        # Add to in-memory cache
        load_balancer_service.load_balancer_configs[config_id] = {
            "id": config_id,
            "name": config.name,
            "description": config.description,
            "algorithm": config.algorithm,
            "backends": config.backends,
            "health_check_enabled": config.health_check_enabled,
            "health_check_interval": config.health_check_interval,
            "health_check_timeout": config.health_check_timeout,
            "max_retries": config.max_retries,
            "session_stickiness": config.session_stickiness,
            "sticky_session_timeout": config.sticky_session_timeout,
            "enabled": config.enabled
        }
        
        return {
            "success": True,
            "config_id": config_id,
            "message": "Load balancer configuration added successfully"
        }
    except Exception as e:
        logger.error(f"Error adding load balancer config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8019) 