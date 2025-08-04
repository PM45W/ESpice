# Start Curve Extraction Service for Web App
# This script starts the FastAPI-based curve extraction service

Write-Host "Starting Curve Extraction Service for Web App..." -ForegroundColor Green

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python version: $pythonVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: Python is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Navigate to the curve extraction service directory
$serviceDir = Join-Path $PSScriptRoot ".." "services" "curve-extraction-service"
if (-not (Test-Path $serviceDir)) {
    Write-Host "Error: Curve extraction service directory not found at $serviceDir" -ForegroundColor Red
    exit 1
}

Set-Location $serviceDir

# Check if virtual environment exists
$venvPath = Join-Path $serviceDir "venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& "$venvPath\Scripts\Activate.ps1"

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Start the FastAPI service
Write-Host "Starting FastAPI curve extraction service..." -ForegroundColor Green
Write-Host "Service will be available at: http://localhost:8002" -ForegroundColor Cyan
Write-Host "API documentation at: http://localhost:8002/docs" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the service" -ForegroundColor Yellow

# Start the service with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8002 --reload 