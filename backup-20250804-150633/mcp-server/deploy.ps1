# ESpice MCP Server Deployment Script

Write-Host "🚀 Deploying ESpice MCP Server to Railway..." -ForegroundColor Green

# Check if Railway CLI is installed
try {
    $railwayVersion = railway --version
    Write-Host "✅ Railway CLI found: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found. Installing..." -ForegroundColor Red
    Write-Host "Please install Railway CLI from: https://docs.railway.app/develop/cli" -ForegroundColor Yellow
    Write-Host "Or run: npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

# Check if logged in to Railway
try {
    $user = railway whoami
    Write-Host "✅ Logged in as: $user" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Railway. Please run: railway login" -ForegroundColor Red
    exit 1
}

# Check if project exists
try {
    $project = railway project
    Write-Host "✅ Using project: $project" -ForegroundColor Green
} catch {
    Write-Host "❌ No project selected. Please run: railway link" -ForegroundColor Red
    Write-Host "Or create a new project with: railway init" -ForegroundColor Yellow
    exit 1
}

# Build and deploy
Write-Host "📦 Building and deploying..." -ForegroundColor Blue

try {
    railway up
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    
    # Get the deployment URL
    $url = railway domain
    Write-Host "🌐 Your MCP server is available at: $url" -ForegroundColor Cyan
    
    # Update environment variables
    Write-Host "🔧 Setting environment variables..." -ForegroundColor Blue
    railway variables set MCP_SERVER_URL=$url
    
    Write-Host "✅ Environment variables updated!" -ForegroundColor Green
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Update your desktop app to use: $url" -ForegroundColor White
    Write-Host "2. Test the endpoints: $url/health" -ForegroundColor White
    Write-Host "3. Monitor logs: railway logs" -ForegroundColor White
    
} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 MCP Server deployment complete!" -ForegroundColor Green 