FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    tar \
    gzip \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Create necessary directories
RUN mkdir -p /app/backup_data /app/backups /app/logs

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DATABASE_PATH=/app/backup_data/backup.db
ENV BACKUP_STORAGE_PATH=/app/backups
ENV BACKUP_RETENTION_DAYS=30
ENV MAX_BACKUP_SIZE_GB=10
ENV ENABLE_COMPRESSION=true
ENV ENABLE_ENCRYPTION=false

# Expose port
EXPOSE 8018

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8018/health || exit 1

# Run the application
CMD ["python", "main.py"] 