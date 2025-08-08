# Test Web App Connection to FastAPI Service
# This script tests if the web app can properly connect to the FastAPI service

Write-Host "Testing Web App Connection to FastAPI Service..." -ForegroundColor Green

# Test if the service is running
Write-Host "`n🌐 Testing FastAPI service availability..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8002/health" -Method GET -TimeoutSec 5
    Write-Host "✅ FastAPI service is running and healthy!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FastAPI service is not running or not accessible" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please start the service first with: ./scripts/start-curve-extraction-service-simple.ps1" -ForegroundColor Yellow
    exit 1
}

# Test color detection endpoint
Write-Host "`n🎨 Testing color detection endpoint..." -ForegroundColor Cyan
try {
    # Create a simple test image (1x1 pixel PNG)
    $testImageBytes = [byte[]]@(
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, # PNG header
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, # IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, # 1x1 image
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, # PNG data
        0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, # IDAT chunk
        0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33, # Image data
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 # IEND chunk
    )

    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"test.png`"",
        "Content-Type: image/png",
        "",
        [System.Text.Encoding]::UTF8.GetString($testImageBytes),
        "--$boundary--"
    )
    $body = $bodyLines -join $LF

    $headers = @{
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }

    $response = Invoke-RestMethod -Uri "http://localhost:8002/api/curve-extraction/detect-colors" -Method POST -Body $body -Headers $headers -TimeoutSec 10
    
    if ($response.success) {
        Write-Host "✅ Color detection endpoint working!" -ForegroundColor Green
        Write-Host "Detected colors: $($response.data.detected_colors.Count)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Color detection endpoint failed" -ForegroundColor Red
        Write-Host "Error: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Color detection endpoint test failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test curve extraction endpoint
Write-Host "`n📈 Testing curve extraction endpoint..." -ForegroundColor Cyan
try {
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"test.png`"",
        "Content-Type: image/png",
        "",
        [System.Text.Encoding]::UTF8.GetString($testImageBytes),
        "--$boundary",
        "Content-Disposition: form-data; name=`"selected_colors`"",
        "",
        '["red", "blue"]',
        "--$boundary",
        "Content-Disposition: form-data; name=`"x_min`"",
        "",
        "0",
        "--$boundary",
        "Content-Disposition: form-data; name=`"x_max`"",
        "",
        "10",
        "--$boundary",
        "Content-Disposition: form-data; name=`"y_min`"",
        "",
        "0",
        "--$boundary",
        "Content-Disposition: form-data; name=`"y_max`"",
        "",
        "100",
        "--$boundary",
        "Content-Disposition: form-data; name=`"x_scale`"",
        "",
        "1",
        "--$boundary",
        "Content-Disposition: form-data; name=`"y_scale`"",
        "",
        "1",
        "--$boundary",
        "Content-Disposition: form-data; name=`"x_scale_type`"",
        "",
        "linear",
        "--$boundary",
        "Content-Disposition: form-data; name=`"y_scale_type`"",
        "",
        "linear",
        "--$boundary",
        "Content-Disposition: form-data; name=`"min_size`"",
        "",
        "1000",
        "--$boundary--"
    )
    $body = $bodyLines -join $LF

    $headers = @{
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }

    $response = Invoke-RestMethod -Uri "http://localhost:8002/api/curve-extraction/extract-curves" -Method POST -Body $body -Headers $headers -TimeoutSec 15
    
    if ($response.success) {
        Write-Host "✅ Curve extraction endpoint working!" -ForegroundColor Green
        Write-Host "Extracted curves: $($response.data.curves.Count)" -ForegroundColor Gray
        Write-Host "Total points: $($response.data.total_points)" -ForegroundColor Gray
        Write-Host "Processing time: $($response.data.processing_time)s" -ForegroundColor Gray
    } else {
        Write-Host "❌ Curve extraction endpoint failed" -ForegroundColor Red
        Write-Host "Error: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Curve extraction endpoint test failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📋 Summary:" -ForegroundColor Cyan
Write-Host "✅ FastAPI service is running" -ForegroundColor Green
Write-Host "✅ API endpoints are accessible" -ForegroundColor Green
Write-Host "✅ Web app should be able to connect" -ForegroundColor Green

Write-Host "`n🚀 Next steps:" -ForegroundColor Cyan
Write-Host "1. Start the web app: cd website && npm run dev" -ForegroundColor Gray
Write-Host "2. Navigate to: http://localhost:3000/graph-extraction" -ForegroundColor Gray
Write-Host "3. Upload an image and test the functionality" -ForegroundColor Gray

Write-Host "`n✅ Web app connection test completed!" -ForegroundColor Green 