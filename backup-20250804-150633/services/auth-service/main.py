from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional, Union
import json
import logging
from datetime import datetime, timedelta
import uuid
from pathlib import Path
import aiofiles
import asyncio
import sqlite3
import os
from enum import Enum
import jwt
import bcrypt
import secrets
from dataclasses import dataclass
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Authentication & Authorization Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    ENGINEER = "engineer"
    VIEWER = "viewer"
    GUEST = "guest"

class Permission(str, Enum):
    # User management
    CREATE_USER = "create_user"
    READ_USER = "read_user"
    UPDATE_USER = "update_user"
    DELETE_USER = "delete_user"
    
    # Model management
    CREATE_MODEL = "create_model"
    READ_MODEL = "read_model"
    UPDATE_MODEL = "update_model"
    DELETE_MODEL = "delete_model"
    
    # Standard management
    CREATE_STANDARD = "create_standard"
    READ_STANDARD = "read_standard"
    UPDATE_STANDARD = "update_standard"
    DELETE_STANDARD = "delete_standard"
    
    # System management
    MANAGE_SYSTEM = "manage_system"
    VIEW_AUDIT_LOGS = "view_audit_logs"
    MANAGE_ORGANIZATIONS = "manage_organizations"

class AuthProvider(str, Enum):
    LOCAL = "local"
    SAML = "saml"
    OAUTH2 = "oauth2"
    OPENID_CONNECT = "openid_connect"
    LDAP = "ldap"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"

class Organization(BaseModel):
    org_id: str
    name: str
    description: str
    domain: str
    settings: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

class User(BaseModel):
    user_id: str
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole
    org_id: str
    status: UserStatus = UserStatus.ACTIVE
    auth_provider: AuthProvider = AuthProvider.LOCAL
    permissions: List[Permission] = []
    settings: Dict[str, Any] = {}
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class APIKey(BaseModel):
    key_id: str
    user_id: str
    name: str
    key_hash: str
    permissions: List[Permission] = []
    expires_at: Optional[datetime] = None
    last_used: Optional[datetime] = None
    created_at: datetime

class AuditLog(BaseModel):
    log_id: str
    user_id: str
    action: str
    resource_type: str
    resource_id: str
    details: Dict[str, Any] = {}
    ip_address: str
    user_agent: str
    timestamp: datetime

class LoginRequest(BaseModel):
    username: str
    password: str
    remember_me: bool = False

class SSORequest(BaseModel):
    provider: AuthProvider
    token: str
    redirect_uri: Optional[str] = None

class CreateUserRequest(BaseModel):
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole
    org_id: str
    password: Optional[str] = None
    auth_provider: AuthProvider = AuthProvider.LOCAL

class UpdateUserRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    permissions: Optional[List[Permission]] = None
    settings: Optional[Dict[str, Any]] = None

class CreateAPIKeyRequest(BaseModel):
    name: str
    permissions: List[Permission] = []
    expires_in_days: Optional[int] = None

# Security
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

class DatabaseManager:
    """Database manager for authentication and authorization"""
    
    def __init__(self, db_path: str = "/app/auth_data.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create organizations table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS organizations (
                org_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                domain TEXT UNIQUE,
                settings TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        
        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
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
            )
        ''')
        
        # Create API keys table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_keys (
                key_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                key_hash TEXT UNIQUE NOT NULL,
                permissions TEXT,
                expires_at TEXT,
                last_used TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''')
        
        # Create audit logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_logs (
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
            )
        ''')
        
        # Create sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token_hash TEXT UNIQUE NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''')
        
        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_org ON users (org_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id)')
        
        conn.commit()
        conn.close()
        
        # Initialize default data
        self.initialize_default_data()
    
    def initialize_default_data(self):
        """Initialize default organizations and admin user"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if default organization exists
            cursor.execute("SELECT org_id FROM organizations WHERE org_id = 'default'")
            if not cursor.fetchone():
                # Create default organization
                cursor.execute('''
                    INSERT INTO organizations VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    'default',
                    'Default Organization',
                    'Default organization for ESpice platform',
                    'espice.local',
                    json.dumps({}),
                    datetime.now().isoformat(),
                    datetime.now().isoformat()
                ))
            
            # Check if admin user exists
            cursor.execute("SELECT user_id FROM users WHERE username = 'admin'")
            if not cursor.fetchone():
                # Create admin user
                password_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt())
                cursor.execute('''
                    INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    str(uuid.uuid4()),
                    'admin',
                    'admin@espice.local',
                    'Admin',
                    'User',
                    password_hash.decode('utf-8'),
                    UserRole.ADMIN.value,
                    'default',
                    UserStatus.ACTIVE.value,
                    AuthProvider.LOCAL.value,
                    json.dumps([p.value for p in Permission]),
                    json.dumps({}),
                    None,
                    datetime.now().isoformat(),
                    datetime.now().isoformat()
                ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error initializing default data: {e}")
    
    def create_user(self, user: User, password: Optional[str] = None) -> bool:
        """Create a new user"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            password_hash = None
            if password:
                password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            cursor.execute('''
                INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user.user_id,
                user.username,
                user.email,
                user.first_name,
                user.last_name,
                password_hash,
                user.role.value,
                user.org_id,
                user.status.value,
                user.auth_provider.value,
                json.dumps([p.value for p in user.permissions]),
                json.dumps(user.settings),
                user.last_login.isoformat() if user.last_login else None,
                user.created_at.isoformat(),
                user.updated_at.isoformat()
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error creating user {user.username}: {e}")
            return False
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            row = cursor.fetchone()
            
            if row:
                user = User(
                    user_id=row[0],
                    username=row[1],
                    email=row[2],
                    first_name=row[3],
                    last_name=row[4],
                    role=UserRole(row[6]),
                    org_id=row[7],
                    status=UserStatus(row[8]),
                    auth_provider=AuthProvider(row[9]),
                    permissions=[Permission(p) for p in json.loads(row[10])] if row[10] else [],
                    settings=json.loads(row[11]) if row[11] else {},
                    last_login=datetime.fromisoformat(row[12]) if row[12] else None,
                    created_at=datetime.fromisoformat(row[13]),
                    updated_at=datetime.fromisoformat(row[14])
                )
                conn.close()
                return user
            
            conn.close()
            return None
        except Exception as e:
            logger.error(f"Error getting user by username: {e}")
            return None
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            
            if row:
                user = User(
                    user_id=row[0],
                    username=row[1],
                    email=row[2],
                    first_name=row[3],
                    last_name=row[4],
                    role=UserRole(row[6]),
                    org_id=row[7],
                    status=UserStatus(row[8]),
                    auth_provider=AuthProvider(row[9]),
                    permissions=[Permission(p) for p in json.loads(row[10])] if row[10] else [],
                    settings=json.loads(row[11]) if row[11] else {},
                    last_login=datetime.fromisoformat(row[12]) if row[12] else None,
                    created_at=datetime.fromisoformat(row[13]),
                    updated_at=datetime.fromisoformat(row[14])
                )
                conn.close()
                return user
            
            conn.close()
            return None
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None
    
    def verify_password(self, username: str, password: str) -> bool:
        """Verify user password"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
            row = cursor.fetchone()
            
            if row and row[0]:
                conn.close()
                return bcrypt.checkpw(password.encode('utf-8'), row[0].encode('utf-8'))
            
            conn.close()
            return False
        except Exception as e:
            logger.error(f"Error verifying password: {e}")
            return False
    
    def update_last_login(self, user_id: str):
        """Update user's last login time"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                "UPDATE users SET last_login = ? WHERE user_id = ?",
                (datetime.now().isoformat(), user_id)
            )
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error updating last login: {e}")
    
    def create_api_key(self, api_key: APIKey) -> bool:
        """Create API key"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO api_keys VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                api_key.key_id,
                api_key.user_id,
                api_key.name,
                api_key.key_hash,
                json.dumps([p.value for p in api_key.permissions]),
                api_key.expires_at.isoformat() if api_key.expires_at else None,
                api_key.last_used.isoformat() if api_key.last_used else None,
                api_key.created_at.isoformat()
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error creating API key: {e}")
            return False
    
    def get_api_key_by_hash(self, key_hash: str) -> Optional[APIKey]:
        """Get API key by hash"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM api_keys WHERE key_hash = ?", (key_hash,))
            row = cursor.fetchone()
            
            if row:
                api_key = APIKey(
                    key_id=row[0],
                    user_id=row[1],
                    name=row[2],
                    key_hash=row[3],
                    permissions=[Permission(p) for p in json.loads(row[4])] if row[4] else [],
                    expires_at=datetime.fromisoformat(row[5]) if row[5] else None,
                    last_used=datetime.fromisoformat(row[6]) if row[6] else None,
                    created_at=datetime.fromisoformat(row[7])
                )
                conn.close()
                return api_key
            
            conn.close()
            return None
        except Exception as e:
            logger.error(f"Error getting API key: {e}")
            return None
    
    def log_audit_event(self, audit_log: AuditLog) -> bool:
        """Log audit event"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO audit_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                audit_log.log_id,
                audit_log.user_id,
                audit_log.action,
                audit_log.resource_type,
                audit_log.resource_id,
                json.dumps(audit_log.details),
                audit_log.ip_address,
                audit_log.user_agent,
                audit_log.timestamp.isoformat()
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error logging audit event: {e}")
            return False

class AuthManager:
    """Authentication and authorization manager"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def create_jwt_token(self, user: User) -> str:
        """Create JWT token for user"""
        payload = {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value,
            "org_id": user.org_id,
            "permissions": [p.value for p in user.permissions],
            "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
            "iat": datetime.utcnow()
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    def verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid JWT token")
            return None
    
    def generate_api_key(self) -> str:
        """Generate API key"""
        return f"esp_{secrets.token_urlsafe(32)}"
    
    def hash_api_key(self, api_key: str) -> str:
        """Hash API key for storage"""
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    def check_permission(self, user_permissions: List[Permission], required_permission: Permission) -> bool:
        """Check if user has required permission"""
        return required_permission in user_permissions or Permission.MANAGE_SYSTEM in user_permissions

# Initialize services
db_manager = DatabaseManager()
auth_manager = AuthManager(db_manager)

# Dependency functions
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = auth_manager.verify_jwt_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db_manager.get_user_by_id(payload["user_id"])
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

async def get_current_user_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from API key"""
    token = credentials.credentials
    key_hash = auth_manager.hash_api_key(token)
    api_key = db_manager.get_api_key_by_hash(key_hash)
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if api_key.expires_at and api_key.expires_at < datetime.now():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db_manager.get_user_by_id(api_key.user_id)
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last used time
    api_key.last_used = datetime.now()
    db_manager.create_api_key(api_key)  # This will update the existing key
    
    return user

def require_permission(permission: Permission):
    """Decorator to require specific permission"""
    def permission_checker(user: User = Depends(get_current_user)):
        if not auth_manager.check_permission(user.permissions, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission.value}"
            )
        return user
    return permission_checker

async def log_audit_event(request: Request, user: User, action: str, resource_type: str, resource_id: str, details: Dict[str, Any] = {}):
    """Log audit event"""
    audit_log = AuditLog(
        log_id=str(uuid.uuid4()),
        user_id=user.user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent", "unknown"),
        timestamp=datetime.now()
    )
    db_manager.log_audit_event(audit_log)

@app.on_event("startup")
async def startup_event():
    """Initialize the authentication service"""
    logger.info("Authentication & Authorization Service starting up...")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "auth-service"}

# Authentication endpoints
@app.post("/auth/login")
async def login(request: Request, login_data: LoginRequest):
    """User login"""
    try:
        # Verify credentials
        if not db_manager.verify_password(login_data.username, login_data.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Get user
        user = db_manager.get_user_by_username(login_data.username)
        if not user or user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Update last login
        db_manager.update_last_login(user.user_id)
        
        # Generate JWT token
        token = auth_manager.create_jwt_token(user)
        
        # Log audit event
        await log_audit_event(request, user, "login", "user", user.user_id)
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "user_id": user.user_id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role.value,
                "org_id": user.org_id,
                "permissions": [p.value for p in user.permissions]
            }
        }
    except Exception as e:
        logger.error(f"Error during login: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/sso")
async def sso_login(request: Request, sso_data: SSORequest):
    """SSO login"""
    try:
        # This is a simplified SSO implementation
        # In production, you would integrate with actual SSO providers
        
        if sso_data.provider == AuthProvider.SAML:
            # SAML integration would go here
            raise HTTPException(status_code=501, detail="SAML not implemented")
        elif sso_data.provider == AuthProvider.OAUTH2:
            # OAuth2 integration would go here
            raise HTTPException(status_code=501, detail="OAuth2 not implemented")
        else:
            raise HTTPException(status_code=400, detail="Unsupported SSO provider")
            
    except Exception as e:
        logger.error(f"Error during SSO login: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/logout")
async def logout(request: Request, user: User = Depends(get_current_user)):
    """User logout"""
    try:
        # Log audit event
        await log_audit_event(request, user, "logout", "user", user.user_id)
        
        return {"message": "Successfully logged out"}
    except Exception as e:
        logger.error(f"Error during logout: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# User management endpoints
@app.post("/users")
async def create_user(
    request: Request,
    user_data: CreateUserRequest,
    current_user: User = Depends(require_permission(Permission.CREATE_USER))
):
    """Create new user"""
    try:
        # Check if username or email already exists
        existing_user = db_manager.get_user_by_username(user_data.username)
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Create user
        user = User(
            user_id=str(uuid.uuid4()),
            username=user_data.username,
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=user_data.role,
            org_id=user_data.org_id,
            auth_provider=user_data.auth_provider,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        if db_manager.create_user(user, user_data.password):
            # Log audit event
            await log_audit_event(request, current_user, "create_user", "user", user.user_id, {
                "created_user": user.username,
                "role": user.role.value
            })
            
            return {
                "success": True,
                "user_id": user.user_id,
                "message": "User created successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create user")
            
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/me")
async def get_current_user_info(user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "user_id": user.user_id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role.value,
        "org_id": user.org_id,
        "status": user.status.value,
        "permissions": [p.value for p in user.permissions],
        "last_login": user.last_login.isoformat() if user.last_login else None
    }

@app.get("/users")
async def get_users(
    current_user: User = Depends(require_permission(Permission.READ_USER)),
    org_id: Optional[str] = None,
    role: Optional[UserRole] = None,
    status: Optional[UserStatus] = None
):
    """Get users with filters"""
    try:
        # This would need to be implemented in DatabaseManager
        # For now, return a placeholder
        return {
            "users": [],
            "total": 0
        }
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# API Key management endpoints
@app.post("/api-keys")
async def create_api_key(
    request: Request,
    key_data: CreateAPIKeyRequest,
    current_user: User = Depends(get_current_user)
):
    """Create API key"""
    try:
        # Generate API key
        api_key_value = auth_manager.generate_api_key()
        key_hash = auth_manager.hash_api_key(api_key_value)
        
        # Create API key record
        api_key = APIKey(
            key_id=str(uuid.uuid4()),
            user_id=current_user.user_id,
            name=key_data.name,
            key_hash=key_hash,
            permissions=key_data.permissions,
            expires_at=datetime.now() + timedelta(days=key_data.expires_in_days) if key_data.expires_in_days else None,
            created_at=datetime.now()
        )
        
        if db_manager.create_api_key(api_key):
            # Log audit event
            await log_audit_event(request, current_user, "create_api_key", "api_key", api_key.key_id, {
                "key_name": key_data.name
            })
            
            return {
                "success": True,
                "key_id": api_key.key_id,
                "api_key": api_key_value,  # Only returned once
                "message": "API key created successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create API key")
            
    except Exception as e:
        logger.error(f"Error creating API key: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api-keys")
async def get_api_keys(current_user: User = Depends(get_current_user)):
    """Get user's API keys"""
    try:
        # This would need to be implemented in DatabaseManager
        # For now, return a placeholder
        return {
            "api_keys": [],
            "total": 0
        }
    except Exception as e:
        logger.error(f"Error getting API keys: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Audit logging endpoints
@app.get("/audit-logs")
async def get_audit_logs(
    request: Request,
    current_user: User = Depends(require_permission(Permission.VIEW_AUDIT_LOGS)),
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100
):
    """Get audit logs"""
    try:
        # This would need to be implemented in DatabaseManager
        # For now, return a placeholder
        return {
            "audit_logs": [],
            "total": 0
        }
    except Exception as e:
        logger.error(f"Error getting audit logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Permission checking endpoint
@app.post("/auth/check-permission")
async def check_permission(
    permission: Permission,
    user: User = Depends(get_current_user)
):
    """Check if user has specific permission"""
    has_permission = auth_manager.check_permission(user.permissions, permission)
    return {
        "has_permission": has_permission,
        "permission": permission.value,
        "user_permissions": [p.value for p in user.permissions]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8013) 