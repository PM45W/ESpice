# ESpice Interactive Architecture Website Setup Script
# This script sets up and runs the interactive architecture explorer

Write-Host "🎯 ESpice Interactive Architecture Explorer Setup" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
function Test-NodeJS {
    try {
        $nodeVersion = node --version
        Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
        Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
        return $false
    }
}

# Check if npm is installed
function Test-NPM {
    try {
        $npmVersion = npm --version
        Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
        return $false
    }
}

# Install dependencies
function Install-Dependencies {
    Write-Host ""
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    
    try {
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Failed to install dependencies." -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Error installing dependencies: $_" -ForegroundColor Red
        return $false
    }
}

# Start development server
function Start-DevServer {
    Write-Host ""
    Write-Host "🚀 Starting development server..." -ForegroundColor Yellow
    Write-Host "The website will open at: http://localhost:3001" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Available commands:" -ForegroundColor White
    Write-Host "  • Press Ctrl+C to stop the server" -ForegroundColor Gray
    Write-Host "  • npm run build    - Build for production" -ForegroundColor Gray
    Write-Host "  • npm run preview  - Preview production build" -ForegroundColor Gray
    Write-Host ""
    
    try {
        npm run dev
    }
    catch {
        Write-Host "❌ Error starting development server: $_" -ForegroundColor Red
    }
}

# Main execution
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-NodeJS)) {
    exit 1
}

if (-not (Test-NPM)) {
    exit 1
}

Write-Host ""
Write-Host "🎯 Features of the Interactive Architecture Explorer:" -ForegroundColor Yellow
Write-Host "  • Zoom & Pan through the architecture" -ForegroundColor White
Write-Host "  • Click components for detailed documentation" -ForegroundColor White
Write-Host "  • Hover animations and visual feedback" -ForegroundColor White
Write-Host "  • Category filtering and search" -ForegroundColor White
Write-Host "  • Workflow simulation with animations" -ForegroundColor White
Write-Host "  • MRDI-inspired professional design" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Do you want to install dependencies and start the server? (y/n)"

if ($choice -eq "y" -or $choice -eq "Y") {
    if (Install-Dependencies) {
        Start-DevServer
    }
} else {
    Write-Host ""
    Write-Host "📋 Manual setup instructions:" -ForegroundColor Yellow
    Write-Host "1. Run: npm install" -ForegroundColor White
    Write-Host "2. Run: npm run dev" -ForegroundColor White
    Write-Host "3. Open: http://localhost:3001" -ForegroundColor White
    Write-Host ""
    Write-Host "For more information, see README.md" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🎉 Happy exploring!" -ForegroundColor Green 