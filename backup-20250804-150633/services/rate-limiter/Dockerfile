FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Create necessary directories
RUN mkdir -p /app/rate_limiter_data /app/logs

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DATABASE_PATH=/app/rate_limiter_data/rate_limiter.db
ENV DEFAULT_RATE_LIMIT=100
ENV DEFAULT_BURST_LIMIT=10
ENV CLEANUP_INTERVAL=3600
ENV ENABLE_THROTTLING=true

# Expose port
EXPOSE 8017

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8017/health || exit 1

# Run the application
CMD ["python", "main.py"] 