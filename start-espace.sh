#!/bin/bash

echo "🚀 Starting ESpice Application..."
echo "====================================="

# Get the root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Root directory: $ROOT_DIR"

# Check if we're in the right directory
if [ ! -d "$ROOT_DIR/apps/desktop" ]; then
    echo "❌ Error: Desktop app directory not found. Please run this script from the ESpice root directory."
    exit 1
fi

# Step 1: Start FastAPI Service in Background
echo ""
echo "🔧 Step 1: Starting FastAPI Service..."

FASTAPI_SCRIPT="$ROOT_DIR/scripts/start-curve-extraction-service.ps1"

if [ -f "$FASTAPI_SCRIPT" ]; then
    echo "Starting FastAPI service in background..."
    
    # Start the service in background
    powershell -ExecutionPolicy Bypass -File "$FASTAPI_SCRIPT" &
    FASTAPI_PID=$!
    
    # Wait for service to start
    echo "Waiting for FastAPI service to start..."
    sleep 8
    
    # Check if service is running
    MAX_ATTEMPTS=5
    ATTEMPT=0
    SERVICE_READY=false
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ] && [ "$SERVICE_READY" = false ]; do
        if curl -s http://localhost:8002/health > /dev/null 2>&1; then
            echo "✅ FastAPI service is running!"
            SERVICE_READY=true
        else
            ATTEMPT=$((ATTEMPT + 1))
            echo "⏳ Waiting for service... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
            sleep 2
        fi
    done
    
    if [ "$SERVICE_READY" = false ]; then
        echo "⚠️  FastAPI service may not be ready yet. Desktop app will retry connection."
    fi
else
    echo "❌ FastAPI service script not found at: $FASTAPI_SCRIPT"
    exit 1
fi

# Step 2: Start Desktop App
echo ""
echo "🖥️  Step 2: Starting Desktop App..."

DESKTOP_DIR="$ROOT_DIR/apps/desktop"

if [ -d "$DESKTOP_DIR" ]; then
    cd "$DESKTOP_DIR"
    echo "Changed to desktop directory: $(pwd)"
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        echo "Installing desktop app dependencies..."
        npm install
        if [ $? -ne 0 ]; then
            echo "❌ Error: Failed to install dependencies"
            exit 1
        fi
    fi
    
    echo "Starting desktop app in development mode..."
    echo "The app will open in a new window."
    echo "Service status will be shown in the app interface."
    
    # Start the desktop app
    npm run dev
else
    echo "❌ Error: Desktop app directory not found at $DESKTOP_DIR"
    exit 1
fi

echo ""
echo "✅ ESpice startup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Wait for the Tauri window to open"
echo "2. Check the service status indicator (should be green)"
echo "3. Navigate to Graph Extraction page"
echo "4. Upload an image and test curve extraction"
echo ""
echo "🔧 Troubleshooting:"
echo "- If service status is red, check FastAPI service logs"
echo "- If app doesn't open, check console for errors"
echo "- Run: ./scripts/test-web-app-connection.ps1 to test service"
echo "- Run: ./scripts/check-curve-extraction-service.ps1 to check service status"

