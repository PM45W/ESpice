import { ArchitectureData } from '../types'

export const architectureData: ArchitectureData = {
  components: [
    // API Gateway - Top center
    {
      id: 'api-gateway',
      name: 'API Gateway',
      type: 'gateway',
      category: 'core',
      port: 8000,
      description: 'Central request routing and orchestration layer',
      longDescription: 'The API Gateway serves as the primary entry point for all client requests, providing authentication, rate limiting, request routing, and load balancing. It acts as a reverse proxy and handles cross-cutting concerns like logging, monitoring, and security.',
      features: [
        'Request routing and load balancing',
        'Authentication and authorization',
        'Rate limiting and throttling',
        'Request/response transformation',
        'API versioning',
        'Cross-origin resource sharing (CORS)',
        'Request logging and monitoring'
      ],
      technologies: ['FastAPI', 'Python 3.11', 'JWT', 'Redis'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 1500,
        responseTime: 45,
        errorRate: 0.1,
        cpuUsage: 25,
        memoryUsage: 512
      },
      documentation: {
        overview: 'The API Gateway is built using FastAPI and serves as the central nervous system of the ESpice platform. It handles all incoming requests and routes them to the appropriate microservices based on the request path and method.',
        api: 'RESTful API with OpenAPI 3.0 specification. Supports JSON and multipart form data. All endpoints are versioned and documented.',
        configuration: 'Environment-based configuration with support for multiple deployment environments. Uses environment variables for sensitive configuration.',
        troubleshooting: 'Comprehensive logging with structured JSON format. Health check endpoint available at /health. Metrics exposed via Prometheus format.'
      },
      position: { x: 800, y: 100 },
    },

    // Core Services - Row1
    {
      id: 'pdf-service',
      name: 'PDF Service',
      type: 'service',
      category: 'core',
      port: 8002,
      description: 'PDF processing and text extraction',
      longDescription: 'Specialized service for processing semiconductor datasheets in PDF format. Extracts text, tables, and metadata using advanced OCR and document analysis techniques.',
      features: [
        'PDF text extraction with OCR',
        'Table detection and extraction',
        'Metadata extraction',
        'Multi-page document processing',
        'Image extraction from PDFs',
        'Document validation and sanitization'
      ],
      technologies: ['Python', 'PyMuPDF', 'OpenCV', 'Tesseract OCR'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 50,
        responseTime: 2000,
        errorRate: 0.5,
        cpuUsage: 60,
        memoryUsage: 1024
      },
      documentation: {
        overview: 'The PDF Service is responsible for extracting structured data from semiconductor datasheets. It uses advanced OCR techniques to handle scanned documents and complex layouts.',
        api: 'REST API for PDF upload and processing. Supports batch processing and streaming responses.',
        configuration: 'Configurable OCR settings, supported languages, and processing timeouts.',
        troubleshooting: 'OCR accuracy can be improved by preprocessing images. Check log files for extraction errors.'
      },
      position: { x: 200, y: 300 },
    },

    {
      id: 'image-service',
      name: 'Image Service',
      type: 'service',
      category: 'core',
      port: 8003,
      description: 'Image processing and curve extraction',
      longDescription: 'Advanced image processing service that extracts I-V curves, characteristic plots, and other graphical data from datasheet images using computer vision algorithms.',
      features: [
        'I-V curve extraction',
        'Image preprocessing and enhancement',
        'Noise reduction and filtering',
        'Coordinate system detection',
        'Multi-curve analysis',
        'Data point extraction'
      ],
      technologies: ['Rust', 'OpenCV', 'NumPy', 'SciPy'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 30,
        responseTime: 3000,
        errorRate: 1.2,
        cpuUsage: 80,
        memoryUsage: 2048
      },
      documentation: {
        overview: 'The Image Service uses Rust for high-performance image processing and curve extraction. It can handle various chart types and coordinate systems commonly found in datasheets.',
        api: 'REST API for image upload and processing. Returns extracted data points and curve metadata.',
        configuration: 'Configurable image processing parameters, supported formats, and quality settings.',
        troubleshooting: 'Curve extraction accuracy depends on image quality. Use preprocessing for better results.'
      },
      position: { x: 500, y: 300 },
    },

    {
      id: 'table-service',
      name: 'Table Service',
      type: 'service',
      category: 'core',
      port: 8004,
      description: 'Table detection and data extraction',
      longDescription: 'Specialized service for detecting and extracting tabular data from datasheets, including parameter tables, specification tables, and test condition tables.',
      features: [
        'Table detection and recognition',
        'Cell extraction and parsing',
        'Header and footer detection',
        'Multi-table document processing',
        'Data validation and cleaning',
        'Export to various formats'
      ],
      technologies: ['Python', 'OpenCV', 'Pandas', 'Tabula-py'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 40,
        responseTime: 1500,
        errorRate: 0.8,
        cpuUsage: 45,
        memoryUsage: 768
      },
      documentation: {
        overview: 'The Table Service identifies and extracts structured data from datasheet tables. It handles various table formats and layouts.',
        api: 'REST API for table extraction. Returns structured data in JSON format.',
        configuration: 'Configurable table detection parameters and output formats.',
        troubleshooting: 'Table detection accuracy can be improved with preprocessing. Check for complex layouts.'
      },
      position: { x: 800, y: 300 },
    },

    {
      id: 'spice-service',
      name: 'SPICE Service',
      type: 'service',
      category: 'core',
      port: 8005,
      description: 'SPICE model generation',
      longDescription: 'Core service responsible for generating SPICE models from extracted parameters and curves. Supports multiple device types and model formats.',
      features: [
        'ASM-HEMT model generation',
        'MVSG model generation',
        'Standard MOSFET models',
        'Parameter optimization',
        'Model validation',
        'Multiple export formats'
      ],
      technologies: ['Python', 'NumPy', 'SciPy', 'SPICE'],
      dependencies: ['pdf-service', 'image-service', 'table-service'],
      status: 'active',
      metrics: {
        requestsPerSecond: 20,
        responseTime: 5000,
        errorRate: 2.0,
        cpuUsage: 70,
        memoryUsage: 1536
      },
      documentation: {
        overview: 'The SPICE Service generates accurate SPICE models from extracted datasheet data. It supports multiple device types and optimization algorithms.',
        api: 'REST API for model generation. Accepts extracted parameters and returns SPICE models.',
        configuration: 'Configurable model parameters, optimization settings, and output formats.',
        troubleshooting: 'Model accuracy depends on parameter quality. Use validation tools to verify results.'
      },
      position: { x: 1100, y: 300 },
    },

    // AI Layer - Row2
    {
      id: 'ai-agent',
      name: 'AI Agent',
      type: 'ai',
      category: 'core',
      port: 8006,
      description: 'Workflow orchestration and AI coordination',
      longDescription: 'Intelligent agent that orchestrates the entire datasheet processing workflow using MCP tools and local LLM inference.',
      features: [
        'Workflow orchestration',
        'MCP tool integration',
        'Context-aware processing',
        'Error recovery and retry',
        'Learning and optimization',
        'Natural language processing'
      ],
      technologies: ['Python', 'Ollama', 'MCP Protocol', 'FastAPI'],
      dependencies: ['pdf-service', 'image-service', 'table-service', 'spice-service'],
      status: 'active',
      metrics: {
        requestsPerSecond: 10,
        responseTime: 8000,
        errorRate: 1.5,
        cpuUsage: 90,
        memoryUsage: 4096
      },
      documentation: {
        overview: 'The AI Agent coordinates all processing steps using local LLM inference and MCP tools. It makes intelligent decisions about processing order and error handling.',
        api: 'REST API for workflow orchestration. Accepts datasheets and returns complete processing results.',
        configuration: 'Configurable LLM models, MCP tools, and workflow parameters.',
        troubleshooting: 'Performance depends on LLM model size and hardware. Monitor memory usage.'
      },
      position: { x: 800, y: 500 },
    },

    // Production Services - Row3
    {
      id: 'batch-processor',
      name: 'Batch Processor',
      type: 'service',
      category: 'production',
      port: 8007,
      description: 'Enterprise batch processing',
      longDescription: 'High-performance batch processing service for handling large volumes of datasheets in enterprise environments.',
      features: [
        'High-volume processing',
        'Queue management',
        'Progress tracking',
        'Error handling',
        'Resource optimization',
        'Batch reporting'
      ],
      technologies: ['Python', 'Celery', 'Redis', 'PostgreSQL'],
      dependencies: ['ai-agent'],
      status: 'active',
      metrics: {
        requestsPerSecond: 100,
        responseTime: 10000,
        errorRate: 0.3,
        cpuUsage: 85,
        memoryUsage: 3072
      },
      documentation: {
        overview: 'The Batch Processor handles large-scale datasheet processing for enterprise customers. It uses queue-based processing for scalability.',
        api: 'REST API for batch job submission and monitoring. Supports job scheduling and cancellation.',
        configuration: 'Configurable queue settings, worker processes, and resource limits.',
        troubleshooting: 'Monitor queue length and worker health. Scale workers based on load.'
      },
      position: { x: 200, y: 700 },
    },

    {
      id: 'version-control',
      name: 'Version Control',
      type: 'service',
      category: 'production',
      port: 8008,
      description: 'Model versioning and management',
      longDescription: 'Comprehensive version control system for SPICE models with semantic versioning, rollback capabilities, and collaboration features.',
      features: [
        'Semantic versioning',
        'Model rollback',
        'Collaboration tools',
        'Change tracking',
        'Branch management',
        'Merge conflict resolution'
      ],
      technologies: ['Python', 'Git', 'SQLite', 'FastAPI'],
      dependencies: ['spice-service'],
      status: 'active',
      metrics: {
        requestsPerSecond: 80,
        responseTime: 300,
        errorRate: 0.1,
        cpuUsage: 30,
        memoryUsage: 512
      },
      documentation: {
        overview: 'The Version Control service manages SPICE model versions using Git-like semantics. It tracks changes and enables collaboration.',
        api: 'REST API for version management. Supports branching, merging, and rollback operations.',
        configuration: 'Configurable repository settings, backup policies, and access controls.',
        troubleshooting: 'Monitor repository size and cleanup old versions. Check for merge conflicts.'
      },
      position: { x: 500, y: 700 },
    },

    // Enterprise Services - Row4
    {
      id: 'auth-service',
      name: 'Auth Service',
      type: 'service',
      category: 'enterprise',
      port: 8013,
      description: 'Authentication and authorization',
      longDescription: 'Enterprise-grade authentication and authorization service with SSO support, role-based access control, and multi-tenant capabilities.',
      features: [
        'JWT authentication',
        'SSO integration',
        'Role-based access control',
        'Multi-tenant support',
        'API key management',
        'Audit logging'
      ],
      technologies: ['Python', 'FastAPI', 'JWT', 'SQLite', 'Redis'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 2000,
        responseTime: 50,
        errorRate: 0.05,
        cpuUsage: 20,
        memoryUsage: 256
      },
      documentation: {
        overview: 'The Auth Service provides secure authentication and authorization for the entire platform. It supports multiple authentication methods and fine-grained access control.',
        api: 'REST API for authentication and user management. OAuth2 and OpenID Connect support.',
        configuration: 'Configurable authentication providers, session settings, and security policies.',
        troubleshooting: 'Monitor failed login attempts and token expiration. Check SSO provider connectivity.'
      },
      position: { x: 800, y: 700 },
    },

    {
      id: 'notification-service',
      name: 'Notification Service',
      type: 'service',
      category: 'enterprise',
      port: 8014,
      description: 'Multi-channel notifications',
      longDescription: 'Comprehensive notification system supporting email, Slack, Teams, SMS, and webhook notifications with user preferences and delivery tracking.',
      features: [
        'Multi-channel delivery',
        'User preferences',
        'Delivery tracking',
        'Template management',
        'Rate limiting',
        'Retry mechanisms'
      ],
      technologies: ['Python', 'FastAPI', 'Celery', 'Redis', 'SMTP'],
      dependencies: ['auth-service'],
      status: 'active',
      metrics: {
        requestsPerSecond: 500,
        responseTime: 100,
        errorRate: 0.2,
        cpuUsage: 40,
        memoryUsage: 1024
      },
      documentation: {
        overview: 'The Notification Service handles all platform notifications across multiple channels. It supports templating and user preference management.',
        api: 'REST API for notification sending and management. Webhook support for external integrations.',
        configuration: 'Configurable delivery channels, templates, and rate limits.',
        troubleshooting: 'Monitor delivery rates and channel health. Check external service connectivity.'
      },
      position: { x: 1100, y: 700 },
    },

    // Infrastructure Services - Row5
    {
      id: 'monitoring-service',
      name: 'Monitoring Service',
      type: 'service',
      category: 'infrastructure',
      port: 8015,
      description: 'Observability and alerting',
      longDescription: 'Comprehensive monitoring and observability service providing APM, distributed tracing, log aggregation, and intelligent alerting.',
      features: [
        'Application performance monitoring',
        'Distributed tracing',
        'Log aggregation',
        'Metrics collection',
        'Intelligent alerting',
        'Dashboard creation'
      ],
      technologies: ['Python', 'Prometheus', 'Grafana', 'Jaeger', 'Elasticsearch'],
      dependencies: ['notification-service'],
      status: 'active',
      metrics: {
        requestsPerSecond: 1000,
        responseTime: 25,
        errorRate: 0.01,
        cpuUsage: 35,
        memoryUsage: 2048
      },
      documentation: {
        overview: 'The Monitoring Service provides comprehensive observability for the entire platform. It collects metrics, traces, and logs for analysis.',
        api: 'REST API for metrics and alerting. Prometheus-compatible metrics endpoint.',
        configuration: 'Configurable collection intervals, retention policies, and alert thresholds.',
        troubleshooting: 'Monitor storage usage and query performance. Check alert delivery.'
      },
      position: { x: 200, y: 900 },
    },

    {
      id: 'rate-limiter',
      name: 'Rate Limiter',
      type: 'service',
      category: 'infrastructure',
      port: 8017,
      description: 'API rate limiting and protection',
      longDescription: 'Advanced rate limiting service that protects APIs from abuse while ensuring fair usage across different user tiers and endpoints.',
      features: [
        'Per-user rate limiting',
        'Endpoint-specific limits',
        'Tier-based quotas',
        'Burst handling',
        'Rate limit headers',
        'Analytics and reporting'
      ],
      technologies: ['Python', 'Redis', 'FastAPI', 'Sliding window'],
      dependencies: ['monitoring-service'],
      status: 'active',
      metrics: {
        requestsPerSecond: 5000,
        responseTime: 10,
        errorRate: 0.001,
        cpuUsage: 15,
        memoryUsage: 512
      },
      documentation: {
        overview: 'The Rate Limiter protects the platform from abuse while ensuring fair usage. It supports complex rate limiting strategies.',
        api: 'REST API for rate limit management. Standard rate limit headers in responses.',
        configuration: 'Configurable rate limits, burst allowances, and user tiers.',
        troubleshooting: 'Monitor rate limit hits and adjust limits as needed. Check Redis connectivity.'
      },
      position: { x: 500, y: 900 },
    },

    {
      id: 'load-balancer',
      name: 'Load Balancer',
      type: 'service',
      category: 'infrastructure',
      port: 8019,
      description: 'Traffic distribution and HA',
      longDescription: 'High-performance load balancer providing traffic distribution, health checking, session stickiness, and automatic failover.',
      features: [
        'Load distribution',
        'Health checking',
        'Session stickiness',
        'Automatic failover',
        'SSL termination',
        'Traffic analytics'
      ],
      technologies: ['Nginx', 'HAProxy', 'Docker', 'Consul'],
      dependencies: ['rate-limiter'],
      status: 'active',
      metrics: {
        requestsPerSecond: 10000,
        responseTime: 5,
        errorRate: 0.001,
        cpuUsage: 25,
        memoryUsage: 1024
      },
      documentation: {
        overview: 'The Load Balancer distributes traffic across multiple service instances for high availability and performance.',
        api: 'Management API for configuration and monitoring. Health check endpoints.',
        configuration: 'Configurable load balancing algorithms, health checks, and SSL settings.',
        troubleshooting: 'Monitor backend health and traffic distribution. Check SSL certificate expiration.'
      },
      position: { x: 800, y: 900 },
    },

    // Data Layer - Row6
    {
      id: 'redis-cache',
      name: 'Redis Cache',
      type: 'cache',
      category: 'data',
      port: 6379,
      description: 'High-performance caching layer',
      longDescription: 'Redis-based caching layer providing fast access to frequently used data, session storage, and distributed locking.',
      features: [
        'Key-value caching',
        'Session storage',
        'Distributed locking',
        'Pub/sub messaging',
        'Data persistence',
        'Cluster support'
      ],
      technologies: ['Redis', 'Python', 'Docker'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 50000,
        responseTime: 1,
        errorRate: 0.001,
        cpuUsage: 40,
        memoryUsage: 4096
      },
      documentation: {
        overview: 'Redis provides high-performance caching for the platform. It stores sessions, cache data, and supports distributed operations.',
        api: 'Redis protocol for data access. Connection pooling and failover support.',
        configuration: 'Configurable memory limits, persistence settings, and cluster configuration.',
        troubleshooting: 'Monitor memory usage and eviction rates. Check cluster health and replication.'
      },
      position: { x: 1100, y: 900 },
    },

    {
      id: 'sqlite-db',
      name: 'SQLite Database',
      type: 'database',
      category: 'data',
      port: 0,
      description: 'Persistent data storage',
      longDescription: 'SQLite-based persistent storage for user data, models, configurations, and audit logs with ACID compliance.',
      features: [
        'ACID compliance',
        'Data persistence',
        'Backup and recovery',
        'Transaction support',
        'Index optimization',
        'Data integrity'
      ],
      technologies: ['SQLite', 'Python', 'SQLAlchemy'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 1000,
        responseTime: 50,
        errorRate: 0.01,
        cpuUsage: 30,
        memoryUsage: 2048
      },
      documentation: {
        overview: 'SQLite provides reliable persistent storage for the platform. It stores user data, models, and configuration.',
        api: 'SQL interface through SQLAlchemy ORM. Connection pooling and transaction management.',
        configuration: 'Configurable database settings, backup policies, and performance tuning.',
        troubleshooting: 'Monitor database size and query performance. Regular backups and maintenance.'
      },
      position: { x: 1400, y: 900 },
    }
  ],

  connections: [
    // API Gateway connections
    { id: 'gw-pdf', source: 'api-gateway', target: 'pdf-service', type: 'http', status: 'active' },
    { id: 'gw-image', source: 'api-gateway', target: 'image-service', type: 'http', status: 'active' },
    { id: 'gw-table', source: 'api-gateway', target: 'table-service', type: 'http', status: 'active' },
    { id: 'gw-spice', source: 'api-gateway', target: 'spice-service', type: 'http', status: 'active' },
    { id: 'gw-ai', source: 'api-gateway', target: 'ai-agent', type: 'http', status: 'active' },
    { id: 'gw-batch', source: 'api-gateway', target: 'batch-processor', type: 'http', status: 'active' },
    { id: 'gw-version', source: 'api-gateway', target: 'version-control', type: 'http', status: 'active' },
    { id: 'gw-auth', source: 'api-gateway', target: 'auth-service', type: 'http', status: 'active' },
    { id: 'gw-notification', source: 'api-gateway', target: 'notification-service', type: 'http', status: 'active' },
    { id: 'gw-monitoring', source: 'api-gateway', target: 'monitoring-service', type: 'http', status: 'active' },
    { id: 'gw-rate', source: 'api-gateway', target: 'rate-limiter', type: 'http', status: 'active' },
    { id: 'gw-load', source: 'api-gateway', target: 'load-balancer', type: 'http', status: 'active' },

    // AI Agent connections
    { id: 'ai-pdf', source: 'ai-agent', target: 'pdf-service', type: 'http', status: 'active' },
    { id: 'ai-image', source: 'ai-agent', target: 'image-service', type: 'http', status: 'active' },
    { id: 'ai-table', source: 'ai-agent', target: 'table-service', type: 'http', status: 'active' },
    { id: 'ai-spice', source: 'ai-agent', target: 'spice-service', type: 'http', status: 'active' },

    // Service to database connections
    { id: 'auth-db', source: 'auth-service', target: 'sqlite-db', type: 'database', status: 'active' },
    { id: 'version-db', source: 'version-control', target: 'sqlite-db', type: 'database', status: 'active' },
    { id: 'monitoring-db', source: 'monitoring-service', target: 'sqlite-db', type: 'database', status: 'active' },

    // Cache connections
    { id: 'gw-cache', source: 'api-gateway', target: 'redis-cache', type: 'cache', status: 'active' },
    { id: 'auth-cache', source: 'auth-service', target: 'redis-cache', type: 'cache', status: 'active' },
    { id: 'rate-cache', source: 'rate-limiter', target: 'redis-cache', type: 'cache', status: 'active' },

    // Infrastructure connections
    { id: 'notification-monitoring', source: 'notification-service', target: 'monitoring-service', type: 'http', status: 'active' },
    { id: 'rate-monitoring', source: 'rate-limiter', target: 'monitoring-service', type: 'http', status: 'active' },
    { id: 'load-rate', source: 'load-balancer', target: 'rate-limiter', type: 'http', status: 'active' }
  ]
} 