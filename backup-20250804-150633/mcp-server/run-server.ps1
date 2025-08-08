# Windows PowerShell script to run MCP server
Write-Host "🚀 Starting ESpice MCP Server..." -ForegroundColor Green

# Check if Python is available
try {
    $pythonVersion = python --version
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Check if uvicorn is installed
try {
    $uvicornVersion = python -c "import uvicorn; print(uvicorn.__version__)"
    Write-Host "✅ Uvicorn found: $uvicornVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Uvicorn not found. Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Change to mcp-server directory
Set-Location mcp-server

# Start the server
Write-Host "�� Starting server on http://localhost:8000" -ForegroundColor Cyan
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 