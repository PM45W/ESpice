from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, WebSocket, WebSocketDisconnect
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

# Simple in-memory task processing (no Redis required)
import threading
import time

# In-memory task storage
task_results = {}
task_status = {}

def process_file_task(file_path, workflow_type):
    """Simulate file processing without Redis/Celery"""
    task_id = str(uuid.uuid4())
    task_status[task_id] = "PENDING"
    
    def process():
        try:
            task_status[task_id] = "STARTED"
            time.sleep(2)  # Simulate processing time
            task_status[task_id] = "SUCCESS"
            task_results[task_id] = {"result": "success", "file": file_path, "workflow_type": workflow_type}
        except Exception as e:
            task_status[task_id] = "FAILURE"
            task_results[task_id] = str(e)
    
    # Start processing in background thread
    thread = threading.Thread(target=process)
    thread.start()
    
    return task_id

def get_task_status(task_id):
    """Get status of a task"""
    return task_status.get(task_id, "PENDING")

def get_task_result(task_id):
    """Get result of a completed task"""
    return task_results.get(task_id)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Redis connection
redis_client = None

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

app = FastAPI(title="Batch Processor Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BatchStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class BatchRequest(BaseModel):
    batch_name: str
    description: Optional[str] = None
    workflow_type: str = "full_extraction"
    priority: str = "normal"  # low, normal, high, urgent
    metadata: Optional[Dict[str, Any]] = None

class BatchJob(BaseModel):
    job_id: str
    batch_id: str
    file_path: str
    status: BatchStatus
    progress: float = 0.0
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    celery_task_id: Optional[str] = None

class BatchInfo(BaseModel):
    batch_id: str
    batch_name: str
    description: Optional[str]
    status: BatchStatus
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    progress: float
    created_at: datetime
    updated_at: datetime
    estimated_completion: Optional[datetime] = None

# In-memory storage (in production, use database)
batches: Dict[str, Dict[str, Any]] = {}
batch_jobs: Dict[str, List[BatchJob]] = {}

class BatchProcessor:
    """Batch processing orchestrator"""
    
    def __init__(self):
        self.ai_agent_url = "http://ai-agent:8006"
        self.http_client = httpx.AsyncClient(timeout=60.0)
        self.processing_semaphore = asyncio.Semaphore(5)  # Limit concurrent jobs
    
    async def create_batch(self, request: BatchRequest, file_paths: List[str]) -> str:
        """Create a new batch processing job"""
        batch_id = str(uuid.uuid4())
        created_at = datetime.now()
        
        # Create batch info
        batches[batch_id] = {
            "batch_id": batch_id,
            "batch_name": request.batch_name,
            "description": request.description,
            "status": BatchStatus.PENDING,
            "workflow_type": request.workflow_type,
            "priority": request.priority,
            "metadata": request.metadata or {},
            "total_jobs": len(file_paths),
            "completed_jobs": 0,
            "failed_jobs": 0,
            "created_at": created_at,
            "updated_at": created_at,
            "estimated_completion": None
        }
        
        # Create individual jobs
        batch_jobs[batch_id] = []
        for file_path in file_paths:
            # Enqueue Celery task
            task_id = process_file_task(file_path, request.workflow_type)
            job = BatchJob(
                job_id=str(uuid.uuid4()),
                batch_id=batch_id,
                file_path=file_path,
                status=BatchStatus.PENDING,
                created_at=created_at,
                updated_at=created_at,
                celery_task_id=task_id
            )
            batch_jobs[batch_id].append(job)
        
        logger.info(f"Created batch {batch_id} with {len(file_paths)} jobs (Celery tasks queued)")
        return batch_id
    
    async def process_batch(self, batch_id: str):
        """Process all jobs in a batch"""
        if batch_id not in batches:
            raise Exception(f"Batch {batch_id} not found")
        
        batch = batches[batch_id]
        jobs = batch_jobs[batch_id]
        
        # Update batch status
        batch["status"] = BatchStatus.PROCESSING
        batch["updated_at"] = datetime.now()
        
        logger.info(f"Starting batch processing for {batch_id}")
        
        try:
            # Process jobs with concurrency control
            tasks = []
            for job in jobs:
                task = asyncio.create_task(self.process_job_with_semaphore(job))
                tasks.append(task)
            
            # Wait for all jobs to complete
            await asyncio.gather(*tasks, return_exceptions=True)
            
            # Update final batch status
            completed_count = sum(1 for job in jobs if job.status == BatchStatus.COMPLETED)
            failed_count = sum(1 for job in jobs if job.status == BatchStatus.FAILED)
            
            batch["completed_jobs"] = completed_count
            batch["failed_jobs"] = failed_count
            batch["progress"] = (completed_count + failed_count) / batch["total_jobs"]
            
            if failed_count == 0:
                batch["status"] = BatchStatus.COMPLETED
            elif completed_count == 0:
                batch["status"] = BatchStatus.FAILED
            else:
                batch["status"] = BatchStatus.COMPLETED  # Partial success
            
            batch["updated_at"] = datetime.now()
            
            logger.info(f"Batch {batch_id} completed: {completed_count} success, {failed_count} failed")
            
        except Exception as e:
            batch["status"] = BatchStatus.FAILED
            batch["updated_at"] = datetime.now()
            logger.error(f"Batch {batch_id} failed: {e}")
            raise
    
    async def process_job_with_semaphore(self, job: BatchJob):
        """Process a single job with semaphore control"""
        async with self.processing_semaphore:
            await self.process_job(job)
    
    async def process_job(self, job: BatchJob):
        """Process a single job"""
        job.status = BatchStatus.PROCESSING
        job.updated_at = datetime.now()
        
        try:
            logger.info(f"Processing job {job.job_id}: {job.file_path}")
            
            # Read and encode file
            async with aiofiles.open(job.file_path, 'rb') as f:
                content = await f.read()
                file_base64 = content.hex()  # Simplified encoding for demo
            
            # Get batch info for workflow type
            batch = batches[job.batch_id]
            workflow_type = batch["workflow_type"]
            
            # Start workflow via AI agent
            workflow_response = await self.http_client.post(
                f"{self.ai_agent_url}/workflow/start",
                json={
                    "workflow_type": workflow_type,
                    "pdf_file": file_base64
                }
            )
            
            if workflow_response.status_code != 200:
                raise Exception(f"Failed to start workflow: {workflow_response.text}")
            
            workflow_data = workflow_response.json()
            workflow_id = workflow_data["workflow_id"]
            
            # Monitor workflow progress
            job.progress = 0.1
            while True:
                status_response = await self.http_client.get(
                    f"{self.ai_agent_url}/workflow/{workflow_id}"
                )
                
                if status_response.status_code != 200:
                    raise Exception(f"Failed to get workflow status: {status_response.text}")
                
                status_data = status_response.json()
                
                if status_data["status"] == "completed":
                    job.status = BatchStatus.COMPLETED
                    job.result = status_data["results"]
                    job.progress = 1.0
                    break
                elif status_data["status"] == "failed":
                    raise Exception(f"Workflow failed: {status_data['message']}")
                
                # Update progress (simplified)
                job.progress = min(job.progress + 0.1, 0.9)
                job.updated_at = datetime.now()
                
                await asyncio.sleep(2)  # Poll every 2 seconds
            
            logger.info(f"Job {job.job_id} completed successfully")
            
        except Exception as e:
            job.status = BatchStatus.FAILED
            job.error = str(e)
            job.updated_at = datetime.now()
            logger.error(f"Job {job.job_id} failed: {e}")
    
    async def get_batch_info(self, batch_id: str) -> BatchInfo:
        """Get batch information"""
        if batch_id not in batches:
            raise Exception(f"Batch {batch_id} not found")
        
        batch = batches[batch_id]
        jobs = batch_jobs.get(batch_id, [])
        
        completed_count = sum(1 for job in jobs if job.status == BatchStatus.COMPLETED)
        failed_count = sum(1 for job in jobs if job.status == BatchStatus.FAILED)
        total_count = len(jobs)
        
        progress = completed_count / total_count if total_count > 0 else 0.0
        
        return BatchInfo(
            batch_id=batch_id,
            batch_name=batch["batch_name"],
            description=batch["description"],
            status=batch["status"],
            total_jobs=total_count,
            completed_jobs=completed_count,
            failed_jobs=failed_count,
            progress=progress,
            created_at=batch["created_at"],
            updated_at=batch["updated_at"],
            estimated_completion=batch.get("estimated_completion")
        )
    
    async def cancel_batch(self, batch_id: str):
        """Cancel a batch processing job"""
        if batch_id not in batches:
            raise Exception(f"Batch {batch_id} not found")
        
        batch = batches[batch_id]
        if batch["status"] in [BatchStatus.COMPLETED, BatchStatus.FAILED, BatchStatus.CANCELLED]:
            raise Exception(f"Cannot cancel batch in {batch['status']} status")
        
        batch["status"] = BatchStatus.CANCELLED
        batch["updated_at"] = datetime.now()
        
        logger.info(f"Batch {batch_id} cancelled")
    
    async def retry_failed_jobs(self, batch_id: str):
        """Retry failed jobs in a batch"""
        if batch_id not in batches:
            raise Exception(f"Batch {batch_id} not found")
        
        jobs = batch_jobs.get(batch_id, [])
        failed_jobs = [job for job in jobs if job.status == BatchStatus.FAILED]
        
        if not failed_jobs:
            raise Exception("No failed jobs to retry")
        
        # Reset failed jobs
        for job in failed_jobs:
            job.status = BatchStatus.PENDING
            job.error = None
            job.progress = 0.0
            job.updated_at = datetime.now()
        
        # Restart batch processing
        await self.process_batch(batch_id)
        
        logger.info(f"Retrying {len(failed_jobs)} failed jobs in batch {batch_id}")

    async def update_job_status_from_celery(self, job: BatchJob):
        if job.celery_task_id:
            status = get_task_status(job.celery_task_id)
            if status == 'SUCCESS':
                job.status = BatchStatus.COMPLETED
                job.result = get_task_result(job.celery_task_id)
                job.progress = 1.0
            elif status == 'FAILURE':
                job.status = BatchStatus.FAILED
                job.error = get_task_result(job.celery_task_id)
                job.progress = 1.0
            elif status == 'STARTED':
                job.status = BatchStatus.PROCESSING
                job.progress = 0.5
            elif status == 'PENDING':
                job.status = BatchStatus.PENDING
                job.progress = 0.0
            job.updated_at = datetime.now()

# Initialize batch processor
batch_processor = BatchProcessor()

@app.on_event("startup")
async def startup_event():
    """Initialize the batch processor service"""
    logger.info("Batch Processor Service starting up...")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await batch_processor.http_client.aclose()
    logger.info("Batch Processor Service shutting down...")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "batch-processor"}

@app.post("/batch/create")
async def create_batch(
    request: BatchRequest,
    background_tasks: BackgroundTasks
):
    """Create a new batch processing job"""
    try:
        # For demo purposes, we'll use a predefined list of files
        # In production, this would come from file uploads
        demo_files = [
            "./examples/datasheet1.pdf",
            "./examples/datasheet2.pdf",
            "./examples/datasheet3.pdf"
        ]
        
        batch_id = await batch_processor.create_batch(request, demo_files)
        
        # Start processing in background
        background_tasks.add_task(batch_processor.process_batch, batch_id)
        
        return {
            "batch_id": batch_id,
            "message": "Batch created and processing started",
            "total_jobs": len(demo_files)
        }
        
    except Exception as e:
        logger.error(f"Error creating batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch/upload")
async def upload_files_for_batch(
    request: BatchRequest,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...)
):
    """Upload files and create a batch processing job"""
    try:
        # Save uploaded files
        file_paths = []
        upload_dir = Path("./uploads")
        upload_dir.mkdir(exist_ok=True)
        
        for file in files:
            if not file.filename or not file.filename.lower().endswith('.pdf'):
                raise HTTPException(status_code=400, detail=f"File {file.filename} is not a PDF")
            
            file_path = upload_dir / f"{uuid.uuid4()}_{file.filename}"
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            file_paths.append(str(file_path))
        
        # Create batch
        batch_id = await batch_processor.create_batch(request, file_paths)
        
        # Start processing in background
        background_tasks.add_task(batch_processor.process_batch, batch_id)
        
        return {
            "batch_id": batch_id,
            "message": "Files uploaded and batch processing started",
            "total_jobs": len(file_paths),
            "uploaded_files": [file.filename for file in files]
        }
        
    except Exception as e:
        logger.error(f"Error uploading files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/batch/{batch_id}")
async def get_batch_status(batch_id: str):
    """Get batch status and progress"""
    try:
        batch_info = await batch_processor.get_batch_info(batch_id)
        return batch_info
    except Exception as e:
        logger.error(f"Error getting batch status: {e}")
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/batch/{batch_id}/jobs")
async def get_batch_jobs(batch_id: str):
    if batch_id not in batch_jobs:
        raise HTTPException(status_code=404, detail="Batch not found")
    jobs = batch_jobs[batch_id]
    # Update each job's status from Celery before returning
    for job in jobs:
        await batch_processor.update_job_status_from_celery(job)
    return [job.dict() for job in jobs]

@app.websocket("/ws/batch/{batch_id}")
async def websocket_batch_status(websocket: WebSocket, batch_id: str):
    await manager.connect(websocket)
    try:
        while True:
            if batch_id not in batch_jobs:
                await websocket.send_json({"error": "Batch not found"})
                break
            jobs = batch_jobs[batch_id]
            for job in jobs:
                await batch_processor.update_job_status_from_celery(job)
            # Send the full job list as JSON
            await websocket.send_json([job.dict() for job in jobs])
            await asyncio.sleep(2)  # Poll every 2 seconds
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/batch/{batch_id}/cancel")
async def cancel_batch(batch_id: str):
    """Cancel a batch processing job"""
    try:
        await batch_processor.cancel_batch(batch_id)
        return {"message": "Batch cancelled successfully"}
    except Exception as e:
        logger.error(f"Error cancelling batch: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/batch/{batch_id}/retry")
async def retry_failed_jobs(batch_id: str, background_tasks: BackgroundTasks):
    """Retry failed jobs in a batch"""
    try:
        background_tasks.add_task(batch_processor.retry_failed_jobs, batch_id)
        return {"message": "Retrying failed jobs"}
    except Exception as e:
        logger.error(f"Error retrying failed jobs: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/batches")
async def list_batches():
    """List all batches"""
    try:
        batch_list = []
        for batch_id in batches:
            batch_info = await batch_processor.get_batch_info(batch_id)
            batch_list.append(batch_info.dict())
        
        return {
            "batches": batch_list,
            "total": len(batch_list)
        }
    except Exception as e:
        logger.error(f"Error listing batches: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/batch/{batch_id}")
async def delete_batch(batch_id: str):
    """Delete a batch and its jobs"""
    try:
        if batch_id not in batches:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        # Remove batch and jobs
        del batches[batch_id]
        if batch_id in batch_jobs:
            del batch_jobs[batch_id]
        
        return {"message": "Batch deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8007) 