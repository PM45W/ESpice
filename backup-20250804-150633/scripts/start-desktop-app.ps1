# Start ESpice Desktop App
# This script starts both the FastAPI service and the desktop app

Write-Host "Starting ESpice Desktop App..." -ForegroundColor Green

# Check if we're in the right directory
$rootDir = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $rootDir "apps\desktop"))) {
    Write-Host "Error: Desktop app directory not found. Please run this script from the ESpice root directory." -ForegroundColor Red
    exit 1
}

# Step 1: Start FastAPI Service
Write-Host "`n🚀 Step 1: Starting FastAPI Service..." -ForegroundColor Cyan
$fastApiScript = Join-Path $rootDir "scripts\start-curve-extraction-service-simple.ps1"

if (Test-Path $fastApiScript) {
    Write-Host "Starting FastAPI service in background..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $fastApiScript -WindowStyle Minimized
    
    # Wait a moment for service to start
    Write-Host "Waiting for FastAPI service to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Check if service is running
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8002/health" -Method GET -TimeoutSec 5
        Write-Host "✅ FastAPI service is running!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  FastAPI service may not be ready yet. Desktop app will retry connection." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  FastAPI service script not found. Please start it manually:" -ForegroundColor Yellow
    Write-Host "   ./scripts/start-curve-extraction-service-simple.ps1" -ForegroundColor Gray
}

# Step 2: Start Desktop App
Write-Host "`n🖥️  Step 2: Starting Desktop App..." -ForegroundColor Cyan
$desktopDir = Join-Path $rootDir "apps\desktop"

if (Test-Path $desktopDir) {
    Set-Location $desktopDir
    
    # Check if dependencies are installed
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing desktop app dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    Write-Host "Starting desktop app in development mode..." -ForegroundColor Yellow
    Write-Host "The app will open in a new window." -ForegroundColor Cyan
    Write-Host "Service status will be shown in the app interface." -ForegroundColor Cyan
    
    # Start the desktop app
    npm run dev
} else {
    Write-Host "Error: Desktop app directory not found at $desktopDir" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Desktop app startup complete!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait for the Tauri window to open" -ForegroundColor Gray
Write-Host "2. Check the service status indicator (should be green)" -ForegroundColor Gray
Write-Host "3. Navigate to Graph Extraction page" -ForegroundColor Gray
Write-Host "4. Upload an image and test curve extraction" -ForegroundColor Gray

Write-Host "`n🔧 Troubleshooting:" -ForegroundColor Cyan
Write-Host "- If service status is red, check FastAPI service logs" -ForegroundColor Gray
Write-Host "- If app doesn't open, check console for errors" -ForegroundColor Gray
Write-Host "- Run: ./scripts/test-web-app-connection.ps1 to test service" -ForegroundColor Gray 