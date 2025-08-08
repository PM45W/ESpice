from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import logging
from datetime import datetime
import uuid
from pathlib import Path
import aiofiles
import cv2
import numpy as np
from PIL import Image
import io
import base64
import re
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Media Processing Service", version="1.0.0", description="Consolidated image and table processing service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enums and Models
class GraphType(str, Enum):
    IV_CURVE = "iv_curve"
    CV_CURVE = "cv_curve"
    TRANSFER_CURVE = "transfer_curve"

class ParameterType(str, Enum):
    ELECTRICAL = "electrical"
    THERMAL = "thermal"
    PACKAGE = "package"

# Pydantic Models
class ColorDetectionRequest(BaseModel):
    min_pixel_count: int = 100
    include_hsv_values: bool = True

class CurveExtractionRequest(BaseModel):
    selected_colors: List[str] = ["red", "blue"]
    x_min: float = 0
    x_max: float = 10
    y_min: float = 0
    y_max: float = 20
    smoothing_factor: float = 0.1

class GraphProcessingRequest(BaseModel):
    graph_type: GraphType
    auto_detect_axes: bool = True
    color_sensitivity: float = 0.1

class TableData(BaseModel):
    headers: List[str]
    rows: List[List[str]]
    title: Optional[str] = None

class TableExtractionRequest(BaseModel):
    table_data: TableData
    extract_parameters: bool = True
    validate_data: bool = True

class Parameter(BaseModel):
    name: str
    value: float
    unit: str
    type: Optional[ParameterType] = None

class ParameterValidationRequest(BaseModel):
    parameters: List[Parameter]
    device_type: str = "gan_hemt"

class SpiceFormatRequest(BaseModel):
    parameters: List[Parameter]
    model_type: str = "asm_hemt"
    include_units: bool = True

# Color definitions for curve extraction
COLOR_RANGES = {
    "red": [(0, 50, 50), (10, 255, 255)],
    "blue": [(100, 50, 50), (130, 255, 255)],
    "green": [(40, 50, 50), (80, 255, 255)],
    "yellow": [(20, 50, 50), (30, 255, 255)],
    "cyan": [(80, 50, 50), (100, 255, 255)],
    "magenta": [(130, 50, 50), (170, 255, 255)],
    "orange": [(10, 50, 50), (20, 255, 255)],
    "purple": [(130, 50, 50), (160, 255, 255)]
}

# Semiconductor parameter patterns
PARAMETER_PATTERNS = {
    "V_th": {"pattern": r"V_th|Vth|threshold.*voltage", "unit": "V", "type": "electrical"},
    "R_ds_on": {"pattern": r"R_ds_on|Rds.*on|drain.*source.*resistance", "unit": "Ω", "type": "electrical"},
    "I_d_max": {"pattern": r"I_d_max|Id.*max|drain.*current", "unit": "A", "type": "electrical"},
    "V_ds_max": {"pattern": r"V_ds_max|Vds.*max|drain.*source.*voltage", "unit": "V", "type": "electrical"},
    "C_iss": {"pattern": r"C_iss|Ciss|input.*capacitance", "unit": "F", "type": "electrical"},
    "C_oss": {"pattern": r"C_oss|Coss|output.*capacitance", "unit": "F", "type": "electrical"},
    "C_rss": {"pattern": r"C_rss|Crss|reverse.*capacitance", "unit": "F", "type": "electrical"},
    "T_j_max": {"pattern": r"T_j_max|Tj.*max|junction.*temperature", "unit": "°C", "type": "thermal"},
    "R_th_jc": {"pattern": r"R_th_jc|Rth.*jc|thermal.*resistance", "unit": "°C/W", "type": "thermal"}
}

# Image Processing Functions
def detect_colors_in_image(image_array: np.ndarray, min_pixel_count: int = 100, include_hsv: bool = True) -> Dict[str, Any]:
    """Detect colors in an image using HSV color space"""
    # Convert to HSV
    hsv = cv2.cvtColor(image_array, cv2.COLOR_RGB2HSV)
    
    detected_colors = {}
    
    for color_name, (lower, upper) in COLOR_RANGES.items():
        # Create mask for color
        mask = cv2.inRange(hsv, np.array(lower), np.array(upper))
        pixel_count = np.sum(mask > 0)
        
        if pixel_count >= min_pixel_count:
            detected_colors[color_name] = {
                "pixel_count": int(pixel_count),
                "percentage": float(pixel_count / (image_array.shape[0] * image_array.shape[1]) * 100)
            }
            
            if include_hsv:
                # Calculate average HSV values for detected color
                color_pixels = hsv[mask > 0]
                if len(color_pixels) > 0:
                    avg_hsv = np.mean(color_pixels, axis=0)
                    detected_colors[color_name]["avg_hsv"] = {
                        "h": float(avg_hsv[0]),
                        "s": float(avg_hsv[1]),
                        "v": float(avg_hsv[2])
                    }
    
    return {
        "detected_colors": detected_colors,
        "total_colors": len(detected_colors),
        "image_size": {
            "width": image_array.shape[1],
            "height": image_array.shape[0]
        }
    }

def extract_curves_from_image(image_array: np.ndarray, selected_colors: List[str], 
                            x_range: tuple, y_range: tuple, smoothing: float = 0.1) -> Dict[str, Any]:
    """Extract curves from graph image"""
    hsv = cv2.cvtColor(image_array, cv2.COLOR_RGB2HSV)
    curves = {}
    
    for color_name in selected_colors:
        if color_name not in COLOR_RANGES:
            continue
            
        lower, upper = COLOR_RANGES[color_name]
        mask = cv2.inRange(hsv, np.array(lower), np.array(upper))
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Get largest contour (main curve)
            largest_contour = max(contours, key=cv2.contourArea)
            
            # Extract points
            points = largest_contour.reshape(-1, 2)
            
            # Sort points by x-coordinate
            points = points[points[:, 0].argsort()]
            
            # Apply smoothing
            if smoothing > 0:
                points = apply_smoothing(points, smoothing)
            
            # Scale to actual values
            x_scaled = scale_points(points[:, 0], 0, image_array.shape[1], x_range[0], x_range[1])
            y_scaled = scale_points(points[:, 1], image_array.shape[0], 0, y_range[0], y_range[1])  # Invert Y
            
            curves[color_name] = {
                "points": len(x_scaled),
                "x_values": x_scaled.tolist(),
                "y_values": y_scaled.tolist(),
                "color": color_name
            }
    
    return {
        "curves": curves,
        "total_curves": len(curves),
        "x_range": x_range,
        "y_range": y_range
    }

def apply_smoothing(points: np.ndarray, smoothing_factor: float) -> np.ndarray:
    """Apply smoothing to curve points"""
    if len(points) < 3:
        return points
    
    smoothed = points.copy()
    for i in range(1, len(points) - 1):
        smoothed[i] = points[i] * (1 - smoothing_factor) + \
                     (points[i-1] + points[i+1]) / 2 * smoothing_factor
    
    return smoothed

def scale_points(points: np.ndarray, old_min: float, old_max: float, new_min: float, new_max: float) -> np.ndarray:
    """Scale points from one range to another"""
    return (points - old_min) / (old_max - old_min) * (new_max - new_min) + new_min

def process_graph_type(image_array: np.ndarray, graph_type: GraphType, auto_detect: bool = True) -> Dict[str, Any]:
    """Process specific graph types with appropriate parameters"""
    # Detect colors first
    color_info = detect_colors_in_image(image_array)
    
    # Set default ranges based on graph type
    if graph_type == GraphType.IV_CURVE:
        x_range = (0, 20)  # Voltage
        y_range = (0, 10)  # Current
    elif graph_type == GraphType.CV_CURVE:
        x_range = (0, 20)  # Voltage
        y_range = (0, 1000)  # Capacitance
    elif graph_type == GraphType.TRANSFER_CURVE:
        x_range = (0, 10)  # Gate voltage
        y_range = (0, 5)   # Drain current
    else:
        x_range = (0, 10)
        y_range = (0, 10)
    
    # Extract curves
    curves = extract_curves_from_image(image_array, list(color_info["detected_colors"].keys()), x_range, y_range)
    
    return {
        "graph_type": graph_type.value,
        "color_detection": color_info,
        "curve_extraction": curves,
        "auto_detected_axes": auto_detect,
        "processing_timestamp": datetime.now().isoformat()
    }

# Table Processing Functions
def extract_parameters_from_table(table_data: TableData) -> List[Dict[str, Any]]:
    """Extract semiconductor parameters from table data"""
    parameters = []
    
    for row in table_data.rows:
        if len(row) >= 2:
            param_name = row[0].strip()
            param_value = row[1].strip()
            
            # Try to match parameter pattern
            for pattern_name, pattern_info in PARAMETER_PATTERNS.items():
                if re.search(pattern_info["pattern"], param_name, re.IGNORECASE):
                    # Extract numeric value
                    value_match = re.search(r"([\d.]+)", param_value)
                    if value_match:
                        try:
                            value = float(value_match.group(1))
                            parameters.append({
                                "name": pattern_name,
                                "original_name": param_name,
                                "value": value,
                                "unit": pattern_info["unit"],
                                "type": pattern_info["type"],
                                "confidence": 0.9
                            })
                        except ValueError:
                            continue
                    break
    
    return parameters

def validate_parameters(parameters: List[Parameter], device_type: str = "gan_hemt") -> Dict[str, Any]:
    """Validate semiconductor parameters against known ranges"""
    validation_results = []
    
    # Define validation ranges for GaN HEMT
    validation_ranges = {
        "V_th": {"min": 0.5, "max": 5.0, "unit": "V"},
        "R_ds_on": {"min": 0.01, "max": 1000, "unit": "mΩ"},
        "I_d_max": {"min": 0.1, "max": 100, "unit": "A"},
        "V_ds_max": {"min": 10, "max": 2000, "unit": "V"},
        "C_iss": {"min": 1e-12, "max": 1e-6, "unit": "F"},
        "C_oss": {"min": 1e-12, "max": 1e-6, "unit": "F"},
        "C_rss": {"min": 1e-12, "max": 1e-6, "unit": "F"},
        "T_j_max": {"min": 100, "max": 200, "unit": "°C"},
        "R_th_jc": {"min": 0.1, "max": 10, "unit": "°C/W"}
    }
    
    for param in parameters:
        validation = {
            "parameter": param.name,
            "value": param.value,
            "unit": param.unit,
            "is_valid": True,
            "issues": []
        }
        
        if param.name in validation_ranges:
            range_info = validation_ranges[param.name]
            
            # Check if value is within range
            if param.value < range_info["min"] or param.value > range_info["max"]:
                validation["is_valid"] = False
                validation["issues"].append(f"Value {param.value} {param.unit} is outside expected range ({range_info['min']}-{range_info['max']} {range_info['unit']})")
            
            # Check unit consistency
            if param.unit != range_info["unit"]:
                validation["issues"].append(f"Unit mismatch: expected {range_info['unit']}, got {param.unit}")
        
        validation_results.append(validation)
    
    return {
        "device_type": device_type,
        "total_parameters": len(parameters),
        "valid_parameters": sum(1 for v in validation_results if v["is_valid"]),
        "validation_results": validation_results
    }

def format_for_spice(parameters: List[Parameter], model_type: str = "asm_hemt", include_units: bool = True) -> Dict[str, Any]:
    """Format parameters for SPICE model generation"""
    spice_params = {}
    
    # Parameter mapping for ASM-HEMT model
    asm_mapping = {
        "V_th": "VTO",
        "R_ds_on": "RS",
        "I_d_max": "IDSS",
        "V_ds_max": "VDSMAX",
        "C_iss": "CGS",
        "C_oss": "CGD",
        "C_rss": "CDS"
    }
    
    for param in parameters:
        if param.name in asm_mapping:
            spice_name = asm_mapping[param.name]
            spice_params[spice_name] = {
                "value": param.value,
                "unit": param.unit if include_units else "",
                "description": f"{param.name} parameter"
            }
    
    return {
        "model_type": model_type,
        "parameters": spice_params,
        "total_parameters": len(spice_params),
        "format_timestamp": datetime.now().isoformat()
    }

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "media-processing-service", "timestamp": datetime.now()}

# Image Processing Endpoints
@app.post("/api/image/detect-colors")
async def detect_colors(file: UploadFile = File(...), request: str = Form("{}")):
    """Detect colors in uploaded image"""
    try:
        request_data = json.loads(request)
        min_pixel_count = request_data.get("min_pixel_count", 100)
        include_hsv = request_data.get("include_hsv_values", True)
        
        # Read image
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        image_array = np.array(image)
        
        # Detect colors
        result = detect_colors_in_image(image_array, min_pixel_count, include_hsv)
        
        return {
            "success": True,
            "filename": file.filename,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Color detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Color detection failed: {str(e)}")

@app.post("/api/image/extract-curves")
async def extract_curves(file: UploadFile = File(...), request: str = Form("{}")):
    """Extract curves from graph image"""
    try:
        request_data = json.loads(request)
        selected_colors = request_data.get("selected_colors", ["red", "blue"])
        x_range = (request_data.get("x_min", 0), request_data.get("x_max", 10))
        y_range = (request_data.get("y_min", 0), request_data.get("y_max", 20))
        smoothing = request_data.get("smoothing_factor", 0.1)
        
        # Read image
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        image_array = np.array(image)
        
        # Extract curves
        result = extract_curves_from_image(image_array, selected_colors, x_range, y_range, smoothing)
        
        return {
            "success": True,
            "filename": file.filename,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Curve extraction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Curve extraction failed: {str(e)}")

@app.post("/api/image/process-graph")
async def process_graph(file: UploadFile = File(...), request: str = Form("{}")):
    """Process specific graph types"""
    try:
        request_data = json.loads(request)
        graph_type = GraphType(request_data.get("graph_type", "iv_curve"))
        auto_detect = request_data.get("auto_detect_axes", True)
        
        # Read image
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        image_array = np.array(image)
        
        # Process graph
        result = process_graph_type(image_array, graph_type, auto_detect)
        
        return {
            "success": True,
            "filename": file.filename,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Graph processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Graph processing failed: {str(e)}")

# Table Processing Endpoints
@app.post("/api/table/extract-data")
async def extract_table_data(request: TableExtractionRequest):
    """Extract data from table"""
    try:
        result = {
            "table_info": {
                "title": request.table_data.title,
                "headers": request.table_data.headers,
                "row_count": len(request.table_data.rows)
            }
        }
        
        if request.extract_parameters:
            parameters = extract_parameters_from_table(request.table_data)
            result["extracted_parameters"] = parameters
            result["parameter_count"] = len(parameters)
        
        if request.validate_data and request.extract_parameters:
            param_objects = [Parameter(name=p["name"], value=p["value"], unit=p["unit"]) for p in result["extracted_parameters"]]
            validation = validate_parameters(param_objects)
            result["validation"] = validation
        
        return {
            "success": True,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Table extraction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Table extraction failed: {str(e)}")

@app.post("/api/table/validate-parameters")
async def validate_semiconductor_parameters(request: ParameterValidationRequest):
    """Validate semiconductor parameters"""
    try:
        result = validate_parameters(request.parameters, request.device_type)
        
        return {
            "success": True,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Parameter validation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Parameter validation failed: {str(e)}")

@app.post("/api/table/format-for-spice")
async def format_parameters_for_spice(request: SpiceFormatRequest):
    """Format parameters for SPICE model generation"""
    try:
        result = format_for_spice(request.parameters, request.model_type, request.include_units)
        
        return {
            "success": True,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"SPICE formatting failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"SPICE formatting failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8012) 