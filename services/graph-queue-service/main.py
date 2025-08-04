from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import json
import logging
from datetime import datetime
import uuid
from pathlib import Path
import aiofiles
import httpx
from enum import Enum
import os
import sqlite3
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.queue_connections: Dict[str, List[WebSocket]] = {}
        self.job_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, connection_type: str, id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        
        if connection_type == "queue" and id:
            if id not in self.queue_connections:
                self.queue_connections[id] = []
            self.queue_connections[id].append(websocket)
        elif connection_type == "job" and id:
            if id not in self.job_connections:
                self.job_connections[id] = []
            self.job_connections[id].append(websocket)

    def disconnect(self, websocket: WebSocket, connection_type: str, id: str = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        if connection_type == "queue" and id and id in self.queue_connections:
            if websocket in self.queue_connections[id]:
                self.queue_connections[id].remove(websocket)
        elif connection_type == "job" and id and id in self.job_connections:
            if websocket in self.job_connections[id]:
                self.job_connections[id].remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending message: {e}")

    async def broadcast_to_queue(self, queue_id: str, message: str):
        if queue_id in self.queue_connections:
            for connection in self.queue_connections[queue_id]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to queue {queue_id}: {e}")

    async def broadcast_to_job(self, job_id: str, message: str):
        if job_id in self.job_connections:
            for connection in self.job_connections[job_id]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to job {job_id}: {e}")

manager = ConnectionManager()

# Database connection
def get_db_connection():
    # Use absolute path to the database file
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'prisma', 'dev.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

# Pydantic models
class QueueStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"

class JobStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class JobPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class QueueMode(str, Enum):
    AUTOMATIC = "automatic"
    MANUAL = "manual"

class QueueConfig(BaseModel):
    name: str
    mode: QueueMode = QueueMode.AUTOMATIC
    max_concurrent_jobs: int = 3
    priority: str = "fifo"
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class ExtractionJob(BaseModel):
    product_id: str
    image_id: str
    extraction_method: str = "standard"
    parameters: Optional[Dict[str, Any]] = None
    priority: JobPriority = JobPriority.NORMAL

class JobUpdate(BaseModel):
    status: JobStatus
    progress: Optional[int] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None

class QueueUpdate(BaseModel):
    status: QueueStatus
    max_concurrent_jobs: Optional[int] = None
    settings: Optional[Dict[str, Any]] = None

# Queue management
class GraphQueueService:
    def __init__(self):
        self.queues = {}
        self.processing_jobs = {}
        self.db_conn = get_db_connection()

    async def create_queue(self, config: QueueConfig) -> str:
        """Create new processing queue"""
        queue_id = str(uuid.uuid4())
        
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO GraphExtractionQueue (id, name, mode, status, maxConcurrentJobs, priority, description, settings)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                queue_id,
                config.name,
                config.mode,
                QueueStatus.ACTIVE,
                config.max_concurrent_jobs,
                config.priority,
                config.description,
                json.dumps(config.settings) if config.settings else None
            ))
            conn.commit()
            
            self.queues[queue_id] = {
                "id": queue_id,
                "config": config,
                "status": QueueStatus.ACTIVE,
                "jobs": []
            }
            
            logger.info(f"Created queue: {queue_id}")
            return queue_id
            
        except Exception as e:
            logger.error(f"Error creating queue: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create queue: {str(e)}")
        finally:
            conn.close()

    async def add_job(self, queue_id: str, job: ExtractionJob) -> str:
        """Add job to queue"""
        job_id = str(uuid.uuid4())
        
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO GraphExtractionJob (id, productId, imageId, queueId, status, priority, extractionMethod, parameters)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                job_id,
                job.product_id,
                job.image_id,
                queue_id,
                JobStatus.PENDING,
                job.priority,
                job.extraction_method,
                json.dumps(job.parameters) if job.parameters else None
            ))
            conn.commit()
            
            # Add to in-memory queue
            if queue_id in self.queues:
                self.queues[queue_id]["jobs"].append({
                    "id": job_id,
                    "job": job,
                    "status": JobStatus.PENDING
                })
            
            # Notify via WebSocket
            await manager.broadcast_to_queue(queue_id, json.dumps({
                "type": "queue:job_added",
                "payload": {
                    "job_id": job_id,
                    "queue_id": queue_id,
                    "job": job.dict()
                }
            }))
            
            logger.info(f"Added job {job_id} to queue {queue_id}")
            return job_id
            
        except Exception as e:
            logger.error(f"Error adding job: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to add job: {str(e)}")
        finally:
            conn.close()

    async def get_queue_status(self, queue_id: str) -> Dict[str, Any]:
        """Get current queue status"""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM GraphExtractionQueue WHERE id = ?
            """, (queue_id,))
            queue = cursor.fetchone()
            
            if not queue:
                raise HTTPException(status_code=404, detail="Queue not found")
            
            # Get job statistics
            cursor.execute("""
                SELECT status, COUNT(*) as count 
                FROM GraphExtractionJob 
                WHERE queueId = ? 
                GROUP BY status
            """, (queue_id,))
            job_stats = dict(cursor.fetchall())
            
            return {
                "queue_id": queue_id,
                "name": queue["name"],
                "status": queue["status"],
                "mode": queue["mode"],
                "max_concurrent_jobs": queue["maxConcurrentJobs"],
                "priority": queue["priority"],
                "description": queue["description"],
                "job_stats": job_stats,
                "created_at": queue["createdAt"],
                "updated_at": queue["updatedAt"]
            }
            
        except Exception as e:
            logger.error(f"Error getting queue status: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get queue status: {str(e)}")
        finally:
            conn.close()

    async def update_queue(self, queue_id: str, update: QueueUpdate) -> Dict[str, Any]:
        """Update queue settings"""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            
            update_fields = []
            params = []
            
            if update.status:
                update_fields.append("status = ?")
                params.append(update.status)
            
            if update.max_concurrent_jobs:
                update_fields.append("maxConcurrentJobs = ?")
                params.append(update.max_concurrent_jobs)
            
            if update.settings:
                update_fields.append("settings = ?")
                params.append(json.dumps(update.settings))
            
            if update_fields:
                update_fields.append("updatedAt = ?")
                params.append(datetime.now().isoformat())
                params.append(queue_id)
                
                cursor.execute(f"""
                    UPDATE GraphExtractionQueue 
                    SET {', '.join(update_fields)}
                    WHERE id = ?
                """, params)
                conn.commit()
            
            # Notify via WebSocket
            await manager.broadcast_to_queue(queue_id, json.dumps({
                "type": "queue:status_changed",
                "payload": {
                    "queue_id": queue_id,
                    "status": update.status,
                    "max_concurrent_jobs": update.max_concurrent_jobs
                }
            }))
            
            return await self.get_queue_status(queue_id)
            
        except Exception as e:
            logger.error(f"Error updating queue: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update queue: {str(e)}")
        finally:
            conn.close()

    async def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get job status"""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM GraphExtractionJob WHERE id = ?
            """, (job_id,))
            job = cursor.fetchone()
            
            if not job:
                raise HTTPException(status_code=404, detail="Job not found")
            
            return {
                "job_id": job_id,
                "product_id": job["productId"],
                "image_id": job["imageId"],
                "queue_id": job["queueId"],
                "status": job["status"],
                "priority": job["priority"],
                "progress": job["progress"],
                "extraction_method": job["extractionMethod"],
                "parameters": json.loads(job["parameters"]) if job["parameters"] else None,
                "error": job["error"],
                "started_at": job["startedAt"],
                "completed_at": job["completedAt"],
                "created_at": job["createdAt"],
                "updated_at": job["updatedAt"]
            }
            
        except Exception as e:
            logger.error(f"Error getting job status: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get job status: {str(e)}")
        finally:
            conn.close()

    async def update_job_status(self, job_id: str, update: JobUpdate) -> Dict[str, Any]:
        """Update job status"""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            
            update_fields = ["status = ?", "updatedAt = ?"]
            params = [update.status, datetime.now().isoformat()]
            
            if update.progress is not None:
                update_fields.append("progress = ?")
                params.append(update.progress)
            
            if update.error is not None:
                update_fields.append("error = ?")
                params.append(update.error)
            
            if update.result is not None:
                update_fields.append("result = ?")
                params.append(json.dumps(update.result))
            
            if update.status == JobStatus.PROCESSING:
                update_fields.append("startedAt = ?")
                params.append(datetime.now().isoformat())
            elif update.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                update_fields.append("completedAt = ?")
                params.append(datetime.now().isoformat())
            
            params.append(job_id)
            
            cursor.execute(f"""
                UPDATE GraphExtractionJob 
                SET {', '.join(update_fields)}
                WHERE id = ?
            """, params)
            conn.commit()
            
            # Notify via WebSocket
            await manager.broadcast_to_job(job_id, json.dumps({
                "type": "job:status_changed",
                "payload": {
                    "job_id": job_id,
                    "status": update.status,
                    "progress": update.progress,
                    "error": update.error
                }
            }))
            
            return await self.get_job_status(job_id)
            
        except Exception as e:
            logger.error(f"Error updating job status: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update job status: {str(e)}")
        finally:
            conn.close()

    async def process_queue(self, queue_id: str):
        """Process jobs in queue"""
        while True:
            try:
                # Get queue status
                queue_status = await self.get_queue_status(queue_id)
                if queue_status["status"] != QueueStatus.ACTIVE:
                    await asyncio.sleep(5)
                    continue
                
                # Get pending jobs
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM GraphExtractionJob 
                    WHERE queueId = ? AND status = ?
                    ORDER BY 
                        CASE priority 
                            WHEN 'urgent' THEN 1 
                            WHEN 'high' THEN 2 
                            WHEN 'normal' THEN 3 
                            WHEN 'low' THEN 4 
                        END,
                        createdAt ASC
                    LIMIT ?
                """, (queue_id, JobStatus.PENDING, queue_status["max_concurrent_jobs"]))
                
                pending_jobs = cursor.fetchall()
                conn.close()
                
                if not pending_jobs:
                    await asyncio.sleep(1)
                    continue
                
                # Process jobs concurrently
                tasks = []
                for job in pending_jobs:
                    task = asyncio.create_task(self.process_job(job))
                    tasks.append(task)
                
                await asyncio.gather(*tasks)
                
            except Exception as e:
                logger.error(f"Error in queue processing: {e}")
                await asyncio.sleep(5)

    async def process_job(self, job_row):
        """Process individual job"""
        job_id = job_row["id"]
        
        try:
            # Update job status to processing
            await self.update_job_status(job_id, JobUpdate(status=JobStatus.PROCESSING, progress=0))
            
            # Call curve extraction service
            extraction_result = await self.call_curve_extraction_service(job_row)
            
            # Store result
            await self.store_extraction_result(job_id, extraction_result)
            
            # Update job status to completed
            await self.update_job_status(job_id, JobUpdate(
                status=JobStatus.COMPLETED, 
                progress=100,
                result=extraction_result
            ))
            
            logger.info(f"Job {job_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Error processing job {job_id}: {e}")
            await self.update_job_status(job_id, JobUpdate(
                status=JobStatus.FAILED,
                error=str(e)
            ))

    async def call_curve_extraction_service(self, job_row):
        """Call the curve extraction service"""
        async with httpx.AsyncClient() as client:
            # Prepare the request payload
            payload = {
                "image_id": job_row["imageId"],
                "extraction_method": job_row["extractionMethod"],
                "parameters": json.loads(job_row["parameters"]) if job_row["parameters"] else {}
            }
            
            # Call the curve extraction service
            response = await client.post(
                "http://localhost:8002/api/queue/job/process",
                json=payload,
                timeout=300  # 5 minutes timeout
            )
            
            if response.status_code != 200:
                raise Exception(f"Curve extraction service error: {response.text}")
            
            return response.json()

    async def store_extraction_result(self, job_id: str, result: Dict[str, Any]):
        """Store extraction result in database"""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO GraphExtractionResult (jobId, csvFilePath, csvData, metadata, confidence, dataPoints, processingTime, extractionMethod, parameters)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                job_id,
                result.get("csv_file_path", ""),
                json.dumps(result.get("csv_data", {})),
                json.dumps(result.get("metadata", {})),
                result.get("confidence", 1.0),
                result.get("data_points", 0),
                result.get("processing_time", 0.0),
                result.get("extraction_method", "standard"),
                json.dumps(result.get("parameters", {}))
            ))
            conn.commit()
            
        except Exception as e:
            logger.error(f"Error storing extraction result: {e}")
            raise
        finally:
            conn.close()

# Initialize service
queue_service = GraphQueueService()

# FastAPI app
app = FastAPI(title="Graph Queue Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("Graph Queue Service starting up...")
    # Start queue processing for existing queues
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM GraphExtractionQueue WHERE status = ?", (QueueStatus.ACTIVE,))
    active_queues = cursor.fetchall()
    conn.close()
    
    for queue in active_queues:
        asyncio.create_task(queue_service.process_queue(queue["id"]))

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Graph Queue Service shutting down...")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "graph-queue-service"}

# Queue Management Endpoints
@app.post("/api/queue/create")
async def create_queue(config: QueueConfig):
    queue_id = await queue_service.create_queue(config)
    return {"queue_id": queue_id, "message": "Queue created successfully"}

@app.get("/api/queue/{queue_id}")
async def get_queue_status(queue_id: str):
    return await queue_service.get_queue_status(queue_id)

@app.put("/api/queue/{queue_id}")
async def update_queue(queue_id: str, update: QueueUpdate):
    return await queue_service.update_queue(queue_id, update)

@app.delete("/api/queue/{queue_id}")
async def delete_queue(queue_id: str):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM GraphExtractionQueue WHERE id = ?", (queue_id,))
        conn.commit()
        return {"message": "Queue deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete queue: {str(e)}")
    finally:
        conn.close()

@app.get("/api/queues")
async def list_queues():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM GraphExtractionQueue ORDER BY createdAt DESC")
        queues = cursor.fetchall()
        return [dict(queue) for queue in queues]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list queues: {str(e)}")
    finally:
        conn.close()

# Job Management Endpoints
@app.post("/api/job/create")
async def create_job(queue_id: str, job: ExtractionJob):
    job_id = await queue_service.add_job(queue_id, job)
    return {"job_id": job_id, "message": "Job created successfully"}

@app.get("/api/job/{job_id}")
async def get_job_status(job_id: str):
    return await queue_service.get_job_status(job_id)

@app.put("/api/job/{job_id}/priority")
async def update_job_priority(job_id: str, priority: JobPriority):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE GraphExtractionJob SET priority = ? WHERE id = ?", (priority, job_id))
        conn.commit()
        return {"message": "Job priority updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update job priority: {str(e)}")
    finally:
        conn.close()

@app.delete("/api/job/{job_id}")
async def cancel_job(job_id: str):
    return await queue_service.update_job_status(job_id, JobUpdate(status=JobStatus.FAILED, error="Cancelled by user"))

@app.post("/api/job/{job_id}/retry")
async def retry_job(job_id: str):
    return await queue_service.update_job_status(job_id, JobUpdate(status=JobStatus.PENDING, progress=0, error=None))

# Batch Operations
@app.post("/api/batch/create")
async def create_batch_jobs(queue_id: str, jobs: List[ExtractionJob]):
    job_ids = []
    for job in jobs:
        job_id = await queue_service.add_job(queue_id, job)
        job_ids.append(job_id)
    return {"job_ids": job_ids, "message": f"Created {len(job_ids)} jobs"}

@app.get("/api/batch/{batch_id}")
async def get_batch_status(batch_id: str):
    # For simplicity, using batch_id as queue_id
    return await queue_service.get_queue_status(batch_id)

@app.post("/api/batch/{batch_id}/cancel")
async def cancel_batch(batch_id: str):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE GraphExtractionJob 
            SET status = ?, error = ? 
            WHERE queueId = ? AND status IN (?, ?)
        """, (JobStatus.FAILED, "Cancelled by user", batch_id, JobStatus.PENDING, JobStatus.QUEUED))
        conn.commit()
        return {"message": "Batch cancelled successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel batch: {str(e)}")
    finally:
        conn.close()

# Real-time Monitoring WebSocket Endpoints
@app.websocket("/ws/queue/{queue_id}")
async def websocket_queue_status(websocket: WebSocket, queue_id: str):
    await manager.connect(websocket, "queue", queue_id)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, "queue", queue_id)

@app.websocket("/ws/job/{job_id}")
async def websocket_job_status(websocket: WebSocket, job_id: str):
    await manager.connect(websocket, "job", job_id)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, "job", job_id)

# Statistics Endpoints
@app.get("/api/stats/queue/{queue_id}")
async def get_queue_statistics(queue_id: str):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                status,
                COUNT(*) as count,
                AVG(progress) as avg_progress,
                AVG(CAST((julianday(completedAt) - julianday(startedAt)) * 24 * 60 * 60 AS REAL)) as avg_duration
            FROM GraphExtractionJob 
            WHERE queueId = ?
            GROUP BY status
        """, (queue_id,))
        stats = cursor.fetchall()
        
        return {
            "queue_id": queue_id,
            "statistics": [dict(stat) for stat in stats]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get queue statistics: {str(e)}")
    finally:
        conn.close()

@app.get("/api/stats/global")
async def get_global_statistics():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Queue statistics
        cursor.execute("SELECT COUNT(*) as total_queues FROM GraphExtractionQueue")
        total_queues = cursor.fetchone()["total_queues"]
        
        # Job statistics
        cursor.execute("""
            SELECT 
                status,
                COUNT(*) as count
            FROM GraphExtractionJob 
            GROUP BY status
        """)
        job_stats = cursor.fetchall()
        
        # Processing statistics
        cursor.execute("""
            SELECT 
                AVG(CAST((julianday(completedAt) - julianday(startedAt)) * 24 * 60 * 60 AS REAL)) as avg_processing_time,
                COUNT(*) as total_completed_jobs
            FROM GraphExtractionJob 
            WHERE status = 'completed' AND startedAt IS NOT NULL AND completedAt IS NOT NULL
        """)
        processing_stats = cursor.fetchone()
        
        return {
            "total_queues": total_queues,
            "job_statistics": [dict(stat) for stat in job_stats],
            "processing_statistics": dict(processing_stats) if processing_stats else {}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get global statistics: {str(e)}")
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008) 