# ESpice Architecture Document

**Version**: v4.0  
**Date**: July 2025  
**Project**: ESpice - Semiconductor SPICE Model Generation Platform  
**Architecture Type**: Microservices with Desktop Frontend  

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Architecture Patterns](#2-architecture-patterns)
3. [Technology Stack](#3-technology-stack)
4. [Component Architecture](#4-component-architecture)
5. [Data Flow](#5-data-flow)
6. [Security Architecture](#6-security-architecture)
7. [Performance Architecture](#7-performance-architecture)
8. [Deployment Architecture](#8-deployment-architecture)

---

## 1. System Overview

### 1.1 Architecture Vision
ESpice follows a hybrid architecture combining desktop application capabilities with microservices for automated processing. The system is designed for high performance, reliability, and scalability while maintaining data privacy through local processing.

### 1.2 Core Principles
- **Local-First**: All sensitive data processing occurs locally
- **Microservices**: Modular, scalable service architecture
- **AI/ML Integration**: Automated processing with human oversight
- **Cross-Platform**: Native desktop experience across platforms
- **Enterprise-Ready**: Security, monitoring, and compliance features

### 1.3 High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Desktop App   │    │   MCP Server    │    │  Microservices  │
│   (Tauri)       │◄──►│   (FastAPI)     │◄──►│   (Docker)      │
│                 │    │                 │    │                 │
│ • React UI      │    │ • PDF Processing│    │ • API Gateway   │
│ • Rust Backend  │    │ • Curve Extract │    │ • Auth Service  │
│ • Local Storage │    │ • SPICE Gen     │    │ • Batch Proc    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 2. Architecture Patterns

### 2.1 Microservices Pattern
- **Service Decomposition**: Each major function is a separate service
- **API Gateway**: Centralized routing and load balancing
- **Service Discovery**: Dynamic service registration and discovery
- **Circuit Breaker**: Fault tolerance and resilience

### 2.2 Event-Driven Architecture
- **Event Sourcing**: All state changes are events
- **CQRS**: Command Query Responsibility Segregation
- **Message Queues**: Asynchronous communication between services
- **Event Store**: Persistent event log for audit and replay

### 2.3 CQRS Pattern
- **Commands**: Write operations that change state
- **Queries**: Read operations that retrieve data
- **Event Handlers**: Process domain events
- **Projections**: Build read models from events

---

## 3. Technology Stack

### 3.1 Frontend (Desktop)
- **Framework**: Tauri 2.0 + React 18.3.1
- **Language**: TypeScript 5.6.2
- **Build Tool**: Vite 6.0.3
- **UI Library**: Lucide React
- **State Management**: React Context + Hooks
- **Styling**: CSS Modules + Design System

### 3.2 Backend (Rust)
- **Framework**: Tauri 2.0
- **Language**: Rust 2021
- **HTTP Client**: reqwest
- **Serialization**: serde
- **Async Runtime**: tokio
- **Error Handling**: anyhow + thiserror

### 3.3 MCP Server (Python)
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **OCR Engine**: Tesseract
- **Image Processing**: OpenCV
- **PDF Processing**: PyMuPDF
- **AI/ML**: PyTorch/TensorFlow

### 3.4 Microservices
- **API Gateway**: FastAPI + Traefik
- **Authentication**: JWT + OAuth2
- **Database**: PostgreSQL + Redis
- **Message Queue**: Redis Pub/Sub
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack

### 3.5 Infrastructure
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (production)
- **Hosting**: Railway/Render/Fly.io
- **CI/CD**: GitHub Actions
- **Testing**: Jest + Playwright

---

## 4. Component Architecture

### 4.1 Desktop Application Components

#### 4.1.1 UI Layer
```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main application layout
│   ├── FileUpload.tsx  # File upload interface
│   ├── ParameterTable.tsx # Parameter management
│   └── ManualAnnotationTool.tsx # PDF annotation
├── pages/              # Page components
│   ├── UploadPage.tsx  # Main upload workflow
│   ├── DocumentsPage.tsx # Document management
│   └── SettingsPage.tsx # Application settings
└── styles/             # CSS styling
```

#### 4.1.2 Service Layer
```
src/
├── services/           # Business logic services
│   ├── mcpService.ts   # MCP server communication
│   ├── pdfProcessor.ts # PDF processing logic
│   ├── database.ts     # Local database operations
│   └── curveExtractionService.ts # Curve extraction
├── hooks/              # Custom React hooks
└── utils/              # Utility functions
```

#### 4.1.3 Rust Backend
```
src-tauri/src/
├── main.rs            # Tauri application entry
├── lib.rs             # Core library functions
└── curve_extraction.rs # Rust curve extraction
```

### 4.2 MCP Server Components

#### 4.2.1 API Layer
```
mcp-server/
├── main.py            # FastAPI application
├── api/               # API endpoints
│   ├── pdf.py         # PDF processing endpoints
│   ├── curves.py      # Curve extraction endpoints
│   └── spice.py       # SPICE generation endpoints
└── middleware/        # Request/response middleware
```

#### 4.2.2 Processing Layer
```
mcp-server/
├── processors/        # Data processing modules
│   ├── pdf_processor.py # PDF text extraction
│   ├── curve_extractor.py # Curve digitization
│   └── spice_generator.py # SPICE model generation
├── models/            # Data models
└── utils/             # Utility functions
```

### 4.3 Microservices Architecture

#### 4.3.1 Service Components
```
services/
├── api-gateway/       # API Gateway service
├── auth-service/      # Authentication service
├── pdf-service/       # PDF processing service
├── image-service/     # Image processing service
├── table-service/     # Table data service
├── spice-service/     # SPICE generation service
├── batch-processor/   # Batch processing service
├── ai-agent/          # AI workflow orchestration
└── monitoring-service/ # System monitoring
```

---

## 5. Data Flow

### 5.1 PDF Processing Flow
```
1. User uploads PDF → Desktop App
2. Desktop App → MCP Server (PDF processing)
3. MCP Server → OCR + Text extraction
4. MCP Server → Table detection + Parameter extraction
5. MCP Server → Desktop App (extracted data)
6. Desktop App → Local database storage
```

### 5.2 Curve Extraction Flow
```
1. User annotates graph → Desktop App
2. Desktop App → MCP Server (image processing)
3. MCP Server → OpenCV curve extraction
4. MCP Server → Data validation + cleaning
5. MCP Server → Desktop App (curve data)
6. Desktop App → Parameter mapping
```

### 5.3 SPICE Generation Flow
```
1. Extracted parameters → MCP Server
2. MCP Server → Parameter validation
3. MCP Server → Model template selection
4. MCP Server → SPICE model generation
5. MCP Server → Model validation
6. MCP Server → Desktop App (SPICE model)
7. Desktop App → Export to file
```

---

## 6. Security Architecture

### 6.1 Data Security
- **Local Processing**: All sensitive data processed locally
- **Encryption**: AES-256 encryption for stored data
- **Secure Communication**: HTTPS/TLS for all network traffic
- **Input Validation**: Comprehensive input sanitization

### 6.2 Authentication & Authorization
- **JWT Tokens**: Stateless authentication
- **Role-Based Access**: User roles and permissions
- **Session Management**: Secure session handling
- **Audit Logging**: Complete audit trail

### 6.3 Network Security
- **API Gateway**: Centralized security controls
- **Rate Limiting**: DDoS protection
- **CORS**: Cross-origin resource sharing controls
- **Firewall**: Network-level security

---

## 7. Performance Architecture

### 7.1 Caching Strategy
- **Redis Cache**: Distributed caching layer
- **CDN**: Static asset delivery
- **Browser Cache**: Client-side caching
- **Database Cache**: Query result caching

### 7.2 Load Balancing
- **Round Robin**: Basic load distribution
- **Health Checks**: Service health monitoring
- **Auto Scaling**: Dynamic resource allocation
- **Circuit Breaker**: Fault tolerance

### 7.3 Optimization Techniques
- **Lazy Loading**: On-demand resource loading
- **Code Splitting**: Bundle optimization
- **Image Optimization**: Compressed image delivery
- **Database Indexing**: Query performance optimization

---

## 8. Deployment Architecture

### 8.1 Development Environment
```
┌─────────────────┐    ┌─────────────────┐
│   Local Dev     │    │   MCP Server    │
│   (Tauri)       │◄──►│   (localhost)   │
│   Port 5176     │    │   Port 8000     │
└─────────────────┘    └─────────────────┘
```

### 8.2 Production Environment
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Desktop App   │    │   API Gateway   │    │  Microservices  │
│   (Distributed) │◄──►│   (Railway)     │◄──►│   (Docker)      │
│                 │    │   Port 8000     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 8.3 Container Architecture
```yaml
version: '3.8'
services:
  api-gateway:
    image: espice/api-gateway
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  pdf-service:
    image: espice/pdf-service
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/espice
    depends_on:
      - db

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=espice
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
```

---

## 9. Monitoring & Observability

### 9.1 Metrics Collection
- **Application Metrics**: Response times, error rates
- **Infrastructure Metrics**: CPU, memory, disk usage
- **Business Metrics**: User actions, feature usage
- **Custom Metrics**: Processing times, accuracy rates

### 9.2 Logging Strategy
- **Structured Logging**: JSON format logs
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Log Aggregation**: Centralized log collection
- **Log Retention**: Configurable retention policies

### 9.3 Alerting
- **Performance Alerts**: Response time thresholds
- **Error Alerts**: Error rate thresholds
- **Infrastructure Alerts**: Resource usage thresholds
- **Business Alerts**: User experience issues

---

**Document Version**: v4.0  
**Last Updated**: July 2025  
**Next Review**: August 2025  
**Approved By**: Architecture Team
