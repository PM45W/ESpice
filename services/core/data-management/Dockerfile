FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Create necessary directories
RUN mkdir -p /app/analytics_data /app/reports /app/logs

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DATABASE_PATH=/app/analytics_data/analytics.db
ENV REPORT_STORAGE_PATH=/app/reports
ENV CACHE_TTL=3600
ENV MAX_WORKERS=4

# Expose port
EXPOSE 8016

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8016/health || exit 1

# Run the application
CMD ["python", "main.py"] 