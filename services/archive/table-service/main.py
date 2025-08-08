from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from datetime import datetime
import json
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
import re
import numpy as np

# Create FastAPI app
app = FastAPI(
    title="ESpice Table Service",
    description="Microservice for table data extraction and parameter validation",
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

# Pydantic models for request/response
class TableData(BaseModel):
    headers: List[str]
    rows: List[List[str]]
    title: Optional[str] = None
    page_number: Optional[int] = None

class DataExtractionRequest(BaseModel):
    table_data: TableData
    extract_parameters: bool = True
    validate_data: bool = True

class ParameterValidationRequest(BaseModel):
    parameters: List[Dict[str, Any]]
    device_type: Optional[str] = None
    validation_rules: Optional[Dict[str, Any]] = None

class SPICEFormatRequest(BaseModel):
    parameters: List[Dict[str, Any]]
    model_type: str = "asm_hemt"
    include_units: bool = True

class CrossReferenceRequest(BaseModel):
    parameters: List[Dict[str, Any]]
    reference_data: Dict[str, Any]
    tolerance: float = 0.1

class ServiceResponse(BaseModel):
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None
    metadata: Dict[str, Any]

def create_metadata(processing_time: float, service: str = "table-service") -> Dict[str, Any]:
    """Create standardized metadata for service responses"""
    return {
        "processingTime": processing_time,
        "service": service,
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

# Semiconductor parameter patterns
PARAMETER_PATTERNS = {
    # GaN HEMT parameters
    "v_th": {
        "patterns": [r"V_?TH[:\s]*([0-9.]+)\s*V", r"Threshold[:\s]*([0-9.]+)\s*V"],
        "unit": "V",
        "category": "electrical",
        "description": "Threshold voltage"
    },
    "r_ds_on": {
        "patterns": [r"R_?DS\(on\)[:\s]*([0-9.]+)\s*[mΩ]?", r"On-resistance[:\s]*([0-9.]+)\s*[mΩ]?"],
        "unit": "mΩ",
        "category": "electrical",
        "description": "Drain-source on-resistance"
    },
    "i_d_max": {
        "patterns": [r"I_?D[:\s]*([0-9.]+)\s*A", r"Drain current[:\s]*([0-9.]+)\s*A"],
        "unit": "A",
        "category": "electrical",
        "description": "Maximum drain current"
    },
    "v_ds_max": {
        "patterns": [r"V_?DS[:\s]*([0-9.]+)\s*V", r"Drain voltage[:\s]*([0-9.]+)\s*V"],
        "unit": "V",
        "category": "electrical",
        "description": "Maximum drain-source voltage"
    },
    "c_iss": {
        "patterns": [r"C_?iss[:\s]*([0-9.]+)\s*[pP]F", r"Input capacitance[:\s]*([0-9.]+)\s*[pP]F"],
        "unit": "pF",
        "category": "capacitance",
        "description": "Input capacitance"
    },
    "c_oss": {
        "patterns": [r"C_?oss[:\s]*([0-9.]+)\s*[pP]F", r"Output capacitance[:\s]*([0-9.]+)\s*[pP]F"],
        "unit": "pF",
        "category": "capacitance",
        "description": "Output capacitance"
    },
    "c_rss": {
        "patterns": [r"C_?rss[:\s]*([0-9.]+)\s*[pP]F", r"Reverse transfer capacitance[:\s]*([0-9.]+)\s*[pP]F"],
        "unit": "pF",
        "category": "capacitance",
        "description": "Reverse transfer capacitance"
    },
    "q_g": {
        "patterns": [r"Q_?G[:\s]*([0-9.]+)\s*[nN]C", r"Gate charge[:\s]*([0-9.]+)\s*[nN]C"],
        "unit": "nC",
        "category": "charge",
        "description": "Total gate charge"
    },
    "t_on": {
        "patterns": [r"t_?on[:\s]*([0-9.]+)\s*[nN]s", r"Turn-on time[:\s]*([0-9.]+)\s*[nN]s"],
        "unit": "ns",
        "category": "switching",
        "description": "Turn-on time"
    },
    "t_off": {
        "patterns": [r"t_?off[:\s]*([0-9.]+)\s*[nN]s", r"Turn-off time[:\s]*([0-9.]+)\s*[nN]s"],
        "unit": "ns",
        "category": "switching",
        "description": "Turn-off time"
    }
}

# Validation rules for semiconductor parameters
VALIDATION_RULES = {
    "v_th": {"min": 0.5, "max": 5.0, "unit": "V"},
    "r_ds_on": {"min": 0.001, "max": 1000.0, "unit": "mΩ"},
    "i_d_max": {"min": 0.001, "max": 1000.0, "unit": "A"},
    "v_ds_max": {"min": 10.0, "max": 2000.0, "unit": "V"},
    "c_iss": {"min": 0.1, "max": 10000.0, "unit": "pF"},
    "c_oss": {"min": 0.1, "max": 10000.0, "unit": "pF"},
    "c_rss": {"min": 0.01, "max": 1000.0, "unit": "pF"},
    "q_g": {"min": 0.1, "max": 1000.0, "unit": "nC"},
    "t_on": {"min": 1.0, "max": 10000.0, "unit": "ns"},
    "t_off": {"min": 1.0, "max": 10000.0, "unit": "ns"}
}

def extract_data_from_table(table_data: TableData, extract_parameters: bool = True) -> Dict[str, Any]:
    """Extract structured data from table"""
    try:
        result = {
            "table_info": {
                "title": table_data.title,
                "page_number": table_data.page_number,
                "headers": table_data.headers,
                "row_count": len(table_data.rows)
            },
            "extracted_data": [],
            "parameters": []
        }
        
        # Process each row
        for row_index, row in enumerate(table_data.rows):
            row_data = {
                "row_index": row_index,
                "values": row,
                "parsed_values": {}
            }
            
            # Try to parse numeric values
            for col_index, value in enumerate(row):
                if col_index < len(table_data.headers):
                    header = table_data.headers[col_index]
                    parsed_value = parse_value(value)
                    if parsed_value is not None:
                        row_data["parsed_values"][header] = parsed_value
            
            result["extracted_data"].append(row_data)
        
        # Extract parameters if requested
        if extract_parameters:
            result["parameters"] = extract_parameters_from_table(table_data)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting data from table: {str(e)}")

def parse_value(value: str) -> Optional[float]:
    """Parse numeric value from string"""
    try:
        # Remove common prefixes/suffixes
        cleaned = re.sub(r'[^\d.-]', '', value)
        if cleaned:
            return float(cleaned)
    except:
        pass
    return None

def extract_parameters_from_table(table_data: TableData) -> List[Dict[str, Any]]:
    """Extract semiconductor parameters from table"""
    parameters = []
    
    # Combine all text from table
    all_text = " ".join([table_data.title or ""] + table_data.headers + 
                       [cell for row in table_data.rows for cell in row])
    
    # Search for parameters using patterns
    for param_name, param_info in PARAMETER_PATTERNS.items():
        for pattern in param_info["patterns"]:
            matches = re.finditer(pattern, all_text, re.IGNORECASE)
            for match in matches:
                try:
                    value = float(match.group(1))
                    
                    # Convert units if necessary
                    if param_info["unit"] == "pF" and "pF" not in match.group(0):
                        value *= 1e-12  # Convert to F
                    elif param_info["unit"] == "nC" and "nC" not in match.group(0):
                        value *= 1e-9   # Convert to C
                    elif param_info["unit"] == "ns" and "ns" not in match.group(0):
                        value *= 1e-9   # Convert to s
                    
                    parameters.append({
                        "name": param_name,
                        "value": value,
                        "unit": param_info["unit"],
                        "category": param_info["category"],
                        "description": param_info["description"],
                        "confidence": 0.8,
                        "source": "table_extraction"
                    })
                    break  # Only take first match for each parameter
                except (ValueError, IndexError):
                    continue
    
    return parameters

def validate_parameters(parameters: List[Dict[str, Any]], device_type: Optional[str] = None) -> Dict[str, Any]:
    """Validate extracted parameters"""
    try:
        validation_results = {
            "valid_parameters": [],
            "invalid_parameters": [],
            "warnings": [],
            "overall_score": 0.0
        }
        
        total_params = len(parameters)
        valid_count = 0
        
        for param in parameters:
            param_name = param.get("name")
            value = param.get("value")
            unit = param.get("unit")
            
            if param_name in VALIDATION_RULES:
                rule = VALIDATION_RULES[param_name]
                
                # Check value range
                if rule["min"] <= value <= rule["max"]:
                    param["validation_status"] = "valid"
                    param["validation_score"] = 1.0
                    validation_results["valid_parameters"].append(param)
                    valid_count += 1
                else:
                    param["validation_status"] = "invalid"
                    param["validation_score"] = 0.0
                    param["validation_error"] = f"Value {value} {unit} outside valid range [{rule['min']}, {rule['max']}]"
                    validation_results["invalid_parameters"].append(param)
                    validation_results["warnings"].append(f"Parameter {param_name}: {param['validation_error']}")
            else:
                param["validation_status"] = "unknown"
                param["validation_score"] = 0.5
                validation_results["valid_parameters"].append(param)
                valid_count += 1
        
        # Calculate overall score
        if total_params > 0:
            validation_results["overall_score"] = valid_count / total_params
        
        return validation_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating parameters: {str(e)}")

def format_parameters_for_spice(parameters: List[Dict[str, Any]], model_type: str = "asm_hemt", include_units: bool = True) -> Dict[str, Any]:
    """Format parameters for SPICE model generation"""
    try:
        # SPICE parameter mappings for different model types
        spice_mappings = {
            "asm_hemt": {
                "v_th": "voff",
                "r_ds_on": "rd0",
                "i_d_max": "idss",
                "c_iss": "cgso",
                "c_oss": "cdso",
                "c_rss": "cgdo"
            },
            "mvsg": {
                "v_th": "vth",
                "r_ds_on": "rds",
                "i_d_max": "idmax",
                "c_iss": "ciss",
                "c_oss": "coss",
                "c_rss": "crss"
            },
            "si_mosfet": {
                "v_th": "vto",
                "r_ds_on": "rds",
                "i_d_max": "idmax",
                "c_iss": "ciss",
                "c_oss": "coss",
                "c_rss": "crss"
            }
        }
        
        mapping = spice_mappings.get(model_type, spice_mappings["asm_hemt"])
        
        formatted_params = {}
        conversion_factors = {
            "V": 1.0,
            "A": 1.0,
            "mΩ": 0.001,  # Convert to Ω
            "pF": 1e-12,  # Convert to F
            "nC": 1e-9,   # Convert to C
            "ns": 1e-9    # Convert to s
        }
        
        for param in parameters:
            param_name = param.get("name")
            value = param.get("value")
            unit = param.get("unit")
            
            if param_name in mapping:
                spice_name = mapping[param_name]
                
                # Convert value to SI units
                conversion_factor = conversion_factors.get(unit, 1.0)
                si_value = value * conversion_factor
                
                if include_units:
                    formatted_params[spice_name] = f"{si_value:.6e}"
                else:
                    formatted_params[spice_name] = si_value
        
        return {
            "model_type": model_type,
            "spice_parameters": formatted_params,
            "parameter_count": len(formatted_params),
            "units_converted": include_units
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error formatting parameters for SPICE: {str(e)}")

def cross_reference_parameters(parameters: List[Dict[str, Any]], reference_data: Dict[str, Any], tolerance: float = 0.1) -> Dict[str, Any]:
    """Cross-reference parameters with reference data"""
    try:
        comparison_results = {
            "matched_parameters": [],
            "unmatched_parameters": [],
            "deviations": [],
            "overall_match_score": 0.0
        }
        
        total_params = len(parameters)
        matched_count = 0
        
        for param in parameters:
            param_name = param.get("name")
            param_value = param.get("value")
            
            if param_name in reference_data:
                ref_value = reference_data[param_name]
                
                # Calculate relative deviation
                if ref_value != 0:
                    deviation = abs(param_value - ref_value) / abs(ref_value)
                    
                    if deviation <= tolerance:
                        param["match_status"] = "matched"
                        param["deviation"] = deviation
                        param["reference_value"] = ref_value
                        comparison_results["matched_parameters"].append(param)
                        matched_count += 1
                    else:
                        param["match_status"] = "deviated"
                        param["deviation"] = deviation
                        param["reference_value"] = ref_value
                        comparison_results["deviations"].append(param)
                else:
                    param["match_status"] = "no_reference"
                    comparison_results["unmatched_parameters"].append(param)
            else:
                param["match_status"] = "not_found"
                comparison_results["unmatched_parameters"].append(param)
        
        # Calculate overall match score
        if total_params > 0:
            comparison_results["overall_match_score"] = matched_count / total_params
        
        return comparison_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cross-referencing parameters: {str(e)}")

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "ESpice Table Service", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "table-service",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/table/extract-data")
async def extract_data(request: DataExtractionRequest):
    """Extract data from table"""
    start_time = datetime.now()
    
    try:
        result = extract_data_from_table(
            request.table_data,
            extract_parameters=request.extract_parameters
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ServiceResponse(
            success=True,
            data=result,
            metadata=create_metadata(processing_time)
        )
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        return ServiceResponse(
            success=False,
            error=str(e),
            metadata=create_metadata(processing_time)
        )

@app.post("/api/table/validate-parameters")
async def validate_parameters_endpoint(request: ParameterValidationRequest):
    """Validate extracted parameters"""
    start_time = datetime.now()
    
    try:
        result = validate_parameters(
            request.parameters,
            device_type=request.device_type
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ServiceResponse(
            success=True,
            data=result,
            metadata=create_metadata(processing_time)
        )
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        return ServiceResponse(
            success=False,
            error=str(e),
            metadata=create_metadata(processing_time)
        )

@app.post("/api/table/format-for-spice")
async def format_for_spice(request: SPICEFormatRequest):
    """Format parameters for SPICE model generation"""
    start_time = datetime.now()
    
    try:
        result = format_parameters_for_spice(
            request.parameters,
            model_type=request.model_type,
            include_units=request.include_units
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ServiceResponse(
            success=True,
            data=result,
            metadata=create_metadata(processing_time)
        )
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        return ServiceResponse(
            success=False,
            error=str(e),
            metadata=create_metadata(processing_time)
        )

@app.post("/api/table/cross-reference")
async def cross_reference(request: CrossReferenceRequest):
    """Cross-reference parameters with reference data"""
    start_time = datetime.now()
    
    try:
        result = cross_reference_parameters(
            request.parameters,
            request.reference_data,
            tolerance=request.tolerance
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ServiceResponse(
            success=True,
            data=result,
            metadata=create_metadata(processing_time)
        )
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        return ServiceResponse(
            success=False,
            error=str(e),
            metadata=create_metadata(processing_time)
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8004) 