Write-Host "🔍 ESpice Application Status Check" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# Check if Node.js is installed
Write-Host "📦 Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js not found. Please install Node.js" -ForegroundColor Red
}

# Check if npm is available
Write-Host "📦 Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "   ✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ npm not found" -ForegroundColor Red
}

# Check if Rust is installed
Write-Host "🦀 Checking Rust..." -ForegroundColor Yellow
try {
    $rustVersion = rustc --version
    Write-Host "   ✅ Rust version: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Rust not found. Please install Rust" -ForegroundColor Red
}

# Check if Tauri CLI is installed
Write-Host "🏗️ Checking Tauri CLI..." -ForegroundColor Yellow
try {
    $tauriVersion = tauri --version
    Write-Host "   ✅ Tauri CLI version: $tauriVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Tauri CLI not found. Run: npm install -g @tauri-apps/cli" -ForegroundColor Red
}

# Check port availability
Write-Host "🌐 Checking port availability..." -ForegroundColor Yellow
$ports = @(1420, 1421)
foreach ($port in $ports) {
    $connections = netstat -ano | findstr ":$port"
    if ($connections) {
        Write-Host "   ⚠️ Port $port is in use" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ Port $port is available" -ForegroundColor Green
    }
}

# Check if dependencies are installed
Write-Host "📚 Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✅ Node modules installed" -ForegroundColor Green
} else {
    Write-Host "   ❌ Node modules not found. Run: npm install" -ForegroundColor Red
}

# Check Rust dependencies
Write-Host "🦀 Checking Rust dependencies..." -ForegroundColor Yellow
if (Test-Path "src-tauri/Cargo.lock") {
    Write-Host "   ✅ Rust dependencies resolved" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Rust dependencies not built yet" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 Recommended commands:" -ForegroundColor Cyan
Write-Host "   Desktop App: npm run tauri:dev" -ForegroundColor White
Write-Host "   Web Only:   npm run dev" -ForegroundColor White
Write-Host "   Clean Ports: .\kill-ports.ps1" -ForegroundColor White 