# Standardized Service Startup Script Template
# All backend services should follow this pattern for consistency

param(
    [string]$ServiceName = "Service",
    [string]$ServicePath = "",
    [int]$Port = 8000,
    [string]$MainFile = "main.py",
    [string]$HealthEndpoint = "/health",
    [int]$Timeout = 30
)

Write-Host "🚀 Starting $ServiceName..." -ForegroundColor Green

# Function to check if port is available
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Function to wait for service to be ready
function Wait-ForService {
    param([string]$ServiceName, [int]$Port, [int]$Timeout = 30)
    
    Write-Host "⏳ Waiting for $ServiceName on port $Port..." -ForegroundColor Yellow
    
    $startTime = Get-Date
    while ((Get-Date) -lt ($startTime.AddSeconds($Timeout))) {
        if (Test-Port $Port) {
            Write-Host "✅ $ServiceName is ready!" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 2
    }
    
    Write-Host "❌ $ServiceName failed to start within $Timeout seconds" -ForegroundColor Red
    return $false
}

# Function to test service health
function Test-ServiceHealth {
    param([string]$ServiceName, [int]$Port, [string]$HealthEndpoint)
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$Port$HealthEndpoint" -Method Get -TimeoutSec 10
        if ($response.status -eq "healthy" -or $response.healthy -eq $true) {
            Write-Host "✅ $ServiceName health check passed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $ServiceName health check failed" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ $ServiceName health check failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Check if Python is available
Write-Host "🔍 Checking Python..." -ForegroundColor Blue
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Navigate to the service directory
if ($ServicePath -eq "") {
    $ServicePath = (Split-Path $PSScriptRoot -Parent) + "\services\$ServiceName.ToLower()"
}

if (-not (Test-Path $ServicePath)) {
    Write-Host "❌ Service directory not found at $ServicePath" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Service directory: $ServicePath" -ForegroundColor Cyan

# Check if main file exists
$mainFilePath = "$ServicePath\$MainFile"
if (-not (Test-Path $mainFilePath)) {
    Write-Host "❌ $MainFile not found at $mainFilePath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found $MainFile at: $mainFilePath" -ForegroundColor Green

# Check if requirements.txt exists
$requirementsPath = "$ServicePath\requirements.txt"
if (Test-Path $requirementsPath) {
    Write-Host "📦 Found requirements.txt at: $requirementsPath" -ForegroundColor Green
    
    # Check if virtual environment exists
    $venvPath = "$ServicePath\venv"
    if (-not (Test-Path $venvPath)) {
        Write-Host "🔧 Creating virtual environment..." -ForegroundColor Yellow
        Set-Location $ServicePath
        python -m venv venv
        if (-not $?) {
            Write-Host "❌ Failed to create virtual environment" -ForegroundColor Red
            exit 1
        }
    }

    # Activate virtual environment
    $venvPython = "$venvPath\Scripts\python.exe"
    $venvActivate = "$venvPath\Scripts\Activate.ps1"

    if (Test-Path $venvPython -and Test-Path $venvActivate) {
        Write-Host "🔧 Activating virtual environment..." -ForegroundColor Cyan
        try {
            $originalPolicy = Get-ExecutionPolicy -Scope Process -ErrorAction SilentlyContinue
            Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force -ErrorAction SilentlyContinue
            
            & $venvActivate
            Write-Host "✅ Virtual environment activated" -ForegroundColor Green
            
            if ($originalPolicy) {
                Set-ExecutionPolicy -ExecutionPolicy $originalPolicy -Scope Process -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Host "⚠️  Virtual environment activation failed, continuing without activation..." -ForegroundColor Yellow
        }

        # Install dependencies
        Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
        try {
            & $venvPython -m pip install -r requirements.txt
            if (-not $?) {
                Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
                exit 1
            }
            Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
        } catch {
            Write-Host "❌ Error installing dependencies: $($_.Exception.Message)" -ForegroundColor Red
            exit 1
        }

        # Use virtual environment Python
        $pythonExec = $venvPython
    } else {
        Write-Host "⚠️  Virtual environment not properly set up, using system Python..." -ForegroundColor Yellow
        $pythonExec = "python"
    }
} else {
    Write-Host "⚠️  No requirements.txt found, using system Python..." -ForegroundColor Yellow
    $pythonExec = "python"
}

# Check if port is available
if (Test-Port $Port) {
    Write-Host "⚠️  Port $Port is already in use. Stopping existing process..." -ForegroundColor Yellow
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($process) {
        Stop-Process -Id $process -Force
        Start-Sleep -Seconds 2
    }
}

# Change to service directory
Set-Location $ServicePath
Write-Host "📁 Working directory: $(Get-Location)" -ForegroundColor Cyan

# Start the service
Write-Host "🚀 Starting $ServiceName on port $Port..." -ForegroundColor Green
Write-Host "🌐 Service URL: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "🏥 Health Check: http://localhost:$Port$HealthEndpoint" -ForegroundColor Cyan
Write-Host "📚 API Documentation: http://localhost:$Port/docs" -ForegroundColor Cyan
Write-Host "⏹️  Press Ctrl+C to stop the service" -ForegroundColor Yellow

try {
    # Start the service with uvicorn
    & $pythonExec -m uvicorn $MainFile.Replace('.py', ''):app --host 0.0.0.0 --port $Port --reload
} catch {
    Write-Host "❌ Error starting $ServiceName: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
