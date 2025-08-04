from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect, Request
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional, Union
import json
import logging
from datetime import datetime
import uuid
import sqlite3
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import asyncio
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Notification & Alerting Service", version="1.0.0")

class NotificationType(str, Enum):
    REALTIME = "realtime"
    EMAIL = "email"
    SLACK = "slack"
    TEAMS = "teams"
    SMS = "sms"
    WEBHOOK = "webhook"

class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    READ = "read"

class NotificationChannel(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    SLACK = "slack"
    TEAMS = "teams"
    SMS = "sms"
    WEBHOOK = "webhook"

class Notification(BaseModel):
    notification_id: str
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    type: NotificationType
    channel: NotificationChannel
    subject: str
    message: str
    data: Dict[str, Any] = {}
    status: NotificationStatus = NotificationStatus.PENDING
    created_at: datetime
    sent_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    error: Optional[str] = None

class NotificationPreference(BaseModel):
    user_id: str
    channel: NotificationChannel
    enabled: bool = True
    settings: Dict[str, Any] = {}

class SendNotificationRequest(BaseModel):
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    type: NotificationType
    channel: NotificationChannel
    subject: str
    message: str
    data: Dict[str, Any] = {}
    to: Optional[str] = None  # email, phone, webhook url, etc.

class EmailSettings(BaseModel):
    smtp_server: str
    smtp_port: int
    smtp_username: str
    smtp_password: str
    from_email: EmailStr
    use_tls: bool = True

class WebhookSettings(BaseModel):
    url: str
    headers: Dict[str, str] = {}

class SlackSettings(BaseModel):
    webhook_url: str

class TeamsSettings(BaseModel):
    webhook_url: str

class SMSSettings(BaseModel):
    provider: str  # e.g., twilio
    api_key: str
    from_number: str

class NotificationHistory(BaseModel):
    notification_id: str
    user_id: Optional[str]
    channel: NotificationChannel
    status: NotificationStatus
    sent_at: Optional[datetime]
    read_at: Optional[datetime]
    error: Optional[str]

# In-memory WebSocket manager for real-time notifications
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, user_id: str, message: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

manager = ConnectionManager()

class DatabaseManager:
    def __init__(self, db_path: str = "/app/notification_data.db"):
        self.db_path = db_path
        self.init_database()

    def init_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                notification_id TEXT PRIMARY KEY,
                user_id TEXT,
                org_id TEXT,
                type TEXT,
                channel TEXT,
                subject TEXT,
                message TEXT,
                data TEXT,
                status TEXT,
                created_at TEXT,
                sent_at TEXT,
                read_at TEXT,
                error TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notification_preferences (
                user_id TEXT,
                channel TEXT,
                enabled INTEGER,
                settings TEXT,
                PRIMARY KEY (user_id, channel)
            )
        ''')
        conn.commit()
        conn.close()

    def save_notification(self, notification: Notification):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                notification.notification_id,
                notification.user_id,
                notification.org_id,
                notification.type.value,
                notification.channel.value,
                notification.subject,
                notification.message,
                json.dumps(notification.data),
                notification.status.value,
                notification.created_at.isoformat(),
                notification.sent_at.isoformat() if notification.sent_at else None,
                notification.read_at.isoformat() if notification.read_at else None,
                notification.error
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving notification: {e}")

    def get_notifications(self, user_id: Optional[str] = None, limit: int = 100) -> List[Notification]:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            query = "SELECT * FROM notifications WHERE 1=1"
            params = []
            if user_id:
                query += " AND user_id = ?"
                params.append(user_id)
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            cursor.execute(query, params)
            rows = cursor.fetchall()
            notifications = []
            for row in rows:
                notifications.append(Notification(
                    notification_id=row[0],
                    user_id=row[1],
                    org_id=row[2],
                    type=NotificationType(row[3]),
                    channel=NotificationChannel(row[4]),
                    subject=row[5],
                    message=row[6],
                    data=json.loads(row[7]) if row[7] else {},
                    status=NotificationStatus(row[8]),
                    created_at=datetime.fromisoformat(row[9]),
                    sent_at=datetime.fromisoformat(row[10]) if row[10] else None,
                    read_at=datetime.fromisoformat(row[11]) if row[11] else None,
                    error=row[12]
                ))
            conn.close()
            return notifications
        except Exception as e:
            logger.error(f"Error getting notifications: {e}")
            return []

    def save_preference(self, pref: NotificationPreference):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO notification_preferences VALUES (?, ?, ?, ?)
            ''', (
                pref.user_id,
                pref.channel.value,
                1 if pref.enabled else 0,
                json.dumps(pref.settings)
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving notification preference: {e}")

    def get_preferences(self, user_id: str) -> List[NotificationPreference]:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM notification_preferences WHERE user_id = ?", (user_id,))
            rows = cursor.fetchall()
            prefs = []
            for row in rows:
                prefs.append(NotificationPreference(
                    user_id=row[0],
                    channel=NotificationChannel(row[1]),
                    enabled=bool(row[2]),
                    settings=json.loads(row[3]) if row[3] else {}
                ))
            conn.close()
            return prefs
        except Exception as e:
            logger.error(f"Error getting notification preferences: {e}")
            return []

db_manager = DatabaseManager()

@app.on_event("startup")
async def startup_event():
    logger.info("Notification & Alerting Service starting up...")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "notification-service"}

@app.post("/notify")
async def send_notification(request: SendNotificationRequest, background_tasks: BackgroundTasks):
    notification_id = str(uuid.uuid4())
    notification = Notification(
        notification_id=notification_id,
        user_id=request.user_id,
        org_id=request.org_id,
        type=request.type,
        channel=request.channel,
        subject=request.subject,
        message=request.message,
        data=request.data,
        created_at=datetime.now()
    )
    db_manager.save_notification(notification)
    background_tasks.add_task(process_notification, notification, request)
    return {"notification_id": notification_id, "status": "queued"}

async def process_notification(notification: Notification, request: SendNotificationRequest):
    try:
        if notification.channel == NotificationChannel.IN_APP or notification.channel == NotificationChannel.REALTIME:
            # Real-time notification via WebSocket
            await manager.send_personal_message(notification.user_id, notification.message)
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.now()
        elif notification.channel == NotificationChannel.EMAIL:
            await send_email_notification(request, notification)
        elif notification.channel == NotificationChannel.SLACK:
            await send_slack_notification(request, notification)
        elif notification.channel == NotificationChannel.TEAMS:
            await send_teams_notification(request, notification)
        elif notification.channel == NotificationChannel.SMS:
            await send_sms_notification(request, notification)
        elif notification.channel == NotificationChannel.WEBHOOK:
            await send_webhook_notification(request, notification)
        else:
            notification.status = NotificationStatus.FAILED
            notification.error = "Unknown channel"
        db_manager.save_notification(notification)
    except Exception as e:
        notification.status = NotificationStatus.FAILED
        notification.error = str(e)
        db_manager.save_notification(notification)
        logger.error(f"Error processing notification: {e}")

async def send_email_notification(request: SendNotificationRequest, notification: Notification):
    try:
        # Example: Use environment variables for SMTP config
        smtp_server = os.getenv("SMTP_SERVER", "smtp.example.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME", "user@example.com")
        smtp_password = os.getenv("SMTP_PASSWORD", "password")
        from_email = os.getenv("FROM_EMAIL", "noreply@example.com")
        use_tls = os.getenv("SMTP_USE_TLS", "1") == "1"
        to_email = request.to or notification.data.get("to_email")
        if not to_email:
            notification.status = NotificationStatus.FAILED
            notification.error = "No recipient email provided"
            return
        msg = MIMEMultipart()
        msg["From"] = from_email
        msg["To"] = to_email
        msg["Subject"] = notification.subject
        msg.attach(MIMEText(notification.message, "plain"))
        server = smtplib.SMTP(smtp_server, smtp_port)
        if use_tls:
            server.starttls()
        server.login(smtp_username, smtp_password)
        server.sendmail(from_email, to_email, msg.as_string())
        server.quit()
        notification.status = NotificationStatus.SENT
        notification.sent_at = datetime.now()
    except Exception as e:
        notification.status = NotificationStatus.FAILED
        notification.error = str(e)
        logger.error(f"Error sending email notification: {e}")

async def send_slack_notification(request: SendNotificationRequest, notification: Notification):
    try:
        webhook_url = os.getenv("SLACK_WEBHOOK_URL", "")
        if not webhook_url:
            notification.status = NotificationStatus.FAILED
            notification.error = "No Slack webhook URL configured"
            return
        payload = {"text": f"{notification.subject}\n{notification.message}"}
        response = requests.post(webhook_url, json=payload)
        if response.status_code == 200:
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.now()
        else:
            notification.status = NotificationStatus.FAILED
            notification.error = f"Slack error: {response.text}"
    except Exception as e:
        notification.status = NotificationStatus.FAILED
        notification.error = str(e)
        logger.error(f"Error sending Slack notification: {e}")

async def send_teams_notification(request: SendNotificationRequest, notification: Notification):
    try:
        webhook_url = os.getenv("TEAMS_WEBHOOK_URL", "")
        if not webhook_url:
            notification.status = NotificationStatus.FAILED
            notification.error = "No Teams webhook URL configured"
            return
        payload = {"text": f"{notification.subject}\n{notification.message}"}
        response = requests.post(webhook_url, json=payload)
        if response.status_code == 200:
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.now()
        else:
            notification.status = NotificationStatus.FAILED
            notification.error = f"Teams error: {response.text}"
    except Exception as e:
        notification.status = NotificationStatus.FAILED
        notification.error = str(e)
        logger.error(f"Error sending Teams notification: {e}")

async def send_sms_notification(request: SendNotificationRequest, notification: Notification):
    try:
        # Example: Use Twilio (or similar) via environment variables
        sms_provider = os.getenv("SMS_PROVIDER", "twilio")
        api_key = os.getenv("SMS_API_KEY", "")
        from_number = os.getenv("SMS_FROM_NUMBER", "")
        to_number = request.to or notification.data.get("to_number")
        if not to_number:
            notification.status = NotificationStatus.FAILED
            notification.error = "No recipient phone number provided"
            return
        # This is a placeholder; real implementation would use Twilio SDK or similar
        logger.info(f"Sending SMS to {to_number}: {notification.message}")
        notification.status = NotificationStatus.SENT
        notification.sent_at = datetime.now()
    except Exception as e:
        notification.status = NotificationStatus.FAILED
        notification.error = str(e)
        logger.error(f"Error sending SMS notification: {e}")

async def send_webhook_notification(request: SendNotificationRequest, notification: Notification):
    try:
        webhook_url = request.to or notification.data.get("webhook_url")
        if not webhook_url:
            notification.status = NotificationStatus.FAILED
            notification.error = "No webhook URL provided"
            return
        payload = {
            "subject": notification.subject,
            "message": notification.message,
            "data": notification.data
        }
        response = requests.post(webhook_url, json=payload)
        if response.status_code in (200, 201, 202):
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.now()
        else:
            notification.status = NotificationStatus.FAILED
            notification.error = f"Webhook error: {response.text}"
    except Exception as e:
        notification.status = NotificationStatus.FAILED
        notification.error = str(e)
        logger.error(f"Error sending webhook notification: {e}")

@app.get("/notifications")
async def get_notifications(user_id: Optional[str] = None, limit: int = 100):
    notifications = db_manager.get_notifications(user_id, limit)
    return {
        "notifications": [n.dict() for n in notifications],
        "total": len(notifications)
    }

@app.get("/preferences/{user_id}")
async def get_preferences(user_id: str):
    prefs = db_manager.get_preferences(user_id)
    return {
        "preferences": [p.dict() for p in prefs],
        "total": len(prefs)
    }

@app.post("/preferences")
async def set_preference(pref: NotificationPreference):
    db_manager.save_preference(pref)
    return {"success": True}

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id) 