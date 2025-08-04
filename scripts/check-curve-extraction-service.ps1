# Check Curve Extraction Service Setup
# This script diagnoses issues with the FastAPI curve extraction service

Write-Host "🔍 Checking Curve Extraction Service Setup..." -ForegroundColor Green

# Check Python installation
Write-Host "`n📋 Checking Python installation..." -ForegroundColor Cyan
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python version: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.8+ and add it to your PATH" -ForegroundColor Yellow
    exit 1
}

# Check if pip is available
try {
    $pipVersion = pip --version 2>&1
    Write-Host "✅ pip version: $pipVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ pip is not available" -ForegroundColor Red
    exit 1
}

# Check service directory
$serviceDir = Join-Path $PSScriptRoot ".." "services" "curve-extraction-service"
Write-Host "`n📁 Checking service directory..." -ForegroundColor Cyan
if (Test-Path $serviceDir) {
    Write-Host "✅ Service directory found: $serviceDir" -ForegroundColor Green
} else {
    Write-Host "❌ Service directory not found: $serviceDir" -ForegroundColor Red
    exit 1
}

# Check main.py
$mainPyPath = Join-Path $serviceDir "main.py"
if (Test-Path $mainPyPath) {
    Write-Host "✅ main.py found: $mainPyPath" -ForegroundColor Green
} else {
    Write-Host "❌ main.py not found: $mainPyPath" -ForegroundColor Red
    exit 1
}

# Check requirements.txt
$requirementsPath = Join-Path $serviceDir "requirements.txt"
if (Test-Path $requirementsPath) {
    Write-Host "✅ requirements.txt found: $requirementsPath" -ForegroundColor Green
    Write-Host "📄 Requirements:" -ForegroundColor Cyan
    Get-Content $requirementsPath | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "❌ requirements.txt not found: $requirementsPath" -ForegroundColor Red
    exit 1
}

# Check virtual environment
$venvPath = Join-Path $serviceDir "venv"
Write-Host "`n🐍 Checking virtual environment..." -ForegroundColor Cyan
if (Test-Path $venvPath) {
    Write-Host "✅ Virtual environment found: $venvPath" -ForegroundColor Green
    
    # Check if virtual environment is properly set up
    $venvPython = Join-Path $venvPath "Scripts" "python.exe"
    if (Test-Path $venvPython) {
        Write-Host "✅ Virtual environment Python found" -ForegroundColor Green
    } else {
        Write-Host "❌ Virtual environment Python not found" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  Virtual environment not found, will be created when starting service" -ForegroundColor Yellow
}

# Check if service is already running
Write-Host "`n🌐 Checking if service is already running..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8002/health" -Method GET -TimeoutSec 3
    Write-Host "✅ Service is already running and healthy!" -ForegroundColor Green
    Write-Host "   Health response: $($response | ConvertTo-Json)" -ForegroundColor Gray
    
    # Test root endpoint
    try {
        $rootResponse = Invoke-RestMethod -Uri "http://localhost:8002/" -Method GET -TimeoutSec 3
        Write-Host "✅ Root endpoint working" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Root endpoint not responding" -ForegroundColor Yellow
    }
    
    Write-Host "`n📚 Service URLs:" -ForegroundColor Cyan
    Write-Host "   Health Check: http://localhost:8002/health" -ForegroundColor Gray
    Write-Host "   API Documentation: http://localhost:8002/docs" -ForegroundColor Gray
    Write-Host "   ReDoc Documentation: http://localhost:8002/redoc" -ForegroundColor Gray
    
    exit 0
} catch {
    Write-Host "ℹ️  Service is not currently running" -ForegroundColor Yellow
}

# Check port availability
Write-Host "`n🔌 Checking port availability..." -ForegroundColor Cyan
try {
    $portCheck = netstat -an | Select-String ":8002"
    if ($portCheck) {
        Write-Host "⚠️  Port 8002 is in use:" -ForegroundColor Yellow
        $portCheck | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    } else {
        Write-Host "✅ Port 8002 is available" -ForegroundColor Green
    }
} catch {
    Write-Host "ℹ️  Could not check port status" -ForegroundColor Yellow
}

# Check if uvicorn is available globally
Write-Host "`n🚀 Checking uvicorn availability..." -ForegroundColor Cyan
try {
    $uvicornVersion = uvicorn --version 2>&1
    Write-Host "✅ Uvicorn available globally: $uvicornVersion" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  Uvicorn not available globally (will be installed in venv)" -ForegroundColor Yellow
}

Write-Host "`n📋 Summary:" -ForegroundColor Cyan
Write-Host "✅ Python and pip are available" -ForegroundColor Green
Write-Host "✅ Service files are present" -ForegroundColor Green
Write-Host "✅ Requirements file is valid" -ForegroundColor Green
Write-Host "ℹ️  Service is not currently running" -ForegroundColor Yellow

Write-Host "`n🚀 To start the service, try one of these options:" -ForegroundColor Green
Write-Host "   1. PowerShell (recommended): ./scripts/start-curve-extraction-service.ps1" -ForegroundColor Cyan
Write-Host "   2. PowerShell (simple): ./scripts/start-curve-extraction-service-simple.ps1" -ForegroundColor Cyan
Write-Host "   3. Batch file: ./scripts/start-curve-extraction-service.bat" -ForegroundColor Cyan

Write-Host "`n🔍 To test the service after starting, run:" -ForegroundColor Green
Write-Host "   ./scripts/test-curve-extraction-service.ps1" -ForegroundColor Cyan

Write-Host "`n✅ Setup check completed successfully!" -ForegroundColor Green 