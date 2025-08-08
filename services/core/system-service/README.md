# System Service

The System Service consolidates monitoring, observability, and notification capabilities for the ESpice platform. It provides comprehensive system monitoring, alerting, and communication functionality to ensure platform reliability and user engagement.

## Features

### 🔍 **Application Performance Monitoring (APM)**
- **Service Performance Tracking**: Monitor response times, throughput, and error rates
- **Resource Utilization**: Track CPU, memory, disk, and network usage
- **Custom Metrics**: Define and track business-specific metrics
- **Performance Baselines**: Establish and monitor performance thresholds
- **Service Dependencies**: Track service health and dependencies

### 📊 **Infrastructure Monitoring**
- **Container Health**: Monitor Docker container status and resource usage
- **System Metrics**: Monitor host system performance
- **Capacity Planning**: Track resource usage trends
- **Service Map**: Visualize service dependencies and interactions
- **Distributed Tracing**: Track requests across microservices

### 📝 **Log Aggregation**
- **Centralized Logging**: Collect logs from all services
- **Structured Logging**: Parse and index log data
- **Log Search**: Full-text search across all logs
- **Log Analytics**: Analyze log patterns and trends
- **Error Correlation**: Correlate errors with specific request traces

### 🔔 **Notification System**
- **Multi-Channel Notifications**: Email, Slack/Teams, SMS, webhooks, real-time
- **User Preferences**: Per-user channel enable/disable and customization
- **Notification Templates**: Predefined and custom templates with dynamic content
- **Notification History**: Full notification history with status tracking
- **Alert Escalation**: Automatic escalation for critical issues

### 🚨 **Alert Management**
- **Multi-Channel Alerts**: Email, Slack, Teams, SMS, webhooks
- **Alert Rules**: Configurable alerting rules and thresholds
- **Alert History**: Track alert history and resolution
- **Real-time Alerts**: Immediate notification for critical issues
- **Alert Correlation**: Group related alerts for better management

### 📈 **Metrics & Dashboards**
- **Prometheus Integration**: Collect and store metrics
- **Grafana Dashboards**: Pre-built dashboards for monitoring
- **Custom Dashboards**: Create custom monitoring dashboards
- **Real-time Metrics**: Live metrics streaming
- **Historical Analysis**: Analyze trends and patterns

## API Endpoints

### Health
- `GET /health` — Service health check

### Monitoring
- `GET /api/monitoring/metrics` — Get monitoring metrics
- `GET /api/monitoring/metrics/{metric_name}` — Get specific metric
- `GET /api/monitoring/metrics/history/{metric_name}` — Get metric history
- `GET /api/monitoring/performance` — Get performance metrics
- `GET /api/monitoring/performance/service/{service_name}` — Get service performance
- `GET /api/monitoring/infrastructure` — Get infrastructure metrics
- `GET /api/monitoring/infrastructure/containers` — Get container metrics

### Alerts
- `GET /api/alerts` — Get all alerts
- `POST /api/alerts` — Create new alert
- `GET /api/alerts/{alert_id}` — Get specific alert
- `PUT /api/alerts/{alert_id}` — Update alert
- `DELETE /api/alerts/{alert_id}` — Delete alert
- `GET /api/alerts/history` — Get alert history

### Traces
- `GET /api/traces` — Get all traces
- `GET /api/traces/{trace_id}` — Get specific trace
- `GET /api/traces/service/{service_name}` — Get service traces

### Logs
- `GET /api/logs` — Get all logs
- `GET /api/logs/search` — Search logs
- `GET /api/logs/service/{service_name}` — Get service logs
- `GET /api/logs/level/{log_level}` — Get logs by level

### Notifications
- `POST /api/notifications/notify` — Send notification
- `GET /api/notifications` — Get notification history
- `GET /api/notifications/preferences/{user_id}` — Get user preferences
- `POST /api/notifications/preferences` — Set user preference
- `GET /api/notifications/ws/{user_id}` — WebSocket endpoint for real-time notifications

## Example Usage

### Monitoring
```bash
# Get system metrics
curl http://localhost:8013/api/monitoring/metrics

# Get service performance
curl http://localhost:8013/api/monitoring/performance/service/data-processing

# Get container metrics
curl http://localhost:8013/api/monitoring/infrastructure/containers
```

### Alerts
```bash
# Create alert
curl -X POST http://localhost:8013/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High CPU Usage",
    "description": "CPU usage above 90%",
    "severity": "warning",
    "service": "data-processing",
    "threshold": 90
  }'

# Get alert history
curl http://localhost:8013/api/alerts/history
```

### Notifications
```bash
# Send notification
curl -X POST http://localhost:8013/api/notifications/notify \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "type": "email",
    "channel": "email",
    "subject": "Model Validation Complete",
    "message": "Your model has been validated successfully.",
    "to": "user123@example.com"
  }'

# Set notification preference
curl -X POST http://localhost:8013/api/notifications/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "channel": "email",
    "enabled": true
  }'
```

### Real-time Notifications (WebSocket)
```javascript
const ws = new WebSocket('ws://localhost:8013/api/notifications/ws/user123');
ws.onmessage = (event) => {
  console.log('Notification:', event.data);
};
```

## Configuration
- **Port**: 8013
- **Database**: SQLite for notifications and alerts
- **Prometheus**: Metrics collection and storage
- **Grafana**: Dashboard visualization
- **SMTP**: Email notifications
- **Webhooks**: Slack/Teams integration

## Development
```bash
cd services/core/system-service
pip install -r requirements.txt
python main.py
```

## Docker
The service is included in `docker-compose.yml` and will be started with the rest of the ESpice stack.

## Integration
- Monitors all ESpice services
- Provides notifications for all platform events
- Integrates with external monitoring tools
- Supports custom alerting rules
- Connects with user management system

## Supported Notification Channels
- **Email**: SMTP-based email notifications
- **Slack**: Slack webhook integration
- **Teams**: Microsoft Teams webhook integration
- **SMS**: SMS alerts via Twilio or similar
- **Webhooks**: Custom third-party integrations
- **Real-time**: WebSocket-based in-app notifications

## Monitoring Capabilities
- **Service Health**: Monitor all microservices
- **Performance Metrics**: Response times, throughput, error rates
- **Resource Usage**: CPU, memory, disk, network
- **Business Metrics**: Custom application metrics
- **Infrastructure**: Container and system monitoring
- **Distributed Tracing**: Request flow tracking

## Future Enhancements
- Machine learning-based anomaly detection
- Advanced alert correlation and grouping
- Custom dashboard builder
- Integration with external monitoring platforms
- Advanced notification scheduling and routing
- Real-time collaboration features 