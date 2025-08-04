# ESpice Website Deployment Script
# This script handles the complete deployment of the ESpice website

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [string]$Version = ""
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Blue = "Blue"

# Configuration
$Config = @{
    Development = @{
        FrontendUrl = "http://localhost:3000"
        BackendUrl = "http://localhost:3001"
        DatabaseUrl = "postgresql://espice:espice_password@localhost:5432/espice_website"
    }
    Staging = @{
        FrontendUrl = "https://staging.espice.app"
        BackendUrl = "https://api-staging.espice.app"
        DatabaseUrl = $env:STAGING_DATABASE_URL
    }
    Production = @{
        FrontendUrl = "https://espice.app"
        BackendUrl = "https://api.espice.app"
        DatabaseUrl = $env:PRODUCTION_DATABASE_URL
    }
}

function Write-Status {
    param(
        [string]$Message,
        [string]$Status = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    switch ($Status) {
        "SUCCESS" { Write-Host "[$timestamp] ✅ $Message" -ForegroundColor $Green }
        "ERROR" { Write-Host "[$timestamp] ❌ $Message" -ForegroundColor $Red }
        "WARNING" { Write-Host "[$timestamp] ⚠️  $Message" -ForegroundColor $Yellow }
        "INFO" { Write-Host "[$timestamp] ℹ️  $Message" -ForegroundColor $Blue }
    }
}

function Test-Prerequisites {
    Write-Status "Checking prerequisites..." "INFO"
    
    # Check Docker
    try {
        $dockerVersion = docker --version
        Write-Status "Docker: $dockerVersion" "SUCCESS"
    } catch {
        Write-Status "Docker not found. Please install Docker Desktop." "ERROR"
        exit 1
    }
    
    # Check Docker Compose
    try {
        $composeVersion = docker-compose --version
        Write-Status "Docker Compose: $composeVersion" "SUCCESS"
    } catch {
        Write-Status "Docker Compose not found. Please install Docker Compose." "ERROR"
        exit 1
    }
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Status "Node.js: $nodeVersion" "SUCCESS"
    } catch {
        Write-Status "Node.js not found. Please install Node.js 18+." "ERROR"
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Status "npm: $npmVersion" "SUCCESS"
    } catch {
        Write-Status "npm not found. Please install npm." "ERROR"
        exit 1
    }
}

function Test-Environment {
    Write-Status "Testing environment configuration..." "INFO"
    
    $envConfig = $Config[$Environment]
    if (-not $envConfig) {
        Write-Status "Invalid environment: $Environment" "ERROR"
        exit 1
    }
    
    Write-Status "Environment: $Environment" "SUCCESS"
    Write-Status "Frontend URL: $($envConfig.FrontendUrl)" "INFO"
    Write-Status "Backend URL: $($envConfig.BackendUrl)" "INFO"
}

function Invoke-Tests {
    if ($SkipTests) {
        Write-Status "Skipping tests as requested" "WARNING"
        return
    }
    
    Write-Status "Running tests..." "INFO"
    
    # Frontend tests
    Write-Status "Running frontend tests..." "INFO"
    Set-Location "website"
    try {
        npm run test:coverage
        Write-Status "Frontend tests passed" "SUCCESS"
    } catch {
        Write-Status "Frontend tests failed" "ERROR"
        exit 1
    }
    Set-Location ".."
    
    # Backend tests
    Write-Status "Running backend tests..." "INFO"
    Set-Location "website/server"
    try {
        npm run test:coverage
        Write-Status "Backend tests passed" "SUCCESS"
    } catch {
        Write-Status "Backend tests failed" "ERROR"
        exit 1
    }
    Set-Location "../.."
}

function Invoke-Build {
    if ($SkipBuild) {
        Write-Status "Skipping build as requested" "WARNING"
        return
    }
    
    Write-Status "Building applications..." "INFO"
    
    # Build frontend
    Write-Status "Building frontend..." "INFO"
    Set-Location "website"
    try {
        npm run build
        Write-Status "Frontend build completed" "SUCCESS"
    } catch {
        Write-Status "Frontend build failed" "ERROR"
        exit 1
    }
    Set-Location ".."
    
    # Build backend
    Write-Status "Building backend..." "INFO"
    Set-Location "website/server"
    try {
        npm run build
        Write-Status "Backend build completed" "SUCCESS"
    } catch {
        Write-Status "Backend build failed" "ERROR"
        exit 1
    }
    Set-Location "../.."
}

function Invoke-DockerBuild {
    Write-Status "Building Docker images..." "INFO"
    
    try {
        docker-compose build --no-cache
        Write-Status "Docker images built successfully" "SUCCESS"
    } catch {
        Write-Status "Docker build failed" "ERROR"
        exit 1
    }
}

function Invoke-DatabaseMigration {
    Write-Status "Running database migrations..." "INFO"
    
    try {
        Set-Location "website/server"
        npx prisma migrate deploy
        Write-Status "Database migrations completed" "SUCCESS"
        Set-Location "../.."
    } catch {
        Write-Status "Database migration failed" "ERROR"
        exit 1
    }
}

function Invoke-Deploy {
    Write-Status "Deploying to $Environment environment..." "INFO"
    
    try {
        # Stop existing containers
        Write-Status "Stopping existing containers..." "INFO"
        docker-compose down
        
        # Start services
        Write-Status "Starting services..." "INFO"
        docker-compose up -d
        
        # Wait for services to be healthy
        Write-Status "Waiting for services to be healthy..." "INFO"
        Start-Sleep -Seconds 30
        
        # Check service health
        $services = @("frontend", "backend", "postgres", "redis")
        foreach ($service in $services) {
            $health = docker-compose ps $service
            if ($health -match "healthy") {
                Write-Status "$service is healthy" "SUCCESS"
            } else {
                Write-Status "$service health check failed" "ERROR"
                exit 1
            }
        }
        
        Write-Status "Deployment completed successfully" "SUCCESS"
    } catch {
        Write-Status "Deployment failed" "ERROR"
        exit 1
    }
}

function Test-Deployment {
    Write-Status "Testing deployment..." "INFO"
    
    $envConfig = $Config[$Environment]
    
    # Test frontend
    try {
        $response = Invoke-WebRequest -Uri "$($envConfig.FrontendUrl)/health" -Method GET -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-Status "Frontend health check passed" "SUCCESS"
        } else {
            Write-Status "Frontend health check failed" "ERROR"
        }
    } catch {
        Write-Status "Frontend health check failed: $($_.Exception.Message)" "ERROR"
    }
    
    # Test backend
    try {
        $response = Invoke-WebRequest -Uri "$($envConfig.BackendUrl)/health" -Method GET -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-Status "Backend health check passed" "SUCCESS"
        } else {
            Write-Status "Backend health check failed" "ERROR"
        }
    } catch {
        Write-Status "Backend health check failed: $($_.Exception.Message)" "ERROR"
    }
}

function Invoke-Cleanup {
    Write-Status "Cleaning up..." "INFO"
    
    try {
        # Remove unused Docker images
        docker image prune -f
        
        # Remove unused Docker volumes
        docker volume prune -f
        
        Write-Status "Cleanup completed" "SUCCESS"
    } catch {
        Write-Status "Cleanup failed: $($_.Exception.Message)" "WARNING"
    }
}

function Show-DeploymentInfo {
    Write-Status "Deployment Information" "INFO"
    Write-Host "================================================" -ForegroundColor $Blue
    
    $envConfig = $Config[$Environment]
    Write-Host "Environment: $Environment" -ForegroundColor $Blue
    Write-Host "Frontend URL: $($envConfig.FrontendUrl)" -ForegroundColor $Blue
    Write-Host "Backend URL: $($envConfig.BackendUrl)" -ForegroundColor $Blue
    Write-Host "Grafana Dashboard: http://localhost:3002" -ForegroundColor $Blue
    Write-Host "Prometheus: http://localhost:9090" -ForegroundColor $Blue
    Write-Host "Kibana: http://localhost:5601" -ForegroundColor $Blue
    
    Write-Host "`nUseful Commands:" -ForegroundColor $Yellow
    Write-Host "  View logs: docker-compose logs -f" -ForegroundColor $Yellow
    Write-Host "  Stop services: docker-compose down" -ForegroundColor $Yellow
    Write-Host "  Restart services: docker-compose restart" -ForegroundColor $Yellow
    Write-Host "  View status: docker-compose ps" -ForegroundColor $Yellow
}

# Main execution
Write-Host "🚀 ESpice Website Deployment" -ForegroundColor $Blue
Write-Host "=============================" -ForegroundColor $Blue

try {
    # Check prerequisites
    Test-Prerequisites
    
    # Test environment
    Test-Environment
    
    # Confirm deployment
    if (-not $Force) {
        $confirmation = Read-Host "Deploy to $Environment environment? (y/N)"
        if ($confirmation -ne "y" -and $confirmation -ne "Y") {
            Write-Status "Deployment cancelled" "WARNING"
            exit 0
        }
    }
    
    # Run tests
    Invoke-Tests
    
    # Build applications
    Invoke-Build
    
    # Build Docker images
    Invoke-DockerBuild
    
    # Run database migrations
    Invoke-DatabaseMigration
    
    # Deploy
    Invoke-Deploy
    
    # Test deployment
    Test-Deployment
    
    # Cleanup
    Invoke-Cleanup
    
    # Show deployment info
    Show-DeploymentInfo
    
    Write-Status "Deployment completed successfully!" "SUCCESS"
    
} catch {
    Write-Status "Deployment failed: $($_.Exception.Message)" "ERROR"
    Write-Status "Check logs for more details" "INFO"
    exit 1
} 