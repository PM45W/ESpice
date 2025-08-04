#!/usr/bin/env python3
"""
Test script for batch processing functionality
"""

import requests
import json
import time
from pathlib import Path

# Configuration
BATCH_SERVICE_URL = "http://localhost:87"
MCP_SERVICE_URL = "http://localhost:8000"

def test_batch_service_health():
    """Test if batch service is healthy"""
    try:
        response = requests.get(f"{BATCH_SERVICE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Batch service is healthy")
            return True
        else:
            print(f"❌ Batch service health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Batch service not available: {e}")
        return False

def test_mcp_service_health():
    """Test if MCP service is healthy"""
    try:
        response = requests.get(f"{MCP_SERVICE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ MCP service is healthy")
            return True
        else:
            print(f"❌ MCP service health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ MCP service not available: {e}")
            return False

def test_batch_upload():
    """Test batch upload functionality"""
    try:
        # Create a test batch request
        batch_request = {
            "batch_name": "Test Batch",
            "description": "Test batch for validation",
            "workflow_type": "full_extraction",
            "priority": "normal"
        }
        
        # Create test files (empty PDFs for testing)
        test_files = []
        for i in range(3):
            test_file_path = f"test_file_{i}.pdf"
            with open(test_file_path, 'wb') as f:
                f.write(b'%PDF-1.4\n%Test PDF file\n')
            test_files.append(test_file_path)
        
        # Prepare multipart form data
        files = [('files', (Path(f).name, open(f, 'rb'), 'application/pdf')) for f in test_files]
        data = {'request': json.dumps(batch_request)}
        
        response = requests.post(
            f"{BATCH_SERVICE_URL}/batch/upload",
            files=files,
            data=data,
            timeout=30
        )
        
        # Clean up test files
        for f in test_files:
            Path(f).unlink(missing_ok=True)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Batch upload successful: {result.get('batch_id', 'N/A')}")
            return result.get('batch_id')
        else:
            print(f"❌ Batch upload failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Batch upload test failed: {e}")
        return None

def test_batch_status(batch_id):
    """Test batch status retrieval"""
    try:
        response = requests.get(f"{BATCH_SERVICE_URL}/batch/{batch_id}", timeout=5)
        if response.status_code == 200:
            batch_info = response.json()
            print(f"✅ Batch status retrieved: {batch_info.get('status', 'N/A')}")
            return batch_info
        else:
            print(f"❌ Batch status retrieval failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Batch status test failed: {e}")
        return None

def test_batch_jobs(batch_id):
    """Test batch jobs retrieval"""
    try:
        response = requests.get(f"{BATCH_SERVICE_URL}/batch/{batch_id}/jobs", timeout=5)
        if response.status_code == 200:
            jobs = response.json()
            print(f"✅ Batch jobs retrieved: {len(jobs)} jobs")
            return jobs
        else:
            print(f"❌ Batch jobs retrieval failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Batch jobs test failed: {e}")
        return None

def main():
    """Run all tests"""
    print("🧪 Testing Batch Processing Functionality")
    print("=" * 50)
    
    # Test service health
    print("\n1. Testing Service Health:")
    batch_healthy = test_batch_service_health()
    mcp_healthy = test_mcp_service_health()
    
    if not batch_healthy:
        print("\n❌ Batch service is not available. Please start the batch processor service.")
        print("   You can start it with: cd services/batch-processor && python main.py")
        return
    
    # Test batch upload
    print("\n2. Testing Batch Upload:")
    batch_id = test_batch_upload()
    
    if batch_id:
        # Test batch status
        print("\n3. Testing Batch Status:")
        test_batch_status(batch_id)
        
        # Test batch jobs
        print("\n4. Testing Batch Jobs:")
        test_batch_jobs(batch_id)
        
        print(f"\n✅ All tests completed successfully!")
        print(f"   Batch ID: {batch_id}")
    else:
        print("\n❌ Batch upload test failed. Check service configuration.")

if __name__ == "__main__":
    main() 