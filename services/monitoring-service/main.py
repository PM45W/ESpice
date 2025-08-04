from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import uuid
import sqlite3
import os
import psutil
import socket
import time
import threading
from enum import Enum
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Monitoring & Observability Service", version="1.0.0")

class MetricType(str, Enum):
    SYSTEM = "system"
    SERVICE = "service"
    REQUEST = "request"
    CUSTOM = "custom"

class AlertLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class Metric(BaseModel):
    metric_id: str
    type: MetricType
    name: str
    value: float
    labels: Dict[str, Any] = {}
    timestamp: datetime

class Alert(BaseModel):
    alert_id: str
    name: str
    level: AlertLevel
    message: str
    metric: Optional[str] = None
    value: Optional[float] = None
    threshold: Optional[float] = None
    labels: Dict[str, Any] = {}
    created_at: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None

class LogEntry(BaseModel):
    log_id: str
    service: str
    level: str
    message: str
    data: Dict[str, Any] = {}
    timestamp: datetime

class TraceSpan(BaseModel):
    trace_id: str
    span_id: str
    parent_id: Optional[str] = None
    service: str
    operation: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    tags: Dict[str, Any] = {}

class ServiceHealth(BaseModel):
    service: str
    status: str
    uptime_seconds: float
    last_heartbeat: datetime
    version: str

class MonitoringConfig(BaseModel):
    prometheus_enabled: bool = True
    grafana_enabled: bool = True
    scrape_interval: int = 15
    alert_thresholds: Dict[str, float] = {}

class MetricQuery(BaseModel):
    name: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    labels: Optional[Dict[str, Any]] = None
    limit: int = 100

class AlertQuery(BaseModel):
    level: Optional[AlertLevel] = None
    resolved: Optional[bool] = None
    limit: int = 100

class LogQuery(BaseModel):
    service: Optional[str] = None
    level: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = 100

class TraceQuery(BaseModel):
    trace_id: Optional[str] = None
    service: Optional[str] = None
    operation: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = 100

class DatabaseManager:
    def __init__(self, db_path: str = "/app/monitoring_data.db"):
        self.db_path = db_path
        self.init_database()

    def init_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS metrics (
                metric_id TEXT PRIMARY KEY,
                type TEXT,
                name TEXT,
                value REAL,
                labels TEXT,
                timestamp TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                alert_id TEXT PRIMARY KEY,
                name TEXT,
                level TEXT,
                message TEXT,
                metric TEXT,
                value REAL,
                threshold REAL,
                labels TEXT,
                created_at TEXT,
                resolved INTEGER,
                resolved_at TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS logs (
                log_id TEXT PRIMARY KEY,
                service TEXT,
                level TEXT,
                message TEXT,
                data TEXT,
                timestamp TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS traces (
                trace_id TEXT,
                span_id TEXT PRIMARY KEY,
                parent_id TEXT,
                service TEXT,
                operation TEXT,
                start_time TEXT,
                end_time TEXT,
                duration_ms REAL,
                tags TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS service_health (
                service TEXT PRIMARY KEY,
                status TEXT,
                uptime_seconds REAL,
                last_heartbeat TEXT,
                version TEXT
            )
        ''')
        conn.commit()
        conn.close()

    def save_metric(self, metric: Metric):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO metrics VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                metric.metric_id,
                metric.type.value,
                metric.name,
                metric.value,
                json.dumps(metric.labels),
                metric.timestamp.isoformat()
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving metric: {e}")

    def get_metrics(self, query: MetricQuery) -> List[Metric]:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            sql = "SELECT * FROM metrics WHERE name = ?"
            params = [query.name]
            if query.start_time:
                sql += " AND timestamp >= ?"
                params.append(query.start_time.isoformat())
            if query.end_time:
                sql += " AND timestamp <= ?"
                params.append(query.end_time.isoformat())
            sql += " ORDER BY timestamp DESC LIMIT ?"
            params.append(query.limit)
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            metrics = []
            for row in rows:
                metrics.append(Metric(
                    metric_id=row[0],
                    type=MetricType(row[1]),
                    name=row[2],
                    value=row[3],
                    labels=json.loads(row[4]) if row[4] else {},
                    timestamp=datetime.fromisoformat(row[5])
                ))
            conn.close()
            return metrics
        except Exception as e:
            logger.error(f"Error getting metrics: {e}")
            return []

    def save_alert(self, alert: Alert):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO alerts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert.alert_id,
                alert.name,
                alert.level.value,
                alert.message,
                alert.metric,
                alert.value,
                alert.threshold,
                json.dumps(alert.labels),
                alert.created_at.isoformat(),
                1 if alert.resolved else 0,
                alert.resolved_at.isoformat() if alert.resolved_at else None
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving alert: {e}")

    def get_alerts(self, query: AlertQuery) -> List[Alert]:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            sql = "SELECT * FROM alerts WHERE 1=1"
            params = []
            if query.level:
                sql += " AND level = ?"
                params.append(query.level.value)
            if query.resolved is not None:
                sql += " AND resolved = ?"
                params.append(1 if query.resolved else 0)
            sql += " ORDER BY created_at DESC LIMIT ?"
            params.append(query.limit)
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            alerts = []
            for row in rows:
                alerts.append(Alert(
                    alert_id=row[0],
                    name=row[1],
                    level=AlertLevel(row[2]),
                    message=row[3],
                    metric=row[4],
                    value=row[5],
                    threshold=row[6],
                    labels=json.loads(row[7]) if row[7] else {},
                    created_at=datetime.fromisoformat(row[8]),
                    resolved=bool(row[9]),
                    resolved_at=datetime.fromisoformat(row[10]) if row[10] else None
                ))
            conn.close()
            return alerts
        except Exception as e:
            logger.error(f"Error getting alerts: {e}")
            return []

    def save_log(self, log: LogEntry):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO logs VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                log.log_id,
                log.service,
                log.level,
                log.message,
                json.dumps(log.data),
                log.timestamp.isoformat()
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving log: {e}")

    def get_logs(self, query: LogQuery) -> List[LogEntry]:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            sql = "SELECT * FROM logs WHERE 1=1"
            params = []
            if query.service:
                sql += " AND service = ?"
                params.append(query.service)
            if query.level:
                sql += " AND level = ?"
                params.append(query.level)
            if query.start_time:
                sql += " AND timestamp >= ?"
                params.append(query.start_time.isoformat())
            if query.end_time:
                sql += " AND timestamp <= ?"
                params.append(query.end_time.isoformat())
            sql += " ORDER BY timestamp DESC LIMIT ?"
            params.append(query.limit)
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            logs = []
            for row in rows:
                logs.append(LogEntry(
                    log_id=row[0],
                    service=row[1],
                    level=row[2],
                    message=row[3],
                    data=json.loads(row[4]) if row[4] else {},
                    timestamp=datetime.fromisoformat(row[5])
                ))
            conn.close()
            return logs
        except Exception as e:
            logger.error(f"Error getting logs: {e}")
            return []

    def save_trace(self, span: TraceSpan):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO traces VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                span.trace_id,
                span.span_id,
                span.parent_id,
                span.service,
                span.operation,
                span.start_time.isoformat(),
                span.end_time.isoformat() if span.end_time else None,
                span.duration_ms,
                json.dumps(span.tags)
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving trace: {e}")

    def get_traces(self, query: TraceQuery) -> List[TraceSpan]:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            sql = "SELECT * FROM traces WHERE 1=1"
            params = []
            if query.trace_id:
                sql += " AND trace_id = ?"
                params.append(query.trace_id)
            if query.service:
                sql += " AND service = ?"
                params.append(query.service)
            if query.operation:
                sql += " AND operation = ?"
                params.append(query.operation)
            if query.start_time:
                sql += " AND start_time >= ?"
                params.append(query.start_time.isoformat())
            if query.end_time:
                sql += " AND end_time <= ?"
                params.append(query.end_time.isoformat())
            sql += " ORDER BY start_time DESC LIMIT ?"
            params.append(query.limit)
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            traces = []
            for row in rows:
                traces.append(TraceSpan(
                    trace_id=row[0],
                    span_id=row[1],
                    parent_id=row[2],
                    service=row[3],
                    operation=row[4],
                    start_time=datetime.fromisoformat(row[5]),
                    end_time=datetime.fromisoformat(row[6]) if row[6] else None,
                    duration_ms=row[7],
                    tags=json.loads(row[8]) if row[8] else {}
                ))
            conn.close()
            return traces
        except Exception as e:
            logger.error(f"Error getting traces: {e}")
            return []

    def save_service_health(self, health: ServiceHealth):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO service_health VALUES (?, ?, ?, ?, ?)
            ''', (
                health.service,
                health.status,
                health.uptime_seconds,
                health.last_heartbeat.isoformat(),
                health.version
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving service health: {e}")

    def get_service_health(self, service: str) -> Optional[ServiceHealth]:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM service_health WHERE service = ?", (service,))
            row = cursor.fetchone()
            if row:
                health = ServiceHealth(
                    service=row[0],
                    status=row[1],
                    uptime_seconds=row[2],
                    last_heartbeat=datetime.fromisoformat(row[3]),
                    version=row[4]
                )
                conn.close()
                return health
            conn.close()
            return None
        except Exception as e:
            logger.error(f"Error getting service health: {e}")
            return None

db_manager = DatabaseManager()

@app.on_event("startup")
async def startup_event():
    logger.info("Monitoring & Observability Service starting up...")
    # Start background system metrics collection
    threading.Thread(target=collect_system_metrics, daemon=True).start()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "monitoring-service"}

@app.post("/metrics")
async def submit_metric(metric: Metric):
    db_manager.save_metric(metric)
    return {"success": True}

@app.post("/alerts")
async def submit_alert(alert: Alert):
    db_manager.save_alert(alert)
    return {"success": True}

@app.post("/logs")
async def submit_log(log: LogEntry):
    db_manager.save_log(log)
    return {"success": True}

@app.post("/traces")
async def submit_trace(span: TraceSpan):
    db_manager.save_trace(span)
    return {"success": True}

@app.post("/service-health")
async def submit_service_health(health: ServiceHealth):
    db_manager.save_service_health(health)
    return {"success": True}

@app.post("/metrics/query")
async def query_metrics(query: MetricQuery):
    metrics = db_manager.get_metrics(query)
    return {"metrics": [m.dict() for m in metrics], "total": len(metrics)}

@app.post("/alerts/query")
async def query_alerts(query: AlertQuery):
    alerts = db_manager.get_alerts(query)
    return {"alerts": [a.dict() for a in alerts], "total": len(alerts)}

@app.post("/logs/query")
async def query_logs(query: LogQuery):
    logs = db_manager.get_logs(query)
    return {"logs": [l.dict() for l in logs], "total": len(logs)}

@app.post("/traces/query")
async def query_traces(query: TraceQuery):
    traces = db_manager.get_traces(query)
    return {"traces": [t.dict() for t in traces], "total": len(traces)}

@app.get("/service-health/{service}")
async def get_service_health(service: str):
    health = db_manager.get_service_health(service)
    if not health:
        raise HTTPException(status_code=404, detail="Service health not found")
    return health

@app.get("/system/metrics")
async def get_system_metrics():
    # Return latest system metrics
    cpu = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    net = psutil.net_io_counters()
    return {
        "cpu_percent": cpu,
        "memory": dict(mem._asdict()),
        "disk": dict(disk._asdict()),
        "network": dict(net._asdict())
    }

def collect_system_metrics():
    while True:
        try:
            metric_id = str(uuid.uuid4())
            timestamp = datetime.now()
            cpu = psutil.cpu_percent(interval=1)
            mem = psutil.virtual_memory().percent
            disk = psutil.disk_usage("/").percent
            db_manager.save_metric(Metric(
                metric_id=metric_id,
                type=MetricType.SYSTEM,
                name="cpu_percent",
                value=cpu,
                labels={},
                timestamp=timestamp
            ))
            db_manager.save_metric(Metric(
                metric_id=str(uuid.uuid4()),
                type=MetricType.SYSTEM,
                name="memory_percent",
                value=mem,
                labels={},
                timestamp=timestamp
            ))
            db_manager.save_metric(Metric(
                metric_id=str(uuid.uuid4()),
                type=MetricType.SYSTEM,
                name="disk_percent",
                value=disk,
                labels={},
                timestamp=timestamp
            ))
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
        time.sleep(10) 