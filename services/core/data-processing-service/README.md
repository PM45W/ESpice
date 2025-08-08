# Data Processing Service

The Data Processing Service consolidates web scraping and batch processing capabilities for the ESpice platform. It provides comprehensive data extraction, processing, and management functionality for semiconductor datasheets and product information.

## Features

### 🌐 **Web Scraping**
- **Manufacturer Support**: Infineon, Wolfspeed, Qorvo, NXP, Texas Instruments, STMicroelectronics, ROHM, Toshiba, Renesas
- **Product Categories**: GaN Power, GaN RF, GaN Driver, GaN Module, GaN Discrete, GaN IC
- **Scraping Capabilities**: Product information, datasheet downloads, image extraction, specification parsing
- **Data Storage**: SQLite database with organized file storage

### 📦 **Batch Processing**
- **Batch Job Management**: Create, monitor, and manage batch processing jobs
- **File Upload**: Support for multiple file uploads and validation
- **Parallel Processing**: Process multiple documents simultaneously
- **Workflow Integration**: Integration with AI Agent for orchestration
- **Result Storage**: Persistent storage with database integration

### 🔍 **Data Extraction**
- **Product Information**: Part numbers, descriptions, specifications
- **Datasheet Processing**: PDF parsing and data extraction
- **Image Processing**: Product images and diagram extraction
- **Specification Parsing**: Electrical and mechanical specifications
- **Price Information**: Price ranges and availability data

### 💾 **Data Management**
- **Database Storage**: SQLite for products and jobs
- **File Organization**: Structured datasheet storage
- **Metadata Tracking**: Download dates, file hashes, URLs
- **Version Control**: Track updates and changes

## API Endpoints

### Health
- `GET /health` — Service health check

### Web Scraping
- `POST /scrape` — Start a new scraping job
- `GET /jobs/{job_id}` — Get job status and results
- `GET /jobs` — List all scraping jobs
- `DELETE /jobs/{job_id}` — Cancel a scraping job
- `GET /products` — Get scraped products
- `GET /products/{product_id}` — Get specific product
- `POST /search` — Search products by query
- `GET /manufacturers` — Get supported manufacturers
- `GET /categories` — Get product categories

### Batch Processing
- `POST /batch/create` — Create a new batch job (demo files)
- `POST /batch/upload` — Upload files and create a batch job
- `GET /batch/{batch_id}` — Get batch status and progress
- `GET /batch/{batch_id}/jobs` — Get all jobs in a batch
- `POST /batch/{batch_id}/cancel` — Cancel a batch job
- `POST /batch/{batch_id}/retry` — Retry failed jobs in a batch
- `GET /batches` — List all batches
- `DELETE /batch/{batch_id}` — Delete a batch and its jobs

## Example Usage

### Web Scraping
```bash
# Start scraping job
curl -X POST http://localhost:8011/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "infineon",
    "category": "gan_power",
    "keywords": ["GaN", "power", "transistor"],
    "max_products": 50,
    "include_datasheets": true
  }'

# Check job status
curl http://localhost:8011/jobs/{job_id}

# Get scraped products
curl "http://localhost:8011/products?manufacturer=infineon&limit=20"
```

### Batch Processing
```bash
# Create batch job
curl -X POST http://localhost:8011/batch/create \
  -H "Content-Type: application/json" \
  -d '{
    "batch_name": "Test Batch",
    "workflow_type": "full_extraction"
  }'

# Upload files for processing
curl -X POST http://localhost:8011/batch/upload \
  -F "files=@/path/to/datasheet1.pdf" \
  -F "files=@/path/to/datasheet2.pdf" \
  -F "request={\"batch_name\":\"My Batch\",\"workflow_type\":\"full_extraction\"};type=application/json"

# Monitor batch status
curl http://localhost:8011/batch/{batch_id}
```

## Configuration
- **Port**: 8011
- **Database**: SQLite (`./data/products.db`)
- **Uploads directory**: `/app/uploads` (mounted to `./temp`)
- **Demo data directory**: `/app/data` (mounted to `./examples`)

## Development
```bash
cd services/core/data-processing-service
pip install -r requirements.txt
python main.py
```

## Docker
The service is included in `docker-compose.yml` and will be started with the rest of the ESpice stack.

## Integration
- Communicates with AI Agent for workflow orchestration
- Integrates with PDF Service for document processing
- Connects with Curve Extraction Service for data analysis
- Supports notification service for job status updates

## Future Enhancements
- Advanced scheduling and prioritization
- Integration with version control and PDK validation
- User authentication and access control
- Real-time processing status updates
- Advanced search and filtering capabilities 