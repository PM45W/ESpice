@echo off
echo Starting ESpice Application...
echo.

REM Check if PowerShell is available
powershell -Command "Get-Host" >nul 2>&1
if errorlevel 1 (
    echo Error: PowerShell is not available on this system.
    pause
    exit /b 1
)

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "scripts\start-espace.ps1"

REM Keep the window open if there was an error
if errorlevel 1 (
    echo.
    echo Press any key to exit...
    pause >nul
)

