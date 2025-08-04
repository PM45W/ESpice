# ESpice Ollama Setup Script for Windows
# This script automates the installation and setup of Ollama for ESpice

Write-Host "🚀 ESpice Ollama Setup Script" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Check if Ollama is already installed
Write-Host "Checking if Ollama is already installed..." -ForegroundColor Yellow
try {
    $ollamaVersion = ollama --version 2>$null
    if ($ollamaVersion) {
        Write-Host "✅ Ollama is already installed: $ollamaVersion" -ForegroundColor Green
        $alreadyInstalled = $true
    } else {
        $alreadyInstalled = $false
    }
} catch {
    $alreadyInstalled = $false
}

if (-not $alreadyInstalled) {
    Write-Host "Installing Ollama..." -ForegroundColor Yellow
    
    # Try winget first
    Write-Host "Attempting to install via winget..." -ForegroundColor Cyan
    try {
        winget install ollama.ollama --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Ollama installed successfully via winget" -ForegroundColor Green
        } else {
            throw "winget installation failed"
        }
    } catch {
        Write-Host "⚠️  winget installation failed, trying Chocolatey..." -ForegroundColor Yellow
        
        # Try Chocolatey
        try {
            choco install ollama -y
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Ollama installed successfully via Chocolatey" -ForegroundColor Green
            } else {
                throw "Chocolatey installation failed"
            }
        } catch {
            Write-Host "❌ Automatic installation failed" -ForegroundColor Red
            Write-Host "Please install Ollama manually:" -ForegroundColor Yellow
            Write-Host "1. Visit https://ollama.ai/download" -ForegroundColor Cyan
            Write-Host "2. Download the Windows installer" -ForegroundColor Cyan
            Write-Host "3. Run the installer" -ForegroundColor Cyan
            Write-Host "4. Restart this script" -ForegroundColor Cyan
            exit 1
        }
    }
}

# Check if Ollama is running
Write-Host "Checking if Ollama server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
    Write-Host "✅ Ollama server is already running" -ForegroundColor Green
    $serverRunning = $true
} catch {
    Write-Host "Starting Ollama server..." -ForegroundColor Yellow
    $serverRunning = $false
}

if (-not $serverRunning) {
    try {
        # Start Ollama in background
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
        
        # Wait for server to start
        Write-Host "Waiting for Ollama server to start..." -ForegroundColor Yellow
        $maxAttempts = 30
        $attempt = 0
        
        while ($attempt -lt $maxAttempts) {
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2
                Write-Host "✅ Ollama server started successfully" -ForegroundColor Green
                $serverRunning = $true
                break
            } catch {
                $attempt++
                Start-Sleep -Seconds 1
                Write-Host "Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
            }
        }
        
        if (-not $serverRunning) {
            throw "Server failed to start within 30 seconds"
        }
    } catch {
        Write-Host "❌ Failed to start Ollama server" -ForegroundColor Red
        Write-Host "Please start it manually by running: ollama serve" -ForegroundColor Yellow
        exit 1
    }
}

# Check for available models
Write-Host "Checking available models..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get
    $models = $response.models
    
    if ($models.Count -eq 0) {
        Write-Host "No models found. Downloading default model..." -ForegroundColor Yellow
        Write-Host "This may take several minutes depending on your internet connection..." -ForegroundColor Cyan
        
        # Pull default model
        ollama pull llama3.1:8b
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Default model downloaded successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to download default model" -ForegroundColor Red
            Write-Host "You can download models manually using: ollama pull <model-name>" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ Found $($models.Count) model(s):" -ForegroundColor Green
        foreach ($model in $models) {
            Write-Host "  - $($model.name)" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "❌ Failed to check models" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Ollama setup completed!" -ForegroundColor Green
Write-Host "You can now use ESpice with enhanced LLM processing." -ForegroundColor Cyan
Write-Host ""
Write-Host "To manage Ollama models:" -ForegroundColor Yellow
Write-Host "  - List models: ollama list" -ForegroundColor Gray
Write-Host "  - Pull new model: ollama pull <model-name>" -ForegroundColor Gray
Write-Host "  - Remove model: ollama rm <model-name>" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 