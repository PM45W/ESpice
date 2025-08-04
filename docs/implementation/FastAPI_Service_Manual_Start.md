# FastAPI Service Manual Start Guide

## Quick Fix for PowerShell Script Issues

If the PowerShell scripts are having issues, here's how to start the FastAPI service manually:

## Method 1: Manual Commands (Recommended)

Open a **new PowerShell window** and run these commands step by step:

```powershell
# 1. Navigate to the ESpice root directory
cd C:\Users\SYLGP\ESpice

# 2. Navigate to the service directory
cd services\curve-extraction-service

# 3. Check if Python is available
python --version

# 4. Create virtual environment (if it doesn't exist)
python -m venv venv

# 5. Activate virtual environment
venv\Scripts\Activate.ps1

# 6. Install dependencies
pip install -r requirements.txt

# 7. Start the service
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

## Method 2: Using Batch File

If PowerShell continues to have issues, use the batch file:

```cmd
# Run this from the ESpice root directory
scripts\start-curve-extraction-service-simple.bat
```

## Method 3: Direct Python Execution

If virtual environment issues persist:

```powershell
# Navigate to service directory
cd services\curve-extraction-service

# Install dependencies globally (not recommended but works)
pip install fastapi uvicorn opencv-python numpy pillow

# Start service directly
python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

## Verification

After starting the service, verify it's working:

1. **Check service health**: http://localhost:8002/health
2. **View API docs**: http://localhost:8002/docs
3. **Test in desktop app**: The service status should show green

## Troubleshooting

### Common Issues:

1. **Port 8002 already in use**:
   ```powershell
   # Kill process using port 8002
   netstat -ano | findstr :8002
   taskkill /PID <PID> /F
   ```

2. **Virtual environment activation fails**:
   ```powershell
   # Use direct path
   .\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload
   ```

3. **Dependencies not found**:
   ```powershell
   # Reinstall dependencies
   pip install --upgrade -r requirements.txt
   ```

4. **Permission issues**:
   - Run PowerShell as Administrator
   - Or use the batch file method

## Expected Output

When successful, you should see:

```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8002 (Press CTRL+C to quit)
```

## Next Steps

Once the FastAPI service is running:

1. **Desktop app is already running** on http://localhost:5178/
2. **Navigate to Graph Extraction page**
3. **Check service status** (should be green)
4. **Test curve extraction** with an image

## Alternative: Use the Desktop App Only

If the FastAPI service continues to have issues, the desktop app can still be used for:
- File management
- UI testing
- Component development

The curve extraction functionality will show "service unavailable" but the app will still run. 