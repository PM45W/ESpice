# ESpice Application Startup Script
# This script starts the MCP server and the React application

param(
    [switch]$DevMode = $false,
    [switch]$SkipMCP = $false,
    [int]$MCPPort = 8000,
    [string]$Environment = "development"
)

Write-Host "=== ESpice Application Startup ===" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "MCP Server Port: $MCPPort" -ForegroundColor Yellow

# Function to check if port is available
function Test-Port {
    param([int]$Port)
    $tcpConnection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -eq $tcpConnection
}

# Function to kill process on port
function Stop-ProcessOnPort {
    param([int]$Port)
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($process) {
        Write-Host "Stopping process on port $Port..." -ForegroundColor Yellow
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    }
}

# Function to start MCP server
function Start-MCPServer {
    param([int]$Port)
    
    Write-Host "Starting MCP server on port $Port..." -ForegroundColor Green
    
    # Check if Python is available
    $pythonCmd = if (Get-Command python -ErrorAction SilentlyContinue) { "python" }
                 elseif (Get-Command python3 -ErrorAction SilentlyContinue) { "python3" }
                 else { throw "Python not found in PATH" }
    
    # Navigate to MCP server directory
    Push-Location "mcp-server"
    
    # Install dependencies if needed
    if (-not (Test-Path "venv")) {
        Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
        & $pythonCmd -m venv venv
    }
    
    # Activate virtual environment
    if (Test-Path "venv\Scripts\Activate.ps1") {
        . "venv\Scripts\Activate.ps1"
    }
    
    # Install requirements
    if (Test-Path "requirements.txt") {
        Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
        pip install -r requirements.txt
    }
    
    # Start MCP server
    Write-Host "Starting MCP server..." -ForegroundColor Green
    $env:PORT = $Port
    $env:ENVIRONMENT = $Environment
    
    Start-Process -FilePath $pythonCmd -ArgumentList "main.py" -NoNewWindow -PassThru
    
    Pop-Location
    
    # Wait for server to start
    Write-Host "Waiting for MCP server to start..." -ForegroundColor Yellow
    $attempts = 0
    $maxAttempts = 30
    
    while ($attempts -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Host "MCP server started successfully!" -ForegroundColor Green
                return $true
            }
        } catch {
            $attempts++
            Start-Sleep -Seconds 1
        }
    }
    
    Write-Host "Failed to start MCP server" -ForegroundColor Red
    return $false
}

# Function to start React app
function Start-ReactApp {
    param([switch]$DevMode)
    
    Write-Host "Starting React application..." -ForegroundColor Green
    
    if ($DevMode) {
        Write-Host "Starting in development mode..." -ForegroundColor Yellow
        npm run dev
    } else {
        Write-Host "Building and starting production build..." -ForegroundColor Yellow
        npm run build
        npm run preview
    }
}

# Function to start Tauri app
function Start-TauriApp {
    Write-Host "Starting Tauri application..." -ForegroundColor Green
    npm run tauri dev
}

# Main execution
try {
    # Check if Node.js is available
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw "Node.js/npm not found in PATH"
    }
    
    # Install Node.js dependencies
    Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
    
    # Clean up any existing processes
    Stop-ProcessOnPort -Port $MCPPort
    
    # Start MCP server unless skipped
    if (-not $SkipMCP) {
        $mcpStarted = Start-MCPServer -Port $MCPPort
        if (-not $mcpStarted) {
            Write-Host "Continuing without MCP server..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Skipping MCP server startup..." -ForegroundColor Yellow
    }
    
    # Start the appropriate application
    if ($DevMode) {
        Start-ReactApp -DevMode
    } else {
        Start-TauriApp
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Stack Trace: $($_.ScriptStackTrace)" -ForegroundColor Red
    exit 1
}
