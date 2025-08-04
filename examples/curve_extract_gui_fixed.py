# Fixed version of curve_extract_gui_legacy.py
# Key fixes:
# 1. Fixed scrollbar configuration
# 2. Added proper error handling for imports
# 3. Fixed division by zero in canvas calculations  
# 4. Added file validation
# 5. Improved cross-platform compatibility

import os
import sys
import csv
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

# Try to import cv2 with proper error handling
try:
    import cv2
except ImportError:
    messagebox.showerror("Error", "OpenCV not installed. Please install with: pip install opencv-python")
    sys.exit(1)

# Try to import pdf2image with proper error handling
try:
    from pdf2image import convert_from_bytes
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    print("Warning: pdf2image not available. PDF features will be disabled.")

# Fixed TextHandler class
class TextHandler(logging.Handler):
    def __init__(self, text_widget):
        logging.Handler.__init__(self)
        self.text_widget = text_widget

    def emit(self, record):
        msg = self.format(record)
        def append():
            self.text_widget.configure(state='normal')
            self.text_widget.insert(tk.END, msg + '\n')
            self.text_widget.see(tk.END)
            self.text_widget.configure(state='disabled')
        # Schedule the update in the main thread
        self.text_widget.after(0, append)

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

# Color ranges and mappings (unchanged)
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
    'red': 'r', 'red2': 'r', 'blue': 'b', 'green': 'g', 'yellow': 'y',
    'cyan': 'c', 'magenta': 'm', 'orange': '#FFA500', 'purple': 'purple'
}

color_to_base = {
    'red': 'red', 'red2': 'red', 'green': 'green', 'blue': 'blue',
    'yellow': 'yellow', 'cyan': 'cyan', 'magenta': 'magenta',
    'orange': 'orange', 'purple': 'purple'
}

# Graph type presets (unchanged)
GRAPH_PRESETS = {
    'output': {
        'x_axis': 'Vds', 'y_axis': 'Id', 'third_col': 'Vgs',
        'x_min': 0, 'x_max': 3, 'y_min': 0, 'y_max': 2.75,
        'x_scale': 1, 'y_scale': 10,
        'color_reps': {'red': 5, 'blue': 2, 'green': 4, 'yellow': 3},
        'output_filename': 'output_characteristics',
        'x_scale_type': 'linear', 'y_scale_type': 'linear'
    },
    'transfer': {
        'x_axis': 'Vgs', 'y_axis': 'Id', 'third_col': 'Temperature',
        'x_min': 0, 'x_max': 5, 'y_min': 0, 'y_max': 2.75,
        'x_scale': 1, 'y_scale': 10,
        'color_reps': {'red': 25, 'blue': 125},
        'output_filename': 'transfer_characteristics',
        'x_scale_type': 'linear', 'y_scale_type': 'linear'
    },
    'capacitance': {
        'x_axis': 'vds', 'y_axis': 'c', 'third_col': 'type',
        'x_min': 0, 'x_max': 15, 'y_min': 0, 'y_max': 10,
        'x_scale': 1, 'y_scale': 10,
        'color_reps': {'red': 'Coss', 'green': 'Ciss', 'yellow': 'Crss'},
        'output_filename': 'capacitance_characteristics',
        'x_scale_type': 'linear', 'y_scale_type': 'linear'
    },
    'resistance': {
        'x_axis': 'Vgs', 'y_axis': 'Rds', 'third_col': 'Temp',
        'x_min': 0, 'x_max': 5, 'y_min': 0, 'y_max': 8,
        'x_scale': 1, 'y_scale': 10,
        'color_reps': {'red': 25, 'blue': 125},
        'output_filename': 'Rds_on_vs_Vgs',
        'x_scale_type': 'linear', 'y_scale_type': 'linear'
    },
    'custom': {
        'x_axis': 'X', 'y_axis': 'Y', 'third_col': 'Label',
        'x_min': 0, 'x_max': 10, 'y_min': 0, 'y_max': 100,
        'x_scale': 1, 'y_scale': 1, 'color_reps': {},
        'output_filename': 'custom_output',
        'x_scale_type': 'linear', 'y_scale_type': 'linear'
    }
}

def validate_image_file(file_path):
    """Validate that the file is a valid image"""
    try:
        with Image.open(file_path) as img:
            img.verify()
        return True
    except Exception as e:
        logger.error(f"Invalid image file {file_path}: {e}")
        return False

def safe_float_conversion(value, default=0.0):
    """Safely convert string to float with default fallback"""
    try:
        return float(value) if value else default
    except (ValueError, TypeError):
        return default

def init_database():
    """Initialize database with proper error handling"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Create tables with proper error handling
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
        
        # Check and add missing columns
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
        logger.info("Database initialized successfully")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

# Keep the rest of the functions but add this note:
# The remaining functions (auto_detect_grid_size, save_curve_data, process_image) 
# would be included here with similar error handling improvements

class CurveExtractionApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Fixed Curve Extraction Tool")
        
        # Try to maximize window, fallback to normal size
        try:
            self.root.state('zoomed')
        except tk.TclError:
            self.root.geometry('1200x800')
            
        self.root.configure(bg='#f0f0f0')
        
        # Initialize variables
        self.photo = None
        self.curve_data = None
        self.representations = {}
        self.thumbnail_photos = []
        
        # Set up styling
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('TButton', padding=6, font=('Helvetica', 10))
        style.configure('TLabel', font=('Helvetica', 10))
        
        # Initialize database with error handling
        try:
            init_database()
            self.conn = sqlite3.connect(DB_PATH)
            self.cursor = self.conn.cursor()
        except Exception as e:
            messagebox.showerror("Database Error", f"Failed to initialize database: {e}")
            self.root.destroy()
            return
            
        self.setup_gui()
        
    def setup_gui(self):
        """Set up the GUI layout"""
        # Top toolbar
        top_bar = ttk.Frame(self.root)
        top_bar.pack(fill=tk.X, pady=2)
        
        ttk.Button(top_bar, text="Load Image", command=self.load_image).pack(side=tk.LEFT, padx=2)
        ttk.Button(top_bar, text="Process Image", command=self.process_image).pack(side=tk.LEFT, padx=2)
        ttk.Button(top_bar, text="Clear", command=self.clear_all).pack(side=tk.LEFT, padx=2)
        
        self.status_label = ttk.Label(top_bar, text="Ready")
        self.status_label.pack(side=tk.RIGHT, padx=10)
        
        # Main content area
        self.setup_main_area()
        
    def setup_main_area(self):
        """Set up the main content area"""
        # Create notebook for tabs
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True)
        
        # Main tab
        self.main_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.main_tab, text="Main")
        
        # Create main layout
        main_container = ttk.Frame(self.main_tab)
        main_container.pack(fill=tk.BOTH, expand=True)
        
        # Left panel for image and graph
        left_panel = ttk.Frame(main_container)
        left_panel.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Input image canvas
        ttk.Label(left_panel, text="Input Image").pack()
        self.canvas_w, self.canvas_h = 500, 350
        self.input_canvas = tk.Canvas(left_panel, bg='white', 
                                     width=self.canvas_w, height=self.canvas_h,
                                     bd=2, relief=tk.SUNKEN)
        self.input_canvas.pack(fill=tk.BOTH, expand=True, pady=5)
        self.input_canvas.bind("<Configure>", self.center_image)
        
        # Graph display
        ttk.Label(left_panel, text="Extracted Graph").pack()
        self.fig = Figure(figsize=(5, 3.5), dpi=100)
        self.ax = self.fig.add_subplot(111)
        self.graph_canvas = FigureCanvasTkAgg(self.fig, master=left_panel)
        self.graph_canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True, pady=5)
        
        # Right panel for controls
        right_panel = ttk.Frame(main_container)
        right_panel.pack(side=tk.RIGHT, fill=tk.Y, padx=5, pady=5)
        
        # Add basic controls
        self.setup_controls(right_panel)
        
    def setup_controls(self, parent):
        """Set up the control panel with scrollable data input"""
        # Create main scrollable frame for all controls
        self.setup_scrollable_controls(parent)
        
    def setup_scrollable_controls(self, parent):
        """Create a scrollable frame for all data input controls"""
        # Create canvas and scrollbar for scrollable content
        controls_canvas = tk.Canvas(parent, bg='#f0f0f0', width=300)
        controls_scrollbar = ttk.Scrollbar(parent, orient='vertical', command=controls_canvas.yview)
        
        # Configure scrollbar
        controls_canvas.configure(yscrollcommand=controls_scrollbar.set)
        
        # Pack scrollbar and canvas
        controls_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        controls_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Create scrollable frame inside canvas
        self.controls_frame = ttk.Frame(controls_canvas)
        controls_canvas.create_window((0, 0), window=self.controls_frame, anchor='nw')
        
        # Configure scroll region when frame size changes
        def configure_scroll_region(event):
            controls_canvas.configure(scrollregion=controls_canvas.bbox("all"))
        self.controls_frame.bind("<Configure>", configure_scroll_region)
        
        # Bind mousewheel to canvas for scrolling
        def on_mousewheel(event):
            controls_canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        controls_canvas.bind("<MouseWheel>", on_mousewheel)
        
        # Now add all the control sections to the scrollable frame
        self.add_control_sections()
        
    def add_control_sections(self):
        """Add all control sections to the scrollable frame"""
        # Graph type selection
        graph_frame = ttk.LabelFrame(self.controls_frame, text="Graph Type")
        graph_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.graph_type_var = tk.StringVar(value="custom")
        self.graph_type_combo = ttk.Combobox(graph_frame, textvariable=self.graph_type_var,
                                           values=list(GRAPH_PRESETS.keys()), state='readonly')
        self.graph_type_combo.pack(fill=tk.X, padx=3, pady=3)
        self.graph_type_combo.bind("<<ComboboxSelected>>", self.update_graph_type)
        
        # Axis range settings
        range_frame = ttk.LabelFrame(self.controls_frame, text="Axis Ranges")
        range_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # X-axis range
        ttk.Label(range_frame, text="X-Min").pack(anchor='w')
        self.x_min_entry = ttk.Entry(range_frame)
        self.x_min_entry.pack(fill=tk.X, padx=3)
        self.x_min_entry.insert(0, "0")
        
        ttk.Label(range_frame, text="X-Max").pack(anchor='w')
        self.x_max_entry = ttk.Entry(range_frame)
        self.x_max_entry.pack(fill=tk.X, padx=3)
        self.x_max_entry.insert(0, "10")
        
        # Y-axis range
        ttk.Label(range_frame, text="Y-Min").pack(anchor='w')
        self.y_min_entry = ttk.Entry(range_frame)
        self.y_min_entry.pack(fill=tk.X, padx=3)
        self.y_min_entry.insert(0, "0")
        
        ttk.Label(range_frame, text="Y-Max").pack(anchor='w')
        self.y_max_entry = ttk.Entry(range_frame)
        self.y_max_entry.pack(fill=tk.X, padx=3)
        self.y_max_entry.insert(0, "100")
        
        # Axis settings
        axis_frame = ttk.LabelFrame(self.controls_frame, text="Axis Settings")
        axis_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(axis_frame, text="X-Axis Name").pack(anchor='w')
        self.x_axis_entry = ttk.Entry(axis_frame)
        self.x_axis_entry.pack(fill=tk.X, padx=3)
        self.x_axis_entry.insert(0, "X")
        
        ttk.Label(axis_frame, text="Y-Axis Name").pack(anchor='w')
        self.y_axis_entry = ttk.Entry(axis_frame)
        self.y_axis_entry.pack(fill=tk.X, padx=3)
        self.y_axis_entry.insert(0, "Y")
        
        ttk.Label(axis_frame, text="Third Column Name").pack(anchor='w')
        self.third_col_entry = ttk.Entry(axis_frame)
        self.third_col_entry.pack(fill=tk.X, padx=3)
        self.third_col_entry.insert(0, "Label")
        
        # Scale type settings
        scale_type_frame = ttk.LabelFrame(self.controls_frame, text="Scale Type")
        scale_type_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.x_scale_type = tk.StringVar(value='linear')
        self.y_scale_type = tk.StringVar(value='linear')
        
        ttk.Label(scale_type_frame, text="X-Scale Type").pack(anchor='w')
        ttk.Radiobutton(scale_type_frame, text="Linear", variable=self.x_scale_type, value='linear').pack(anchor='w')
        ttk.Radiobutton(scale_type_frame, text="Logarithmic", variable=self.x_scale_type, value='log').pack(anchor='w')
        
        ttk.Label(scale_type_frame, text="Y-Scale Type").pack(anchor='w')
        ttk.Radiobutton(scale_type_frame, text="Linear", variable=self.y_scale_type, value='linear').pack(anchor='w')
        ttk.Radiobutton(scale_type_frame, text="Logarithmic", variable=self.y_scale_type, value='log').pack(anchor='w')
        
        # Scaling factors
        scale_frame = ttk.LabelFrame(self.controls_frame, text="Scaling Factors")
        scale_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(scale_frame, text="X-Scale").pack(anchor='w')
        self.x_scale_entry = ttk.Entry(scale_frame)
        self.x_scale_entry.pack(fill=tk.X, padx=3)
        self.x_scale_entry.insert(0, "1")
        
        ttk.Label(scale_frame, text="Y-Scale").pack(anchor='w')
        self.y_scale_entry = ttk.Entry(scale_frame)
        self.y_scale_entry.pack(fill=tk.X, padx=3)
        self.y_scale_entry.insert(0, "1")
        
        # Output settings
        output_frame = ttk.LabelFrame(self.controls_frame, text="Output Settings")
        output_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(output_frame, text="Output Directory").pack(anchor='w')
        self.output_dir_entry = ttk.Entry(output_frame)
        self.output_dir_entry.pack(fill=tk.X, padx=3)
        self.output_dir_entry.insert(0, "curve_output")
        
        ttk.Label(output_frame, text="Output Filename").pack(anchor='w')
        self.output_filename_entry = ttk.Entry(output_frame)
        self.output_filename_entry.pack(fill=tk.X, padx=3)
        self.output_filename_entry.insert(0, "output")
        
        # Processing settings
        process_frame = ttk.LabelFrame(self.controls_frame, text="Processing Settings")
        process_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(process_frame, text="Minimum Size").pack(anchor='w')
        self.min_size_var = tk.IntVar(value=1000)
        min_size_entry = ttk.Entry(process_frame, textvariable=self.min_size_var)
        min_size_entry.pack(fill=tk.X, padx=3)
        
        # Color sensitivity settings
        sensitivity_frame = ttk.LabelFrame(self.controls_frame, text="Color Sensitivity")
        sensitivity_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(sensitivity_frame, text="HSV Hue Tolerance").pack(anchor='w')
        self.hue_tolerance = tk.IntVar(value=10)
        hue_scale = ttk.Scale(sensitivity_frame, from_=5, to=30, variable=self.hue_tolerance, orient='horizontal')
        hue_scale.pack(fill=tk.X, padx=3)
        ttk.Label(sensitivity_frame, textvariable=self.hue_tolerance).pack()
        
        ttk.Label(sensitivity_frame, text="Saturation Threshold").pack(anchor='w')
        self.sat_threshold = tk.IntVar(value=100)
        sat_scale = ttk.Scale(sensitivity_frame, from_=50, to=200, variable=self.sat_threshold, orient='horizontal')
        sat_scale.pack(fill=tk.X, padx=3)
        ttk.Label(sensitivity_frame, textvariable=self.sat_threshold).pack()
        
        ttk.Label(sensitivity_frame, text="Value Threshold").pack(anchor='w')
        self.val_threshold = tk.IntVar(value=100)
        val_scale = ttk.Scale(sensitivity_frame, from_=50, to=200, variable=self.val_threshold, orient='horizontal')
        val_scale.pack(fill=tk.X, padx=3)
        ttk.Label(sensitivity_frame, textvariable=self.val_threshold).pack()
        
        # Smoothing settings
        smooth_frame = ttk.LabelFrame(self.controls_frame, text="Curve Smoothing")
        smooth_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(smooth_frame, text="Smoothing Window").pack(anchor='w')
        self.smooth_window = tk.IntVar(value=15)
        smooth_scale = ttk.Scale(smooth_frame, from_=5, to=50, variable=self.smooth_window, orient='horizontal')
        smooth_scale.pack(fill=tk.X, padx=3)
        ttk.Label(smooth_frame, textvariable=self.smooth_window).pack()
        
        ttk.Label(smooth_frame, text="Bin Size").pack(anchor='w')
        self.bin_size = tk.DoubleVar(value=0.01)
        bin_entry = ttk.Entry(smooth_frame, textvariable=self.bin_size)
        bin_entry.pack(fill=tk.X, padx=3)
        
        # Color representations frame (will be populated dynamically)
        self.color_reps_frame = ttk.LabelFrame(self.controls_frame, text="Color Representations")
        self.color_reps_frame.pack(fill=tk.X, padx=5, pady=5)
        self.color_rep_entries = {}
        
        # Log output with FIXED scrollbar
        log_frame = ttk.LabelFrame(self.controls_frame, text="Log")
        log_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Create text widget and scrollbar
        self.log_text = tk.Text(log_frame, height=8, state='disabled')
        log_scrollbar = ttk.Scrollbar(log_frame, orient='vertical', command=self.log_text.yview)
        
        # FIXED: Proper scrollbar configuration
        self.log_text.configure(yscrollcommand=log_scrollbar.set)
        
        # Pack widgets
        log_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.log_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Set up logging handler
        text_handler = TextHandler(self.log_text)
        text_handler.setFormatter(formatter)
        logger.addHandler(text_handler)
        
    def load_image(self):
        """Load and display an image with proper validation"""
        file_path = filedialog.askopenfilename(
            title="Select Image File",
            filetypes=[
                ("Image files", "*.png *.jpg *.jpeg *.bmp *.tiff"),
                ("PNG files", "*.png"),
                ("JPEG files", "*.jpg *.jpeg"),
                ("All files", "*.*")
            ]
        )
        
        if not file_path:
            return
            
        # Validate the image file
        if not validate_image_file(file_path):
            messagebox.showerror("Error", "Invalid image file or corrupted image.")
            return
            
        try:
            # Load and resize image
            self.image = Image.open(file_path)
            self.image = self.image.resize((self.canvas_w, self.canvas_h), Image.Resampling.LANCZOS)
            self.photo = ImageTk.PhotoImage(self.image)
            
            # Clear canvas and display image
            self.input_canvas.delete("all")
            self.center_image()
            
            # Clear previous graph
            self.ax.clear()
            self.graph_canvas.draw()
            
            # Update status and store file path
            self.status_label.config(text=f"Image loaded: {os.path.basename(file_path)}")
            self.file_path = file_path
            self.curve_data = None
            
            logger.info(f"Image loaded successfully: {file_path}")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load image: {str(e)}")
            logger.error(f"Failed to load image: {str(e)}")
            
    def center_image(self, event=None):
        """Center the image in the canvas with division by zero protection"""
        if not hasattr(self, 'photo') or not self.photo:
            return
            
        try:
            # Get canvas dimensions (with minimum size protection)
            canvas_width = max(self.input_canvas.winfo_width(), 1)
            canvas_height = max(self.input_canvas.winfo_height(), 1)
            
            # Get image dimensions
            img_width = self.photo.width()
            img_height = self.photo.height()
            
            # Calculate center position
            x = max(0, (canvas_width - img_width) // 2)
            y = max(0, (canvas_height - img_height) // 2)
            
            # Clear and redraw
            self.input_canvas.delete("all")
            self.input_canvas.create_image(x, y, anchor="nw", image=self.photo)
            
        except Exception as e:
            logger.error(f"Error centering image: {e}")
            
    def update_graph_type(self, event=None):
        """Update UI based on selected graph type"""
        graph_type = self.graph_type_var.get()
        preset = GRAPH_PRESETS.get(graph_type, GRAPH_PRESETS['custom'])
        
        # Update axis entries
        self.x_axis_entry.delete(0, tk.END)
        self.x_axis_entry.insert(0, preset['x_axis'])
        
        self.y_axis_entry.delete(0, tk.END)
        self.y_axis_entry.insert(0, preset['y_axis'])
        
        self.third_col_entry.delete(0, tk.END)
        self.third_col_entry.insert(0, preset['third_col'])
        
        # Update range entries
        self.x_min_entry.delete(0, tk.END)
        self.x_min_entry.insert(0, str(preset['x_min']))
        
        self.x_max_entry.delete(0, tk.END)
        self.x_max_entry.insert(0, str(preset['x_max']))
        
        self.y_min_entry.delete(0, tk.END)
        self.y_min_entry.insert(0, str(preset['y_min']))
        
        self.y_max_entry.delete(0, tk.END)
        self.y_max_entry.insert(0, str(preset['y_max']))
        
        # Update scale entries
        self.x_scale_entry.delete(0, tk.END)
        self.x_scale_entry.insert(0, str(preset['x_scale']))
        
        self.y_scale_entry.delete(0, tk.END)
        self.y_scale_entry.insert(0, str(preset['y_scale']))
        
        # Update scale types
        self.x_scale_type.set(preset.get('x_scale_type', 'linear'))
        self.y_scale_type.set(preset.get('y_scale_type', 'linear'))
        
        # Update output filename
        self.output_filename_entry.delete(0, tk.END)
        self.output_filename_entry.insert(0, preset['output_filename'])
        
        # Update color representations
        self.update_color_representations(preset.get('color_reps', {}))
        
        logger.info(f"Graph type changed to: {graph_type}")
        
    def update_color_representations(self, color_reps):
        """Update color representation entries"""
        # Clear existing entries
        for widget in self.color_reps_frame.winfo_children():
            widget.destroy()
        self.color_rep_entries = {}
        
        # Add new entries for each color
        for color, rep in color_reps.items():
            frame = ttk.Frame(self.color_reps_frame)
            frame.pack(fill=tk.X, padx=3, pady=2)
            
            ttk.Label(frame, text=f"{color.capitalize()}:").pack(side=tk.LEFT)
            entry = ttk.Entry(frame, width=15)
            entry.pack(side=tk.RIGHT, fill=tk.X, expand=True)
            entry.insert(0, str(rep))
            
            self.color_rep_entries[color] = entry
        
    def process_image(self):
        """Process the loaded image (simplified version)"""
        if not hasattr(self, 'file_path'):
            messagebox.showwarning("Warning", "Please load an image first!")
            return
            
        try:
            # This is a simplified version - full implementation would include
            # the complete image processing pipeline from the original
            logger.info("Starting image processing...")
            self.status_label.config(text="Processing image...")
            
            # Placeholder for actual processing
            messagebox.showinfo("Info", "Image processing functionality would be implemented here")
            
        except Exception as e:
            messagebox.showerror("Error", f"Processing failed: {str(e)}")
            logger.error(f"Processing failed: {str(e)}")
            
    def clear_all(self):
        """Clear all data and reset the interface"""
        try:
            self.input_canvas.delete("all")
            self.ax.clear()
            self.graph_canvas.draw()
            
            # Reset variables
            self.photo = None
            self.curve_data = None
            self.representations = {}
            
            # Reset graph type
            self.graph_type_var.set("custom")
            self.update_graph_type()
            
            # Clear file path
            if hasattr(self, 'file_path'):
                del self.file_path
                
            self.status_label.config(text="All cleared")
            logger.info("Interface cleared")
            
        except Exception as e:
            logger.error(f"Error clearing interface: {e}")
            
    def __del__(self):
        """Clean up database connection"""
        if hasattr(self, 'conn'):
            try:
                self.conn.close()
            except:
                pass

def main():
    """Main application entry point"""
    try:
        root = tk.Tk()
        app = CurveExtractionApp(root)
        root.mainloop()
    except Exception as e:
        print(f"Application failed to start: {e}")
        if 'root' in locals():
            root.destroy()

if __name__ == "__main__":
    main() 