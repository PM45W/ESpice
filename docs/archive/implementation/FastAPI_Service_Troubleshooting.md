# FastAPI Service Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Virtual Environment Activation Failed

**Error Message:**
```
無法辨識 '\Scripts\Activate.ps1' 詞彙是否為 Cmdlet、函數、指令檔或可執行程式的名稱。
```

**Solution:**
Use the simple version script that doesn't rely on virtual environment activation:

```powershell
./scripts/start-curve-extraction-service-simple.ps1
```

Or use the batch file version:

```cmd
./scripts/start-curve-extraction-service.bat
```

### Issue 2: Requirements.txt Not Found

**Error Message:**
```
ERROR: Could not open requirements file: [Errno 2] No such file or directory: 'requirements.txt'
```

**Solution:**
1. Check if you're in the correct directory
2. Run the diagnostic script first:

```powershell
./scripts/check-curve-extraction-service.ps1
```

3. Make sure the service directory structure is correct:
   ```
   services/
   └── curve-extraction-service/
       ├── main.py
       ├── requirements.txt
       └── Dockerfile
   ```

### Issue 3: Module Import Error

**Error Message:**
```
ERROR: Error loading ASGI app. Could not import module "main".
```

**Solution:**
1. Make sure you're in the correct working directory
2. Check if main.py exists and is valid Python
3. Try the simple version script that sets the working directory properly

### Issue 4: PowerShell Execution Policy

**Error Message:**
```
File cannot be loaded because running scripts is disabled on this system.
```

**Solution:**
1. Use the batch file version instead:
   ```cmd
   ./scripts/start-curve-extraction-service.bat
   ```

2. Or change PowerShell execution policy (run as Administrator):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### Issue 5: Python Not Found

**Error Message:**
```
Error: Python is not installed or not in PATH
```

**Solution:**
1. Install Python 3.8+ from https://python.org
2. Make sure to check "Add Python to PATH" during installation
3. Restart your terminal after installation
4. Verify installation: `python --version`

### Issue 6: Port Already in Use

**Error Message:**
```
Address already in use
```

**Solution:**
1. Check what's using port 8002:
   ```cmd
   netstat -ano | findstr :8002
   ```

2. Kill the process using the port:
   ```cmd
   taskkill /PID <process_id> /F
   ```

3. Or use a different port by modifying the script

## Step-by-Step Troubleshooting

### Step 1: Run Diagnostic Script

```powershell
./scripts/check-curve-extraction-service.ps1
```

This will check:
- Python installation
- Service directory structure
- Virtual environment setup
- Port availability
- Current service status

### Step 2: Try Different Startup Methods

If the main script fails, try these alternatives in order:

1. **Simple PowerShell script:**
   ```powershell
   ./scripts/start-curve-extraction-service-simple.ps1
   ```

2. **Batch file:**
   ```cmd
   ./scripts/start-curve-extraction-service.bat
   ```

3. **Manual startup:**
   ```cmd
   cd services/curve-extraction-service
   python -m venv venv
   venv\Scripts\python.exe -m pip install -r requirements.txt
   venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload
   ```

### Step 3: Verify Service is Running

After starting the service, test it:

```powershell
./scripts/test-curve-extraction-service.ps1
```

Or manually check:
```cmd
curl http://localhost:8002/health
```

### Step 4: Check Service Logs

If the service starts but doesn't work properly, check the logs for errors. Common issues include:

- Missing dependencies
- Import errors
- Configuration issues
- File permission problems

## Manual Setup (If Scripts Fail)

### 1. Create Virtual Environment Manually

```cmd
cd services/curve-extraction-service
python -m venv venv
```

### 2. Install Dependencies

```cmd
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Start Service

```cmd
python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

## Environment-Specific Issues

### Windows Issues

1. **Path Length Limits:**
   - Move project to shorter path (e.g., `C:\ESpice`)
   - Enable long path support in Windows

2. **Antivirus Interference:**
   - Add project directory to antivirus exclusions
   - Temporarily disable real-time protection

3. **User Account Control:**
   - Run terminal as Administrator if needed
   - Check file permissions

### Linux/Mac Issues

1. **Permission Problems:**
   ```bash
   chmod +x scripts/*.ps1
   ```

2. **Python Version:**
   ```bash
   python3 --version
   python3 -m venv venv
   ```

## Testing the Service

### Health Check
```bash
curl http://localhost:8002/health
```

### API Documentation
Open in browser: http://localhost:8002/docs

### Test Color Detection
```bash
curl -X POST "http://localhost:8002/api/curve-extraction/detect-colors" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test_image.png"
```

## Getting Help

If you're still having issues:

1. **Check the logs** for specific error messages
2. **Run the diagnostic script** and share the output
3. **Try manual setup** to isolate the issue
4. **Check system requirements** (Python 3.8+, Windows 10+)
5. **Verify network connectivity** (no firewall blocking localhost:8002)

## Common Solutions Summary

| Issue | Quick Fix |
|-------|-----------|
| Virtual environment activation fails | Use simple script or batch file |
| Requirements.txt not found | Check directory structure |
| Module import error | Verify working directory |
| PowerShell execution policy | Use batch file instead |
| Python not found | Install Python and add to PATH |
| Port in use | Kill existing process or change port |
| Permission denied | Run as Administrator |

## Prevention

To avoid these issues in the future:

1. **Use consistent Python version** (3.8+)
2. **Keep project in short path** (avoid deep nesting)
3. **Run diagnostic script first** before starting service
4. **Use simple script** if main script fails
5. **Check antivirus settings** for false positives 