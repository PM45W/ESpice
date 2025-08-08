#!/usr/bin/env python3
"""
Example usage of the EPC-Co.com web scraper
"""

import asyncio
import aiohttp
import json
from typing import List, Dict, Any

class EPCScraperClient:
    """Client for interacting with the EPC-Co.com scraper API"""
    
    def __init__(self, base_url: str = "http://localhost:8011"):
        self.base_url = base_url
    
    async def scrape_single_product(self, model_number: str, include_datasheet: bool = True, include_spice: bool = True) -> Dict[str, Any]:
        """Scrape a single EPC product"""
        async with aiohttp.ClientSession() as session:
            url = f"{self.base_url}/epc/scrape-product"
            params = {
                "model_number": model_number,
                "include_datasheet": str(include_datasheet).lower(),
                "include_spice": str(include_spice).lower()
            }
            
            async with session.post(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    raise Exception(f"Failed to scrape {model_number}: {response.status} - {error_text}")
    
    async def batch_scrape_products(self, model_numbers: List[str], include_datasheets: bool = True, include_spice: bool = True) -> Dict[str, Any]:
        """Batch scrape multiple EPC products"""
        async with aiohttp.ClientSession() as session:
            url = f"{self.base_url}/epc/batch-scrape"
            data = {
                "model_numbers": model_numbers,
                "include_datasheets": str(include_datasheets).lower(),
                "include_spice": str(include_spice).lower()
            }
            
            async with session.post(url, json=data) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    raise Exception(f"Failed to batch scrape: {response.status} - {error_text}")
    
    async def search_products(self, query: str = "", limit: int = 50) -> Dict[str, Any]:
        """Search for EPC products"""
        async with aiohttp.ClientSession() as session:
            url = f"{self.base_url}/epc/search-products"
            params = {"query": query, "limit": limit}
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    raise Exception(f"Failed to search products: {response.status} - {error_text}")
    
    async def get_product(self, model_number: str) -> Dict[str, Any]:
        """Get a specific EPC product"""
        async with aiohttp.ClientSession() as session:
            url = f"{self.base_url}/epc/product/{model_number}"
            
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    raise Exception(f"Failed to get product {model_number}: {response.status} - {error_text}")
    
    async def download_files_only(self, model_number: str, include_datasheet: bool = True, include_spice: bool = True) -> Dict[str, Any]:
        """Download files for an existing product without scraping"""
        async with aiohttp.ClientSession() as session:
            url = f"{self.base_url}/epc/download-files"
            params = {
                "model_number": model_number,
                "include_datasheet": str(include_datasheet).lower(),
                "include_spice": str(include_spice).lower()
            }
            
            async with session.post(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    raise Exception(f"Failed to download files for {model_number}: {response.status} - {error_text}")

async def main():
    """Main example function"""
    
    # Initialize the client
    client = EPCScraperClient()
    
    print("🚀 EPC-Co.com Scraper Example")
    print("=" * 40)
    
    # Example 1: Scrape a single product
    print("\n1. Scraping single product (EPC2040)...")
    try:
        result = await client.scrape_single_product("epc2040")
        print(f"✅ Successfully scraped: {result['product']['name']}")
        print(f"   Datasheet: {result['downloaded_files']['datasheet']}")
        print(f"   SPICE Model: {result['downloaded_files']['spice_model']}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Example 2: Batch scrape multiple products
    print("\n2. Batch scraping multiple products...")
    try:
        model_numbers = ["epc2040", "epc2010", "epc2001"]
        result = await client.batch_scrape_products(model_numbers)
        print(f"✅ Batch scrape completed:")
        print(f"   Processed: {result['total_processed']}")
        print(f"   Successful: {result['successful']}")
        print(f"   Failed: {result['failed']}")
        
        if result['errors']:
            print("   Errors:")
            for error in result['errors']:
                print(f"     - {error}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Example 3: Search for products
    print("\n3. Searching for products...")
    try:
        result = await client.search_products(query="epc", limit=5)
        print(f"✅ Found {result['total']} products:")
        for product in result['products']:
            print(f"   - {product['part_number']}: {product['name']}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Example 4: Get specific product
    print("\n4. Getting specific product...")
    try:
        result = await client.get_product("epc2040")
        print(f"✅ Retrieved: {result['product']['name']}")
        print(f"   Description: {result['product']['description'][:100]}...")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Example 5: Download files only
    print("\n5. Downloading files only...")
    try:
        result = await client.download_files_only("epc2040", include_datasheet=True, include_spice=True)
        print(f"✅ Files downloaded for {result['model_number']}:")
        print(f"   Datasheet: {result['downloaded_files']['datasheet']}")
        print(f"   SPICE Model: {result['downloaded_files']['spice_model']}")
    except Exception as e:
        print(f"❌ Error: {e}")

async def advanced_example():
    """Advanced usage example with error handling and custom processing"""
    
    client = EPCScraperClient()
    
    print("\n🔧 Advanced Example")
    print("=" * 30)
    
    # List of EPC models to process
    models_to_process = [
        "epc2040",  # 100V eGaN FET
        "epc2010",  # 100V eGaN FET
        "epc2001",  # 100V eGaN FET
        "epc2019",  # 200V eGaN FET
        "epc2023"   # 200V eGaN FET
    ]
    
    successful_products = []
    failed_products = []
    
    print(f"Processing {len(models_to_process)} EPC models...")
    
    for model in models_to_process:
        try:
            print(f"\nProcessing {model}...")
            
            # Scrape the product
            result = await client.scrape_single_product(model)
            
            # Extract key information
            product = result['product']
            files = result['downloaded_files']
            
            print(f"  ✅ {product['name']}")
            print(f"  📊 Voltage: {product.get('voltage_rating', 'N/A')}V")
            print(f"  📊 Current: {product.get('current_rating', 'N/A')}A")
            print(f"  📊 Power: {product.get('power_rating', 'N/A')}W")
            print(f"  📄 Datasheet: {'Downloaded' if files['datasheet'] else 'Not found'}")
            print(f"  🔧 SPICE Model: {'Downloaded' if files['spice_model'] else 'Not found'}")
            
            successful_products.append({
                'model': model,
                'product': product,
                'files': files
            })
            
        except Exception as e:
            print(f"  ❌ Failed to process {model}: {e}")
            failed_products.append(model)
    
    # Summary
    print(f"\n📊 Processing Summary:")
    print(f"  ✅ Successful: {len(successful_products)}")
    print(f"  ❌ Failed: {len(failed_products)}")
    
    if successful_products:
        print(f"\n📋 Successfully processed products:")
        for item in successful_products:
            product = item['product']
            print(f"  - {product['part_number']}: {product['name']}")
    
    if failed_products:
        print(f"\n❌ Failed products:")
        for model in failed_products:
            print(f"  - {model}")

if __name__ == "__main__":
    print("Starting EPC-Co.com Scraper Examples...")
    
    # Run basic examples
    asyncio.run(main())
    
    # Run advanced example
    asyncio.run(advanced_example())
    
    print("\n✨ Examples completed!") 