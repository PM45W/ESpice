# Infineon GaN Scraper

This scraper is designed to download all datasheets from Infineon's GaN transistor page at:
https://www.infineon.com/products/power/gallium-nitride/gallium-nitride-transistor

## Features

- 🚀 Scrapes all GaN transistor products from Infineon's website
- 📄 Automatically downloads datasheets (PDF files)
- 💾 Saves product information and metadata
- 🔍 Extracts specifications (voltage, current, power ratings)
- 📊 Generates detailed reports of scraping results

## Quick Start

### Option 1: Standalone Script (Recommended)

The standalone script doesn't require the web service to be running:

```bash
cd services/web-scraper

# Run with default settings (up to 100 products)
python run_infineon_scraper.py

# Run with custom limit
python run_infineon_scraper.py 50
```

### Option 2: Web Service

If you want to use the web service API:

```bash
# Start the web scraper service
cd services/web-scraper
python main.py

# In another terminal, run the test script
python test_infineon_scraper.py
```

## Output

### Files Generated

The scraper creates the following structure:

```
datasheets/infineon/
├── scraping_results.json          # Complete scraping report
├── product1_datasheet.pdf         # Downloaded datasheets
├── product2_datasheet.pdf
└── ...
```

### Results JSON Structure

```json
{
  "timestamp": "2025-01-XX...",
  "url": "https://www.infineon.com/products/power/gallium-nitride/gallium-nitride-transistor",
  "total_products": 25,
  "datasheets_downloaded": 20,
  "errors": [],
  "products": [
    {
      "part_number": "IGT60R070D1",
      "name": "CoolGaN™ 600 V Enhancement Mode HEMT",
      "description": "Infineon Gallium Nitride (GaN) transistor...",
      "product_url": "https://www.infineon.com/...",
      "datasheet_url": "https://www.infineon.com/.../datasheet.pdf",
      "datasheet_path": "datasheets/infineon/IGT60R070D1_datasheet.pdf",
      "specifications": {
        "voltage_rating": 600,
        "current_rating": 70,
        "package_type": "TO-247"
      },
      "scraped_at": "2025-01-XX..."
    }
  ]
}
```

## API Endpoints (Web Service)

If using the web service, these endpoints are available:

### Start Scraping Job
```bash
POST /infineon/scrape-gan
{
  "max_products": 100,
  "include_datasheets": true
}
```

### Get Scraped Products
```bash
GET /infineon/products?limit=100
```

### Get Specific Product
```bash
GET /infineon/product/{part_number}
```

### Download Specific Datasheet
```bash
POST /infineon/download-datasheet
{
  "part_number": "IGT60R070D1"
}
```

### Monitor Job Status
```bash
GET /jobs/{job_id}
```

## Configuration

### Rate Limiting

The scraper includes built-in delays to be respectful to Infineon's servers:
- 2 seconds between product requests
- 30-second timeout for page requests
- 60-second timeout for datasheet downloads

### Error Handling

The scraper handles various error conditions:
- Network timeouts
- Invalid URLs
- Missing datasheets
- Parsing errors

All errors are logged and included in the final report.

## Troubleshooting

### Common Issues

1. **Service not responding**
   ```bash
   # Check if service is running
   curl http://localhost:8011/health
   ```

2. **No products found**
   - Check if the Infineon website structure has changed
   - Verify internet connection
   - Check if the target URL is still valid

3. **Datasheets not downloading**
   - Some products may not have publicly available datasheets
   - Check if Infineon requires authentication for certain downloads
   - Verify the datasheet URLs are still valid

### Debug Mode

To see more detailed output, you can modify the script to include debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Legal Notice

⚠️ **Important**: This scraper is for educational and research purposes only. Please respect Infineon's terms of service and robots.txt file. The scraper includes reasonable delays to avoid overwhelming their servers.

## Dependencies

Required Python packages:
- `aiohttp` - Async HTTP client
- `pathlib` - File path handling
- `re` - Regular expressions
- `json` - JSON handling
- `asyncio` - Async programming

Install with:
```bash
pip install aiohttp
```

## Contributing

To improve the scraper:

1. Test with different product pages
2. Add more robust error handling
3. Improve datasheet URL detection
4. Add support for other file formats
5. Enhance specification extraction

## License

This scraper is part of the ESpice project and follows the same licensing terms. 