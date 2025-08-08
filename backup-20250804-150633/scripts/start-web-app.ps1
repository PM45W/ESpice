# Start Web App
# This script starts the ESpice web application

Write-Host "Starting ESpice Web App..." -ForegroundColor Green

# Navigate to the website directory
$websiteDir = Join-Path $PSScriptRoot ".." "website"
if (-not (Test-Path $websiteDir)) {
    Write-Host "Error: Website directory not found at $websiteDir" -ForegroundColor Red
    exit 1
}

Set-Location $websiteDir

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Start the development server
Write-Host "Starting development server..." -ForegroundColor Green
Write-Host "Web app will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow

npm run dev 