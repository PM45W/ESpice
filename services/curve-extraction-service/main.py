import os
import sys
import cv2
import numpy as np
from scipy.signal import savgol_filter
from collections import defaultdict
import logging
import math
import json
import base64
from io import BytesIO
from PIL import Image
import matplotlib
matplotlib.use('Agg')
from matplotlib.figure import Figure
from matplotlib.backends.backend_pdf import PdfPages
from datetime import datetime
import requests
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Add the legacy algorithm path
sys.path.append(os.path.join(os.path.dirname(__file__), 'legacy_algorithm'))

# Configuration
BIN_SIZE = 0.01
MIN_GRID_SIZE = 5
MAX_GRID_SIZE = 50
SMOOTH_POLYORDER = 3
MIN_VALID_BIN_COUNT = 60

# Color ranges and mappings (from legacy algorithm)
color_ranges = {
    'red': ((0, 100, 100), (10, 255, 255)),
    'red2': ((170, 100, 100), (180, 255, 255)),
    'blue': ((90, 100, 100), (130, 255, 255)),
    'green': ((40, 100, 100), (80, 255, 255)),
    'yellow': ((15, 100, 100), (40, 255, 255)),
    'cyan': ((80, 100, 100), (100, 255, 255)),
    'magenta': ((140, 100, 100), (170, 255, 255)),
    'orange': ((5, 100, 100), (20, 255, 255)),
    'purple': ((125, 100, 100), (145, 255, 255))
}

display_colors = {
    'red': '#FF0000',      # Red
    'red2': '#FF0000',     # Red (alternative)
    'blue': '#0000FF',     # Blue
    'green': '#00FF00',    # Green
    'yellow': '#FFFF00',   # Yellow
    'cyan': '#00FFFF',     # Cyan
    'magenta': '#FF00FF',  # Magenta
    'orange': '#FFA500',   # Orange
    'purple': '#800080'    # Purple
}

color_to_base = {
    'red': 'red',
    'red2': 'red',
    'green': 'green',
    'blue': 'blue',
    'yellow': 'yellow',
    'cyan': 'cyan',
    'magenta': 'magenta',
    'orange': 'orange',
    'purple': 'purple'
}

# Graph type presets
GRAPH_PRESETS = {
    'output': {
        'x_axis': 'Vds', 'y_axis': 'Id', 'third_col': 'Vgs',
        'x_min': 0, 'x_max': 3, 'y_min': 0, 'y_max': 2.75,
        'x_scale': 1, 'y_scale': 10,
        'color_reps': {'red': 5, 'blue': 2, 'green': 4, 'yellow': 3},
        'output_filename': 'output_characteristics',
        'x_scale_type': 'linear',
        'y_scale_type': 'linear'
    },
    'transfer': {
        'x_axis': 'Vgs', 'y_axis': 'Id', 'third_col': 'Temperature',
        'x_min': 0, 'x_max': 5, 'y_min': 0, 'y_max': 2.75,
        'x_scale': 1, 'y_scale': 10,
        'color_reps': {'red': 25, 'blue': 125},
        'output_filename': 'transfer_characteristics',
        'x_scale_type': 'linear',
        'y_scale_type': 'linear'
    },
    'capacitance': {
        'x_axis': 'vds', 'y_axis': 'c', 'third_col': 'type',
        'x_min': 0, 'x_max': 15, 'y_min': 0, 'y_max': 10,
        'x_scale': 1, 'y_scale': 10,
        'color_reps': {'red': 'Coss', 'green': 'Ciss', 'yellow': 'Crss'},
        'output_filename': 'capacitance_characteristics',
        'x_scale_type': 'linear',
        'y_scale_type': 'linear'
    },
    'resistance': {
        'x_axis': 'Vgs', 'y_axis': 'Rds', 'third_col': 'Temp',
        'x_min': 0, 'x_max': 5, 'y_min': 0, 'y_max': 8,
        'x_scale': 1, 'y_scale': 10,
        'color_reps': {'red': 25, 'blue': 125},
        'output_filename': 'Rds_on_vs_Vgs',
        'x_scale_type': 'linear',
        'y_scale_type': 'linear'
    }
}

# LLM Configuration (Kimi K2)
LLM_API_URL = "https://api.moonshot.cn/v1/chat/completions"
LLM_API_KEY = os.getenv("KIMI_API_KEY", "")  # Set this in environment
LLM_MODEL = "moonshot-v1-8k"

app = FastAPI(title="Curve Extraction Service", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def auto_detect_grid_size(warped_image):
    """Auto-detect grid size using FFT analysis"""
    logger.debug("Starting grid size detection")
    gray = cv2.cvtColor(warped_image, cv2.COLOR_BGR2GRAY)
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1)
    rows, cols = gray.shape
    crow, ccol = rows // 2, cols // 2
    spectrum_crop = magnitude_spectrum[crow-100:crow+100, ccol-100:ccol+100]
    peaks = np.argwhere(spectrum_crop > np.percentile(spectrum_crop, 99.5))
    if len(peaks) < 4:
        logger.warning("Unable to detect grid frequency reliably. Defaulting to 10x10.")
        return 10, 10
    distances = np.linalg.norm(peaks - np.array([100, 100]), axis=1)
    dominant_freq = np.median(distances) / 100
    grid_size = int(1 / dominant_freq)
    grid_size = np.clip(grid_size, MIN_GRID_SIZE, MAX_GRID_SIZE)
    logger.debug(f"Detected grid size: {grid_size}x{grid_size}")
    return grid_size, grid_size

def process_image_legacy(image_data, graph_type, x_axis_name, y_axis_name, third_column_name, 
                        x_min, x_max, y_min, y_max, x_scale, y_scale, representations, 
                        x_scale_type, y_scale_type, min_size):
    """Process image using legacy algorithm"""
    logger.debug("Processing image with legacy algorithm")
    
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        logger.error("Could not load image")
        return None, None
        
    hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        logger.error("No contours found in image")
        return None, None
        
    largest_contour = max(contours, key=cv2.contourArea)
    epsilon = 0.02 * cv2.arcLength(largest_contour, True)
    approx = cv2.approxPolyDP(largest_contour, epsilon, True)
    
    if len(approx) != 4:
        logger.error("Failed to detect rectangular grid")
        return None, None
        
    pts = approx.reshape(4, 2)
    sums = pts.sum(axis=1)
    diffs = np.diff(pts, axis=1).flatten()
    rect = np.zeros((4, 2), dtype=np.float32)
    rect[0] = pts[np.argmin(sums)]
    rect[2] = pts[np.argmax(sums)]
    rect[1] = pts[np.argmin(diffs)]
    rect[3] = pts[np.argmax(diffs)]
    
    warped_size = 1000
    dst = np.array([[0, 0], [warped_size, 0], [warped_size, warped_size], [0, warped_size]], dtype=np.float32)
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (warped_size, warped_size))
    
    rows, cols = auto_detect_grid_size(warped)
    logger.info(f"Estimated grid size: {rows}x{cols}")
    
    curve_data = {}
    base_color_points = defaultdict(list)
    detected_base_colors = set()
    
    for color_name, (lower, upper) in color_ranges.items():
        lower = np.array(lower)
        upper = np.array(upper)
        mask = cv2.inRange(hsv_image, lower, upper)
        warped_mask = cv2.warpPerspective(mask, M, (warped_size, warped_size))
        
        smooth_win = 21 if color_name in ['red', 'red2'] else 17 if color_name == 'blue' else 13
        kernel = np.ones((3, 3), np.uint8)
        cleaned_mask = cv2.morphologyEx(warped_mask, cv2.MORPH_OPEN, kernel)
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(cleaned_mask)
        filtered_mask = np.zeros_like(warped_mask)
        
        for i in range(1, num_labels):
            if stats[i, cv2.CC_STAT_AREA] >= min_size:
                filtered_mask[labels == i] = 255

        ys, xs = np.where(filtered_mask > 0)
        if len(xs) == 0:
            logger.debug(f"No points detected for color {color_name}")
            continue
        logger.debug(f"Detected {len(xs)} points for color {color_name}")

        if x_scale_type == 'linear':
            logical_x = xs * (x_max - x_min) / warped_size + x_min
        else:
            f = xs / warped_size
            log_x = np.log10(x_min) + f * (np.log10(x_max) - np.log10(x_min))
            logical_x = 10 ** log_x
            
        if y_scale_type == 'linear':
            logical_y = (warped_size - ys) * (y_max - y_min) / warped_size + y_min
        else:
            f = (warped_size - ys) / warped_size
            log_y = np.log10(y_min) + f * (np.log10(y_max) - np.log10(y_min))
            logical_y = 10 ** log_y
            
        base_color = color_to_base.get(color_name, color_name)
        base_color_points[base_color].extend(zip(logical_x, logical_y))
        detected_base_colors.add(base_color)
    
    for base_color, points in base_color_points.items():
        if not points:
            continue
        logger.debug(f"Processing {len(points)} points for base color {base_color}")
            
        all_x, all_y = zip(*points)
        logical_x = list(all_x)
        logical_y = list(all_y)
        
        data = defaultdict(list)
        for lx, ly in zip(logical_x, logical_y):
            bin_x = round(lx / BIN_SIZE) * BIN_SIZE
            data[bin_x].append(ly)
        
        final_x, final_y = [], []
        for x_val, y_vals in sorted(data.items()):
            y_vals = np.array(y_vals)
            if len(y_vals) == 0:
                continue
            median = np.median(y_vals)
            mad = np.median(np.abs(y_vals - median)) + 1e-6
            filtered = y_vals[np.abs(y_vals - median) < 2 * mad]
            if np.std(filtered) > 0.3:
                continue
            if len(filtered) > 0:
                final_x.append(x_val)
                final_y.append(np.mean(filtered))
        
        smooth_win = 21 if base_color == 'red' else 17 if base_color == 'blue' else 13
        if len(final_y) > smooth_win:
            smooth_y = savgol_filter(final_y, smooth_win, SMOOTH_POLYORDER)
        else:
            smooth_y = final_y
        
        curve_data[base_color] = {
            'x': [x * x_scale for x in final_x],
            'y': [y * y_scale for y in (smooth_y.tolist() if hasattr(smooth_y, 'tolist') else smooth_y)]
        }

    return curve_data, None

def call_llm_api(image_base64, prompt, config):
    """Call Kimi K2 LLM API for curve extraction assistance"""
    if not LLM_API_KEY:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    try:
        # Prepare the prompt for the LLM
        system_prompt = """You are an expert in semiconductor device characterization and graph analysis. 
        Analyze the provided graph image and extract curve data points with high accuracy.
        
        Focus on:
        1. Identifying all visible curves in the graph
        2. Extracting accurate coordinate points
        3. Understanding the axis scales and ranges
        4. Providing confidence scores for extracted data
        
        Return your analysis in JSON format with the following structure:
        {
            "curves": [
                {
                    "name": "curve_name",
                    "color": "hex_color",
                    "points": [
                        {"x": x_value, "y": y_value, "confidence": 0.95}
                    ],
                    "representation": "curve_label"
                }
            ],
            "metadata": {
                "axis_info": {...},
                "confidence": 0.9,
                "notes": "..."
            }
        }"""
        
        user_prompt = f"""
        Graph Analysis Request:
        
        Graph Type: {config.get('graph_type', 'unknown')}
        X-Axis: {config.get('x_axis_name', 'X')} (Range: {config.get('x_min', 0)} to {config.get('x_max', 10)})
        Y-Axis: {config.get('y_axis_name', 'Y')} (Range: {config.get('y_min', 0)} to {config.get('y_max', 10)})
        Scale Types: X={config.get('x_scale_type', 'linear')}, Y={config.get('y_scale_type', 'linear')}
        
        User Prompt: {prompt}
        
        Please analyze the graph image and extract all visible curves with their coordinate points.
        """
        
        headers = {
            "Authorization": f"Bearer {LLM_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
                {"role": "user", "content": f"<image>{image_base64}</image>"}
            ],
            "max_tokens": 4000,
            "temperature": 0.1
        }
        
        response = requests.post(LLM_API_URL, headers=headers, json=payload, timeout=60)
        
        if response.status_code != 200:
            logger.error(f"LLM API error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail=f"LLM API error: {response.status_code}")
        
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        # Parse the JSON response
        try:
            # Extract JSON from the response (it might be wrapped in markdown)
            if '```json' in content:
                json_start = content.find('```json') + 7
                json_end = content.find('```', json_start)
                json_str = content[json_start:json_end].strip()
            else:
                json_str = content.strip()
            
            llm_result = json.loads(json_str)
            return llm_result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            logger.error(f"Raw response: {content}")
            raise HTTPException(status_code=500, detail="Failed to parse LLM response")
            
    except requests.exceptions.RequestException as e:
        logger.error(f"LLM API request failed: {e}")
        raise HTTPException(status_code=500, detail=f"LLM API request failed: {str(e)}")

def create_plot_image(curves, config):
    """Create a matplotlib plot image from extracted curves"""
    try:
        fig = Figure(figsize=(12, 8), dpi=100)
        ax = fig.add_subplot(111)
        
        # Set scale types
        if config.get('x_scale_type') == 'log':
            ax.set_xscale('log')
        if config.get('y_scale_type') == 'log':
            ax.set_yscale('log')
        
        # Plot each curve
        for curve in curves:
            if curve['points']:
                x_values = [p['x'] for p in curve['points']]
                y_values = [p['y'] for p in curve['points']]
                ax.plot(x_values, y_values, color=curve['color'], 
                       label=curve.get('representation', curve['name']), linewidth=2)
        
        ax.set_xlabel(config.get('x_axis_name', 'X-Axis'))
        ax.set_ylabel(config.get('y_axis_name', 'Y-Axis'))
        ax.grid(True, which="both", ls="--", alpha=0.7)
        ax.legend()
        ax.set_xlim(config.get('x_min', 0), config.get('x_max', 10))
        ax.set_ylim(config.get('y_min', 0), config.get('y_max', 10))
        
        fig.tight_layout()
        
        # Save to bytes
        img_buffer = BytesIO()
        fig.savefig(img_buffer, format='png', dpi=100, bbox_inches='tight')
        img_buffer.seek(0)
        img_bytes = img_buffer.getvalue()
        img_buffer.close()
        
        return base64.b64encode(img_bytes).decode('utf-8')
        
    except Exception as e:
        logger.error(f"Failed to create plot image: {e}")
        return None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "curve-extraction", "version": "2.0.0"}

@app.post("/api/curve-extraction/detect-colors")
async def detect_colors(file: UploadFile = File(...)):
    """Detect colors in uploaded image"""
    try:
        image_data = await file.read()
        
        # Convert to numpy array
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        detected_colors = []
        
        for color_name, (lower, upper) in color_ranges.items():
            mask = cv2.inRange(hsv_image, np.array(lower), np.array(upper))
            if np.any(mask):
                # Calculate color statistics
                ys, xs = np.where(mask > 0)
                pixel_count = len(xs)
                
                if pixel_count > 500:  # Minimum threshold
                    # Get average color
                    color_pixels = image[mask > 0]
                    avg_color = np.mean(color_pixels, axis=0)
                    hex_color = f"#{int(avg_color[2]):02x}{int(avg_color[1]):02x}{int(avg_color[0]):02x}"
                    
                    detected_colors.append({
                        "name": color_name,
                        "display_name": color_name.capitalize(),
                        "color": hex_color,
                        "pixel_count": int(pixel_count),
                        "confidence": min(pixel_count / 1000, 1.0)
                    })
        
        # Sort by pixel count
        detected_colors.sort(key=lambda x: x['pixel_count'], reverse=True)
        
        return {
            "success": True,
            "data": {
                "detected_colors": detected_colors
            }
        }
        
    except Exception as e:
        logger.error(f"Color detection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Color detection failed: {str(e)}")

@app.post("/api/curve-extraction/extract-curves")
async def extract_curves(
    file: UploadFile = File(...),
    selected_colors: str = Form(...),
    x_min: float = Form(...),
    x_max: float = Form(...),
    y_min: float = Form(...),
    y_max: float = Form(...),
    x_scale: float = Form(...),
    y_scale: float = Form(...),
    x_scale_type: str = Form("linear"),
    y_scale_type: str = Form("linear"),
    min_size: int = Form(100),
    detection_sensitivity: int = Form(5),
    color_tolerance: int = Form(20),
    smoothing_factor: int = Form(3),
    x_axis_name: str = Form("X-Axis"),
    y_axis_name: str = Form("Y-Axis")
):
    """Extract curves using standard algorithm"""
    try:
        start_time = datetime.now()
        image_data = await file.read()
        selected_colors_list = json.loads(selected_colors)
        
        # Use enhanced web-based algorithm
        curves = []
        total_points = 0
        
        # Convert to numpy array
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        for color_name in selected_colors_list:
            if color_name in color_ranges:
                lower, upper = color_ranges[color_name]
                mask = cv2.inRange(hsv_image, np.array(lower), np.array(upper))
                
                # Apply morphological operations
                kernel = np.ones((3, 3), np.uint8)
                cleaned_mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
                
                # Find connected components
                num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(cleaned_mask)
                filtered_mask = np.zeros_like(cleaned_mask)
                
                for i in range(1, num_labels):
                    if stats[i, cv2.CC_STAT_AREA] >= min_size:
                        filtered_mask[labels == i] = 255
                
                # Extract points
                ys, xs = np.where(filtered_mask > 0)
                if len(xs) > 0:
                    # Calculate actual average color from detected pixels
                    color_pixels = image[filtered_mask > 0]
                    avg_color = np.mean(color_pixels, axis=0)
                    actual_color = f"#{int(avg_color[2]):02x}{int(avg_color[1]):02x}{int(avg_color[0]):02x}"
                    
                    # Convert to logical coordinates
                    if x_scale_type == 'linear':
                        logical_x = xs * (x_max - x_min) / image.shape[1] + x_min
                    else:
                        f = xs / image.shape[1]
                        log_x = np.log10(x_min) + f * (np.log10(x_max) - np.log10(x_min))
                        logical_x = 10 ** log_x
                    
                    if y_scale_type == 'linear':
                        logical_y = (image.shape[0] - ys) * (y_max - y_min) / image.shape[0] + y_min
                    else:
                        f = (image.shape[0] - ys) / image.shape[0]
                        log_y = np.log10(y_min) + f * (np.log10(y_max) - np.log10(y_min))
                        logical_y = 10 ** log_y
                    
                    # Process points
                    points = []
                    for i in range(len(logical_x)):
                        if (x_min <= logical_x[i] <= x_max and 
                            y_min <= logical_y[i] <= y_max):
                            points.append({
                                'x': logical_x[i] * x_scale,
                                'y': logical_y[i] * y_scale,
                                'confidence': 0.9
                            })
                    
                    if points:
                        curves.append({
                            'name': color_name,
                            'color': actual_color,  # Use actual detected color
                            'points': points,
                            'representation': color_name,
                            'pointCount': len(points)
                        })
                        total_points += len(points)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Create plot image
        plot_image = create_plot_image(curves, {
            'x_axis_name': x_axis_name,
            'y_axis_name': y_axis_name,
            'x_min': x_min,
            'x_max': x_max,
            'y_min': y_min,
            'y_max': y_max,
            'x_scale_type': x_scale_type,
            'y_scale_type': y_scale_type
        })
        
        return {
            "success": True,
            "data": {
                "curves": curves,
                "total_points": total_points,
                "processing_time": processing_time,
                "success": len(curves) > 0,
                "plot_image": plot_image,
                "metadata": {
                    "extraction_method": "standard",
                    "quality_score": len(curves) / len(selected_colors_list) if selected_colors_list else 0
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Curve extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Curve extraction failed: {str(e)}")

@app.post("/api/curve-extraction/extract-curves-legacy")
async def extract_curves_legacy(
    file: UploadFile = File(...),
    selected_colors: str = Form(...),
    x_min: float = Form(...),
    x_max: float = Form(...),
    y_min: float = Form(...),
    y_max: float = Form(...),
    x_scale: float = Form(...),
    y_scale: float = Form(...),
    x_scale_type: str = Form("linear"),
    y_scale_type: str = Form("linear"),
    min_size: int = Form(100)
):
    """Extract curves using legacy algorithm"""
    try:
        start_time = datetime.now()
        image_data = await file.read()
        selected_colors_list = json.loads(selected_colors)
        
        # Use legacy algorithm
        curve_data, _ = process_image_legacy(
            image_data,
            'custom',
            'X', 'Y', 'Label',
            x_min, x_max, y_min, y_max,
            x_scale, y_scale,
            {},  # representations
            x_scale_type, y_scale_type, min_size
        )
        
        if not curve_data:
            raise HTTPException(status_code=400, detail="No curves extracted")
        
        # Convert to expected format
        curves = []
        total_points = 0
        
        for color_name, data in curve_data.items():
            if data['x'] and data['y']:
                points = []
                for i in range(len(data['x'])):
                    points.append({
                        'x': data['x'][i],
                        'y': data['y'][i],
                        'confidence': 0.95
                    })
                
                curves.append({
                    'name': color_name,
                    'color': display_colors.get(color_name, '#000000'),
                    'points': points,
                    'representation': color_name,
                    'pointCount': len(points)
                })
                total_points += len(points)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Create plot image
        plot_image = create_plot_image(curves, {
            'x_axis_name': 'X-Axis',
            'y_axis_name': 'Y-Axis',
            'x_min': x_min,
            'x_max': x_max,
            'y_min': y_min,
            'y_max': y_max,
            'x_scale_type': x_scale_type,
            'y_scale_type': y_scale_type
        })
        
        return {
            "success": True,
            "data": {
                "curves": curves,
                "total_points": total_points,
                "processing_time": processing_time,
                "success": len(curves) > 0,
                "plot_image": plot_image,
                "metadata": {
                    "extraction_method": "legacy",
                    "quality_score": len(curves) / len(selected_colors_list) if selected_colors_list else 0
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Legacy curve extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Legacy curve extraction failed: {str(e)}")

@app.post("/api/curve-extraction/extract-curves-llm")
async def extract_curves_llm(
    file: UploadFile = File(...),
    selected_colors: str = Form(...),
    x_min: float = Form(...),
    x_max: float = Form(...),
    y_min: float = Form(...),
    y_max: float = Form(...),
    x_scale: float = Form(...),
    y_scale: float = Form(...),
    x_scale_type: str = Form("linear"),
    y_scale_type: str = Form("linear"),
    min_size: int = Form(100),
    prompt: str = Form("Extract all visible curves from this graph with high accuracy")
):
    """Extract curves using LLM-assisted algorithm"""
    try:
        start_time = datetime.now()
        image_data = await file.read()
        selected_colors_list = json.loads(selected_colors)
        
        # Convert image to base64 for LLM
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # Prepare config for LLM
        config = {
            'graph_type': 'custom',
            'x_axis_name': 'X-Axis',
            'y_axis_name': 'Y-Axis',
            'x_min': x_min,
            'x_max': x_max,
            'y_min': y_min,
            'y_max': y_max,
            'x_scale_type': x_scale_type,
            'y_scale_type': y_scale_type
        }
        
        # Call LLM API
        llm_result = call_llm_api(image_base64, prompt, config)
        
        # Process LLM result
        curves = []
        total_points = 0
        
        if 'curves' in llm_result:
            for curve_data in llm_result['curves']:
                points = curve_data.get('points', [])
                if points:
                    # Apply scaling
                    scaled_points = []
                    for point in points:
                        scaled_points.append({
                            'x': point['x'] * x_scale,
                            'y': point['y'] * y_scale,
                            'confidence': point.get('confidence', 0.9)
                        })
                    
                    curves.append({
                        'name': curve_data['name'],
                        'color': curve_data.get('color', '#000000'),
                        'points': scaled_points,
                        'representation': curve_data.get('representation', curve_data['name']),
                        'pointCount': len(scaled_points)
                    })
                    total_points += len(scaled_points)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Create plot image
        plot_image = create_plot_image(curves, config)
        
        return {
            "success": True,
            "data": {
                "curves": curves,
                "total_points": total_points,
                "processing_time": processing_time,
                "success": len(curves) > 0,
                "plot_image": plot_image,
                "metadata": {
                    "extraction_method": "llm",
                    "quality_score": llm_result.get('metadata', {}).get('confidence', 0.8),
                    "llm_notes": llm_result.get('metadata', {}).get('notes', '')
                }
            }
        }
        
    except Exception as e:
        logger.error(f"LLM curve extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"LLM curve extraction failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002) 