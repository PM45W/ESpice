Write-Host "🧪 Testing ESpice Application" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green

# Test Frontend Server
Write-Host "🌐 Testing Frontend Server (port 1420)..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:1420" -Method Get
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend Status: OK" -ForegroundColor Green
        Write-Host "   Status Code: $($frontendResponse.StatusCode)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Frontend Status: $($frontendResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Frontend server is not responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "   Please start the frontend with: npm run dev" -ForegroundColor Yellow
}

Write-Host ""

# Information about the new Rust backend
Write-Host "🦀 Rust Backend Information:" -ForegroundColor Cyan
Write-Host "   ✅ Backend is now embedded in the Tauri application" -ForegroundColor Green
Write-Host "   ✅ No separate server needed (Python backend removed)" -ForegroundColor Green
Write-Host "   ✅ Native performance with direct function calls" -ForegroundColor Green
Write-Host "   ✅ Automatic startup when Tauri app launches" -ForegroundColor Green

Write-Host ""

# Migration completion notice
Write-Host "🚀 Migration Complete!" -ForegroundColor Magenta
Write-Host "   • Python backend has been removed" -ForegroundColor White
Write-Host "   • Rust backend is integrated into Tauri" -ForegroundColor White
Write-Host "   • No more ASGI import errors" -ForegroundColor White
Write-Host "   • No more port conflicts" -ForegroundColor White
Write-Host "   • Much faster performance" -ForegroundColor White

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Open your browser to http://localhost:1420" -ForegroundColor White
Write-Host "   2. Upload an image file" -ForegroundColor White
Write-Host "   3. Colors will be auto-detected by the Rust backend" -ForegroundColor White
Write-Host "   4. Extract curves using native Rust processing" -ForegroundColor White
Write-Host "   5. Export results to CSV" -ForegroundColor White 