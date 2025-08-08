# EPC-Co.com Web Scraper

This document describes the enhanced web scraping functionality for EPC-Co.com, specifically designed to download datasheets and SPICE models for GaN FET devices.

## Overview

The EPC-Co.com scraper is a specialized extension of the main web scraper that handles the specific URL structure and download patterns used by EPC-Co.com. It can:

- Scrape product information from EPC-Co.com product pages
- Download datasheets (PDF files)
- Download SPICE models (.net, .lib files)
- Handle the specific URL pattern: `https://epc-co.com/epc/products/gan-fets-and-ics/{model_number}`
- Extract product specifications and metadata
- Store all data in the project database

## URL Structure

EPC-Co.com uses a predictable URL structure:

```
Base URL: https://epc-co.com
Product URL: https://epc-co.com/epc/products/gan-fets-and-ics/{model_number}
```

Examples:
- EPC2040: `https://epc-co.com/epc/products/gan-fets-and-ics/epc2040`
- EPC2010: `https://epc-co.com/epc/products/gan-fets-and-ics/epc2010`
- EPC2001: `https://epc-co.com/epc/products/gan-fets-and-ics/epc2001`

## API Endpoints

### 1. Scrape Single Product
```http
POST /epc/scrape-product
```

**Parameters:**
- `model_number` (string): The EPC model number (e.g., "epc2040")
- `include_datasheet` (boolean, default: true): Whether to download datasheet
- `include_spice` (boolean, default: true): Whether to download SPICE model

**Example:**
```bash
curl -X POST "http://localhost:8011/epc/scrape-product" \
  -d "model_number=epc2040" \
  -d "include_datasheet=true" \
  -d "include_spice=true"
```

**Response:**
```json
{
  "product": {
    "product_id": "uuid",
    "manufacturer": "epc_co",
    "part_number": "EPC2040",
    "name": "EPC2040 - 100V eGaN FET",
    "description": "Product description...",
    "datasheet_url": "https://...",
    "product_url": "https://epc-co.com/epc/products/gan-fets-and-ics/epc2040",
    "voltage_rating": 100.0,
    "current_rating": 15.0,
    "power_rating": 2.0
  },
  "downloaded_files": {
    "datasheet": "/app/datasheets/EPC2040_datasheet.pdf",
    "spice_model": "/app/datasheets/EPC2040_spice_model.net"
  },
  "message": "Successfully scraped EPC epc2040"
}
```

### 2. Download Files Only
```http
POST /epc/download-files
```

**Parameters:**
- `model_number` (string): The EPC model number
- `include_datasheet` (boolean, default: true): Whether to download datasheet
- `include_spice` (boolean, default: true): Whether to download SPICE model

### 3. Search Products
```http
GET /epc/search-products
```

**Parameters:**
- `query` (string, optional): Search query
- `limit` (integer, default: 50): Maximum number of results

### 4. Get Specific Product
```http
GET /epc/product/{model_number}
```

### 5. Batch Scrape
```http
POST /epc/batch-scrape
```

**Request Body:**
```json
{
  "model_numbers": ["epc2040", "epc2010", "epc2001"],
  "include_datasheets": true,
  "include_spice": true
}
```

## File Downloads

### Datasheets
- **Format**: PDF files
- **Naming**: `{model_number}_datasheet.pdf`
- **Location**: `/app/datasheets/`
- **Example**: `EPC2040_datasheet.pdf`

### SPICE Models
- **Formats**: `.net`, `.lib` files
- **Naming**: `{model_number}_spice_model.{ext}`
- **Location**: `/app/datasheets/`
- **Example**: `EPC2040_spice_model.net`

## Data Extraction

The scraper extracts the following information from EPC product pages:

### Product Information
- **Part Number**: Extracted from URL and page content
- **Name**: Product title/name
- **Description**: Product description
- **Specifications**: Technical specifications table
- **Voltage Rating**: Maximum drain-source voltage
- **Current Rating**: Continuous drain current
- **Power Rating**: Power dissipation

### Download Links
- **Datasheet Links**: Links containing "datasheet" or ".pdf"
- **SPICE Model Links**: Links containing "spice", ".net", ".lib", or "model"

## Error Handling

The scraper includes comprehensive error handling:

- **404 Errors**: Product not found
- **Network Errors**: Connection timeouts and failures
- **Parsing Errors**: HTML structure changes
- **Download Errors**: File download failures

All errors are logged and returned in API responses.

## Rate Limiting

To be respectful to EPC-Co.com servers:
- **Delay between requests**: 1.5 seconds
- **Timeout**: 30 seconds per request
- **Retries**: 3 attempts per request

## Testing

Run the test script to verify functionality:

```bash
cd services/web-scraper
python test_epc_scraper.py
```

The test script will:
1. Test URL structure parsing
2. Test single product scraping
3. Test product search
4. Test batch scraping
5. Test health checks

## Database Storage

All scraped products are stored in the SQLite database with the following schema:

```sql
CREATE TABLE products (
    product_id TEXT PRIMARY KEY,
    manufacturer TEXT NOT NULL,
    part_number TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    specifications TEXT,
    datasheet_url TEXT,
    datasheet_path TEXT,
    product_url TEXT,
    voltage_rating REAL,
    current_rating REAL,
    power_rating REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

## Usage Examples

### Python Client Example
```python
import aiohttp
import asyncio

async def scrape_epc_product():
    async with aiohttp.ClientSession() as session:
        url = "http://localhost:8011/epc/scrape-product"
        params = {
            "model_number": "epc2040",
            "include_datasheet": True,
            "include_spice": True
        }
        
        async with session.post(url, params=params) as response:
            if response.status == 200:
                result = await response.json()
                print(f"Scraped: {result['product']['name']}")
                print(f"Datasheet: {result['downloaded_files']['datasheet']}")
                print(f"SPICE Model: {result['downloaded_files']['spice_model']}")

# Run the example
asyncio.run(scrape_epc_product())
```

### Batch Processing Example
```python
import aiohttp
import asyncio

async def batch_scrape_epc():
    async with aiohttp.ClientSession() as session:
        url = "http://localhost:8011/epc/batch-scrape"
        data = {
            "model_numbers": ["epc2040", "epc2010", "epc2001"],
            "include_datasheets": True,
            "include_spice": True
        }
        
        async with session.post(url, json=data) as response:
            if response.status == 200:
                result = await response.json()
                print(f"Processed: {result['total_processed']}")
                print(f"Successful: {result['successful']}")
                print(f"Failed: {result['failed']}")

# Run the example
asyncio.run(batch_scrape_epc())
```

## Troubleshooting

### Common Issues

1. **Product Not Found (404)**
   - Verify the model number is correct
   - Check if the product exists on EPC-Co.com
   - Ensure the URL structure hasn't changed

2. **Download Failures**
   - Check network connectivity
   - Verify file permissions in `/app/datasheets/`
   - Check if the download links are still valid

3. **Parsing Errors**
   - EPC-Co.com may have updated their HTML structure
   - Update the selectors in `extract_epc_product_info()`
   - Check the logs for specific parsing failures

### Debug Mode

Enable debug logging by setting the log level:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Future Enhancements

- [ ] Support for additional EPC product categories
- [ ] Automatic model number discovery
- [ ] Integration with EPC API (if available)
- [ ] Support for additional file formats
- [ ] Enhanced error recovery mechanisms
- [ ] Performance optimization for large batch operations

## Contributing

When contributing to the EPC scraper:

1. Test with multiple EPC model numbers
2. Verify download functionality
3. Update documentation for any changes
4. Add appropriate error handling
5. Follow the existing code style and patterns 