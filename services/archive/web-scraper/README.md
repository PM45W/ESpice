# Web Scraper Service

The Web Scraper Service automatically scrapes GaN (Gallium Nitride) product information and datasheets from semiconductor manufacturer websites. It extracts product details, downloads datasheets, and stores everything in a database for easy access and integration with the ESpice platform.

## Features

### 🏭 **Manufacturer Support**
- **Infineon**: Power GaN transistors and modules
- **Wolfspeed**: GaN power devices and RF transistors
- **Qorvo**: GaN power amplifiers and transistors
- **NXP**: GaN power devices
- **Texas Instruments**: GaN drivers and power devices
- **STMicroelectronics**: GaN power devices
- **ROHM**: GaN power transistors
- **Toshiba**: GaN power devices
- **Renesas**: GaN power solutions
- **Custom**: User-defined manufacturer configurations

### 📦 **Product Categories**
- **GaN Power**: Power transistors and switches
- **GaN RF**: RF transistors and amplifiers
- **GaN Driver**: Gate drivers and controllers
- **GaN Module**: Power modules and packages
- **GaN Discrete**: Discrete power devices
- **GaN IC**: Integrated circuits

### 🔍 **Scraping Capabilities**
- **Product Information**: Part numbers, descriptions, specifications
- **Datasheet Downloads**: Automatic PDF download and storage
- **Image Extraction**: Product images and diagrams
- **Specification Parsing**: Electrical and mechanical specs
- **Price Information**: Price ranges and availability
- **Package Information**: Package types and dimensions

### 💾 **Data Storage**
- **SQLite Database**: Local storage for products and jobs
- **File Storage**: Organized datasheet storage
- **Metadata Tracking**: Download dates, file hashes, URLs
- **Version Control**: Track updates and changes

## API Endpoints

### Health
- `GET /health` — Service health check

### Scraping Jobs
- `POST /scrape` — Start a new scraping job
- `GET /jobs/{job_id}` — Get job status and results
- `GET /jobs` — List all scraping jobs
- `DELETE /jobs/{job_id}` — Cancel a scraping job

### Products
- `GET /products` — Get scraped products
- `GET /products/{product_id}` — Get specific product
- `POST /search` — Search products by query

### Configuration
- `GET /manufacturers` — Get supported manufacturers
- `GET /categories` — Get product categories

## Example Usage

### 1. Start Scraping Job
```bash
curl -X POST http://localhost:8011/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "infineon",
    "category": "gan_power",
    "keywords": ["GaN", "power", "transistor"],
    "max_products": 50,
    "include_datasheets": true
  }'
```

### 2. Check Job Status
```bash
curl http://localhost:8011/jobs/{job_id}
```

### 3. Get Scraped Products
```bash
curl "http://localhost:8011/products?manufacturer=infineon&limit=20"
```

### 4. Search Products
```bash
curl -X POST http://localhost:8011/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "650V GaN transistor",
    "manufacturer": "wolfspeed"
  }'
```

### 5. Get Supported Manufacturers
```bash
curl http://localhost:8011/manufacturers
```

## Database Schema

### Products Table
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
    datasheet_hash TEXT,
    product_url TEXT,
    image_url TEXT,
    price_range TEXT,
    availability TEXT,
    package_type TEXT,
    voltage_rating REAL,
    current_rating REAL,
    power_rating REAL,
    frequency_range TEXT,
    temperature_range TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### Scraping Jobs Table
```sql
CREATE TABLE scraping_jobs (
    job_id TEXT PRIMARY KEY,
    manufacturer TEXT NOT NULL,
    category TEXT,
    keywords TEXT,
    max_products INTEGER,
    include_datasheets BOOLEAN,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    total_products INTEGER DEFAULT 0,
    scraped_products INTEGER DEFAULT 0,
    downloaded_datasheets INTEGER DEFAULT 0,
    errors TEXT
);
```

### Datasheets Table
```sql
CREATE TABLE datasheets (
    datasheet_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    file_hash TEXT,
    download_url TEXT,
    download_date TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products (product_id)
);
```

## Scraping Configuration

### Manufacturer Configurations
Each manufacturer has specific configuration for:
- **Base URL**: Main website URL
- **Search URL**: Product listing page
- **Selectors**: CSS selectors for product elements
- **Delay**: Time between requests to avoid rate limiting
- **Timeout**: Request timeout settings

### Example Configuration
```python
ScrapingConfig(
    manufacturer=Manufacturer.INFINEON,
    base_url="https://www.infineon.com",
    search_url="https://www.infineon.com/cms/en/product/power/gallium-nitride-gan/",
    product_selector=".product-item",
    datasheet_selector="a[href*='datasheet']",
    delay_between_requests=2.0,
    max_retries=3,
    timeout=30
)
```

## File Organization

### Directory Structure
```
/app/
├── datasheets/
│   ├── infineon/
│   │   ├── IGT60R190D1_DS_v01_00_en.pdf
│   │   └── IGT60R190D1_DS_v01_00_en.json
│   ├── wolfspeed/
│   │   ├── C3M0065090D_DS_v01_00_en.pdf
│   │   └── C3M0065090D_DS_v01_00_en.json
│   └── ...
├── scraped_data.db
└── logs/
    ├── scraping.log
    └── errors.log
```

### Datasheet Storage
- **Organized by manufacturer**: Separate folders for each manufacturer
- **Metadata files**: JSON files with extraction metadata
- **File naming**: Part number + description + version
- **Hash tracking**: MD5/SHA256 hashes for file integrity

## Integration

### With SPICE Service
The web scraper integrates with the SPICE service to:
- Provide datasheets for model extraction
- Supply product specifications for parameter validation
- Enable automatic model generation from scraped data

### With PDK Checker
The PDK checker can validate:
- Scraped product specifications against PDK rules
- Ensure compliance with foundry requirements
- Validate datasheet information

### With Version Control
The version control service can:
- Track datasheet versions and updates
- Maintain scraping history and changes
- Version control scraped product data

### With Test Correlation
The test correlation service can:
- Compare scraped specifications with test data
- Validate datasheet claims against measurements
- Provide correlation analysis for scraped products

## Configuration

### Environment Variables
```bash
# Service configuration
PYTHONUNBUFFERED=1
DATABASE_PATH=/app/scraped_data.db
DATASHEETS_PATH=/app/datasheets

# Scraping configuration
DEFAULT_DELAY=2.0
MAX_RETRIES=3
REQUEST_TIMEOUT=30
MAX_CONCURRENT_REQUESTS=5

# Browser configuration (for Selenium)
CHROMIUM_PATH=/usr/bin/chromium
CHROMEDRIVER_PATH=/usr/bin/chromedriver
```

### Docker Configuration
```yaml
web-scraper:
  build: ./services/web-scraper
  ports:
    - "8011:8011"
  environment:
    - PYTHONUNBUFFERED=1
  volumes:
    - ./datasheets:/app/datasheets
    - ./scraped_data:/app/scraped_data
  networks:
    - espice-network
```

## Development

### Local Development
```bash
cd services/web-scraper
pip install -r requirements.txt
python main.py
```

### Testing
```bash
# Test scraping
curl -X POST http://localhost:8011/scrape \
  -H "Content-Type: application/json" \
  -d '{"manufacturer": "infineon", "max_products": 5}'

# Test product retrieval
curl http://localhost:8011/products?limit=10
```

## Advanced Features

### Intelligent Scraping
- **Rate Limiting**: Respect website rate limits
- **Retry Logic**: Automatic retry on failures
- **Error Handling**: Comprehensive error tracking
- **Progress Tracking**: Real-time job progress

### Data Quality
- **Validation**: Validate scraped data quality
- **Deduplication**: Remove duplicate products
- **Normalization**: Standardize data formats
- **Enrichment**: Add missing information

### Monitoring
- **Job Monitoring**: Track scraping job progress
- **Performance Metrics**: Monitor scraping performance
- **Error Tracking**: Track and analyze errors
- **Data Quality Metrics**: Monitor data quality

## Future Enhancements

### Extended Manufacturer Support
- **More Manufacturers**: Additional semiconductor companies
- **Regional Sites**: Localized manufacturer websites
- **Distributor Sites**: Major distributor websites
- **Specialty Manufacturers**: Niche GaN manufacturers

### Advanced Scraping
- **JavaScript Rendering**: Handle dynamic content
- **CAPTCHA Handling**: Automated CAPTCHA solving
- **Proxy Support**: Rotating proxy support
- **Session Management**: Maintain login sessions

### Data Processing
- **OCR Integration**: Extract text from images
- **Table Extraction**: Extract data from tables
- **Chart Analysis**: Extract data from charts
- **Specification Parsing**: Intelligent spec parsing

### Integration Features
- **API Integration**: Direct API access where available
- **Webhook Support**: Real-time notifications
- **Scheduled Scraping**: Automated periodic scraping
- **Change Detection**: Detect product updates

## Monitoring

### Health Checks
- **Service Health**: `GET /health`
- **Database Health**: Check database connectivity
- **Storage Health**: Monitor disk space usage

### Metrics
- **Scraping Rate**: Products scraped per hour
- **Success Rate**: Percentage of successful scrapes
- **Data Quality**: Completeness and accuracy metrics
- **Storage Usage**: Database and file storage usage

### Logging
- **Scraping Events**: Track scraping activities
- **Error Logging**: Detailed error information
- **Performance Logging**: Response times and throughput
- **Data Quality Logging**: Data validation results

---

**Web Scraper Service** — Automated collection of GaN product information and datasheets from semiconductor manufacturers. 