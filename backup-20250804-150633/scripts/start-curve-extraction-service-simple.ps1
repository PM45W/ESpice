# Start Curve Extraction Service (Simple Version)
# This script starts the FastAPI-based curve extraction service without virtual environment activation

Write-Host "Starting Curve Extraction Service (Simple Version)..." -ForegroundColor Green

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

Write-Host "Service directory: $serviceDir" -ForegroundColor Cyan

# Check if main.py exists
$mainPyPath = Join-Path $serviceDir "main.py"
if (-not (Test-Path $mainPyPath)) {
    Write-Host "Error: main.py not found at $mainPyPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found main.py at: $mainPyPath" -ForegroundColor Green

# Check if requirements.txt exists
$requirementsPath = Join-Path $serviceDir "requirements.txt"
if (-not (Test-Path $requirementsPath)) {
    Write-Host "Error: requirements.txt not found at $requirementsPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found requirements.txt at: $requirementsPath" -ForegroundColor Green

# Change to service directory
Set-Location $serviceDir
Write-Host "Changed working directory to: $(Get-Location)" -ForegroundColor Cyan

# Check if virtual environment exists
$venvPath = Join-Path $serviceDir "venv"
$venvPython = Join-Path $venvPath "Scripts" "python.exe"

if (-not (Test-Path $venvPath)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    if (-not $?) {
        Write-Host "Error: Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path $venvPython)) {
    Write-Host "Error: Virtual environment Python not found at $venvPython" -ForegroundColor Red
    exit 1
}

Write-Host "Virtual environment found at: $venvPath" -ForegroundColor Green

# Install dependencies using the virtual environment Python directly
Write-Host "Installing dependencies..." -ForegroundColor Yellow
try {
    & $venvPython -m pip install -r requirements.txt
    if (-not $?) {
        Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "Error installing dependencies: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Verify uvicorn is installed in the virtual environment
try {
    $uvicornVersion = & $venvPython -m uvicorn --version 2>&1
    Write-Host "Uvicorn version: $uvicornVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: Uvicorn not found in virtual environment. Installing..." -ForegroundColor Yellow
    & $venvPython -m pip install uvicorn
}

# Start the FastAPI service
Write-Host "Starting FastAPI curve extraction service..." -ForegroundColor Green
Write-Host "Service will be available at: http://localhost:8002" -ForegroundColor Cyan
Write-Host "API documentation at: http://localhost:8002/docs" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the service" -ForegroundColor Yellow

# Start the service with uvicorn from the virtual environment
try {
    & $venvPython -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload
} catch {
    Write-Host "Error starting service: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 