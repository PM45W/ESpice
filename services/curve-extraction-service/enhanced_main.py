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
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import requests
from datetime import datetime

# Configuration
BIN_SIZE = 0.01
MIN_GRID_SIZE = 5
MAX_GRID_SIZE = 50
SMOOTH_POLYORDER = 3

# Color ranges from legacy algorithm
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
    'red': 'r', 'red2': 'r', 'blue': 'b', 'green': 'g',
    'yellow': 'y', 'cyan': 'c', 'magenta': 'm',
    'orange': '#FFA500', 'purple': 'purple'
}

# LLM Configuration
LLM_API_URL = "https://api.moonshot.cn/v1/chat/completions"
LLM_API_KEY = os.getenv("KIMI_API_KEY", "")
LLM_MODEL = "moonshot-v1-8k"

app = FastAPI(title="Enhanced Curve Extraction Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def detect_graph_boundaries(image):
    """
    Enhanced graph boundary detection using multiple methods
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Method 1: Edge detection with improved parameters
    edges = cv2.Canny(gray, 30, 100)
    
    # Method 2: Morphological operations to connect broken lines
    kernel = np.ones((3, 3), np.uint8)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
    
    # Method 3: Find contours with hierarchy
    contours, hierarchy = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        logger.warning("No contours found, using image boundaries")
        h, w = image.shape[:2]
        return np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype=np.float32)
    
    # Filter contours by area and aspect ratio
    valid_contours = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 1000:  # Minimum area threshold
            continue
            
        # Approximate to polygon
        epsilon = 0.02 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        
        if len(approx) == 4:  # Rectangle
            # Check aspect ratio
            rect = cv2.minAreaRect(approx)
            width, height = rect[1]
            aspect_ratio = max(width, height) / min(width, height)
            
            if 0.5 <= aspect_ratio <= 2.0:  # Reasonable aspect ratio for graphs
                valid_contours.append(approx)
    
    if not valid_contours:
        logger.warning("No valid rectangular contours found, using largest contour")
        largest_contour = max(contours, key=cv2.contourArea)
        epsilon = 0.02 * cv2.arcLength(largest_contour, True)
        approx = cv2.approxPolyDP(largest_contour, epsilon, True)
        
        if len(approx) == 4:
            return approx.reshape(4, 2).astype(np.float32)
        else:
            # Use bounding rectangle
            x, y, w, h = cv2.boundingRect(largest_contour)
            return np.array([[x, y], [x+w, y], [x+w, y+h], [x, y+h]], dtype=np.float32)
    
    # Select the best contour (largest area with good aspect ratio)
    best_contour = max(valid_contours, key=cv2.contourArea)
    return best_contour.reshape(4, 2).astype(np.float32)

def order_points(pts):
    """
    Order points in clockwise order: top-left, top-right, bottom-right, bottom-left
    """
    rect = np.zeros((4, 2), dtype=np.float32)
    
    # Sum and difference
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    
    # Top-left: smallest sum
    rect[0] = pts[np.argmin(s)]
    # Bottom-right: largest sum
    rect[2] = pts[np.argmax(s)]
    # Top-right: smallest difference
    rect[1] = pts[np.argmin(diff)]
    # Bottom-left: largest difference
    rect[3] = pts[np.argmax(diff)]
    
    return rect

def auto_detect_grid_size(warped_image):
    """Auto-detect grid size using FFT analysis"""
    gray = cv2.cvtColor(warped_image, cv2.COLOR_BGR2GRAY)
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1)
    rows, cols = gray.shape
    crow, ccol = rows // 2, cols // 2
    spectrum_crop = magnitude_spectrum[crow-100:crow+100, ccol-100:ccol+100]
    peaks = np.argwhere(spectrum_crop > np.percentile(spectrum_crop, 99.5))
    if len(peaks) < 4:
        return 10, 10
    distances = np.linalg.norm(peaks - np.array([100, 100]), axis=1)
    dominant_freq = np.median(distances) / 100
    grid_size = int(1 / dominant_freq)
    grid_size = np.clip(grid_size, MIN_GRID_SIZE, MAX_GRID_SIZE)
    return grid_size, grid_size

def process_image_legacy(image_data, config):
    """Process image using enhanced legacy algorithm with improved boundary detection"""
    nparr = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        return None

    hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    # Enhanced graph boundary detection
    try:
        graph_boundaries = detect_graph_boundaries(image)
        ordered_boundaries = order_points(graph_boundaries)
    except Exception as e:
        logger.error(f"Failed to detect graph boundaries: {e}")
        # Fallback to original method
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return None
            
        largest_contour = max(contours, key=cv2.contourArea)
        epsilon = 0.02 * cv2.arcLength(largest_contour, True)
        approx = cv2.approxPolyDP(largest_contour, epsilon, True)
        
        if len(approx) != 4:
            return None
            
        pts = approx.reshape(4, 2)
        sums = pts.sum(axis=1)
        diffs = np.diff(pts, axis=1).flatten()
        ordered_boundaries = np.zeros((4, 2), dtype=np.float32)
        ordered_boundaries[0] = pts[np.argmin(sums)]
        ordered_boundaries[2] = pts[np.argmax(sums)]
        ordered_boundaries[1] = pts[np.argmin(diffs)]
        ordered_boundaries[3] = pts[np.argmax(diffs)]

    # Perspective transformation with improved alignment
    warped_size = 1000
    dst = np.array([[0, 0], [warped_size, 0], [warped_size, warped_size], [0, warped_size]], dtype=np.float32)
    
    # Calculate perspective transform matrix
    M = cv2.getPerspectiveTransform(ordered_boundaries, dst)
    warped = cv2.warpPerspective(image, M, (warped_size, warped_size))

    # Enhanced coordinate system calibration
    # Detect actual graph plotting area within the warped image
    warped_gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    
    # Find the actual plotting area by detecting grid lines
    # Apply adaptive threshold to find grid lines
    thresh = cv2.adaptiveThreshold(warped_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    
    # Morphological operations to connect grid lines
    kernel_h = np.ones((1, 20), np.uint8)  # Horizontal lines
    kernel_v = np.ones((20, 1), np.uint8)  # Vertical lines
    
    horizontal_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_h)
    vertical_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_v)
    
    grid_mask = cv2.bitwise_or(horizontal_lines, vertical_lines)
    
    # Find the bounding box of the actual plotting area
    contours, _ = cv2.findContours(grid_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if contours:
        # Find the largest contour (should be the plotting area)
        plotting_area = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(plotting_area)
        
        # Add some padding to ensure we capture the full plotting area
        padding = 20
        x = max(0, x - padding)
        y = max(0, y - padding)
        w = min(warped_size - x, w + 2 * padding)
        h = min(warped_size - y, h + 2 * padding)
        
        # Update warped size to match the actual plotting area
        actual_warped_size_x = w
        actual_warped_size_y = h
        plotting_offset_x = x
        plotting_offset_y = y
    else:
        # Fallback to full image
        actual_warped_size_x = warped_size
        actual_warped_size_y = warped_size
        plotting_offset_x = 0
        plotting_offset_y = 0

    curve_data = {}
    base_color_points = defaultdict(list)

    for color_name, (lower, upper) in color_ranges.items():
        lower = np.array(lower)
        upper = np.array(upper)
        mask = cv2.inRange(hsv_image, lower, upper)
        warped_mask = cv2.warpPerspective(mask, M, (warped_size, warped_size))

        kernel = np.ones((3, 3), np.uint8)
        cleaned_mask = cv2.morphologyEx(warped_mask, cv2.MORPH_OPEN, kernel)
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(cleaned_mask)
        filtered_mask = np.zeros_like(warped_mask)
        
        for i in range(1, num_labels):
            if stats[i, cv2.CC_STAT_AREA] >= config.get('min_size', 100):
                filtered_mask[labels == i] = 255

        ys, xs = np.where(filtered_mask > 0)
        if len(xs) == 0:
            continue

        # Adjust coordinates to plotting area
        xs = xs - plotting_offset_x
        ys = ys - plotting_offset_y
        
        # Filter points within the plotting area
        valid_mask = (xs >= 0) & (xs < actual_warped_size_x) & (ys >= 0) & (ys < actual_warped_size_y)
        xs = xs[valid_mask]
        ys = ys[valid_mask]
        
        if len(xs) == 0:
            continue

        x_min, x_max = config.get('x_min', 0), config.get('x_max', 10)
        y_min, y_max = config.get('y_min', 0), config.get('y_max', 10)
        x_scale_type = config.get('x_scale_type', 'linear')
        y_scale_type = config.get('y_scale_type', 'linear')

        # Enhanced coordinate transformation with plotting area adjustment
        if x_scale_type == 'linear':
            logical_x = xs * (x_max - x_min) / actual_warped_size_x + x_min
        else:
            f = xs / actual_warped_size_x
            log_x = np.log10(max(x_min, 0.001)) + f * (np.log10(x_max) - np.log10(max(x_min, 0.001)))
            logical_x = 10 ** log_x

        if y_scale_type == 'linear':
            # Invert Y-axis: top of image (y=0) corresponds to y_max, bottom (y=height) corresponds to y_min
            logical_y = (actual_warped_size_y - ys) * (y_max - y_min) / actual_warped_size_y + y_min
        else:
            f = (actual_warped_size_y - ys) / actual_warped_size_y
            log_y = np.log10(max(y_min, 0.001)) + f * (np.log10(y_max) - np.log10(max(y_min, 0.001)))
            logical_y = 10 ** log_y

        base_color = color_name
        base_color_points[base_color].extend(zip(logical_x, logical_y))

    for base_color, points in base_color_points.items():
        if not points:
            continue

        all_x, all_y = zip(*points)
        data = defaultdict(list)
        for lx, ly in zip(all_x, all_y):
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

        x_scale = config.get('x_scale', 1)
        y_scale = config.get('y_scale', 1)
        curve_data[base_color] = {
            'x': [x * x_scale for x in final_x],
            'y': [y * y_scale for y in (smooth_y.tolist() if hasattr(smooth_y, 'tolist') else smooth_y)]
        }

    return curve_data

def call_llm_api(image_base64, prompt, config):
    """Call Kimi K2 LLM API for curve extraction assistance"""
    if not LLM_API_KEY:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    try:
        system_prompt = """You are an expert in semiconductor device characterization and graph analysis. 
        Analyze the provided graph image and extract curve data points with high accuracy.
        
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
                "confidence": 0.9,
                "notes": "..."
            }
        }"""
        
        user_prompt = f"""
        Graph Analysis Request:
        
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
            raise HTTPException(status_code=500, detail=f"LLM API error: {response.status_code}")
        
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        # Parse JSON from response
        if '```json' in content:
            json_start = content.find('```json') + 7
            json_end = content.find('```', json_start)
            json_str = content[json_start:json_end].strip()
        else:
            json_str = content.strip()
        
        return json.loads(json_str)
        
    except Exception as e:
        logger.error(f"LLM API error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM API error: {str(e)}")

def create_plot_image(curves, config):
    """Create a matplotlib plot image from extracted curves"""
    try:
        fig = Figure(figsize=(12, 8), dpi=100)
        ax = fig.add_subplot(111)
        
        if config.get('x_scale_type') == 'log':
            ax.set_xscale('log')
        if config.get('y_scale_type') == 'log':
            ax.set_yscale('log')
        
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
    return {"status": "healthy", "version": "2.0.0", "service": "Enhanced Curve Extraction"}

@app.post("/api/curve-extraction/debug-boundaries")
async def debug_boundaries(file: UploadFile = File(...)):
    """Debug endpoint to visualize graph boundary detection"""
    try:
        image_data = await file.read()
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        # Detect boundaries
        boundaries = detect_graph_boundaries(image)
        ordered_boundaries = order_points(boundaries)
        
        # Create debug visualization
        debug_image = image.copy()
        
        # Draw detected boundaries
        cv2.polylines(debug_image, [ordered_boundaries.astype(np.int32)], True, (0, 255, 0), 2)
        
        # Draw corner points
        for i, point in enumerate(ordered_boundaries):
            cv2.circle(debug_image, tuple(point.astype(np.int32)), 5, (0, 0, 255), -1)
            cv2.putText(debug_image, str(i), tuple(point.astype(np.int32)), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Convert to base64 for response
        _, buffer = cv2.imencode('.png', debug_image)
        debug_image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "debug_image": debug_image_base64,
            "boundaries": ordered_boundaries.tolist(),
            "image_size": image.shape[:2]
        }
        
    except Exception as e:
        logger.error(f"Debug boundaries failed: {e}")
        raise HTTPException(status_code=500, detail=f"Debug failed: {str(e)}")

@app.post("/api/curve-extraction/detect-colors")
async def detect_colors(file: UploadFile = File(...)):
    """Detect colors in uploaded image"""
    try:
        image_data = await file.read()
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        detected_colors = []
        
        for color_name, (lower, upper) in color_ranges.items():
            mask = cv2.inRange(hsv_image, np.array(lower), np.array(upper))
            if np.any(mask):
                ys, xs = np.where(mask > 0)
                pixel_count = len(xs)
                
                if pixel_count > 500:
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
        
        detected_colors.sort(key=lambda x: x['pixel_count'], reverse=True)
        
        return {
            "success": True,
            "data": {"detected_colors": detected_colors}
        }
        
    except Exception as e:
        logger.error(f"Color detection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Color detection failed: {str(e)}")

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
        
        config = {
            'x_min': x_min, 'x_max': x_max, 'y_min': y_min, 'y_max': y_max,
            'x_scale': x_scale, 'y_scale': y_scale,
            'x_scale_type': x_scale_type, 'y_scale_type': y_scale_type,
            'min_size': min_size
        }
        
        curve_data = process_image_legacy(image_data, config)
        
        if not curve_data:
            raise HTTPException(status_code=400, detail="No curves extracted")
        
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
        
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        config = {
            'x_axis_name': 'X-Axis', 'y_axis_name': 'Y-Axis',
            'x_min': x_min, 'x_max': x_max, 'y_min': y_min, 'y_max': y_max,
            'x_scale_type': x_scale_type, 'y_scale_type': y_scale_type
        }
        
        llm_result = call_llm_api(image_base64, prompt, config)
        
        curves = []
        total_points = 0
        
        if 'curves' in llm_result:
            for curve_data in llm_result['curves']:
                points = curve_data.get('points', [])
                if points:
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