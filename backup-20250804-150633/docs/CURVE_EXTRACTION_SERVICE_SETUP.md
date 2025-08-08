# Curve Extraction Service Setup Guide

## Overview

The Curve Extraction Service is a FastAPI-based microservice that provides advanced graph extraction capabilities using OpenCV and computer vision techniques. This service is required for the enhanced graph extraction features in the ESpice application.

## Quick Start

### Option 1: Automatic Start (Recommended)

1. **Open the ESpice Application**
2. **Navigate to Graph Extraction Page**
3. **Look for the Service Status Indicator**
4. **Click "🚀 Start Service" button**
5. **Wait for the service to start (usually 10-30 seconds)**

### Option 2: Manual Start

#### Windows Users

**Simple Method (Recommended):**
```bash
# Double-click this file or run in Command Prompt:
scripts\start-curve-extraction-service-simple.bat
```

**PowerShell Method:**
```powershell
# Run in PowerShell:
.\scripts\start-curve-extraction-service.ps1
```

#### macOS/Linux Users

```bash
# Navigate to the service directory
cd services/curve-extraction-service

# Create virtual environment (if not exists)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Start the service
python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

## Prerequisites

### Required Software

1. **Python 3.8 or higher**
   - Download from [python.org](https://python.org)
   - Make sure Python is added to PATH during installation

2. **Git** (for cloning the repository)
   - Download from [git-scm.com](https://git-scm.com)

### System Requirements

- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: 2GB free space for Python packages
- **Network**: Internet connection for downloading dependencies

## Service Details

### Service Information

- **URL**: http://localhost:8002
- **API Documentation**: http://localhost:8002/docs
- **Health Check**: http://localhost:8002/health
- **Port**: 8002 (configurable)

### API Endpoints

- `GET /health` - Service health check
- `POST /api/curve-extraction/detect-colors` - Detect colors in image
- `POST /api/curve-extraction/extract-curves` - Extract curves from image
- `POST /api/curve-extraction/extract-curves-json` - JSON-based curve extraction

## Troubleshooting

### Common Issues

#### 1. Python Not Found
**Error**: `'python' is not recognized as an internal or external command`

**Solution**:
1. Install Python from [python.org](https://python.org)
2. Make sure to check "Add Python to PATH" during installation
3. Restart your command prompt/terminal
4. Verify installation: `python --version`

#### 2. Port 8002 Already in Use
**Error**: `Address already in use`

**Solution**:
1. Find the process using port 8002:
   ```bash
   # Windows
   netstat -ano | findstr :8002
   
   # macOS/Linux
   lsof -i :8002
   ```
2. Kill the process or use a different port:
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8003 --reload
   ```

#### 3. Permission Denied
**Error**: `Permission denied` or `Access denied`

**Solution**:
1. **Windows**: Run Command Prompt as Administrator
2. **macOS/Linux**: Use `sudo` or check file permissions
3. **Firewall**: Allow Python/uvicorn through firewall

#### 4. Dependencies Installation Failed
**Error**: `Failed to install dependencies`

**Solution**:
1. Update pip: `python -m pip install --upgrade pip`
2. Install dependencies manually:
   ```bash
   pip install fastapi uvicorn opencv-python numpy scipy Pillow python-multipart pydantic
   ```

#### 5. Virtual Environment Issues
**Error**: `venv not found` or activation fails

**Solution**:
1. Delete the existing venv folder
2. Create a new virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate it properly:
   ```bash
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

### Service Status Check

You can verify the service is running by:

1. **Browser Check**: Visit http://localhost:8002/health
2. **Command Line**:
   ```bash
   curl http://localhost:8002/health
   ```
3. **Application**: Check the service status indicator in the Graph Extraction page

### Expected Output

When the service starts successfully, you should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8002 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using StatReload
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

## Advanced Configuration

### Environment Variables

You can configure the service using environment variables:

```bash
# Set port (default: 8002)
export PORT=8003

# Set host (default: 0.0.0.0)
export HOST=127.0.0.1

# Set log level (default: info)
export LOG_LEVEL=debug
```

### Custom Configuration

Edit `services/curve-extraction-service/main.py` to modify:

- Color detection ranges
- Processing parameters
- API endpoints
- CORS settings

## Development

### Running in Development Mode

```bash
# Install development dependencies
pip install -r requirements.txt

# Start with auto-reload
python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload --log-level debug
```

### Testing the Service

1. **Health Check**:
   ```bash
   curl http://localhost:8002/health
   ```

2. **API Documentation**:
   - Visit http://localhost:8002/docs
   - Interactive API testing interface

3. **Test Image Upload**:
   - Use the API documentation interface
   - Upload a test image
   - Test color detection and curve extraction

## Integration with ESpice

### Automatic Integration

The ESpice application automatically:

1. **Checks service status** on page load
2. **Shows service indicator** with current status
3. **Provides start button** for automatic service launch
4. **Displays error messages** if service is unavailable

### Manual Integration

If automatic integration fails:

1. Start the service manually using the instructions above
2. Return to the Graph Extraction page
3. Click "Check Service Status" to verify connection
4. Proceed with graph extraction

## Support

### Getting Help

1. **Check the troubleshooting section** above
2. **Review the service logs** for detailed error messages
3. **Test the service manually** using the API documentation
4. **Check system requirements** and prerequisites

### Logs and Debugging

Enable debug logging:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload --log-level debug
```

### Service Monitoring

Monitor the service using:

- **Health endpoint**: http://localhost:8002/health
- **API documentation**: http://localhost:8002/docs
- **Application logs**: Check the terminal/command prompt output

## Security Considerations

### Production Deployment

For production use:

1. **Use HTTPS**: Configure SSL/TLS certificates
2. **Restrict CORS**: Limit allowed origins
3. **Authentication**: Add API key or token authentication
4. **Rate Limiting**: Implement request rate limiting
5. **Firewall**: Configure firewall rules appropriately

### Local Development

For local development:

1. **CORS is enabled** for all origins (`*`)
2. **No authentication** required
3. **Debug logging** enabled
4. **Auto-reload** enabled for development

## Conclusion

The Curve Extraction Service provides powerful graph extraction capabilities for the ESpice application. Follow the setup instructions above to get started, and refer to the troubleshooting section if you encounter any issues.

For additional support, check the application's built-in service status indicator and help modal. 