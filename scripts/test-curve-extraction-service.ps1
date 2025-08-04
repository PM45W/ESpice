# Test Curve Extraction Service
# This script tests if the FastAPI curve extraction service is working

Write-Host "Testing Curve Extraction Service..." -ForegroundColor Green

# Test if the service is running
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8002/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Service is running and healthy!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Service is not running or not accessible" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure to start the service first with: ./scripts/start-curve-extraction-service.ps1" -ForegroundColor Yellow
    exit 1
}

# Test the root endpoint
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8002/" -Method GET -TimeoutSec 5
    Write-Host "✅ Root endpoint working!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Root endpoint failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nService URLs:" -ForegroundColor Yellow
Write-Host "  - Health Check: http://localhost:8002/health" -ForegroundColor Cyan
Write-Host "  - API Documentation: http://localhost:8002/docs" -ForegroundColor Cyan
Write-Host "  - ReDoc Documentation: http://localhost:8002/redoc" -ForegroundColor Cyan

Write-Host "`n✅ Curve extraction service is ready for use!" -ForegroundColor Green 