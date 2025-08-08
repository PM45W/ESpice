import cv2
import numpy as np
import matplotlib.pyplot as plt
from collections import defaultdict
from scipy.signal import savgol_filter
import os
import csv
import tkinter as tk
from tkinter import filedialog
import sys

# CONFIGURATION
BIN_SIZE = 0.01
MIN_GRID_SIZE = 5
MAX_GRID_SIZE = 50
SMOOTH_POLYORDER = 3
MIN_VALID_BIN_COUNT = 60
DEFAULT_X_TICK_STEP = 1.0
DEFAULT_Y_TICK_STEP = 10.0

# Get script directory for saving files
SCRIPT_DIR = os.path.dirname(os.path.abspath(sys.argv[0]))

# Expanded and improved color ranges
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
    'red': (0, 0, 255),
    'red2': (0, 0, 255),
    'blue': (255, 0, 0),
    'green': (0, 255, 0),
    'yellow': (0, 255, 255),
    'cyan': (255, 255, 0),
    'magenta': (255, 0, 255),
    'orange': (0, 165, 255),
    'purple': (128, 0, 128)
}

# Map specific colors to base colors for representation
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

def auto_detect_grid_size(warped_image):
    gray = cv2.cvtColor(warped_image, cv2.COLOR_BGR2GRAY)
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude_spectrum = 20 * np.log(np.abs(fshift)+1)
    rows, cols = gray.shape
    crow, ccol = rows//2, cols//2
    spectrum_crop = magnitude_spectrum[crow-100:crow+100, ccol-100:ccol+100]
    peaks = np.argwhere(spectrum_crop > np.percentile(spectrum_crop, 99.5))
    if len(peaks) < 4:
        print("Warning: Unable to detect grid frequency reliably. Defaulting to 10x10.")
        return 10, 10
    distances = np.linalg.norm(peaks - np.array([100, 100]), axis=1)
    dominant_freq = np.median(distances) / 100
    grid_size = int(1/dominant_freq)
    grid_size = np.clip(grid_size, MIN_GRID_SIZE, MAX_GRID_SIZE)
    return grid_size, grid_size

def save_curve_data(file_path, curve_data, representations, x_min, x_max, y_min, y_max, x_scale, y_scale, fig, x_axis_name, y_axis_name, third_column_name):
    # Prompt user for folder name
    folder_name = input("Enter folder name to save CSV and plot: ").strip()
    if not folder_name:
        folder_name = "curve_output"
    
    # Create folder in script directory
    output_dir = os.path.join(SCRIPT_DIR, folder_name)
    os.makedirs(output_dir, exist_ok=True)
    
    # Define output file paths
    base_name = os.path.splitext(os.path.basename(file_path))[0]
    csv_file = os.path.join(output_dir, f"{base_name}_curve_data.csv")
    plot_file = os.path.join(output_dir, f"{base_name}_plot.png")
    
    # Prepare data for CSV with requested format: x_axis_name, y_axis_name, third_column_name
    sorted_colors = sorted(curve_data.keys())
    all_rows = []
    
    # Add headers using axis names and user-defined third column name
    headers = [x_axis_name, y_axis_name, third_column_name]
    all_rows.append(headers)
    
    # Collect all data points with their corresponding representation
    for color in sorted_colors:
        rep = representations.get(color, color)
        data = curve_data[color]
        for x, y in zip(data['x'], data['y']):
            scaled_x = x * x_scale
            scaled_y = y * y_scale
            all_rows.append([scaled_x, scaled_y, rep])
    
    # Sort rows by x-axis (first column) for consistent output
    all_rows[1:] = sorted(all_rows[1:], key=lambda row: row[0])
    
    # Save CSV file
    with open(csv_file, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerows(all_rows)
    
    # Save plot if figure is provided
    if fig is not None:
        fig.savefig(plot_file, dpi=300, bbox_inches='tight')
        print(f"Plot saved to: {plot_file}")
    
    print(f"Curve data saved to: {csv_file}")

def extract_and_plot_curves(file_path):
    image = cv2.imread(file_path)
    if image is None:
        print("Error: Could not load image.")
        return

    hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # Detect grid boundary
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    largest_contour = max(contours, key=cv2.contourArea)
    epsilon = 0.02 * cv2.arcLength(largest_contour, True)
    approx = cv2.approxPolyDP(largest_contour, epsilon, True)
    if len(approx) != 4:
        print("Failed to detect rectangular grid.")
        return

    pts = approx.reshape(4, 2)
    sums = pts.sum(axis=1)
    diffs = np.diff(pts, axis=1).flatten()
    rect = np.zeros((4, 2), dtype=np.float32)
    rect[0] = pts[np.argmin(sums)]
    rect[2] = pts[np.argmax(sums)]
    rect[1] = pts[np.argmin(diffs)]
    rect[3] = pts[np.argmax(diffs)]

    # Normalize grid
    warped_size = 1000
    dst = np.array([[0, 0], [warped_size, 0], [warped_size, warped_size], [0, warped_size]], dtype=np.float32)
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (warped_size, warped_size))

    # Auto detect grid size
    rows, cols = auto_detect_grid_size(warped)
    print(f"Estimated grid size: {rows} x {cols}")

    # Get axis ranges from user
    try:
        x_min = float(input(f"Enter X-axis minimum value (value at BOTTOM LEFT CORNER origin, scale down to 1-10): ") or 0)
        x_max = float(input(f"Enter X-axis maximum value (value at BOTTOM RIGHT CORNER, scale down to 1-10): ") or 10)
        if x_max <= x_min:
            print("Invalid X-axis range. X_max must be greater than X_min.")
            return
    except ValueError:
        print("Invalid input for X-axis range.")
        return

    try:
        y_min = float(input(f"Enter Y-axis minimum value (value at BOTTOM LEFT CORNER origin; possibly negative, scale down to 1-10): ") or 0)
        y_max = float(input(f"Enter Y-axis maximum value (value at TOP LEFT CORNER; possibly negative, scale down to 1-10): ") or 100)
        if y_max <= y_min:
            print("Invalid Y-axis range. Y_max must be greater than Y_min.")
            return
    except ValueError:
        print("Invalid input for Y-axis range.")
        return

    # Get axis names from user
    x_axis_name = input("Enter X-axis name: ").strip() or "X"
    y_axis_name = input("Enter Y-axis name: ").strip() or "Y"

    # Get third column name from user
    third_column_name = input("Enter name for the third column (curve label): ").strip() or "Label"

    # Get tick step sizes from user
    try:
        x_tick_step = float(input(f"Enter X-axis tick step size: ") or DEFAULT_X_TICK_STEP)
        y_tick_step = float(input(f"Enter Y-axis tick step size: ") or DEFAULT_Y_TICK_STEP)
    except ValueError:
        print("Invalid input for tick step size. Using default values.")
        x_tick_step, y_tick_step = DEFAULT_X_TICK_STEP, DEFAULT_Y_TICK_STEP

    # Initialize plot and data storage
    fig = plt.figure(figsize=(10, 8))
    curve_data = {}
    representations = {}  # Store what each color represents
    base_color_points = defaultdict(list)  # Store points by base color
    
    # First pass: detect which colors are present and collect points
    detected_base_colors = set()
    for color_name, (lower, upper) in color_ranges.items():
        lower = np.array(lower)
        upper = np.array(upper)
        mask = cv2.inRange(hsv_image, lower, upper)
        warped_mask = cv2.warpPerspective(mask, M, (warped_size, warped_size))

        # Dynamic filtering parameters
        if color_name in ['red', 'red2']:
            min_size = 1400
            smooth_win = 20
        elif color_name == 'blue':
            min_size = 1400
            smooth_win = 17
        else:
            min_size = 1400
            smooth_win = 11

        # Remove small fragments
        kernel = np.ones((3, 3), np.uint8)
        cleaned_mask = cv2.morphologyEx(warped_mask, cv2.MORPH_OPEN, kernel)
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(cleaned_mask)
        filtered_mask = np.zeros_like(warped_mask)
        for i in range(1, num_labels):
            if stats[i, cv2.CC_STAT_AREA] >= min_size:
                filtered_mask[labels == i] = 255

        ys, xs = np.where(filtered_mask > 0)
        if len(xs) == 0:
            continue
            
        # Convert to logical coordinates
        logical_x = xs * (x_max - x_min) / warped_size + x_min
        logical_y = (warped_size - ys) * (y_max - y_min) / warped_size + y_min
        
        # Get base color and add points
        base_color = color_to_base.get(color_name, color_name)
        base_color_points[base_color].extend(zip(logical_x, logical_y))
        detected_base_colors.add(base_color)

    # Get representations for detected base colors
    print("\nPlease define what each color represents (e.g., '5V', 'Temperature'):")
    for base_color in sorted(detected_base_colors):
        rep = input(f"What does the {base_color} curve represent? ").strip()
        if not rep:
            rep = base_color  # Default to color name if no input
        representations[base_color] = rep

    # Process points by base color
    for base_color, points in base_color_points.items():
        if not points:
            continue
            
        # Unzip points
        all_x, all_y = zip(*points)
        logical_x = list(all_x)
        logical_y = list(all_y)
        
        # Bin data
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

        # Set smoothing parameters by base color
        if base_color == 'red':
            smooth_win = 20
        elif base_color == 'blue':
            smooth_win = 17
        else:
            smooth_win = 11

        # Smoothing
        if len(final_y) > smooth_win:
            smooth_y = savgol_filter(final_y, smooth_win, SMOOTH_POLYORDER)
        else:
            smooth_y = final_y

        # Store data
        curve_data[base_color] = {
            'x': final_x,
            'y': smooth_y.tolist() if hasattr(smooth_y, 'tolist') else smooth_y
        }

        # Plot with representation
        bgr = display_colors.get(base_color, display_colors['green'])
        rgb = (bgr[2]/255, bgr[1]/255, bgr[0]/255)
        rep = representations.get(base_color, base_color)
        plt.plot(final_x, smooth_y, marker='o', linestyle='-', markersize=2, 
                color=rgb, label=f"{base_color} ({rep})")

    # Set plot limits, ticks, and labels
    plt.xlim(x_min, x_max)
    plt.ylim(y_min, y_max)
    plt.xticks(np.arange(x_min, x_max + x_tick_step, x_tick_step))
    plt.yticks(np.arange(y_min, y_max + y_tick_step, y_tick_step))
    plt.xlabel(x_axis_name)
    plt.ylabel(y_axis_name)

    plt.grid(True)
    plt.title(input("Input title: "))
    plt.legend()
    plt.show()

    # Ask for scaling factors after plot is closed
    print("\nThe plot has been displayed. Now you can scale the data for export.")
    try:
        x_scale = float(input("Enter X scaling factor (default=1): ") or 1)
        y_scale = float(input("Enter Y scaling factor (default=1): ") or 1)
    except ValueError:
        print("Invalid input for scaling factors. Using default value 1.")
        x_scale, y_scale = 1.0, 1.0
    
    # Save curve data and plot to CSV
    if curve_data:
        save_curve_data(file_path, curve_data, representations, 
                        x_min, x_max, y_min, y_max, x_scale, y_scale, 
                        fig, x_axis_name, y_axis_name, third_column_name)
    else:
        print("No curve data found to save.")

# ---------- RUN --------------
if __name__ == "__main__":
    root = tk.Tk()
    root.withdraw()
    print("Please select a PNG file containing CLEAR graph and axis")
    png_file = filedialog.askopenfilename(
        title="Select PNG File",
        filetypes=[("PNG files", "*.png"), ("All files", "*.*")]
    )
    if not png_file:
        print("No file selected. Exiting.")
    else:
        extract_and_plot_curves(png_file)