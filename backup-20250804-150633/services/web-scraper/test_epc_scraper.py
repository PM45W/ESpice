#!/usr/bin/env python3
"""
Test script for EPC-Co.com web scraper functionality
"""

import asyncio
import aiohttp
import json
from datetime import datetime
from typing import Dict, Any

# Test configuration
EPC_TEST_MODELS = ["epc2040", "epc2010", "epc2001"]
API_BASE_URL = "http://localhost:8011"

async def test_epc_scraper():
    """Test the EPC-Co.com scraper functionality"""
    
    print("🧪 Testing EPC-Co.com Web Scraper")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        
        # Test 1: Scrape a single EPC product
        print("\n1. Testing single product scrape...")
        for model in EPC_TEST_MODELS[:1]:  # Test with first model
            try:
                url = f"{API_BASE_URL}/epc/scrape-product"
                params = {
                    "model_number": model,
                    "include_datasheet": True,
                    "include_spice": True
                }
                
                async with session.post(url, params=params) as response:
                    if response.status == 200:
                        result = await response.json()
                        print(f"✅ Successfully scraped {model}")
                        print(f"   Product: {result['product']['name']}")
                        print(f"   Datasheet: {result['downloaded_files']['datasheet']}")
                        print(f"   SPICE Model: {result['downloaded_files']['spice_model']}")
                    else:
                        print(f"❌ Failed to scrape {model}: {response.status}")
                        error_text = await response.text()
                        print(f"   Error: {error_text}")
                        
            except Exception as e:
                print(f"❌ Error testing {model}: {e}")
        
        # Test 2: Search EPC products
        print("\n2. Testing product search...")
        try:
            url = f"{API_BASE_URL}/epc/search-products"
            params = {"query": "epc", "limit": 10}
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ Found {result['total']} EPC products")
                    for product in result['products'][:3]:  # Show first 3
                        print(f"   - {product['part_number']}: {product['name']}")
                else:
                    print(f"❌ Search failed: {response.status}")
                    
        except Exception as e:
            print(f"❌ Error in search test: {e}")
        
        # Test 3: Get specific product
        print("\n3. Testing get specific product...")
        try:
            model = EPC_TEST_MODELS[0]
            url = f"{API_BASE_URL}/epc/product/{model}"
            
            async with session.get(url) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ Retrieved {model}")
                    print(f"   Name: {result['product']['name']}")
                    print(f"   Description: {result['product']['description'][:100]}...")
                else:
                    print(f"❌ Failed to get {model}: {response.status}")
                    
        except Exception as e:
            print(f"❌ Error in get product test: {e}")
        
        # Test 4: Batch scrape
        print("\n4. Testing batch scrape...")
        try:
            url = f"{API_BASE_URL}/epc/batch-scrape"
            data = {
                "model_numbers": EPC_TEST_MODELS[:2],  # Test with 2 models
                "include_datasheets": True,
                "include_spice": True
            }
            
            async with session.post(url, json=data) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ Batch scrape completed")
                    print(f"   Processed: {result['total_processed']}")
                    print(f"   Successful: {result['successful']}")
                    print(f"   Failed: {result['failed']}")
                    
                    if result['errors']:
                        print("   Errors:")
                        for error in result['errors']:
                            print(f"     - {error}")
                else:
                    print(f"❌ Batch scrape failed: {response.status}")
                    
        except Exception as e:
            print(f"❌ Error in batch scrape test: {e}")
        
        # Test 5: Health check
        print("\n5. Testing health check...")
        try:
            url = f"{API_BASE_URL}/health"
            
            async with session.get(url) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ Service health: {result['status']}")
                else:
                    print(f"❌ Health check failed: {response.status}")
                    
        except Exception as e:
            print(f"❌ Error in health check: {e}")

async def test_epc_url_structure():
    """Test the EPC-Co.com URL structure parsing"""
    
    print("\n🔍 Testing EPC URL Structure")
    print("=" * 30)
    
    # Test URLs
    test_urls = [
        "https://epc-co.com/epc/products/gan-fets-and-ics/epc2040",
        "https://epc-co.com/epc/products/gan-fets-and-ics/epc2010",
        "https://epc-co.com/epc/products/gan-fets-and-ics/epc2001",
        "/epc/products/gan-fets-and-ics/epc2040",
        "epc2040"
    ]
    
    import re
    
    for url in test_urls:
        # Test model number extraction
        match = re.search(r'/epc/products/gan-fets-and-ics/([^/]+)', url, re.IGNORECASE)
        if match:
            model = match.group(1).upper()
            print(f"✅ {url} -> {model}")
        else:
            # Fallback
            match = re.search(r'/([A-Z0-9]{3,20})/?$', url, re.IGNORECASE)
            if match:
                model = match.group(1).upper()
                print(f"✅ {url} -> {model} (fallback)")
            else:
                print(f"❌ {url} -> No model found")

if __name__ == "__main__":
    print("🚀 Starting EPC-Co.com Scraper Tests")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run tests
    asyncio.run(test_epc_url_structure())
    asyncio.run(test_epc_scraper())
    
    print("\n✨ Tests completed!") 