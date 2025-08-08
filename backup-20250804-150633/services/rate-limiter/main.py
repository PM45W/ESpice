from fastapi import FastAPI, HTTPException, Request, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import json
import asyncio
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field
import redis.asyncio as redis
import logging
from dataclasses import dataclass
import aiohttp
from collections import defaultdict
import sqlite3

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="ESpice API Rate Limiting & Throttling Service",
    description="Rate limiting, throttling, and API usage management for microservices",
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
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
DATABASE_PATH = os.getenv("DATABASE_PATH", "/app/rate_limiter_data/rate_limiter.db")
DEFAULT_RATE_LIMIT = int(os.getenv("DEFAULT_RATE_LIMIT", "100"))  # requests per minute
DEFAULT_BURST_LIMIT = int(os.getenv("DEFAULT_BURST_LIMIT", "10"))  # burst requests
CLEANUP_INTERVAL = int(os.getenv("CLEANUP_INTERVAL", "3600"))  # 1 hour
ENABLE_THROTTLING = os.getenv("ENABLE_THROTTLING", "true").lower() == "true"

# Initialize Redis connection
redis_client = None

# Pydantic models
class RateLimitConfig(BaseModel):
    client_id: str
    rate_limit: int = Field(default=DEFAULT_RATE_LIMIT, description="Requests per minute")
    burst_limit: int = Field(default=DEFAULT_BURST_LIMIT, description="Burst requests allowed")
    window_size: int = Field(default=60, description="Time window in seconds")
    service_name: Optional[str] = None
    endpoint_pattern: Optional[str] = None
    priority: str = Field(default="normal", description="Priority: low, normal, high, premium")

class ThrottleConfig(BaseModel):
    client_id: str
    throttle_type: str = Field(description="Type: delay, reject, degrade")
    delay_ms: int = Field(default=100, description="Delay in milliseconds")
    degradation_factor: float = Field(default=0.5, description="Degradation factor (0-1)")
    conditions: Dict[str, Any] = Field(default_factory=dict)

class UsageStats(BaseModel):
    client_id: str
    total_requests: int
    successful_requests: int
    blocked_requests: int
    throttled_requests: int
    current_rate: float
    peak_rate: float
    last_request: Optional[str] = None

class RateLimitRule(BaseModel):
    id: str
    name: str
    description: str
    client_pattern: str
    service_pattern: str
    endpoint_pattern: str
    rate_limit: int
    burst_limit: int
    window_size: int
    priority: str
    enabled: bool = True
    created_at: str
    updated_at: str

@dataclass
class RateLimitResult:
    allowed: bool
    remaining: int
    reset_time: int
    retry_after: Optional[int] = None
    reason: Optional[str] = None

class RateLimiterService:
    def __init__(self):
        self.db_path = DATABASE_PATH
        self.redis_client = None
        self._ensure_directories()
        self._init_database()
        self.rate_limit_rules = {}
        self.throttle_configs = {}
        self.usage_stats = defaultdict(lambda: {
            "total_requests": 0,
            "successful_requests": 0,
            "blocked_requests": 0,
            "throttled_requests": 0,
            "current_rate": 0.0,
            "peak_rate": 0.0,
            "last_request": None
        })
    
    def _ensure_directories(self):
        """Ensure required directories exist"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
    
    def _init_database(self):
        """Initialize rate limiter database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create rate limiting tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rate_limit_rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                client_pattern TEXT NOT NULL,
                service_pattern TEXT,
                endpoint_pattern TEXT,
                rate_limit INTEGER NOT NULL,
                burst_limit INTEGER NOT NULL,
                window_size INTEGER NOT NULL,
                priority TEXT DEFAULT 'normal',
                enabled BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS throttle_configs (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                throttle_type TEXT NOT NULL,
                delay_ms INTEGER DEFAULT 100,
                degradation_factor REAL DEFAULT 0.5,
                conditions TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                service_name TEXT,
                endpoint TEXT,
                request_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                response_time INTEGER,
                status_code INTEGER,
                rate_limited BOOLEAN DEFAULT 0,
                throttled BOOLEAN DEFAULT 0,
                ip_address TEXT,
                user_agent TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS client_quotas (
                client_id TEXT PRIMARY KEY,
                daily_limit INTEGER DEFAULT 10000,
                monthly_limit INTEGER DEFAULT 300000,
                current_daily INTEGER DEFAULT 0,
                current_monthly INTEGER DEFAULT 0,
                reset_daily DATETIME,
                reset_monthly DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
    
    async def get_redis_client(self):
        """Get Redis client connection"""
        if self.redis_client is None:
            self.redis_client = redis.from_url(REDIS_URL)
        return self.redis_client
    
    def _get_client_key(self, client_id: str, service_name: str = None, endpoint: str = None) -> str:
        """Generate Redis key for client rate limiting"""
        key_parts = ["rate_limit", client_id]
        if service_name:
            key_parts.append(service_name)
        if endpoint:
            key_parts.append(endpoint.replace("/", "_"))
        return ":".join(key_parts)
    
    async def check_rate_limit(self, client_id: str, service_name: str = None, 
                              endpoint: str = None, priority: str = "normal") -> RateLimitResult:
        """Check if request is within rate limits"""
        redis_client = await self.get_redis_client()
        
        # Get rate limit configuration
        config = await self.get_rate_limit_config(client_id, service_name, endpoint, priority)
        
        # Generate Redis key
        key = self._get_client_key(client_id, service_name, endpoint)
        current_time = int(time.time())
        window_start = current_time - config.window_size
        
        try:
            # Use Redis pipeline for atomic operations
            async with redis_client.pipeline() as pipe:
                # Remove old entries outside the window
                await pipe.zremrangebyscore(key, 0, window_start)
                
                # Get current count
                await pipe.zcard(key)
                
                # Add current request
                await pipe.zadd(key, {str(current_time): current_time})
                
                # Set expiration
                await pipe.expire(key, config.window_size * 2)
                
                # Execute pipeline
                results = await pipe.execute()
                current_count = results[1]
            
            # Check burst limit
            if current_count > config.burst_limit:
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_time=current_time + config.window_size,
                    retry_after=config.window_size,
                    reason="burst_limit_exceeded"
                )
            
            # Check rate limit
            if current_count > config.rate_limit:
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_time=current_time + config.window_size,
                    retry_after=config.window_size,
                    reason="rate_limit_exceeded"
                )
            
            return RateLimitResult(
                allowed=True,
                remaining=config.rate_limit - current_count,
                reset_time=current_time + config.window_size,
                retry_after=None,
                reason=None
            )
            
        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            # Allow request if rate limiting fails
            return RateLimitResult(
                allowed=True,
                remaining=config.rate_limit,
                reset_time=current_time + config.window_size,
                retry_after=None,
                reason="rate_limit_error"
            )
    
    async def get_rate_limit_config(self, client_id: str, service_name: str = None, 
                                   endpoint: str = None, priority: str = "normal") -> RateLimitConfig:
        """Get rate limit configuration for client"""
        # Check for specific rule first
        rule = await self.find_matching_rule(client_id, service_name, endpoint)
        if rule:
            return RateLimitConfig(
                client_id=client_id,
                rate_limit=rule.rate_limit,
                burst_limit=rule.burst_limit,
                window_size=rule.window_size,
                service_name=service_name,
                priority=rule.priority
            )
        
        # Return default configuration based on priority
        base_rate = DEFAULT_RATE_LIMIT
        base_burst = DEFAULT_BURST_LIMIT
        
        if priority == "premium":
            base_rate *= 10
            base_burst *= 5
        elif priority == "high":
            base_rate *= 5
            base_burst *= 3
        elif priority == "low":
            base_rate //= 2
            base_burst //= 2
        
        return RateLimitConfig(
            client_id=client_id,
            rate_limit=base_rate,
            burst_limit=base_burst,
            window_size=60,
            service_name=service_name,
            priority=priority
        )
    
    async def find_matching_rule(self, client_id: str, service_name: str = None, 
                                endpoint: str = None) -> Optional[RateLimitRule]:
        """Find matching rate limit rule"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get all enabled rules
        cursor.execute("""
            SELECT id, name, description, client_pattern, service_pattern, endpoint_pattern,
                   rate_limit, burst_limit, window_size, priority, created_at, updated_at
            FROM rate_limit_rules
            WHERE enabled = 1
            ORDER BY priority DESC, created_at ASC
        """)
        
        rules = cursor.fetchall()
        conn.close()
        
        for rule_data in rules:
            rule = RateLimitRule(
                id=rule_data[0],
                name=rule_data[1],
                description=rule_data[2],
                client_pattern=rule_data[3],
                service_pattern=rule_data[4],
                endpoint_pattern=rule_data[5],
                rate_limit=rule_data[6],
                burst_limit=rule_data[7],
                window_size=rule_data[8],
                priority=rule_data[9],
                created_at=rule_data[10],
                updated_at=rule_data[11]
            )
            
            # Check if rule matches
            if self._pattern_matches(rule.client_pattern, client_id):
                if not rule.service_pattern or self._pattern_matches(rule.service_pattern, service_name or ""):
                    if not rule.endpoint_pattern or self._pattern_matches(rule.endpoint_pattern, endpoint or ""):
                        return rule
        
        return None
    
    def _pattern_matches(self, pattern: str, value: str) -> bool:
        """Check if value matches pattern (supports wildcards)"""
        if not pattern:
            return True
        
        # Simple wildcard matching
        if pattern == "*":
            return True
        
        if "*" in pattern:
            # Convert pattern to regex
            import re
            regex_pattern = pattern.replace("*", ".*")
            return re.match(regex_pattern, value) is not None
        
        return pattern == value
    
    async def apply_throttling(self, client_id: str, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply throttling based on client configuration"""
        if not ENABLE_THROTTLING:
            return {"throttled": False, "delay_ms": 0, "degradation_factor": 1.0}
        
        throttle_config = await self.get_throttle_config(client_id)
        if not throttle_config:
            return {"throttled": False, "delay_ms": 0, "degradation_factor": 1.0}
        
        # Check conditions
        if not self._check_throttle_conditions(throttle_config.conditions, request_data):
            return {"throttled": False, "delay_ms": 0, "degradation_factor": 1.0}
        
        if throttle_config.throttle_type == "delay":
            return {
                "throttled": True,
                "delay_ms": throttle_config.delay_ms,
                "degradation_factor": 1.0
            }
        elif throttle_config.throttle_type == "degrade":
            return {
                "throttled": True,
                "delay_ms": 0,
                "degradation_factor": throttle_config.degradation_factor
            }
        elif throttle_config.throttle_type == "reject":
            return {
                "throttled": True,
                "delay_ms": 0,
                "degradation_factor": 0.0
            }
        
        return {"throttled": False, "delay_ms": 0, "degradation_factor": 1.0}
    
    async def get_throttle_config(self, client_id: str) -> Optional[ThrottleConfig]:
        """Get throttle configuration for client"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT throttle_type, delay_ms, degradation_factor, conditions
            FROM throttle_configs
            WHERE client_id = ?
        """, (client_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return ThrottleConfig(
                client_id=client_id,
                throttle_type=result[0],
                delay_ms=result[1],
                degradation_factor=result[2],
                conditions=json.loads(result[3]) if result[3] else {}
            )
        
        return None
    
    def _check_throttle_conditions(self, conditions: Dict[str, Any], request_data: Dict[str, Any]) -> bool:
        """Check if throttle conditions are met"""
        if not conditions:
            return True
        
        for key, value in conditions.items():
            if key not in request_data:
                return False
            if request_data[key] != value:
                return False
        
        return True
    
    async def log_request(self, client_id: str, service_name: str, endpoint: str,
                         response_time: int, status_code: int, rate_limited: bool,
                         throttled: bool, ip_address: str = None, user_agent: str = None):
        """Log request for analytics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO usage_logs 
            (client_id, service_name, endpoint, response_time, status_code, 
             rate_limited, throttled, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (client_id, service_name, endpoint, response_time, status_code,
              rate_limited, throttled, ip_address, user_agent))
        
        conn.commit()
        conn.close()
        
        # Update in-memory stats
        stats = self.usage_stats[client_id]
        stats["total_requests"] += 1
        if status_code < 400:
            stats["successful_requests"] += 1
        if rate_limited:
            stats["blocked_requests"] += 1
        if throttled:
            stats["throttled_requests"] += 1
        
        stats["last_request"] = datetime.now().isoformat()
    
    async def get_usage_stats(self, client_id: str) -> UsageStats:
        """Get usage statistics for client"""
        stats = self.usage_stats[client_id]
        
        # Calculate current rate (requests per minute)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        one_minute_ago = datetime.now() - timedelta(minutes=1)
        cursor.execute("""
            SELECT COUNT(*) FROM usage_logs 
            WHERE client_id = ? AND request_time > ?
        """, (client_id, one_minute_ago.isoformat()))
        
        current_rate = cursor.fetchone()[0]
        conn.close()
        
        stats["current_rate"] = current_rate
        if current_rate > stats["peak_rate"]:
            stats["peak_rate"] = current_rate
        
        return UsageStats(
            client_id=client_id,
            total_requests=stats["total_requests"],
            successful_requests=stats["successful_requests"],
            blocked_requests=stats["blocked_requests"],
            throttled_requests=stats["throttled_requests"],
            current_rate=stats["current_rate"],
            peak_rate=stats["peak_rate"],
            last_request=stats["last_request"]
        )

# Initialize service
rate_limiter_service = RateLimiterService()

@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    logger.info("Rate Limiter Service starting up...")
    await rate_limiter_service.get_redis_client()

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Rate Limiter Service shutting down...")
    if rate_limiter_service.redis_client:
        await rate_limiter_service.redis_client.close()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        redis_client = await rate_limiter_service.get_redis_client()
        await redis_client.ping()
        redis_status = "healthy"
    except:
        redis_status = "unhealthy"
    
    return {
        "status": "healthy",
        "service": "rate-limiter",
        "redis": redis_status,
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.post("/api/rate-limiter/check")
async def check_rate_limit(request: Request):
    """Check rate limit for request"""
    try:
        data = await request.json()
        client_id = data.get("client_id")
        service_name = data.get("service_name")
        endpoint = data.get("endpoint")
        priority = data.get("priority", "normal")
        
        if not client_id:
            raise HTTPException(status_code=400, detail="client_id is required")
        
        result = await rate_limiter_service.check_rate_limit(
            client_id, service_name, endpoint, priority
        )
        
        return {
            "allowed": result.allowed,
            "remaining": result.remaining,
            "reset_time": result.reset_time,
            "retry_after": result.retry_after,
            "reason": result.reason
        }
    except Exception as e:
        logger.error(f"Error checking rate limit: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rate-limiter/throttle")
async def apply_throttling(request: Request):
    """Apply throttling to request"""
    try:
        data = await request.json()
        client_id = data.get("client_id")
        request_data = data.get("request_data", {})
        
        if not client_id:
            raise HTTPException(status_code=400, detail="client_id is required")
        
        throttle_result = await rate_limiter_service.apply_throttling(client_id, request_data)
        
        return throttle_result
    except Exception as e:
        logger.error(f"Error applying throttling: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rate-limiter/log")
async def log_request(request: Request):
    """Log request for analytics"""
    try:
        data = await request.json()
        client_id = data.get("client_id")
        service_name = data.get("service_name")
        endpoint = data.get("endpoint")
        response_time = data.get("response_time", 0)
        status_code = data.get("status_code", 200)
        rate_limited = data.get("rate_limited", False)
        throttled = data.get("throttled", False)
        ip_address = data.get("ip_address")
        user_agent = data.get("user_agent")
        
        if not client_id:
            raise HTTPException(status_code=400, detail="client_id is required")
        
        await rate_limiter_service.log_request(
            client_id, service_name, endpoint, response_time, status_code,
            rate_limited, throttled, ip_address, user_agent
        )
        
        return {"success": True, "message": "Request logged successfully"}
    except Exception as e:
        logger.error(f"Error logging request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rate-limiter/stats/{client_id}")
async def get_usage_stats(client_id: str):
    """Get usage statistics for client"""
    try:
        stats = await rate_limiter_service.get_usage_stats(client_id)
        return stats.dict()
    except Exception as e:
        logger.error(f"Error getting usage stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rate-limiter/rules")
async def get_rate_limit_rules():
    """Get all rate limit rules"""
    try:
        conn = sqlite3.connect(rate_limiter_service.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, description, client_pattern, service_pattern, endpoint_pattern,
                   rate_limit, burst_limit, window_size, priority, enabled, created_at, updated_at
            FROM rate_limit_rules
            ORDER BY priority DESC, created_at ASC
        """)
        
        rules = cursor.fetchall()
        conn.close()
        
        return {
            "rules": [
                {
                    "id": rule[0],
                    "name": rule[1],
                    "description": rule[2],
                    "client_pattern": rule[3],
                    "service_pattern": rule[4],
                    "endpoint_pattern": rule[5],
                    "rate_limit": rule[6],
                    "burst_limit": rule[7],
                    "window_size": rule[8],
                    "priority": rule[9],
                    "enabled": bool(rule[10]),
                    "created_at": rule[11],
                    "updated_at": rule[12]
                }
                for rule in rules
            ]
        }
    except Exception as e:
        logger.error(f"Error getting rate limit rules: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rate-limiter/rules")
async def create_rate_limit_rule(rule: RateLimitRule):
    """Create new rate limit rule"""
    try:
        conn = sqlite3.connect(rate_limiter_service.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO rate_limit_rules 
            (id, name, description, client_pattern, service_pattern, endpoint_pattern,
             rate_limit, burst_limit, window_size, priority, enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (rule.id, rule.name, rule.description, rule.client_pattern,
              rule.service_pattern, rule.endpoint_pattern, rule.rate_limit,
              rule.burst_limit, rule.window_size, rule.priority, rule.enabled))
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "rule_id": rule.id,
            "message": "Rate limit rule created successfully"
        }
    except Exception as e:
        logger.error(f"Error creating rate limit rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rate-limiter/config/{client_id}")
async def get_client_config(client_id: str, service_name: str = None, endpoint: str = None):
    """Get rate limit configuration for client"""
    try:
        config = await rate_limiter_service.get_rate_limit_config(client_id, service_name, endpoint)
        return config.dict()
    except Exception as e:
        logger.error(f"Error getting client config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rate-limiter/quotas/{client_id}")
async def get_client_quota(client_id: str):
    """Get client quota information"""
    try:
        conn = sqlite3.connect(rate_limiter_service.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT daily_limit, monthly_limit, current_daily, current_monthly,
                   reset_daily, reset_monthly
            FROM client_quotas
            WHERE client_id = ?
        """, (client_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {
                "client_id": client_id,
                "daily_limit": result[0],
                "monthly_limit": result[1],
                "current_daily": result[2],
                "current_monthly": result[3],
                "reset_daily": result[4],
                "reset_monthly": result[5],
                "daily_remaining": max(0, result[0] - result[2]),
                "monthly_remaining": max(0, result[1] - result[3])
            }
        else:
            return {
                "client_id": client_id,
                "daily_limit": 10000,
                "monthly_limit": 300000,
                "current_daily": 0,
                "current_monthly": 0,
                "reset_daily": None,
                "reset_monthly": None,
                "daily_remaining": 10000,
                "monthly_remaining": 300000
            }
    except Exception as e:
        logger.error(f"Error getting client quota: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8017) 