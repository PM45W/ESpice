# Test ESpice Startup Components
# This script verifies that all required components are available

Write-Host "🧪 Testing ESpice Startup Components..." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan

# Get the root directory
$rootDir = Split-Path -Parent $PSScriptRoot
Write-Host "Root directory: $rootDir" -ForegroundColor Cyan

# Test 1: Check Python
Write-Host "`n🔍 Test 1: Python Installation" -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found or not in PATH" -ForegroundColor Red
    Write-Host "   Please install Python 3.8+ and add it to PATH" -ForegroundColor Gray
}

# Test 2: Check Node.js
Write-Host "`n🔍 Test 2: Node.js Installation" -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found or not in PATH" -ForegroundColor Red
    Write-Host "   Please install Node.js 16+ and add it to PATH" -ForegroundColor Gray
}

# Test 3: Check FastAPI Service Directory
Write-Host "`n🔍 Test 3: FastAPI Service Directory" -ForegroundColor Yellow
$serviceDir = Join-Path $rootDir "services\curve-extraction-service"
if (Test-Path $serviceDir) {
    Write-Host "✅ Service directory found: $serviceDir" -ForegroundColor Green
    
    # Check main.py
    $mainPy = Join-Path $serviceDir "main.py"
    if (Test-Path $mainPy) {
        Write-Host "✅ main.py found" -ForegroundColor Green
    } else {
        Write-Host "❌ main.py not found" -ForegroundColor Red
    }
    
    # Check requirements.txt
    $requirements = Join-Path $serviceDir "requirements.txt"
    if (Test-Path $requirements) {
        Write-Host "✅ requirements.txt found" -ForegroundColor Green
    } else {
        Write-Host "❌ requirements.txt not found" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Service directory not found: $serviceDir" -ForegroundColor Red
}

# Test 4: Check Desktop App Directory
Write-Host "`n🔍 Test 4: Desktop App Directory" -ForegroundColor Yellow
$desktopDir = Join-Path $rootDir "apps\desktop"
if (Test-Path $desktopDir) {
    Write-Host "✅ Desktop app directory found: $desktopDir" -ForegroundColor Green
    
    # Check package.json
    $packageJson = Join-Path $desktopDir "package.json"
    if (Test-Path $packageJson) {
        Write-Host "✅ package.json found" -ForegroundColor Green
    } else {
        Write-Host "❌ package.json not found" -ForegroundColor Red
    }
    
    # Check if node_modules exists
    $nodeModules = Join-Path $desktopDir "node_modules"
    if (Test-Path $nodeModules) {
        Write-Host "✅ node_modules found (dependencies installed)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  node_modules not found (will be installed on startup)" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Desktop app directory not found: $desktopDir" -ForegroundColor Red
}

# Test 5: Check Startup Scripts
Write-Host "`n🔍 Test 5: Startup Scripts" -ForegroundColor Yellow
$startupScripts = @(
    "scripts\start-espace.ps1",
    "start-espace.bat",
    "start-espace.sh"
)

foreach ($script in $startupScripts) {
    $scriptPath = Join-Path $rootDir $script
    if (Test-Path $scriptPath) {
        Write-Host "✅ $script found" -ForegroundColor Green
    } else {
        Write-Host "❌ $script not found" -ForegroundColor Red
    }
}

# Test 6: Check Port Availability
Write-Host "`n🔍 Test 6: Port Availability" -ForegroundColor Yellow

# Check port 8002 (FastAPI)
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect("localhost", 8002)
    $tcpClient.Close()
    Write-Host "⚠️  Port 8002 is in use (FastAPI service may already be running)" -ForegroundColor Yellow
} catch {
    Write-Host "✅ Port 8002 is available" -ForegroundColor Green
}

# Check port 5176 (Desktop app)
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect("localhost", 5176)
    $tcpClient.Close()
    Write-Host "⚠️  Port 5176 is in use (Desktop app may already be running)" -ForegroundColor Yellow
} catch {
    Write-Host "✅ Port 5176 is available" -ForegroundColor Green
}

Write-Host "`n📋 Summary:" -ForegroundColor Cyan
Write-Host "Run the following command to start ESpice:" -ForegroundColor Gray
Write-Host "  .\scripts\start-espace.ps1" -ForegroundColor Green
Write-Host "Or double-click: start-espace.bat" -ForegroundColor Green

