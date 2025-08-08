# ESpice Quick Setup Script for Windows
# This script automates the setup process for new developers

Write-Host "🚀 ESpice Quick Setup Script" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Check if Node.js is installed
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
    
    # Check if version is 18 or higher
    $version = $nodeVersion.TrimStart('v')
    $majorVersion = [int]($version.Split('.')[0])
    if ($majorVersion -lt 18) {
        Write-Host "❌ Node.js version 18 or higher required. Current: $version" -ForegroundColor Red
        Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if Rust is installed
Write-Host "Checking Rust..." -ForegroundColor Yellow
try {
    $rustVersion = rustc --version
    Write-Host "✅ Rust found: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Rust not found" -ForegroundColor Red
    Write-Host "Installing Rust..." -ForegroundColor Yellow
    
    # Download and run rustup installer
    $rustupUrl = "https://win.rustup.rs/x86_64"
    $rustupPath = "$env:TEMP\rustup-init.exe"
    
    try {
        Invoke-WebRequest -Uri $rustupUrl -OutFile $rustupPath
        Start-Process -FilePath $rustupPath -ArgumentList "--quiet" -Wait
        Remove-Item $rustupPath -Force
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Host "✅ Rust installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install Rust automatically" -ForegroundColor Red
        Write-Host "Please install Rust manually from https://rustup.rs/" -ForegroundColor Yellow
        exit 1
    }
}

# Check if npm is available
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}

# Install Node.js dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
try {
    npm install
    Write-Host "✅ Node.js dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install Node.js dependencies" -ForegroundColor Red
    exit 1
}

# Build Rust dependencies
Write-Host "Building Rust dependencies..." -ForegroundColor Yellow
try {
    Set-Location "src-tauri"
    cargo build
    Set-Location ".."
    Write-Host "✅ Rust dependencies built" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to build Rust dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "To start the application, run:" -ForegroundColor Cyan
Write-Host "  npm run tauri:dev" -ForegroundColor White
Write-Host ""
Write-Host "For development, you can also run:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host "" 