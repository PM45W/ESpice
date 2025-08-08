import { ArchitectureData } from '../types'

export const architectureData: ArchitectureData = {
  components: [
    // Frontend - Top left
    {
      id: 'frontend',
      name: 'Frontend',
      type: 'gateway',
      category: 'core',
      description: 'React + Tauri Desktop Application',
      longDescription: 'Modern desktop application built with React 18 and Tauri, providing a native user interface for PDF processing, parameter extraction, and SPICE model generation. Features advanced UI components, real-time progress tracking, and cross-platform compatibility.',
      features: [
        'PDF Viewer with annotation tools',
        'File upload and processing interface',
        'Parameter table and editing',
        'Model generation workflow',
        'Batch processing interface',
        'Cross-platform compatibility',
        'Real-time progress tracking',
        'Advanced error handling'
      ],
      technologies: ['React 18', 'TypeScript', 'Tauri', 'CSS', 'PDF.js', 'Framer Motion'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 100,
        responseTime: 50,
        errorRate: 0.1,
        cpuUsage: 15,
        memoryUsage: 256
      },
      businessMetrics: {
        userSatisfaction: 4.8,
        adoptionRate: 95,
        retentionRate: 92,
        featureUsage: 88
      },
      documentation: {
        overview: 'The frontend provides an intuitive interface for users to upload datasheets, view extracted parameters, and generate SPICE models.',
        api: 'Communicates with backend via Tauri IPC and REST APIs.',
        configuration: 'Configurable through environment variables and user preferences.',
        troubleshooting: 'Check browser console for errors. Verify file permissions for uploads.'
      },
      position: { x: 100, y: 100 },
    },

    // API Gateway - Top center
    {
      id: 'api-gateway',
      name: 'API Gateway',
      type: 'gateway',
      category: 'core',
      port: 8000,
      description: 'Central request routing and orchestration',
      longDescription: 'The API Gateway serves as the primary entry point for all client requests, providing authentication, rate limiting, request routing, and load balancing. Built with FastAPI for high performance and scalability.',
      features: [
        'Request routing and load balancing',
        'Authentication and authorization',
        'Rate limiting and throttling',
        'Request/response transformation',
        'API versioning',
        'Cross-origin resource sharing (CORS)',
        'Request logging and monitoring',
        'Circuit breaker pattern',
        'Health checks and failover'
      ],
      technologies: ['FastAPI', 'Python 3.11', 'JWT', 'Redis', 'Traefik'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 1500,
        responseTime: 45,
        errorRate: 0.1,
        cpuUsage: 25,
        memoryUsage: 512
      },
      businessMetrics: {
        uptime: 99.9,
        throughput: 1500,
        latency: 45,
        availability: 99.95
      },
      documentation: {
        overview: 'The API Gateway is built using FastAPI and serves as the central nervous system of the ESpice platform.',
        api: 'RESTful API with OpenAPI 3.0 specification. Supports JSON and multipart form data.',
        configuration: 'Environment-based configuration with support for multiple deployment environments.',
        troubleshooting: 'Comprehensive logging with structured JSON format. Health check endpoint available at /health.'
      },
      position: { x: 400, y: 100 },
    },

    // MCP Server - Top right
    {
      id: 'mcp-server',
      name: 'MCP Server',
      type: 'ai',
      category: 'core',
      port: 8001,
      description: 'AI Agent Orchestration',
      longDescription: 'Model Context Protocol server for AI agent orchestration and tool management, enabling intelligent workflow automation. Integrates with Ollama for local LLM processing and provides standardized communication for AI agents.',
      features: [
        'AI agent communication',
        'Tool registration and discovery',
        'Request routing and validation',
        'Response streaming',
        'Error handling and logging',
        'Plugin architecture',
        'Local LLM integration',
        'Workflow automation',
        'Intelligent processing'
      ],
      technologies: ['Python', 'MCP Protocol', 'FastAPI', 'Ollama', 'LangChain'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 200,
        responseTime: 1000,
        errorRate: 0.5,
        cpuUsage: 40,
        memoryUsage: 1024
      },
      businessMetrics: {
        automationRate: 85,
        accuracy: 99.5,
        processingSpeed: 5,
        costSavings: 50000
      },
      documentation: {
        overview: 'The MCP Server enables AI agents to interact with ESpice tools and services through a standardized protocol.',
        api: 'MCP Protocol implementation with custom tools for PDF processing, image analysis, and SPICE generation.',
        configuration: 'Configurable AI model endpoints and tool registrations.',
        troubleshooting: 'Check AI model availability and tool registration status.'
      },
      position: { x: 700, y: 100 },
    },

    // PDF Service
    {
      id: 'pdf-service',
      name: 'PDF Service',
      type: 'service',
      category: 'core',
      port: 8002,
      description: 'PDF processing and text extraction',
      longDescription: 'Specialized service for processing semiconductor datasheets in PDF format. Extracts text, tables, and metadata using advanced OCR and document analysis techniques with industry-leading accuracy.',
      features: [
        'PDF text extraction with OCR',
        'Table detection and extraction',
        'Metadata extraction',
        'Multi-page document processing',
        'Image extraction from PDFs',
        'Document validation and sanitization',
        'Batch processing support',
        'Quality assurance checks'
      ],
      technologies: ['Python', 'PyMuPDF', 'OpenCV', 'Tesseract OCR', 'NumPy'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 50,
        responseTime: 2000,
        errorRate: 0.5,
        cpuUsage: 60,
        memoryUsage: 1024
      },
      businessMetrics: {
        accuracy: 99.5,
        processingTime: 2,
        successRate: 98.5,
        throughput: 50
      },
      documentation: {
        overview: 'The PDF Service is responsible for extracting structured data from semiconductor datasheets.',
        api: 'REST API for PDF upload and processing. Supports batch processing and streaming responses.',
        configuration: 'Configurable OCR settings, supported languages, and processing timeouts.',
        troubleshooting: 'OCR accuracy can be improved by preprocessing images. Check log files for extraction errors.'
      },
      position: { x: 100, y: 300 },
    },

    // Image Service
    {
      id: 'image-service',
      name: 'Image Service',
      type: 'service',
      category: 'core',
      port: 8003,
      description: 'Image processing and curve extraction',
      longDescription: 'Advanced image processing service that extracts I-V curves, characteristic plots, and other graphical data from datasheet images using computer vision algorithms. Built with Rust for high performance.',
      features: [
        'I-V curve extraction',
        'Image preprocessing and enhancement',
        'Noise reduction and filtering',
        'Coordinate system detection',
        'Multi-curve analysis',
        'Data point extraction',
        'Quality validation',
        'Export to multiple formats'
      ],
      technologies: ['Rust', 'OpenCV', 'NumPy', 'SciPy', 'Image Processing'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 30,
        responseTime: 3000,
        errorRate: 1.2,
        cpuUsage: 80,
        memoryUsage: 2048
      },
      businessMetrics: {
        curveAccuracy: 99.2,
        processingSpeed: 3,
        dataQuality: 98.8,
        throughput: 30
      },
      documentation: {
        overview: 'The Image Service uses Rust for high-performance image processing and curve extraction.',
        api: 'REST API for image upload and processing. Returns extracted data points and curve metadata.',
        configuration: 'Configurable image processing parameters, supported formats, and quality settings.',
        troubleshooting: 'Curve extraction accuracy depends on image quality. Use preprocessing for better results.'
      },
      position: { x: 300, y: 300 },
    },

    // Table Service
    {
      id: 'table-service',
      name: 'Table Service',
      type: 'service',
      category: 'core',
      port: 8004,
      description: 'Table detection and data extraction',
      longDescription: 'Specialized service for detecting and extracting tabular data from datasheets, including parameter tables, specification tables, and test condition tables with high accuracy.',
      features: [
        'Table detection and recognition',
        'Cell extraction and parsing',
        'Header and footer detection',
        'Multi-table document processing',
        'Data validation and cleaning',
        'Export to various formats',
        'Quality scoring',
        'Batch processing'
      ],
      technologies: ['Python', 'OpenCV', 'Pandas', 'Tabula-py', 'NumPy'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 40,
        responseTime: 1500,
        errorRate: 0.8,
        cpuUsage: 45,
        memoryUsage: 768
      },
      businessMetrics: {
        tableAccuracy: 99.1,
        extractionSpeed: 1.5,
        dataQuality: 99.3,
        throughput: 40
      },
      documentation: {
        overview: 'The Table Service identifies and extracts structured data from datasheet tables.',
        api: 'REST API for table extraction. Returns structured data in JSON format.',
        configuration: 'Configurable table detection parameters and output formats.',
        troubleshooting: 'Table detection accuracy can be improved with preprocessing. Check for complex layouts.'
      },
      position: { x: 500, y: 300 },
    },

    // SPICE Service
    {
      id: 'spice-service',
      name: 'SPICE Service',
      type: 'service',
      category: 'core',
      port: 8005,
      description: 'SPICE model generation',
      longDescription: 'Core service responsible for generating SPICE models from extracted parameters and curves. Supports multiple device types and model formats with industry-leading accuracy and validation.',
      features: [
        'ASM-HEMT model generation',
        'MVSG model generation',
        'Standard MOSFET models',
        'Parameter optimization',
        'Model validation',
        'Multiple export formats',
        'Quality assurance',
        'Foundry compatibility'
      ],
      technologies: ['Python', 'NumPy', 'SciPy', 'SPICE', 'Optimization'],
      dependencies: ['pdf-service', 'image-service', 'table-service'],
      status: 'active',
      metrics: {
        requestsPerSecond: 20,
        responseTime: 5000,
        errorRate: 2.0,
        cpuUsage: 70,
        memoryUsage: 1536
      },
      businessMetrics: {
        modelAccuracy: 99.5,
        generationSpeed: 5,
        validationRate: 99.8,
        throughput: 20
      },
      documentation: {
        overview: 'The SPICE Service generates accurate SPICE models from extracted datasheet data.',
        api: 'REST API for model generation. Accepts extracted parameters and returns SPICE models.',
        configuration: 'Configurable model parameters, optimization settings, and output formats.',
        troubleshooting: 'Model accuracy depends on parameter quality. Use validation tools to verify results.'
      },
      position: { x: 700, y: 300 },
    },

    // Batch Processor
    {
      id: 'batch-processor',
      name: 'Batch Processor',
      type: 'service',
      category: 'production',
      port: 8006,
      description: 'Batch processing and queue management',
      longDescription: 'High-performance batch processing service for handling multiple datasheets simultaneously. Features queue management, progress tracking, and distributed processing capabilities.',
      features: [
        'Queue management',
        'Progress tracking',
        'Distributed processing',
        'Error handling',
        'Resource optimization',
        'Real-time monitoring',
        'Results aggregation',
        'Export capabilities'
      ],
      technologies: ['Python', 'Redis', 'Celery', 'FastAPI', 'WebSockets'],
      dependencies: ['api-gateway'],
      status: 'active',
      metrics: {
        requestsPerSecond: 100,
        responseTime: 10000,
        errorRate: 1.5,
        cpuUsage: 65,
        memoryUsage: 2048
      },
      businessMetrics: {
        throughput: 100,
        efficiency: 95,
        scalability: 10,
        costSavings: 75000
      },
      documentation: {
        overview: 'The Batch Processor handles large-scale processing of multiple datasheets efficiently.',
        api: 'REST API with WebSocket support for real-time progress updates.',
        configuration: 'Configurable queue settings, worker processes, and resource limits.',
        troubleshooting: 'Monitor queue length and worker health. Check Redis connection for queue issues.'
      },
      position: { x: 100, y: 500 },
    },

    // Test Correlation Service
    {
      id: 'test-correlation',
      name: 'Test Correlation',
      type: 'service',
      category: 'production',
      port: 8007,
      description: 'Model validation and correlation',
      longDescription: 'Advanced service for validating generated SPICE models against silicon data and test measurements. Provides correlation analysis and accuracy metrics.',
      features: [
        'Silicon correlation',
        'Test data analysis',
        'Accuracy metrics',
        'Tolerance checking',
        'Confidence scoring',
        'Report generation',
        'Multiple test types',
        'Export capabilities'
      ],
      technologies: ['Python', 'NumPy', 'SciPy', 'Pandas', 'Matplotlib'],
      dependencies: ['spice-service'],
      status: 'active',
      metrics: {
        requestsPerSecond: 15,
        responseTime: 8000,
        errorRate: 1.0,
        cpuUsage: 55,
        memoryUsage: 1536
      },
      businessMetrics: {
        correlationAccuracy: 99.2,
        validationSpeed: 8,
        confidenceLevel: 98.5,
        throughput: 15
      },
      documentation: {
        overview: 'The Test Correlation Service validates SPICE models against real silicon data.',
        api: 'REST API for correlation analysis and validation reporting.',
        configuration: 'Configurable tolerance settings and validation parameters.',
        troubleshooting: 'Ensure test data quality and format compatibility. Check correlation thresholds.'
      },
      position: { x: 300, y: 500 },
    },

    // Database
    {
      id: 'database',
      name: 'Database',
      type: 'database',
      category: 'data',
      description: 'SQLite + Redis Storage',
      longDescription: 'Data storage layer with SQLite for persistent data and Redis for caching, providing fast and reliable data access with enterprise-grade security and backup capabilities.',
      features: [
        'SQLite for persistent storage',
        'Redis for caching',
        'Data migration tools',
        'Backup and recovery',
        'Connection pooling',
        'Query optimization',
        'Data encryption',
        'Audit logging'
      ],
      technologies: ['SQLite', 'Redis', 'Prisma ORM', 'Python', 'Encryption'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 1000,
        responseTime: 5,
        errorRate: 0.01,
        cpuUsage: 10,
        memoryUsage: 512
      },
      businessMetrics: {
        uptime: 99.99,
        dataIntegrity: 100,
        backupSuccess: 100,
        securityScore: 100
      },
      documentation: {
        overview: 'The database layer provides persistent storage for products, parameters, and SPICE models.',
        api: 'Prisma ORM with TypeScript support. Redis for session and cache management.',
        configuration: 'Database connection strings and Redis configuration via environment variables.',
        troubleshooting: 'Monitor disk space and memory usage. Check connection pool settings.'
      },
      position: { x: 400, y: 500 },
    },

    // External APIs
    {
      id: 'external-apis',
      name: 'External APIs',
      type: 'infrastructure',
      category: 'infrastructure',
      description: 'Foundry Integration',
      longDescription: 'Integration with external foundry services and EDA tools for model validation and compatibility checking. Supports major foundries and EDA platforms.',
      features: [
        'TSMC PDK compatibility',
        'GlobalFoundries support',
        'Samsung Foundry integration',
        'LTSpice export format',
        'KiCad integration',
        'Model validation',
        'API rate limiting',
        'Error handling'
      ],
      technologies: ['REST APIs', 'OAuth2', 'Webhooks', 'JSON', 'HTTPS'],
      dependencies: [],
      status: 'active',
      metrics: {
        requestsPerSecond: 100,
        responseTime: 200,
        errorRate: 1.0,
        cpuUsage: 5,
        memoryUsage: 128
      },
      businessMetrics: {
        integrationSuccess: 99.5,
        foundrySupport: 15,
        edaCompatibility: 10,
        apiReliability: 99.8
      },
      documentation: {
        overview: 'External API integrations provide foundry-specific model validation and export capabilities.',
        api: 'RESTful APIs with authentication. Webhook support for real-time updates.',
        configuration: 'API keys and endpoints configured via environment variables.',
        troubleshooting: 'Check API rate limits and authentication. Monitor webhook delivery status.'
      },
      position: { x: 700, y: 500 },
    }
  ],
  connections: [
    {
      id: 'frontend-api',
      source: 'frontend',
      target: 'api-gateway',
      type: 'data',
      status: 'active',
      label: 'REST API Calls'
    },
    {
      id: 'api-mcp',
      source: 'api-gateway',
      target: 'mcp-server',
      type: 'orchestration',
      status: 'active',
      label: 'AI Processing'
    },
    {
      id: 'api-pdf',
      source: 'api-gateway',
      target: 'pdf-service',
      type: 'data',
      status: 'active',
      label: 'PDF Processing'
    },
    {
      id: 'api-image',
      source: 'api-gateway',
      target: 'image-service',
      type: 'data',
      status: 'active',
      label: 'Image Processing'
    },
    {
      id: 'api-table',
      source: 'api-gateway',
      target: 'table-service',
      type: 'data',
      status: 'active',
      label: 'Table Extraction'
    },
    {
      id: 'api-spice',
      source: 'api-gateway',
      target: 'spice-service',
      type: 'data',
      status: 'active',
      label: 'Model Generation'
    },
    {
      id: 'api-batch',
      source: 'api-gateway',
      target: 'batch-processor',
      type: 'data',
      status: 'active',
      label: 'Batch Processing'
    },
    {
      id: 'api-correlation',
      source: 'api-gateway',
      target: 'test-correlation',
      type: 'data',
      status: 'active',
      label: 'Test Correlation'
    },
    {
      id: 'pdf-spice',
      source: 'pdf-service',
      target: 'spice-service',
      type: 'data',
      status: 'active',
      label: 'Extracted Data'
    },
    {
      id: 'image-spice',
      source: 'image-service',
      target: 'spice-service',
      type: 'data',
      status: 'active',
      label: 'Curve Data'
    },
    {
      id: 'table-spice',
      source: 'table-service',
      target: 'spice-service',
      type: 'data',
      status: 'active',
      label: 'Parameter Data'
    },
    {
      id: 'spice-correlation',
      source: 'spice-service',
      target: 'test-correlation',
      type: 'data',
      status: 'active',
      label: 'Model Validation'
    },
    {
      id: 'services-db',
      source: 'pdf-service',
      target: 'database',
      type: 'storage',
      status: 'active',
      label: 'Data Persistence'
    },
    {
      id: 'spice-external',
      source: 'spice-service',
      target: 'external-apis',
      type: 'integration',
      status: 'active',
      label: 'Model Validation'
    },
    {
      id: 'frontend-db',
      source: 'frontend',
      target: 'database',
      type: 'query',
      status: 'active',
      label: 'Data Retrieval'
    },
    {
      id: 'batch-db',
      source: 'batch-processor',
      target: 'database',
      type: 'storage',
      status: 'active',
      label: 'Batch Results'
    },
    {
      id: 'correlation-db',
      source: 'test-correlation',
      target: 'database',
      type: 'storage',
      status: 'active',
      label: 'Validation Data'
    }
  ]
} 