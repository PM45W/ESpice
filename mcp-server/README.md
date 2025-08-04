# ESpice MCP Server

Model Context Protocol Server for Automated SPICE Model Generation from Semiconductor Datasheets.

## Features

- **PDF Processing**: Extract text, tables, and parameters from semiconductor datasheets
- **Curve Extraction**: Extract I-V curves from datasheet graphs using OpenCV
- **OCR Integration**: Tesseract-based text recognition for table extraction
- **SPICE Model Generation**: Generate ASM-HEMT, MVSG, and Si-MOSFET models
- **Parameter Fitting**: Automatic parameter fitting from extracted data
- **Model Validation**: Validate generated models against datasheet specifications

## Supported Models

1. **ASM-HEMT**: Advanced SPICE Model for GaN HEMT devices
2. **MVSG**: Multi-Version Surface Potential Model for SiC MOSFET
3. **Si-MOSFET**: Standard Silicon MOSFET Model

## API Endpoints

### Health Check
- `GET /health` - Server health status
- `GET /` - Basic health check

### Models
- `GET /api/models` - Get available SPICE model types

### PDF Processing
- `POST /api/process-pdf` - Process PDF and extract data
- `POST /api/extract-curves` - Extract I-V curves from PDF

### SPICE Generation
- `POST /api/generate-spice` - Generate SPICE model
- `POST /api/fit-parameters` - Fit parameters from extracted data
- `POST /api/validate-model` - Validate model against data

## Local Development

### Prerequisites

1. **Python 3.11+**
2. **Tesseract OCR**
   - Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
   - Linux: `sudo apt-get install tesseract-ocr`
   - macOS: `brew install tesseract`

### Installation

1. **Clone and setup**:
```bash
cd mcp-server
pip install -r requirements.txt
```

2. **Configure Tesseract** (Windows):
```bash
# Update the path in main.py if needed
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

3. **Run locally**:
```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

4. **Test endpoints**:
```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/models
```

## Railway Deployment

### Prerequisites

1. **Railway Account**: Sign up at https://railway.app
2. **Railway CLI**: Install with `npm install -g @railway/cli`

### Deployment Steps

1. **Login to Railway**:
```bash
railway login
```

2. **Initialize project** (if new):
```bash
railway init
```

3. **Deploy**:
```bash
# Windows
.\deploy.ps1

# Or manually
railway up
```

4. **Get deployment URL**:
```bash
railway domain
```

### Environment Variables

Set these in Railway dashboard or via CLI:

```bash
railway variables set MCP_SERVER_URL=https://your-app.railway.app
railway variables set LOG_LEVEL=INFO
railway variables set ENABLE_DEBUG=false
```

## Docker Deployment

### Build Image
```bash
docker build -t espice-mcp-server .
```

### Run Container
```bash
docker run -p 8000:8000 espice-mcp-server
```

## Integration with Desktop App

### Update Tauri Backend

Set the MCP server URL in your desktop app:

```rust
// In src-tauri/src/main.rs
let mcp_url = std::env::var("MCP_SERVER_URL")
    .unwrap_or_else(|_| "https://your-app.railway.app".to_string());
```

### Test Integration

1. **Start desktop app**:
```bash
npm run tauri:dev
```

2. **Upload a datasheet** and check console for MCP server communication

## API Usage Examples

### Process PDF
```bash
curl -X POST http://localhost:8000/api/process-pdf \
  -F "file=@datasheet.pdf"
```

### Generate SPICE Model
```bash
curl -X POST http://localhost:8000/api/generate-spice \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "TEST_DEVICE",
    "device_type": "GaN-HEMT",
    "model_type": "asm_hemt",
    "parameters": {"voff": 2.5, "rd0": "12m"}
  }'
```

### Fit Parameters
```bash
curl -X POST http://localhost:8000/api/fit-parameters \
  -H "Content-Type: application/json" \
  -d '{
    "extracted_data": {"parameters": {"v_th": 2.5, "r_ds_on": 0.1}},
    "model_type": "asm_hemt"
  }'
```

## Monitoring and Logs

### Railway Logs
```bash
railway logs
```

### Health Check
```bash
curl https://your-app.railway.app/health
```

## Troubleshooting

### Common Issues

1. **Tesseract not found**:
   - Ensure Tesseract is installed and path is correct
   - Check `pytesseract.pytesseract.tesseract_cmd` in main.py

2. **OpenCV errors**:
   - Install system dependencies: `libgl1-mesa-glx`, `libglib2.0-0`
   - Use Docker for consistent environment

3. **Memory issues**:
   - Large PDFs may require more memory
   - Consider processing in chunks

4. **Railway deployment fails**:
   - Check Dockerfile and requirements.txt
   - Verify Railway project configuration

### Debug Mode

Enable debug logging:
```bash
railway variables set LOG_LEVEL=DEBUG
railway variables set ENABLE_DEBUG=true
```

## Performance Optimization

- **Image processing**: Adjust zoom levels in curve extraction
- **OCR accuracy**: Use higher resolution for table extraction
- **Memory usage**: Process large PDFs in chunks
- **Response time**: Implement caching for repeated requests

## Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes
4. Test thoroughly
5. Submit pull request

## License

MIT License - see LICENSE file for details. 