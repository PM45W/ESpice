# Graph Queue Service Startup Script
# This script starts the Graph Queue Service on port 8008

Write-Host "Starting Graph Queue Service..." -ForegroundColor Green

# Set the working directory to the service folder
$servicePath = Join-Path $PSScriptRoot "..\services\graph-queue-service"
Set-Location $servicePath

# Check if Python is available
try {
    python --version | Out-Null
    Write-Host "Python found" -ForegroundColor Green
} catch {
    Write-Host "Python not found. Please install Python 3.11 or later." -ForegroundColor Red
    exit 1
}

# Check if required packages are installed
Write-Host "Checking dependencies..." -ForegroundColor Yellow
try {
    python -c "import fastapi, uvicorn, httpx, websockets" 2>$null
    Write-Host "Dependencies found" -ForegroundColor Green
} catch {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Check if port 8008 is available
$portCheck = netstat -an | findstr ":8008"
if ($portCheck) {
    Write-Host "Port 8008 is already in use. Stopping existing process..." -ForegroundColor Yellow
    # Find and stop process using port 8008
    $process = Get-NetTCPConnection -LocalPort 8008 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($process) {
        Stop-Process -Id $process -Force
        Start-Sleep -Seconds 2
    }
}

# Start the service
Write-Host "Starting Graph Queue Service on port 8008..." -ForegroundColor Green
Write-Host "Service URL: http://localhost:8008" -ForegroundColor Cyan
Write-Host "Health Check: http://localhost:8008/health" -ForegroundColor Cyan
Write-Host "API Documentation: http://localhost:8008/docs" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the service" -ForegroundColor Yellow

try {
    python main.py
} catch {
    Write-Host "Error starting Graph Queue Service: $_" -ForegroundColor Red
    exit 1
} 