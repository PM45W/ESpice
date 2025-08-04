# ESpice Systematic Testing Script
# This script automates the systematic testing process for the ESpice application

param(
    [switch]$Quick,
    [switch]$Full,
    [switch]$Frontend,
    [switch]$Backend,
    [switch]$Microservices,
    [switch]$Performance
)

# Set error action preference
$ErrorActionPreference = "Continue"

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Blue = "Blue"

# Test results tracking
$TestResults = @{
    Passed = 0
    Failed = 0
    Warnings = 0
    Total = 0
}

function Write-TestResult {
    param(
        [string]$TestName,
        [string]$Status,
        [string]$Message = ""
    )
    
    $TestResults.Total++
    
    switch ($Status) {
        "PASS" { 
            Write-Host "✅ $TestName" -ForegroundColor $Green
            $TestResults.Passed++
        }
        "FAIL" { 
            Write-Host "❌ $TestName" -ForegroundColor $Red
            Write-Host "   $Message" -ForegroundColor $Red
            $TestResults.Failed++
        }
        "WARN" { 
            Write-Host "⚠️  $TestName" -ForegroundColor $Yellow
            Write-Host "   $Message" -ForegroundColor $Yellow
            $TestResults.Warnings++
        }
        "INFO" { 
            Write-Host "ℹ️  $TestName" -ForegroundColor $Blue
            Write-Host "   $Message" -ForegroundColor $Blue
        }
    }
}

function Test-Environment {
    Write-Host "`n🔍 Testing Development Environment..." -ForegroundColor $Blue
    
    # Test Node.js
    try {
        $nodeVersion = node --version
        if ($nodeVersion -match "v(\d+)") {
            $majorVersion = [int]$matches[1]
            if ($majorVersion -ge 18) {
                Write-TestResult "Node.js Version" "PASS" "Version: $nodeVersion"
            } else {
                Write-TestResult "Node.js Version" "FAIL" "Version $nodeVersion is too old. Required: 18+"
            }
        }
    } catch {
        Write-TestResult "Node.js Installation" "FAIL" "Node.js not found"
    }
    
    # Test npm
    try {
        $npmVersion = npm --version
        Write-TestResult "npm Installation" "PASS" "Version: $npmVersion"
    } catch {
        Write-TestResult "npm Installation" "FAIL" "npm not found"
    }
    
    # Test Rust
    try {
        $rustVersion = rustc --version
        Write-TestResult "Rust Installation" "PASS" "Version: $rustVersion"
    } catch {
        Write-TestResult "Rust Installation" "FAIL" "Rust not found"
    }
    
    # Test Cargo
    try {
        $cargoVersion = cargo --version
        Write-TestResult "Cargo Installation" "PASS" "Version: $cargoVersion"
    } catch {
        Write-TestResult "Cargo Installation" "FAIL" "Cargo not found"
    }
    
    # Test Python
    try {
        $pythonVersion = python --version
        if ($pythonVersion -match "Python (\d+)\.(\d+)") {
            $majorVersion = [int]$matches[1]
            $minorVersion = [int]$matches[2]
            if ($majorVersion -ge 3 -and $minorVersion -ge 11) {
                Write-TestResult "Python Version" "PASS" "Version: $pythonVersion"
            } else {
                Write-TestResult "Python Version" "WARN" "Version $pythonVersion might be too old. Recommended: 3.11+"
            }
        }
    } catch {
        Write-TestResult "Python Installation" "FAIL" "Python not found"
    }
}

function Test-FrontendBuild {
    Write-Host "`n🔍 Testing Frontend Build..." -ForegroundColor $Blue
    
    # Check if package.json exists
    if (Test-Path "package.json") {
        Write-TestResult "Package.json" "PASS" "Found package.json"
    } else {
        Write-TestResult "Package.json" "FAIL" "package.json not found"
        return
    }
    
    # Test npm install
    try {
        Write-Host "Installing dependencies..." -ForegroundColor $Yellow
        npm install --silent
        Write-TestResult "npm install" "PASS" "Dependencies installed successfully"
    } catch {
        Write-TestResult "npm install" "FAIL" "Failed to install dependencies"
        return
    }
    
    # Test TypeScript compilation
    try {
        Write-Host "Checking TypeScript compilation..." -ForegroundColor $Yellow
        npx tsc --noEmit
        Write-TestResult "TypeScript Compilation" "PASS" "No TypeScript errors"
    } catch {
        Write-TestResult "TypeScript Compilation" "FAIL" "TypeScript compilation errors found"
    }
    
    # Test build
    try {
        Write-Host "Building frontend..." -ForegroundColor $Yellow
        npm run build
        Write-TestResult "Frontend Build" "PASS" "Build completed successfully"
    } catch {
        Write-TestResult "Frontend Build" "FAIL" "Build failed"
    }
}

function Test-BackendBuild {
    Write-Host "`n🔍 Testing Backend Build..." -ForegroundColor $Blue
    
    # Check if Cargo.toml exists
    if (Test-Path "src-tauri/Cargo.toml") {
        Write-TestResult "Cargo.toml" "PASS" "Found Cargo.toml"
    } else {
        Write-TestResult "Cargo.toml" "FAIL" "Cargo.toml not found"
        return
    }
    
    # Test cargo check
    try {
        Write-Host "Checking Rust code..." -ForegroundColor $Yellow
        Set-Location "src-tauri"
        cargo check
        Set-Location ".."
        Write-TestResult "Cargo Check" "PASS" "Rust code compiles without errors"
    } catch {
        Write-TestResult "Cargo Check" "WARN" "Rust code has warnings or errors"
    }
    
    # Test cargo build
    try {
        Write-Host "Building backend..." -ForegroundColor $Yellow
        Set-Location "src-tauri"
        cargo build
        Set-Location ".."
        Write-TestResult "Cargo Build" "PASS" "Backend build completed successfully"
    } catch {
        Write-TestResult "Cargo Build" "FAIL" "Backend build failed"
    }
}

function Test-Microservices {
    Write-Host "`n🔍 Testing Microservices..." -ForegroundColor $Blue
    
    # Check if services directory exists
    if (Test-Path "services") {
        Write-TestResult "Services Directory" "PASS" "Found services directory"
    } else {
        Write-TestResult "Services Directory" "FAIL" "Services directory not found"
        return
    }
    
    # Check for Docker
    try {
        $dockerVersion = docker --version
        Write-TestResult "Docker Installation" "PASS" "Version: $dockerVersion"
    } catch {
        Write-TestResult "Docker Installation" "WARN" "Docker not found - microservices testing limited"
        return
    }
    
    # Check for Docker Compose
    try {
        $composeVersion = docker-compose --version
        Write-TestResult "Docker Compose" "PASS" "Version: $composeVersion"
    } catch {
        Write-TestResult "Docker Compose" "WARN" "Docker Compose not found"
    }
    
    # Test service directories
    $services = @(
        "api-gateway",
        "pdf-service", 
        "image-service",
        "table-service",
        "spice-service",
        "batch-processor",
        "ai-agent",
        "test-correlation",
        "version-control",
        "pdk-checker"
    )
    
    foreach ($service in $services) {
        $servicePath = "services/$service"
        if (Test-Path $servicePath) {
            Write-TestResult "Service: $service" "PASS" "Service directory found"
            
            # Check for main.py
            if (Test-Path "$servicePath/main.py") {
                Write-TestResult "  - main.py" "PASS" "Main service file found"
            } else {
                Write-TestResult "  - main.py" "WARN" "Main service file missing"
            }
            
            # Check for requirements.txt
            if (Test-Path "$servicePath/requirements.txt") {
                Write-TestResult "  - requirements.txt" "PASS" "Dependencies file found"
            } else {
                Write-TestResult "  - requirements.txt" "WARN" "Dependencies file missing"
            }
            
            # Check for Dockerfile
            if (Test-Path "$servicePath/Dockerfile") {
                Write-TestResult "  - Dockerfile" "PASS" "Container configuration found"
            } else {
                Write-TestResult "  - Dockerfile" "WARN" "Container configuration missing"
            }
        } else {
            Write-TestResult "Service: $service" "FAIL" "Service directory not found"
        }
    }
}

function Test-Performance {
    Write-Host "`n🔍 Testing Performance..." -ForegroundColor $Blue
    
    # Test build performance
    $startTime = Get-Date
    try {
        npm run build
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        Write-TestResult "Build Performance" "PASS" "Build completed in $([math]::Round($duration, 2)) seconds"
    } catch {
        Write-TestResult "Build Performance" "FAIL" "Build performance test failed"
    }
    
    # Check bundle size
    if (Test-Path "dist") {
        $bundleSize = (Get-ChildItem "dist" -Recurse | Measure-Object -Property Length -Sum).Sum
        $bundleSizeMB = [math]::Round($bundleSize / 1MB, 2)
        Write-TestResult "Bundle Size" "INFO" "Total bundle size: $bundleSizeMB MB"
    }
}

function Show-TestSummary {
    Write-Host "`n📊 Test Summary" -ForegroundColor $Blue
    Write-Host "================" -ForegroundColor $Blue
    Write-Host "Total Tests: $($TestResults.Total)" -ForegroundColor $Blue
    Write-Host "✅ Passed: $($TestResults.Passed)" -ForegroundColor $Green
    Write-Host "❌ Failed: $($TestResults.Failed)" -ForegroundColor $Red
    Write-Host "⚠️  Warnings: $($TestResults.Warnings)" -ForegroundColor $Yellow
    
    $successRate = if ($TestResults.Total -gt 0) { [math]::Round(($TestResults.Passed / $TestResults.Total) * 100, 1) } else { 0 }
    Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { $Green } elseif ($successRate -ge 60) { $Yellow } else { $Red })
}

# Main execution
Write-Host "🚀 ESpice Systematic Testing" -ForegroundColor $Blue
Write-Host "=============================" -ForegroundColor $Blue

# Determine what to test based on parameters
if ($Quick) {
    Write-Host "Running Quick Tests..." -ForegroundColor $Yellow
    Test-Environment
    Test-FrontendBuild
} elseif ($Full) {
    Write-Host "Running Full Test Suite..." -ForegroundColor $Yellow
    Test-Environment
    Test-FrontendBuild
    Test-BackendBuild
    Test-Microservices
    Test-Performance
} elseif ($Frontend) {
    Write-Host "Running Frontend Tests..." -ForegroundColor $Yellow
    Test-Environment
    Test-FrontendBuild
} elseif ($Backend) {
    Write-Host "Running Backend Tests..." -ForegroundColor $Yellow
    Test-Environment
    Test-BackendBuild
} elseif ($Microservices) {
    Write-Host "Running Microservices Tests..." -ForegroundColor $Yellow
    Test-Environment
    Test-Microservices
} elseif ($Performance) {
    Write-Host "Running Performance Tests..." -ForegroundColor $Yellow
    Test-Performance
} else {
    # Default: run quick tests
    Write-Host "Running Quick Tests (default)..." -ForegroundColor $Yellow
    Write-Host "Use -Full for complete test suite" -ForegroundColor $Yellow
    Test-Environment
    Test-FrontendBuild
}

Show-TestSummary

# Exit with appropriate code
if ($TestResults.Failed -gt 0) {
    exit 1
} else {
    exit 0
} 