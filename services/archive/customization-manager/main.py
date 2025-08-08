from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
import json
import logging
from datetime import datetime
import uuid
from pathlib import Path
import aiofiles
import asyncio
import sqlite3
import os
from enum import Enum
import yaml
import shutil
from dataclasses import dataclass
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Customization Manager Service", version="1.0.0")

class ModelType(str, Enum):
    SPICE = "spice"
    VERILOG_A = "veriloga"
    VHDL_AMS = "vhdl_ams"
    CUSTOM = "custom"

class StandardType(str, Enum):
    IEEE = "ieee"
    JEDEC = "jedec"
    IEC = "iec"
    CUSTOM = "custom"
    FOUNDRY = "foundry"
    COMPANY = "company"

class DeviceCategory(str, Enum):
    TRANSISTOR = "transistor"
    DIODE = "diode"
    CAPACITOR = "capacitor"
    RESISTOR = "resistor"
    INDUCTOR = "inductor"
    AMPLIFIER = "amplifier"
    CONVERTER = "converter"
    SENSOR = "sensor"
    CUSTOM = "custom"

class CustomizationStatus(str, Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    REJECTED = "rejected"
    ARCHIVED = "archived"

class CustomModel(BaseModel):
    model_id: str
    name: str
    description: str
    model_type: ModelType
    device_category: DeviceCategory
    author: str
    version: str = "1.0.0"
    status: CustomizationStatus = CustomizationStatus.DRAFT
    parameters: Dict[str, Any] = {}
    equations: List[str] = []
    code: str = ""
    dependencies: List[str] = []
    tags: List[str] = []
    documentation: str = ""
    examples: List[Dict[str, Any]] = []
    validation_rules: List[Dict[str, Any]] = []
    created_at: datetime
    updated_at: datetime
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

class CustomStandard(BaseModel):
    standard_id: str
    name: str
    description: str
    standard_type: StandardType
    version: str = "1.0.0"
    status: CustomizationStatus = CustomizationStatus.DRAFT
    author: str
    rules: List[Dict[str, Any]] = []
    parameters: Dict[str, Any] = {}
    constraints: List[Dict[str, Any]] = []
    documentation: str = ""
    examples: List[Dict[str, Any]] = []
    created_at: datetime
    updated_at: datetime
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

class ModelTemplate(BaseModel):
    template_id: str
    name: str
    description: str
    model_type: ModelType
    device_category: DeviceCategory
    template_code: str
    parameters: List[Dict[str, Any]] = []
    placeholders: List[str] = []
    documentation: str = ""
    examples: List[Dict[str, Any]] = []
    created_at: datetime
    updated_at: datetime

class UserWorkspace(BaseModel):
    workspace_id: str
    user_id: str
    name: str
    description: str
    models: List[str] = []
    standards: List[str] = []
    templates: List[str] = []
    settings: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

class CustomizationRequest(BaseModel):
    request_id: str
    user_id: str
    request_type: str  # "model", "standard", "template"
    item_id: str
    action: str  # "create", "update", "delete", "approve", "reject"
    data: Dict[str, Any] = {}
    status: str = "pending"
    created_at: datetime
    processed_at: Optional[datetime] = None
    processed_by: Optional[str] = None
    comments: str = ""

class DatabaseManager:
    """Database manager for customization data"""
    
    def __init__(self, db_path: str = "/app/customization_data.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create custom models table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS custom_models (
                model_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                model_type TEXT NOT NULL,
                device_category TEXT NOT NULL,
                author TEXT NOT NULL,
                version TEXT NOT NULL,
                status TEXT NOT NULL,
                parameters TEXT,
                equations TEXT,
                code TEXT,
                dependencies TEXT,
                tags TEXT,
                documentation TEXT,
                examples TEXT,
                validation_rules TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                approved_by TEXT,
                approved_at TEXT
            )
        ''')
        
        # Create custom standards table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS custom_standards (
                standard_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                standard_type TEXT NOT NULL,
                version TEXT NOT NULL,
                status TEXT NOT NULL,
                author TEXT NOT NULL,
                rules TEXT,
                parameters TEXT,
                constraints TEXT,
                documentation TEXT,
                examples TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                approved_by TEXT,
                approved_at TEXT
            )
        ''')
        
        # Create model templates table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS model_templates (
                template_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                model_type TEXT NOT NULL,
                device_category TEXT NOT NULL,
                template_code TEXT NOT NULL,
                parameters TEXT,
                placeholders TEXT,
                documentation TEXT,
                examples TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        
        # Create user workspaces table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_workspaces (
                workspace_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                models TEXT,
                standards TEXT,
                templates TEXT,
                settings TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        
        # Create customization requests table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customization_requests (
                request_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                request_type TEXT NOT NULL,
                item_id TEXT NOT NULL,
                action TEXT NOT NULL,
                data TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                processed_at TEXT,
                processed_by TEXT,
                comments TEXT
            )
        ''')
        
        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_models_author ON custom_models (author)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_models_type ON custom_models (model_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_models_status ON custom_models (status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_standards_type ON custom_standards (standard_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_workspaces_user ON user_workspaces (user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_requests_user ON customization_requests (user_id)')
        
        conn.commit()
        conn.close()
    
    def save_custom_model(self, model: CustomModel) -> bool:
        """Save custom model to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO custom_models VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                model.model_id,
                model.name,
                model.description,
                model.model_type.value,
                model.device_category.value,
                model.author,
                model.version,
                model.status.value,
                json.dumps(model.parameters),
                json.dumps(model.equations),
                model.code,
                json.dumps(model.dependencies),
                json.dumps(model.tags),
                model.documentation,
                json.dumps(model.examples),
                json.dumps(model.validation_rules),
                model.created_at.isoformat(),
                model.updated_at.isoformat(),
                model.approved_by,
                model.approved_at.isoformat() if model.approved_at else None
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error saving custom model {model.name}: {e}")
            return False
    
    def save_custom_standard(self, standard: CustomStandard) -> bool:
        """Save custom standard to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO custom_standards VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                standard.standard_id,
                standard.name,
                standard.description,
                standard.standard_type.value,
                standard.version,
                standard.status.value,
                standard.author,
                json.dumps(standard.rules),
                json.dumps(standard.parameters),
                json.dumps(standard.constraints),
                standard.documentation,
                json.dumps(standard.examples),
                standard.created_at.isoformat(),
                standard.updated_at.isoformat(),
                standard.approved_by,
                standard.approved_at.isoformat() if standard.approved_at else None
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error saving custom standard {standard.name}: {e}")
            return False
    
    def save_model_template(self, template: ModelTemplate) -> bool:
        """Save model template to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO model_templates VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                template.template_id,
                template.name,
                template.description,
                template.model_type.value,
                template.device_category.value,
                template.template_code,
                json.dumps(template.parameters),
                json.dumps(template.placeholders),
                template.documentation,
                json.dumps(template.examples),
                template.created_at.isoformat(),
                template.updated_at.isoformat()
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error saving model template {template.name}: {e}")
            return False
    
    def get_custom_models(self, user_id: Optional[str] = None, 
                         model_type: Optional[ModelType] = None,
                         status: Optional[CustomizationStatus] = None,
                         limit: int = 100) -> List[CustomModel]:
        """Get custom models from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = "SELECT * FROM custom_models WHERE 1=1"
            params = []
            
            if user_id:
                query += " AND author = ?"
                params.append(user_id)
            
            if model_type:
                query += " AND model_type = ?"
                params.append(model_type.value)
            
            if status:
                query += " AND status = ?"
                params.append(status.value)
            
            query += " ORDER BY updated_at DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            models = []
            for row in rows:
                model = CustomModel(
                    model_id=row[0],
                    name=row[1],
                    description=row[2],
                    model_type=ModelType(row[3]),
                    device_category=DeviceCategory(row[4]),
                    author=row[5],
                    version=row[6],
                    status=CustomizationStatus(row[7]),
                    parameters=json.loads(row[8]) if row[8] else {},
                    equations=json.loads(row[9]) if row[9] else [],
                    code=row[10],
                    dependencies=json.loads(row[11]) if row[11] else [],
                    tags=json.loads(row[12]) if row[12] else [],
                    documentation=row[13],
                    examples=json.loads(row[14]) if row[14] else [],
                    validation_rules=json.loads(row[15]) if row[15] else [],
                    created_at=datetime.fromisoformat(row[16]),
                    updated_at=datetime.fromisoformat(row[17]),
                    approved_by=row[18],
                    approved_at=datetime.fromisoformat(row[19]) if row[19] else None
                )
                models.append(model)
            
            conn.close()
            return models
        except Exception as e:
            logger.error(f"Error getting custom models: {e}")
            return []
    
    def get_custom_standards(self, user_id: Optional[str] = None,
                           standard_type: Optional[StandardType] = None,
                           status: Optional[CustomizationStatus] = None,
                           limit: int = 100) -> List[CustomStandard]:
        """Get custom standards from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = "SELECT * FROM custom_standards WHERE 1=1"
            params = []
            
            if user_id:
                query += " AND author = ?"
                params.append(user_id)
            
            if standard_type:
                query += " AND standard_type = ?"
                params.append(standard_type.value)
            
            if status:
                query += " AND status = ?"
                params.append(status.value)
            
            query += " ORDER BY updated_at DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            standards = []
            for row in rows:
                standard = CustomStandard(
                    standard_id=row[0],
                    name=row[1],
                    description=row[2],
                    standard_type=StandardType(row[3]),
                    version=row[4],
                    status=CustomizationStatus(row[5]),
                    author=row[6],
                    rules=json.loads(row[7]) if row[7] else [],
                    parameters=json.loads(row[8]) if row[8] else {},
                    constraints=json.loads(row[9]) if row[9] else [],
                    documentation=row[10],
                    examples=json.loads(row[11]) if row[11] else [],
                    created_at=datetime.fromisoformat(row[12]),
                    updated_at=datetime.fromisoformat(row[13]),
                    approved_by=row[14],
                    approved_at=datetime.fromisoformat(row[15]) if row[15] else None
                )
                standards.append(standard)
            
            conn.close()
            return standards
        except Exception as e:
            logger.error(f"Error getting custom standards: {e}")
            return []

class ModelGenerator:
    """Model generator for creating custom models from templates"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        self.templates_path = Path("/app/templates")
        self.templates_path.mkdir(exist_ok=True)
    
    async def generate_model_from_template(self, template_id: str, 
                                         parameters: Dict[str, Any],
                                         user_id: str) -> Optional[CustomModel]:
        """Generate a custom model from a template"""
        try:
            # Get template (this would need to be implemented in DatabaseManager)
            # For now, create a placeholder template
            template = ModelTemplate(
                template_id=template_id,
                name="GaN HEMT Template",
                description="Template for GaN HEMT models",
                model_type=ModelType.SPICE,
                device_category=DeviceCategory.TRANSISTOR,
                template_code="""
.SUBCKT {model_name} D G S
* GaN HEMT Model
* Parameters: {parameters}
.param Vth={vth}
.param Kp={kp}
.param Lambda={lambda}
.param Rs={rs}
.param Rd={rd}
.param Cgs={cgs}
.param Cgd={cgd}
.param Cds={cds}

* Model equations
M1 D G S S GaN_Model W={w} L={l}
.model GaN_Model NMOS(LEVEL=1 VTO={vth} KP={kp} LAMBDA={lambda})

* Parasitics
Rs S S_int {rs}
Rd D D_int {rd}
Cgs G S_int {cgs}
Cgd G D_int {cgd}
Cds S_int D_int {cds}

.ENDS {model_name}
""",
                parameters=[
                    {"name": "vth", "type": "float", "default": 0.5, "description": "Threshold voltage"},
                    {"name": "kp", "type": "float", "default": 0.1, "description": "Transconductance parameter"},
                    {"name": "lambda", "type": "float", "default": 0.01, "description": "Channel length modulation"},
                    {"name": "w", "type": "float", "default": 1e-6, "description": "Channel width"},
                    {"name": "l", "type": "float", "default": 1e-6, "description": "Channel length"},
                    {"name": "rs", "type": "float", "default": 0.1, "description": "Source resistance"},
                    {"name": "rd", "type": "float", "default": 0.1, "description": "Drain resistance"},
                    {"name": "cgs", "type": "float", "default": 1e-12, "description": "Gate-source capacitance"},
                    {"name": "cgd", "type": "float", "default": 1e-12, "description": "Gate-drain capacitance"},
                    {"name": "cds", "type": "float", "default": 1e-12, "description": "Drain-source capacitance"}
                ],
                placeholders=["model_name", "parameters"],
                documentation="Template for GaN HEMT SPICE models",
                examples=[],
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            # Generate model code from template
            model_code = template.template_code
            for param_name, param_value in parameters.items():
                model_code = model_code.replace(f"{{{param_name}}}", str(param_value))
            
            # Create custom model
            model = CustomModel(
                model_id=str(uuid.uuid4()),
                name=f"{template.name} - {parameters.get('model_name', 'Custom')}",
                description=f"Generated from template: {template.name}",
                model_type=template.model_type,
                device_category=template.device_category,
                author=user_id,
                version="1.0.0",
                status=CustomizationStatus.DRAFT,
                parameters=parameters,
                equations=[],
                code=model_code,
                dependencies=[],
                tags=["generated", "template"],
                documentation=template.documentation,
                examples=template.examples,
                validation_rules=[],
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            # Save model
            self.db_manager.save_custom_model(model)
            return model
            
        except Exception as e:
            logger.error(f"Error generating model from template: {e}")
            return None

class StandardValidator:
    """Validator for custom standards"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def validate_model_against_standard(self, model: CustomModel, 
                                      standard: CustomStandard) -> Dict[str, Any]:
        """Validate a custom model against a custom standard"""
        results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "score": 100.0
        }
        
        try:
            # Check parameter compliance
            for rule in standard.rules:
                if rule.get("type") == "parameter_range":
                    param_name = rule.get("parameter")
                    min_val = rule.get("min_value")
                    max_val = rule.get("max_value")
                    
                    if param_name in model.parameters:
                        param_value = model.parameters[param_name]
                        if min_val is not None and param_value < min_val:
                            results["errors"].append(f"Parameter {param_name} below minimum {min_val}")
                            results["valid"] = False
                        elif max_val is not None and param_value > max_val:
                            results["errors"].append(f"Parameter {param_name} above maximum {max_val}")
                            results["valid"] = False
            
            # Check code compliance
            if standard.constraints:
                for constraint in standard.constraints:
                    if constraint.get("type") == "code_check":
                        # Simple code validation (in practice, use proper parsing)
                        if constraint.get("required_keywords"):
                            for keyword in constraint["required_keywords"]:
                                if keyword not in model.code:
                                    results["warnings"].append(f"Missing required keyword: {keyword}")
            
            # Calculate score
            if results["errors"]:
                results["score"] = max(0, 100 - len(results["errors"]) * 10)
            if results["warnings"]:
                results["score"] = max(0, results["score"] - len(results["warnings"]) * 5)
            
            return results
            
        except Exception as e:
            logger.error(f"Error validating model against standard: {e}")
            results["valid"] = False
            results["errors"].append(f"Validation error: {str(e)}")
            return results

# Initialize services
db_manager = DatabaseManager()
model_generator = ModelGenerator(db_manager)
standard_validator = StandardValidator(db_manager)

@app.on_event("startup")
async def startup_event():
    """Initialize the customization manager service"""
    logger.info("Customization Manager Service starting up...")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "customization-manager"}

# Custom Models API
@app.post("/models")
async def create_custom_model(model: CustomModel):
    """Create a new custom model"""
    try:
        model.model_id = str(uuid.uuid4())
        model.created_at = datetime.now()
        model.updated_at = datetime.now()
        
        if db_manager.save_custom_model(model):
            return {
                "success": True,
                "model_id": model.model_id,
                "message": "Custom model created successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save model")
    except Exception as e:
        logger.error(f"Error creating custom model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def get_custom_models(
    user_id: Optional[str] = None,
    model_type: Optional[ModelType] = None,
    status: Optional[CustomizationStatus] = None,
    limit: int = 100
):
    """Get custom models"""
    try:
        models = db_manager.get_custom_models(user_id, model_type, status, limit)
        return {
            "models": [model.dict() for model in models],
            "total": len(models)
        }
    except Exception as e:
        logger.error(f"Error getting custom models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/{model_id}")
async def get_custom_model(model_id: str):
    """Get specific custom model"""
    try:
        models = db_manager.get_custom_models(limit=1000)
        for model in models:
            if model.model_id == model_id:
                return model
        raise HTTPException(status_code=404, detail="Model not found")
    except Exception as e:
        logger.error(f"Error getting custom model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/models/{model_id}")
async def update_custom_model(model_id: str, model_update: Dict[str, Any]):
    """Update custom model"""
    try:
        models = db_manager.get_custom_models(limit=1000)
        for model in models:
            if model.model_id == model_id:
                # Update model fields
                for key, value in model_update.items():
                    if hasattr(model, key):
                        setattr(model, key, value)
                
                model.updated_at = datetime.now()
                
                if db_manager.save_custom_model(model):
                    return {"success": True, "message": "Model updated successfully"}
                else:
                    raise HTTPException(status_code=500, detail="Failed to update model")
        
        raise HTTPException(status_code=404, detail="Model not found")
    except Exception as e:
        logger.error(f"Error updating custom model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Custom Standards API
@app.post("/standards")
async def create_custom_standard(standard: CustomStandard):
    """Create a new custom standard"""
    try:
        standard.standard_id = str(uuid.uuid4())
        standard.created_at = datetime.now()
        standard.updated_at = datetime.now()
        
        if db_manager.save_custom_standard(standard):
            return {
                "success": True,
                "standard_id": standard.standard_id,
                "message": "Custom standard created successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save standard")
    except Exception as e:
        logger.error(f"Error creating custom standard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/standards")
async def get_custom_standards(
    user_id: Optional[str] = None,
    standard_type: Optional[StandardType] = None,
    status: Optional[CustomizationStatus] = None,
    limit: int = 100
):
    """Get custom standards"""
    try:
        standards = db_manager.get_custom_standards(user_id, standard_type, status, limit)
        return {
            "standards": [standard.dict() for standard in standards],
            "total": len(standards)
        }
    except Exception as e:
        logger.error(f"Error getting custom standards: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Model Generation API
@app.post("/generate")
async def generate_model_from_template(
    template_id: str,
    parameters: Dict[str, Any],
    user_id: str
):
    """Generate model from template"""
    try:
        model = await model_generator.generate_model_from_template(
            template_id, parameters, user_id
        )
        
        if model:
            return {
                "success": True,
                "model": model.dict(),
                "message": "Model generated successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to generate model")
    except Exception as e:
        logger.error(f"Error generating model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Validation API
@app.post("/validate")
async def validate_model_against_standard(
    model_id: str,
    standard_id: str
):
    """Validate model against standard"""
    try:
        # Get model and standard
        models = db_manager.get_custom_models(limit=1000)
        standards = db_manager.get_custom_standards(limit=1000)
        
        model = None
        standard = None
        
        for m in models:
            if m.model_id == model_id:
                model = m
                break
        
        for s in standards:
            if s.standard_id == standard_id:
                standard = s
                break
        
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        if not standard:
            raise HTTPException(status_code=404, detail="Standard not found")
        
        # Validate
        results = standard_validator.validate_model_against_standard(model, standard)
        
        return {
            "model_id": model_id,
            "standard_id": standard_id,
            "validation_results": results
        }
    except Exception as e:
        logger.error(f"Error validating model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Templates API
@app.get("/templates")
async def get_model_templates():
    """Get available model templates"""
    try:
        # This would need to be implemented in DatabaseManager
        # For now, return placeholder templates
        templates = [
            {
                "template_id": "gan_hemt_spice",
                "name": "GaN HEMT SPICE Template",
                "description": "Template for GaN HEMT SPICE models",
                "model_type": "spice",
                "device_category": "transistor",
                "parameters": [
                    {"name": "vth", "type": "float", "default": 0.5, "description": "Threshold voltage"},
                    {"name": "kp", "type": "float", "default": 0.1, "description": "Transconductance parameter"}
                ]
            },
            {
                "template_id": "gan_diode_spice",
                "name": "GaN Diode SPICE Template",
                "description": "Template for GaN diode SPICE models",
                "model_type": "spice",
                "device_category": "diode",
                "parameters": [
                    {"name": "is", "type": "float", "default": 1e-12, "description": "Saturation current"},
                    {"name": "n", "type": "float", "default": 1.0, "description": "Ideality factor"}
                ]
            }
        ]
        
        return {
            "templates": templates,
            "total": len(templates)
        }
    except Exception as e:
        logger.error(f"Error getting templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Export/Import API
@app.post("/export")
async def export_customizations(
    user_id: str,
    items: List[str],  # List of model/standard IDs
    format: str = "json"
):
    """Export customizations"""
    try:
        # Get models and standards
        models = db_manager.get_custom_models(user_id=user_id, limit=1000)
        standards = db_manager.get_custom_standards(user_id=user_id, limit=1000)
        
        # Filter by requested items
        export_data = {
            "models": [model.dict() for model in models if model.model_id in items],
            "standards": [standard.dict() for standard in standards if standard.standard_id in items],
            "export_date": datetime.now().isoformat(),
            "user_id": user_id
        }
        
        if format.lower() == "yaml":
            return {"data": yaml.dump(export_data, default_flow_style=False)}
        else:
            return {"data": json.dumps(export_data, indent=2)}
            
    except Exception as e:
        logger.error(f"Error exporting customizations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/import")
async def import_customizations(
    user_id: str,
    data: str,
    format: str = "json"
):
    """Import customizations"""
    try:
        # Parse data
        if format.lower() == "yaml":
            import_data = yaml.safe_load(data)
        else:
            import_data = json.loads(data)
        
        imported_count = 0
        
        # Import models
        for model_data in import_data.get("models", []):
            model_data["author"] = user_id  # Override author
            model_data["model_id"] = str(uuid.uuid4())  # Generate new ID
            model_data["created_at"] = datetime.now().isoformat()
            model_data["updated_at"] = datetime.now().isoformat()
            
            model = CustomModel(**model_data)
            if db_manager.save_custom_model(model):
                imported_count += 1
        
        # Import standards
        for standard_data in import_data.get("standards", []):
            standard_data["author"] = user_id  # Override author
            standard_data["standard_id"] = str(uuid.uuid4())  # Generate new ID
            standard_data["created_at"] = datetime.now().isoformat()
            standard_data["updated_at"] = datetime.now().isoformat()
            
            standard = CustomStandard(**standard_data)
            if db_manager.save_custom_standard(standard):
                imported_count += 1
        
        return {
            "success": True,
            "imported_count": imported_count,
            "message": f"Successfully imported {imported_count} items"
        }
        
    except Exception as e:
        logger.error(f"Error importing customizations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8012) 