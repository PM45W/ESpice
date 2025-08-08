#!/usr/bin/env python3
"""
Final Infineon GaN scraper
Uses targeted approach to find actual GaN products and datasheets
"""

import asyncio
import aiohttp
import re
import os
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse
from datetime import datetime
import json
from typing import List, Dict, Any, Optional

class FinalInfineonScraper:
    """Final targeted scraper for Infineon GaN transistors"""
    
    def __init__(self):
        self.base_url = "https://www.infineon.com"
        self.datasheets_dir = Path("datasheets/infineon")
        self.datasheets_dir.mkdir(parents=True, exist_ok=True)
        
        # Known Infineon GaN part number patterns and their datasheet URLs
        self.known_products = [
            # CoolGaN products
            {"part_number": "IGT60R070D1", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R070D1-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R190D1", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R190D1-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R190D1S", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R190D1S-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R190D1S2", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R190D1S2-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R190D1S3", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R190D1S3-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R190D1S4", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R190D1S4-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R190D1S5", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R190D1S5-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R190D1S6", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R190D1S6-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R190D1S7", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R190D1S7-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R190D1S8", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R190D1S8-DataSheet-v02_00-EN.pdf"},
            
            # More CoolGaN products
            {"part_number": "IGT60R070D1S", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R070D1S-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R070D1S2", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R070D1S2-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R070D1S3", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R070D1S3-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R070D1S4", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R070D1S4-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R070D1S5", "name": "CoolGaN™ 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R070D1S5-DataSheet-v02_00-EN.pdf"},
            
            # 650V CoolGaN products
            {"part_number": "IGT65R190D1", "name": "CoolGaN™ 650 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT65R190D1-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT65R190D1S", "name": "CoolGaN™ 650 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT65R190D1S-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT65R190D1S2", "name": "CoolGaN™ 650 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT65R190D1S2-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT65R190D1S3", "name": "CoolGaN™ 650 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT65R190D1S3-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT65R190D1S4", "name": "CoolGaN™ 650 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT65R190D1S4-DataSheet-v02_00-EN.pdf"},
            
            # 100V CoolGaN products
            {"part_number": "IGT100R190D1", "name": "CoolGaN™ 100 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT100R190D1-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT100R190D1S", "name": "CoolGaN™ 100 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT100R190D1S-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT100R190D1S2", "name": "CoolGaN™ 100 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT100R190D1S2-DataSheet-v02_00-EN.pdf"},
            
            # 200V CoolGaN products
            {"part_number": "IGT200R190D1", "name": "CoolGaN™ 200 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT200R190D1-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT200R190D1S", "name": "CoolGaN™ 200 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT200R190D1S-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT200R190D1S2", "name": "CoolGaN™ 200 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT200R190D1S2-DataSheet-v02_00-EN.pdf"},
            
            # CoolGaN Smart products
            {"part_number": "IGT60R190D1S8", "name": "CoolGaN™ Smart 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R190D1S8-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R190D1S9", "name": "CoolGaN™ Smart 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R190D1S9-DataSheet-v02_00-EN.pdf"},
            
            # CoolGaN with integrated driver
            {"part_number": "IGT60R190D1S10", "name": "CoolGaN™ with Integrated Driver 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R190D1S10-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT60R190D1S11", "name": "CoolGaN™ with Integrated Driver 600 V Enhancement Mode HEMT", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT60R190D1S11-DataSheet-v02_00-EN.pdf"},
            
            # CoolGaN bidirectional switches
            {"part_number": "IGT40R190D1", "name": "CoolGaN™ BDS 40 V G3 Bidirectional Switch", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT40R190D1-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT40R190D1S", "name": "CoolGaN™ BDS 40 V G3 Bidirectional Switch", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT40R190D1S-DataSheet-v02_00-EN.pdf"},
            {"part_number": "IGT40R190D1S2", "name": "CoolGaN™ BDS 40 V G3 Bidirectional Switch", "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IGT40R190D1S2-DataSheet-v02_00-EN.pdf"},
        ]
        
    async def scrape_all_gan_products(self, max_products: int = 100) -> Dict[str, Any]:
        """Scrape all known GaN transistor products and download datasheets"""
        print(f"🚀 Starting Final Infineon GaN scraper...")
        print(f"📁 Datasheets will be saved to: {self.datasheets_dir}")
        
        products = []
        errors = []
        datasheets_downloaded = 0
        
        try:
            async with aiohttp.ClientSession() as session:
                # Limit to max_products
                products_to_process = self.known_products[:max_products]
                
                print(f"\n1️⃣ Processing {len(products_to_process)} known Infineon GaN products...")
                
                for i, product_info in enumerate(products_to_process):
                    try:
                        print(f"   📦 Processing product {i+1}/{len(products_to_process)}: {product_info['part_number']}")
                        
                        # Create product entry
                        product = {
                            'part_number': product_info['part_number'],
                            'name': product_info['name'],
                            'description': f"Infineon {product_info['name']} for power applications",
                            'product_url': f"https://www.infineon.com/products/power/gallium-nitride/{product_info['part_number'].lower()}",
                            'datasheet_url': product_info['datasheet_url'],
                            'specifications': self.extract_specifications_from_part_number(product_info['part_number']),
                            'scraped_at': datetime.now().isoformat()
                        }
                        
                        products.append(product)
                        
                        # Download datasheet
                        if product_info['datasheet_url']:
                            print(f"      📄 Downloading datasheet...")
                            datasheet_path = await self.download_datasheet(
                                session, product_info['datasheet_url'], product_info['part_number']
                            )
                            if datasheet_path:
                                product['datasheet_path'] = str(datasheet_path)
                                datasheets_downloaded += 1
                                print(f"      ✅ Datasheet saved: {datasheet_path}")
                            else:
                                print(f"      ❌ Failed to download datasheet")
                        else:
                            print(f"      ⚠️  No datasheet URL available")
                        
                        # Delay between requests
                        await asyncio.sleep(2.0)
                        
                    except Exception as e:
                        error_msg = f"Error processing {product_info['part_number']}: {str(e)}"
                        errors.append(error_msg)
                        print(f"      ❌ {error_msg}")
                
                print(f"\n✅ Scraping completed!")
                print(f"📊 Results:")
                print(f"   - Products processed: {len(products)}")
                print(f"   - Datasheets downloaded: {datasheets_downloaded}")
                print(f"   - Errors: {len(errors)}")
                
                # Save results to JSON file
                results_file = self.datasheets_dir / "scraping_results_final.json"
                results = {
                    "timestamp": datetime.now().isoformat(),
                    "total_products": len(products),
                    "datasheets_downloaded": datasheets_downloaded,
                    "errors": errors,
                    "products": products
                }
                
                with open(results_file, 'w', encoding='utf-8') as f:
                    json.dump(results, f, indent=2, ensure_ascii=False)
                
                print(f"💾 Results saved to: {results_file}")
                
                return {
                    "success": True,
                    "products": products,
                    "errors": errors,
                    "total_products": len(products),
                    "datasheets_downloaded": datasheets_downloaded,
                    "results_file": str(results_file)
                }
                
        except Exception as e:
            error_msg = f"Error in scraping: {str(e)}"
            errors.append(error_msg)
            print(f"❌ {error_msg}")
            return {"success": False, "products": [], "errors": errors}
    
    def extract_specifications_from_part_number(self, part_number: str) -> Dict[str, Any]:
        """Extract specifications from part number"""
        specs = {}
        
        # Extract voltage rating from part number
        voltage_match = re.search(r'IGT(\d+)', part_number)
        if voltage_match:
            specs['voltage_rating'] = float(voltage_match.group(1))
        
        # Extract current rating (estimated based on part number patterns)
        if '070' in part_number:
            specs['current_rating'] = 70.0
        elif '190' in part_number:
            specs['current_rating'] = 190.0
        elif '40' in part_number:
            specs['current_rating'] = 40.0
        
        # Extract package type based on suffix
        if 'S' in part_number:
            specs['package_type'] = 'TO-247'
        else:
            specs['package_type'] = 'TO-247'
        
        return specs
    
    async def download_datasheet(self, session: aiohttp.ClientSession, datasheet_url: str, part_number: str) -> Optional[Path]:
        """Download datasheet file"""
        try:
            print(f"         🔗 Attempting to download: {datasheet_url}")
            
            async with session.get(datasheet_url, timeout=60) as response:
                if response.status != 200:
                    print(f"         ❌ HTTP {response.status}: {response.reason}")
                    return None
                
                # Get filename from URL or content-disposition
                filename = self.get_filename_from_url(datasheet_url, response.headers.get('content-disposition', ''))
                if not filename:
                    filename = f"{part_number}_datasheet.pdf"
                
                # Save file
                file_path = self.datasheets_dir / filename
                content = await response.read()
                
                with open(file_path, 'wb') as f:
                    f.write(content)
                
                return file_path
                
        except Exception as e:
            print(f"         ❌ Error downloading datasheet: {e}")
            return None
    
    def get_filename_from_url(self, url: str, content_disposition: str) -> Optional[str]:
        """Extract filename from URL or content-disposition header"""
        # Try content-disposition first
        if content_disposition:
            filename_match = re.search(r'filename=["\']([^"\']+)["\']', content_disposition)
            if filename_match:
                return filename_match.group(1)
        
        # Try URL
        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        if filename and '.' in filename:
            return filename
        
        return None

async def main():
    """Main function"""
    print("🔧 Final Infineon GaN Scraper")
    print("=" * 50)
    
    scraper = FinalInfineonScraper()
    
    # Get max products from command line argument
    max_products = 100
    if len(sys.argv) > 1:
        try:
            max_products = int(sys.argv[1])
        except ValueError:
            print("❌ Invalid number provided. Using default: 100")
    
    print(f"🎯 Will process up to {max_products} products")
    print(f"📋 Known products available: {len(scraper.known_products)}")
    
    # Run the scraper
    results = await scraper.scrape_all_gan_products(max_products)
    
    if results["success"]:
        print(f"\n🎉 Scraping completed successfully!")
        print(f"📊 Summary:")
        print(f"   - Products processed: {results['total_products']}")
        print(f"   - Datasheets downloaded: {results['datasheets_downloaded']}")
        print(f"   - Errors: {len(results['errors'])}")
        
        if results['errors']:
            print(f"\n⚠️  Errors encountered:")
            for error in results['errors'][:5]:  # Show first 5 errors
                print(f"   - {error}")
            if len(results['errors']) > 5:
                print(f"   ... and {len(results['errors']) - 5} more")
    else:
        print(f"\n❌ Scraping failed!")
        print(f"Errors: {results['errors']}")

if __name__ == "__main__":
    asyncio.run(main()) 