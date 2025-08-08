from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import httpx
import asyncio
import json
import logging
from datetime import datetime
import uuid
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Agent Service", version="1.0.0")

class WorkflowStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class WorkflowRequest(BaseModel):
    pdf_url: Optional[str] = None
    pdf_file: Optional[str] = None  # Base64 encoded PDF
    workflow_type: str = "full_extraction"  # full_extraction, table_only, image_only
    parameters: Optional[Dict[str, Any]] = None

class WorkflowResponse(BaseModel):
    workflow_id: str
    status: WorkflowStatus
    message: str
    results: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

class WorkflowStep(BaseModel):
    step_id: str
    service: str
    endpoint: str
    status: WorkflowStatus
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

# In-memory storage for workflows (in production, use Redis or database)
workflows: Dict[str, Dict[str, Any]] = {}

# Service endpoints configuration
SERVICES = {
    "pdf": "http://pdf-service:8001",
    "image": "http://image-service:8002", 
    "table": "http://table-service:8003",
    "spice": "http://spice-service:8004"
}

class AIAgentOrchestrator:
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    async def health_check_services(self) -> Dict[str, bool]:
        """Check health of all microservices"""
        health_status = {}
        for service_name, service_url in SERVICES.items():
            try:
                response = await self.http_client.get(f"{service_url}/health")
                health_status[service_name] = response.status_code == 200
            except Exception as e:
                logger.error(f"Health check failed for {service_name}: {e}")
                health_status[service_name] = False
        return health_status
    
    async def execute_workflow_step(self, step: WorkflowStep) -> WorkflowStep:
        """Execute a single workflow step"""
        step.start_time = datetime.now()
        step.status = WorkflowStatus.RUNNING
        
        try:
            service_url = SERVICES.get(step.service)
            if not service_url:
                raise Exception(f"Unknown service: {step.service}")
            
            # Make request to the service
            response = await self.http_client.post(
                f"{service_url}{step.endpoint}",
                json=step.input_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                step.output_data = response.json()
                step.status = WorkflowStatus.COMPLETED
            else:
                step.status = WorkflowStatus.FAILED
                step.error = f"Service returned {response.status_code}: {response.text}"
                
        except Exception as e:
            step.status = WorkflowStatus.FAILED
            step.error = str(e)
            logger.error(f"Step {step.step_id} failed: {e}")
        
        step.end_time = datetime.now()
        return step
    
    async def execute_full_extraction_workflow(self, workflow_id: str, request: WorkflowRequest):
        """Execute the full document extraction workflow"""
        workflow = workflows[workflow_id]
        workflow["status"] = WorkflowStatus.RUNNING
        workflow["updated_at"] = datetime.now()
        
        try:
            # Step 1: PDF Processing
            pdf_step = WorkflowStep(
                step_id=f"{workflow_id}_pdf_1",
                service="pdf",
                endpoint="/extract-all",
                status=WorkflowStatus.PENDING,
                input_data={
                    "pdf_url": request.pdf_url,
                    "pdf_file": request.pdf_file
                }
            )
            
            workflow["steps"].append(pdf_step)
            pdf_step = await self.execute_workflow_step(pdf_step)
            
            if pdf_step.status != WorkflowStatus.COMPLETED:
                raise Exception(f"PDF processing failed: {pdf_step.error}")
            
            pdf_data = pdf_step.output_data
            
            # Step 2: Image Processing (if images found)
            if pdf_data.get("images"):
                image_step = WorkflowStep(
                    step_id=f"{workflow_id}_image_1",
                    service="image",
                    endpoint="/process-images",
                    status=WorkflowStatus.PENDING,
                    input_data={
                        "images": pdf_data["images"],
                        "extraction_type": "curves_and_graphs"
                    }
                )
                
                workflow["steps"].append(image_step)
                image_step = await self.execute_workflow_step(image_step)
                
                if image_step.status == WorkflowStatus.COMPLETED:
                    pdf_data["processed_images"] = image_step.output_data
            
            # Step 3: Table Processing (if tables found)
            if pdf_data.get("tables"):
                table_step = WorkflowStep(
                    step_id=f"{workflow_id}_table_1",
                    service="table",
                    endpoint="/extract-tables",
                    status=WorkflowStatus.PENDING,
                    input_data={
                        "tables": pdf_data["tables"],
                        "extraction_type": "parameters_and_data"
                    }
                )
                
                workflow["steps"].append(table_step)
                table_step = await self.execute_workflow_step(table_step)
                
                if table_step.status == WorkflowStatus.COMPLETED:
                    pdf_data["processed_tables"] = table_step.output_data
            
            # Step 4: SPICE Model Generation (if we have extracted data)
            if pdf_data.get("processed_tables") or pdf_data.get("processed_images"):
                spice_step = WorkflowStep(
                    step_id=f"{workflow_id}_spice_1",
                    service="spice",
                    endpoint="/generate-model",
                    status=WorkflowStatus.PENDING,
                    input_data={
                        "extracted_data": {
                            "tables": pdf_data.get("processed_tables", {}),
                            "images": pdf_data.get("processed_images", {}),
                            "text": pdf_data.get("text", "")
                        },
                        "model_type": "auto_detect"
                    }
                )
                
                workflow["steps"].append(spice_step)
                spice_step = await self.execute_workflow_step(spice_step)
                
                if spice_step.status == WorkflowStatus.COMPLETED:
                    pdf_data["spice_model"] = spice_step.output_data
            
            # Workflow completed successfully
            workflow["status"] = WorkflowStatus.COMPLETED
            workflow["results"] = pdf_data
            workflow["message"] = "Full extraction workflow completed successfully"
            
        except Exception as e:
            workflow["status"] = WorkflowStatus.FAILED
            workflow["message"] = f"Workflow failed: {str(e)}"
            logger.error(f"Workflow {workflow_id} failed: {e}")
        
        workflow["updated_at"] = datetime.now()
    
    async def execute_table_only_workflow(self, workflow_id: str, request: WorkflowRequest):
        """Execute table-only extraction workflow"""
        workflow = workflows[workflow_id]
        workflow["status"] = WorkflowStatus.RUNNING
        workflow["updated_at"] = datetime.now()
        
        try:
            # Step 1: PDF Processing (tables only)
            pdf_step = WorkflowStep(
                step_id=f"{workflow_id}_pdf_1",
                service="pdf",
                endpoint="/extract-tables",
                status=WorkflowStatus.PENDING,
                input_data={
                    "pdf_url": request.pdf_url,
                    "pdf_file": request.pdf_file
                }
            )
            
            workflow["steps"].append(pdf_step)
            pdf_step = await self.execute_workflow_step(pdf_step)
            
            if pdf_step.status != WorkflowStatus.COMPLETED:
                raise Exception(f"PDF table extraction failed: {pdf_step.error}")
            
            # Step 2: Table Processing
            table_step = WorkflowStep(
                step_id=f"{workflow_id}_table_1",
                service="table",
                endpoint="/extract-tables",
                status=WorkflowStatus.PENDING,
                input_data={
                    "tables": pdf_step.output_data.get("tables", []),
                    "extraction_type": "parameters_and_data"
                }
            )
            
            workflow["steps"].append(table_step)
            table_step = await self.execute_workflow_step(table_step)
            
            if table_step.status == WorkflowStatus.COMPLETED:
                workflow["status"] = WorkflowStatus.COMPLETED
                workflow["results"] = table_step.output_data
                workflow["message"] = "Table extraction workflow completed successfully"
            else:
                raise Exception(f"Table processing failed: {table_step.error}")
                
        except Exception as e:
            workflow["status"] = WorkflowStatus.FAILED
            workflow["message"] = f"Workflow failed: {str(e)}"
            logger.error(f"Workflow {workflow_id} failed: {e}")
        
        workflow["updated_at"] = datetime.now()
    
    async def execute_image_only_workflow(self, workflow_id: str, request: WorkflowRequest):
        """Execute image-only extraction workflow"""
        workflow = workflows[workflow_id]
        workflow["status"] = WorkflowStatus.RUNNING
        workflow["updated_at"] = datetime.now()
        
        try:
            # Step 1: PDF Processing (images only)
            pdf_step = WorkflowStep(
                step_id=f"{workflow_id}_pdf_1",
                service="pdf",
                endpoint="/extract-images",
                status=WorkflowStatus.PENDING,
                input_data={
                    "pdf_url": request.pdf_url,
                    "pdf_file": request.pdf_file
                }
            )
            
            workflow["steps"].append(pdf_step)
            pdf_step = await self.execute_workflow_step(pdf_step)
            
            if pdf_step.status != WorkflowStatus.COMPLETED:
                raise Exception(f"PDF image extraction failed: {pdf_step.error}")
            
            # Step 2: Image Processing
            image_step = WorkflowStep(
                step_id=f"{workflow_id}_image_1",
                service="image",
                endpoint="/process-images",
                status=WorkflowStatus.PENDING,
                input_data={
                    "images": pdf_step.output_data.get("images", []),
                    "extraction_type": "curves_and_graphs"
                }
            )
            
            workflow["steps"].append(image_step)
            image_step = await self.execute_workflow_step(image_step)
            
            if image_step.status == WorkflowStatus.COMPLETED:
                workflow["status"] = WorkflowStatus.COMPLETED
                workflow["results"] = image_step.output_data
                workflow["message"] = "Image extraction workflow completed successfully"
            else:
                raise Exception(f"Image processing failed: {image_step.error}")
                
        except Exception as e:
            workflow["status"] = WorkflowStatus.FAILED
            workflow["message"] = f"Workflow failed: {str(e)}"
            logger.error(f"Workflow {workflow_id} failed: {e}")
        
        workflow["updated_at"] = datetime.now()

# Initialize orchestrator
orchestrator = AIAgentOrchestrator()

@app.on_event("startup")
async def startup_event():
    """Initialize the AI agent service"""
    logger.info("AI Agent Service starting up...")
    
    # Health check all services
    health_status = await orchestrator.health_check_services()
    logger.info(f"Service health status: {health_status}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await orchestrator.http_client.aclose()
    logger.info("AI Agent Service shutting down...")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ai-agent"}

@app.post("/workflow/start", response_model=WorkflowResponse)
async def start_workflow(request: WorkflowRequest, background_tasks: BackgroundTasks):
    """Start a new workflow"""
    workflow_id = str(uuid.uuid4())
    created_at = datetime.now()
    
    # Initialize workflow
    workflows[workflow_id] = {
        "workflow_id": workflow_id,
        "status": WorkflowStatus.PENDING,
        "message": "Workflow initialized",
        "results": None,
        "created_at": created_at,
        "updated_at": created_at,
        "steps": [],
        "request": request.dict()
    }
    
    # Start workflow execution in background
    if request.workflow_type == "full_extraction":
        background_tasks.add_task(
            orchestrator.execute_full_extraction_workflow, 
            workflow_id, 
            request
        )
    elif request.workflow_type == "table_only":
        background_tasks.add_task(
            orchestrator.execute_table_only_workflow, 
            workflow_id, 
            request
        )
    elif request.workflow_type == "image_only":
        background_tasks.add_task(
            orchestrator.execute_image_only_workflow, 
            workflow_id, 
            request
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unknown workflow type: {request.workflow_type}")
    
    return WorkflowResponse(
        workflow_id=workflow_id,
        status=WorkflowStatus.PENDING,
        message="Workflow started",
        results=None,
        created_at=created_at,
        updated_at=created_at
    )

@app.get("/workflow/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow_status(workflow_id: str):
    """Get workflow status and results"""
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow = workflows[workflow_id]
    return WorkflowResponse(**workflow)

@app.get("/workflow/{workflow_id}/steps")
async def get_workflow_steps(workflow_id: str):
    """Get detailed workflow steps"""
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return {
        "workflow_id": workflow_id,
        "steps": workflows[workflow_id]["steps"]
    }

@app.get("/workflows")
async def list_workflows():
    """List all workflows"""
    return {
        "workflows": [
            {
                "workflow_id": wf["workflow_id"],
                "status": wf["status"],
                "workflow_type": wf["request"].get("workflow_type"),
                "created_at": wf["created_at"],
                "updated_at": wf["updated_at"]
            }
            for wf in workflows.values()
        ]
    }

@app.delete("/workflow/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete a workflow"""
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    del workflows[workflow_id]
    return {"message": "Workflow deleted successfully"}

@app.get("/services/health")
async def get_services_health():
    """Get health status of all microservices"""
    health_status = await orchestrator.health_check_services()
    return {
        "ai_agent": "healthy",
        "microservices": health_status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005) 