from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import logging
from datetime import datetime
import uuid
from pathlib import Path
import aiofiles
import asyncio
import aiohttp
import sqlite3
import os
from enum import Enum
import re
from urllib.parse import urljoin, urlparse
import hashlib
import time
from dataclasses import dataclass
import pandas as pd
import csv
import io
import httpx
import threading

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Data Processing Service", version="1.0.0", description="Consolidated web scraping and batch processing service")

# Add CORS middleware for frontend-backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enums and Models
class Manufacturer(str, Enum):
    INFINEON = "infineon"
    WOLFSPEED = "wolfspeed"
    QORVO = "qorvo"
    NXP = "nxp"
    TI = "ti"
    STMICRO = "stmicro"
    ROHM = "rohm"
    TOSHIBA = "toshiba"
    RENESAS = "renesas"
    EPC_CO = "epc_co"

class ProductCategory(str, Enum):
    GAN_POWER = "gan_power"
    GAN_RF = "gan_rf"
    GAN_DRIVER = "gan_driver"
    GAN_MODULE = "gan_module"
    GAN_DISCRETE = "gan_discrete"
    GAN_IC = "gan_ic"

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class WorkflowType(str, Enum):
    FULL_EXTRACTION = "full_extraction"
    QUICK_SCAN = "quick_scan"
    DATA_VALIDATION = "data_validation"

# Pydantic Models
class ScrapeRequest(BaseModel):
    manufacturer: Manufacturer
    category: Optional[ProductCategory] = None
    keywords: Optional[List[str]] = []
    max_products: Optional[int] = 50
    include_datasheets: Optional[bool] = True

class BatchRequest(BaseModel):
    batch_name: str
    workflow_type: WorkflowType = WorkflowType.FULL_EXTRACTION
    description: Optional[str] = ""

class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    created_at: datetime
    updated_at: datetime
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class ProductResponse(BaseModel):
    id: str
    part_number: str
    manufacturer: str
    category: str
    description: Optional[str] = ""
    datasheet_url: Optional[str] = ""
    image_url: Optional[str] = ""
    specifications: Optional[Dict[str, Any]] = {}
    scraped_at: datetime

# In-memory storage for batch processing
batch_jobs = {}
batch_status = {}
task_results = {}
task_status = {}

# Database setup
def init_db():
    """Initialize SQLite database for products and jobs"""
    os.makedirs("./data", exist_ok=True)
    conn = sqlite3.connect("./data/products.db")
    cursor = conn.cursor()
    
    # Products table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            part_number TEXT NOT NULL,
            manufacturer TEXT NOT NULL,
            category TEXT,
            description TEXT,
            datasheet_url TEXT,
            image_url TEXT,
            specifications TEXT,
            scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Jobs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            status TEXT NOT NULL,
            request_data TEXT,
            result_data TEXT,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# Web Scraping Functions
async def scrape_manufacturer_products(manufacturer: str, category: str = None, keywords: List[str] = None, max_products: int = 50) -> List[Dict]:
    """Mock scraping function - replace with actual implementation"""
    logger.info(f"Starting scrape for {manufacturer}, category: {category}, keywords: {keywords}")
    
    # Simulate scraping delay
    await asyncio.sleep(2)
    
    # Mock product data
    products = []
    for i in range(min(max_products, 10)):  # Limit to 10 for demo
        product = {
            "id": str(uuid.uuid4()),
            "part_number": f"{manufacturer.upper()}-{category or 'GEN'}-{i+1:03d}",
            "manufacturer": manufacturer,
            "category": category or "general",
            "description": f"Sample {manufacturer} {category or 'general'} product {i+1}",
            "datasheet_url": f"https://{manufacturer}.com/datasheets/product-{i+1}.pdf",
            "image_url": f"https://{manufacturer}.com/images/product-{i+1}.jpg",
            "specifications": {
                "voltage": f"{20 + i*5}V",
                "current": f"{1 + i*0.5}A",
                "package": "TO-220"
            },
            "scraped_at": datetime.now()
        }
        products.append(product)
    
    return products

def save_products_to_db(products: List[Dict]):
    """Save scraped products to database"""
    conn = sqlite3.connect("./data/products.db")
    cursor = conn.cursor()
    
    for product in products:
        cursor.execute("""
            INSERT OR REPLACE INTO products 
            (id, part_number, manufacturer, category, description, datasheet_url, image_url, specifications, scraped_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            product["id"],
            product["part_number"],
            product["manufacturer"],
            product["category"],
            product["description"],
            product.get("datasheet_url", ""),
            product.get("image_url", ""),
            json.dumps(product.get("specifications", {})),
            product["scraped_at"]
        ))
    
    conn.commit()
    conn.close()

def save_job_to_db(job_id: str, job_type: str, status: str, request_data: Dict = None, result_data: Dict = None, error_message: str = None):
    """Save job information to database"""
    conn = sqlite3.connect("./data/products.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT OR REPLACE INTO jobs 
        (id, type, status, request_data, result_data, error_message, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        job_id,
        job_type,
        status,
        json.dumps(request_data) if request_data else None,
        json.dumps(result_data) if result_data else None,
        error_message,
        datetime.now(),
        datetime.now()
    ))
    
    conn.commit()
    conn.close()

# Batch Processing Functions
def process_file_task(file_path: str, workflow_type: str) -> str:
    """Process a file in background thread"""
    task_id = str(uuid.uuid4())
    task_status[task_id] = "PENDING"
    
    def process():
        try:
            task_status[task_id] = "STARTED"
            logger.info(f"Processing file: {file_path} with workflow: {workflow_type}")
            
            # Simulate processing time
            time.sleep(3)
            
            task_status[task_id] = "SUCCESS"
            task_results[task_id] = {
                "result": "success",
                "file": file_path,
                "workflow_type": workflow_type,
                "processed_at": datetime.now().isoformat(),
                "extracted_data": {
                    "tables": 2,
                    "graphs": 1,
                    "specifications": 15
                }
            }
        except Exception as e:
            task_status[task_id] = "FAILURE"
            task_results[task_id] = {"error": str(e)}
    
    # Start processing in background thread
    thread = threading.Thread(target=process)
    thread.start()
    
    return task_id

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "data-processing-service", "timestamp": datetime.now()}

# Web Scraping Endpoints
@app.post("/scrape", response_model=JobResponse)
async def start_scraping(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """Start a new web scraping job"""
    job_id = str(uuid.uuid4())
    
    # Save initial job to database
    save_job_to_db(job_id, "scrape", "pending", request.dict())
    
    async def scraping_task():
        try:
            # Update job status
            save_job_to_db(job_id, "scrape", "running")
            
            # Perform scraping
            products = await scrape_manufacturer_products(
                request.manufacturer.value,
                request.category.value if request.category else None,
                request.keywords,
                request.max_products
            )
            
            # Save products to database
            save_products_to_db(products)
            
            # Update job with results
            result = {
                "products_found": len(products),
                "products": [p["id"] for p in products]
            }
            save_job_to_db(job_id, "scrape", "completed", request.dict(), result)
            
        except Exception as e:
            logger.error(f"Scraping job {job_id} failed: {str(e)}")
            save_job_to_db(job_id, "scrape", "failed", request.dict(), None, str(e))
    
    background_tasks.add_task(scraping_task)
    
    return JobResponse(
        job_id=job_id,
        status=JobStatus.PENDING,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )

@app.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str):
    """Get job status and results"""
    conn = sqlite3.connect("./data/products.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobResponse(
        job_id=row[0],
        status=JobStatus(row[2]),
        created_at=datetime.fromisoformat(row[6]),
        updated_at=datetime.fromisoformat(row[7]),
        result=json.loads(row[4]) if row[4] else None,
        error=row[5]
    )

@app.get("/jobs")
async def list_jobs():
    """List all jobs"""
    conn = sqlite3.connect("./data/products.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()
    
    jobs = []
    for row in rows:
        jobs.append({
            "job_id": row[0],
            "type": row[1],
            "status": row[2],
            "created_at": row[6],
            "updated_at": row[7]
        })
    
    return {"jobs": jobs}

@app.get("/products")
async def get_products(manufacturer: Optional[str] = None, category: Optional[str] = None, limit: int = 20, offset: int = 0):
    """Get scraped products with filtering"""
    conn = sqlite3.connect("./data/products.db")
    cursor = conn.cursor()
    
    query = "SELECT * FROM products WHERE 1=1"
    params = []
    
    if manufacturer:
        query += " AND manufacturer = ?"
        params.append(manufacturer)
    
    if category:
        query += " AND category = ?"
        params.append(category)
    
    query += " ORDER BY scraped_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    products = []
    for row in rows:
        products.append({
            "id": row[0],
            "part_number": row[1],
            "manufacturer": row[2],
            "category": row[3],
            "description": row[4],
            "datasheet_url": row[5],
            "image_url": row[6],
            "specifications": json.loads(row[7]) if row[7] else {},
            "scraped_at": row[8]
        })
    
    return {"products": products, "count": len(products)}

@app.get("/manufacturers")
async def get_manufacturers():
    """Get list of supported manufacturers"""
    return {"manufacturers": [m.value for m in Manufacturer]}

@app.get("/categories")
async def get_categories():
    """Get list of product categories"""
    return {"categories": [c.value for c in ProductCategory]}

# Batch Processing Endpoints
@app.post("/batch/create")
async def create_batch_job(request: BatchRequest):
    """Create a new batch job using demo files"""
    batch_id = str(uuid.uuid4())
    
    # Use demo files from examples directory
    demo_files = [
        "./examples/sample_datasheet_1.pdf",
        "./examples/sample_datasheet_2.pdf"
    ]
    
    batch_data = {
        "id": batch_id,
        "name": request.batch_name,
        "workflow_type": request.workflow_type.value,
        "description": request.description,
        "files": demo_files,
        "status": "created",
        "created_at": datetime.now().isoformat(),
        "jobs": []
    }
    
    # Process each file
    for file_path in demo_files:
        task_id = process_file_task(file_path, request.workflow_type.value)
        batch_data["jobs"].append({
            "task_id": task_id,
            "file": file_path,
            "status": "pending"
        })
    
    batch_jobs[batch_id] = batch_data
    batch_status[batch_id] = "processing"
    
    return {"batch_id": batch_id, "status": "created", "message": f"Batch job created with {len(demo_files)} demo files"}

@app.post("/batch/upload")
async def upload_batch_files(files: List[UploadFile] = File(...), request: str = "{}"):
    """Upload files and create a batch job"""
    try:
        request_data = json.loads(request)
        batch_name = request_data.get("batch_name", "Uploaded Batch")
        workflow_type = request_data.get("workflow_type", "full_extraction")
    except:
        batch_name = "Uploaded Batch"
        workflow_type = "full_extraction"
    
    batch_id = str(uuid.uuid4())
    
    # Create uploads directory
    upload_dir = Path("./temp")
    upload_dir.mkdir(exist_ok=True)
    
    # Save uploaded files
    saved_files = []
    for file in files:
        file_path = upload_dir / f"{batch_id}_{file.filename}"
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        saved_files.append(str(file_path))
    
    batch_data = {
        "id": batch_id,
        "name": batch_name,
        "workflow_type": workflow_type,
        "files": saved_files,
        "status": "created",
        "created_at": datetime.now().isoformat(),
        "jobs": []
    }
    
    # Process each uploaded file
    for file_path in saved_files:
        task_id = process_file_task(file_path, workflow_type)
        batch_data["jobs"].append({
            "task_id": task_id,
            "file": file_path,
            "status": "pending"
        })
    
    batch_jobs[batch_id] = batch_data
    batch_status[batch_id] = "processing"
    
    return {"batch_id": batch_id, "status": "created", "message": f"Batch job created with {len(files)} uploaded files"}

@app.get("/batch/{batch_id}")
async def get_batch_status(batch_id: str):
    """Get batch status and progress"""
    if batch_id not in batch_jobs:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    batch_data = batch_jobs[batch_id]
    
    # Update job statuses
    for job in batch_data["jobs"]:
        task_id = job["task_id"]
        job["status"] = task_status.get(task_id, "pending")
        if task_id in task_results:
            job["result"] = task_results[task_id]
    
    # Calculate overall progress
    total_jobs = len(batch_data["jobs"])
    completed_jobs = sum(1 for job in batch_data["jobs"] if job["status"] in ["SUCCESS", "FAILURE"])
    progress = (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0
    
    # Update batch status
    if progress == 100:
        batch_status[batch_id] = "completed"
        batch_data["status"] = "completed"
    elif any(job["status"] == "STARTED" for job in batch_data["jobs"]):
        batch_status[batch_id] = "processing"
        batch_data["status"] = "processing"
    
    return {
        "batch_id": batch_id,
        "status": batch_data["status"],
        "progress": progress,
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "batch_data": batch_data
    }

@app.get("/batches")
async def list_batches():
    """List all batches"""
    batches = []
    for batch_id, batch_data in batch_jobs.items():
        batches.append({
            "batch_id": batch_id,
            "name": batch_data["name"],
            "status": batch_data["status"],
            "created_at": batch_data["created_at"],
            "job_count": len(batch_data["jobs"])
        })
    
    return {"batches": batches}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8011)