# Windows PowerShell script to test MCP server
Write-Host "�� Testing MCP Server..." -ForegroundColor Green

# Test health endpoint
Write-Host "Testing health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health"
    Write-Host "✅ Health check passed: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test models endpoint
Write-Host "Testing models endpoint..." -ForegroundColor Yellow
try {
    $models = Invoke-RestMethod -Uri "http://localhost:8000/api/models"
    Write-Host "✅ Models endpoint working: $($models.models.Count) models found" -ForegroundColor Green
} catch {
    Write-Host "❌ Models endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test SPICE generation
Write-Host "Testing SPICE generation..." -ForegroundColor Yellow
$spiceRequest = @{
    device_name = "TEST_DEVICE"
    device_type = "GaN-HEMT"
    model_type = "asm_hemt"
    parameters = @{
        voff = 2.5
        rd0 = "12m"
    }
} | ConvertTo-Json

try {
    $spiceResult = Invoke-RestMethod -Uri "http://localhost:8000/api/generate-spice" -Method POST -ContentType "application/json" -Body $spiceRequest
    Write-Host "✅ SPICE generation working: $($spiceResult.success)" -ForegroundColor Green
} catch {
    Write-Host "❌ SPICE generation failed: $($_.Exception.Message)" -ForegroundColor Red
} 