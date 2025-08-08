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

def detect_graph_boundaries(image):
    """Detect likely rectangular graph region with robust heuristics."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Canny + morphology to connect edges
    edges = cv2.Canny(gray, 30, 100)
    kernel = np.ones((3, 3), np.uint8)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

    contours, hierarchy = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        h, w = image.shape[:2]
        return np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype=np.float32)

    # Prefer rectangular contours with reasonable aspect ratio
    valid = []
    for c in contours:
        area = cv2.contourArea(c)
        if area < 1000:
            continue
        epsilon = 0.02 * cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, epsilon, True)
        if len(approx) == 4:
            rect = cv2.minAreaRect(approx)
            w, h = rect[1]
            if w == 0 or h == 0:
                continue
            ar = max(w, h) / max(1.0, min(w, h))
            if 0.5 <= ar <= 2.0:
                valid.append(approx)

    if not valid:
        largest = max(contours, key=cv2.contourArea)
        epsilon = 0.02 * cv2.arcLength(largest, True)
        approx = cv2.approxPolyDP(largest, epsilon, True)
        if len(approx) == 4:
            return approx.reshape(4, 2).astype(np.float32)
        x, y, w, h = cv2.boundingRect(largest)
        return np.array([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], dtype=np.float32)

    best = max(valid, key=cv2.contourArea)
    return best.reshape(4, 2).astype(np.float32)

def order_points(pts):
    """Order points TL, TR, BR, BL for perspective transform."""
    rect = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

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

def process_image_enhanced(
    image_data,
    selected_colors_list,
    x_min, x_max, y_min, y_max, x_scale, y_scale,
    x_scale_type, y_scale_type,
    min_size,
    color_tolerance=0,
    use_plot_area: bool = False,
    use_annotation_mask: bool = False,
    use_edge_guided: bool = False,
    use_adaptive_binning: bool = False
):
    """Enhanced processing with perspective correction and plotting-area calibration."""
    nparr = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        return None

    hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # Use legacy boundary detection (proven to work)
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
    rect = np.zeros((4, 2), dtype=np.float32)
    rect[0] = pts[np.argmin(sums)]
    rect[2] = pts[np.argmax(sums)]
    rect[1] = pts[np.argmin(diffs)]
    rect[3] = pts[np.argmax(diffs)]

    warped_size = 1000
    dst = np.array([[0, 0], [warped_size, 0], [warped_size, warped_size], [0, warped_size]], dtype=np.float32)
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (warped_size, warped_size))

    # Optional plotting area detection (simplified)
    plot_w = plot_h = warped_size
    off_x = off_y = 0
    
    if use_plot_area:
        try:
            warped_gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
            thresh = cv2.adaptiveThreshold(warped_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
            kernel_h = np.ones((1, 20), np.uint8)
            kernel_v = np.ones((20, 1), np.uint8)
            horizontal_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_h)
            vertical_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_v)
            grid_mask = cv2.bitwise_or(horizontal_lines, vertical_lines)
            contours, _ = cv2.findContours(grid_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            if contours:
                plotting_area = max(contours, key=cv2.contourArea)
                x, y, w, h = cv2.boundingRect(plotting_area)
                # Only use if the detected area is reasonable (>50% of image)
                if w * h > 0.5 * warped_size * warped_size:
                    pad = 20
                    x = max(0, x - pad)
                    y = max(0, y - pad)
                    w = min(warped_size - x, w + 2 * pad)
                    h = min(warped_size - y, h + 2 * pad)
                    plot_w, plot_h = w, h
                    off_x, off_y = x, y
        except Exception as e:
            logger.warning(f"Plot area detection failed: {e}")

    curve_data = {}
    base_color_points = defaultdict(list)

    # Which colors to process
    if selected_colors_list:
        selected_base = {color_to_base.get(c, c) for c in selected_colors_list}
        colors_to_process = [name for name in color_ranges.keys() if color_to_base.get(name, name) in selected_base]
    else:
        colors_to_process = list(color_ranges.keys())
    
    if not colors_to_process:
        colors_to_process = list(color_ranges.keys())

    for color_name in colors_to_process:
        lower, upper = color_ranges[color_name]
        
        # Apply tolerance expansion to HSV bounds
        if color_tolerance and color_tolerance > 0:
            l = np.array(lower, dtype=np.int32)
            u = np.array(upper, dtype=np.int32)
            tol_h = max(1, color_tolerance // 3)
            tol_sv = color_tolerance
            l = np.array([max(0, l[0] - tol_h), max(0, l[1] - tol_sv), max(0, l[2] - tol_sv)])
            u = np.array([min(180, u[0] + tol_h), min(255, u[1] + tol_sv), min(255, u[2] + tol_sv)])
            lower_adj = l.astype(np.uint8)
            upper_adj = u.astype(np.uint8)
        else:
            lower_adj = np.array(lower)
            upper_adj = np.array(upper)
            
        mask = cv2.inRange(hsv_image, lower_adj, upper_adj)
        warped_mask = cv2.warpPerspective(mask, M, (warped_size, warped_size))

        # Legacy-style processing with proven parameters
        kernel = np.ones((3, 3), np.uint8)
        cleaned = cv2.morphologyEx(warped_mask, cv2.MORPH_OPEN, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel)
        
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(cleaned)
        filtered = np.zeros_like(warped_mask)
        for i in range(1, num_labels):
            if stats[i, cv2.CC_STAT_AREA] >= min_size:
                filtered[labels == i] = 255

        ys, xs = np.where(filtered > 0)
        if len(xs) == 0:
            continue

        # Adjust to plotting area if detected
        xs = xs - off_x
        ys = ys - off_y
        valid = (xs >= 0) & (xs < plot_w) & (ys >= 0) & (ys < plot_h)
        xs = xs[valid]
        ys = ys[valid]
        if len(xs) == 0:
            continue

        # Legacy coordinate mapping (proven to work)
        if x_scale_type == 'linear':
            logical_x = xs * (x_max - x_min) / max(1, plot_w) + x_min
        else:
            f = xs / max(1, plot_w)
            log_x = np.log10(max(x_min, 1e-6)) + f * (np.log10(x_max) - np.log10(max(x_min, 1e-6)))
            logical_x = 10 ** log_x

        if y_scale_type == 'linear':
            logical_y = (plot_h - ys) * (y_max - y_min) / max(1, plot_h) + y_min
        else:
            f = (plot_h - ys) / max(1, plot_h)
            log_y = np.log10(max(y_min, 1e-6)) + f * (np.log10(y_max) - np.log10(max(y_min, 1e-6)))
            logical_y = 10 ** log_y

        base = color_to_base.get(color_name, color_name)
        base_color_points[base].extend(zip(logical_x, logical_y))

    # Legacy-style binning and smoothing
    for base_color, points in base_color_points.items():
        if not points:
            continue

        all_x, all_y = zip(*points)
        data_bins = defaultdict(list)
        for lx, ly in zip(all_x, all_y):
            bin_x = round(lx / BIN_SIZE) * BIN_SIZE
            data_bins[bin_x].append(ly)

        final_x, final_y = [], []
        for x_val, y_vals in sorted(data_bins.items()):
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

        # Legacy fixed smoothing windows
        smooth_win = 21 if base_color == 'red' else 17 if base_color == 'blue' else 13
        if len(final_y) > smooth_win:
            smooth_y = savgol_filter(final_y, smooth_win, SMOOTH_POLYORDER)
        else:
            smooth_y = final_y

        curve_data[base_color] = {
            'x': [x * x_scale for x in final_x],
            'y': [y * y_scale for y in (smooth_y.tolist() if hasattr(smooth_y, 'tolist') else smooth_y)]
        }

    return curve_data

def process_image_simplified_enhanced(
    image_data,
    selected_colors_list,
    x_min, x_max, y_min, y_max, x_scale, y_scale,
    x_scale_type, y_scale_type,
    min_size,
    color_tolerance=0,
    use_plot_area: bool = False
):
    """Simplified enhanced processing - combines legacy reliability with modern features"""
    nparr = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(nparr, np.uint8)
    if image is None:
        return None

    hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # Use legacy boundary detection (proven to work)
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
    rect = np.zeros((4, 2), dtype=np.float32)
    rect[0] = pts[np.argmin(sums)]
    rect[2] = pts[np.argmax(sums)]
    rect[1] = pts[np.argmin(diffs)]
    rect[3] = pts[np.argmax(diffs)]

    warped_size = 1000
    dst = np.array([[0, 0], [warped_size, 0], [warped_size, warped_size], [0, warped_size]], dtype=np.float32)
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (warped_size, warped_size))

    # Optional plotting area detection (simplified)
    plot_w = plot_h = warped_size
    off_x = off_y = 0
    
    if use_plot_area:
        try:
            warped_gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
            thresh = cv2.adaptiveThreshold(warped_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
            kernel_h = np.ones((1, 20), np.uint8)
            kernel_v = np.ones((20, 1), np.uint8)
            horizontal_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_h)
            vertical_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_v)
            grid_mask = cv2.bitwise_or(horizontal_lines, vertical_lines)
            contours, _ = cv2.findContours(grid_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            if contours:
                plotting_area = max(contours, key=cv2.contourArea)
                x, y, w, h = cv2.boundingRect(plotting_area)
                # Only use if the detected area is reasonable (>50% of image)
                if w * h > 0.5 * warped_size * warped_size:
                    pad = 20
                    x = max(0, x - pad)
                    y = max(0, y - pad)
                    w = min(warped_size - x, w + 2 * pad)
                    h = min(warped_size - y, h + 2 * pad)
                    plot_w, plot_h = w, h
                    off_x, off_y = x, y
        except Exception as e:
            logger.warning(f"Plot area detection failed: {e}")

    curve_data = {}
    base_color_points = defaultdict(list)

    # Which colors to process
    if selected_colors_list:
        selected_base = {color_to_base.get(c, c) for c in selected_colors_list}
        colors_to_process = [name for name in color_ranges.keys() if color_to_base.get(name, name) in selected_base]
    else:
        colors_to_process = list(color_ranges.keys())
    
    if not colors_to_process:
        colors_to_process = list(color_ranges.keys())

    for color_name in colors_to_process:
        lower, upper = color_ranges[color_name]
        
        # Apply tolerance expansion to HSV bounds
        if color_tolerance and color_tolerance > 0:
            l = np.array(lower, dtype=np.int32)
            u = np.array(upper, dtype=np.int32)
            tol_h = max(1, color_tolerance // 3)
            tol_sv = color_tolerance
            l = np.array([max(0, l[0] - tol_h), max(0, l[1] - tol_sv), max(0, l[2] - tol_sv)])
            u = np.array([min(180, u[0] + tol_h), min(255, u[1] + tol_sv), min(255, u[2] + tol_sv)])
            lower_adj = l.astype(np.uint8)
            upper_adj = u.astype(np.uint8)
        else:
            lower_adj = np.array(lower)
            upper_adj = np.array(upper)
            
        mask = cv2.inRange(hsv_image, lower_adj, upper_adj)
        warped_mask = cv2.warpPerspective(mask, M, (warped_size, warped_size))

        # Legacy-style processing with proven parameters
        kernel = np.ones((3, 3), np.uint8)
        cleaned = cv2.morphologyEx(warped_mask, cv2.MORPH_OPEN, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel)
        
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(cleaned)
        filtered = np.zeros_like(warped_mask)
        for i in range(1, num_labels):
            if stats[i, cv2.CC_STAT_AREA] >= min_size:
                filtered[labels == i] = 255

        ys, xs = np.where(filtered > 0)
        if len(xs) == 0:
            continue

        # Adjust to plotting area if detected
        xs = xs - off_x
        ys = ys - off_y
        valid = (xs >= 0) & (xs < plot_w) & (ys >= 0) & (ys < plot_h)
        xs = xs[valid]
        ys = ys[valid]
        if len(xs) == 0:
            continue

        # Legacy coordinate mapping (proven to work)
        if x_scale_type == 'linear':
            logical_x = xs * (x_max - x_min) / max(1, plot_w) + x_min
        else:
            f = xs / max(1, plot_w)
            log_x = np.log10(max(x_min, 1e-6)) + f * (np.log10(x_max) - np.log10(max(x_min, 1e-6)))
            logical_x = 10 ** log_x

        if y_scale_type == 'linear':
            logical_y = (plot_h - ys) * (y_max - y_min) / max(1, plot_h) + y_min
        else:
            f = (plot_h - ys) / max(1, plot_h)
            log_y = np.log10(max(y_min, 1e-6)) + f * (np.log10(y_max) - np.log10(max(y_min, 1e-6)))
            logical_y = 10 ** log_y

        base = color_to_base.get(color_name, color_name)
        base_color_points[base].extend(zip(logical_x, logical_y))

    # Legacy-style binning and smoothing
    for base_color, points in base_color_points.items():
        if not points:
            continue

        all_x, all_y = zip(*points)
        data_bins = defaultdict(list)
        for lx, ly in zip(all_x, all_y):
            bin_x = round(lx / BIN_SIZE) * BIN_SIZE
            data_bins[bin_x].append(ly)

        final_x, final_y = [], []
        for x_val, y_vals in sorted(data_bins.items()):
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

        # Legacy fixed smoothing windows
        smooth_win = 21 if base_color == 'red' else 17 if base_color == 'blue' else 13
        if len(final_y) > smooth_win:
            smooth_y = savgol_filter(final_y, smooth_win, SMOOTH_POLYORDER)
        else:
            smooth_y = final_y

        curve_data[base_color] = {
            'x': [x * x_scale for x in final_x],
            'y': [y * y_scale for y in (smooth_y.tolist() if hasattr(smooth_y, 'tolist') else smooth_y)]
        }

    return curve_data

def compute_warp_and_plot_area(image):
    """Compute perspective warp, plotting area and annotation mask.
    Returns (M, warped_size, off_x, off_y, plot_w, plot_h, annotation_mask).
    """
    # Detect overall graph boundaries and rectify
    boundaries = detect_graph_boundaries(image)
    rect = order_points(boundaries)

    warped_size = 1000
    dst = np.array([[0, 0], [warped_size, 0], [warped_size, warped_size], [0, warped_size]], dtype=np.float32)
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (warped_size, warped_size))

    # Detect plotting area
    warped_gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(warped_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    kernel_h = np.ones((1, 20), np.uint8)
    kernel_v = np.ones((20, 1), np.uint8)
    horizontal_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_h)
    vertical_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_v)
    grid_mask = cv2.bitwise_or(horizontal_lines, vertical_lines)
    contours, _ = cv2.findContours(grid_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if contours:
        plotting_area = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(plotting_area)
        pad = 20
        x = max(0, x - pad)
        y = max(0, y - pad)
        w = min(warped_size - x, w + 2 * pad)
        h = min(warped_size - y, h + 2 * pad)
        plot_w, plot_h = w, h
        off_x, off_y = x, y
    else:
        plot_w = plot_h = warped_size
        off_x = off_y = 0

    # Build annotation mask (legend/tick labels)
    annotation_mask = np.zeros((warped_size, warped_size), dtype=np.uint8)
    roi = warped[off_y:off_y+plot_h, off_x:off_x+plot_w]
    roi_hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    white_regions = cv2.inRange(roi_hsv, np.array([0, 0, 200]), np.array([180, 50, 255]))
    dark_text = cv2.inRange(roi_hsv, np.array([0, 0, 0]), np.array([180, 60, 80]))
    anno_roi = cv2.bitwise_or(white_regions, dark_text)
    kernel5 = np.ones((5, 5), np.uint8)
    anno_roi = cv2.morphologyEx(anno_roi, cv2.MORPH_CLOSE, kernel5)
    num, labels, stats, _ = cv2.connectedComponentsWithStats(anno_roi)
    anno_clean = np.zeros_like(anno_roi)
    roi_area = plot_w * plot_h
    for i in range(1, num):
        area = stats[i, cv2.CC_STAT_AREA]
        if area >= max(50, int(roi_area * 0.002)) and area <= int(roi_area * 0.15):
            x_i, y_i, w_i, h_i, _ = stats[i]
            cv2.rectangle(anno_clean, (x_i, y_i), (x_i + w_i, y_i + h_i), 255, thickness=-1)
    band_x = max(2, int(plot_w * 0.04))
    band_y = max(2, int(plot_h * 0.05))
    anno_clean[:, :band_x] = 255
    anno_clean[plot_h-band_y:, :] = 255
    annotation_mask[off_y:off_y+plot_h, off_x:off_x+plot_w] = anno_clean

    return M, warped_size, off_x, off_y, plot_w, plot_h, annotation_mask

def process_image_autocolor(
    image_data,
    x_min, x_max, y_min, y_max, x_scale, y_scale,
    x_scale_type, y_scale_type,
    min_size,
    max_clusters=5
):
    """Alternative approach: color-agnostic clustering in HSV inside plotting area."""
    nparr = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        return None

    try:
        M, warped_size, off_x, off_y, plot_w, plot_h, annotation_mask = compute_warp_and_plot_area(image)
    except Exception as e:
        logger.error(f"Auto-color calibration failed: {e}")
        return None

    warped = cv2.warpPerspective(image, M, (warped_size, warped_size))
    roi = warped[off_y:off_y+plot_h, off_x:off_x+plot_w]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

    # Focus on colored pixels: medium-to-high saturation, medium value
    sat_min = 40
    val_min = 40
    color_mask = (hsv[:, :, 1] >= sat_min) & (hsv[:, :, 2] >= val_min)
    # Remove annotation regions
    anno_roi = annotation_mask[off_y:off_y+plot_h, off_x:off_x+plot_w] > 0
    color_mask = color_mask & (~anno_roi)

    if not np.any(color_mask):
        return {}

    # Prepare data for kmeans
    hsv_pixels = hsv[color_mask]
    # Limit sample size for kmeans
    max_samples = 25000
    if hsv_pixels.shape[0] > max_samples:
        idx = np.random.choice(hsv_pixels.shape[0], max_samples, replace=False)
        sample = hsv_pixels[idx]
    else:
        sample = hsv_pixels

    Z = sample.astype(np.float32)
    K = max(2, min(max_clusters, 6))
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    attempts = 3
    compactness, labels, centers = cv2.kmeans(Z, K, None, criteria, attempts, cv2.KMEANS_PP_CENTERS)

    # Assign each pixel in ROI to nearest center
    hsv_flat = hsv.reshape((-1, 3)).astype(np.float32)
    # Compute distances to centers (weighted HSV distance)
    dist_stack = []
    for c in centers:
        d = np.linalg.norm(hsv_flat - c, axis=1)
        dist_stack.append(d)
    dist_stack = np.stack(dist_stack, axis=1)
    nearest = np.argmin(dist_stack, axis=1).reshape(hsv.shape[:2])

    curves = {}
    kernel = np.ones((3, 3), np.uint8)
    for k in range(len(centers)):
        mask_k = (nearest == k)
        # Keep only colored mask within ROI and outside annotations
        mk = np.zeros_like(mask_k, dtype=np.uint8)
        mk[mask_k & color_mask] = 255
        mk = cv2.morphologyEx(mk, cv2.MORPH_OPEN, kernel)
        mk = cv2.morphologyEx(mk, cv2.MORPH_CLOSE, kernel)

        # Filter small components
        num_labels, labels_i, stats, _ = cv2.connectedComponentsWithStats(mk)
        filtered = np.zeros_like(mk)
        for i in range(1, num_labels):
            if stats[i, cv2.CC_STAT_AREA] >= min_size:
                filtered[labels_i == i] = 255

        ys, xs = np.where(filtered > 0)
        if len(xs) == 0:
            continue

        # Map to logical coords
        if x_scale_type == 'linear':
            logical_x = xs * (x_max - x_min) / max(1, plot_w) + x_min
        else:
            f = xs / max(1, plot_w)
            log_x = np.log10(max(x_min, 1e-6)) + f * (np.log10(x_max) - np.log10(max(x_min, 1e-6)))
            logical_x = 10 ** log_x
        if y_scale_type == 'linear':
            logical_y = (plot_h - ys) * (y_max - y_min) / max(1, plot_h) + y_min
        else:
            f = (plot_h - ys) / max(1, plot_h)
            log_y = np.log10(max(y_min, 1e-6)) + f * (np.log10(y_max) - np.log10(max(y_min, 1e-6)))
            logical_y = 10 ** log_y

        # Aggregate/bin/smooth
        data_bins = defaultdict(list)
        for lx, ly in zip(logical_x, logical_y):
            bin_x = round(lx / BIN_SIZE) * BIN_SIZE
            data_bins[bin_x].append(ly)

        final_x, final_y = [], []
        for x_val, y_vals in sorted(data_bins.items()):
            y_vals = np.array(y_vals)
            if len(y_vals) == 0:
                continue
            median = np.median(y_vals)
            mad = np.median(np.abs(y_vals - median)) + 1e-6
            filtered_y = y_vals[np.abs(y_vals - median) < 2 * mad]
            if np.std(filtered_y) > 0.3:
                continue
            if len(filtered_y) > 0:
                final_x.append(x_val)
                final_y.append(np.mean(filtered_y))

        if not final_x:
            continue
        if len(final_y) > 13:
            smooth_y = savgol_filter(final_y, 13, 3)
        else:
            smooth_y = final_y

        # Derive display color from center
        c = centers[k]
        # Convert HSV center to RGB for hex
        hsv_color = np.uint8([[c]])
        rgb_color = cv2.cvtColor(hsv_color, cv2.COLOR_HSV2RGB)[0, 0]
        hex_color = f"#{int(rgb_color[0]):02x}{int(rgb_color[1]):02x}{int(rgb_color[2]):02x}"

        curves[f"cluster_{k+1}"] = {
            'x': [x * x_scale for x in final_x],
            'y': [y * y_scale for y in (smooth_y if isinstance(smooth_y, list) else smooth_y.tolist())],
            'color': hex_color
        }

    return curves

def process_image_legacy(image_data, graph_type, x_axis_name, y_axis_name, third_column_name, 
                        x_min, x_max, y_min, y_max, x_scale, y_scale, representations, 
                        x_scale_type, y_scale_type, min_size):
    """Process image using legacy algorithm - EXACTLY matching legacy GUI behavior"""
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
    
    # Note: Legacy doesn't actually use the grid size detection result
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
        
        # Legacy uses fixed smoothing windows based on color
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

        # Legacy coordinate mapping - SIMPLE and DIRECT
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
        
        # Legacy uses fixed smoothing windows based on base color
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
async def detect_colors(
    file: UploadFile = File(...),
    color_tolerance: int = Form(0)
):
    """Detect colors in uploaded image (legacy-strict by default).
    Matches legacy GUI behavior: simple HSV band check per color and dedupe via base color.
    """
    try:
        image_data = await file.read()

        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        detected_set = set()
        detected_colors = []

        for color_name, (lower, upper) in color_ranges.items():
            # Optional tolerance expansion only if explicitly requested
            if color_tolerance and color_tolerance > 0:
                l = np.array(lower, dtype=np.int32)
                u = np.array(upper, dtype=np.int32)
                tol_h = max(1, color_tolerance // 3)
                tol_sv = max(5, color_tolerance)
                lower_arr = np.array([max(0, l[0] - tol_h), max(0, l[1] - tol_sv), max(0, l[2] - tol_sv)], dtype=np.uint8)
                upper_arr = np.array([min(180, u[0] + tol_h), min(255, u[1] + tol_sv), min(255, u[2] + tol_sv)], dtype=np.uint8)
            else:
                lower_arr = np.array(lower, dtype=np.uint8)
                upper_arr = np.array(upper, dtype=np.uint8)

            mask = cv2.inRange(hsv_image, lower_arr, upper_arr)
            if np.any(mask):
                base = color_to_base.get(color_name, color_name)
                if base in detected_set:
                    continue
                detected_set.add(base)
                detected_colors.append({
                    'name': base,
                    'display_name': base.capitalize(),
                    'color': display_colors.get(base, '#000000'),
                    'pixel_count': int(np.count_nonzero(mask)),
                    'confidence': 1.0
                })

        # Sort by pixel count descending to keep UI behavior sensible
        detected_colors.sort(key=lambda x: x['pixel_count'], reverse=True)

        return { 'success': True, 'data': { 'detected_colors': detected_colors } }

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
    min_size: int = Form(1000),
    detection_sensitivity: int = Form(5),
    color_tolerance: int = Form(0),  # Default to 0 for legacy compatibility
    smoothing_factor: int = Form(3),
    x_axis_name: str = Form("X-Axis"),
    y_axis_name: str = Form("Y-Axis"),
    mode: str = Form("legacy"),  # Default to legacy for reliability
    use_plot_area: bool = Form(False),
    use_annotation_mask: bool = Form(False),
    use_edge_guided: bool = Form(False),
    use_adaptive_binning: bool = Form(False),
    use_auto_color: bool = Form(False)
):
    """Extract curves using optimized algorithm with legacy fallback"""
    try:
        start_time = datetime.now()
        image_data = await file.read()
        selected_colors_list = json.loads(selected_colors)
        curves_map = {}

        # Validate scale bounds for log scales (legacy semantics)
        if x_scale_type == "log" and (x_min <= 0 or x_max <= 0):
            raise HTTPException(status_code=400, detail="X-axis must be positive for log scale")
        if y_scale_type == "log" and (y_min <= 0 or y_max <= 0):
            raise HTTPException(status_code=400, detail="Y-axis must be positive for log scale")

        # Strategy 1: Try legacy first (most reliable)
        if mode == "legacy" or mode == "auto":
            logger.info("Attempting legacy extraction")
            legacy_data, _ = process_image_legacy(
                image_data,
                'custom',
                'X', 'Y', 'Label',
                x_min, x_max, y_min, y_max,
                x_scale, y_scale,
                {},
                x_scale_type, y_scale_type, min_size
            )
            curves_map = legacy_data if legacy_data else {}
            if curves_map:
                logger.info(f"Legacy extraction successful: {len(curves_map)} curves")
            else:
                logger.info("Legacy extraction failed, trying enhanced")

        # Strategy 2: Try enhanced with conservative settings
        if not curves_map and (mode == "enhanced" or mode == "auto"):
            logger.info("Attempting enhanced extraction with conservative settings")
            enhanced = process_image_enhanced(
                image_data,
                selected_colors_list,
                x_min, x_max, y_min, y_max, x_scale, y_scale,
                x_scale_type, y_scale_type,
                min_size,
                color_tolerance=0,  # No tolerance for better accuracy
                use_plot_area=False,  # Disable plot area detection initially
                use_annotation_mask=False,
                use_edge_guided=False,
                use_adaptive_binning=False
            )
            curves_map = enhanced if enhanced else {}

        # Strategy 3: Try enhanced with relaxed settings
        if not curves_map and (mode == "enhanced" or mode == "auto"):
            logger.info("Attempting enhanced extraction with relaxed settings")
            try_min_size = max(100, int(min_size * 0.5))
            try_color_tol = 10  # Small tolerance
            enhanced_relaxed = process_image_enhanced(
                image_data,
                selected_colors_list,
                x_min, x_max, y_min, y_max, x_scale, y_scale,
                x_scale_type, y_scale_type,
                try_min_size,
                color_tolerance=try_color_tol,
                use_plot_area=True,  # Enable plot area detection
                use_annotation_mask=False,
                use_edge_guided=False,
                use_adaptive_binning=False
            )
            curves_map = enhanced_relaxed if enhanced_relaxed else {}

        # Strategy 4: Try enhanced with very relaxed settings
        if not curves_map and (mode == "enhanced" or mode == "auto"):
            logger.info("Attempting enhanced extraction with very relaxed settings")
            try_min_size = max(50, int(min_size * 0.2))
            try_color_tol = 20
            enhanced_very_relaxed = process_image_enhanced(
                image_data,
                selected_colors_list,
                x_min, x_max, y_min, y_max, x_scale, y_scale,
                x_scale_type, y_scale_type,
                try_min_size,
                color_tolerance=try_color_tol,
                use_plot_area=True,
                use_annotation_mask=False,
                use_edge_guided=False,
                use_adaptive_binning=False
            )
            curves_map = enhanced_very_relaxed if enhanced_very_relaxed else {}

        # Strategy 5: Final fallback to auto-color clustering
        if not curves_map and use_auto_color:
            logger.info("Attempting auto-color clustering as final fallback")
            auto_curves = process_image_autocolor(
                image_data,
                x_min, x_max, y_min, y_max, x_scale, y_scale,
                x_scale_type, y_scale_type,
                max(50, int(min_size * 0.1))
            )
            curves_map = auto_curves if auto_curves else {}

        # Convert to expected format
        curves = []
        total_points = 0
        for color_name, data in curves_map.items():
            xs = data.get('x', [])
            ys = data.get('y', [])
            if xs and ys and len(xs) == len(ys):
                pts = [{ 'x': float(x), 'y': float(y), 'confidence': 0.95 } for x, y in zip(xs, ys)]
                curves.append({
                    'name': color_name,
                    'color': data.get('color', display_colors.get(color_name, '#000000')),
                    'points': pts,
                    'representation': color_name,
                    'pointCount': len(pts)
                })
                total_points += len(pts)

        processing_time = (datetime.now() - start_time).total_seconds()

        # Determine extraction method used
        extraction_method = "unknown"
        if curves_map:
            if mode == "legacy":
                extraction_method = "legacy"
            elif "cluster_" in next(iter(curves_map.keys()), ""):
                extraction_method = "auto-color"
            else:
                extraction_method = "enhanced"

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
            'success': True,
            'data': {
                'curves': curves,
                'total_points': total_points,
                'processing_time': processing_time,
                'success': len(curves) > 0,
                'plot_image': plot_image,
                'metadata': {
                    'extraction_method': extraction_method,
                    'quality_score': len(curves) / len(selected_colors_list) if selected_colors_list else 0,
                    'strategies_tried': [
                        'legacy' if mode in ['legacy', 'auto'] else None,
                        'enhanced_conservative' if mode in ['enhanced', 'auto'] else None,
                        'enhanced_relaxed' if mode in ['enhanced', 'auto'] else None,
                        'enhanced_very_relaxed' if mode in ['enhanced', 'auto'] else None,
                        'auto_color' if use_auto_color else None
                    ]
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
    min_size: int = Form(1000)  # Match legacy default
):
    """Extract curves using legacy algorithm - guaranteed compatibility"""
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

@app.post("/api/curve-extraction/extract-curves-optimized")
async def extract_curves_optimized(
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
    min_size: int = Form(1000),
    color_tolerance: int = Form(0),
    use_plot_area: bool = Form(False),
    x_axis_name: str = Form("X-Axis"),
    y_axis_name: str = Form("Y-Axis")
):
    """Extract curves using optimized algorithm - best of legacy and enhanced"""
    try:
        start_time = datetime.now()
        image_data = await file.read()
        selected_colors_list = json.loads(selected_colors)
        curves_map = {}

        # Validate scale bounds for log scales
        if x_scale_type == "log" and (x_min <= 0 or x_max <= 0):
            raise HTTPException(status_code=400, detail="X-axis must be positive for log scale")
        if y_scale_type == "log" and (y_min <= 0 or y_max <= 0):
            raise HTTPException(status_code=400, detail="Y-axis must be positive for log scale")

        # Strategy 1: Try legacy first (most reliable)
        logger.info("Attempting legacy extraction")
        legacy_data, _ = process_image_legacy(
            image_data,
            'custom',
            'X', 'Y', 'Label',
            x_min, x_max, y_min, y_max,
            x_scale, y_scale,
            {},
            x_scale_type, y_scale_type, min_size
        )
        curves_map = legacy_data if legacy_data else {}
        
        if curves_map:
            logger.info(f"Legacy extraction successful: {len(curves_map)} curves")
        else:
            logger.info("Legacy extraction failed, trying enhanced")
            
            # Strategy 2: Try enhanced with user settings
            enhanced = process_image_enhanced(
                image_data,
                selected_colors_list,
                x_min, x_max, y_min, y_max, x_scale, y_scale,
                x_scale_type, y_scale_type,
                min_size,
                color_tolerance=color_tolerance,
                use_plot_area=use_plot_area,
                use_annotation_mask=False,
                use_edge_guided=False,
                use_adaptive_binning=False
            )
            curves_map = enhanced if enhanced else {}

        # Convert to expected format
        curves = []
        total_points = 0
        for color_name, data in curves_map.items():
            xs = data.get('x', [])
            ys = data.get('y', [])
            if xs and ys and len(xs) == len(ys):
                pts = [{ 'x': float(x), 'y': float(y), 'confidence': 0.95 } for x, y in zip(xs, ys)]
                curves.append({
                    'name': color_name,
                    'color': data.get('color', display_colors.get(color_name, '#000000')),
                    'points': pts,
                    'representation': color_name,
                    'pointCount': len(pts)
                })
                total_points += len(pts)

        processing_time = (datetime.now() - start_time).total_seconds()

        # Determine extraction method used
        extraction_method = "legacy" if legacy_data else "enhanced"

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
            'success': True,
            'data': {
                'curves': curves,
                'total_points': total_points,
                'processing_time': processing_time,
                'success': len(curves) > 0,
                'plot_image': plot_image,
                'metadata': {
                    'extraction_method': extraction_method,
                    'quality_score': len(curves) / len(selected_colors_list) if selected_colors_list else 0,
                    'legacy_fallback_used': not legacy_data
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Optimized curve extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Optimized curve extraction failed: {str(e)}")

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