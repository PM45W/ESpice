# ESpice Showcase Start Script
# Quick start for the interactive architecture showcase

Write-Host "🚀 Starting ESpice Showcase..." -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies first..." -ForegroundColor Yellow
    npm install
}

# Start development server
Write-Host "🌐 Starting development server..." -ForegroundColor Yellow
Write-Host "📱 The showcase will open at http://localhost:3000" -ForegroundColor Cyan
Write-Host "🛑 Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

npm run dev 