from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import logging
from datetime import datetime
import uuid
from pathlib import Path
import aiofiles
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PDK Compatibility Checker Service", version="1.0.0")

class ValidationStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"
    UNKNOWN = "unknown"

class FoundryType(str, Enum):
    TSMC = "tsmc"
    GLOBALFOUNDRIES = "globalfoundries"
    SMIC = "smic"
    UMC = "umc"
    INTEL = "intel"
    SAMSUNG = "samsung"
    CUSTOM = "custom"

class ProcessNode(str, Enum):
    TSMC_7NM = "tsmc_7nm"
    TSMC_5NM = "tsmc_5nm"
    TSMC_3NM = "tsmc_3nm"
    GF_12LP = "gf_12lp"
    GF_7LP = "gf_7lp"
    SMIC_14NM = "smic_14nm"
    UMC_28NM = "umc_28nm"
    CUSTOM = "custom"

class DeviceType(str, Enum):
    NMOS = "nmos"
    PMOS = "pmos"
    HEMT = "hemt"
    BJT = "bjt"
    DIODE = "diode"
    RESISTOR = "resistor"
    CAPACITOR = "capacitor"

class PDKRule(BaseModel):
    rule_id: str
    rule_name: str
    rule_type: str  # parameter_range, device_limit, temperature_range, etc.
    device_type: DeviceType
    parameter_name: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    allowed_values: Optional[List[Any]] = None
    condition: Optional[str] = None  # JSON condition string
    severity: str = "error"  # error, warning, info
    description: str
    foundry: FoundryType
    process_node: ProcessNode

class ValidationResult(BaseModel):
    validation_id: str
    model_id: Optional[str] = None
    foundry: FoundryType
    process_node: ProcessNode
    device_type: DeviceType
    status: ValidationStatus
    total_rules: int
    passed_rules: int
    failed_rules: int
    warnings: int
    results: List[Dict[str, Any]]
    created_at: datetime

class PDKValidationRequest(BaseModel):
    model_id: Optional[str] = None
    foundry: FoundryType
    process_node: ProcessNode
    device_type: DeviceType
    parameters: Dict[str, float]
    temperature: Optional[float] = 25.0
    voltage_range: Optional[List[float]] = None
    custom_rules: Optional[List[PDKRule]] = None

class PDKRuleSet(BaseModel):
    ruleset_id: str
    foundry: FoundryType
    process_node: ProcessNode
    device_type: DeviceType
    rules: List[PDKRule]
    version: str
    description: str
    created_at: datetime

# In-memory storage (in production, use database)
pdk_rulesets: Dict[str, PDKRuleSet] = {}
validation_results: Dict[str, ValidationResult] = {}

class PDKChecker:
    """PDK compatibility checker engine"""
    
    def __init__(self):
        self.rules_path = Path("/app/pdk_rules")
        self.rules_path.mkdir(exist_ok=True)
        self.results_path = Path("/app/validation_results")
        self.results_path.mkdir(exist_ok=True)
        
        # Initialize default PDK rules
        self.initialize_default_rules()
    
    def initialize_default_rules(self):
        """Initialize default PDK rules for common foundries"""
        
        # TSMC 7nm rules
        tsmc_7nm_nmos_rules = [
            PDKRule(
                rule_id="tsmc_7nm_nmos_vth",
                rule_name="Threshold Voltage Range",
                rule_type="parameter_range",
                device_type=DeviceType.NMOS,
                parameter_name="vth",
                min_value=0.3,
                max_value=0.7,
                severity="error",
                description="Threshold voltage must be between 0.3V and 0.7V for TSMC 7nm NMOS",
                foundry=FoundryType.TSMC,
                process_node=ProcessNode.TSMC_7NM
            ),
            PDKRule(
                rule_id="tsmc_7nm_nmos_lmin",
                rule_name="Minimum Channel Length",
                rule_type="parameter_range",
                device_type=DeviceType.NMOS,
                parameter_name="l",
                min_value=0.007,  # 7nm
                max_value=1.0,
                severity="error",
                description="Channel length must be >= 7nm for TSMC 7nm",
                foundry=FoundryType.TSMC,
                process_node=ProcessNode.TSMC_7NM
            ),
            PDKRule(
                rule_id="tsmc_7nm_nmos_wmin",
                rule_name="Minimum Channel Width",
                rule_type="parameter_range",
                device_type=DeviceType.NMOS,
                parameter_name="w",
                min_value=0.014,  # 14nm
                max_value=100.0,
                severity="error",
                description="Channel width must be >= 14nm for TSMC 7nm",
                foundry=FoundryType.TSMC,
                process_node=ProcessNode.TSMC_7NM
            ),
            PDKRule(
                rule_id="tsmc_7nm_nmos_vds_max",
                rule_name="Maximum Drain-Source Voltage",
                rule_type="parameter_range",
                device_type=DeviceType.NMOS,
                parameter_name="vds_max",
                min_value=0.0,
                max_value=0.75,
                severity="error",
                description="Maximum VDS must be <= 0.75V for TSMC 7nm",
                foundry=FoundryType.TSMC,
                process_node=ProcessNode.TSMC_7NM
            )
        ]
        
        # TSMC 5nm rules
        tsmc_5nm_nmos_rules = [
            PDKRule(
                rule_id="tsmc_5nm_nmos_vth",
                rule_name="Threshold Voltage Range",
                rule_type="parameter_range",
                device_type=DeviceType.NMOS,
                parameter_name="vth",
                min_value=0.25,
                max_value=0.65,
                severity="error",
                description="Threshold voltage must be between 0.25V and 0.65V for TSMC 5nm NMOS",
                foundry=FoundryType.TSMC,
                process_node=ProcessNode.TSMC_5NM
            ),
            PDKRule(
                rule_id="tsmc_5nm_nmos_lmin",
                rule_name="Minimum Channel Length",
                rule_type="parameter_range",
                device_type=DeviceType.NMOS,
                parameter_name="l",
                min_value=0.005,  # 5nm
                max_value=1.0,
                severity="error",
                description="Channel length must be >= 5nm for TSMC 5nm",
                foundry=FoundryType.TSMC,
                process_node=ProcessNode.TSMC_5NM
            )
        ]
        
        # GlobalFoundries 12LP rules
        gf_12lp_nmos_rules = [
            PDKRule(
                rule_id="gf_12lp_nmos_vth",
                rule_name="Threshold Voltage Range",
                rule_type="parameter_range",
                device_type=DeviceType.NMOS,
                parameter_name="vth",
                min_value=0.4,
                max_value=0.8,
                severity="error",
                description="Threshold voltage must be between 0.4V and 0.8V for GF 12LP NMOS",
                foundry=FoundryType.GLOBALFOUNDRIES,
                process_node=ProcessNode.GF_12LP
            ),
            PDKRule(
                rule_id="gf_12lp_nmos_lmin",
                rule_name="Minimum Channel Length",
                rule_type="parameter_range",
                device_type=DeviceType.NMOS,
                parameter_name="l",
                min_value=0.012,  # 12nm
                max_value=1.0,
                severity="error",
                description="Channel length must be >= 12nm for GF 12LP",
                foundry=FoundryType.GLOBALFOUNDRIES,
                process_node=ProcessNode.GF_12LP
            )
        ]
        
        # Create rulesets
        rulesets = [
            PDKRuleSet(
                ruleset_id="tsmc_7nm_nmos",
                foundry=FoundryType.TSMC,
                process_node=ProcessNode.TSMC_7NM,
                device_type=DeviceType.NMOS,
                rules=tsmc_7nm_nmos_rules,
                version="1.0.0",
                description="TSMC 7nm NMOS device rules",
                created_at=datetime.now()
            ),
            PDKRuleSet(
                ruleset_id="tsmc_5nm_nmos",
                foundry=FoundryType.TSMC,
                process_node=ProcessNode.TSMC_5NM,
                device_type=DeviceType.NMOS,
                rules=tsmc_5nm_nmos_rules,
                version="1.0.0",
                description="TSMC 5nm NMOS device rules",
                created_at=datetime.now()
            ),
            PDKRuleSet(
                ruleset_id="gf_12lp_nmos",
                foundry=FoundryType.GLOBALFOUNDRIES,
                process_node=ProcessNode.GF_12LP,
                device_type=DeviceType.NMOS,
                rules=gf_12lp_nmos_rules,
                version="1.0.0",
                description="GlobalFoundries 12LP NMOS device rules",
                created_at=datetime.now()
            )
        ]
        
        # Store rulesets
        for ruleset in rulesets:
            pdk_rulesets[ruleset.ruleset_id] = ruleset
    
    def get_ruleset_key(self, foundry: FoundryType, process_node: ProcessNode, device_type: DeviceType) -> str:
        """Generate ruleset key"""
        return f"{foundry.value}_{process_node.value}_{device_type.value}"
    
    def get_applicable_rules(self, foundry: FoundryType, process_node: ProcessNode, device_type: DeviceType) -> List[PDKRule]:
        """Get applicable PDK rules for the given configuration"""
        ruleset_key = self.get_ruleset_key(foundry, process_node, device_type)
        
        if ruleset_key in pdk_rulesets:
            return pdk_rulesets[ruleset_key].rules
        
        # Return empty list if no rules found
        return []
    
    def evaluate_rule(self, rule: PDKRule, parameters: Dict[str, float], temperature: float = 25.0) -> Dict[str, Any]:
        """Evaluate a single PDK rule against parameters"""
        result = {
            "rule_id": rule.rule_id,
            "rule_name": rule.rule_name,
            "rule_type": rule.rule_type,
            "severity": rule.severity,
            "description": rule.description,
            "status": ValidationStatus.UNKNOWN,
            "message": "",
            "parameter_name": rule.parameter_name,
            "expected_range": None,
            "actual_value": None
        }
        
        try:
            if rule.rule_type == "parameter_range":
                if rule.parameter_name not in parameters:
                    result["status"] = ValidationStatus.WARNING
                    result["message"] = f"Parameter {rule.parameter_name} not found in model"
                    return result
                
                value = parameters[rule.parameter_name]
                result["actual_value"] = value
                result["expected_range"] = f"{rule.min_value} to {rule.max_value}"
                
                if rule.min_value is not None and value < rule.min_value:
                    result["status"] = ValidationStatus.FAIL
                    result["message"] = f"Value {value} is below minimum {rule.min_value}"
                elif rule.max_value is not None and value > rule.max_value:
                    result["status"] = ValidationStatus.FAIL
                    result["message"] = f"Value {value} is above maximum {rule.max_value}"
                else:
                    result["status"] = ValidationStatus.PASS
                    result["message"] = f"Value {value} is within acceptable range"
            
            elif rule.rule_type == "allowed_values":
                if rule.parameter_name not in parameters:
                    result["status"] = ValidationStatus.WARNING
                    result["message"] = f"Parameter {rule.parameter_name} not found in model"
                    return result
                
                value = parameters[rule.parameter_name]
                result["actual_value"] = value
                result["expected_range"] = f"Allowed values: {rule.allowed_values}"
                
                if value in rule.allowed_values:
                    result["status"] = ValidationStatus.PASS
                    result["message"] = f"Value {value} is in allowed values"
                else:
                    result["status"] = ValidationStatus.FAIL
                    result["message"] = f"Value {value} is not in allowed values {rule.allowed_values}"
            
            elif rule.rule_type == "temperature_range":
                result["actual_value"] = temperature
                result["expected_range"] = f"{rule.min_value} to {rule.max_value}"
                
                if rule.min_value is not None and temperature < rule.min_value:
                    result["status"] = ValidationStatus.FAIL
                    result["message"] = f"Temperature {temperature}°C is below minimum {rule.min_value}°C"
                elif rule.max_value is not None and temperature > rule.max_value:
                    result["status"] = ValidationStatus.FAIL
                    result["message"] = f"Temperature {temperature}°C is above maximum {rule.max_value}°C"
                else:
                    result["status"] = ValidationStatus.PASS
                    result["message"] = f"Temperature {temperature}°C is within acceptable range"
            
            elif rule.rule_type == "condition":
                # Evaluate custom condition (simplified)
                result["status"] = ValidationStatus.WARNING
                result["message"] = "Custom condition evaluation not implemented"
        
        except Exception as e:
            result["status"] = ValidationStatus.WARNING
            result["message"] = f"Error evaluating rule: {str(e)}"
        
        return result
    
    async def validate_model(
        self, 
        request: PDKValidationRequest
    ) -> ValidationResult:
        """Validate model against PDK rules"""
        validation_id = str(uuid.uuid4())
        created_at = datetime.now()
        
        # Get applicable rules
        rules = self.get_applicable_rules(request.foundry, request.process_node, request.device_type)
        
        # Add custom rules if provided
        if request.custom_rules:
            rules.extend(request.custom_rules)
        
        # Evaluate all rules
        results = []
        passed_count = 0
        failed_count = 0
        warning_count = 0
        
        for rule in rules:
            result = self.evaluate_rule(rule, request.parameters, request.temperature)
            results.append(result)
            
            if result["status"] == ValidationStatus.PASS:
                passed_count += 1
            elif result["status"] == ValidationStatus.FAIL:
                failed_count += 1
            elif result["status"] == ValidationStatus.WARNING:
                warning_count += 1
        
        # Determine overall status
        if failed_count > 0:
            status = ValidationStatus.FAIL
        elif warning_count > 0:
            status = ValidationStatus.WARNING
        else:
            status = ValidationStatus.PASS
        
        # Create validation result
        validation_result = ValidationResult(
            validation_id=validation_id,
            model_id=request.model_id,
            foundry=request.foundry,
            process_node=request.process_node,
            device_type=request.device_type,
            status=status,
            total_rules=len(rules),
            passed_rules=passed_count,
            failed_rules=failed_count,
            warnings=warning_count,
            results=results,
            created_at=created_at
        )
        
        # Store result
        validation_results[validation_id] = validation_result
        
        # Save to file
        await self.save_validation_result(validation_id, validation_result)
        
        logger.info(f"PDK validation {validation_id} completed: {status}")
        return validation_result
    
    async def save_validation_result(self, validation_id: str, result: ValidationResult):
        """Save validation result to file"""
        result_file = self.results_path / f"{validation_id}.json"
        
        result_data = {
            "validation_id": validation_id,
            "model_id": result.model_id,
            "foundry": result.foundry.value,
            "process_node": result.process_node.value,
            "device_type": result.device_type.value,
            "status": result.status.value,
            "total_rules": result.total_rules,
            "passed_rules": result.passed_rules,
            "failed_rules": result.failed_rules,
            "warnings": result.warnings,
            "results": result.results,
            "created_at": result.created_at.isoformat()
        }
        
        async with aiofiles.open(result_file, 'w') as f:
            await f.write(json.dumps(result_data, indent=2))
    
    async def create_custom_ruleset(self, ruleset: PDKRuleSet) -> str:
        """Create a custom PDK ruleset"""
        ruleset_id = ruleset.ruleset_id
        pdk_rulesets[ruleset_id] = ruleset
        
        # Save to file
        ruleset_file = self.rules_path / f"{ruleset_id}.json"
        ruleset_data = ruleset.dict()
        ruleset_data["created_at"] = ruleset.created_at.isoformat()
        
        async with aiofiles.open(ruleset_file, 'w') as f:
            await f.write(json.dumps(ruleset_data, indent=2))
        
        logger.info(f"Created custom ruleset {ruleset_id}")
        return ruleset_id
    
    def get_available_rulesets(self) -> List[Dict[str, Any]]:
        """Get list of available PDK rulesets"""
        return [
            {
                "ruleset_id": ruleset.ruleset_id,
                "foundry": ruleset.foundry.value,
                "process_node": ruleset.process_node.value,
                "device_type": ruleset.device_type.value,
                "version": ruleset.version,
                "description": ruleset.description,
                "rule_count": len(ruleset.rules),
                "created_at": ruleset.created_at.isoformat()
            }
            for ruleset in pdk_rulesets.values()
        ]

# Initialize PDK checker
pdk_checker = PDKChecker()

@app.on_event("startup")
async def startup_event():
    """Initialize the PDK checker service"""
    logger.info("PDK Compatibility Checker Service starting up...")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "pdk-checker"}

@app.post("/validate")
async def validate_pdk_compatibility(request: PDKValidationRequest):
    """Validate model against PDK rules"""
    try:
        result = await pdk_checker.validate_model(request)
        return result
    except Exception as e:
        logger.error(f"Error validating PDK compatibility: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/validate/{validation_id}")
async def get_validation_result(validation_id: str):
    """Get validation result"""
    try:
        if validation_id not in validation_results:
            raise HTTPException(status_code=404, detail="Validation result not found")
        
        return validation_results[validation_id]
    except Exception as e:
        logger.error(f"Error getting validation result: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/validate")
async def list_validations():
    """List all validation results"""
    try:
        return {
            "validations": [
                {
                    "validation_id": result.validation_id,
                    "model_id": result.model_id,
                    "foundry": result.foundry.value,
                    "process_node": result.process_node.value,
                    "device_type": result.device_type.value,
                    "status": result.status.value,
                    "total_rules": result.total_rules,
                    "passed_rules": result.passed_rules,
                    "failed_rules": result.failed_rules,
                    "created_at": result.created_at.isoformat()
                }
                for result in validation_results.values()
            ],
            "total": len(validation_results)
        }
    except Exception as e:
        logger.error(f"Error listing validations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rulesets")
async def get_rulesets():
    """Get available PDK rulesets"""
    try:
        return {
            "rulesets": pdk_checker.get_available_rulesets(),
            "total": len(pdk_checker.get_available_rulesets())
        }
    except Exception as e:
        logger.error(f"Error getting rulesets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rulesets/{foundry}/{process_node}/{device_type}")
async def get_ruleset_rules(foundry: FoundryType, process_node: ProcessNode, device_type: DeviceType):
    """Get rules for a specific PDK configuration"""
    try:
        rules = pdk_checker.get_applicable_rules(foundry, process_node, device_type)
        
        return {
            "foundry": foundry.value,
            "process_node": process_node.value,
            "device_type": device_type.value,
            "rules": [rule.dict() for rule in rules],
            "total_rules": len(rules)
        }
    except Exception as e:
        logger.error(f"Error getting ruleset rules: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rulesets")
async def create_custom_ruleset(ruleset: PDKRuleSet):
    """Create a custom PDK ruleset"""
    try:
        ruleset_id = await pdk_checker.create_custom_ruleset(ruleset)
        return {
            "ruleset_id": ruleset_id,
            "message": "Custom ruleset created successfully"
        }
    except Exception as e:
        logger.error(f"Error creating custom ruleset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/quick-check")
async def quick_pdk_check(
    foundry: FoundryType,
    process_node: ProcessNode,
    device_type: DeviceType,
    parameters: Dict[str, float]
):
    """Quick PDK compatibility check"""
    try:
        request = PDKValidationRequest(
            foundry=foundry,
            process_node=process_node,
            device_type=device_type,
            parameters=parameters
        )
        
        result = await pdk_checker.validate_model(request)
        
        return {
            "status": result.status.value,
            "passed_rules": result.passed_rules,
            "failed_rules": result.failed_rules,
            "total_rules": result.total_rules,
            "failed_parameters": [
                r["parameter_name"] for r in result.results 
                if r["status"] == ValidationStatus.FAIL
            ]
        }
    except Exception as e:
        logger.error(f"Error in quick PDK check: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/validate/{validation_id}")
async def delete_validation(validation_id: str):
    """Delete validation result"""
    try:
        if validation_id not in validation_results:
            raise HTTPException(status_code=404, detail="Validation result not found")
        
        del validation_results[validation_id]
        
        # Remove file
        result_file = pdk_checker.results_path / f"{validation_id}.json"
        if result_file.exists():
            result_file.unlink()
        
        return {"message": "Validation result deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting validation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010) 