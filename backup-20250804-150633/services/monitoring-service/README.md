# ESpice Monitoring & Observability Service

## Overview
The Monitoring & Observability Service provides comprehensive monitoring, alerting, and observability capabilities for the ESpice platform. It integrates APM (Application Performance Monitoring), infrastructure monitoring, distributed tracing, log aggregation, and alert management.

## Features

### 🔍 Application Performance Monitoring (APM)
- **Service Performance Tracking**: Monitor response times, throughput, and error rates
- **Resource Utilization**: Track CPU, memory, disk, and network usage
- **Custom Metrics**: Define and track business-specific metrics
- **Performance Baselines**: Establish and monitor performance thresholds

### 📊 Infrastructure Monitoring
- **Container Health**: Monitor Docker container status and resource usage
- **Service Dependencies**: Track service health and dependencies
- **System Metrics**: Monitor host system performance
- **Capacity Planning**: Track resource usage trends

### 🔗 Distributed Tracing
- **Request Tracing**: Track requests across microservices
- **Performance Analysis**: Identify bottlenecks in service chains
- **Error Correlation**: Correlate errors with specific request traces
- **Service Map**: Visualize service dependencies and interactions

### 📝 Log Aggregation
- **Centralized Logging**: Collect logs from all services
- **Structured Logging**: Parse and index log data
- **Log Search**: Full-text search across all logs
- **Log Analytics**: Analyze log patterns and trends

### 🚨 Alert Management
- **Multi-Channel Alerts**: Email, Slack, Teams, SMS, webhooks
- **Alert Rules**: Configurable alerting rules and thresholds
- **Alert Escalation**: Automatic escalation for critical issues
- **Alert History**: Track alert history and resolution

### 📈 Metrics & Dashboards
- **Prometheus Integration**: Collect and store metrics
- **Grafana Dashboards**: Pre-built dashboards for monitoring
- **Custom Dashboards**: Create custom monitoring dashboards
- **Real-time Metrics**: Live metrics streaming

## API Endpoints

### Health Check
```
GET /health
```
Returns service health status and basic metrics.

### Metrics
```
GET /api/monitoring/metrics
GET /api/monitoring/metrics/{metric_name}
GET /api/monitoring/metrics/history/{metric_name}
```
Access monitoring metrics and historical data.

### Alerts
```
GET /api/alerts
POST /api/alerts
GET /api/alerts/{alert_id}
PUT /api/alerts/{alert_id}
DELETE /api/alerts/{alert_id}
GET /api/alerts/history
```
Manage alerting rules and view alert history.

### Traces
```
GET /api/traces
GET /api/traces/{trace_id}
GET /api/traces/service/{service_name}
```
Access distributed tracing data.

### Logs
```
GET /api/logs
GET /api/logs/search
GET /api/logs/service/{service_name}
GET /api/logs/level/{log_level}
```
Search and retrieve log data.

### Performance
```
GET /api/monitoring/performance
GET /api/monitoring/performance/service/{service_name}
GET /api/monitoring/performance/summary
```
Access performance metrics and analysis.

### Infrastructure
```
GET /api/monitoring/infrastructure
GET /api/monitoring/infrastructure/containers
GET /api/monitoring/infrastructure/system
```
Monitor infrastructure health and resources.

## Configuration

### Environment Variables
```bash
# Service Configuration
PYTHONUNBUFFERED=1
LOG_LEVEL=INFO

# Prometheus & Grafana
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000

# Elasticsearch & Kibana
ELASTICSEARCH_URL=http://elasticsearch:9200
KIBANA_URL=http://kibana:5601

# Jaeger Tracing
JAEGER_URL=http://jaeger:16686

# Redis Cache
REDIS_URL=redis://redis:6379

# APM Server
APM_SERVER_URL=http://apm-server:8200

# Monitoring Configuration
METRICS_RETENTION_DAYS=30
ALERT_CHECK_INTERVAL=60
```

### Alert Rules Configuration
```yaml
# Example alert rules
alerts:
  - name: "High CPU Usage"
    condition: "cpu_usage > 80"
    duration: "5m"
    severity: "warning"
    channels: ["email", "slack"]
    
  - name: "Service Down"
    condition: "service_status == 'down'"
    duration: "1m"
    severity: "critical"
    channels: ["email", "slack", "sms"]
```

## Integration

### Service Integration
To integrate monitoring with other services:

1. **Add Monitoring Client**:
```python
from monitoring_client import MonitoringClient

monitoring = MonitoringClient()
monitoring.track_metric("request_count", 1)
monitoring.track_trace("api_request", {"service": "pdf-service"})
```

2. **Add Health Checks**:
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }
```

3. **Add Structured Logging**:
```python
import logging
from monitoring_client import StructuredLogger

logger = StructuredLogger(__name__)
logger.info("Processing request", extra={
    "request_id": request_id,
    "service": "pdf-service",
    "operation": "extract_text"
})
```

### Dashboard Integration
The service provides pre-built Grafana dashboards:
- **Service Overview**: High-level service health
- **Performance Metrics**: Response times and throughput
- **Error Analysis**: Error rates and patterns
- **Infrastructure**: Resource utilization
- **Custom Dashboards**: User-defined monitoring views

## Monitoring Tools

### Prometheus
- **Metrics Collection**: Collect metrics from all services
- **Time Series Database**: Store historical metrics
- **Query Language**: PromQL for metric queries
- **Alerting**: Rule-based alerting

### Grafana
- **Dashboards**: Visualize metrics and logs
- **Alerting**: Configure alert rules
- **Plugins**: Extend functionality
- **Templates**: Pre-built dashboard templates

### Jaeger
- **Distributed Tracing**: Track requests across services
- **Performance Analysis**: Identify bottlenecks
- **Service Map**: Visualize service dependencies
- **Trace Search**: Search and filter traces

### Elasticsearch & Kibana
- **Log Storage**: Centralized log storage
- **Log Search**: Full-text search across logs
- **Log Analytics**: Analyze log patterns
- **Visualizations**: Create log-based dashboards

## Usage Examples

### Track Custom Metrics
```python
# Track business metrics
monitoring.track_metric("datasheets_processed", 1)
monitoring.track_metric("spice_models_generated", 1)
monitoring.track_metric("processing_time_ms", 1500)
```

### Create Custom Alerts
```python
# Create alert rule
alert_rule = {
    "name": "High Processing Time",
    "condition": "processing_time_ms > 5000",
    "duration": "2m",
    "severity": "warning",
    "channels": ["email", "slack"]
}
monitoring.create_alert_rule(alert_rule)
```

### Monitor Service Dependencies
```python
# Track service dependencies
monitoring.track_dependency("pdf-service", "image-service", "healthy")
monitoring.track_dependency("spice-service", "database", "healthy")
```

## Development

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run service
uvicorn main:app --reload --host 0.0.0.0 --port 8015

# Run tests
pytest tests/
```

### Docker Development
```bash
# Build image
docker build -t espice-monitoring .

# Run container
docker run -p 8015:8015 espice-monitoring
```

## Production Deployment

### Docker Compose
The service is integrated into the main docker-compose.yml:
```yaml
monitoring-service:
  build: ./services/monitoring-service
  ports:
    - "8015:8015"
  environment:
    - REDIS_URL=redis://redis:6379
    - LOG_LEVEL=INFO
  depends_on:
    - notification-service
    - redis
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monitoring-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: monitoring-service
  template:
    metadata:
      labels:
        app: monitoring-service
    spec:
      containers:
      - name: monitoring-service
        image: espice-monitoring:latest
        ports:
        - containerPort: 8015
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379"
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check metrics retention period
   - Monitor log volume
   - Adjust cache settings

2. **Slow Query Performance**
   - Optimize database queries
   - Add database indexes
   - Use caching for frequent queries

3. **Alert Fatigue**
   - Review alert thresholds
   - Implement alert grouping
   - Use alert escalation rules

### Log Analysis
```bash
# View service logs
docker logs monitoring-service

# Search for errors
grep "ERROR" logs/monitoring.log

# Monitor real-time logs
tail -f logs/monitoring.log
```

## Contributing

1. Follow the established code style
2. Add tests for new features
3. Update documentation
4. Ensure monitoring integration
5. Test alert configurations

## License
This service is part of the ESpice platform and follows the same licensing terms. 