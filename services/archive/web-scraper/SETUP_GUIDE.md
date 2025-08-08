# EPC-Co.com Scraper Setup Guide

This guide will help you set up and test the EPC-Co.com web scraper functionality.

## Prerequisites

1. **Python 3.8+** installed
2. **Node.js** and **npm** (for the frontend)
3. **Git** (to clone the repository)

## Quick Start

### 1. Install Backend Dependencies

```bash
cd services/web-scraper
pip install -r requirements.txt
```

### 2. Start the Web Scraper Service

```bash
# Option 1: Use the start script
python start_service.py

# Option 2: Direct uvicorn command
uvicorn main:app --host 0.0.0.0 --port 8011 --reload
```

The service will be available at: `http://localhost:8011`

### 3. Test the Backend API

```bash
# Test health check
curl http://localhost:8011/health

# Test EPC product scraping
curl -X POST "http://localhost:8011/epc/scrape-product" \
  -d "model_number=epc2040" \
  -d "include_datasheet=true" \
  -d "include_spice=true"

# Test batch scraping
curl -X POST "http://localhost:8011/epc/batch-scrape" \
  -H "Content-Type: application/json" \
  -d '{"model_numbers": ["epc2040", "epc2010"]}'
```

### 4. Start the Frontend

```bash
# In a new terminal, from the project root
cd apps/desktop
npm install
npm run dev
```

### 5. Test the Frontend

1. Open your browser to the frontend URL (usually `http://localhost:1420`)
2. Navigate to the Products page
3. Click "Show EPC Interface" to reveal the EPC scraper
4. Try scraping a single model (e.g., `epc2040`)
5. Try batch scraping multiple models (e.g., `epc2040, epc2010, epc2001`)

## API Endpoints

### Health Check
- **GET** `/health` - Check if the service is running

### EPC Product Scraping
- **POST** `/epc/scrape-product` - Scrape a single EPC product
- **POST** `/epc/download-files` - Download files for an existing product
- **GET** `/epc/search-products` - Search EPC products
- **GET** `/epc/product/{model_number}` - Get a specific EPC product
- **POST** `/epc/batch-scrape` - Batch scrape multiple EPC products

### General Scraping
- **POST** `/scrape` - Start a general scraping job
- **GET** `/products` - Get all scraped products
- **GET** `/jobs` - List scraping jobs
- **GET** `/jobs/{job_id}` - Get job status

## Example Usage

### Python Client Example

```python
import asyncio
import aiohttp

async def test_epc_scraper():
    async with aiohttp.ClientSession() as session:
        # Scrape EPC2040
        url = "http://localhost:8011/epc/scrape-product"
        params = {
            "model_number": "epc2040",
            "include_datasheet": "true",
            "include_spice": "true"
        }
        
        async with session.post(url, params=params) as response:
            if response.status == 200:
                result = await response.json()
                print(f"Successfully scraped: {result['product']['name']}")
                print(f"Datasheet: {result['downloaded_files']['datasheet']}")
                print(f"SPICE Model: {result['downloaded_files']['spice_model']}")

# Run the test
asyncio.run(test_epc_scraper())
```

### JavaScript/Frontend Example

```javascript
// Scrape a single EPC product
const scrapeEPC = async (modelNumber) => {
  const response = await fetch(`http://localhost:8011/epc/scrape-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      model_number: modelNumber,
      include_datasheet: 'true',
      include_spice: 'true'
    })
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log('Scraped product:', result.product);
    console.log('Downloaded files:', result.downloaded_files);
  }
};

// Usage
scrapeEPC('epc2040');
```

## Troubleshooting

### Common Issues

1. **Connection Refused (ERR_CONNECTION_REFUSED)**
   - Make sure the web scraper service is running on port 8011
   - Check if the port is already in use: `lsof -i :8011`
   - Kill any existing processes: `kill -9 <PID>`

2. **Module Not Found Errors**
   - Install dependencies: `pip install -r requirements.txt`
   - Check Python version: `python --version`

3. **CORS Errors**
   - The service includes CORS middleware, but if you're still getting errors, check the browser console
   - Make sure the frontend is making requests to the correct URL

4. **Download Failures**
   - Check if the `/app/datasheets/` directory exists and is writable
   - Verify network connectivity to EPC-Co.com
   - Check the service logs for specific error messages

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
export PYTHONPATH=.
export LOG_LEVEL=DEBUG
python start_service.py
```

### Logs

The service logs to stdout. You can redirect logs to a file:

```bash
python start_service.py > scraper.log 2>&1
```

## File Structure

```
services/web-scraper/
├── main.py                    # Main FastAPI application
├── start_service.py          # Service startup script
├── test_epc_scraper.py       # Test script
├── example_epc_usage.py      # Usage examples
├── EPC_SCRAPER_README.md     # Detailed documentation
├── SETUP_GUIDE.md           # This file
├── requirements.txt          # Python dependencies
└── datasheets/              # Downloaded files (created automatically)
```

## Next Steps

1. **Test with different EPC models**: Try scraping various EPC models to ensure compatibility
2. **Integrate with existing pipeline**: Connect the scraped datasheets to the PDF processing pipeline
3. **Add error handling**: Implement more robust error handling and retry mechanisms
4. **Performance optimization**: Optimize for large batch operations
5. **Add monitoring**: Implement logging and monitoring for production use

## Support

If you encounter issues:

1. Check the logs for error messages
2. Verify the EPC-Co.com website structure hasn't changed
3. Test with a simple model number first (e.g., `epc2040`)
4. Ensure all dependencies are installed correctly 