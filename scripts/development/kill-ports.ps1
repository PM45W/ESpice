Write-Host "🔧 ESpice Port Manager" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green

# Common development ports
$ports = @(1420, 8000, 3000, 5173)

foreach ($port in $ports) {
    Write-Host "🔍 Checking port $port..." -ForegroundColor Yellow
    
    $connections = netstat -ano | findstr ":$port"
    
    if ($connections) {
        Write-Host "📍 Found processes using port $port:" -ForegroundColor Cyan
        $connections | ForEach-Object {
            $line = $_.Trim()
            if ($line -match '\s+(\d+)$') {
                $pid = $matches[1]
                Write-Host "   PID: $pid" -ForegroundColor Gray
                
                try {
                    taskkill /PID $pid /F 2>$null
                    Write-Host "   ✅ Killed process $pid" -ForegroundColor Green
                } catch {
                    Write-Host "   ❌ Failed to kill process $pid" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "   ✅ Port $port is free" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "🎯 Port cleanup complete!" -ForegroundColor Magenta
Write-Host "   You can now run: npm run tauri:dev" -ForegroundColor White 