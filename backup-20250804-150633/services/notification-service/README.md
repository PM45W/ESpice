# Notification & Alerting Service

The Notification & Alerting Service provides real-time, email, Slack/Teams, SMS, and webhook notifications for the ESpice platform. It supports user preferences, notification templates, and notification history for full auditability and user experience.

## Features

### 🔔 **Notification Types**
- **Real-time (WebSocket/In-app)**: Live notifications to users
- **Email**: SMTP-based email notifications
- **Slack/Teams**: Integration via webhooks
- **SMS**: SMS alerts via Twilio or similar
- **Webhooks**: Custom third-party integrations

### 📬 **Notification Preferences**
- **User Preferences**: Per-user channel enable/disable
- **Custom Settings**: Channel-specific configuration
- **Opt-in/Opt-out**: User control over notification types

### 🗂️ **Notification History**
- **Notification Log**: Full notification history
- **Status Tracking**: Sent, failed, read, pending
- **Error Logging**: Delivery errors and diagnostics
- **Audit Trail**: Complete notification auditability

### 📝 **Templates & Customization**
- **Notification Templates**: Predefined and custom templates
- **Dynamic Content**: Parameterized messages
- **Localization**: Multi-language support (future)

### 🔗 **Integration**
- **API Integration**: Trigger notifications from any service
- **Webhooks**: Outbound notifications to third-party systems
- **Slack/Teams**: Team collaboration integration
- **Email/SMS**: User and admin alerts

## API Endpoints

### Health
- `GET /health` — Service health check

### Notifications
- `POST /notify` — Send notification
- `GET /notifications` — Get notification history

### Preferences
- `GET /preferences/{user_id}` — Get user preferences
- `POST /preferences` — Set user preference

### Real-time
- `GET /ws/{user_id}` — WebSocket endpoint for real-time notifications

## Example Usage

### 1. Send Notification
```bash
curl -X POST http://localhost:8014/notify \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "type": "email",
    "channel": "email",
    "subject": "Model Validation Complete",
    "message": "Your model has been validated successfully.",
    "to": "user123@example.com"
  }'
```

### 2. Get Notification History
```bash
curl http://localhost:8014/notifications?user_id=user123
```

### 3. Set Notification Preference
```bash
curl -X POST http://localhost:8014/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "channel": "email",
    "enabled": true
  }'
```

### 4. Real-time Notifications (WebSocket)
```javascript
const ws = new WebSocket('ws://localhost:8014/ws/user123');
ws.onmessage = (event) => {
  console.log('Notification:', event.data);
};
```

## Database Schema

### Notifications Table
```sql
CREATE TABLE notifications (
    notification_id TEXT PRIMARY KEY,
    user_id TEXT,
    org_id TEXT,
    type TEXT,
    channel TEXT,
    subject TEXT,
    message TEXT,
    data TEXT,
    status TEXT,
    created_at TEXT,
    sent_at TEXT,
    read_at TEXT,
    error TEXT
);
```

### Notification Preferences Table
```sql
CREATE TABLE notification_preferences (
    user_id TEXT,
    channel TEXT,
    enabled INTEGER,
    settings TEXT,
    PRIMARY KEY (user_id, channel)
);
```

## Notification Channels
- **in_app**: In-app or WebSocket notifications
- **email**: Email notifications
- **slack**: Slack channel notifications
- **teams**: Microsoft Teams notifications
- **sms**: SMS text messages
- **webhook**: Custom webhook notifications

## Integration

### With All Services
- Trigger notifications for events (model validation, job completion, errors)
- Notify users, admins, or teams
- Integrate with external systems via webhooks

### With API Gateway
- Centralized notification dispatch
- User preference management
- Notification history and audit

### With Auth Service
- Notify on login, password reset, account changes
- Security alerts and audit

### With Customization Manager
- Notify on model approval, validation, or sharing
- Team collaboration notifications

### With Web Scraper
- Notify on data extraction completion or errors
- Data availability alerts

## Configuration

### Environment Variables
```bash
# Email configuration
SMTP_SERVER=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=user@example.com
SMTP_PASSWORD=yourpassword
FROM_EMAIL=noreply@example.com
SMTP_USE_TLS=1

# Slack/Teams configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...

# SMS configuration
SMS_PROVIDER=twilio
SMS_API_KEY=your-twilio-api-key
SMS_FROM_NUMBER=+1234567890
```

### Docker Configuration
```yaml
notification-service:
  build: ./services/notification-service
  ports:
    - "8014:8014"
  environment:
    - PYTHONUNBUFFERED=1
    - SMTP_SERVER=smtp.example.com
    - SMTP_PORT=587
    - SMTP_USERNAME=user@example.com
    - SMTP_PASSWORD=yourpassword
    - FROM_EMAIL=noreply@example.com
    - SMTP_USE_TLS=1
    - SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
    - TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
    - SMS_PROVIDER=twilio
    - SMS_API_KEY=your-twilio-api-key
    - SMS_FROM_NUMBER=+1234567890
  volumes:
    - ./notification_data:/app/notification_data
    - ./logs:/app/logs
  networks:
    - espice-network
```

## Development

### Local Development
```bash
cd services/notification-service
pip install -r requirements.txt
python main.py
```

### Testing
```bash
# Test email notification
curl -X POST http://localhost:8014/notify \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123", "type": "email", "channel": "email", "subject": "Test", "message": "Test email", "to": "user123@example.com"}'

# Test Slack notification
curl -X POST http://localhost:8014/notify \
  -H "Content-Type: application/json" \
  -d '{"type": "slack", "channel": "slack", "subject": "Test", "message": "Test Slack", "to": ""}'
```

## Advanced Features

### Notification Routing
- **Event-based Routing**: Route notifications based on event type
- **User/Org Routing**: Notify specific users or organizations
- **Escalation Policies**: Escalate critical alerts

### Templates & Localization
- **Custom Templates**: User-defined templates
- **Localization**: Multi-language support
- **Dynamic Content**: Parameterized messages

### Monitoring & Audit
- **Notification Metrics**: Delivery rates, failures
- **Audit Trail**: Full notification history
- **Error Tracking**: Delivery error logging

### Future Enhancements
- **Push Notifications**: Mobile push support
- **In-app Notification Center**: UI for notification management
- **Advanced Escalation**: Multi-level alerting
- **AI-driven Routing**: Smart notification delivery

---

**Notification & Alerting Service** — Real-time, email, Slack/Teams, SMS, and webhook notifications for the ESpice platform. 