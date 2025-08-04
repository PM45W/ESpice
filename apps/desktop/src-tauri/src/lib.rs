mod curve_extraction;
mod ollama_setup;

use curve_extraction::{detect_colors, extract_curves, GraphConfig, DetectedColor, ExtractionResult};
use ollama_setup::{check_ollama_installation, install_ollama, start_ollama, pull_ollama_model, get_ollama_models};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn detect_image_colors(image_data: Vec<u8>) -> Result<Vec<DetectedColor>, String> {
    detect_colors(&image_data)
}

#[tauri::command]
async fn extract_image_curves(
    image_data: Vec<u8>,
    selected_colors: Vec<String>,
    config: GraphConfig,
) -> Result<ExtractionResult, String> {
    extract_curves(&image_data, &selected_colors, &config)
}

#[tauri::command]
async fn health_check() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "status": "healthy",
        "message": "ESpice Rust Backend is running",
        "backend": "rust"
    }))
}

// MCP Server Integration Commands
#[derive(serde::Serialize, serde::Deserialize)]
struct MCPResponse {
    success: bool,
    message: Option<String>,
    data: Option<serde_json::Value>,
    error: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct SPICEGenerationRequest {
    device_name: String,
    device_type: String,
    model_type: String,
    parameters: Option<serde_json::Value>,
    extracted_data: Option<serde_json::Value>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct SPICEGenerationResponse {
    success: bool,
    model: String,
    device_name: String,
    device_type: String,
    model_type: String,
    parameters: serde_json::Value,
    model_info: serde_json::Value,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct ParameterFittingRequest {
    extracted_data: serde_json::Value,
    model_type: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct ParameterFittingResponse {
    success: bool,
    model_type: String,
    fitted_parameters: serde_json::Value,
    model_info: serde_json::Value,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct AvailableModelsResponse {
    models: Vec<serde_json::Value>,
}

#[tauri::command]
async fn process_pdf_with_mcp(file_path: String) -> Result<MCPResponse, String> {
    let client = reqwest::Client::new();
    
    // Read file
    let file_content = std::fs::read(&file_path)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            detect_image_colors,
            extract_image_curves,
            health_check,
            check_ollama_installation,
            install_ollama,
            start_ollama,
            pull_ollama_model,
            get_ollama_models,
            process_pdf_with_mcp,
            generate_spice_with_mcp,
            fit_parameters_with_mcp,
            get_available_models,
            check_mcp_server_health
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
