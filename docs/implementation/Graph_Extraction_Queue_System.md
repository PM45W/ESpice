# Graph Extraction Queue System - Technical Specification

## Overview

The Graph Extraction Queue System is an interconnected architecture that enables:
- **Multi-image upload** to product database
- **Automated/manual queue processing** for graph extraction
- **Real-time monitoring** of extraction progress
- **Integrated workflow** from upload to SPICE model generation
- **Product database storage** for all extracted data

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    ESpice Desktop Application                   │
├─────────────────────────────────────────────────────────────────┤
│  Product Management  │  Graph Extraction  │  SPICE Extraction  │
│  (Multi-Image Upload)│  (Queue Interface) │  (Model Generation)│
└─────────────────────┼─────────────────────┼─────────────────────┘
                      │                     │
                      ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Microservices Layer                          │
├─────────────────────────────────────────────────────────────────┤
│ Graph Queue Service │ Curve Extraction │ SPICE Service         │
│ (Port 8008)        │ Service (8002)   │ (Port 8005)           │
└─────────────────────┼───────────────────┼───────────────────────┘
                      │                   │
                      ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer                                   │
├─────────────────────────────────────────────────────────────────┤
│                    Product Database (SQLite)                    │
│  Products │ Graph Images │ Extraction Jobs │ Results │ Models  │
└─────────────────────────────────────────────────────────────────┘
```

### Service Communication Flow
1. **Upload Phase**: Product Management → Product Database
2. **Queue Phase**: Product Database → Graph Queue Service
3. **Processing Phase**: Graph Queue Service → Curve Extraction Service
4. **Storage Phase**: Curve Extraction Service → Product Database
5. **SPICE Phase**: Product Database → SPICE Service

## Database Schema Design

### New Models

#### GraphImage Model
```prisma
model GraphImage {
  id          String   @id @default(uuid())
  productId   String
  filename    String
  filePath    String   // Local file system path
  uploadDate  DateTime @default(now())
  description String?
  status      String   @default("pending") // pending, processing, completed, failed
  fileSize    Int?     // File size in bytes
  mimeType    String?  // image/png, image/jpeg, etc.
  dimensions  Json?    // {width: number, height: number}
  extractionJobs GraphExtractionJob[]
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([productId])
  @@index([status])
}
```

#### GraphExtractionJob Model
```prisma
model GraphExtractionJob {
  id          String   @id @default(uuid())
  productId   String
  imageId     String
  queueId     String?
  status      String   @default("pending") // pending, queued, processing, completed, failed
  priority    String   @default("normal") // low, normal, high, urgent
  progress    Int      @default(0) // 0-100 percentage
  result      Json?    // Temporary result data
  error       String?  // Error message if failed
  extractionMethod String @default("standard") // standard, legacy, llm
  parameters  Json?    // Extraction parameters (thresholds, filters, etc.)
  startedAt   DateTime?
  completedAt DateTime?
  estimatedDuration Int? // Estimated processing time in seconds
  actualDuration Int?   // Actual processing time in seconds
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  image       GraphImage @relation(fields: [imageId], references: [id], onDelete: Cascade)
  queue       GraphExtractionQueue? @relation(fields: [queueId], references: [id])
  result      GraphExtractionResult?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([productId])
  @@index([status])
  @@index([priority])
  @@index([queueId])
}
```

#### GraphExtractionResult Model
```prisma
model GraphExtractionResult {
  id          String   @id @default(uuid())
  jobId       String   @unique
  csvFilePath String   // Path to generated CSV file
  csvData     Json?    // Structured CSV data for quick access
  metadata    Json?    // Extraction metadata (confidence, method, etc.)
  confidence  Float    @default(1.0) // 0.0-1.0 confidence score
  dataPoints  Int?     // Number of extracted data points
  processingTime Float? // Processing time in seconds
  extractionMethod String // Method used (standard, legacy, llm)
  parameters  Json?    // Parameters used for extraction
  job         GraphExtractionJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### GraphExtractionQueue Model
```prisma
model GraphExtractionQueue {
  id          String   @id @default(uuid())
  name        String   // Queue name (e.g., "default", "high-priority")
  mode        String   @default("automatic") // automatic, manual
  status      String   @default("active") // active, paused, stopped
  maxConcurrentJobs Int @default(3) // Maximum concurrent processing
  priority    String   @default("fifo") // fifo, priority, custom
  description String?
  settings    Json?    // Queue-specific settings
  jobs        GraphExtractionJob[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Updated Product Model
```prisma
model Product {
  id              String   @id @default(uuid())
  name            String
  manufacturer    String
  partNumber      String   @unique
  deviceType      String   // GaN-HEMT, SiC-MOSFET, Si-MOSFET, etc.
  package         String?
  description     String?
  datasheets      Datasheet[]
  spiceModels     SPICEModel[]
  parameters      ProductParameter[]
  extractionJobs  ExtractionJob[]
  graphImages     GraphImage[]        // NEW: Graph images
  graphExtractionJobs GraphExtractionJob[] // NEW: Graph extraction jobs
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## Microservice Specifications

### Graph Queue Service (Port 8008)

#### API Endpoints
```python
# Queue Management
POST   /api/queue/create              # Create new queue
GET    /api/queue/{queue_id}          # Get queue status
PUT    /api/queue/{queue_id}          # Update queue settings
DELETE /api/queue/{queue_id}          # Delete queue
GET    /api/queues                    # List all queues

# Job Management
POST   /api/job/create                # Create extraction job
GET    /api/job/{job_id}              # Get job status
PUT    /api/job/{job_id}/priority     # Update job priority
DELETE /api/job/{job_id}              # Cancel job
POST   /api/job/{job_id}/retry        # Retry failed job

# Batch Operations
POST   /api/batch/create              # Create batch of jobs
GET    /api/batch/{batch_id}          # Get batch status
POST   /api/batch/{batch_id}/cancel   # Cancel entire batch

# Real-time Monitoring
WS     /ws/queue/{queue_id}           # WebSocket for real-time updates
WS     /ws/job/{job_id}               # WebSocket for job updates

# Statistics
GET    /api/stats/queue/{queue_id}    # Queue statistics
GET    /api/stats/global              # Global statistics
```

#### Core Components
```python
class GraphQueueService:
    def __init__(self):
        self.queues = {}  # Queue instances
        self.job_processor = JobProcessor()
        self.websocket_manager = WebSocketManager()
        self.db_client = DatabaseClient()
    
    async def create_queue(self, config: QueueConfig) -> str:
        """Create new processing queue"""
        
    async def add_job(self, queue_id: str, job: ExtractionJob) -> str:
        """Add job to queue"""
        
    async def process_queue(self, queue_id: str):
        """Process jobs in queue"""
        
    async def get_queue_status(self, queue_id: str) -> QueueStatus:
        """Get current queue status"""
```

### Enhanced Curve Extraction Service (Port 8002)

#### New Endpoints
```python
# Product Database Integration
GET    /api/product/{product_id}/images     # Get product images
POST   /api/product/{product_id}/extract    # Extract from product images
GET    /api/product/{product_id}/results    # Get extraction results

# Queue Integration
POST   /api/queue/job/{job_id}/process      # Process specific job
PUT    /api/queue/job/{job_id}/status       # Update job status
POST   /api/queue/job/{job_id}/result       # Store job result

# Enhanced Extraction
POST   /api/extract/legacy                 # Legacy algorithm
POST   /api/extract/llm                    # LLM-assisted extraction
POST   /api/extract/standard               # Standard extraction
```

## Frontend Components

### ProductManagementPage Enhancements
```typescript
interface ProductManagementPage {
  // Multi-image upload
  uploadZone: MultiImageUploadZone;
  imagePreview: ImagePreviewGrid;
  imageMetadata: ImageMetadataForm;
  
  // Product management
  productList: ProductList;
  productDetails: ProductDetails;
  imageGallery: ImageGallery;
  
  // Integration
  extractionStatus: ExtractionStatusIndicator;
  quickExtract: QuickExtractButton;
}
```

### QueueMonitorPage (New)
```typescript
interface QueueMonitorPage {
  // Real-time monitoring
  queueStatus: QueueStatusDashboard;
  jobProgress: JobProgressList;
  statistics: QueueStatistics;
  
  // Manual control
  queueControls: QueueControlPanel;
  jobManagement: JobManagementPanel;
  batchOperations: BatchOperationPanel;
  
  // WebSocket integration
  realTimeUpdates: WebSocketManager;
  notifications: NotificationSystem;
}
```

### Enhanced GraphExtractionPage
```typescript
interface GraphExtractionPage {
  // Existing features
  fileUpload: FileUploadZone;
  extractionTabs: ExtractionMethodTabs;
  resultsDisplay: ResultsDisplay;
  
  // New queue features
  queueMode: QueueModeToggle;
  manualQueue: ManualQueueInterface;
  jobPriority: JobPrioritySelector;
  batchProcessing: BatchProcessingPanel;
}
```

## Data Flow Implementation

### 1. Image Upload Flow
```typescript
// ProductManagementPage.tsx
const handleImageUpload = async (files: File[]) => {
  // 1. Upload images to product
  const uploadedImages = await uploadImagesToProduct(productId, files);
  
  // 2. Create extraction jobs
  const jobs = await createExtractionJobs(productId, uploadedImages);
  
  // 3. Add to queue (automatic or manual)
  if (autoQueue) {
    await addJobsToQueue(jobs);
  }
  
  // 4. Update UI
  updateProductImages(uploadedImages);
  showExtractionStatus(jobs);
};
```

### 2. Queue Processing Flow
```python
# graph_queue_service.py
async def process_queue(queue_id: str):
    queue = await get_queue(queue_id)
    
    while queue.status == "active":
        # Get next job
        job = await get_next_job(queue_id)
        if not job:
            await asyncio.sleep(1)
            continue
        
        # Update job status
        await update_job_status(job.id, "processing")
        
        try:
            # Process with curve extraction service
            result = await curve_extraction_service.process_job(job)
            
            # Store result in database
            await store_extraction_result(job.id, result)
            
            # Update job status
            await update_job_status(job.id, "completed")
            
            # Notify via WebSocket
            await notify_job_completion(job.id, result)
            
        except Exception as e:
            await update_job_status(job.id, "failed", str(e))
```

### 3. SPICE Integration Flow
```typescript
// SPICE extraction service
const processFromProductDatabase = async (productId: string) => {
  // 1. Get extraction results from product
  const results = await getExtractionResults(productId);
  
  // 2. Process each result
  for (const result of results) {
    const spiceModel = await generateSpiceModel(result.csvData);
    await storeSpiceModel(productId, spiceModel);
  }
  
  // 3. Update product status
  await updateProductStatus(productId, "spice_models_generated");
};
```

## Real-Time Monitoring

### WebSocket Events
```typescript
interface WebSocketEvents {
  // Queue events
  'queue:status_changed': QueueStatusEvent;
  'queue:job_added': JobAddedEvent;
  'queue:job_completed': JobCompletedEvent;
  'queue:job_failed': JobFailedEvent;
  
  // Progress events
  'job:progress_updated': JobProgressEvent;
  'job:status_changed': JobStatusEvent;
  
  // System events
  'system:service_status': ServiceStatusEvent;
  'system:error': ErrorEvent;
}
```

### Real-Time Updates
```typescript
// QueueMonitorPage.tsx
const useQueueWebSocket = (queueId: string) => {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>();
  const [jobs, setJobs] = useState<Job[]>([]);
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8008/ws/queue/${queueId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'queue:status_changed':
          setQueueStatus(data.payload);
          break;
        case 'job:progress_updated':
          updateJobProgress(data.payload);
          break;
        case 'job:completed':
          handleJobCompletion(data.payload);
          break;
      }
    };
    
    return () => ws.close();
  }, [queueId]);
  
  return { queueStatus, jobs };
};
```

## Performance Considerations

### Queue Processing Optimization
- **Concurrent Processing**: Configurable number of concurrent jobs
- **Priority Queuing**: FIFO, priority-based, or custom ordering
- **Resource Management**: Memory and CPU usage monitoring
- **Error Recovery**: Automatic retry with exponential backoff

### Database Optimization
- **Indexing**: Proper indexes on frequently queried fields
- **Connection Pooling**: Efficient database connection management
- **Batch Operations**: Bulk insert/update operations
- **Caching**: Redis caching for frequently accessed data

### Real-Time Performance
- **WebSocket Connection Pooling**: Efficient WebSocket management
- **Event Batching**: Batch multiple events to reduce network overhead
- **Client-Side Caching**: Cache data to reduce server requests
- **Progressive Loading**: Load data incrementally for large datasets

## Security Considerations

### Authentication & Authorization
- **JWT Tokens**: Secure authentication for API endpoints
- **Role-Based Access**: Different permissions for different user roles
- **API Rate Limiting**: Prevent abuse of queue resources
- **Input Validation**: Validate all user inputs

### Data Security
- **File Upload Validation**: Validate uploaded image files
- **Path Traversal Protection**: Prevent directory traversal attacks
- **SQL Injection Prevention**: Use parameterized queries
- **Data Encryption**: Encrypt sensitive data at rest

## Testing Strategy

### Unit Tests
- **Service Layer**: Test individual service functions
- **Database Layer**: Test database operations and queries
- **API Endpoints**: Test all API endpoints with various inputs
- **WebSocket Events**: Test real-time event handling

### Integration Tests
- **End-to-End Workflow**: Test complete workflow from upload to SPICE
- **Service Communication**: Test inter-service communication
- **Database Integration**: Test database operations with real data
- **WebSocket Integration**: Test real-time updates

### Performance Tests
- **Load Testing**: Test system under high load
- **Concurrent Users**: Test with multiple concurrent users
- **Large Batches**: Test with large batch operations
- **Memory Usage**: Monitor memory usage during operations

## Deployment Considerations

### Service Deployment
- **Docker Containers**: Containerize all services
- **Docker Compose**: Orchestrate service deployment
- **Health Checks**: Implement health check endpoints
- **Graceful Shutdown**: Handle service shutdown gracefully

### Database Migration
- **Schema Migration**: Migrate existing database schema
- **Data Migration**: Migrate existing data to new schema
- **Backup Strategy**: Implement backup and recovery procedures
- **Rollback Plan**: Plan for rollback in case of issues

### Monitoring & Logging
- **Application Logging**: Comprehensive logging for debugging
- **Performance Monitoring**: Monitor service performance
- **Error Tracking**: Track and alert on errors
- **Usage Analytics**: Track system usage patterns

## Success Metrics

### Performance Metrics
- **Processing Time**: Average time to process single image (< 30 seconds)
- **Queue Throughput**: Images processed per hour (> 100/hour)
- **Error Rate**: Percentage of failed extractions (< 5%)
- **Response Time**: API response time (< 2 seconds)

### User Experience Metrics
- **Upload Success Rate**: Percentage of successful uploads (> 95%)
- **Real-Time Updates**: WebSocket connection reliability (> 99%)
- **UI Responsiveness**: Page load time (< 3 seconds)
- **User Satisfaction**: User feedback scores (> 4.0/5.0)

### System Reliability Metrics
- **Service Uptime**: System availability (> 99.5%)
- **Data Consistency**: Database consistency checks
- **Error Recovery**: Time to recover from errors (< 5 minutes)
- **Backup Success**: Backup completion rate (> 99%)

This technical specification provides a comprehensive blueprint for implementing the interconnected graph extraction queue system, ensuring scalability, reliability, and user satisfaction. 