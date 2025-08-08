# ESpice Architecture Overview

## System Architecture
ESpice follows a modular architecture with the following components:

### Core Services
- **PDF Service**: Handles PDF processing and text extraction
- **Curve Extraction**: Extracts I-V curves from datasheet graphs
- **SPICE Generation**: Generates SPICE models for semiconductor devices
- **Data Management**: Manages data storage and retrieval

### Applications
- **Desktop App**: Main Tauri-based desktop application
- **Web App**: Web-based interface (if needed)

### Utilities
- **Authentication**: User authentication and authorization
- **Monitoring**: System monitoring and health checks

## Technology Stack

### Frontend
- **React 18.3.1**: UI framework
- **TypeScript 5.6.2**: Type safety
- **Vite 6.0.3**: Build tool
- **Tauri 2**: Desktop app framework

### Backend Services
- **Python FastAPI**: Service APIs
- **Rust**: Performance-critical components
- **Prisma**: Database ORM
- **SQLite**: Local database

### Core Libraries
- **PDF.js**: PDF processing
- **OpenCV**: Image processing
- **NumPy/SciPy**: Scientific computing
- **Matplotlib**: Data visualization

## Data Flow

1. **PDF Upload** → PDF Service → Text/Table Extraction
2. **Image Upload** → Curve Extraction Service → I-V Curves
3. **Parameters** → SPICE Generation Service → SPICE Models
4. **All Data** → Data Management Service → Storage

## Service Communication

- **REST APIs**: Service-to-service communication
- **WebSocket**: Real-time updates
- **File System**: Local data storage
- **Database**: Structured data persistence

## Security

- **Local Processing**: All sensitive data processed locally
- **No Cloud Dependencies**: Complete offline functionality
- **User Authentication**: Optional user management
- **Data Encryption**: Sensitive data encryption at rest

## Performance

- **Parallel Processing**: Multi-threaded service execution
- **Caching**: Intelligent data caching
- **Lazy Loading**: On-demand resource loading
- **Memory Management**: Efficient memory usage

## Scalability

- **Microservices**: Independent service scaling
- **Modular Design**: Easy feature addition/removal
- **Plugin Architecture**: Extensible functionality
- **API Versioning**: Backward compatibility