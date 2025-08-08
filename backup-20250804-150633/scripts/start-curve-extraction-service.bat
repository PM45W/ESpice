@echo off
REM Start Curve Extraction Service (Batch Version)
REM This script starts the FastAPI-based curve extraction service

echo Starting Curve Extraction Service (Batch Version)...

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo Python is available

REM Navigate to the curve extraction service directory
set "SCRIPT_DIR=%~dp0"
set "SERVICE_DIR=%SCRIPT_DIR%..\services\curve-extraction-service"

if not exist "%SERVICE_DIR%" (
    echo Error: Curve extraction service directory not found at %SERVICE_DIR%
    pause
    exit /b 1
)

echo Service directory: %SERVICE_DIR%

REM Check if main.py exists
if not exist "%SERVICE_DIR%\main.py" (
    echo Error: main.py not found
    pause
    exit /b 1
)

echo Found main.py

REM Check if requirements.txt exists
if not exist "%SERVICE_DIR%\requirements.txt" (
    echo Error: requirements.txt not found
    pause
    exit /b 1
)

echo Found requirements.txt

REM Change to service directory
cd /d "%SERVICE_DIR%"
echo Changed working directory to: %CD%

REM Check if virtual environment exists
set "VENV_PATH=%SERVICE_DIR%\venv"
set "VENV_PYTHON=%VENV_PATH%\Scripts\python.exe"

if not exist "%VENV_PATH%" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Error: Failed to create virtual environment
        pause
        exit /b 1
    )
)

if not exist "%VENV_PYTHON%" (
    echo Error: Virtual environment Python not found at %VENV_PYTHON%
    pause
    exit /b 1
)

echo Virtual environment found at: %VENV_PATH%

REM Install dependencies using the virtual environment Python directly
echo Installing dependencies...
"%VENV_PYTHON%" -m pip install -r requirements.txt
if errorlevel 1 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo Dependencies installed successfully

REM Verify uvicorn is installed in the virtual environment
"%VENV_PYTHON%" -m uvicorn --version >nul 2>&1
if errorlevel 1 (
    echo Uvicorn not found in virtual environment. Installing...
    "%VENV_PYTHON%" -m pip install uvicorn
)

REM Start the FastAPI service
echo Starting FastAPI curve extraction service...
echo Service will be available at: http://localhost:8002
echo API documentation at: http://localhost:8002/docs
echo Press Ctrl+C to stop the service

REM Start the service with uvicorn from the virtual environment
"%VENV_PYTHON%" -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload

pause 