from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from datetime import datetime
import json
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
import cv2
import numpy as np
from PIL import Image
import io
import base64
import re
from scipy import interpolate
from scipy.signal import savgol_filter

# Create FastAPI app
app = FastAPI(
    title="ESpice Image Service",
    description="Microservice for image processing and curve extraction",
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

# Configuration constants
BIN_SIZE = 0.01
MIN_GRID_SIZE = 5
MAX_GRID_SIZE = 50

# Pydantic models for request/response
class ColorDetectionRequest(BaseModel):
    min_pixel_count: int = 100
    include_hsv_values: bool = False

class CurveExtractionRequest(BaseModel):
    selected_colors: List[str]
    x_min: float = 0.0
    x_max: float = 10.0
    y_min: float = 0.0
    y_max: float = 20.0
    x_scale: float = 1.0
    y_scale: float = 1.0
    x_scale_type: str = "linear"
    y_scale_type: str = "linear"
    smoothing_window: int = 5

class GraphProcessingRequest(BaseModel):
    graph_type: str = "iv_curve"  # iv_curve, cv_curve, transfer_curve
    auto_detect_axes: bool = True
    min_curve_points: int = 10

class QualityValidationRequest(BaseModel):
    min_curve_length: int = 10
    max_noise_threshold: float = 0.1
    require_smoothness: bool = True

class ServiceResponse(BaseModel):
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None
    metadata: Dict[str, Any]

def create_metadata(processing_time: float, service: str = "image-service") -> Dict[str, Any]:
    """Create standardized metadata for service responses"""
    return {
        "processingTime": processing_time,
        "service": service,
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

# Color ranges in HSV
COLOR_RANGES = {
    "red": {"lower": [0, 100, 100], "upper": [10, 255, 255], "display_color": "#FF0000"},
    "red2": {"lower": [170, 100, 100], "upper": [180, 255, 255], "display_color": "#FF0000"},
    "blue": {"lower": [90, 100, 100], "upper": [130, 255, 255], "display_color": "#0000FF"},
    "green": {"lower": [40, 100, 100], "upper": [80, 255, 255], "display_color": "#00FF00"},
    "yellow": {"lower": [15, 100, 100], "upper": [40, 255, 255], "display_color": "#FFFF00"},
    "cyan": {"lower": [80, 100, 100], "upper": [100, 255, 255], "display_color": "#00FFFF"},
    "magenta": {"lower": [140, 100, 100], "upper": [170, 255, 255], "display_color": "#FF00FF"},
    "orange": {"lower": [5, 100, 100], "upper": [20, 255, 255], "display_color": "#FFA500"},
    "purple": {"lower": [125, 100, 100], "upper": [145, 255, 255], "display_color": "#800080"},
}

def detect_colors_in_image(image_bytes: bytes, min_pixel_count: int = 100, include_hsv_values: bool = False) -> List[Dict]:
    """Detect colors in image using HSV color space"""
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Failed to decode image")
        
        # Convert to HSV
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        detected_colors = []
        
        for color_name, color_range in COLOR_RANGES.items():
            lower = np.array(color_range["lower"])
            upper = np.array(color_range["upper"])
            
            # Create mask for this color
            mask = cv2.inRange(hsv, lower, upper)
            
            # Count pixels
            pixel_count = np.sum(mask > 0)
            
            if pixel_count >= min_pixel_count:
                color_data = {
                    "name": color_name,
                    "display_name": color_name.title(),
                    "color": color_range["display_color"],
                    "pixel_count": int(pixel_count),
                    "percentage": float(pixel_count / (img.shape[0] * img.shape[1]) * 100)
                }
                
                if include_hsv_values:
                    color_data.update({
                        "hsv_lower": color_range["lower"],
                        "hsv_upper": color_range["upper"]
                    })
                
                detected_colors.append(color_data)
        
        # Sort by pixel count (descending)
        detected_colors.sort(key=lambda x: x["pixel_count"], reverse=True)
        
        return detected_colors
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting colors: {str(e)}")

def extract_curves_from_image(
    image_bytes: bytes,
    selected_colors: List[str],
    x_min: float = 0.0,
    x_max: float = 10.0,
    y_min: float = 0.0,
    y_max: float = 20.0,
    x_scale: float = 1.0,
    y_scale: float = 1.0,
    x_scale_type: str = "linear",
    y_scale_type: str = "linear",
    smoothing_window: int = 5
) -> Dict[str, Any]:
    """Extract curves from image based on selected colors"""
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Failed to decode image")
        
        # Convert to HSV
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        curves = []
        
        for color_name in selected_colors:
            if color_name not in COLOR_RANGES:
                continue
            
            color_range = COLOR_RANGES[color_name]
            lower = np.array(color_range["lower"])
            upper = np.array(color_range["upper"])
            
            # Create mask for this color
            mask = cv2.inRange(hsv, lower, upper)
            
            # Find contours
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if contours:
                # Get the largest contour
                largest_contour = max(contours, key=cv2.contourArea)
                
                # Extract points from contour
                points = largest_contour.reshape(-1, 2)
                
                if len(points) > 0:
                    # Convert pixel coordinates to data coordinates
                    x_coords = points[:, 0].astype(float)
                    y_coords = points[:, 1].astype(float)
                    
                    # Normalize coordinates
                    x_norm = (x_coords - x_coords.min()) / (x_coords.max() - x_coords.min())
                    y_norm = (y_coords - y_coords.min()) / (y_coords.max() - y_coords.min())
                    
                    # Scale to data range
                    x_data = x_min + x_norm * (x_max - x_min)
                    y_data = y_max - y_norm * (y_max - y_min)  # Invert Y axis
                    
                    # Apply smoothing if requested
                    if smoothing_window > 1 and len(x_data) > smoothing_window:
                        try:
                            y_smooth = savgol_filter(y_data, smoothing_window, 2)
                        except:
                            y_smooth = y_data
                    else:
                        y_smooth = y_data
                    
                    # Create curve data
                    curve_points = []
                    for i in range(len(x_data)):
                        curve_points.append({
                            "x": float(x_data[i]),
                            "y": float(y_smooth[i]),
                            "label": f"{color_name}_{i}"
                        })
                    
                    curves.append({
                        "name": color_name,
                        "color": color_range["display_color"],
                        "points": curve_points,
                        "representation": f"Curve with {len(curve_points)} points"
                    })
        
        return {
            "curves": curves,
            "total_curves": len(curves),
            "image_dimensions": {
                "width": int(img.shape[1]),
                "height": int(img.shape[0])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting curves: {str(e)}")

def process_graph_image(
    image_bytes: bytes,
    graph_type: str = "iv_curve",
    auto_detect_axes: bool = True,
    min_curve_points: int = 10
) -> Dict[str, Any]:
    """Process graph image and extract relevant data"""
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Failed to decode image")
        
        # Detect colors first
        detected_colors = detect_colors_in_image(image_bytes, min_pixel_count=50)
        
        # Extract curves for all detected colors
        selected_colors = [color["name"] for color in detected_colors]
        
        # Default ranges based on graph type
        if graph_type == "iv_curve":
            x_min, x_max = 0.0, 10.0  # Voltage
            y_min, y_max = 0.0, 20.0  # Current
        elif graph_type == "cv_curve":
            x_min, x_max = 0.0, 20.0  # Voltage
            y_min, y_max = 0.0, 1000.0  # Capacitance
        elif graph_type == "transfer_curve":
            x_min, x_max = 0.0, 5.0  # Gate voltage
            y_min, y_max = 0.0, 10.0  # Drain current
        else:
            x_min, x_max = 0.0, 10.0
            y_min, y_max = 0.0, 20.0
        
        curves_data = extract_curves_from_image(
            image_bytes,
            selected_colors,
            x_min, x_max, y_min, y_max
        )
        
        # Filter curves by minimum points
        valid_curves = [curve for curve in curves_data["curves"] if len(curve["points"]) >= min_curve_points]
        
        return {
            "graph_type": graph_type,
            "detected_colors": detected_colors,
            "curves": valid_curves,
            "valid_curves_count": len(valid_curves),
            "image_dimensions": curves_data["image_dimensions"],
            "axes_range": {
                "x": {"min": x_min, "max": x_max},
                "y": {"min": y_min, "max": y_max}
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing graph: {str(e)}")

def validate_image_quality(
    image_bytes: bytes,
    min_curve_length: int = 10,
    max_noise_threshold: float = 0.1,
    require_smoothness: bool = True
) -> Dict[str, Any]:
    """Validate image quality for curve extraction"""
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Failed to decode image")
        
        # Basic image quality checks
        height, width = img.shape[:2]
        
        # Check image size
        size_ok = width >= 100 and height >= 100
        
        # Check for sufficient color variation
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        color_variance = np.var(gray)
        sufficient_variation = color_variance > 100
        
        # Detect colors and check curve potential
        detected_colors = detect_colors_in_image(image_bytes, min_pixel_count=min_curve_length)
        has_curves = len(detected_colors) > 0
        
        # Calculate quality score
        quality_score = 0.0
        if size_ok:
            quality_score += 0.3
        if sufficient_variation:
            quality_score += 0.3
        if has_curves:
            quality_score += 0.4
        
        quality_status = "excellent" if quality_score >= 0.8 else "good" if quality_score >= 0.6 else "poor"
        
        return {
            "quality_score": quality_score,
            "quality_status": quality_status,
            "image_size": {"width": width, "height": height},
            "size_adequate": size_ok,
            "sufficient_color_variation": sufficient_variation,
            "has_detectable_curves": has_curves,
            "detected_colors_count": len(detected_colors),
            "recommendations": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating image quality: {str(e)}")

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "ESpice Image Service", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "image-service",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/image/detect-colors")
async def detect_colors(file: UploadFile = File(...), request: Optional[ColorDetectionRequest] = None):
    """Detect colors in image"""
    if not file.filename or not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    start_time = datetime.now()
    
    try:
        image_bytes = await file.read()
        result = detect_colors_in_image(
            image_bytes,
            min_pixel_count=request.min_pixel_count if request else 100,
            include_hsv_values=request.include_hsv_values if request else False
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ServiceResponse(
            success=True,
            data={"colors": result, "count": len(result)},
            metadata=create_metadata(processing_time)
        )
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        return ServiceResponse(
            success=False,
            error=str(e),
            metadata=create_metadata(processing_time)
        )

@app.post("/api/image/extract-curves")
async def extract_curves(file: UploadFile = File(...), request: Optional[CurveExtractionRequest] = None):
    """Extract curves from image"""
    if not file.filename or not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    start_time = datetime.now()
    
    try:
        image_bytes = await file.read()
        
        if not request or not request.selected_colors:
            # Auto-detect colors if none specified
            detected_colors = detect_colors_in_image(image_bytes, min_pixel_count=50)
            selected_colors = [color["name"] for color in detected_colors]
        else:
            selected_colors = request.selected_colors
        
        result = extract_curves_from_image(
            image_bytes,
            selected_colors,
            x_min=request.x_min if request else 0.0,
            x_max=request.x_max if request else 10.0,
            y_min=request.y_min if request else 0.0,
            y_max=request.y_max if request else 20.0,
            x_scale=request.x_scale if request else 1.0,
            y_scale=request.y_scale if request else 1.0,
            x_scale_type=request.x_scale_type if request else "linear",
            y_scale_type=request.y_scale_type if request else "linear",
            smoothing_window=request.smoothing_window if request else 5
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

@app.post("/api/image/process-graph")
async def process_graph(file: UploadFile = File(...), request: Optional[GraphProcessingRequest] = None):
    """Process graph image and extract data"""
    if not file.filename or not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    start_time = datetime.now()
    
    try:
        image_bytes = await file.read()
        result = process_graph_image(
            image_bytes,
            graph_type=request.graph_type if request else "iv_curve",
            auto_detect_axes=request.auto_detect_axes if request else True,
            min_curve_points=request.min_curve_points if request else 10
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

@app.post("/api/image/validate-quality")
async def validate_quality(file: UploadFile = File(...), request: Optional[QualityValidationRequest] = None):
    """Validate image quality for processing"""
    if not file.filename or not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    start_time = datetime.now()
    
    try:
        image_bytes = await file.read()
        result = validate_image_quality(
            image_bytes,
            min_curve_length=request.min_curve_length if request else 10,
            max_noise_threshold=request.max_noise_threshold if request else 0.1,
            require_smoothness=request.require_smoothness if request else True
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
    uvicorn.run(app, host="0.0.0.0", port=8003) 