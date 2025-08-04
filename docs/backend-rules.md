# Backend Development Rules - ESpice

## Overview
This document establishes specific rules and guidelines for backend development in the ESpice project, complementing the main project rules.

## Technology Stack
- **Language**: Rust 2021 Edition
- **Framework**: Tauri 2.0
- **Image Processing**: image, imageproc, nalgebra, ndarray, rustfft, rayon
- **Serialization**: serde, serde_json
- **Async Runtime**: tokio
- **HTTP Client**: reqwest
- **Build System**: Cargo

## Core Principles

### 1. Rust Safety and Performance
- **Zero-cost abstractions where possible**
- **Memory safety through ownership system**
- **Thread safety with proper synchronization**
- **Error handling with Result and Option types**

### 2. Tauri Integration
- **Commands must be async where appropriate**
- **Proper error handling and serialization**
- **Security-first approach with capabilities**
- **Cross-platform compatibility**

### 3. Image Processing
- **Efficient memory usage for large images**
- **Parallel processing with rayon**
- **Proper error handling for malformed data**
- **Performance optimization for real-time processing**

## File Organization

### Source Structure
```
src-tauri/src/
├── lib.rs              # Main library entry point and Tauri commands
├── main.rs             # Application entry point
├── curve_extraction.rs # Image processing and curve extraction
├── ollama_setup.rs     # Ollama integration and setup
└── utils/              # Utility functions and helpers
```

### Module Organization
```rust
// ✅ Good: Clear module organization
mod curve_extraction;
mod ollama_setup;
mod utils;

// Re-export public interfaces
pub use curve_extraction::{detect_colors, extract_curves, GraphConfig};
pub use ollama_setup::{check_ollama_installation, install_ollama};
```

## Development Guidelines

### 1. Tauri Command Implementation
```rust
// ✅ Good: Proper Tauri command with error handling
#[tauri::command]
async fn extract_image_curves(
    image_data: Vec<u8>,
    selected_colors: Vec<String>,
    config: GraphConfig,
) -> Result<ExtractionResult, String> {
    // Validate input data
    if image_data.is_empty() {
        return Err("Image data cannot be empty".to_string());
    }
    
    // Process image with proper error handling
    match extract_curves(&image_data, &selected_colors, &config) {
        Ok(result) => Ok(result),
        Err(e) => Err(format!("Curve extraction failed: {}", e)),
    }
}
```

### 2. Error Handling
```rust
// ✅ Good: Custom error types with proper implementation
#[derive(Debug, thiserror::Error)]
pub enum ProcessingError {
    #[error("Invalid image format: {0}")]
    InvalidFormat(String),
    #[error("Processing failed: {0}")]
    ProcessingFailed(String),
    #[error("Memory allocation failed")]
    MemoryError,
}

// ✅ Good: Proper error conversion
impl From<image::ImageError> for ProcessingError {
    fn from(err: image::ImageError) -> Self {
        ProcessingError::InvalidFormat(err.to_string())
    }
}
```

### 3. Data Structures
```rust
// ✅ Good: Proper serialization and validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphConfig {
    pub threshold: f64,
    pub min_points: usize,
    pub smoothing_factor: f64,
}

impl GraphConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.threshold < 0.0 || self.threshold > 1.0 {
            return Err("Threshold must be between 0.0 and 1.0".to_string());
        }
        if self.min_points == 0 {
            return Err("Minimum points must be greater than 0".to_string());
        }
        Ok(())
    }
}
```

### 4. Async Programming
```rust
// ✅ Good: Proper async/await usage
#[tauri::command]
async fn process_large_image(image_data: Vec<u8>) -> Result<ProcessedResult, String> {
    // Use tokio::spawn for CPU-intensive work
    let handle = tokio::spawn(async move {
        tokio::task::spawn_blocking(move || {
            // CPU-intensive image processing
            process_image_cpu_intensive(&image_data)
        }).await
    });
    
    match handle.await {
        Ok(Ok(result)) => Ok(result),
        Ok(Err(e)) => Err(format!("Processing failed: {}", e)),
        Err(e) => Err(format!("Task failed: {}", e)),
    }
}
```

## Performance Guidelines

### 1. Memory Management
```rust
// ✅ Good: Efficient memory usage
pub fn process_image_efficient(image_data: &[u8]) -> Result<ProcessedImage, ProcessingError> {
    // Use references to avoid unnecessary copying
    let image = image::load_from_memory(image_data)?;
    
    // Process in chunks to avoid memory spikes
    let processed = image
        .to_rgba8()
        .pixels()
        .collect::<Vec<_>>()
        .chunks(1000)
        .flat_map(|chunk| process_chunk(chunk))
        .collect();
    
    Ok(ProcessedImage::new(processed))
}
```

### 2. Parallel Processing
```rust
// ✅ Good: Parallel processing with rayon
use rayon::prelude::*;

pub fn extract_curves_parallel(image_data: &[u8]) -> Result<Vec<Curve>, ProcessingError> {
    let curves: Vec<Curve> = image_data
        .par_chunks(1024)
        .filter_map(|chunk| {
            // Process each chunk in parallel
            process_chunk(chunk).ok()
        })
        .collect();
    
    Ok(curves)
}
```

### 3. Optimization
```rust
// ✅ Good: Profile-guided optimization
#[inline(always)]
pub fn fast_color_detection(pixel: &Rgba<u8>) -> bool {
    // Optimized color detection algorithm
    pixel[0] > 128 && pixel[1] < 128 && pixel[2] > 128
}

// ✅ Good: Use const generics for compile-time optimization
pub fn process_image_const<const CHUNK_SIZE: usize>(
    image_data: &[u8]
) -> Result<ProcessedImage, ProcessingError> {
    // Compile-time optimized processing
    // ...
}
```

## Security Guidelines

### 1. Input Validation
```rust
// ✅ Good: Comprehensive input validation
pub fn validate_image_data(data: &[u8]) -> Result<(), ValidationError> {
    // Check file size limits
    if data.len() > MAX_IMAGE_SIZE {
        return Err(ValidationError::FileTooLarge);
    }
    
    // Validate image format
    if !is_valid_image_format(data) {
        return Err(ValidationError::InvalidFormat);
    }
    
    // Check for malicious content
    if contains_suspicious_content(data) {
        return Err(ValidationError::SuspiciousContent);
    }
    
    Ok(())
}
```

### 2. Tauri Security
```rust
// ✅ Good: Proper capability configuration
#[tauri::command]
async fn safe_file_operation(path: String) -> Result<String, String> {
    // Validate path to prevent directory traversal
    if !is_safe_path(&path) {
        return Err("Invalid path".to_string());
    }
    
    // Perform safe file operation
    // ...
}
```

## Testing Guidelines

### 1. Unit Testing
```rust
// ✅ Good: Comprehensive unit tests
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_color_detection() {
        let pixel = Rgba([255, 0, 255, 255]);
        assert!(detect_color(&pixel, "magenta"));
    }
    
    #[test]
    fn test_invalid_input() {
        let result = process_image(&[]);
        assert!(result.is_err());
    }
    
    #[tokio::test]
    async fn test_async_processing() {
        let data = vec![0u8; 100];
        let result = process_image_async(&data).await;
        assert!(result.is_ok());
    }
}
```

### 2. Integration Testing
```rust
// ✅ Good: Integration tests with Tauri
#[cfg(test)]
mod integration_tests {
    use tauri::test;
    
    #[test]
    fn test_tauri_command() {
        let app = test::mock_builder().build().unwrap();
        let window = app.get_window("main").unwrap();
        
        let result = window.eval("window.__TAURI__.invoke('extract_image_curves', {})");
        assert!(result.is_ok());
    }
}
```

## Error Handling Guidelines

### 1. Error Types
```rust
// ✅ Good: Comprehensive error types
#[derive(Debug, thiserror::Error)]
pub enum BackendError {
    #[error("Image processing error: {0}")]
    ImageProcessing(#[from] image::ImageError),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("System error: {0}")]
    System(#[from] std::io::Error),
}
```

### 2. Error Propagation
```rust
// ✅ Good: Proper error propagation
pub fn process_with_error_handling(data: &[u8]) -> Result<ProcessedData, BackendError> {
    // Validate input
    validate_input(data)?;
    
    // Process data
    let processed = process_data(data)?;
    
    // Validate output
    validate_output(&processed)?;
    
    Ok(processed)
}
```

## Documentation Guidelines

### 1. Code Documentation
```rust
/// Extracts curves from an image based on color detection.
///
/// # Arguments
/// * `image_data` - Raw image data as bytes
/// * `colors` - List of colors to detect
/// * `config` - Processing configuration
///
/// # Returns
/// * `Result<ExtractionResult, ProcessingError>` - Extracted curves or error
///
/// # Examples
/// ```
/// let result = extract_curves(&image_data, &["red", "blue"], &config)?;
/// ```
pub fn extract_curves(
    image_data: &[u8],
    colors: &[String],
    config: &GraphConfig,
) -> Result<ExtractionResult, ProcessingError> {
    // Implementation
}
```

### 2. API Documentation
```rust
// ✅ Good: Comprehensive API documentation
/// # ESpice Backend API
///
/// This module provides the backend API for ESpice, including:
/// - Image processing and curve extraction
/// - SPICE model generation
/// - File system operations
/// - System integration
///
/// ## Usage
///
/// All functions are exposed as Tauri commands and can be called
/// from the frontend using `window.__TAURI__.invoke()`.
```

## Build and Deployment

### 1. Cargo Configuration
```toml
# ✅ Good: Optimized release configuration
[profile.release]
opt-level = 3
debug = false
strip = true
lto = true
codegen-units = 1
panic = "abort"

# ✅ Good: Proper dependency management
[dependencies]
image = "0.24"
imageproc = "0.23"
nalgebra = "0.32"
ndarray = "0.15"
rustfft = "6.0"
rayon = "1.7"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["time", "macros"] }
reqwest = { version = "0.11", features = ["json"] }
```

### 2. Tauri Configuration
```json
// ✅ Good: Proper Tauri configuration
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "security": {
      "csp": null
    }
  }
}
```

## Performance Monitoring

### 1. Metrics Collection
```rust
// ✅ Good: Performance metrics
use std::time::Instant;

pub fn process_with_metrics(data: &[u8]) -> Result<ProcessedData, ProcessingError> {
    let start = Instant::now();
    
    let result = process_data(data)?;
    
    let duration = start.elapsed();
    log::info!("Processing completed in {:?}", duration);
    
    Ok(result)
}
```

### 2. Memory Profiling
```rust
// ✅ Good: Memory usage tracking
pub fn track_memory_usage() {
    if let Ok(usage) = std::process::Command::new("ps")
        .args(&["-o", "rss=", "-p", &std::process::id().to_string()])
        .output()
    {
        if let Ok(memory_str) = String::from_utf8(usage.stdout) {
            if let Ok(memory_kb) = memory_str.trim().parse::<u64>() {
                log::info!("Memory usage: {} KB", memory_kb);
            }
        }
    }
}
```

## Integration with Main Rules

### 1. Documentation Compliance
- **Follow main project documentation structure**
- **Update backend-specific documentation**
- **Maintain consistency with frontend rules**

### 2. Workflow Integration
- **Follow main project workflow**
- **Use backend-specific tools and processes**
- **Coordinate with frontend development**

## Future Considerations

### 1. Performance Optimization
- **Profile-guided optimization**
- **SIMD optimizations for image processing**
- **GPU acceleration for large images**

### 2. Security Enhancements
- **Sandboxed processing environments**
- **Advanced input validation**
- **Audit logging and monitoring**

### 3. Testing Evolution
- **Property-based testing with proptest**
- **Fuzzing for security testing**
- **Performance regression testing**

## References
- [Rust Documentation](https://doc.rust-lang.org/)
- [Tauri Backend Documentation](https://tauri.app/docs/backend/)
- [Rust Async Book](https://rust-lang.github.io/async-book/)
- [Rust Performance Book](https://nnethercote.github.io/perf-book/) 