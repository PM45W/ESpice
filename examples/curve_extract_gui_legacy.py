import os
import sys
import csv
import cv2
import numpy as np
from scipy.signal import savgol_filter
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageTk
from collections import defaultdict
import logging
import math
import sqlite3
import json
import matplotlib
matplotlib.use('TkAgg')
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.backends.backend_pdf import PdfPages
from datetime import datetime
from io import BytesIO

# Custom logging handler for Text widget
class TextHandler(logging.Handler):
    def __init__(self, text_widget):
        logging.Handler.__init__(self)
        self.text_widget = text_widget

    def emit(self, record):
        msg = self.format(record)
        self.text_widget.configure(state='normal')
        self.text_widget.insert(tk.END, msg + '\n')
        self.text_widget.see(tk.END)
        self.text_widget.configure(state='disabled')

# Set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")

# CONFIGURATION
BIN_SIZE = 0.01
MIN_GRID_SIZE = 5
MAX_GRID_SIZE = 50
SMOOTH_POLYORDER = 3
MIN_VALID_BIN_COUNT = 60
SCRIPT_DIR = os.path.dirname(os.path.abspath(sys.argv[0]))
DB_PATH = os.path.join(SCRIPT_DIR, "curve_data.db")

# Note: Requires pdf2image (pip install pdf2image) and Poppler installed

# Color ranges and mappings
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
    'red': 'r',
    'red2': 'r',
    'blue': 'b',
    'green': 'g',
    'yellow': 'y',
    'cyan': 'c',
    'magenta': 'm',
    'orange': '#FFA500',
    'purple': 'purple'
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
    },
    'custom': {
        'x_axis': 'X', 'y_axis': 'Y', 'third_col': 'Label',
        'x_min': 0, 'x_max': 10, 'y_min': 0, 'y_max': 100,
        'x_scale': 1, 'y_scale': 1,
        'color_reps': {},
        'output_filename': 'custom_output',
        'x_scale_type': 'linear',
        'y_scale_type': 'linear'
    }
}

def init_database():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS products (
        product_id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        configuration TEXT,
        manufacturer TEXT,
        voltage_rating TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS curve_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        timestamp TEXT,
        png_file BLOB,
        csv_file BLOB,
        pdf_file BLOB,
        json_file BLOB,
        graph_type TEXT,
        x_axis_name TEXT,
        y_axis_name TEXT,
        third_col_name TEXT,
        x_min REAL,
        x_max REAL,
        y_min REAL,
        y_max REAL,
        x_scale REAL,
        y_scale REAL,
        x_scale_type TEXT,
        y_scale_type TEXT,
        min_size INTEGER,
        FOREIGN KEY (product_id) REFERENCES products (product_id)
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS graph_types (
        name TEXT PRIMARY KEY,
        x_axis TEXT,
        y_axis TEXT,
        third_col TEXT,
        x_min REAL,
        x_max REAL,
        y_min REAL,
        y_max REAL,
        x_scale REAL,
        y_scale REAL,
        x_scale_type TEXT,
        y_scale_type TEXT,
        color_reps TEXT,
        output_filename TEXT
    )''')
    c.execute("PRAGMA table_info(curve_data)")
    columns = [col[1] for col in c.fetchall()]
    if 'product_id' not in columns:
        c.execute("ALTER TABLE curve_data ADD COLUMN product_id INTEGER")
    c.execute("PRAGMA table_info(products)")
    columns = [col[1] for col in c.fetchall()]
    if 'voltage_rating' not in columns:
        c.execute("ALTER TABLE products ADD COLUMN voltage_rating TEXT")
    conn.commit()
    conn.close()

def auto_detect_grid_size(warped_image):
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

def save_curve_data(file_path, curve_data, representations, x_min, x_max, y_min, y_max, x_scale, y_scale, x_axis_name, y_axis_name, third_column_name, output_filename, output_dir="curve_output"):
    logger.debug(f"Saving curve data to {output_dir}/{output_filename}.csv")
    output_dir = os.path.join(SCRIPT_DIR, output_dir)
    os.makedirs(output_dir, exist_ok=True)
    csv_file = os.path.join(output_dir, f"{output_filename}.csv")
    
    sorted_colors = sorted(curve_data.keys())
    all_rows = []
    headers = [x_axis_name, y_axis_name, third_column_name]
    all_rows.append(headers)
    
    for color in sorted_colors:
        rep = representations.get(color, color)
        data = curve_data[color]
        for x, y in zip(data['x'], data['y']):
            all_rows.append([x, y, rep])
    
    all_rows[1:] = sorted(all_rows[1:], key=lambda row: [row[0], row[2]])
    
    with open(csv_file, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerows(all_rows)
    
    logger.info(f"Curve data saved to: {csv_file}")
    return csv_file

def process_image(file_path, graph_type, x_axis_name, y_axis_name, third_column_name, x_min, x_max, y_min, y_max, x_scale, y_scale, output_dir, output_filename, representations, x_scale_type, y_scale_type, min_size):
    logger.debug(f"Processing image: {file_path}")
    image = cv2.imread(file_path)
    if image is None:
        logger.error(f"Could not load image: {file_path}")
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

    csv_file = save_curve_data(file_path, curve_data, representations, x_min * x_scale, x_max * x_scale, y_min * y_scale, y_max * y_scale, 1, 1, x_axis_name, y_axis_name, third_column_name, output_filename, output_dir)
    return curve_data, csv_file

class CurveExtractionApp:
    def __init__(self, root):
        # ─────────── general window / DB setup ───────────
        self.root = root
        self.root.title("Curve Extraction Tool")
        self.root.state('zoomed')
        self.root.configure(bg='#f0f0f0')

        style = ttk.Style()
        style.theme_use('clam')
        style.configure('TButton', padding=6, font=('Helvetica', 10))
        style.configure('TLabel', font=('Helvetica', 10))
        style.configure('TEntry', padding=3)
        style.configure('TRadiobutton', font=('Helvetica', 10))
        style.configure('TCombobox', padding=3)

        init_database()
        self.conn = sqlite3.connect(DB_PATH)
        self.cursor = self.conn.cursor()

        # ─────────── top tool bar ───────────
        top_bar = ttk.Frame(self.root)
        top_bar.pack(fill=tk.X, pady=2)
        ttk.Button(top_bar, text="Load Image", command=self.load_image).pack(side=tk.LEFT, padx=2)
        ttk.Button(top_bar, text="Process Image", command=self.process_image).pack(side=tk.LEFT, padx=2)
        ttk.Button(top_bar, text="Save to DB", command=self.save_to_database).pack(side=tk.LEFT, padx=2)
        ttk.Button(top_bar, text="Clear", command=self.clear_all).pack(side=tk.LEFT, padx=2)
        self.status_label = ttk.Label(top_bar, text="Ready")
        self.status_label.pack(side=tk.RIGHT, padx=10)

        # ─────────── Notebook ───────────
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True)
        self.main_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.main_tab, text="Main")
        self.db_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.db_tab, text="Database")
        self.set_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.set_tab, text="Settings")
        ttk.Label(self.set_tab, text="Settings (future features)").pack(pady=20)

        # ══════════════════════════════════════════════════════════════════════════════
        #                               MAIN  TAB
        # ══════════════════════════════════════════════════════════════════════════════
        main_container = ttk.Frame(self.main_tab)
        main_container.pack(fill=tk.BOTH, expand=True)

        # 1️⃣  main_pane separates left (image + graph) and right (data input)  ----------
        main_pane = ttk.PanedWindow(main_container, orient='horizontal')
        main_pane.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # ── left side (image + extracted graph) ───────────────────────────────────────
        left_panel = ttk.Frame(main_pane)
        main_pane.add(left_panel, weight=3)  # more space

        ttk.Label(left_panel, text="Input Image").pack()
        self.canvas_w, self.canvas_h = 500, 350
        self.input_canvas = tk.Canvas(left_panel, bg='white', width=self.canvas_w,
                                     height=self.canvas_h, bd=2, relief=tk.SUNKEN)
        self.input_canvas.pack(fill=tk.BOTH, expand=True, pady=5)
        self.input_canvas.bind("<Configure>", self.center_image)

        ttk.Label(left_panel, text="Extracted Graph").pack()
        self.fig = Figure(figsize=(5, 3.5), dpi=100)
        self.ax = self.fig.add_subplot(111)
        self.graph_canvas = FigureCanvasTkAgg(self.fig, master=left_panel)
        self.graph_canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True, pady=5)

        # ── right side (all data input) ───────────────────────────────────────────────
        right_panel = ttk.Frame(main_pane)
        main_pane.add(right_panel, weight=1)

        # 2️⃣  input_pane splits basic settings vs. color-representation ----------------
        input_pane = ttk.PanedWindow(right_panel, orient='horizontal')
        input_pane.pack(fill=tk.BOTH, expand=True)

        # ── left sub-panel: graph / axis / output / product (now scrollable + compact) ----
        self.left_input_container = ttk.Frame(input_pane)
        input_pane.add(self.left_input_container, weight=3)

        # Make left side scrollable to ensure all controls are accessible on smaller screens
        self.left_canvas = tk.Canvas(self.left_input_container, highlightthickness=0)
        self.left_vscroll = ttk.Scrollbar(self.left_input_container, orient='vertical', command=self.left_canvas.yview)
        self.left_canvas.configure(yscrollcommand=self.left_vscroll.set)
        self.left_vscroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.left_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.left_input = ttk.Frame(self.left_canvas)
        self.left_canvas.create_window((0, 0), window=self.left_input, anchor='nw')
        self.left_input.bind("<Configure>", lambda e: self.left_canvas.configure(scrollregion=self.left_canvas.bbox("all")))

        #    A. Graph-type block -------------------------------------------------------
        gtype_grp = ttk.LabelFrame(self.left_input, text="Graph Type")
        gtype_grp.pack(fill=tk.X, padx=5, pady=5)

        self.graph_type_var = tk.StringVar(value="custom")
        self.graph_types = list(GRAPH_PRESETS.keys())
        self.graph_type_combo = ttk.Combobox(gtype_grp, textvariable=self.graph_type_var,
                                            state='readonly')
        self.update_graph_type_list()
        self.graph_type_combo.pack(fill=tk.X, padx=3, pady=3)
        self.graph_type_combo.bind("<<ComboboxSelected>>",
                                  lambda e: self.update_graph_type())

        ttk.Label(gtype_grp, text="Save as:").pack(anchor='w', padx=3)
        self.graph_type_name_entry = ttk.Entry(gtype_grp)
        self.graph_type_name_entry.pack(fill=tk.X, padx=3)
        self.save_graph_type_btn = ttk.Button(gtype_grp, text="Save Graph Type",
                                             command=self.save_graph_type, state='disabled')
        self.save_graph_type_btn.pack(anchor='w', padx=3, pady=3)
        ttk.Button(gtype_grp, text="Delete Graph Type",
                  command=self.delete_graph_type).pack(anchor='w', padx=3, pady=3)
        self.graph_type_var.trace_add('write', self.update_save_button_state)

        #    B & C. Axis range + Axis settings (side-by-side for compactness) ----------
        axis_container = ttk.Frame(self.left_input)
        axis_container.pack(fill=tk.X, padx=5, pady=5)
        axis_container.columnconfigure(0, weight=1)
        axis_container.columnconfigure(1, weight=1)

        range_grp = ttk.LabelFrame(axis_container, text="Axis Ranges")
        range_grp.grid(row=0, column=0, sticky="nsew", padx=(0, 4))
        for txt, attr in (("X-Min", "x_min_entry"), ("X-Max", "x_max_entry"),
                          ("Y-Min", "y_min_entry"), ("Y-Max", "y_max_entry")):
            ttk.Label(range_grp, text=txt).pack(anchor='w')
            setattr(self, attr, ttk.Entry(range_grp))
            getattr(self, attr).pack(fill=tk.X)

        axis_grp = ttk.LabelFrame(axis_container, text="Axis Settings")
        axis_grp.grid(row=0, column=1, sticky="nsew", padx=(4, 0))
        ttk.Label(axis_grp, text="X-Axis Name").pack(anchor='w')
        self.x_axis_entry = ttk.Entry(axis_grp)
        self.x_axis_entry.pack(fill=tk.X)
        ttk.Label(axis_grp, text="Y-Axis Name").pack(anchor='w')
        self.y_axis_entry = ttk.Entry(axis_grp)
        self.y_axis_entry.pack(fill=tk.X)
        ttk.Label(axis_grp, text="Third column").pack(anchor='w')
        self.third_col_entry = ttk.Entry(axis_grp)
        self.third_col_entry.pack(fill=tk.X)

        self.x_scale_type = tk.StringVar(value='linear')
        self.y_scale_type = tk.StringVar(value='linear')
        ttk.Label(axis_grp, text="X-Scale").pack(anchor='w', pady=2)
        for v in ('linear', 'log'):
            ttk.Radiobutton(axis_grp, text=v.capitalize(),
                           variable=self.x_scale_type, value=v).pack(anchor='w')
        ttk.Label(axis_grp, text="Y-Scale").pack(anchor='w', pady=2)
        for v in ('linear', 'log'):
            ttk.Radiobutton(axis_grp, text=v.capitalize(),
                           variable=self.y_scale_type, value=v).pack(anchor='w')

        #    D & E. Scaling factors + Output settings (side-by-side) -------------------
        out_scale_container = ttk.Frame(self.left_input)
        out_scale_container.pack(fill=tk.X, padx=5, pady=5)
        out_scale_container.columnconfigure(0, weight=1)
        out_scale_container.columnconfigure(1, weight=1)

        scale_grp = ttk.LabelFrame(out_scale_container, text="Scaling Factors")
        scale_grp.grid(row=0, column=0, sticky="nsew", padx=(0, 4))
        ttk.Label(scale_grp, text="X-Scale").pack(anchor='w')
        self.x_scale_entry = ttk.Entry(scale_grp)
        self.x_scale_entry.pack(fill=tk.X)
        ttk.Label(scale_grp, text="Y-Scale").pack(anchor='w')
        self.y_scale_entry = ttk.Entry(scale_grp)
        self.y_scale_entry.pack(fill=tk.X)

        out_grp = ttk.LabelFrame(out_scale_container, text="Output Settings")
        out_grp.grid(row=0, column=1, sticky="nsew", padx=(4, 0))
        ttk.Label(out_grp, text="Directory").pack(anchor='w')
        self.output_dir_entry = ttk.Entry(out_grp)
        self.output_dir_entry.pack(fill=tk.X)
        ttk.Label(out_grp, text="File name (no .csv)").pack(anchor='w')
        self.output_filename_entry = ttk.Entry(out_grp)
        self.output_filename_entry.pack(fill=tk.X)

        #    F. Add-product (moved from DB tab) ---------------------------------------
        prod_grp = ttk.LabelFrame(self.left_input, text="Add Product")
        prod_grp.pack(fill=tk.X, padx=5, pady=5)
        ttk.Label(prod_grp, text="Product Name").pack(anchor='w')
        self.new_product_entry = ttk.Entry(prod_grp)
        self.new_product_entry.pack(fill=tk.X)
        ttk.Label(prod_grp, text="Configuration").pack(anchor='w')
        self.new_config_entry = ttk.Combobox(prod_grp, values=["Single", "Half Bridge"], state='readonly')
        self.new_config_entry.pack(fill=tk.X)
        ttk.Label(prod_grp, text="Manufacturer").pack(anchor='w')
        self.new_manuf_entry = ttk.Combobox(prod_grp, values=["EPC", "GaN System"], state='readonly')
        self.new_manuf_entry.pack(fill=tk.X)
        ttk.Label(prod_grp, text="Voltage Rating").pack(anchor='w')
        self.new_voltage_rating_entry = ttk.Combobox(prod_grp, values=["100V", "200V"], state='readonly')
        self.new_voltage_rating_entry.pack(fill=tk.X)
        ttk.Button(prod_grp, text="Add Product", command=self.add_product).pack(anchor='e', pady=3)

        #    G. Log window -------------------------------------------------------------
        log_grp = ttk.LabelFrame(self.left_input, text="Log")
        log_grp.pack(fill=tk.BOTH, padx=5, pady=5, expand=True)
        self.log_text = tk.Text(log_grp, height=6, state='disabled')
        self.log_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        ttk.Scrollbar(log_grp, command=self.log_text.yview).pack(side=tk.RIGHT, fill=tk.Y)
        self.log_text.configure(yscrollcommand=lambda *a: None)
        TextHandler(self.log_text).setFormatter(formatter)
        logger.addHandler(TextHandler(self.log_text))

        # ── right sub-panel: color representations ---------------------------------
        self.color_panel = ttk.Frame(input_pane)
        input_pane.add(self.color_panel, weight=1)
        self.color_canvas = tk.Canvas(self.color_panel, bg='#f0f0f0', width=150)
        self.color_scroll = ttk.Scrollbar(self.color_panel, orient='vertical', command=self.color_canvas.yview)
        self.color_canvas.configure(yscrollcommand=self.color_scroll.set)
        self.color_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.color_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.color_reps_frame = ttk.Frame(self.color_canvas)
        self.color_canvas.create_window((0, 0), window=self.color_reps_frame, anchor='nw')
        self.color_reps_frame.bind("<Configure>", lambda e: self.color_canvas.configure(scrollregion=self.color_canvas.bbox("all")))
        self.color_rep_entries = {}

        # ══════════════════════════════════════════════════════════════════════════════
        #                               DATABASE TAB
        # ══════════════════════════════════════════════════════════════════════════════
        db_top = ttk.Frame(self.db_tab)
        db_top.pack(fill=tk.X, padx=5, pady=5)

        self.search_var = tk.StringVar()
        self.config_var = tk.StringVar(value="")
        self.manuf_var = tk.StringVar(value="")
        self.voltage_rating_var = tk.StringVar(value="")
        self.product_var = tk.StringVar()

        ttk.Label(db_top, text="Search").pack(anchor='w')
        self.search_entry = ttk.Entry(db_top, textvariable=self.search_var)
        self.search_entry.pack(fill=tk.X)
        ttk.Label(db_top, text="Configuration").pack(anchor='w')
        self.config_combo = ttk.Combobox(db_top, textvariable=self.config_var,
                                        values=["", "Single", "Half Bridge"], state='readonly')
        self.config_combo.pack(fill=tk.X)
        ttk.Label(db_top, text="Manufacturer").pack(anchor='w')
        self.manuf_combo = ttk.Combobox(db_top, textvariable=self.manuf_var,
                                       values=["", "EPC", "GaN System"], state='readonly')
        self.manuf_combo.pack(fill=tk.X)
        ttk.Label(db_top, text="Voltage Rating").pack(anchor='w')
        self.voltage_rating_combo = ttk.Combobox(db_top, textvariable=self.voltage_rating_var,
                                                values=["", "100V", "200V"], state='readonly')
        self.voltage_rating_combo.pack(fill=tk.X)
        ttk.Label(db_top, text="Product").pack(anchor='w')
        self.product_combo = ttk.Combobox(db_top, textvariable=self.product_var,
                                         state='readonly')
        self.product_combo.pack(fill=tk.X)

        for cb in (self.config_combo, self.manuf_combo, self.voltage_rating_combo, self.product_combo):
            cb.bind("<<ComboboxSelected>>", lambda e: self.search_products())
        self.search_var.trace_add('write', self.search_products)

        # results area
        self.db_graph_canvas = tk.Canvas(self.db_tab, bg='#f0f0f0')
        db_scroll = ttk.Scrollbar(self.db_tab, orient='vertical',
                                 command=self.db_graph_canvas.yview)
        db_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.db_graph_canvas.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.db_graph_frame = ttk.Frame(self.db_graph_canvas)
        self.db_graph_canvas.create_window((0, 0), window=self.db_graph_frame, anchor='nw')
        self.db_graph_frame.bind("<Configure>", lambda e: self.db_graph_canvas.configure(scrollregion=self.db_graph_canvas.bbox("all")))
        self.thumbnail_photos = []

        # ─────────── misc init ───────────
        self.min_size = tk.IntVar(value=1000)
        self.photo = None
        self.representations = {}
        self.update_graph_type()
        self.update_product_combo()
        logger.debug("GUI initialised with two PanedWindows.")

    def update_save_button_state(self, *args):
        if self.graph_type_var.get() == "custom":
            self.save_graph_type_btn.configure(state='normal')
        else:
            self.save_graph_type_btn.configure(state='disabled')
        self.update_color_reps_frame()

    def update_color_reps_frame(self, *args):
        for widget in self.color_reps_frame.winfo_children():
            widget.destroy()
        self.color_rep_entries.clear()
        if self.graph_type_var.get() == "custom" and hasattr(self, 'file_path'):
            ttk.Label(self.color_reps_frame, text="Color Representations", font=('Helvetica', 10, 'bold')).pack(anchor="w", pady=5)
            temp_image = cv2.imread(self.file_path)
            if temp_image is None:
                logger.error("Failed to read image for color detection")
                self.status_label.config(text="Failed to read image for color detection")
                return
            hsv_image = cv2.cvtColor(temp_image, cv2.COLOR_BGR2HSV)
            detected_base_colors = set()
            for color_name, (lower, upper) in color_ranges.items():
                mask = cv2.inRange(hsv_image, np.array(lower), np.array(upper))
                if np.any(mask):
                    base_color = color_to_base.get(color_name, color_name)
                    detected_base_colors.add(base_color)
            for color in sorted(detected_base_colors):
                frame = ttk.Frame(self.color_reps_frame)
                frame.pack(fill=tk.X, pady=2)
                ttk.Label(frame, text=f"{color} represents:").pack(side=tk.LEFT)
                entry = ttk.Entry(frame)
                entry.pack(fill=tk.X, padx=5, expand=True)
                self.color_rep_entries[color] = entry
                if color in self.representations:
                    entry.insert(0, self.representations[color])
            logger.debug(f"Updated color representations for {detected_base_colors}")

    def update_graph_type(self, *args):
        """
        Update the UI fields and color representations based on the selected graph type.
        """
        graph_type = self.graph_type_var.get()
        preset = GRAPH_PRESETS.get(graph_type, GRAPH_PRESETS['custom'])
        self.x_axis_entry.delete(0, tk.END)
        self.x_axis_entry.insert(0, preset['x_axis'])
        self.y_axis_entry.delete(0, tk.END)
        self.y_axis_entry.insert(0, preset['y_axis'])
        self.third_col_entry.delete(0, tk.END)
        self.third_col_entry.insert(0, preset['third_col'])
        self.x_min_entry.delete(0, tk.END)
        self.x_min_entry.insert(0, preset['x_min'])
        self.x_max_entry.delete(0, tk.END)
        self.x_max_entry.insert(0, preset['x_max'])
        self.y_min_entry.delete(0, tk.END)
        self.y_min_entry.insert(0, preset['y_min'])
        self.y_max_entry.delete(0, tk.END)
        self.y_max_entry.insert(0, preset['y_max'])
        self.x_scale_entry.delete(0, tk.END)
        self.x_scale_entry.insert(0, preset['x_scale'])
        self.y_scale_entry.delete(0, tk.END)
        self.y_scale_entry.insert(0, preset['y_scale'])
        self.x_scale_type.set(preset.get('x_scale_type', 'linear'))
        self.y_scale_type.set(preset.get('y_scale_type', 'linear'))
        self.output_dir_entry.delete(0, tk.END)
        self.output_dir_entry.insert(0, "curve_output")
        self.output_filename_entry.delete(0, tk.END)
        self.output_filename_entry.insert(0, preset['output_filename'])
        self.representations = preset.get('color_reps', {})
        self.update_color_reps_frame()
    def update_graph_type_list(self):
    # Start with the preset types
        self.graph_types = list(GRAPH_PRESETS.keys())
        # Add custom types from the database
        self.cursor.execute("SELECT name FROM graph_types")
        custom_types = [row[0] for row in self.cursor.fetchall() if row[0] not in self.graph_types]
        self.graph_types += custom_types
        self.graph_type_combo['values'] = self.graph_types
    def save_graph_type(self):
        if self.graph_type_var.get() != "custom":
            messagebox.showwarning("Warning", "Can only save graph type when 'custom' is selected!")
            return

        name = self.graph_type_name_entry.get().strip()
        if not name:
            messagebox.showwarning("Warning", "Please enter a name for the graph type!")
            return
        if name in self.graph_types:
            messagebox.showwarning("Warning", f"Graph type '{name}' already exists!")
            return

        try:
            color_reps = {color: entry.get() or color for color, entry in self.color_rep_entries.items()}
            settings = {
                'x_axis': self.x_axis_entry.get() or "X",
                'y_axis': self.y_axis_entry.get() or "Y",
                'third_col': self.third_col_entry.get() or "Label",
                'x_min': float(self.x_min_entry.get() or 0),
                'x_max': float(self.x_max_entry.get() or 10),
                'y_min': float(self.y_min_entry.get() or 0),
                'y_max': float(self.y_max_entry.get() or 100),
                'x_scale': float(self.x_scale_entry.get() or 1.0),
                'y_scale': float(self.y_scale_entry.get() or 1.0),
                'x_scale_type': self.x_scale_type.get(),
                'y_scale_type': self.y_scale_type.get(),
                'color_reps': color_reps,
                'output_filename': self.output_filename_entry.get() or "output"
            }
            self.cursor.execute('''INSERT INTO graph_types (
                name, x_axis, y_axis, third_col, x_min, x_max, y_min, y_max,
                x_scale, y_scale, x_scale_type, y_scale_type, color_reps, output_filename
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (
                name, settings['x_axis'], settings['y_axis'], settings['third_col'],
                settings['x_min'], settings['x_max'], settings['y_min'], settings['y_max'],
                settings['x_scale'], settings['y_scale'], settings['x_scale_type'],
                settings['y_scale_type'], json.dumps(settings['color_reps']),
                settings['output_filename']
            ))
            self.conn.commit()
            self.update_graph_type_list()
            self.graph_type_var.set(name)
            self.update_graph_type()
            self.status_label.config(text=f"Graph type '{name}' saved")
            logger.debug(f"Graph type '{name}' saved to database")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save graph type: {str(e)}")
            logger.error(f"Failed to save graph type: {str(e)}")

    def delete_graph_type(self):
        selected = self.graph_type_var.get()
        if selected in GRAPH_PRESETS:
            messagebox.showwarning("Warning", "Cannot delete predefined graph types!")
            return
        if selected not in self.graph_types:
            messagebox.showwarning("Warning", "No graph type selected or it does not exist!")
            return

        try:
            self.cursor.execute("DELETE FROM graph_types WHERE name = ?", (selected,))
            self.conn.commit()
            self.update_graph_type_list()
            self.graph_type_var.set("custom")
            self.update_graph_type()
            self.status_label.config(text=f"Graph type '{selected}' deleted")
            logger.debug(f"Graph type '{selected}' deleted from database")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to delete graph type: {str(e)}")
            logger.error(f"Failed to delete graph type: {str(e)}")

    def update_product_combo(self):
        self.cursor.execute("SELECT DISTINCT product_name FROM products")
        products = [row[0] for row in self.cursor.fetchall()]
        self.product_combo['values'] = products
        if products:
            self.product_var.set(products[0])
        else:
            self.product_var.set("")
        self.search_products()

    def search_products(self, *args):
        search_text = self.search_var.get().lower()
        config = self.config_var.get()
        manuf = self.manuf_var.get()
        voltage_rating = self.voltage_rating_var.get()
        query = "SELECT DISTINCT product_name FROM products WHERE 1=1"
        params = []
        if search_text:
            query += " AND product_name LIKE ?"
            params.append(f"%{search_text}%")
        if config:
            query += " AND configuration = ?"
            params.append(config)
        if manuf:
            query += " AND manufacturer = ?"
            params.append(manuf)
        if voltage_rating:
            query += " AND voltage_rating = ?"
            params.append(voltage_rating)
        self.cursor.execute(query, params)
        products = [row[0] for row in self.cursor.fetchall()]
        self.product_combo['values'] = products
        if products:
            self.product_var.set(products[0])
        else:
            self.product_var.set("")
        self.display_product_graphs()

    def add_product(self):
        product_name = self.new_product_entry.get().strip()
        configuration = self.new_config_entry.get()
        manufacturer = self.new_manuf_entry.get()
        voltage_rating = self.new_voltage_rating_entry.get()
        if not product_name:
            messagebox.showwarning("Warning", "Please enter a product name!")
            return
        try:
            self.cursor.execute("INSERT INTO products (product_name, configuration, manufacturer, voltage_rating) VALUES (?, ?, ?, ?)",
                               (product_name, configuration or None, manufacturer or None, voltage_rating or None))
            self.conn.commit()
            self.update_product_combo()
            self.new_product_entry.delete(0, tk.END)
            self.new_config_entry.set("")
            self.new_manuf_entry.set("")
            self.new_voltage_rating_entry.set("")
            self.status_label.config(text=f"Added product '{product_name}'")
            logger.debug(f"Added product '{product_name}' with config '{configuration}', manuf '{manufacturer}', voltage_rating '{voltage_rating}'")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to add product: {str(e)}")
            logger.error(f"Failed to add product: {str(e)}")

    def display_product_graphs(self):
        from io import BytesIO
        try:
            from pdf2image import convert_from_bytes
        except ImportError:
            logger.error("pdf2image not installed. Install with 'pip install pdf2image' and ensure Poppler is installed.")
            self.status_label.config(text="pdf2image not installed")
            return
        for widget in self.db_graph_frame.winfo_children():
            widget.destroy()
        self.thumbnail_photos.clear()
        product = self.product_var.get()
        if not product:
            return
        self.cursor.execute("SELECT product_id FROM products WHERE product_name = ?", (product,))
        product_id = self.cursor.fetchone()
        if not product_id:
            return
        product_id = product_id[0]
        self.cursor.execute("SELECT id, pdf_file, timestamp FROM curve_data WHERE product_id = ?", (product_id,))
        graphs = self.cursor.fetchall()
        row = 0
        for graph_id, pdf_data, timestamp in graphs:
            try:
                images = convert_from_bytes(pdf_data)
                if images:
                    img = images[0].resize((100, 100), Image.Resampling.LANCZOS)
                    photo = ImageTk.PhotoImage(img)
                    self.thumbnail_photos.append(photo)
                    label = ttk.Label(self.db_graph_frame, image=photo, text=f"ID {graph_id}: {timestamp}", compound="top")
                    label.grid(row=row, column=0, padx=5, pady=5)
                    row += 1
            except Exception as e:
                logger.error(f"Failed to display thumbnail for graph ID {graph_id}: {str(e)}")
        logger.debug(f"Displayed {row} graph thumbnails for product '{product}'")

    def load_image(self):
        file_path = filedialog.askopenfilename(filetypes=[("Image files", "*.png *.jpg *.jpeg *.bmp")])
        if file_path:
            try:
                self.image = Image.open(file_path)
                self.image = self.image.resize((self.canvas_w, self.canvas_h), Image.Resampling.LANCZOS)
                self.photo = ImageTk.PhotoImage(self.image)
                self.input_canvas.delete("all")
                canvas_width = self.input_canvas.winfo_width()
                canvas_height = self.input_canvas.winfo_height()
                img_width = self.photo.width()
                img_height = self.photo.height()
                x = (canvas_width - img_width) // 2
                y = (canvas_height - img_height) // 2
                self.input_canvas.create_image(x, y, anchor="nw", image=self.photo)
                self.ax.clear()
                self.graph_canvas.draw()
                self.status_label.config(text=f"Image loaded: {os.path.basename(file_path)}")
                self.file_path = file_path
                self.curve_data = None
                self.update_color_reps_frame()
                logger.debug(f"Image loaded: {file_path}")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to load image: {str(e)}")
                logger.error(f"Failed to load image: {str(e)}")

    def center_image(self, event=None):
        if hasattr(self, 'photo') and self.photo:
            canvas_width = self.input_canvas.winfo_width()
            canvas_height = self.input_canvas.winfo_height()
            img_width = self.photo.width()
            img_height = self.photo.height()
            x = (canvas_width - img_width) // 2
            y = (canvas_height - img_height) // 2
            self.input_canvas.delete("all")
            self.input_canvas.create_image(x, y, anchor="nw", image=self.photo)
            logger.debug(f"Centered image at ({x}, {y}) in canvas ({canvas_width}, {canvas_height})")

    def process_image(self):
        if not hasattr(self, 'file_path'):
            messagebox.showwarning("Warning", "Please load an image first!")
            return

        try:
            graph_type = self.graph_type_var.get()
            x_axis_name = self.x_axis_entry.get() or "X"
            y_axis_name = self.y_axis_entry.get() or "Y"
            third_col_name = self.third_col_entry.get() or "Label"
            x_min = float(self.x_min_entry.get() or 0)
            x_max = float(self.x_max_entry.get() or 10)
            y_min = float(self.y_min_entry.get() or 0)
            y_max = float(self.y_max_entry.get() or 100)
            x_scale = float(self.x_scale_entry.get() or 1.0)
            y_scale = float(self.y_scale_entry.get() or 1.0)
            output_dir = self.output_dir_entry.get() or "curve_output"
            output_filename = self.output_filename_entry.get() or "output"
            x_scale_type = self.x_scale_type.get()
            y_scale_type = self.y_scale_type.get()
            min_size = self.min_size.get()

            if x_max <= x_min or y_max <= y_min:
                raise ValueError("Max values must be greater than min values")
            if x_scale_type == 'log' and (x_min <= 0 or x_max <= 0):
                raise ValueError("X-axis min and max must be positive for logarithmic scale")
            if y_scale_type == 'log' and (y_min <= 0 or y_max <= 0):
                raise ValueError("Y-axis min and max must be positive for logarithmic scale")

            if graph_type == 'custom' or graph_type not in GRAPH_PRESETS:
                self.representations = {color: entry.get() or color for color, entry in self.color_rep_entries.items()}
            else:
                self.representations = GRAPH_PRESETS[graph_type]['color_reps'] if graph_type in GRAPH_PRESETS else self.representations

            self.curve_data, csv_file = process_image(
                self.file_path, graph_type, x_axis_name, y_axis_name, third_col_name,
                x_min, x_max, y_min, y_max, x_scale, y_scale, output_dir, output_filename,
                self.representations, x_scale_type, y_scale_type, min_size
            )

            if self.curve_data:
                self.plot_curves(x_min * x_scale, x_max * x_scale, y_min * y_scale, y_max * y_scale, x_axis_name, y_axis_name, x_scale_type, y_scale_type)
                self.status_label.config(text=f"Curves extracted, saved to {csv_file}")
                logger.debug(f"Curves extracted, saved to {csv_file}")
            else:
                messagebox.showerror("Error", "Failed to extract curves")
                logger.error("Failed to extract curves")
        except ValueError as e:
            messagebox.showerror("Error", f"Invalid input: {str(e)}")
            logger.error(f"Invalid input: {str(e)}")
        except Exception as e:
            messagebox.showerror("Error", f"Processing failed: {str(e)}")
            logger.error(f"Processing failed: {str(e)}")

    def save_to_database(self):
        if not hasattr(self, 'file_path') or not self.curve_data:
            messagebox.showwarning("Warning", "Please process an image first!")
            return
        if not self.product_var.get():
            messagebox.showwarning("Warning", "Please select a product in the Database tab!")
            return

        try:
            self.cursor.execute("SELECT product_id FROM products WHERE product_name = ?", (self.product_var.get(),))
            product_id = self.cursor.fetchone()
            if not product_id:
                raise ValueError(f"Product '{self.product_var.get()}' not found in database")
            product_id = product_id[0]

            with open(self.file_path, 'rb') as f:
                png_data = f.read()

            csv_path = os.path.join(SCRIPT_DIR, self.output_dir_entry.get() or "curve_output", f"{self.output_filename_entry.get() or 'output'}.csv")
            with open(csv_path, 'rb') as f:
                csv_data = f.read()

            pdf_path = os.path.join(SCRIPT_DIR, "temp_plot.pdf")
            with PdfPages(pdf_path) as pdf:
                pdf.savefig(self.fig)
            with open(pdf_path, 'rb') as f:
                pdf_data = f.read()
            os.remove(pdf_path)

            settings = {
                'graph_type': self.graph_type_var.get(),
                'x_axis_name': self.x_axis_entry.get() or "X",
                'y_axis_name': self.y_axis_entry.get() or "Y",
                'third_col_name': self.third_col_entry.get() or "Label",
                'x_min': float(self.x_min_entry.get() or 0),
                'x_max': float(self.x_max_entry.get() or 10),
                'y_min': float(self.y_min_entry.get() or 0),
                'y_max': float(self.y_max_entry.get() or 100),
                'x_scale': float(self.x_scale_entry.get() or 1.0),
                'y_scale': float(self.y_scale_entry.get() or 1.0),
                'x_scale_type': self.x_scale_type.get(),
                'y_scale_type': self.y_scale_type.get(),
                'min_size': self.min_size.get(),
                'representations': self.representations
            }
            json_data = json.dumps(settings).encode('utf-8')

            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self.cursor.execute('''INSERT INTO curve_data (
                product_id, timestamp, png_file, csv_file, pdf_file, json_file,
                graph_type, x_axis_name, y_axis_name, third_col_name,
                x_min, x_max, y_min, y_max, x_scale, y_scale,
                x_scale_type, y_scale_type, min_size
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (
                product_id, timestamp, sqlite3.Binary(png_data), sqlite3.Binary(csv_data), sqlite3.Binary(pdf_data), sqlite3.Binary(json_data),
                settings['graph_type'], settings['x_axis_name'], settings['y_axis_name'], settings['third_col_name'],
                settings['x_min'] * settings['x_scale'], settings['x_max'] * settings['x_scale'],
                settings['y_min'] * settings['y_scale'], settings['y_max'] * settings['y_scale'],
                settings['x_scale'], settings['y_scale'], settings['x_scale_type'], settings['y_scale_type'], settings['min_size']
            ))
            self.conn.commit()
            self.status_label.config(text=f"Data saved to product '{self.product_var.get()}'")
            logger.debug(f"Data saved to product '{self.product_var.get()}'")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save to database: {str(e)}")
            logger.error(f"Failed to save to database: {str(e)}")

    def plot_curves(self, x_min, x_max, y_min, y_max, x_axis_name, y_axis_name, x_scale_type, y_scale_type):
        self.ax.clear()

        if x_scale_type == 'log':
            self.ax.set_xscale('log')
        if y_scale_type == 'log':
            self.ax.set_yscale('log')

        for color, data in self.curve_data.items():
            self.ax.plot(data['x'], data['y'], color=display_colors.get(color, 'g'), label=self.representations.get(color, color))

        self.ax.set_xlim(x_min, x_max)
        self.ax.set_ylim(y_min, y_max)
        self.ax.set_xlabel(x_axis_name)
        self.ax.set_ylabel(y_axis_name)
        self.ax.grid(True, which="both", ls="--", alpha=0.7)
        if self.representations:
            self.ax.legend()
        self.fig.tight_layout()
        self.graph_canvas.draw()

    def clear_all(self):
        self.input_canvas.delete("all")
        self.ax.clear()
        self.graph_canvas.draw()
        self.photo = None
        self.curve_data = None
        self.representations = {}
        self.graph_type_var.set("custom")
        self.update_graph_type()
        self.status_label.config(text="All cleared")
        if hasattr(self, 'file_path'):
            del self.file_path
        logger.debug("Cleared all data and canvases")

    def __del__(self):
        if hasattr(self, 'conn'):
            self.conn.close()

if __name__ == "__main__":
    root = tk.Tk()
    app = CurveExtractionApp(root)
    root.mainloop()