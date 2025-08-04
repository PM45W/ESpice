# Enhanced Curve Extraction Service Startup Script
# Supports legacy algorithm and LLM-assisted extraction

Write-Host "Starting Enhanced Curve Extraction Service..." -ForegroundColor Green

# Check if Python is available
try {
    python --version
} catch {
    Write-Host "Error: Python is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Navigate to the service directory
$serviceDir = Join-Path $PSScriptRoot "..\services\curve-extraction-service"
if (-not (Test-Path $serviceDir)) {
    Write-Host "Error: Service directory not found at $serviceDir" -ForegroundColor Red
    exit 1
}

Set-Location $serviceDir

# Check if virtual environment exists, create if not
$venvPath = Join-Path $serviceDir "venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& "$venvPath\Scripts\Activate.ps1"

# Install/upgrade dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install --upgrade pip
pip install -r requirements.txt

# Check if LLM API key is set
$llmApiKey = $env:KIMI_API_KEY
if (-not $llmApiKey) {
    Write-Host "Warning: KIMI_API_KEY environment variable not set. LLM features will be disabled." -ForegroundColor Yellow
    Write-Host "To enable LLM features, set the KIMI_API_KEY environment variable:" -ForegroundColor Cyan
    Write-Host '$env:KIMI_API_KEY = "your-api-key-here"' -ForegroundColor Cyan
}

# Start the enhanced service
Write-Host "Starting Enhanced Curve Extraction Service on http://localhost:8002" -ForegroundColor Green
Write-Host "Features:" -ForegroundColor Cyan
Write-Host "  - Standard curve extraction" -ForegroundColor White
Write-Host "  - Legacy algorithm support" -ForegroundColor White
Write-Host "  - LLM-assisted extraction (if API key configured)" -ForegroundColor White
Write-Host "  - Health check: http://localhost:8002/health" -ForegroundColor White

try {
    python enhanced_main.py
} catch {
    Write-Host "Error starting service: $_" -ForegroundColor Red
    exit 1
} 