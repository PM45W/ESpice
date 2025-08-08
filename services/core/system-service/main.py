from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import logging
from datetime import datetime, timedelta
import uuid
import asyncio
import psutil
import os
import sqlite3
from enum import Enum
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="System Service", version="1.0.0", description="Consolidated monitoring and notification service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enums and Models
class NotificationType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"

class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class SystemMetric(str, Enum):
    CPU_USAGE = "cpu_usage"
    MEMORY_USAGE = "memory_usage"
    DISK_USAGE = "disk_usage"
    NETWORK_IO = "network_io"
    SERVICE_STATUS = "service_status"

# Pydantic Models
class NotificationRequest(BaseModel):
    title: str
    message: str
    notification_type: NotificationType = NotificationType.INFO
    priority: NotificationPriority = NotificationPriority.NORMAL
    recipients: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None

class NotificationResponse(BaseModel):
    notification_id: str
    title: str
    message: str
    notification_type: NotificationType
    priority: NotificationPriority
    status: str
    created_at: datetime
    sent_at: Optional[datetime] = None

class SystemMetricsRequest(BaseModel):
    metrics: List[SystemMetric]
    interval: int = 60  # seconds
    duration: int = 3600  # seconds

class AlertRule(BaseModel):
    rule_id: str
    metric: SystemMetric
    threshold: float
    operator: str  # "gt", "lt", "eq", "gte", "lte"
    notification_type: NotificationType
    priority: NotificationPriority
    enabled: bool = True

class ServiceStatus(BaseModel):
    service_name: str
    status: str  # "healthy", "warning", "error", "unknown"
    response_time: Optional[float] = None
    last_check: datetime
    details: Optional[Dict[str, Any]] = None

# In-memory storage
notifications = {}
system_metrics = {}
alert_rules = {}
service_statuses = {}

# Database setup
def init_db():
    """Initialize SQLite database for notifications and metrics"""
    os.makedirs("./data", exist_ok=True)
    conn = sqlite3.connect("./data/system.db")
    cursor = conn.cursor()
    
    # Notifications table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            notification_type TEXT NOT NULL,
            priority TEXT NOT NULL,
            status TEXT NOT NULL,
            recipients TEXT,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sent_at TIMESTAMP
        )
    """)
    
    # System metrics table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_metrics (
            id TEXT PRIMARY KEY,
            metric_name TEXT NOT NULL,
            value REAL NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Alert rules table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alert_rules (
            id TEXT PRIMARY KEY,
            metric TEXT NOT NULL,
            threshold REAL NOT NULL,
            operator TEXT NOT NULL,
            notification_type TEXT NOT NULL,
            priority TEXT NOT NULL,
            enabled BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

# Initialize database
init_db()

# System Monitoring Functions
def get_system_metrics() -> Dict[str, Any]:
    """Get current system metrics"""
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_percent = (disk.used / disk.total) * 100
        
        # Network I/O
        network = psutil.net_io_counters()
        network_io = {
            "bytes_sent": network.bytes_sent,
            "bytes_recv": network.bytes_recv,
            "packets_sent": network.packets_sent,
            "packets_recv": network.packets_recv
        }
        
        return {
            "cpu_usage": cpu_percent,
            "memory_usage": memory_percent,
            "disk_usage": disk_percent,
            "network_io": network_io,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting system metrics: {str(e)}")
        return {
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

def check_alert_rules(metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Check if any alert rules are triggered"""
    triggered_alerts = []
    
    for rule_id, rule in alert_rules.items():
        if not rule.get("enabled", True):
            continue
            
        metric_value = metrics.get(rule["metric"])
        if metric_value is None:
            continue
            
        threshold = rule["threshold"]
        operator = rule["operator"]
        
        # Check if rule is triggered
        triggered = False
        if operator == "gt" and metric_value > threshold:
            triggered = True
        elif operator == "lt" and metric_value < threshold:
            triggered = True
        elif operator == "eq" and metric_value == threshold:
            triggered = True
        elif operator == "gte" and metric_value >= threshold:
            triggered = True
        elif operator == "lte" and metric_value <= threshold:
            triggered = True
        
        if triggered:
            triggered_alerts.append({
                "rule_id": rule_id,
                "metric": rule["metric"],
                "value": metric_value,
                "threshold": threshold,
                "operator": operator,
                "notification_type": rule["notification_type"],
                "priority": rule["priority"]
            })
    
    return triggered_alerts

def save_metrics_to_db(metrics: Dict[str, Any]):
    """Save system metrics to database"""
    conn = sqlite3.connect("./data/system.db")
    cursor = conn.cursor()
    
    for metric_name, value in metrics.items():
        if metric_name in ["timestamp", "error", "network_io"]:
            continue
            
        metric_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO system_metrics (id, metric_name, value, timestamp)
            VALUES (?, ?, ?, ?)
        """, (metric_id, metric_name, value, datetime.now()))
    
    conn.commit()
    conn.close()

# Notification Functions
def send_email_notification(notification: Dict[str, Any]) -> bool:
    """Send email notification (mock implementation)"""
    try:
        # Mock email sending - replace with actual SMTP implementation
        logger.info(f"Mock email sent to {notification.get('recipients', ['admin@example.com'])}")
        logger.info(f"Subject: {notification['title']}")
        logger.info(f"Message: {notification['message']}")
        
        # Simulate email sending delay
        asyncio.sleep(0.1)
        
        return True
    except Exception as e:
        logger.error(f"Email notification failed: {str(e)}")
        return False

def send_webhook_notification(notification: Dict[str, Any]) -> bool:
    """Send webhook notification (mock implementation)"""
    try:
        # Mock webhook sending
        logger.info(f"Mock webhook notification sent")
        logger.info(f"Title: {notification['title']}")
        logger.info(f"Message: {notification['message']}")
        
        # Simulate webhook delay
        asyncio.sleep(0.1)
        
        return True
    except Exception as e:
        logger.error(f"Webhook notification failed: {str(e)}")
        return False

def save_notification_to_db(notification: Dict[str, Any]):
    """Save notification to database"""
    conn = sqlite3.connect("./data/system.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO notifications 
        (id, title, message, notification_type, priority, status, recipients, metadata, created_at, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        notification["id"],
        notification["title"],
        notification["message"],
        notification["notification_type"],
        notification["priority"],
        notification["status"],
        json.dumps(notification.get("recipients", [])),
        json.dumps(notification.get("metadata", {})),
        notification["created_at"],
        notification.get("sent_at")
    ))
    
    conn.commit()
    conn.close()

async def process_notification(notification: Dict[str, Any]):
    """Process and send notification"""
    try:
        # Update status to sending
        notification["status"] = "sending"
        save_notification_to_db(notification)
        
        # Send notification based on type
        success = False
        if notification.get("recipients"):
            success = send_email_notification(notification)
        else:
            success = send_webhook_notification(notification)
        
        # Update status
        if success:
            notification["status"] = "sent"
            notification["sent_at"] = datetime.now()
        else:
            notification["status"] = "failed"
        
        save_notification_to_db(notification)
        
    except Exception as e:
        logger.error(f"Notification processing failed: {str(e)}")
        notification["status"] = "failed"
        save_notification_to_db(notification)

# Service Health Check Functions
async def check_service_health(service_name: str, service_url: str) -> ServiceStatus:
    """Check health of a specific service"""
    try:
        import httpx
        
        start_time = datetime.now()
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{service_url}/health")
            end_time = datetime.now()
            
            response_time = (end_time - start_time).total_seconds()
            
            if response.status_code == 200:
                status = "healthy"
                details = response.json()
            else:
                status = "warning"
                details = {"status_code": response.status_code}
                
    except Exception as e:
        status = "error"
        response_time = None
        details = {"error": str(e)}
    
    return ServiceStatus(
        service_name=service_name,
        status=status,
        response_time=response_time,
        last_check=datetime.now(),
        details=details
    )

# Background monitoring task
async def background_monitoring():
    """Background task for continuous monitoring"""
    while True:
        try:
            # Get system metrics
            metrics = get_system_metrics()
            
            # Save metrics
            save_metrics_to_db(metrics)
            
            # Check alert rules
            triggered_alerts = check_alert_rules(metrics)
            
            # Create notifications for triggered alerts
            for alert in triggered_alerts:
                notification = {
                    "id": str(uuid.uuid4()),
                    "title": f"System Alert: {alert['metric']}",
                    "message": f"{alert['metric']} is {alert['operator']} {alert['threshold']} (current: {alert['value']})",
                    "notification_type": alert["notification_type"],
                    "priority": alert["priority"],
                    "status": "pending",
                    "created_at": datetime.now()
                }
                
                notifications[notification["id"]] = notification
                save_notification_to_db(notification)
                
                # Process notification in background
                asyncio.create_task(process_notification(notification))
            
            # Check service health
            services_to_check = [
                ("data-processing-service", "http://localhost:8011"),
                ("media-processing-service", "http://localhost:8012"),
                ("pdf-service", "http://localhost:8013"),
                ("spice-generation-service", "http://localhost:8014")
            ]
            
            for service_name, service_url in services_to_check:
                service_status = await check_service_health(service_name, service_url)
                service_statuses[service_name] = service_status
            
            # Wait for next check
            await asyncio.sleep(60)  # Check every minute
            
        except Exception as e:
            logger.error(f"Background monitoring error: {str(e)}")
            await asyncio.sleep(60)

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "system-service", "timestamp": datetime.now()}

# Notification Endpoints
@app.post("/notifications", response_model=NotificationResponse)
async def create_notification(request: NotificationRequest, background_tasks: BackgroundTasks):
    """Create and send a new notification"""
    notification_id = str(uuid.uuid4())
    
    notification = {
        "id": notification_id,
        "title": request.title,
        "message": request.message,
        "notification_type": request.notification_type.value,
        "priority": request.priority.value,
        "status": "pending",
        "recipients": request.recipients,
        "metadata": request.metadata,
        "created_at": datetime.now()
    }
    
    notifications[notification_id] = notification
    save_notification_to_db(notification)
    
    # Process notification in background
    background_tasks.add_task(process_notification, notification)
    
    return NotificationResponse(
        notification_id=notification_id,
        title=notification["title"],
        message=notification["message"],
        notification_type=request.notification_type,
        priority=request.priority,
        status="pending",
        created_at=notification["created_at"]
    )

@app.get("/notifications")
async def list_notifications(limit: int = 50, offset: int = 0):
    """List all notifications"""
    conn = sqlite3.connect("./data/system.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM notifications 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    """, (limit, offset))
    
    rows = cursor.fetchall()
    conn.close()
    
    notifications_list = []
    for row in rows:
        notifications_list.append({
            "id": row[0],
            "title": row[1],
            "message": row[2],
            "notification_type": row[3],
            "priority": row[4],
            "status": row[5],
            "recipients": json.loads(row[6]) if row[6] else [],
            "metadata": json.loads(row[7]) if row[7] else {},
            "created_at": row[8],
            "sent_at": row[9]
        })
    
    return {"notifications": notifications_list, "count": len(notifications_list)}

@app.get("/notifications/{notification_id}")
async def get_notification(notification_id: str):
    """Get specific notification"""
    conn = sqlite3.connect("./data/system.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM notifications WHERE id = ?", (notification_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {
        "id": row[0],
        "title": row[1],
        "message": row[2],
        "notification_type": row[3],
        "priority": row[4],
        "status": row[5],
        "recipients": json.loads(row[6]) if row[6] else [],
        "metadata": json.loads(row[7]) if row[7] else {},
        "created_at": row[8],
        "sent_at": row[9]
    }

# System Monitoring Endpoints
@app.get("/metrics/current")
async def get_current_metrics():
    """Get current system metrics"""
    return get_system_metrics()

@app.get("/metrics/history")
async def get_metrics_history(metric: str, hours: int = 24):
    """Get historical metrics"""
    conn = sqlite3.connect("./data/system.db")
    cursor = conn.cursor()
    
    since = datetime.now() - timedelta(hours=hours)
    cursor.execute("""
        SELECT value, timestamp FROM system_metrics 
        WHERE metric_name = ? AND timestamp >= ?
        ORDER BY timestamp ASC
    """, (metric, since))
    
    rows = cursor.fetchall()
    conn.close()
    
    return {
        "metric": metric,
        "data_points": [
            {"value": row[0], "timestamp": row[1]} for row in rows
        ],
        "count": len(rows)
    }

@app.post("/alerts/rules")
async def create_alert_rule(rule: AlertRule):
    """Create a new alert rule"""
    rule_id = str(uuid.uuid4())
    
    rule_data = {
        "id": rule_id,
        "metric": rule.metric.value,
        "threshold": rule.threshold,
        "operator": rule.operator,
        "notification_type": rule.notification_type.value,
        "priority": rule.priority.value,
        "enabled": rule.enabled
    }
    
    alert_rules[rule_id] = rule_data
    
    # Save to database
    conn = sqlite3.connect("./data/system.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO alert_rules 
        (id, metric, threshold, operator, notification_type, priority, enabled, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        rule_id,
        rule_data["metric"],
        rule_data["threshold"],
        rule_data["operator"],
        rule_data["notification_type"],
        rule_data["priority"],
        rule_data["enabled"],
        datetime.now()
    ))
    
    conn.commit()
    conn.close()
    
    return {"rule_id": rule_id, "message": "Alert rule created successfully"}

@app.get("/alerts/rules")
async def list_alert_rules():
    """List all alert rules"""
    conn = sqlite3.connect("./data/system.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM alert_rules ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    rules = []
    for row in rows:
        rules.append({
            "id": row[0],
            "metric": row[1],
            "threshold": row[2],
            "operator": row[3],
            "notification_type": row[4],
            "priority": row[5],
            "enabled": bool(row[6]),
            "created_at": row[7]
        })
    
    return {"rules": rules, "count": len(rules)}

# Service Health Endpoints
@app.get("/services/status")
async def get_services_status():
    """Get status of all services"""
    return {"services": service_statuses}

@app.get("/services/{service_name}/status")
async def get_service_status(service_name: str):
    """Get status of specific service"""
    if service_name not in service_statuses:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return service_statuses[service_name]

@app.post("/services/{service_name}/check")
async def check_service(service_name: str, service_url: str):
    """Manually check service health"""
    service_status = await check_service_health(service_name, service_url)
    service_statuses[service_name] = service_status
    
    return service_status

# Startup event
@app.on_event("startup")
async def startup_event():
    """Start background monitoring on startup"""
    asyncio.create_task(background_monitoring())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8015) 