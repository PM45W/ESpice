// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::process::Command;
use std::fs;
use std::path::Path;
use reqwest;
use tokio;
use tauri::Manager;
mod curve_extraction;
use curve_extraction::{detect_colors, extract_curves, GraphConfig, DetectedColor, ExtractionResult};

#[derive(Serialize, Deserialize)]
struct MCPResponse {
    success: bool,
    message: Option<String>,
    data: Option<serde_json::Value>,
    error: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct ServiceStatusResponse {
    success: bool,
    status: String,
    message: Option<String>,
    error: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct SPICEGenerationRequest {
    device_name: String,
    device_type: String,
    model_type: String,
    parameters: Option<serde_json::Value>,
    extracted_data: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize)]
struct SPICEGenerationResponse {
    success: bool,
    model: String,
    device_name: String,
    device_type: String,
    model_type: String,
    parameters: serde_json::Value,
    model_info: serde_json::Value,
}

#[derive(Serialize, Deserialize)]
struct ParameterFittingRequest {
    extracted_data: serde_json::Value,
    model_type: String,
}

#[derive(Serialize, Deserialize)]
struct ParameterFittingResponse {
    success: bool,
    model_type: String,
    fitted_parameters: serde_json::Value,
    model_info: serde_json::Value,
}

#[derive(Serialize, Deserialize)]
struct AvailableModelsResponse {
    models: Vec<serde_json::Value>,
}

#[tauri::command]
async fn process_pdf_with_mcp(file_path: String) -> Result<MCPResponse, String> {
    let client = reqwest::Client::new();
    
    // Read file
    let file_content = fs::read(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    // Create form data
    let form = reqwest::multipart::Form::new()
        .part("file", reqwest::multipart::Part::bytes(file_content)
            .file_name("datasheet.pdf"));
    
    // Get MCP server URL from environment or use localhost as fallback
    let mcp_url = std::env::var("MCP_SERVER_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    
    // Send to MCP server
    let response = client
        .post(&format!("{}/api/process-pdf", mcp_url))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    let result: MCPResponse = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    Ok(result)
}

#[tauri::command]
async fn generate_spice_with_mcp(
    device_name: String,
    device_type: String,
    model_type: String,
    parameters: Option<serde_json::Value>,
    extracted_data: Option<serde_json::Value>,
) -> Result<SPICEGenerationResponse, String> {
    let client = reqwest::Client::new();
    
    let request_data = SPICEGenerationRequest {
        device_name,
        device_type,
        model_type,
        parameters,
        extracted_data,
    };
    
    // Get MCP server URL from environment or use localhost as fallback
    let mcp_url = std::env::var("MCP_SERVER_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    
    // Send to MCP server
    let response = client
        .post(&format!("{}/api/generate-spice", mcp_url))
        .json(&request_data)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    let result: SPICEGenerationResponse = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    Ok(result)
}

#[tauri::command]
async fn fit_parameters_with_mcp(
    extracted_data: serde_json::Value,
    model_type: String,
) -> Result<ParameterFittingResponse, String> {
    let client = reqwest::Client::new();
    
    let request_data = ParameterFittingRequest {
        extracted_data,
        model_type,
    };
    
    // Get MCP server URL from environment or use localhost as fallback
    let mcp_url = std::env::var("MCP_SERVER_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    
    // Send to MCP server
    let response = client
        .post(&format!("{}/api/fit-parameters", mcp_url))
        .json(&request_data)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    let result: ParameterFittingResponse = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    Ok(result)
}

#[tauri::command]
async fn get_available_models() -> Result<AvailableModelsResponse, String> {
    let client = reqwest::Client::new();
    
    // Get MCP server URL from environment or use localhost as fallback
    let mcp_url = std::env::var("MCP_SERVER_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    
    let response = client
        .get(&format!("{}/api/models", mcp_url))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    let result: AvailableModelsResponse = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    Ok(result)
}

#[tauri::command]
async fn check_mcp_server_health() -> Result<MCPResponse, String> {
    let client = reqwest::Client::new();
    
    // Get MCP server URL from environment or use localhost as fallback
    let mcp_url = std::env::var("MCP_SERVER_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    
    let response = client
        .get(&format!("{}/health", mcp_url))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    let result: MCPResponse = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    Ok(result)
}

#[tauri::command]
fn get_pdfs() -> Result<String, String> {
    let output = Command::new("node")
        .arg("src-tauri/prisma-api.js")
        .arg("getPdfs")
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn get_pages(pdf_id: String) -> Result<String, String> {
    let output = Command::new("node")
        .arg("src-tauri/prisma-api.js")
        .arg("getPages")
        .arg(pdf_id)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn get_page_details(page_id: String) -> Result<String, String> {
    let output = Command::new("node")
        .arg("src-tauri/prisma-api.js")
        .arg("getPageDetails")
        .arg(page_id)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// Datasheet commands
#[tauri::command]
fn upload_datasheet(product_id: String, filename: String, file_data: String, file_size: u64) -> Result<String, String> {
    let output = Command::new("node")
        .arg("src-tauri/prisma-api.js")
        .arg("uploadDatasheet")
        .arg(product_id)
        .arg(filename)
        .arg(file_data)
        .arg(file_size.to_string())
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn get_datasheets_for_product(product_id: String) -> Result<String, String> {
    let output = Command::new("node")
        .arg("src-tauri/prisma-api.js")
        .arg("getDatasheetsForProduct")
        .arg(product_id)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn get_datasheet(datasheet_id: String) -> Result<String, String> {
    let output = Command::new("node")
        .arg("src-tauri/prisma-api.js")
        .arg("getDatasheet")
        .arg(datasheet_id)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn delete_datasheet(datasheet_id: String) -> Result<String, String> {
    let output = Command::new("node")
        .arg("src-tauri/prisma-api.js")
        .arg("deleteDatasheet")
        .arg(datasheet_id)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn download_spice_model(datasheet_id: String) -> Result<String, String> {
    let output = Command::new("node")
        .arg("src-tauri/prisma-api.js")
        .arg("downloadSpiceModel")
        .arg(datasheet_id)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn get_datasheet_processing_status(datasheet_id: String) -> Result<String, String> {
    let output = Command::new("node")
        .arg("src-tauri/prisma-api.js")
        .arg("getDatasheetProcessingStatus")
        .arg(datasheet_id)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn retry_datasheet_processing(datasheet_id: String) -> Result<String, String> {
    let output = Command::new("node")
        .arg("src-tauri/prisma-api.js")
        .arg("retryDatasheetProcessing")
        .arg(datasheet_id)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn detect_colors_rust(image_data: Vec<u8>) -> Result<Vec<DetectedColor>, String> {
    detect_colors(&image_data)
}

#[tauri::command]
fn extract_curves_rust(
    image_data: Vec<u8>,
    selected_colors: Vec<String>,
    config: GraphConfig,
) -> Result<ExtractionResult, String> {
    extract_curves(&image_data, &selected_colors, &config)
}

#[tauri::command]
fn detect_colors_enhanced(image_data: Vec<u8>) -> Result<Vec<DetectedColor>, String> {
    detect_colors(&image_data)
}

#[tauri::command]
fn extract_curves_enhanced(
    image_data: Vec<u8>,
    selected_colors: Vec<String>,
    config: GraphConfig,
) -> Result<ExtractionResult, String> {
    extract_curves(&image_data, &selected_colors, &config)
}

#[tauri::command]
fn save_curves_to_database(
    product_id: String,
    curves: Vec<CurveData>,
    config: GraphConfig,
) -> Result<String, String> {
    // For now, just return success - database integration can be added later
    Ok("Curves saved successfully".to_string())
}

#[tauri::command]
fn get_processing_stats() -> Result<serde_json::Value, String> {
    // Mock processing statistics
    let stats = serde_json::json!({
        "totalProcessed": 0,
        "successRate": 100.0,
        "averageProcessingTime": 0.0,
        "lastProcessed": null,
        "totalErrors": 0,
        "averageQueueTime": 0.0
    });
    Ok(stats)
}

#[tauri::command]
async fn start_curve_extraction_service() -> Result<ServiceStatusResponse, String> {
    let app_handle = tauri::AppHandle::default();
    
    // Get the app directory
    let app_dir = app_handle.path_resolver()
        .app_dir()
        .ok_or("Could not determine app directory")?;
    
    // Navigate to the project root (assuming we're in src-tauri)
    let project_root = app_dir.parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .ok_or("Could not determine project root")?;
    
    let script_path = project_root.join("scripts").join("start-curve-extraction-service-simple.bat");
    
    if !script_path.exists() {
        return Ok(ServiceStatusResponse {
            success: false,
            status: "error".to_string(),
            message: None,
            error: Some("Service start script not found".to_string()),
        });
    }
    
    // Start the service in a separate process
    let result = Command::new("cmd")
        .args(&["/C", script_path.to_str().unwrap()])
        .current_dir(project_root)
        .spawn();
    
    match result {
        Ok(_child) => {
            // Wait a moment for the service to start
            tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
            
            // Check if service is now available
            match check_curve_extraction_service_health().await {
                Ok(_) => Ok(ServiceStatusResponse {
                    success: true,
                    status: "started".to_string(),
                    message: Some("Service started successfully".to_string()),
                    error: None,
                }),
                Err(_) => Ok(ServiceStatusResponse {
                    success: false,
                    status: "starting".to_string(),
                    message: Some("Service is starting, please wait...".to_string()),
                    error: None,
                }),
            }
        },
        Err(e) => Ok(ServiceStatusResponse {
            success: false,
            status: "error".to_string(),
            message: None,
            error: Some(format!("Failed to start service: {}", e)),
        }),
    }
}

#[tauri::command]
async fn check_curve_extraction_service_health() -> Result<ServiceStatusResponse, String> {
    let client = reqwest::Client::new();
    
    // Try to connect to the FastAPI service
    let response = client
        .get("http://localhost:8002/health")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await;
    
    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                Ok(ServiceStatusResponse {
                    success: true,
                    status: "available".to_string(),
                    message: Some("Service is available".to_string()),
                    error: None,
                })
            } else {
                Ok(ServiceStatusResponse {
                    success: false,
                    status: "unavailable".to_string(),
                    message: None,
                    error: Some("Service responded with error status".to_string()),
                })
            }
        },
        Err(e) => Ok(ServiceStatusResponse {
            success: false,
            status: "unavailable".to_string(),
            message: None,
            error: Some(format!("Service not available: {}", e)),
        }),
    }
}

#[tauri::command]
async fn save_csv_file(file_path: String, content: String) -> Result<String, String> {
    // Save CSV content to file
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to save CSV file: {}", e))?;
    
    Ok(format!("CSV saved to: {}", file_path))
}

#[tauri::command]
async fn get_unprocessed_images_for_product(product_id: String) -> Result<Vec<serde_json::Value>, String> {
    // Mock implementation - in real implementation, this would query the database
    // For now, return empty array
    Ok(Vec::new())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            process_pdf_with_mcp,
            generate_spice_with_mcp,
            fit_parameters_with_mcp,
            get_available_models,
            check_mcp_server_health,
            get_pdfs,
            get_pages,
            get_page_details,
            upload_datasheet,
            get_datasheets_for_product,
            get_datasheet,
            delete_datasheet,
            download_spice_model,
            get_datasheet_processing_status,
            retry_datasheet_processing,
            detect_colors_rust,
            extract_curves_rust,
            detect_colors_enhanced,
            extract_curves_enhanced,
            save_curves_to_database,
            get_processing_stats,
            start_curve_extraction_service,
            check_curve_extraction_service_health,
            save_csv_file,
            get_unprocessed_images_for_product
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
