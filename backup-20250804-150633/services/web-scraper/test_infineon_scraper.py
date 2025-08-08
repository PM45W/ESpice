#!/usr/bin/env python3
"""
Test script for Infineon GaN scraper
Downloads all datasheets from Infineon's GaN transistor page
"""

import asyncio
import aiohttp
import json
import sys
from pathlib import Path

# Add the current directory to Python path to import from main.py
sys.path.append(str(Path(__file__).parent))

async def test_infineon_scraper():
    """Test the Infineon GaN scraper"""
    
    # Web scraper service URL
    base_url = "http://localhost:8011"
    
    print("🚀 Starting Infineon GaN scraper test...")
    print(f"📡 Connecting to web scraper service at: {base_url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test 1: Check if service is running
            print("\n1️⃣ Checking service health...")
            async with session.get(f"{base_url}/health") as response:
                if response.status == 200:
                    health_data = await response.json()
                    print(f"✅ Service is healthy: {health_data}")
                else:
                    print(f"❌ Service health check failed: {response.status}")
                    return
            
            # Test 2: Start Infineon GaN scraping job
            print("\n2️⃣ Starting Infineon GaN scraping job...")
            scrape_data = {
                "max_products": 50,  # Limit to 50 products for testing
                "include_datasheets": True
            }
            
            async with session.post(f"{base_url}/infineon/scrape-gan", json=scrape_data) as response:
                if response.status == 200:
                    job_data = await response.json()
                    job_id = job_data.get("job_id")
                    print(f"✅ Scraping job started: {job_id}")
                    print(f"📋 Job details: {job_data}")
                else:
                    print(f"❌ Failed to start scraping job: {response.status}")
                    error_text = await response.text()
                    print(f"Error details: {error_text}")
                    return
            
            # Test 3: Monitor job progress
            print(f"\n3️⃣ Monitoring job progress for: {job_id}")
            max_wait_time = 300  # 5 minutes max wait
            wait_time = 0
            check_interval = 10  # Check every 10 seconds
            
            while wait_time < max_wait_time:
                await asyncio.sleep(check_interval)
                wait_time += check_interval
                
                async with session.get(f"{base_url}/jobs/{job_id}") as response:
                    if response.status == 200:
                        job_status = await response.json()
                        status = job_status.get("status")
                        print(f"⏱️  Job status: {status} (waited {wait_time}s)")
                        
                        if status in ["completed", "failed"]:
                            print(f"🏁 Job finished with status: {status}")
                            if status == "completed":
                                print(f"📊 Results: {job_status.get('scraped_products', 0)} products scraped")
                                print(f"📄 Datasheets downloaded: {job_status.get('downloaded_datasheets', 0)}")
                            if job_status.get("errors"):
                                print(f"⚠️  Errors: {job_status.get('errors')}")
                            break
                    else:
                        print(f"❌ Failed to get job status: {response.status}")
                        break
            
            # Test 4: Get scraped products
            print("\n4️⃣ Retrieving scraped products...")
            async with session.get(f"{base_url}/infineon/products?limit=100") as response:
                if response.status == 200:
                    products_data = await response.json()
                    products = products_data.get("products", [])
                    print(f"✅ Retrieved {len(products)} Infineon products")
                    
                    if products:
                        print("\n📋 Sample products:")
                        for i, product in enumerate(products[:5]):  # Show first 5 products
                            print(f"  {i+1}. {product.get('part_number', 'N/A')} - {product.get('name', 'N/A')}")
                            if product.get('datasheet_path'):
                                print(f"     📄 Datasheet: {product.get('datasheet_path')}")
                    
                    # Test 5: Download specific datasheet if available
                    if products:
                        first_product = products[0]
                        part_number = first_product.get('part_number')
                        if part_number and not first_product.get('datasheet_path'):
                            print(f"\n5️⃣ Downloading datasheet for {part_number}...")
                            async with session.post(f"{base_url}/infineon/download-datasheet", json={"part_number": part_number}) as response:
                                if response.status == 200:
                                    download_result = await response.json()
                                    print(f"✅ Datasheet downloaded: {download_result}")
                                else:
                                    print(f"❌ Failed to download datasheet: {response.status}")
                else:
                    print(f"❌ Failed to get products: {response.status}")
            
            print("\n🎉 Infineon GaN scraper test completed!")
            
    except aiohttp.ClientError as e:
        print(f"❌ Network error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

async def quick_test():
    """Quick test to check if the service is running"""
    base_url = "http://localhost:8011"
    
    try:
        async with aiohttp.ClientSession() as session:
            # Check health
            async with session.get(f"{base_url}/health") as response:
                if response.status == 200:
                    print("✅ Web scraper service is running")
                    return True
                else:
                    print(f"❌ Service not responding: {response.status}")
                    return False
    except Exception as e:
        print(f"❌ Cannot connect to service: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Infineon GaN Scraper Test")
    print("=" * 50)
    
    # Check if service is running first
    if asyncio.run(quick_test()):
        # Run the full test
        asyncio.run(test_infineon_scraper())
    else:
        print("\n💡 To start the web scraper service, run:")
        print("   cd services/web-scraper")
        print("   python main.py")
        print("\n   Or use Docker:")
        print("   docker-compose up web-scraper") 