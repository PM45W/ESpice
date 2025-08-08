from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import uvicorn
import os
import json
import asyncio
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import io
import base64
import logging
from dataclasses import dataclass
import aiofiles
import aiohttp
from concurrent.futures import ThreadPoolExecutor
import redis.asyncio as redis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="ESpice Data Analytics & Reporting Service",
    description="Business intelligence, analytics, and reporting for semiconductor datasheet processing",
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
DATABASE_PATH = os.getenv("DATABASE_PATH", "/app/analytics_data/analytics.db")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
REPORT_STORAGE_PATH = os.getenv("REPORT_STORAGE_PATH", "/app/reports")
CACHE_TTL = int(os.getenv("CACHE_TTL", "3600"))  # 1 hour
MAX_WORKERS = int(os.getenv("MAX_WORKERS", "4"))

# Initialize Redis connection
redis_client = None

# Pydantic models
class AnalyticsRequest(BaseModel):
    report_type: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    filters: Dict[str, Any] = Field(default_factory=dict)
    time_range: Optional[str] = None
    format: str = "json"

class ReportConfig(BaseModel):
    name: str
    description: str
    report_type: str
    parameters: Dict[str, Any]
    schedule: Optional[str] = None
    recipients: List[str] = Field(default_factory=list)
    format: str = "pdf"

class DashboardConfig(BaseModel):
    name: str
    description: str
    widgets: List[Dict[str, Any]]
    layout: Dict[str, Any]
    refresh_interval: int = 300

class MetricDefinition(BaseModel):
    name: str
    description: str
    calculation: str
    unit: str
    category: str
    thresholds: Dict[str, float] = Field(default_factory=dict)

@dataclass
class AnalyticsResult:
    data: Any
    metadata: Dict[str, Any]
    timestamp: datetime
    cache_key: Optional[str] = None

class DataAnalyticsService:
    def __init__(self):
        self.db_path = DATABASE_PATH
        self.report_path = REPORT_STORAGE_PATH
        self.executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
        self._ensure_directories()
        self._init_database()
    
    def _ensure_directories(self):
        """Ensure required directories exist"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        os.makedirs(self.report_path, exist_ok=True)
    
    def _init_database(self):
        """Initialize analytics database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create analytics tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analytics_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                event_data TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                service_name TEXT,
                user_id TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                report_type TEXT NOT NULL,
                config TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_run DATETIME,
                status TEXT DEFAULT 'pending'
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dashboards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                config TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                value REAL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                category TEXT,
                metadata TEXT
            )
        """)
        
        conn.commit()
        conn.close()
    
    async def track_event(self, event_type: str, event_data: Dict[str, Any], 
                         service_name: str = None, user_id: str = None):
        """Track analytics event"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO analytics_events (event_type, event_data, service_name, user_id)
            VALUES (?, ?, ?, ?)
        """, (event_type, json.dumps(event_data), service_name, user_id))
        
        conn.commit()
        conn.close()
    
    async def get_processing_metrics(self, time_range: str = "7d") -> Dict[str, Any]:
        """Get processing performance metrics"""
        # Calculate time range
        end_time = datetime.now()
        if time_range == "1d":
            start_time = end_time - timedelta(days=1)
        elif time_range == "7d":
            start_time = end_time - timedelta(days=7)
        elif time_range == "30d":
            start_time = end_time - timedelta(days=30)
        else:
            start_time = end_time - timedelta(days=7)
        
        conn = sqlite3.connect(self.db_path)
        
        # Get processing statistics
        df = pd.read_sql_query("""
            SELECT 
                event_type,
                COUNT(*) as count,
                DATE(timestamp) as date
            FROM analytics_events 
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY event_type, DATE(timestamp)
            ORDER BY date
        """, conn, params=(start_time.isoformat(), end_time.isoformat()))
        
        # Calculate metrics
        total_processed = df[df['event_type'] == 'document_processed']['count'].sum()
        total_errors = df[df['event_type'] == 'processing_error']['count'].sum()
        avg_processing_time = df[df['event_type'] == 'processing_time']['count'].mean()
        
        # Service breakdown
        service_stats = pd.read_sql_query("""
            SELECT 
                service_name,
                COUNT(*) as requests,
                COUNT(CASE WHEN event_type = 'error' THEN 1 END) as errors
            FROM analytics_events 
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY service_name
        """, conn, params=(start_time.isoformat(), end_time.isoformat()))
        
        conn.close()
        
        return {
            "total_processed": int(total_processed),
            "total_errors": int(total_errors),
            "success_rate": round((total_processed - total_errors) / total_processed * 100, 2) if total_processed > 0 else 0,
            "avg_processing_time": round(avg_processing_time, 2) if not pd.isna(avg_processing_time) else 0,
            "service_breakdown": service_stats.to_dict('records'),
            "time_series": df.to_dict('records'),
            "period": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat()
            }
        }
    
    async def get_business_metrics(self) -> Dict[str, Any]:
        """Get business intelligence metrics"""
        conn = sqlite3.connect(self.db_path)
        
        # Device type analysis
        device_stats = pd.read_sql_query("""
            SELECT 
                JSON_EXTRACT(event_data, '$.device_type') as device_type,
                COUNT(*) as count
            FROM analytics_events 
            WHERE event_type = 'spice_model_generated'
            GROUP BY device_type
        """, conn)
        
        # Model complexity analysis
        complexity_stats = pd.read_sql_query("""
            SELECT 
                JSON_EXTRACT(event_data, '$.model_complexity') as complexity,
                COUNT(*) as count
            FROM analytics_events 
            WHERE event_type = 'spice_model_generated'
            GROUP BY complexity
        """, conn)
        
        # User activity
        user_activity = pd.read_sql_query("""
            SELECT 
                user_id,
                COUNT(*) as activity_count,
                MAX(timestamp) as last_activity
            FROM analytics_events 
            WHERE user_id IS NOT NULL
            GROUP BY user_id
            ORDER BY activity_count DESC
            LIMIT 10
        """, conn)
        
        conn.close()
        
        return {
            "device_types": device_stats.to_dict('records'),
            "model_complexity": complexity_stats.to_dict('records'),
            "top_users": user_activity.to_dict('records'),
            "total_models_generated": int(device_stats['count'].sum()) if not device_stats.empty else 0
        }
    
    async def generate_report(self, report_type: str, parameters: Dict[str, Any]) -> AnalyticsResult:
        """Generate analytical report"""
        if report_type == "processing_performance":
            data = await self.get_processing_metrics(parameters.get("time_range", "7d"))
        elif report_type == "business_intelligence":
            data = await self.get_business_metrics()
        elif report_type == "error_analysis":
            data = await self.get_error_analysis(parameters.get("time_range", "7d"))
        elif report_type == "user_activity":
            data = await self.get_user_activity_report(parameters.get("time_range", "30d"))
        else:
            raise ValueError(f"Unknown report type: {report_type}")
        
        return AnalyticsResult(
            data=data,
            metadata={
                "report_type": report_type,
                "parameters": parameters,
                "generated_at": datetime.now().isoformat()
            },
            timestamp=datetime.now()
        )
    
    async def get_error_analysis(self, time_range: str = "7d") -> Dict[str, Any]:
        """Analyze error patterns"""
        end_time = datetime.now()
        if time_range == "7d":
            start_time = end_time - timedelta(days=7)
        else:
            start_time = end_time - timedelta(days=30)
        
        conn = sqlite3.connect(self.db_path)
        
        # Error patterns
        error_patterns = pd.read_sql_query("""
            SELECT 
                JSON_EXTRACT(event_data, '$.error_type') as error_type,
                JSON_EXTRACT(event_data, '$.service') as service,
                COUNT(*) as count
            FROM analytics_events 
            WHERE event_type = 'error' 
            AND timestamp BETWEEN ? AND ?
            GROUP BY error_type, service
            ORDER BY count DESC
        """, conn, params=(start_time.isoformat(), end_time.isoformat()))
        
        # Error timeline
        error_timeline = pd.read_sql_query("""
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as error_count
            FROM analytics_events 
            WHERE event_type = 'error'
            AND timestamp BETWEEN ? AND ?
            GROUP BY DATE(timestamp)
            ORDER BY date
        """, conn, params=(start_time.isoformat(), end_time.isoformat()))
        
        conn.close()
        
        return {
            "error_patterns": error_patterns.to_dict('records'),
            "error_timeline": error_timeline.to_dict('records'),
            "total_errors": int(error_patterns['count'].sum()) if not error_patterns.empty else 0,
            "most_common_error": error_patterns.iloc[0].to_dict() if not error_patterns.empty else None
        }
    
    async def get_user_activity_report(self, time_range: str = "30d") -> Dict[str, Any]:
        """Generate user activity report"""
        end_time = datetime.now()
        if time_range == "30d":
            start_time = end_time - timedelta(days=30)
        else:
            start_time = end_time - timedelta(days=90)
        
        conn = sqlite3.connect(self.db_path)
        
        # User activity over time
        user_activity = pd.read_sql_query("""
            SELECT 
                user_id,
                DATE(timestamp) as date,
                COUNT(*) as activity_count
            FROM analytics_events 
            WHERE user_id IS NOT NULL
            AND timestamp BETWEEN ? AND ?
            GROUP BY user_id, DATE(timestamp)
            ORDER BY date
        """, conn, params=(start_time.isoformat(), end_time.isoformat()))
        
        # Feature usage
        feature_usage = pd.read_sql_query("""
            SELECT 
                event_type,
                COUNT(*) as usage_count
            FROM analytics_events 
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY event_type
            ORDER BY usage_count DESC
        """, conn, params=(start_time.isoformat(), end_time.isoformat()))
        
        conn.close()
        
        return {
            "user_activity": user_activity.to_dict('records'),
            "feature_usage": feature_usage.to_dict('records'),
            "active_users": len(user_activity['user_id'].unique()) if not user_activity.empty else 0,
            "total_activities": int(user_activity['activity_count'].sum()) if not user_activity.empty else 0
        }
    
    async def create_visualization(self, data: Dict[str, Any], chart_type: str) -> str:
        """Create chart visualization"""
        if chart_type == "processing_timeline":
            df = pd.DataFrame(data.get("time_series", []))
            if not df.empty:
                fig = px.line(df, x='date', y='count', color='event_type',
                             title='Processing Activity Timeline')
                return fig.to_html(include_plotlyjs='cdn')
        
        elif chart_type == "error_analysis":
            df = pd.DataFrame(data.get("error_patterns", []))
            if not df.empty:
                fig = px.bar(df, x='error_type', y='count', color='service',
                            title='Error Analysis by Type and Service')
                return fig.to_html(include_plotlyjs='cdn')
        
        elif chart_type == "device_distribution":
            df = pd.DataFrame(data.get("device_types", []))
            if not df.empty:
                fig = px.pie(df, values='count', names='device_type',
                            title='Device Type Distribution')
                return fig.to_html(include_plotlyjs='cdn')
        
        return "<p>No data available for visualization</p>"
    
    async def export_report(self, data: Dict[str, Any], format: str) -> bytes:
        """Export report in various formats"""
        if format == "csv":
            # Convert to CSV
            df = pd.DataFrame(data.get("time_series", []))
            output = io.StringIO()
            df.to_csv(output, index=False)
            return output.getvalue().encode()
        
        elif format == "excel":
            # Convert to Excel
            df = pd.DataFrame(data.get("time_series", []))
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Data', index=False)
            return output.getvalue()
        
        elif format == "json":
            return json.dumps(data, indent=2).encode()
        
        else:
            raise ValueError(f"Unsupported format: {format}")

# Initialize service
analytics_service = DataAnalyticsService()

# Dependency to get Redis client
async def get_redis_client():
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(REDIS_URL)
    return redis_client

@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    logger.info("Data Analytics Service starting up...")
    await analytics_service.track_event("service_startup", {"service": "data-analytics"})

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Data Analytics Service shutting down...")
    if redis_client:
        await redis_client.close()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "data-analytics",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.post("/api/analytics/track")
async def track_analytics_event(event_type: str, event_data: Dict[str, Any], 
                               service_name: str = None, user_id: str = None):
    """Track analytics event"""
    try:
        await analytics_service.track_event(event_type, event_data, service_name, user_id)
        return {"success": True, "message": "Event tracked successfully"}
    except Exception as e:
        logger.error(f"Error tracking event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/metrics/processing")
async def get_processing_metrics(time_range: str = Query("7d", description="Time range: 1d, 7d, 30d")):
    """Get processing performance metrics"""
    try:
        redis_client = await get_redis_client()
        cache_key = f"processing_metrics:{time_range}"
        
        # Check cache
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # Generate metrics
        metrics = await analytics_service.get_processing_metrics(time_range)
        
        # Cache result
        await redis_client.setex(cache_key, CACHE_TTL, json.dumps(metrics))
        
        return metrics
    except Exception as e:
        logger.error(f"Error getting processing metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/metrics/business")
async def get_business_metrics():
    """Get business intelligence metrics"""
    try:
        redis_client = await get_redis_client()
        cache_key = "business_metrics"
        
        # Check cache
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # Generate metrics
        metrics = await analytics_service.get_business_metrics()
        
        # Cache result
        await redis_client.setex(cache_key, CACHE_TTL, json.dumps(metrics))
        
        return metrics
    except Exception as e:
        logger.error(f"Error getting business metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analytics/reports/generate")
async def generate_report(request: AnalyticsRequest):
    """Generate analytical report"""
    try:
        result = await analytics_service.generate_report(request.report_type, request.parameters)
        return {
            "success": True,
            "data": result.data,
            "metadata": result.metadata
        }
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/reports/{report_type}/export")
async def export_report(report_type: str, format: str = Query("csv"), 
                       time_range: str = Query("7d")):
    """Export report in various formats"""
    try:
        # Generate report data
        result = await analytics_service.generate_report(report_type, {"time_range": time_range})
        
        # Export in requested format
        export_data = await analytics_service.export_report(result.data, format)
        
        # Determine content type
        content_type = {
            "csv": "text/csv",
            "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "json": "application/json"
        }.get(format, "application/octet-stream")
        
        # Determine filename
        filename = f"{report_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}"
        
        return StreamingResponse(
            io.BytesIO(export_data),
            media_type=content_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Error exporting report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/visualizations/{chart_type}")
async def get_visualization(chart_type: str, time_range: str = Query("7d")):
    """Get chart visualization"""
    try:
        # Get data based on chart type
        if chart_type == "processing_timeline":
            data = await analytics_service.get_processing_metrics(time_range)
        elif chart_type == "error_analysis":
            data = await analytics_service.get_error_analysis(time_range)
        elif chart_type == "device_distribution":
            data = await analytics_service.get_business_metrics()
        else:
            raise HTTPException(status_code=400, detail=f"Unknown chart type: {chart_type}")
        
        # Generate visualization
        html_content = await analytics_service.create_visualization(data, chart_type)
        
        return {"html": html_content}
    except Exception as e:
        logger.error(f"Error generating visualization: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/dashboards")
async def get_dashboards():
    """Get available dashboards"""
    try:
        conn = sqlite3.connect(analytics_service.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, name, config, created_at FROM dashboards ORDER BY created_at DESC")
        dashboards = cursor.fetchall()
        
        conn.close()
        
        return {
            "dashboards": [
                {
                    "id": row[0],
                    "name": row[1],
                    "config": json.loads(row[2]) if row[2] else {},
                    "created_at": row[3]
                }
                for row in dashboards
            ]
        }
    except Exception as e:
        logger.error(f"Error getting dashboards: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analytics/dashboards")
async def create_dashboard(config: DashboardConfig):
    """Create new dashboard"""
    try:
        conn = sqlite3.connect(analytics_service.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO dashboards (name, config)
            VALUES (?, ?)
        """, (config.name, json.dumps(config.dict())))
        
        dashboard_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "dashboard_id": dashboard_id,
            "message": "Dashboard created successfully"
        }
    except Exception as e:
        logger.error(f"Error creating dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/reports")
async def get_saved_reports():
    """Get saved reports"""
    try:
        conn = sqlite3.connect(analytics_service.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, name, report_type, config, created_at, last_run, status FROM reports ORDER BY created_at DESC")
        reports = cursor.fetchall()
        
        conn.close()
        
        return {
            "reports": [
                {
                    "id": row[0],
                    "name": row[1],
                    "report_type": row[2],
                    "config": json.loads(row[3]) if row[3] else {},
                    "created_at": row[4],
                    "last_run": row[5],
                    "status": row[6]
                }
                for row in reports
            ]
        }
    except Exception as e:
        logger.error(f"Error getting reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analytics/reports/save")
async def save_report(config: ReportConfig):
    """Save report configuration"""
    try:
        conn = sqlite3.connect(analytics_service.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO reports (name, report_type, config)
            VALUES (?, ?, ?)
        """, (config.name, config.report_type, json.dumps(config.dict())))
        
        report_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "report_id": report_id,
            "message": "Report saved successfully"
        }
    except Exception as e:
        logger.error(f"Error saving report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/summary")
async def get_analytics_summary():
    """Get comprehensive analytics summary"""
    try:
        # Get all key metrics
        processing_metrics = await analytics_service.get_processing_metrics("7d")
        business_metrics = await analytics_service.get_business_metrics()
        error_analysis = await analytics_service.get_error_analysis("7d")
        
        return {
            "summary": {
                "total_processed": processing_metrics.get("total_processed", 0),
                "success_rate": processing_metrics.get("success_rate", 0),
                "total_models": business_metrics.get("total_models_generated", 0),
                "total_errors": error_analysis.get("total_errors", 0),
                "active_users": len(business_metrics.get("top_users", []))
            },
            "processing": processing_metrics,
            "business": business_metrics,
            "errors": error_analysis,
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting analytics summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8016) 