# Batch Processor Service

The Batch Processor Service is an enterprise-ready microservice for large-scale, automated document processing in the ESpice platform. It enables users to submit, monitor, and manage batch jobs for extracting and modeling data from multiple PDF datasheets in parallel.

## Features
- Batch job creation and management
- File upload and validation
- Parallel processing of multiple documents
- Integration with the AI Agent for workflow orchestration
- Real-time job and batch status monitoring
- Retry and cancel failed jobs
- Persistent result storage (future: database integration)

## API Endpoints

### Health
- `GET /health` — Service health check

### Batch Management
- `POST /batch/create` — Create a new batch job (demo files)
- `POST /batch/upload` — Upload files and create a batch job
- `GET /batch/{batch_id}` — Get batch status and progress
- `GET /batch/{batch_id}/jobs` — Get all jobs in a batch
- `POST /batch/{batch_id}/cancel` — Cancel a batch job
- `POST /batch/{batch_id}/retry` — Retry failed jobs in a batch
- `GET /batches` — List all batches
- `DELETE /batch/{batch_id}` — Delete a batch and its jobs

## Example Usage

### 1. Create a Batch (Demo Files)
```bash
curl -X POST http://localhost:8007/batch/create \
  -H "Content-Type: application/json" \
  -d '{
    "batch_name": "Test Batch",
    "workflow_type": "full_extraction"
  }'
```

### 2. Upload Files for Batch Processing
```bash
curl -X POST http://localhost:8007/batch/upload \
  -F "files=@/path/to/datasheet1.pdf" \
  -F "files=@/path/to/datasheet2.pdf" \
  -F "request={\"batch_name\":\"My Batch\",\"workflow_type\":\"full_extraction\"};type=application/json"
```

### 3. Monitor Batch Status
```bash
curl http://localhost:8007/batch/{batch_id}
```

### 4. List All Batches
```bash
curl http://localhost:8007/batches
```

## Integration
- The batch-processor service communicates with the AI Agent (`ai-agent:8006`) to orchestrate document extraction workflows.
- It is designed to scale horizontally and can be extended with persistent storage and advanced scheduling.

## Configuration
- **Uploads directory:** `/app/uploads` (mounted to `./temp`)
- **Demo data directory:** `/app/data` (mounted to `./examples`)
- **Port:** 8007

## Development
```bash
cd services/batch-processor
pip install -r requirements.txt
python main.py
```

## Docker
- The service is included in `docker-compose.yml` and will be started with the rest of the ESpice stack.

## Future Enhancements
- Database-backed batch/job/result storage
- Advanced scheduling and prioritization
- Integration with version control and PDK validation services
- User authentication and access control

---

**Batch Processor Service** — Scalable, automated batch document processing for ESpice. 