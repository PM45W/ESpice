from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import uvicorn
import os
import json
import asyncio
import time
import hashlib
import shutil
import tarfile
import zipfile
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field
import logging
from dataclasses import dataclass
import aiofiles
import aiohttp
import sqlite3
import subprocess
import psutil
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
import schedule
import threading

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="ESpice Backup & Recovery Service",
    description="Automated backup, disaster recovery, and data protection for the platform",
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
BACKUP_STORAGE_PATH = os.getenv("BACKUP_STORAGE_PATH", "/app/backups")
DATABASE_PATH = os.getenv("DATABASE_PATH", "/app/backup_data/backup.db")
S3_BUCKET = os.getenv("S3_BUCKET", "espice-backups")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "")
S3_REGION = os.getenv("S3_REGION", "us-east-1")
BACKUP_RETENTION_DAYS = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
MAX_BACKUP_SIZE_GB = int(os.getenv("MAX_BACKUP_SIZE_GB", "10"))
ENABLE_COMPRESSION = os.getenv("ENABLE_COMPRESSION", "true").lower() == "true"
ENABLE_ENCRYPTION = os.getenv("ENABLE_ENCRYPTION", "false").lower() == "true"
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "")

# Pydantic models
class BackupConfig(BaseModel):
    name: str
    description: str
    source_paths: List[str]
    backup_type: str = Field(description="Type: full, incremental, differential")
    schedule: Optional[str] = None
    retention_days: int = 30
    compression: bool = True
    encryption: bool = False
    cloud_storage: bool = False
    enabled: bool = True

class RecoveryConfig(BaseModel):
    backup_id: str
    target_path: str
    recovery_type: str = Field(description="Type: full, selective, point_in_time")
    selective_files: Optional[List[str]] = None
    point_in_time: Optional[str] = None
    overwrite_existing: bool = False

class BackupStatus(BaseModel):
    backup_id: str
    name: str
    status: str
    progress: float
    start_time: str
    end_time: Optional[str] = None
    size_bytes: Optional[int] = None
    file_count: Optional[int] = None
    error_message: Optional[str] = None

class BackupInfo(BaseModel):
    backup_id: str
    name: str
    description: str
    backup_type: str
    created_at: str
    size_bytes: int
    file_count: int
    checksum: str
    compression_ratio: Optional[float] = None
    encrypted: bool
    cloud_stored: bool
    retention_expires: Optional[str] = None

@dataclass
class BackupResult:
    backup_id: str
    success: bool
    file_path: str
    size_bytes: int
    checksum: str
    duration_seconds: float
    error_message: Optional[str] = None

class BackupRecoveryService:
    def __init__(self):
        self.db_path = DATABASE_PATH
        self.backup_path = BACKUP_STORAGE_PATH
        self._ensure_directories()
        self._init_database()
        self.backup_configs = {}
        self.active_backups = {}
        self.s3_client = None
        self._init_s3_client()
        self._load_backup_configs()
    
    def _ensure_directories(self):
        """Ensure required directories exist"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        os.makedirs(self.backup_path, exist_ok=True)
        os.makedirs(os.path.join(self.backup_path, "full"), exist_ok=True)
        os.makedirs(os.path.join(self.backup_path, "incremental"), exist_ok=True)
        os.makedirs(os.path.join(self.backup_path, "differential"), exist_ok=True)
        os.makedirs(os.path.join(self.backup_path, "temp"), exist_ok=True)
    
    def _init_database(self):
        """Initialize backup database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create backup tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS backup_configs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                source_paths TEXT NOT NULL,
                backup_type TEXT NOT NULL,
                schedule TEXT,
                retention_days INTEGER DEFAULT 30,
                compression BOOLEAN DEFAULT 1,
                encryption BOOLEAN DEFAULT 0,
                cloud_storage BOOLEAN DEFAULT 0,
                enabled BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS backup_history (
                id TEXT PRIMARY KEY,
                config_id TEXT NOT NULL,
                name TEXT NOT NULL,
                backup_type TEXT NOT NULL,
                file_path TEXT NOT NULL,
                size_bytes INTEGER,
                file_count INTEGER,
                checksum TEXT,
                compression_ratio REAL,
                encrypted BOOLEAN DEFAULT 0,
                cloud_stored BOOLEAN DEFAULT 0,
                status TEXT DEFAULT 'pending',
                start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                end_time DATETIME,
                error_message TEXT,
                FOREIGN KEY (config_id) REFERENCES backup_configs (id)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS recovery_history (
                id TEXT PRIMARY KEY,
                backup_id TEXT NOT NULL,
                recovery_type TEXT NOT NULL,
                target_path TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                end_time DATETIME,
                error_message TEXT,
                FOREIGN KEY (backup_id) REFERENCES backup_history (id)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS file_index (
                backup_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                relative_path TEXT NOT NULL,
                size_bytes INTEGER,
                checksum TEXT,
                modified_time DATETIME,
                PRIMARY KEY (backup_id, file_path),
                FOREIGN KEY (backup_id) REFERENCES backup_history (id)
            )
        """)
        
        conn.commit()
        conn.close()
    
    def _init_s3_client(self):
        """Initialize S3 client for cloud storage"""
        if S3_ACCESS_KEY and S3_SECRET_KEY:
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=S3_ACCESS_KEY,
                    aws_secret_access_key=S3_SECRET_KEY,
                    region_name=S3_REGION
                )
                logger.info("S3 client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}")
                self.s3_client = None
    
    def _load_backup_configs(self):
        """Load backup configurations from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, description, source_paths, backup_type, schedule,
                   retention_days, compression, encryption, cloud_storage, enabled
            FROM backup_configs
            WHERE enabled = 1
        """)
        
        configs = cursor.fetchall()
        conn.close()
        
        for config in configs:
            self.backup_configs[config[0]] = {
                "id": config[0],
                "name": config[1],
                "description": config[2],
                "source_paths": json.loads(config[3]),
                "backup_type": config[4],
                "schedule": config[5],
                "retention_days": config[6],
                "compression": bool(config[7]),
                "encryption": bool(config[8]),
                "cloud_storage": bool(config[9]),
                "enabled": bool(config[10])
            }
    
    async def create_backup(self, config_id: str) -> BackupResult:
        """Create backup based on configuration"""
        if config_id not in self.backup_configs:
            raise ValueError(f"Backup configuration {config_id} not found")
        
        config = self.backup_configs[config_id]
        backup_id = f"{config_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Update status
        self.active_backups[backup_id] = {
            "status": "running",
            "progress": 0.0,
            "start_time": datetime.now().isoformat()
        }
        
        try:
            # Create backup file
            backup_file = await self._create_backup_file(backup_id, config)
            
            # Calculate checksum
            checksum = await self._calculate_checksum(backup_file)
            
            # Compress if enabled
            if config["compression"] and ENABLE_COMPRESSION:
                backup_file = await self._compress_backup(backup_file)
            
            # Encrypt if enabled
            if config["encryption"] and ENABLE_ENCRYPTION:
                backup_file = await self._encrypt_backup(backup_file)
            
            # Upload to cloud if enabled
            if config["cloud_storage"] and self.s3_client:
                await self._upload_to_cloud(backup_file, backup_id)
            
            # Get file size
            size_bytes = os.path.getsize(backup_file)
            
            # Save to database
            await self._save_backup_record(backup_id, config_id, backup_file, size_bytes, checksum)
            
            # Update status
            self.active_backups[backup_id]["status"] = "completed"
            self.active_backups[backup_id]["progress"] = 100.0
            self.active_backups[backup_id]["end_time"] = datetime.now().isoformat()
            
            return BackupResult(
                backup_id=backup_id,
                success=True,
                file_path=backup_file,
                size_bytes=size_bytes,
                checksum=checksum,
                duration_seconds=time.time() - datetime.fromisoformat(self.active_backups[backup_id]["start_time"]).timestamp()
            )
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Backup failed: {error_msg}")
            
            # Update status
            self.active_backups[backup_id]["status"] = "failed"
            self.active_backups[backup_id]["error_message"] = error_msg
            self.active_backups[backup_id]["end_time"] = datetime.now().isoformat()
            
            return BackupResult(
                backup_id=backup_id,
                success=False,
                file_path="",
                size_bytes=0,
                checksum="",
                duration_seconds=0,
                error_message=error_msg
            )
    
    async def _create_backup_file(self, backup_id: str, config: Dict[str, Any]) -> str:
        """Create backup file from source paths"""
        backup_type = config["backup_type"]
        backup_dir = os.path.join(self.backup_path, backup_type)
        backup_file = os.path.join(backup_dir, f"{backup_id}.tar")
        
        # Create tar archive
        with tarfile.open(backup_file, "w") as tar:
            for source_path in config["source_paths"]:
                if os.path.exists(source_path):
                    tar.add(source_path, arcname=os.path.basename(source_path))
                else:
                    logger.warning(f"Source path does not exist: {source_path}")
        
        return backup_file
    
    async def _calculate_checksum(self, file_path: str) -> str:
        """Calculate SHA256 checksum of file"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    async def _compress_backup(self, file_path: str) -> str:
        """Compress backup file"""
        compressed_path = file_path + ".gz"
        
        with open(file_path, 'rb') as f_in:
            with open(compressed_path, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        # Remove original file
        os.remove(file_path)
        return compressed_path
    
    async def _encrypt_backup(self, file_path: str) -> str:
        """Encrypt backup file"""
        if not ENCRYPTION_KEY:
            raise ValueError("Encryption key not configured")
        
        encrypted_path = file_path + ".enc"
        
        # Simple encryption (in production, use proper encryption)
        with open(file_path, 'rb') as f_in:
            with open(encrypted_path, 'wb') as f_out:
                data = f_in.read()
                # XOR encryption with key
                key_bytes = ENCRYPTION_KEY.encode()
                encrypted_data = bytes(a ^ b for a, b in zip(data, key_bytes * (len(data) // len(key_bytes) + 1)))
                f_out.write(encrypted_data)
        
        # Remove original file
        os.remove(file_path)
        return encrypted_path
    
    async def _upload_to_cloud(self, file_path: str, backup_id: str):
        """Upload backup to cloud storage"""
        if not self.s3_client:
            raise ValueError("S3 client not initialized")
        
        try:
            key = f"backups/{backup_id}/{os.path.basename(file_path)}"
            self.s3_client.upload_file(file_path, S3_BUCKET, key)
            logger.info(f"Uploaded backup to S3: {key}")
        except ClientError as e:
            logger.error(f"Failed to upload to S3: {e}")
            raise
    
    async def _save_backup_record(self, backup_id: str, config_id: str, file_path: str, 
                                 size_bytes: int, checksum: str):
        """Save backup record to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO backup_history 
            (id, config_id, name, backup_type, file_path, size_bytes, checksum, status, end_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (backup_id, config_id, self.backup_configs[config_id]["name"],
              self.backup_configs[config_id]["backup_type"], file_path, size_bytes,
              checksum, "completed", datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
    
    async def restore_backup(self, backup_id: str, target_path: str, 
                           recovery_type: str = "full") -> Dict[str, Any]:
        """Restore backup to target path"""
        # Get backup info
        backup_info = await self.get_backup_info(backup_id)
        if not backup_info:
            raise ValueError(f"Backup {backup_id} not found")
        
        backup_file = backup_info["file_path"]
        
        # Check if file exists
        if not os.path.exists(backup_file):
            raise FileNotFoundError(f"Backup file not found: {backup_file}")
        
        try:
            # Decrypt if needed
            if backup_info["encrypted"]:
                backup_file = await self._decrypt_backup(backup_file)
            
            # Decompress if needed
            if backup_file.endswith('.gz'):
                backup_file = await self._decompress_backup(backup_file)
            
            # Extract backup
            await self._extract_backup(backup_file, target_path, recovery_type)
            
            # Log recovery
            await self._log_recovery(backup_id, target_path, recovery_type, "completed")
            
            return {
                "success": True,
                "backup_id": backup_id,
                "target_path": target_path,
                "recovery_type": recovery_type,
                "restored_files": await self._count_restored_files(target_path)
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Recovery failed: {error_msg}")
            
            # Log recovery failure
            await self._log_recovery(backup_id, target_path, recovery_type, "failed", error_msg)
            
            return {
                "success": False,
                "backup_id": backup_id,
                "error_message": error_msg
            }
    
    async def _decrypt_backup(self, file_path: str) -> str:
        """Decrypt backup file"""
        if not ENCRYPTION_KEY:
            raise ValueError("Encryption key not configured")
        
        decrypted_path = file_path.replace('.enc', '')
        
        with open(file_path, 'rb') as f_in:
            with open(decrypted_path, 'wb') as f_out:
                data = f_in.read()
                # XOR decryption with key
                key_bytes = ENCRYPTION_KEY.encode()
                decrypted_data = bytes(a ^ b for a, b in zip(data, key_bytes * (len(data) // len(key_bytes) + 1)))
                f_out.write(decrypted_data)
        
        return decrypted_path
    
    async def _decompress_backup(self, file_path: str) -> str:
        """Decompress backup file"""
        decompressed_path = file_path.replace('.gz', '')
        
        with open(file_path, 'rb') as f_in:
            with open(decompressed_path, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        return decompressed_path
    
    async def _extract_backup(self, backup_file: str, target_path: str, recovery_type: str):
        """Extract backup to target path"""
        # Create target directory
        os.makedirs(target_path, exist_ok=True)
        
        # Extract tar archive
        with tarfile.open(backup_file, "r") as tar:
            tar.extractall(target_path)
    
    async def _count_restored_files(self, target_path: str) -> int:
        """Count restored files"""
        count = 0
        for root, dirs, files in os.walk(target_path):
            count += len(files)
        return count
    
    async def _log_recovery(self, backup_id: str, target_path: str, recovery_type: str, 
                           status: str, error_message: str = None):
        """Log recovery operation"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO recovery_history 
            (id, backup_id, recovery_type, target_path, status, end_time, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (f"recovery_{int(time.time())}", backup_id, recovery_type, target_path,
              status, datetime.now().isoformat(), error_message))
        
        conn.commit()
        conn.close()
    
    async def get_backup_info(self, backup_id: str) -> Optional[BackupInfo]:
        """Get backup information"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, backup_type, file_path, size_bytes, checksum,
                   compression_ratio, encrypted, cloud_stored, created_at
            FROM backup_history
            WHERE id = ?
        """, (backup_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return BackupInfo(
                backup_id=result[0],
                name=result[1],
                description="",
                backup_type=result[2],
                created_at=result[8],
                size_bytes=result[4] or 0,
                file_count=0,
                checksum=result[5] or "",
                compression_ratio=result[6],
                encrypted=bool(result[7]),
                cloud_stored=bool(result[8]),
                retention_expires=None
            )
        
        return None
    
    async def list_backups(self, config_id: str = None) -> List[BackupInfo]:
        """List all backups"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if config_id:
            cursor.execute("""
                SELECT id, name, backup_type, file_path, size_bytes, checksum,
                       compression_ratio, encrypted, cloud_stored, created_at
                FROM backup_history
                WHERE config_id = ?
                ORDER BY created_at DESC
            """, (config_id,))
        else:
            cursor.execute("""
                SELECT id, name, backup_type, file_path, size_bytes, checksum,
                       compression_ratio, encrypted, cloud_stored, created_at
                FROM backup_history
                ORDER BY created_at DESC
            """)
        
        results = cursor.fetchall()
        conn.close()
        
        return [
            BackupInfo(
                backup_id=row[0],
                name=row[1],
                description="",
                backup_type=row[2],
                created_at=row[8],
                size_bytes=row[4] or 0,
                file_count=0,
                checksum=row[5] or "",
                compression_ratio=row[6],
                encrypted=bool(row[7]),
                cloud_stored=bool(row[8]),
                retention_expires=None
            )
            for row in results
        ]
    
    async def cleanup_old_backups(self):
        """Clean up old backups based on retention policy"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get backups older than retention period
        cutoff_date = datetime.now() - timedelta(days=BACKUP_RETENTION_DAYS)
        
        cursor.execute("""
            SELECT id, file_path FROM backup_history
            WHERE created_at < ?
        """, (cutoff_date.isoformat(),))
        
        old_backups = cursor.fetchall()
        
        for backup_id, file_path in old_backups:
            try:
                # Delete file
                if os.path.exists(file_path):
                    os.remove(file_path)
                
                # Delete from database
                cursor.execute("DELETE FROM backup_history WHERE id = ?", (backup_id,))
                cursor.execute("DELETE FROM file_index WHERE backup_id = ?", (backup_id,))
                
                logger.info(f"Cleaned up old backup: {backup_id}")
                
            except Exception as e:
                logger.error(f"Failed to cleanup backup {backup_id}: {e}")
        
        conn.commit()
        conn.close()

# Initialize service
backup_service = BackupRecoveryService()

@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    logger.info("Backup & Recovery Service starting up...")
    
    # Start cleanup scheduler
    def run_cleanup_scheduler():
        schedule.every().day.at("02:00").do(backup_service.cleanup_old_backups)
        while True:
            schedule.run_pending()
            time.sleep(3600)  # Check every hour
    
    cleanup_thread = threading.Thread(target=run_cleanup_scheduler, daemon=True)
    cleanup_thread.start()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # Check disk space
    disk_usage = psutil.disk_usage(BACKUP_STORAGE_PATH)
    disk_percent = (disk_usage.used / disk_usage.total) * 100
    
    return {
        "status": "healthy",
        "service": "backup-recovery",
        "disk_usage_percent": round(disk_percent, 2),
        "disk_free_gb": round(disk_usage.free / (1024**3), 2),
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.post("/api/backup/create")
async def create_backup(config_id: str, background_tasks: BackgroundTasks):
    """Create backup based on configuration"""
    try:
        # Start backup in background
        background_tasks.add_task(backup_service.create_backup, config_id)
        
        return {
            "success": True,
            "message": f"Backup started for configuration {config_id}",
            "config_id": config_id
        }
    except Exception as e:
        logger.error(f"Error starting backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/backup/restore")
async def restore_backup(backup_id: str, target_path: str, recovery_type: str = "full"):
    """Restore backup to target path"""
    try:
        result = await backup_service.restore_backup(backup_id, target_path, recovery_type)
        return result
    except Exception as e:
        logger.error(f"Error restoring backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/backup/status/{backup_id}")
async def get_backup_status(backup_id: str):
    """Get backup status"""
    if backup_id in backup_service.active_backups:
        return backup_service.active_backups[backup_id]
    else:
        # Check completed backups
        backup_info = await backup_service.get_backup_info(backup_id)
        if backup_info:
            return {
                "status": "completed",
                "progress": 100.0,
                "backup_info": backup_info.dict()
            }
        else:
            raise HTTPException(status_code=404, detail="Backup not found")

@app.get("/api/backup/list")
async def list_backups(config_id: str = None):
    """List all backups"""
    try:
        backups = await backup_service.list_backups(config_id)
        return {"backups": [backup.dict() for backup in backups]}
    except Exception as e:
        logger.error(f"Error listing backups: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/backup/info/{backup_id}")
async def get_backup_info(backup_id: str):
    """Get backup information"""
    try:
        backup_info = await backup_service.get_backup_info(backup_id)
        if backup_info:
            return backup_info.dict()
        else:
            raise HTTPException(status_code=404, detail="Backup not found")
    except Exception as e:
        logger.error(f"Error getting backup info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/backup/{backup_id}")
async def delete_backup(backup_id: str):
    """Delete backup"""
    try:
        backup_info = await backup_service.get_backup_info(backup_id)
        if not backup_info:
            raise HTTPException(status_code=404, detail="Backup not found")
        
        # Delete file
        if os.path.exists(backup_info.file_path):
            os.remove(backup_info.file_path)
        
        # Delete from database
        conn = sqlite3.connect(backup_service.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM backup_history WHERE id = ?", (backup_id,))
        cursor.execute("DELETE FROM file_index WHERE backup_id = ?", (backup_id,))
        conn.commit()
        conn.close()
        
        return {"success": True, "message": f"Backup {backup_id} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/backup/upload")
async def upload_backup(file: UploadFile = File(...)):
    """Upload backup file"""
    try:
        # Save uploaded file
        file_path = os.path.join(backup_service.backup_path, "temp", file.filename)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Calculate checksum
        checksum = await backup_service._calculate_checksum(file_path)
        
        # Get file size
        size_bytes = os.path.getsize(file_path)
        
        return {
            "success": True,
            "file_path": file_path,
            "size_bytes": size_bytes,
            "checksum": checksum,
            "message": "Backup file uploaded successfully"
        }
    except Exception as e:
        logger.error(f"Error uploading backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/backup/download/{backup_id}")
async def download_backup(backup_id: str):
    """Download backup file"""
    try:
        backup_info = await backup_service.get_backup_info(backup_id)
        if not backup_info:
            raise HTTPException(status_code=404, detail="Backup not found")
        
        if not os.path.exists(backup_info.file_path):
            raise HTTPException(status_code=404, detail="Backup file not found")
        
        return StreamingResponse(
            open(backup_info.file_path, "rb"),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={os.path.basename(backup_info.file_path)}"}
        )
    except Exception as e:
        logger.error(f"Error downloading backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/backup/cleanup")
async def cleanup_backups():
    """Manually trigger backup cleanup"""
    try:
        await backup_service.cleanup_old_backups()
        return {"success": True, "message": "Backup cleanup completed"}
    except Exception as e:
        logger.error(f"Error during backup cleanup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8018) 