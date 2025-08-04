# ESpice Web Scraping Tool Guide

## Overview

The ESpice Web Scraping Tool is a comprehensive solution for automatically searching and extracting semiconductor datasheets from major manufacturers' websites. It integrates seamlessly with the existing ESpice application to provide automated datasheet discovery and processing.

## Features

### 🔍 **Intelligent Search**
- **Multi-manufacturer search**: Search across Infineon, Wolfspeed, Qorvo, and more
- **Smart filtering**: Filter by product category, voltage rating, current rating
- **Keyword matching**: Search by part numbers, specifications, or descriptions
- **Real-time results**: Get instant search results with live scraping

### 📥 **Automated Extraction**
- **Datasheet downloads**: Automatically download PDF datasheets
- **Product information**: Extract specifications, ratings, and metadata
- **Image extraction**: Download product images and diagrams
- **Batch processing**: Process multiple products simultaneously

### 🎯 **Manufacturer Support**
- **Infineon**: GaN power devices, CoolGaN™ products
- **Wolfspeed**: SiC and GaN transistors, power modules
- **Qorvo**: GaN RF and power devices
- **Extensible**: Easy to add new manufacturers

### 🔧 **Advanced Configuration**
- **Rate limiting**: Configurable delays between requests
- **Retry logic**: Automatic retry on failed requests
- **Timeout settings**: Customizable request timeouts
- **Robots.txt compliance**: Respect website crawling policies

## Quick Start

### 1. Access the Web Scraping Tool
Navigate to the **Web Scraping** section in the ESpice application sidebar.

### 2. Configure Your Search
- **Search Query**: Enter keywords, part numbers, or specifications
- **Manufacturer**: Select specific manufacturer or search all
- **Category**: Filter by product type (GaN Power, GaN RF, etc.)
- **Max Products**: Set the maximum number of products to find

### 3. Start Searching
Click **Search** to find products matching your criteria. Results will appear in the **Search Results** tab.

### 4. Download Datasheets
- Select individual products or use **Select All**
- Click **Download Selected** to download datasheets
- Monitor progress in the **Active Jobs** tab

## Detailed Usage

### Search Configuration

#### Basic Search
```
Search Query: "600V GaN"
Manufacturer: Infineon
Category: GaN Power Devices
Max Products: 50
```

#### Advanced Search
```
Search Query: "IGT60R190D1"
Manufacturer: All
Category: All
Max Products: 100
Include Datasheets: ✓
```

### Advanced Settings

#### Rate Limiting
- **Delay Between Requests**: 1.0-10.0 seconds
- **Max Retries**: 1-10 attempts
- **Timeout**: 5-120 seconds per request

#### Compliance
- **Follow Redirects**: Automatically follow HTTP redirects
- **Respect Robots.txt**: Follow website crawling policies

### Quick Actions

The tool provides predefined search configurations for common use cases:

1. **Infineon GaN Power**: Search Infineon's GaN power device portfolio
2. **Wolfspeed SiC/GaN**: Search Wolfspeed's SiC and GaN products
3. **Qorvo GaN RF**: Search Qorvo's GaN RF devices

## API Integration

### Service Architecture
```
ESpice Desktop App ↔ Web Scraper Service (Port 8011) ↔ Manufacturer Websites
                              ↓
                    Database Storage (SQLite)
                              ↓
                    PDF Processing Pipeline
```

### Endpoints

#### Health Check
```http
GET /health
```

#### Search Products
```http
POST /search
{
  "query": "600V GaN",
  "manufacturer": "infineon",
  "category": "gan_power",
  "limit": 50
}
```

#### Start Scraping Job
```http
POST /scrape
{
  "manufacturer": "infineon",
  "category": "gan_power",
  "keywords": ["600V", "GaN"],
  "max_products": 100,
  "include_datasheets": true
}
```

#### Get Job Status
```http
GET /jobs/{job_id}
```

#### List All Jobs
```http
GET /jobs
```

## Data Models

### Product Information
```typescript
interface GaNProduct {
  product_id: string
  manufacturer: string
  part_number: string
  category: string
  name: string
  description: string
  specifications: Record<string, any>
  datasheet_url?: string
  datasheet_path?: string
  product_url?: string
  image_url?: string
  voltage_rating?: number
  current_rating?: number
  power_rating?: number
  created_at: string
}
```

### Scraping Job
```typescript
interface ScrapingJob {
  job_id: string
  manufacturer: string
  category?: string
  keywords?: string[]
  max_products: number
  include_datasheets: boolean
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  created_at: string
  started_at?: string
  completed_at?: string
  total_products: number
  scraped_products: number
  downloaded_datasheets: number
  errors: string[]
}
```

## Integration with ESpice

### Automatic Processing
When datasheets are downloaded, they automatically flow through the ESpice processing pipeline:

1. **PDF Processing**: Extract text, tables, and images
2. **Parameter Extraction**: Identify semiconductor parameters
3. **Curve Extraction**: Extract I-V and C-V curves
4. **SPICE Generation**: Generate SPICE models
5. **Database Storage**: Store in ESpice document database

### Workflow Integration
```
Web Scraping → Download Datasheets → PDF Processing → Parameter Extraction → SPICE Models
```

## Best Practices

### Search Optimization
1. **Use specific part numbers** for exact matches
2. **Combine keywords** for broader searches
3. **Filter by manufacturer** to reduce search time
4. **Set reasonable limits** to avoid overwhelming results

### Rate Limiting
1. **Start with default delays** (1-2 seconds)
2. **Increase delays** if you encounter rate limiting
3. **Use manufacturer-specific settings** for optimal performance
4. **Monitor job status** for errors and retries

### Data Management
1. **Review search results** before downloading
2. **Select relevant products** to avoid unnecessary downloads
3. **Monitor storage space** for downloaded datasheets
4. **Clean up old jobs** periodically

## Troubleshooting

### Common Issues

#### No Search Results
- **Check manufacturer selection**: Ensure manufacturer is supported
- **Verify search terms**: Try broader or different keywords
- **Check service status**: Verify web scraper service is running
- **Review error logs**: Check for connection or parsing errors

#### Slow Performance
- **Reduce max products**: Lower the limit for faster results
- **Increase delays**: Add more time between requests
- **Select specific manufacturer**: Avoid searching all manufacturers
- **Check network**: Ensure stable internet connection

#### Download Failures
- **Verify URLs**: Check if datasheet URLs are accessible
- **Check permissions**: Ensure write access to download directory
- **Review error messages**: Look for specific failure reasons
- **Retry failed downloads**: Use the retry functionality

### Error Handling
The tool provides comprehensive error handling:
- **Network errors**: Automatic retry with exponential backoff
- **Parsing errors**: Fallback to alternative extraction methods
- **Rate limiting**: Automatic delay adjustment
- **Invalid URLs**: Skip and continue with other products

## Configuration

### Service Configuration
```yaml
# services/web-scraper/main.py
web_scraper:
  port: 8011
  database_path: "/app/scraped_data.db"
  datasheets_path: "/app/datasheets"
  max_concurrent_jobs: 5
  default_timeout: 30
  default_retries: 3
```

### Manufacturer Configurations
```python
configs = {
    Manufacturer.INFINEON: ScrapingConfig(
        base_url="https://www.infineon.com",
        search_url="https://www.infineon.com/cms/en/product/power/gallium-nitride-gan/",
        delay_between_requests=2.0
    ),
    Manufacturer.WOLFSPEED: ScrapingConfig(
        base_url="https://www.wolfspeed.com",
        search_url="https://www.wolfspeed.com/products/power-devices/gan-transistors",
        delay_between_requests=1.5
    )
}
```

## Future Enhancements

### Planned Features
1. **Additional Manufacturers**: Support for more semiconductor companies
2. **AI-Powered Search**: Intelligent product matching and recommendations
3. **Batch Scheduling**: Schedule scraping jobs for off-peak hours
4. **Export Formats**: Export results to CSV, JSON, or Excel
5. **Advanced Filtering**: Filter by package type, temperature range, etc.

### Integration Improvements
1. **Real-time Notifications**: WebSocket updates for job progress
2. **Cloud Storage**: Store datasheets in cloud storage
3. **Collaborative Features**: Share search results and configurations
4. **API Rate Limiting**: Implement per-user rate limiting
5. **Analytics Dashboard**: Track usage and performance metrics

## Support

For technical support or feature requests:
1. Check the troubleshooting section above
2. Review the error logs in the application
3. Contact the development team with specific error details
4. Provide reproduction steps for any issues

## Legal and Ethical Considerations

### Terms of Service
- Respect each manufacturer's terms of service
- Follow robots.txt directives
- Implement reasonable rate limiting
- Use data for legitimate engineering purposes only

### Data Usage
- Downloaded datasheets are for personal/educational use
- Respect copyright and intellectual property rights
- Do not redistribute datasheets without permission
- Follow manufacturer licensing terms

---

*This guide covers the core functionality of the ESpice Web Scraping Tool. For advanced usage or custom configurations, refer to the API documentation or contact the development team.* 