# Modular Web Scraper System

## Overview

The Modular Web Scraper System is an enhanced version of the web scraper with improved architecture, better maintainability, and support for XLSX file processing. It provides a modular approach to web scraping with separate components for different manufacturers and data processing tasks.

## Architecture

### Core Modules

1. **Base Scraper** (`modules/base_scraper.py`)
   - Abstract base class for all scrapers
   - Common functionality for HTTP requests, error handling, and data extraction
   - Async context manager support

2. **Data Processor** (`modules/data_processor.py`)
   - Handles XLSX file parsing and data transformation
   - Manufacturer-specific data processing
   - Field mapping and data extraction utilities

3. **File Manager** (`modules/file_manager.py`)
   - File operations and organization
   - Datasheet management
   - Storage statistics and backup functionality

4. **Database Manager** (`modules/database_manager.py`)
   - Database operations and data persistence
   - Product and job tracking
   - Statistics and reporting

5. **Manufacturer-Specific Scrapers**
   - **EPC Scraper** (`modules/epc_scraper.py`)
   - **Infineon Scraper** (`modules/infineon_scraper.py`)

## Features

### XLSX File Processing
- Automatic detection of manufacturer from file content
- Support for multiple Excel sheets
- Field mapping and data extraction
- Error handling and validation

### Batch Operations
- Batch datasheet downloading
- Batch data processing
- Progress tracking and status monitoring

### File Management
- Organized file structure by manufacturer
- Storage statistics and monitoring
- Backup and cleanup operations

### API Endpoints

#### File Management
- `GET /files/xlsx` - Get available XLSX files
- `GET /files/datasheets/{manufacturer}` - Get datasheet info
- `GET /files/storage-stats` - Get storage statistics

#### Data Processing
- `POST /process/xlsx` - Process XLSX file
- `GET /process/data/{manufacturer}` - Get processed data

#### Manufacturer-Specific
- `POST /epc/process-xlsx` - Process EPC XLSX file
- `POST /epc/batch-download` - Batch download EPC datasheets
- `POST /infineon/process-xlsx` - Process Infineon XLSX file

#### Export and Maintenance
- `POST /export/data` - Export processed data
- `POST /maintenance/cleanup` - Cleanup temporary files
- `POST /maintenance/backup` - Create backup

## Installation and Setup

### Prerequisites
```bash
pip install fastapi uvicorn aiohttp pandas openpyxl
```

### Directory Structure
```
services/web-scraper/
├── modules/
│   ├── __init__.py
│   ├── base_scraper.py
│   ├── data_processor.py
│   ├── file_manager.py
│   ├── database_manager.py
│   ├── epc_scraper.py
│   └── infineon_scraper.py
├── datasheets/
│   ├── epc/
│   ├── infineon/
│   └── ...
├── processed/
├── exports/
├── temp/
├── modular_main.py
├── start_modular_service.py
└── requirements.txt
```

### Starting the Service

#### Option 1: Using the startup script
```bash
cd services/web-scraper
python start_modular_service.py
```

#### Option 2: Direct execution
```bash
cd services/web-scraper
python modular_main.py
```

#### Option 3: Using uvicorn
```bash
cd services/web-scraper
uvicorn modular_main:app --host 0.0.0.0 --port 8011
```

## Usage

### 1. Place XLSX Files
Place your XLSX files in the appropriate manufacturer directories:
```
datasheets/
├── epc/
│   └── EPC-Product-Table.xlsx
├── infineon/
│   └── GaN transistors (GaN HEMTs).xlsx
└── ...
```

### 2. Process Files
Use the API to process XLSX files:

```bash
# Process EPC XLSX file
curl -X POST "http://localhost:8011/epc/process-xlsx" \
  -H "Content-Type: application/json" \
  -d '{"file_path": "datasheets/epc/EPC-Product-Table.xlsx"}'

# Process Infineon XLSX file
curl -X POST "http://localhost:8011/infineon/process-xlsx" \
  -H "Content-Type: application/json" \
  -d '{"file_path": "datasheets/infineon/GaN transistors (GaN HEMTs).xlsx"}'
```

### 3. Batch Download Datasheets
```bash
# Download EPC datasheets using CSV data
curl -X POST "http://localhost:8011/epc/batch-download" \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "EPC",
    "include_spice": true,
    "use_csv_data": true
  }'
```

### 4. Export Data
```bash
# Export processed data
curl -X POST "http://localhost:8011/export/data" \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "EPC",
    "format": "json"
  }'
```

## Desktop App Integration

The desktop app has been updated with a new `EnhancedWebScrapingPage` component that provides:

- **File Management**: Browse and manage XLSX files
- **Processing Jobs**: Monitor data processing progress
- **Data Viewing**: View processed data by manufacturer
- **Storage Monitoring**: Track storage usage and statistics
- **Maintenance Tools**: Cleanup and backup operations

### Accessing the Enhanced Page
Navigate to `/enhanced-scraping` in the desktop app to access the new interface.

## Data Flow

1. **File Upload**: XLSX files are placed in manufacturer-specific directories
2. **Processing**: Files are processed using manufacturer-specific logic
3. **Data Extraction**: Product information is extracted and structured
4. **Storage**: Data is saved to database and file system
5. **Download**: Datasheets are downloaded based on extracted product information
6. **Export**: Processed data can be exported in various formats

## Error Handling

The system includes comprehensive error handling:

- **File Processing Errors**: Invalid files, missing data, format issues
- **Network Errors**: Connection timeouts, download failures
- **Database Errors**: Connection issues, data corruption
- **Validation Errors**: Invalid input data, missing required fields

## Monitoring and Logging

- **Application Logs**: `modular_web_scraper.log`
- **API Health Check**: `GET /health`
- **Storage Statistics**: `GET /files/storage-stats`
- **Processing Status**: Real-time job status tracking

## Future Enhancements

1. **Additional Manufacturers**: Support for Wolfspeed, Qorvo, etc.
2. **Advanced Analytics**: Data visualization and reporting
3. **Machine Learning**: Automated data validation and enhancement
4. **Cloud Integration**: Cloud storage and processing
5. **API Rate Limiting**: Improved request management
6. **Authentication**: User authentication and authorization

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all dependencies are installed
2. **File Not Found**: Check file paths and permissions
3. **Database Errors**: Verify database file permissions
4. **Network Timeouts**: Check internet connection and firewall settings

### Debug Mode
Enable debug logging by modifying the logging level in `start_modular_service.py`:
```python
logging.basicConfig(level=logging.DEBUG, ...)
```

## Support

For issues and questions:
1. Check the logs in `modular_web_scraper.log`
2. Verify API connectivity with `GET /health`
3. Review the error messages in the API responses
4. Check file permissions and directory structure 