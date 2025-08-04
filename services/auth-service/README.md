# Authentication & Authorization Service

The Authentication & Authorization Service provides enterprise-grade security for the ESpice platform with Single Sign-On (SSO), Role-Based Access Control (RBAC), multi-tenant support, and comprehensive audit logging.

## Features

### 🔐 **Authentication Methods**
- **Local Authentication**: Username/password with bcrypt hashing
- **Single Sign-On (SSO)**: SAML, OAuth2, OpenID Connect support
- **LDAP Integration**: Enterprise directory integration
- **API Key Authentication**: Secure API access for integrations
- **JWT Tokens**: Stateless session management

### 👥 **User Management**
- **User Registration**: Secure user creation and onboarding
- **Role-Based Access Control (RBAC)**: Fine-grained permissions
- **Multi-tenant Support**: Organization and project isolation
- **User Status Management**: Active, inactive, suspended states
- **Profile Management**: User profile and settings

### 🏢 **Organization Management**
- **Multi-tenant Architecture**: Organization isolation
- **Domain-based Organization**: Automatic organization assignment
- **Organization Settings**: Customizable organization configurations
- **User Organization Assignment**: Flexible user-organization mapping

### 🔑 **Permission System**
- **Granular Permissions**: Fine-grained access control
- **Permission Inheritance**: Role-based permission inheritance
- **Custom Permissions**: User-specific permission assignments
- **Permission Validation**: Real-time permission checking

### 📊 **Audit & Compliance**
- **Comprehensive Audit Logging**: Complete action tracking
- **Audit Trail**: User action history and accountability
- **Compliance Reporting**: GDPR, SOX, and other compliance
- **Data Retention**: Configurable audit log retention

### 🔒 **Security Features**
- **Password Security**: bcrypt hashing with salt
- **JWT Security**: Secure token-based authentication
- **API Key Management**: Secure API access control
- **Session Management**: Secure session handling
- **Rate Limiting**: Protection against brute force attacks

## API Endpoints

### Health
- `GET /health` — Service health check

### Authentication
- `POST /auth/login` — User login
- `POST /auth/sso` — SSO login
- `POST /auth/logout` — User logout
- `POST /auth/check-permission` — Check user permission

### User Management
- `POST /users` — Create new user
- `GET /users/me` — Get current user info
- `GET /users` — Get users (filtered)
- `PUT /users/{user_id}` — Update user
- `DELETE /users/{user_id}` — Delete user

### API Key Management
- `POST /api-keys` — Create API key
- `GET /api-keys` — Get user's API keys
- `DELETE /api-keys/{key_id}` — Delete API key

### Audit Logging
- `GET /audit-logs` — Get audit logs
- `POST /audit-logs/export` — Export audit logs

## Example Usage

### 1. User Login
```bash
curl -X POST http://localhost:8013/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "remember_me": false
  }'
```

### 2. Create New User
```bash
curl -X POST http://localhost:8013/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {jwt_token}" \
  -d '{
    "username": "engineer1",
    "email": "engineer1@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "engineer",
    "org_id": "default",
    "password": "securepassword123"
  }'
```

### 3. Create API Key
```bash
curl -X POST http://localhost:8013/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {jwt_token}" \
  -d '{
    "name": "Integration API Key",
    "permissions": ["read_model", "create_model"],
    "expires_in_days": 365
  }'
```

### 4. Check Permission
```bash
curl -X POST http://localhost:8013/auth/check-permission \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {jwt_token}" \
  -d '{
    "permission": "create_model"
  }'
```

### 5. Get Audit Logs
```bash
curl -X GET "http://localhost:8013/audit-logs?limit=50&start_date=2025-01-01" \
  -H "Authorization: Bearer {jwt_token}"
```

## Database Schema

### Organizations Table
```sql
CREATE TABLE organizations (
    org_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    domain TEXT UNIQUE,
    settings TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### Users Table
```sql
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL,
    org_id TEXT NOT NULL,
    status TEXT NOT NULL,
    auth_provider TEXT NOT NULL,
    permissions TEXT,
    settings TEXT,
    last_login TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (org_id) REFERENCES organizations (org_id)
);
```

### API Keys Table
```sql
CREATE TABLE api_keys (
    key_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    permissions TEXT,
    expires_at TEXT,
    last_used TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
    log_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    details TEXT,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);
```

## User Roles

### Admin
- **Full System Access**: Complete platform control
- **User Management**: Create, update, delete users
- **System Configuration**: Platform settings management
- **Audit Access**: View all audit logs

### Manager
- **Team Management**: Manage team members
- **Project Access**: Full project access
- **Resource Management**: Manage models and standards
- **Limited System Access**: No system configuration

### Engineer
- **Model Creation**: Create and modify models
- **Standard Access**: View and use standards
- **Project Access**: Access assigned projects
- **Limited User Access**: View team members

### Viewer
- **Read Access**: View models and standards
- **Limited Project Access**: Read-only project access
- **No Modification**: Cannot modify resources
- **Basic User Info**: View basic user information

### Guest
- **Public Access**: Access public resources only
- **No Authentication**: Limited functionality
- **No Personal Data**: No personal information access
- **Temporary Access**: Time-limited access

## Permissions

### User Management
- `create_user`: Create new users
- `read_user`: View user information
- `update_user`: Modify user details
- `delete_user`: Remove users

### Model Management
- `create_model`: Create new models
- `read_model`: View models
- `update_model`: Modify models
- `delete_model`: Remove models

### Standard Management
- `create_standard`: Create new standards
- `read_standard`: View standards
- `update_standard`: Modify standards
- `delete_standard`: Remove standards

### System Management
- `manage_system`: System configuration
- `view_audit_logs`: Access audit logs
- `manage_organizations`: Organization management

## Authentication Flow

### 1. Local Authentication
```
User Login → Verify Credentials → Generate JWT → Return Token
```

### 2. SSO Authentication
```
SSO Request → Validate Token → Create/Update User → Generate JWT → Return Token
```

### 3. API Key Authentication
```
API Request → Validate API Key → Check Permissions → Process Request
```

### 4. JWT Authentication
```
API Request → Validate JWT → Check Permissions → Process Request
```

## Security Features

### Password Security
- **bcrypt Hashing**: Secure password storage
- **Salt Generation**: Unique salt per password
- **Password Policy**: Configurable password requirements
- **Brute Force Protection**: Rate limiting and account lockout

### JWT Security
- **Secure Signing**: HMAC-SHA256 signing
- **Token Expiration**: Configurable token lifetime
- `Token Refresh`: Automatic token renewal
- **Token Revocation**: Secure token invalidation

### API Key Security
- **Secure Generation**: Cryptographically secure keys
- **Hash Storage**: Keys stored as SHA256 hashes
- **Expiration**: Configurable key expiration
- **Usage Tracking**: Monitor key usage

### Audit Security
- **Immutable Logs**: Tamper-proof audit trails
- **Secure Storage**: Encrypted audit log storage
- **Access Control**: Restricted audit log access
- **Data Retention**: Configurable retention policies

## Integration

### With All Services
The authentication service integrates with all ESpice services to:
- Provide secure access control
- Validate user permissions
- Track user actions
- Ensure data isolation

### With API Gateway
The API gateway uses the auth service to:
- Validate JWT tokens
- Check API permissions
- Route authenticated requests
- Log access attempts

### With Customization Manager
The customization manager uses auth to:
- Control model creation permissions
- Validate user standards
- Track custom model usage
- Manage user workspaces

### With Web Scraper
The web scraper uses auth to:
- Control scraping permissions
- Track scraping activities
- Manage user quotas
- Validate data access

## Configuration

### Environment Variables
```bash
# Service configuration
PYTHONUNBUFFERED=1
DATABASE_PATH=/app/auth_data.db
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24

# Security configuration
BCRYPT_ROUNDS=12
PASSWORD_MIN_LENGTH=8
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=30

# Audit configuration
AUDIT_LOG_RETENTION_DAYS=365
AUDIT_LOG_LEVEL=INFO
```

### Docker Configuration
```yaml
auth-service:
  build: ./services/auth-service
  ports:
    - "8013:8013"
  environment:
    - PYTHONUNBUFFERED=1
    - JWT_SECRET=your-secret-key
  volumes:
    - ./auth_data:/app/auth_data
    - ./audit_logs:/app/logs
  networks:
    - espice-network
```

## Development

### Local Development
```bash
cd services/auth-service
pip install -r requirements.txt
python main.py
```

### Testing
```bash
# Test login
curl -X POST http://localhost:8013/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Test API key creation
curl -X POST http://localhost:8013/api-keys \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key"}'
```

## Advanced Features

### SSO Integration
- **SAML 2.0**: Enterprise SSO support
- **OAuth2**: Third-party authentication
- **OpenID Connect**: Modern SSO protocol
- **LDAP/Active Directory**: Enterprise directory integration

### Multi-factor Authentication
- **TOTP**: Time-based one-time passwords
- **SMS Authentication**: SMS-based verification
- **Email Authentication**: Email-based verification
- **Hardware Tokens**: Physical security tokens

### Advanced RBAC
- **Dynamic Roles**: Context-aware role assignment
- **Permission Inheritance**: Hierarchical permissions
- **Custom Permissions**: User-specific permissions
- **Temporary Permissions**: Time-limited access

### Compliance Features
- **GDPR Compliance**: Data privacy compliance
- **SOX Compliance**: Financial reporting compliance
- **HIPAA Compliance**: Healthcare data compliance
- **ISO 27001**: Information security compliance

## Future Enhancements

### Advanced Security
- **Zero Trust Architecture**: Continuous verification
- **Behavioral Analytics**: User behavior analysis
- **Threat Detection**: Automated threat detection
- **Security Orchestration**: Automated response

### Identity Federation
- **Federation Protocols**: Cross-domain authentication
- **Identity Providers**: Multiple IdP support
- **Attribute Mapping**: Flexible attribute mapping
- **Single Logout**: Cross-service logout

### Advanced Audit
- **Real-time Monitoring**: Live audit monitoring
- **Anomaly Detection**: Automated anomaly detection
- **Compliance Automation**: Automated compliance checks
- **Forensic Analysis**: Advanced audit analysis

### User Experience
- **Self-service Portal**: User self-management
- **Password Reset**: Automated password recovery
- **Account Recovery**: Secure account recovery
- **Profile Management**: Enhanced user profiles

## Monitoring

### Health Checks
- **Service Health**: `GET /health`
- **Database Health**: Check database connectivity
- **JWT Health**: Validate JWT configuration

### Metrics
- **Authentication Rate**: Login success/failure rates
- **User Activity**: Active user tracking
- **Permission Usage**: Permission check statistics
- **Audit Volume**: Audit log generation rate

### Logging
- **Authentication Events**: Login/logout tracking
- **Permission Events**: Permission check logging
- **Security Events**: Security incident logging
- **Performance Events**: Performance monitoring

---

**Authentication & Authorization Service** — Enterprise-grade security with SSO, RBAC, multi-tenant support, and comprehensive audit logging. 