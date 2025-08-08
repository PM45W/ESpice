# ESpice Quick Start Guide

## One-Click Startup

You can now start the entire ESpice application with a single command!

### Windows Users

**Option 1: Double-click the batch file**
```
start-espace.bat
```

**Option 2: Run from PowerShell**
```powershell
.\scripts\start-espace.ps1
```

### Unix/Linux/macOS Users

**Option 1: Run the shell script**
```bash
./start-espace.sh
```

**Option 2: Run from terminal**
```bash
bash start-espace.sh
```

## What the Script Does

The startup script automatically:

1. **Starts the FastAPI Service** - Runs the curve extraction service on port 8002
2. **Waits for Service** - Checks if the service is running and ready
3. **Starts Desktop App** - Launches the Tauri desktop application
4. **Provides Status** - Shows service status and troubleshooting tips

## Manual Startup (if needed)

If you prefer to start components manually:

### Start FastAPI Service Only
```powershell
.\scripts\start-curve-extraction-service.ps1
```

### Start Desktop App Only
```powershell
cd apps\desktop
npm run dev
```

## Troubleshooting

### Service Not Starting
- Check if Python is installed: `python --version`
- Check if the service directory exists: `services\curve-extraction-service`
- Run: `.\scripts\check-curve-extraction-service.ps1`

### Desktop App Not Starting
- Check if Node.js is installed: `node --version`
- Check if dependencies are installed: `cd apps\desktop && npm install`
- Check for port conflicts on 5176

### Connection Refused Error
- Make sure the FastAPI service is running on port 8002
- Check firewall settings
- Run: `.\scripts\test-web-app-connection.ps1`

## Service Status

The desktop app shows service status in the header:
- 🟢 **Green**: Service is available
- 🔴 **Red**: Service is unavailable (click RETRY to reconnect)
- 🟡 **Yellow**: Checking service status

## Ports Used

- **8002**: FastAPI curve extraction service
- **5176**: Desktop app development server

## Files Created

- `start-espace.ps1` - PowerShell startup script
- `start-espace.bat` - Windows batch file
- `start-espace.sh` - Unix shell script
- `QUICK_START.md` - This guide

