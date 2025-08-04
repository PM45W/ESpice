@echo off
echo Starting Curve Extraction Service...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

echo Python found. Checking service directory...

REM Navigate to the curve extraction service directory
cd /d "%~dp0..\services\curve-extraction-service"

REM Check if main.py exists
if not exist "main.py" (
    echo Error: main.py not found in curve-extraction-service directory
    pause
    exit /b 1
)

echo Service directory found. Setting up virtual environment...

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Error: Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

REM Install uvicorn if not present
python -c "import uvicorn" >nul 2>&1
if errorlevel 1 (
    echo Installing uvicorn...
    python -m pip install uvicorn
)

echo.
echo ========================================
echo Starting FastAPI Curve Extraction Service
echo ========================================
echo Service URL: http://localhost:8002
echo API Docs: http://localhost:8002/docs
echo Health Check: http://localhost:8002/health
echo.
echo Press Ctrl+C to stop the service
echo ========================================
echo.

REM Start the service
python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload

pause 