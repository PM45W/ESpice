from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import logging
from datetime import datetime
import uuid
from enum import Enum
from pathlib import Path
import aiofiles
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Version Control Service", version="1.0.0")

class VersionStatus(str, Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    DEPRECATED = "deprecated"

class ModelType(str, Enum):
    ASM_HEMT = "asm_hemt"
    MVSG = "mvsg"
    SI_MOSFET = "si_mosfet"
    CUSTOM = "custom"

class ModelVersion(BaseModel):
    version_id: str
    model_id: str
    version_number: str
    model_type: ModelType
    model_data: Dict[str, Any]
    parameters: Dict[str, Any]
    metadata: Dict[str, Any]
    status: VersionStatus
    created_at: datetime
    created_by: str
    description: str
    tags: List[str]
    checksum: str

class ModelInfo(BaseModel):
    model_id: str
    model_name: str
    model_type: ModelType
    description: str
    current_version: str
    total_versions: int
    created_at: datetime
    updated_at: datetime
    status: VersionStatus
    tags: List[str]

class CreateModelRequest(BaseModel):
    model_name: str
    model_type: ModelType
    description: str
    model_data: Dict[str, Any]
    parameters: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    created_by: str

class CreateVersionRequest(BaseModel):
    model_data: Dict[str, Any]
    parameters: Dict[str, Any]
    description: str
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    created_by: str

class UpdateModelRequest(BaseModel):
    model_name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None

# In-memory storage (in production, use database)
models: Dict[str, Dict[str, Any]] = {}
model_versions: Dict[str, List[ModelVersion]] = {}

class VersionControlManager:
    """Version control manager for SPICE models"""
    
    def __init__(self):
        self.storage_path = Path("/app/models")
        self.storage_path.mkdir(exist_ok=True)
    
    def calculate_checksum(self, model_data: Dict[str, Any]) -> str:
        """Calculate checksum for model data"""
        data_str = json.dumps(model_data, sort_keys=True)
        return hashlib.sha256(data_str.encode()).hexdigest()
    
    def generate_version_number(self, model_id: str) -> str:
        """Generate semantic version number"""
        versions = model_versions.get(model_id, [])
        if not versions:
            return "1.0.0"
        
        # Get the latest version number
        latest_version = max(versions, key=lambda v: v.version_number)
        major, minor, patch = map(int, latest_version.version_number.split('.'))
        
        # Increment patch version
        return f"{major}.{minor}.{patch + 1}"
    
    async def create_model(self, request: CreateModelRequest) -> str:
        """Create a new model"""
        model_id = str(uuid.uuid4())
        created_at = datetime.now()
        
        # Create initial version
        version_id = str(uuid.uuid4())
        checksum = self.calculate_checksum(request.model_data)
        
        version = ModelVersion(
            version_id=version_id,
            model_id=model_id,
            version_number="1.0.0",
            model_type=request.model_type,
            model_data=request.model_data,
            parameters=request.parameters,
            metadata=request.metadata or {},
            status=VersionStatus.DRAFT,
            created_at=created_at,
            created_by=request.created_by,
            description=request.description,
            tags=request.tags or [],
            checksum=checksum
        )
        
        # Store model info
        models[model_id] = {
            "model_id": model_id,
            "model_name": request.model_name,
            "model_type": request.model_type,
            "description": request.description,
            "current_version": "1.0.0",
            "total_versions": 1,
            "created_at": created_at,
            "updated_at": created_at,
            "status": VersionStatus.DRAFT,
            "tags": request.tags or []
        }
        
        # Store version
        model_versions[model_id] = [version]
        
        # Save to file system
        await self.save_model_to_file(model_id, version)
        
        logger.info(f"Created model {model_id} with version 1.0.0")
        return model_id
    
    async def create_version(self, model_id: str, request: CreateVersionRequest) -> str:
        """Create a new version of an existing model"""
        if model_id not in models:
            raise Exception(f"Model {model_id} not found")
        
        # Generate new version number
        version_number = self.generate_version_number(model_id)
        version_id = str(uuid.uuid4())
        created_at = datetime.now()
        
        # Calculate checksum
        checksum = self.calculate_checksum(request.model_data)
        
        # Create version
        version = ModelVersion(
            version_id=version_id,
            model_id=model_id,
            version_number=version_number,
            model_type=models[model_id]["model_type"],
            model_data=request.model_data,
            parameters=request.parameters,
            metadata=request.metadata or {},
            status=VersionStatus.DRAFT,
            created_at=created_at,
            created_by=request.created_by,
            description=request.description,
            tags=request.tags or [],
            checksum=checksum
        )
        
        # Add to versions
        model_versions[model_id].append(version)
        
        # Update model info
        models[model_id]["current_version"] = version_number
        models[model_id]["total_versions"] = len(model_versions[model_id])
        models[model_id]["updated_at"] = created_at
        
        # Save to file system
        await self.save_model_to_file(model_id, version)
        
        logger.info(f"Created version {version_number} for model {model_id}")
        return version_id
    
    async def save_model_to_file(self, model_id: str, version: ModelVersion):
        """Save model version to file system"""
        model_dir = self.storage_path / model_id
        model_dir.mkdir(exist_ok=True)
        
        version_file = model_dir / f"{version.version_number}.json"
        async with aiofiles.open(version_file, 'w') as f:
            await f.write(version.model_dump_json(indent=2))
        
        # Also save metadata
        metadata_file = model_dir / f"{version.version_number}_metadata.json"
        metadata = {
            "version_id": version.version_id,
            "version_number": version.version_number,
            "status": version.status,
            "created_at": version.created_at.isoformat(),
            "created_by": version.created_by,
            "description": version.description,
            "tags": version.tags,
            "checksum": version.checksum
        }
        async with aiofiles.open(metadata_file, 'w') as f:
            await f.write(json.dumps(metadata, indent=2))
    
    async def get_model_info(self, model_id: str) -> ModelInfo:
        """Get model information"""
        if model_id not in models:
            raise Exception(f"Model {model_id} not found")
        
        model = models[model_id]
        return ModelInfo(**model)
    
    async def get_model_versions(self, model_id: str) -> List[ModelVersion]:
        """Get all versions of a model"""
        if model_id not in model_versions:
            raise Exception(f"Model {model_id} not found")
        
        return model_versions[model_id]
    
    async def get_version(self, model_id: str, version_number: str) -> ModelVersion:
        """Get specific version of a model"""
        versions = await self.get_model_versions(model_id)
        
        for version in versions:
            if version.version_number == version_number:
                return version
        
        raise Exception(f"Version {version_number} not found for model {model_id}")
    
    async def update_version_status(self, model_id: str, version_number: str, status: VersionStatus):
        """Update version status"""
        version = await self.get_version(model_id, version_number)
        version.status = status
        version.updated_at = datetime.now()
        
        # Update file
        await self.save_model_to_file(model_id, version)
        
        logger.info(f"Updated status of version {version_number} to {status}")
    
    async def rollback_to_version(self, model_id: str, version_number: str):
        """Rollback model to a specific version"""
        target_version = await self.get_version(model_id, version_number)
        
        # Update model current version
        models[model_id]["current_version"] = version_number
        models[model_id]["updated_at"] = datetime.now()
        
        logger.info(f"Rolled back model {model_id} to version {version_number}")
    
    async def compare_versions(self, model_id: str, version1: str, version2: str) -> Dict[str, Any]:
        """Compare two versions of a model"""
        v1 = await self.get_version(model_id, version1)
        v2 = await self.get_version(model_id, version2)
        
        # Compare parameters
        param_diff = {}
        all_params = set(v1.parameters.keys()) | set(v2.parameters.keys())
        
        for param in all_params:
            val1 = v1.parameters.get(param)
            val2 = v2.parameters.get(param)
            
            if val1 != val2:
                param_diff[param] = {
                    "version1": val1,
                    "version2": val2,
                    "changed": True
                }
        
        return {
            "model_id": model_id,
            "version1": version1,
            "version2": version2,
            "parameter_differences": param_diff,
            "checksum1": v1.checksum,
            "checksum2": v2.checksum,
            "identical": v1.checksum == v2.checksum
        }
    
    async def search_models(self, query: str = None, model_type: ModelType = None, tags: List[str] = None) -> List[ModelInfo]:
        """Search models by various criteria"""
        results = []
        
        for model_id, model in models.items():
            # Apply filters
            if query and query.lower() not in model["model_name"].lower():
                continue
            
            if model_type and model["model_type"] != model_type:
                continue
            
            if tags and not any(tag in model["tags"] for tag in tags):
                continue
            
            results.append(ModelInfo(**model))
        
        return results

# Initialize version control manager
vc_manager = VersionControlManager()

@app.on_event("startup")
async def startup_event():
    """Initialize the version control service"""
    logger.info("Version Control Service starting up...")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "version-control"}

@app.post("/models")
async def create_model(request: CreateModelRequest):
    """Create a new model"""
    try:
        model_id = await vc_manager.create_model(request)
        return {
            "model_id": model_id,
            "message": "Model created successfully",
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Error creating model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def list_models(
    query: str = None,
    model_type: ModelType = None,
    tags: str = None
):
    """List all models with optional filtering"""
    try:
        tag_list = tags.split(',') if tags else None
        models_list = await vc_manager.search_models(query, model_type, tag_list)
        
        return {
            "models": [model.dict() for model in models_list],
            "total": len(models_list)
        }
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/{model_id}")
async def get_model(model_id: str):
    """Get model information"""
    try:
        model_info = await vc_manager.get_model_info(model_id)
        return model_info
    except Exception as e:
        logger.error(f"Error getting model: {e}")
        raise HTTPException(status_code=404, detail=str(e))

@app.put("/models/{model_id}")
async def update_model(model_id: str, request: UpdateModelRequest):
    """Update model metadata"""
    try:
        if model_id not in models:
            raise HTTPException(status_code=404, detail="Model not found")
        
        model = models[model_id]
        
        if request.model_name:
            model["model_name"] = request.model_name
        if request.description:
            model["description"] = request.description
        if request.tags:
            model["tags"] = request.tags
        
        model["updated_at"] = datetime.now()
        
        return {"message": "Model updated successfully"}
    except Exception as e:
        logger.error(f"Error updating model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/{model_id}/versions")
async def create_version(model_id: str, request: CreateVersionRequest):
    """Create a new version of a model"""
    try:
        version_id = await vc_manager.create_version(model_id, request)
        return {
            "version_id": version_id,
            "message": "Version created successfully"
        }
    except Exception as e:
        logger.error(f"Error creating version: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/{model_id}/versions")
async def get_model_versions(model_id: str):
    """Get all versions of a model"""
    try:
        versions = await vc_manager.get_model_versions(model_id)
        return {
            "model_id": model_id,
            "versions": [version.dict() for version in versions]
        }
    except Exception as e:
        logger.error(f"Error getting versions: {e}")
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/models/{model_id}/versions/{version_number}")
async def get_version(model_id: str, version_number: str):
    """Get specific version of a model"""
    try:
        version = await vc_manager.get_version(model_id, version_number)
        return version
    except Exception as e:
        logger.error(f"Error getting version: {e}")
        raise HTTPException(status_code=404, detail=str(e))

@app.put("/models/{model_id}/versions/{version_number}/status")
async def update_version_status(
    model_id: str, 
    version_number: str, 
    status: VersionStatus
):
    """Update version status"""
    try:
        await vc_manager.update_version_status(model_id, version_number, status)
        return {"message": "Version status updated successfully"}
    except Exception as e:
        logger.error(f"Error updating version status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/{model_id}/rollback/{version_number}")
async def rollback_model(model_id: str, version_number: str):
    """Rollback model to a specific version"""
    try:
        await vc_manager.rollback_to_version(model_id, version_number)
        return {"message": f"Model rolled back to version {version_number}"}
    except Exception as e:
        logger.error(f"Error rolling back model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/{model_id}/compare/{version1}/{version2}")
async def compare_versions(model_id: str, version1: str, version2: str):
    """Compare two versions of a model"""
    try:
        comparison = await vc_manager.compare_versions(model_id, version1, version2)
        return comparison
    except Exception as e:
        logger.error(f"Error comparing versions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/models/{model_id}")
async def delete_model(model_id: str):
    """Delete a model and all its versions"""
    try:
        if model_id not in models:
            raise HTTPException(status_code=404, detail="Model not found")
        
        # Remove model and versions
        del models[model_id]
        if model_id in model_versions:
            del model_versions[model_id]
        
        # Remove from file system
        model_dir = vc_manager.storage_path / model_id
        if model_dir.exists():
            import shutil
            shutil.rmtree(model_dir)
        
        return {"message": "Model deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008) 