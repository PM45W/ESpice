# ESpice Microservices Startup Script
# This script starts all microservices and performs health checks

Write-Host "🚀 Starting ESpice Microservices Architecture..." -ForegroundColor Green

# Function to check if port is available
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Function to wait for service to be ready
function Wait-ForService {
    param([string]$ServiceName, [int]$Port, [int]$Timeout = 30)
    
    Write-Host "⏳ Waiting for $ServiceName on port $Port..." -ForegroundColor Yellow
    
    $startTime = Get-Date
    while ((Get-Date) -lt ($startTime.AddSeconds($Timeout))) {
        if (Test-Port $Port) {
            Write-Host "✅ $ServiceName is ready!" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 2
    }
    
    Write-Host "❌ $ServiceName failed to start within $Timeout seconds" -ForegroundColor Red
    return $false
}

# Function to test service health
function Test-ServiceHealth {
    param([string]$ServiceName, [int]$Port)
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$Port/health" -Method Get -TimeoutSec 10
        if ($response.status -eq "healthy") {
            Write-Host "✅ $ServiceName health check passed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $ServiceName health check failed" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ $ServiceName health check failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Check if Docker is running
Write-Host "🔍 Checking Docker status..." -ForegroundColor Blue
try {
    docker version | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if docker-compose is available
Write-Host "🔍 Checking Docker Compose..." -ForegroundColor Blue
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is available" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker Compose is not available. Please install Docker Compose." -ForegroundColor Red
    exit 1
}

# Stop any existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>$null

# Build and start services
Write-Host "🔨 Building and starting services..." -ForegroundColor Blue
docker-compose up -d --build

# Wait for services to start
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test individual services
$services = @(
    @{Name="PDF Service"; Port=8002},
    @{Name="Image Service"; Port=8003},
    @{Name="Table Service"; Port=8004},
    @{Name="SPICE Service"; Port=8005}
)

$allHealthy = $true

foreach ($service in $services) {
    if (-not (Wait-ForService -ServiceName $service.Name -Port $service.Port)) {
        $allHealthy = $false
        continue
    }
    
    if (-not (Test-ServiceHealth -ServiceName $service.Name -Port $service.Port)) {
        $allHealthy = $false
    }
}

# Test API Gateway
Write-Host "🔍 Testing API Gateway..." -ForegroundColor Blue
if (Wait-ForService -ServiceName "API Gateway" -Port 8000) {
    if (Test-ServiceHealth -ServiceName "API Gateway" -Port 8000) {
        Write-Host "✅ API Gateway is ready!" -ForegroundColor Green
    } else {
        $allHealthy = $false
    }
} else {
    $allHealthy = $false
}

# Test overall gateway health
if ($allHealthy) {
    Write-Host "🔍 Testing overall system health..." -ForegroundColor Blue
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/gateway/health" -Method Get -TimeoutSec 10
        if ($response.data.overall_status -eq "healthy") {
            Write-Host "✅ All services are healthy!" -ForegroundColor Green
            Write-Host "📊 Service Status:" -ForegroundColor Cyan
            foreach ($service in $response.data.services) {
                $status = if ($service.status -eq "healthy") { "✅" } else { "❌" }
                Write-Host "  $status $($service.service): $($service.status)" -ForegroundColor $(if ($service.status -eq "healthy") { "Green" } else { "Red" })
            }
        } else {
            Write-Host "⚠️  System is degraded" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "❌ Failed to get overall system health: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Display service URLs
Write-Host "`n🌐 Service URLs:" -ForegroundColor Cyan
Write-Host "  API Gateway:     http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs:        http://localhost:8000/docs" -ForegroundColor White
Write-Host "  PDF Service:     http://localhost:8002" -ForegroundColor White
Write-Host "  Image Service:   http://localhost:8003" -ForegroundColor White
Write-Host "  Table Service:   http://localhost:8004" -ForegroundColor White
Write-Host "  SPICE Service:   http://localhost:8005" -ForegroundColor White

# Test API endpoints
Write-Host "`n🧪 Testing API endpoints..." -ForegroundColor Blue

# Test PDF service
Write-Host "  Testing PDF service..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/pdf/extract-text" -Method Post -ContentType "multipart/form-data" -TimeoutSec 10
    Write-Host "  ✅ PDF service endpoint accessible" -ForegroundColor Green
}
catch {
    Write-Host "  ⚠️  PDF service endpoint test failed (expected without file)" -ForegroundColor Yellow
}

# Test SPICE service
Write-Host "  Testing SPICE service..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/spice/models" -Method Get -TimeoutSec 10
    if ($response.success) {
        Write-Host "  ✅ SPICE service endpoint working" -ForegroundColor Green
        Write-Host "  📋 Available models: $($response.data.models.Count)" -ForegroundColor White
    }
}
catch {
    Write-Host "  ❌ SPICE service endpoint test failed" -ForegroundColor Red
}

# Final status
Write-Host "`n🎉 Microservices startup complete!" -ForegroundColor Green
if ($allHealthy) {
    Write-Host "✅ All services are running and healthy" -ForegroundColor Green
    Write-Host "🚀 Ready for development and testing" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some services may not be fully operational" -ForegroundColor Yellow
    Write-Host "📋 Check logs with: docker-compose logs [service-name]" -ForegroundColor White
}

Write-Host "`n📝 Useful commands:" -ForegroundColor Cyan
Write-Host "  View logs:        docker-compose logs -f" -ForegroundColor White
Write-Host "  Stop services:    docker-compose down" -ForegroundColor White
Write-Host "  Restart services: docker-compose restart" -ForegroundColor White
Write-Host "  Scale services:   docker-compose up -d --scale pdf-service=3" -ForegroundColor White 