# ESpice Data Analytics & Reporting Service

## Overview
The Data Analytics & Reporting Service provides comprehensive business intelligence, analytics, and reporting capabilities for the ESpice platform. It tracks processing metrics, generates insights, creates visualizations, and delivers automated reports.

## Features

### 📊 Business Intelligence
- **Processing Analytics**: Track document processing performance and success rates
- **Business Metrics**: Monitor device types, model complexity, and user activity
- **Trend Analysis**: Identify patterns and trends in platform usage
- **Performance Baselines**: Establish and monitor performance thresholds

### 📈 Reporting Engine
- **Automated Reports**: Generate scheduled reports in multiple formats
- **Custom Dashboards**: Create interactive dashboards with real-time data
- **Export Capabilities**: Export data in CSV, Excel, JSON, and PDF formats
- **Report Templates**: Pre-built templates for common analytics needs

### 📊 Data Visualization
- **Interactive Charts**: Create dynamic visualizations with Plotly
- **Real-time Dashboards**: Live updating dashboards with current metrics
- **Custom Widgets**: Build custom visualization widgets
- **Chart Types**: Line charts, bar charts, pie charts, scatter plots

### 🔍 Analytics Tracking
- **Event Tracking**: Track user actions and system events
- **Performance Monitoring**: Monitor processing times and resource usage
- **Error Analysis**: Analyze error patterns and root causes
- **User Behavior**: Understand user activity and feature usage

### 📋 Report Management
- **Saved Reports**: Store and manage report configurations
- **Scheduled Reports**: Automate report generation and delivery
- **Report History**: Track report execution and delivery history
- **Custom Filters**: Apply filters and parameters to reports

## API Endpoints

### Health Check
```
GET /health
```
Returns service health status and basic metrics.

### Analytics Tracking
```
POST /api/analytics/track
```
Track analytics events with event type, data, service name, and user ID.

### Processing Metrics
```
GET /api/analytics/metrics/processing?time_range=7d
```
Get processing performance metrics for specified time range.

### Business Metrics
```
GET /api/analytics/metrics/business
```
Get business intelligence metrics including device types and user activity.

### Report Generation
```
POST /api/analytics/reports/generate
```
Generate analytical reports with custom parameters and filters.

### Report Export
```
GET /api/analytics/reports/{report_type}/export?format=csv&time_range=7d
```
Export reports in various formats (CSV, Excel, JSON).

### Visualizations
```
GET /api/analytics/visualizations/{chart_type}?time_range=7d
```
Get chart visualizations for different data types.

### Dashboards
```
GET /api/analytics/dashboards
POST /api/analytics/dashboards
```
Manage custom dashboards and configurations.

### Saved Reports
```
GET /api/analytics/reports
POST /api/analytics/reports/save
```
Manage saved report configurations.

### Analytics Summary
```
GET /api/analytics/summary
```
Get comprehensive analytics summary with key metrics.

## Configuration

### Environment Variables
```bash
# Service Configuration
PYTHONUNBUFFERED=1
DATABASE_PATH=/app/analytics_data/analytics.db
REPORT_STORAGE_PATH=/app/reports
CACHE_TTL=3600
MAX_WORKERS=4

# Redis Configuration
REDIS_URL=redis://redis:6379

# Logging
LOG_LEVEL=INFO
```

### Database Schema
The service uses SQLite with the following tables:
- **analytics_events**: Track all analytics events
- **reports**: Store report configurations
- **dashboards**: Store dashboard configurations
- **metrics**: Store calculated metrics

## Report Types

### Processing Performance Report
- **Metrics**: Total processed, success rate, average processing time
- **Breakdown**: Service-level performance statistics
- **Time Series**: Processing activity over time
- **Visualizations**: Performance trends and patterns

### Business Intelligence Report
- **Device Analysis**: Distribution of device types processed
- **Model Complexity**: Analysis of model complexity levels
- **User Activity**: Top users and activity patterns
- **Feature Usage**: Most used features and capabilities

### Error Analysis Report
- **Error Patterns**: Most common error types and services
- **Error Timeline**: Error frequency over time
- **Root Cause Analysis**: Error correlation and patterns
- **Recommendations**: Suggested improvements

### User Activity Report
- **User Engagement**: Active users and activity levels
- **Feature Usage**: Most popular features and workflows
- **Usage Patterns**: Peak usage times and patterns
- **User Segmentation**: User behavior analysis

## Visualization Types

### Processing Timeline
- **Chart Type**: Line chart
- **Data**: Processing activity over time
- **Features**: Multiple event types, interactive zoom

### Error Analysis
- **Chart Type**: Bar chart
- **Data**: Error types by service
- **Features**: Color coding, drill-down capability

### Device Distribution
- **Chart Type**: Pie chart
- **Data**: Device type distribution
- **Features**: Percentage labels, hover details

### Performance Metrics
- **Chart Type**: Gauge charts
- **Data**: Key performance indicators
- **Features**: Threshold indicators, color coding

## Integration

### Service Integration
To integrate analytics with other services:

1. **Track Events**:
```python
import aiohttp

async def track_event(event_type, event_data, service_name="pdf-service"):
    async with aiohttp.ClientSession() as session:
        await session.post("http://data-analytics:8016/api/analytics/track", json={
            "event_type": event_type,
            "event_data": event_data,
            "service_name": service_name
        })
```

2. **Track Processing Metrics**:
```python
# Track document processing
await track_event("document_processed", {
    "device_type": "GaN-HEMT",
    "processing_time_ms": 1500,
    "file_size_mb": 2.5
})

# Track errors
await track_event("processing_error", {
    "error_type": "ocr_failure",
    "error_message": "Text extraction failed"
})
```

3. **Track Business Metrics**:
```python
# Track SPICE model generation
await track_event("spice_model_generated", {
    "device_type": "SiC-MOSFET",
    "model_complexity": "advanced",
    "parameters_extracted": 25
})
```

### Dashboard Integration
The service provides REST API endpoints for dashboard integration:
- **Real-time Metrics**: Live updating metrics
- **Chart Data**: JSON data for custom visualizations
- **Export APIs**: Data export for external tools
- **Webhook Support**: Real-time data push

## Usage Examples

### Generate Processing Report
```python
import requests

# Generate processing performance report
response = requests.post("http://localhost:8016/api/analytics/reports/generate", json={
    "report_type": "processing_performance",
    "parameters": {
        "time_range": "7d",
        "include_errors": True
    }
})

report_data = response.json()
print(f"Success Rate: {report_data['data']['success_rate']}%")
```

### Create Custom Dashboard
```python
# Create dashboard configuration
dashboard_config = {
    "name": "Processing Overview",
    "description": "Real-time processing metrics",
    "widgets": [
        {
            "type": "metric",
            "title": "Total Processed",
            "metric": "total_processed",
            "position": {"x": 0, "y": 0, "w": 6, "h": 2}
        },
        {
            "type": "chart",
            "title": "Processing Timeline",
            "chart_type": "processing_timeline",
            "position": {"x": 0, "y": 2, "w": 12, "h": 4}
        }
    ],
    "layout": {"columns": 12},
    "refresh_interval": 300
}

response = requests.post("http://localhost:8016/api/analytics/dashboards", json=dashboard_config)
```

### Export Report Data
```python
# Export processing metrics to CSV
response = requests.get(
    "http://localhost:8016/api/analytics/reports/processing_performance/export",
    params={"format": "csv", "time_range": "30d"}
)

with open("processing_report.csv", "wb") as f:
    f.write(response.content)
```

## Development

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run service
python main.py

# Or with uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8016
```

### Docker Development
```bash
# Build image
docker build -t espice-data-analytics .

# Run container
docker run -p 8016:8016 espice-data-analytics
```

### Testing
```bash
# Test health endpoint
curl http://localhost:8016/health

# Test analytics tracking
curl -X POST http://localhost:8016/api/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"event_type": "test_event", "event_data": {"test": true}}'

# Test metrics endpoint
curl http://localhost:8016/api/analytics/metrics/processing?time_range=7d
```

## Production Deployment

### Docker Compose
The service is integrated into the main docker-compose.yml:
```yaml
data-analytics:
  build: ./services/data-analytics
  ports:
    - "8016:8016"
  environment:
    - REDIS_URL=redis://redis:6379
    - DATABASE_PATH=/app/analytics_data/analytics.db
    - REPORT_STORAGE_PATH=/app/reports
  depends_on:
    - monitoring-service
    - redis
  volumes:
    - ./analytics_data:/app/analytics_data
    - ./reports:/app/reports
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-analytics
spec:
  replicas: 2
  selector:
    matchLabels:
      app: data-analytics
  template:
    metadata:
      labels:
        app: data-analytics
    spec:
      containers:
      - name: data-analytics
        image: espice-data-analytics:latest
        ports:
        - containerPort: 8016
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        volumeMounts:
        - name: analytics-data
          mountPath: /app/analytics_data
        - name: reports
          mountPath: /app/reports
      volumes:
      - name: analytics-data
        persistentVolumeClaim:
          claimName: analytics-data-pvc
      - name: reports
        persistentVolumeClaim:
          claimName: reports-pvc
```

## Performance Optimization

### Caching Strategy
- **Redis Caching**: Cache frequently accessed metrics
- **TTL Configuration**: Configurable cache expiration
- **Cache Invalidation**: Automatic cache refresh on data updates

### Database Optimization
- **Indexed Queries**: Optimized database queries with indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized SQL queries for large datasets

### Memory Management
- **Streaming Responses**: Stream large datasets without loading into memory
- **Pagination**: Paginate large result sets
- **Background Processing**: Process heavy analytics in background tasks

## Monitoring & Alerting

### Health Monitoring
- **Health Checks**: Regular health check endpoints
- **Performance Metrics**: Track service performance
- **Error Tracking**: Monitor and alert on errors

### Integration with Monitoring Service
The analytics service integrates with the monitoring service:
- **Metrics Collection**: Send performance metrics to monitoring
- **Alert Integration**: Trigger alerts based on analytics thresholds
- **Dashboard Integration**: Display analytics in monitoring dashboards

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check pandas memory usage for large datasets
   - Implement data streaming for large reports
   - Optimize database queries

2. **Slow Report Generation**
   - Use caching for frequently accessed data
   - Implement background processing for heavy reports
   - Optimize database indexes

3. **Redis Connection Issues**
   - Check Redis service availability
   - Verify Redis URL configuration
   - Implement connection retry logic

### Log Analysis
```bash
# View service logs
docker logs data-analytics

# Search for errors
grep "ERROR" logs/analytics.log

# Monitor real-time logs
tail -f logs/analytics.log
```

## Contributing

1. Follow the established code style
2. Add tests for new features
3. Update documentation
4. Ensure analytics integration
5. Test report generation

## License
This service is part of the ESpice platform and follows the same licensing terms. 