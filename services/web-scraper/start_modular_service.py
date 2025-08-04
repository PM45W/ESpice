#!/usr/bin/env python3
"""
Startup script for the Modular Web Scraper Service
"""

import sys
import os
import logging
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('modular_web_scraper.log')
    ]
)

logger = logging.getLogger(__name__)

def main():
    """Main startup function"""
    try:
        logger.info("Starting Modular Web Scraper Service...")
        
        # Import and run the modular service
        from modular_main import app
        import uvicorn
        
        logger.info("Service initialized successfully")
        logger.info("Starting server on http://0.0.0.0:8011")
        
        # Run the service
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8011,
            log_level="info",
            reload=False
        )
        
    except ImportError as e:
        logger.error(f"Failed to import required modules: {e}")
        logger.error("Please ensure all dependencies are installed:")
        logger.error("pip install fastapi uvicorn aiohttp pandas openpyxl")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to start service: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 