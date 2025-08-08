# Web App FastAPI Integration Guide

## Overview

This guide explains how to use the ESpice web application with the FastAPI curve extraction service. The web app has been updated to remove all mock data and now requires the FastAPI service to be running for any functionality.

## Architecture

```
Web App (React/Vite) → HTTP/JSON → FastAPI Service (Python/OpenCV)
```

**Components:**
- **Frontend**: React application with TypeScript and Tailwind CSS
- **Backend**: FastAPI service with OpenCV for image processing
- **Communication**: HTTP/JSON API calls between frontend and backend

## Prerequisites

1. **Python 3.8+** installed and in PATH
2. **Node.js 16+** installed
3. **FastAPI service** running on port 8002
4. **Web app** running on port 3000

## Setup Instructions

### Step 1: Start the FastAPI Service

```powershell
# From the ESpice root directory
./scripts/start-curve-extraction-service-simple.ps1
```

**Alternative methods if the above fails:**
```powershell
# Simple PowerShell version
./scripts/start-curve-extraction-service-simple.ps1

# Batch file version (for Windows users)
./scripts/start-curve-extraction-service.bat

# Manual setup
cd services/curve-extraction-service
python -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

### Step 2: Verify Service is Running

```powershell
# Test service availability
./scripts/test-web-app-connection.ps1

# Or manually check
curl http://localhost:8002/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "service": "curve-extraction-service",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Step 3: Start the Web Application

```bash
# Navigate to web app directory
cd website

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

The web app will be available at: http://localhost:3000

### Step 4: Access Graph Extraction

1. Open browser and navigate to: http://localhost:3000
2. Click on "Graph Extraction" in the navigation
3. Check the service status indicator (should show green "available")

## Using the Web Application

### Service Status Indicator

The web app includes a real-time service status indicator that shows:

- **🔄 Checking**: Service availability is being verified
- **✅ Available**: FastAPI service is running and healthy
- **❌ Unavailable**: Service is not running or not accessible

### Upload and Process Images

1. **Upload Image**:
   - Click "Select Image" or drag and drop
   - Supported formats: PNG, JPG, JPEG
   - Image should contain clear, colored curves

2. **Detect Colors**:
   - Click "Detect Colors" button
   - Service will analyze the image and identify colors
   - Select colors you want to extract

3. **Configure Extraction**:
   - Set X-axis range (x_min, x_max)
   - Set Y-axis range (y_min, y_max)
   - Choose scale types (linear/log)
   - Set minimum point count

4. **Extract Curves**:
   - Click "Extract Curves" button
   - Service will process the image and extract curve data
   - Results will be displayed in the graph viewer

5. **Export Results**:
   - Click "Download CSV" to export curve data
   - Data includes X, Y coordinates and color information

## API Endpoints Used

### Health Check
```
GET http://localhost:8002/health
```

### Color Detection
```
POST http://localhost:8002/api/curve-extraction/detect-colors
Content-Type: multipart/form-data
Body: file (image file)
```

### Curve Extraction
```
POST http://localhost:8002/api/curve-extraction/extract-curves
Content-Type: multipart/form-data
Body: 
  - file (image file)
  - selected_colors (JSON string)
  - x_min, x_max, y_min, y_max (float)
  - x_scale, y_scale (float)
  - x_scale_type, y_scale_type (string)
  - min_size (int)
```

## Error Handling

### Service Unavailable
- **Error**: "FastAPI curve extraction service is not available"
- **Solution**: Start the FastAPI service using the provided scripts

### Network Errors
- **Error**: Connection timeout or network errors
- **Solution**: Check if service is running on port 8002

### Processing Errors
- **Error**: Image processing or extraction failures
- **Solution**: Check image quality and format

### CORS Issues
- **Error**: Cross-origin request blocked
- **Solution**: FastAPI service includes CORS middleware for localhost

## Troubleshooting

### Service Won't Start
1. Check Python installation: `python --version`
2. Verify dependencies: `pip list | findstr opencv`
3. Check port availability: `netstat -an | findstr :8002`
4. Run diagnostic script: `./scripts/check-curve-extraction-service.ps1`

### Web App Can't Connect
1. Verify service is running: `curl http://localhost:8002/health`
2. Check browser console for errors
3. Test API endpoints manually
4. Run connection test: `./scripts/test-web-app-connection.ps1`

### Image Processing Issues
1. Check image format (PNG, JPG, JPEG)
2. Verify image quality (clear curves, good contrast)
3. Review color selection (avoid background colors)
4. Check configuration parameters

## Development

### Web App Structure
```
website/
├── src/
│   ├── pages/
│   │   └── GraphExtractionPage.tsx    # Main graph extraction page
│   ├── components/ui/                 # UI components
│   ├── hooks/                         # Custom hooks
│   └── styles/                        # CSS styles
├── package.json
└── vite.config.ts
```

### Key Components

#### WebCurveExtractionService
- Handles communication with FastAPI service
- Manages service availability checking
- Provides error handling and logging

#### GraphExtractionPage
- Main UI component for graph extraction
- Handles file upload and image processing
- Displays results and provides export functionality

### Adding New Features

1. **New API Endpoints**: Add methods to `WebCurveExtractionService`
2. **UI Components**: Create new components in `components/ui/`
3. **Styling**: Add styles to `styles/` directory
4. **Configuration**: Update `vite.config.ts` for new features

## Performance Optimization

### Frontend
- Image compression before upload
- Lazy loading of components
- Efficient state management
- Optimized re-renders

### Backend
- Async processing for large images
- Caching of processed results
- Memory management for image data
- Parallel processing for multiple colors

## Security Considerations

### Local Development
- Service runs on localhost only
- No external network access required
- CORS configured for localhost origins

### Production Deployment
- Use HTTPS for all communications
- Implement proper authentication
- Rate limiting for API endpoints
- Input validation and sanitization

## Monitoring and Logging

### Frontend Logging
- Console logs for debugging
- Error tracking for user issues
- Performance monitoring

### Backend Logging
- Request/response logging
- Error tracking and reporting
- Performance metrics
- Service health monitoring

## Best Practices

### Image Preparation
- Use high-resolution images
- Ensure good contrast between curves and background
- Avoid overlapping curves
- Use consistent color schemes

### Configuration
- Start with default settings
- Adjust parameters incrementally
- Test with known data
- Document custom settings

### Error Handling
- Provide clear error messages
- Include troubleshooting steps
- Log errors for debugging
- Graceful degradation when possible

## Support

For issues and questions:

1. **Check the logs** for specific error messages
2. **Run diagnostic scripts** to identify problems
3. **Test API endpoints** manually
4. **Review troubleshooting guide**
5. **Check system requirements**

## Conclusion

The web app now provides a complete, production-ready interface for graph extraction with real data processing capabilities. The integration with the FastAPI service ensures high-quality results and reliable performance. 