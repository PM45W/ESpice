#!/usr/bin/env python3
"""
Simple script to start the web scraper service for testing
"""

import subprocess
import sys
import os
from pathlib import Path

def main():
    """Start the web scraper service"""
    
    # Get the directory where this script is located
    script_dir = Path(__file__).parent
    main_file = script_dir / "main.py"
    
    if not main_file.exists():
        print(f"❌ Error: main.py not found at {main_file}")
        sys.exit(1)
    
    print("🚀 Starting EPC-Co.com Web Scraper Service...")
    print(f"📁 Working directory: {script_dir}")
    print(f"🌐 Service will be available at: http://localhost:8011")
    print("📋 Available endpoints:")
    print("   - GET  /health")
    print("   - POST /epc/scrape-product")
    print("   - POST /epc/download-files")
    print("   - GET  /epc/search-products")
    print("   - GET  /epc/product/{model_number}")
    print("   - POST /epc/batch-scrape")
    print("\nPress Ctrl+C to stop the service\n")
    
    try:
        # Change to the script directory
        os.chdir(script_dir)
        
        # Start the service using uvicorn
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--host", "0.0.0.0", 
            "--port", "8011",
            "--reload"
        ])
        
    except KeyboardInterrupt:
        print("\n🛑 Service stopped by user")
    except Exception as e:
        print(f"❌ Error starting service: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 