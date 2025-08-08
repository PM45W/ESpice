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
RUN mkdir -p /app/load_balancer_data /app/logs

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DATABASE_PATH=/app/load_balancer_data/load_balancer.db
ENV HEALTH_CHECK_INTERVAL=30
ENV HEALTH_CHECK_TIMEOUT=5
ENV MAX_RETRIES=3
ENV SESSION_STICKINESS=true
ENV STICKY_SESSION_TIMEOUT=3600

# Expose port
EXPOSE 8019

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8019/health || exit 1

# Run the application
CMD ["python", "main.py"] 