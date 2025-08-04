use std::process::{Command, Stdio};
use std::path::Path;
use std::time::Duration;
use tokio::time::sleep;
use serde_json::Value;

/// Check if Ollama is installed on the system
#[tauri::command]
pub async fn check_ollama_installation() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        // Check Windows installation paths
        let paths = vec![
            r"C:\Program Files\Ollama\ollama.exe",
            r"C:\Users\%USERNAME%\AppData\Local\Programs\Ollama\ollama.exe",
        ];
        
        for path in paths {
            if Path::new(&path).exists() {
                return Ok(true);
            }
        }
        
        // Try to run ollama --version
        match Command::new("ollama")
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status() {
                Ok(status) => return Ok(status.success()),
                Err(_) => return Ok(false),
            }
    }
    
    #[cfg(target_os = "macos")]
    {
        // Check macOS installation paths
        let paths = vec![
            "/usr/local/bin/ollama",
            "/opt/homebrew/bin/ollama",
            "/usr/bin/ollama",
        ];
        
        for path in paths {
            if Path::new(path).exists() {
                return Ok(true);
            }
        }
        
        // Try to run ollama --version
        match Command::new("ollama")
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status() {
                Ok(status) => return Ok(status.success()),
                Err(_) => return Ok(false),
            }
    }
    
    #[cfg(target_os = "linux")]
    {
        // Check Linux installation paths
        let paths = vec![
            "/usr/local/bin/ollama",
            "/usr/bin/ollama",
            "/opt/ollama/ollama",
        ];
        
        for path in paths {
            if Path::new(path).exists() {
                return Ok(true);
            }
        }
        
        // Try to run ollama --version
        match Command::new("ollama")
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status() {
                Ok(status) => return Ok(status.success()),
                Err(_) => return Ok(false),
            }
    }
    
    Ok(false)
}

/// Install Ollama automatically
#[tauri::command]
pub async fn install_ollama() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        // Windows installation using winget or chocolatey
        let install_commands = vec![
            ("winget", vec!["install", "ollama.ollama"]),
            ("choco", vec!["install", "ollama"]),
        ];
        
        for (cmd, args) in install_commands {
            match Command::new(cmd)
                .args(args)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status() {
                    Ok(status) if status.success() => return Ok(()),
                    _ => continue,
                }
        }
        
        // If package managers fail, download and install manually
        return Err("Please install Ollama manually from https://ollama.ai/download".to_string());
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS installation using Homebrew
        match Command::new("brew")
            .args(["install", "ollama"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status() {
                Ok(status) if status.success() => return Ok(()),
                _ => return Err("Please install Ollama manually from https://ollama.ai/download".to_string()),
            }
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux installation using curl
        let install_script = r#"
            curl -fsSL https://ollama.ai/install.sh | sh
        "#;
        
        match Command::new("sh")
            .arg("-c")
            .arg(install_script)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status() {
                Ok(status) if status.success() => return Ok(()),
                _ => return Err("Please install Ollama manually from https://ollama.ai/download".to_string()),
            }
    }
    
    Err("Unsupported operating system".to_string())
}

/// Start Ollama server
#[tauri::command]
pub async fn start_ollama() -> Result<(), String> {
    // Check if Ollama is already running
    if is_ollama_running().await {
        return Ok(());
    }
    
    // Start Ollama in the background
    #[cfg(target_os = "windows")]
    {
        match Command::new("ollama")
            .arg("serve")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn() {
                Ok(_) => {
                    // Wait for server to start
                    for _ in 0..30 {
                        sleep(Duration::from_secs(1)).await;
                        if is_ollama_running().await {
                            return Ok(());
                        }
                    }
                    Err("Ollama server failed to start within 30 seconds".to_string())
                },
                Err(_) => Err("Failed to start Ollama server".to_string()),
            }
    }
    
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        match Command::new("ollama")
            .arg("serve")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn() {
                Ok(_) => {
                    // Wait for server to start
                    for _ in 0..30 {
                        sleep(Duration::from_secs(1)).await;
                        if is_ollama_running().await {
                            return Ok(());
                        }
                    }
                    Err("Ollama server failed to start within 30 seconds".to_string())
                },
                Err(_) => Err("Failed to start Ollama server".to_string()),
            }
    }
}

/// Check if Ollama server is running
async fn is_ollama_running() -> bool {
    // Try to connect to Ollama API
    match reqwest::get("http://localhost:11434/api/tags").await {
        Ok(response) => response.status().is_success(),
        Err(_) => false,
    }
}

/// Pull a model from Ollama
#[tauri::command]
pub async fn pull_ollama_model(model_name: String) -> Result<(), String> {
    // Check if model is already available
    if is_model_available(&model_name).await {
        return Ok(());
    }
    
    // Pull the model
    match Command::new("ollama")
        .args(["pull", &model_name])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status() {
            Ok(status) if status.success() => Ok(()),
            _ => Err(format!("Failed to pull model: {}", model_name)),
        }
}

/// Check if a model is available
async fn is_model_available(model_name: &str) -> bool {
    match reqwest::get("http://localhost:11434/api/tags").await {
        Ok(response) => {
            if let Ok(data) = response.json::<Value>().await {
                if let Some(models) = data.get("models") {
                    if let Some(models_array) = models.as_array() {
                        return models_array.iter().any(|model| {
                            model.get("name").and_then(|n| n.as_str()) == Some(model_name)
                        });
                    }
                }
            }
            false
        },
        Err(_) => false,
    }
}

/// Get available models from Ollama
#[tauri::command]
pub async fn get_ollama_models() -> Result<Vec<String>, String> {
    match reqwest::get("http://localhost:11434/api/tags").await {
        Ok(response) => {
            if let Ok(data) = response.json::<Value>().await {
                if let Some(models) = data.get("models") {
                    if let Some(models_array) = models.as_array() {
                        let model_names: Vec<String> = models_array
                            .iter()
                            .filter_map(|model| {
                                model.get("name").and_then(|n| n.as_str()).map(|s| s.to_string())
                            })
                            .collect();
                        return Ok(model_names);
                    }
                }
            }
            Ok(vec![])
        },
        Err(_) => Ok(vec![]),
    }
} 