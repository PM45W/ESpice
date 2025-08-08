use image::RgbImage;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Configuration constants - enhanced for better detection
const BIN_SIZE: f64 = 0.01;
const MIN_GRID_SIZE: usize = 5;
const MAX_GRID_SIZE: usize = 50;
const MIN_COLOR_PIXELS: usize = 500; // Minimum pixels for color detection
const COLOR_TOLERANCE: f32 = 0.15; // Color tolerance for better matching

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphConfig {
    pub x_min: f64,
    pub x_max: f64,
    pub y_min: f64,
    pub y_max: f64,
    pub x_scale: f64,
    pub y_scale: f64,
    pub x_scale_type: String,
    pub y_scale_type: String,
    pub graph_type: String,
    pub x_axis_name: Option<String>,
    pub y_axis_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedColor {
    pub name: String,
    pub display_name: Option<String>,
    pub color: String,
    pub pixel_count: usize,
    pub hsv: Option<HSV>,
    pub confidence: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HSV {
    pub h: f32,
    pub s: f32,
    pub v: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurvePoint {
    pub x: f64,
    pub y: f64,
    pub label: Option<String>,
    pub confidence: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurveData {
    pub name: String,
    pub color: String,
    pub points: Vec<CurvePoint>,
    pub representation: Option<String>,
    pub point_count: Option<usize>,
    pub metadata: Option<CurveMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurveMetadata {
    pub min_x: Option<f64>,
    pub max_x: Option<f64>,
    pub min_y: Option<f64>,
    pub max_y: Option<f64>,
    pub average_slope: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionResult {
    pub success: bool,
    pub curves: Vec<CurveData>,
    pub total_points: usize,
    pub processing_time: f64,
    pub error: Option<String>,
    pub metadata: Option<ExtractionMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionMetadata {
    pub image_width: Option<usize>,
    pub image_height: Option<usize>,
    pub detected_colors: Option<usize>,
    pub extraction_method: Option<String>,
    pub quality_score: Option<f32>,
}

// Enhanced color ranges based on Python legacy implementation and graph analysis
pub struct ColorRange {
    pub lower: [u8; 3],
    pub upper: [u8; 3],
    pub display_color: &'static str,
    pub base_color: &'static str,
    pub tolerance: f32, // Additional tolerance for each color
}

pub fn get_color_ranges() -> HashMap<&'static str, ColorRange> {
    let mut ranges = HashMap::new();
    
    // Enhanced red detection for semiconductor graphs
    ranges.insert("red", ColorRange {
        lower: [0, 120, 100],
        upper: [15, 255, 255],
        display_color: "#FF0000",
        base_color: "red",
        tolerance: 0.12,
    });
    
    ranges.insert("red2", ColorRange {
        lower: [165, 120, 100],
        upper: [180, 255, 255],
        display_color: "#FF0000",
        base_color: "red",
        tolerance: 0.12,
    });
    
    // Enhanced blue detection for semiconductor graphs
    ranges.insert("blue", ColorRange {
        lower: [85, 120, 100],
        upper: [135, 255, 255],
        display_color: "#0000FF",
        base_color: "blue",
        tolerance: 0.10,
    });
    
    // Enhanced green detection
    ranges.insert("green", ColorRange {
        lower: [35, 120, 100],
        upper: [85, 255, 255],
        display_color: "#00FF00",
        base_color: "green",
        tolerance: 0.15,
    });
    
    // Enhanced yellow detection
    ranges.insert("yellow", ColorRange {
        lower: [10, 120, 100],
        upper: [45, 255, 255],
        display_color: "#FFFF00",
        base_color: "yellow",
        tolerance: 0.18,
    });
    
    // Enhanced cyan detection
    ranges.insert("cyan", ColorRange {
        lower: [75, 120, 100],
        upper: [105, 255, 255],
        display_color: "#00FFFF",
        base_color: "cyan",
        tolerance: 0.12,
    });
    
    // Enhanced magenta detection
    ranges.insert("magenta", ColorRange {
        lower: [135, 120, 100],
        upper: [175, 255, 255],
        display_color: "#FF00FF",
        base_color: "magenta",
        tolerance: 0.15,
    });
    
    // Enhanced orange detection
    ranges.insert("orange", ColorRange {
        lower: [3, 120, 100],
        upper: [25, 255, 255],
        display_color: "#FFA500",
        base_color: "orange",
        tolerance: 0.20,
    });
    
    // Enhanced purple detection
    ranges.insert("purple", ColorRange {
        lower: [120, 120, 100],
        upper: [150, 255, 255],
        display_color: "#800080",
        base_color: "purple",
        tolerance: 0.15,
    });
    
    ranges
}

// Enhanced RGB to HSV conversion with better precision
fn rgb_to_hsv(r: u8, g: u8, b: u8) -> (f32, f32, f32) {
    let r = r as f32 / 255.0;
    let g = g as f32 / 255.0;
    let b = b as f32 / 255.0;
    
    let max = r.max(g.max(b));
    let min = r.min(g.min(b));
    let delta = max - min;
    
    let h = if delta == 0.0 {
        0.0
    } else if max == r {
        60.0 * (((g - b) / delta) % 6.0)
    } else if max == g {
        60.0 * (((b - r) / delta) + 2.0)
    } else {
        60.0 * (((r - g) / delta) + 4.0)
    };
    
    let s = if max == 0.0 { 0.0 } else { delta / max };
    let v = max;
    
    (h, s, v)
}

// Enhanced color matching with tolerance
fn color_matches_range(h: f32, s: f32, v: f32, range: &ColorRange) -> bool {
    let h_normalized = h / 2.0; // Convert to 0-180 range
    
    // Handle red color wraparound
    let h_match = if range.lower[0] > range.upper[0] {
        h_normalized >= range.lower[0] as f32 || h_normalized <= range.upper[0] as f32
    } else {
        h_normalized >= range.lower[0] as f32 && h_normalized <= range.upper[0] as f32
    };
    
    // More lenient saturation and value matching with tolerance
    let s_match = s * 255.0 >= range.lower[1] as f32 * (1.0 - range.tolerance) 
                  && s * 255.0 <= range.upper[1] as f32 * (1.0 + range.tolerance);
    let v_match = v * 255.0 >= range.lower[2] as f32 * (1.0 - range.tolerance) 
                  && v * 255.0 <= range.upper[2] as f32 * (1.0 + range.tolerance);
    
    h_match && s_match && v_match
}

// Auto-detect grid size using FFT - enhanced version
fn auto_detect_grid_size(image: &RgbImage) -> (usize, usize) {
    let (width, height) = image.dimensions();
    let size = width.min(height) as usize;
    
    // Convert to grayscale for analysis
    let gray: Vec<f32> = image.pixels()
        .map(|p| (p[0] as f32 * 0.299 + p[1] as f32 * 0.587 + p[2] as f32 * 0.114) / 255.0)
        .collect();
    
    // Enhanced grid detection using edge detection
    let mut edges = 0;
    for y in 1..height-1 {
        for x in 1..width-1 {
            let idx = (y * width + x) as usize;
            let gx = gray[idx + 1] - gray[idx - 1];
            let gy = gray[idx + width as usize] - gray[idx - width as usize];
            let gradient = (gx * gx + gy * gy).sqrt();
            if gradient > 0.1 {
                edges += 1;
            }
        }
    }
    
    // Estimate grid size based on edge density
    let edge_density = edges as f32 / (width * height) as f32;
    let estimated_size = if edge_density > 0.05 {
        (size / 80).max(MIN_GRID_SIZE).min(MAX_GRID_SIZE)
    } else {
        (size / 100).max(MIN_GRID_SIZE).min(MAX_GRID_SIZE)
    };
    
    (estimated_size, estimated_size)
}

// Enhanced color mask creation
fn create_color_mask(image: &RgbImage, range: &ColorRange) -> Vec<bool> {
    image.pixels()
        .map(|pixel| {
            let (h, s, v) = rgb_to_hsv(pixel[0], pixel[1], pixel[2]);
            color_matches_range(h, s, v, range)
        })
        .collect()
}

// Enhanced morphological operations
fn morphological_open(mask: &[bool], width: usize, height: usize) -> Vec<bool> {
    let mut result = vec![false; mask.len()];
    
    // Enhanced 3x3 erosion followed by dilation
    for y in 1..height-1 {
        for x in 1..width-1 {
            let idx = y * width + x;
            
            // Check 3x3 neighborhood with enhanced logic
            let mut all_true = true;
            let mut neighbor_count = 0;
            for dy in -1..=1 {
                for dx in -1..=1 {
                    let ny = (y as i32 + dy) as usize;
                    let nx = (x as i32 + dx) as usize;
                    let nidx = ny * width + nx;
                    if mask[nidx] {
                        neighbor_count += 1;
                    } else {
                        all_true = false;
                    }
                }
            }
            
            // Enhanced erosion: require at least 6 neighbors (including center)
            result[idx] = all_true && neighbor_count >= 6;
        }
    }
    
    // Enhanced dilation
    let mut final_result = vec![false; mask.len()];
    for y in 1..height-1 {
        for x in 1..width-1 {
            let idx = y * width + x;
            
            // Check 3x3 neighborhood
            let mut any_true = false;
            for dy in -1..=1 {
                for dx in -1..=1 {
                    let ny = (y as i32 + dy) as usize;
                    let nx = (x as i32 + dx) as usize;
                    let nidx = ny * width + nx;
                    if result[nidx] {
                        any_true = true;
                        break;
                    }
                }
                if any_true { break; }
            }
            
            final_result[idx] = any_true;
        }
    }
    
    final_result
}

// Enhanced connected components filtering
fn filter_connected_components(mask: &[bool], width: usize, height: usize, min_size: usize) -> Vec<bool> {
    let mut visited = vec![false; mask.len()];
    let mut result = vec![false; mask.len()];
    
    for y in 0..height {
        for x in 0..width {
            let idx = y * width + x;
            if mask[idx] && !visited[idx] {
                let mut component = Vec::new();
                let mut stack = vec![(x, y)];
                
                while let Some((cx, cy)) = stack.pop() {
                    let cidx = cy * width + cx;
                    if visited[cidx] || !mask[cidx] {
                        continue;
                    }
                    
                    visited[cidx] = true;
                    component.push(cidx);
                    
                    // Add neighbors with enhanced connectivity
                    for dy in -1..=1 {
                        for dx in -1..=1 {
                            if dx == 0 && dy == 0 { continue; }
                            let nx = cx as i32 + dx;
                            let ny = cy as i32 + dy;
                            if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                                stack.push((nx as usize, ny as usize));
                            }
                        }
                    }
                }
                
                // Enhanced size filtering with aspect ratio check
                if component.len() >= min_size {
                    // Calculate bounding box
                    let mut min_x = width;
                    let mut max_x = 0;
                    let mut min_y = height;
                    let mut max_y = 0;
                    
                    for &idx in &component {
                        let x = idx % width;
                        let y = idx / width;
                        min_x = min_x.min(x);
                        max_x = max_x.max(x);
                        min_y = min_y.min(y);
                        max_y = max_y.max(y);
                    }
                    
                    let width_comp = max_x - min_x + 1;
                    let height_comp = max_y - min_y + 1;
                    let aspect_ratio = width_comp as f32 / height_comp as f32;
                    
                    // Filter by aspect ratio (curves should be more horizontal than vertical)
                    if aspect_ratio > 0.3 && aspect_ratio < 10.0 {
                        for &idx in &component {
                            result[idx] = true;
                        }
                    }
                }
            }
        }
    }
    
    result
}

// Enhanced Savitzky-Golay smoothing
fn savgol_smooth(data: &[f64], window: usize) -> Vec<f64> {
    if data.len() <= window {
        return data.to_vec();
    }
    
    let mut result = Vec::with_capacity(data.len());
    let half_window = window / 2;
    
    for i in 0..data.len() {
        let start = i.saturating_sub(half_window);
        let end = (i + half_window + 1).min(data.len());
        
        let slice = &data[start..end];
        let sum: f64 = slice.iter().sum();
        let count = slice.len();
        
        // Enhanced smoothing with weighted average
        let weight_sum: f64 = slice.iter().enumerate().map(|(j, _)| {
            let dist = (j as f64 - count as f64 / 2.0).abs();
            1.0 / (1.0 + dist * 0.5)
        }).sum();
        
        let weighted_sum: f64 = slice.iter().enumerate().map(|(j, &val)| {
            let dist = (j as f64 - count as f64 / 2.0).abs();
            let weight = 1.0 / (1.0 + dist * 0.5);
            val * weight
        }).sum();
        
        result.push(weighted_sum / weight_sum);
    }
    
    result
}

// Main curve extraction function - enhanced version
pub fn extract_curves(
    image_data: &[u8],
    selected_colors: &[String],
    config: &GraphConfig,
) -> Result<ExtractionResult, String> {
    // Load image
    let image = image::load_from_memory(image_data)
        .map_err(|e| format!("Failed to load image: {}", e))?;
    
    let rgb_image = image.to_rgb8();
    let (width, height) = rgb_image.dimensions();
    
    // Auto-detect grid size
    let (_rows, _cols) = auto_detect_grid_size(&rgb_image);
    
    // Get color ranges
    let color_ranges = get_color_ranges();
    
    // Process each selected color
    let mut base_color_points: HashMap<String, Vec<(f64, f64)>> = HashMap::new();
    
    for color_name in selected_colors {
        let color_key = color_name.to_lowercase();
        
        if let Some(color_range) = color_ranges.get(color_key.as_str()) {
            // Create color mask
            let mask = create_color_mask(&rgb_image, color_range);
            
            // Apply morphological operations
            let cleaned_mask = morphological_open(&mask, width as usize, height as usize);
            
            // Filter connected components with enhanced minimum size
            let min_size = (width * height / 1000).max(1000); // Adaptive minimum size
            let filtered_mask = filter_connected_components(&cleaned_mask, width as usize, height as usize, min_size);
            
            // Extract points with enhanced coordinate conversion
            let mut points = Vec::new();
            for y in 0..height {
                for x in 0..width {
                    let idx = (y * width + x) as usize;
                    if filtered_mask[idx] {
                        // Enhanced coordinate conversion
                        let logical_x = if config.x_scale_type == "linear" {
                            x as f64 * (config.x_max - config.x_min) / width as f64 + config.x_min
                        } else {
                            let f = x as f64 / width as f64;
                            let log_x = config.x_min.ln() + f * (config.x_max.ln() - config.x_min.ln());
                            log_x.exp()
                        };
                        
                        let logical_y = if config.y_scale_type == "linear" {
                            (height - y) as f64 * (config.y_max - config.y_min) / height as f64 + config.y_min
                        } else {
                            let f = (height - y) as f64 / height as f64;
                            let log_y = config.y_min.ln() + f * (config.y_max.ln() - config.y_min.ln());
                            log_y.exp()
                        };
                        
                        points.push((logical_x, logical_y));
                    }
                }
            }
            
            // Group by base color
            let base_color = color_range.base_color.to_string();
            base_color_points.entry(base_color).or_insert_with(Vec::new).extend(points);
        }
    }
    
    // Process each base color
    let mut curves = Vec::new();
    
    for (base_color, points) in base_color_points {
        if points.is_empty() {
            continue;
        }
        
        // Enhanced binning with adaptive BIN_SIZE
        let mut data: HashMap<i64, Vec<f64>> = HashMap::new();
        for (x, y) in points {
            let bin_x = (x / BIN_SIZE).round() as i64;
            data.entry(bin_x).or_insert_with(Vec::new).push(y);
        }
        
        // Enhanced filtering and averaging
        let mut final_points = Vec::new();
        for (bin_x, y_vals) in data {
            if y_vals.is_empty() {
                continue;
            }
            
            let mut sorted_y = y_vals.clone();
            sorted_y.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
            
            let median = if sorted_y.len() % 2 == 0 {
                (sorted_y[sorted_y.len() / 2 - 1] + sorted_y[sorted_y.len() / 2]) / 2.0
            } else {
                sorted_y[sorted_y.len() / 2]
            };
            
            // Enhanced outlier filtering
            let filtered: Vec<f64> = sorted_y.into_iter()
                .filter(|&y| (y - median).abs() < 2.0 * 0.2) // Reduced tolerance for better precision
                .collect();
            
            if !filtered.is_empty() {
                let x_val = bin_x as f64 * BIN_SIZE;
                let y_val = filtered.iter().sum::<f64>() / filtered.len() as f64;
                final_points.push((x_val, y_val));
            }
        }
        
        // Sort by x
        final_points.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
        
        // Extract x and y vectors
        let x_vals: Vec<f64> = final_points.iter().map(|(x, _)| *x).collect();
        let y_vals: Vec<f64> = final_points.iter().map(|(_, y)| *y).collect();
        
        // Enhanced smoothing with adaptive window
        let smooth_window = match base_color.as_str() {
            "red" => (y_vals.len() / 10).max(5).min(25),
            "blue" => (y_vals.len() / 12).max(5).min(20),
            _ => (y_vals.len() / 15).max(3).min(15),
        };
        
        let smoothed_y = if y_vals.len() > smooth_window {
            savgol_smooth(&y_vals, smooth_window)
        } else {
            y_vals.clone()
        };
        
        // Apply scaling factors
        let scaled_x: Vec<f64> = x_vals.iter().map(|x| x * config.x_scale).collect();
        let scaled_y: Vec<f64> = smoothed_y.iter().map(|y| y * config.y_scale).collect();
        
        // Create curve points
        let curve_points: Vec<CurvePoint> = scaled_x.iter().zip(scaled_y.iter())
            .map(|(x, y)| CurvePoint {
                x: *x,
                y: *y,
                label: Some(format!("{:.3}, {:.3}", x, y)),
                confidence: None,
            })
            .collect();
        
        // Get display color
        let display_color = color_ranges.get(base_color.as_str())
            .map(|r| r.display_color.to_string())
            .unwrap_or_else(|| "#000000".to_string());
        
        curves.push(CurveData {
            name: base_color.clone(),
            color: display_color,
            points: curve_points,
            representation: Some(base_color.clone()),
            point_count: Some(final_points.len()),
            metadata: None,
        });
    }
    
    Ok(ExtractionResult {
        success: true,
        curves,
        total_points: final_points.len(),
        processing_time: 0.0, // Placeholder for actual processing time
        error: None,
        metadata: Some(ExtractionMetadata {
            image_width: Some(width),
            image_height: Some(height),
            detected_colors: Some(color_ranges.len()),
            extraction_method: Some("curve_extraction".to_string()),
            quality_score: None,
        }),
    })
}

// Enhanced color detection function
pub fn detect_colors(image_data: &[u8]) -> Result<Vec<DetectedColor>, String> {
    // Validate input data
    if image_data.is_empty() {
        return Err("Image data is empty".to_string());
    }
    
    // Log image data info for debugging
    println!("Processing image data: {} bytes", image_data.len());
    if image_data.len() >= 8 {
        println!("First 8 bytes: {:02x?}", &image_data[..8]);
    }
    
    let image = match image::load_from_memory(image_data) {
        Ok(img) => img,
        Err(e) => {
            println!("Failed to load image from memory: {}", e);
            return Err(format!("Failed to load image: {}", e));
        }
    };
    
    let rgb_image = image.to_rgb8();
    let (width, height) = rgb_image.dimensions();
    let total_pixels = (width * height) as usize;
    
    println!("Image loaded successfully: {}x{} pixels, {} total pixels", width, height, total_pixels);
    
    let color_ranges = get_color_ranges();
    let mut detected_colors = Vec::new();
    let mut processed_base_colors = std::collections::HashSet::new();
    
    for (color_name, color_range) in color_ranges {
        let mask = create_color_mask(&rgb_image, color_range);
        let pixel_count = mask.iter().filter(|&&b| b).count();
        
        // Enhanced minimum threshold based on image size
        let min_pixels = (total_pixels as f64 * 0.0005) as usize; // Reduced threshold for better detection
        
        println!("Color {}: {} pixels (threshold: {})", color_name, pixel_count, min_pixels);
        
        if pixel_count > min_pixels && !processed_base_colors.contains(color_range.base_color) {
            detected_colors.push(DetectedColor {
                name: color_range.base_color.to_string(),
                display_name: Some(color_range.base_color.to_string()),
                color: color_range.display_color.to_string(),
                pixel_count,
                hsv: None,
                confidence: None,
            });
            processed_base_colors.insert(color_range.base_color);
        }
    }
    
    // Sort by pixel count (most prominent colors first)
    detected_colors.sort_by(|a, b| b.pixel_count.cmp(&a.pixel_count));
    
    println!("Detected {} colors: {:?}", detected_colors.len(), 
             detected_colors.iter().map(|c| &c.name).collect::<Vec<_>>());
    
    Ok(detected_colors)
} 