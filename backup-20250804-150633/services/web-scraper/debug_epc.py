#!/usr/bin/env python3
"""
Debug script to test EPC scraping functionality
"""
import asyncio
import aiohttp
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import epc_scraper

async def test_epc_scraping():
    """Test EPC scraping functionality"""
    print("🔍 Testing EPC scraping functionality...")
    
    try:
        # Test with a known EPC model
        model_number = "epc2040"
        print(f"📋 Testing model: {model_number}")
        
        # Test the scraping
        product = await epc_scraper.scrape_epc_product(model_number)
        
        if product:
            print("✅ Product scraped successfully!")
            print(f"   Name: {product.name}")
            print(f"   Part Number: {product.part_number}")
            print(f"   Description: {product.description[:100]}...")
            print(f"   Datasheet URL: {product.datasheet_url}")
            print(f"   Product URL: {product.product_url}")
        else:
            print("❌ Failed to scrape product")
            
    except Exception as e:
        print(f"❌ Error during scraping: {e}")
        import traceback
        traceback.print_exc()

async def test_epc_url():
    """Test EPC URL construction"""
    print("\n🔗 Testing EPC URL construction...")
    
    model_number = "epc2040"
    base_url = "https://epc-co.com"
    product_url = f"{base_url}/epc/products/gan-fets-and-ics/{model_number.lower()}"
    
    print(f"   Model: {model_number}")
    print(f"   URL: {product_url}")
    
    # Add browser-like headers to avoid 403 errors
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(product_url, headers=headers, timeout=30) as response:
                print(f"   Status: {response.status}")
                if response.status == 200:
                    html = await response.text()
                    print(f"   Content length: {len(html)} characters")
                    print(f"   Contains 'EPC': {'EPC' in html}")
                    print(f"   Contains '2040': {'2040' in html}")
                else:
                    print(f"   Error: {response.status}")
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_epc_url())
    asyncio.run(test_epc_scraping()) 