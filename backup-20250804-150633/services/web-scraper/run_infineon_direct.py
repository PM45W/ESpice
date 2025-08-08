#!/usr/bin/env python3
"""
Direct Infineon GaN scraper
Targets specific product table pages and datasheet download pages
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

class DirectInfineonScraper:
    """Direct scraper for Infineon GaN transistors"""
    
    def __init__(self):
        self.base_url = "https://www.infineon.com"
        self.datasheets_dir = Path("datasheets/infineon")
        self.datasheets_dir.mkdir(parents=True, exist_ok=True)
        
        # Known Infineon GaN product table URLs
        self.product_tables = [
            "https://www.infineon.com/product-table/gan-transistors-gan-hemts",
            "https://www.infineon.com/cms/en/product/power/gallium-nitride-gan/",
            "https://www.infineon.com/products/power/gallium-nitride/gan-smart",
            "https://www.infineon.com/products/power/gallium-nitride/gan-with-integrated-driver",
            "https://www.infineon.com/products/power/gallium-nitride/gan-bidirectional-switches"
        ]
        
    async def scrape_all_gan_products(self, max_products: int = 100) -> Dict[str, Any]:
        """Scrape all GaN transistor products and download datasheets"""
        print(f"🚀 Starting Direct Infineon GaN scraper...")
        print(f"📁 Datasheets will be saved to: {self.datasheets_dir}")
        
        products = []
        errors = []
        datasheets_downloaded = 0
        
        try:
            async with aiohttp.ClientSession() as session:
                # Step 1: Scrape each product table
                print(f"\n1️⃣ Scraping product tables...")
                
                for i, table_url in enumerate(self.product_tables):
                    print(f"   📋 Processing table {i+1}/{len(self.product_tables)}: {table_url}")
                    
                    try:
                        table_products = await self.scrape_product_table(session, table_url)
                        products.extend(table_products)
                        print(f"      ✅ Found {len(table_products)} products in this table")
                        
                        # Delay between table requests
                        await asyncio.sleep(3.0)
                        
                    except Exception as e:
                        error_msg = f"Error scraping table {table_url}: {str(e)}"
                        errors.append(error_msg)
                        print(f"      ❌ {error_msg}")
                
                # Remove duplicates and limit
                unique_products = self.remove_duplicate_products(products)
                unique_products = unique_products[:max_products]
                
                print(f"✅ Total unique products found: {len(unique_products)}")
                
                # Step 2: Download datasheets for each product
                print(f"\n2️⃣ Downloading datasheets...")
                
                for i, product in enumerate(unique_products):
                    try:
                        print(f"   📦 Processing product {i+1}/{len(unique_products)}: {product.get('part_number', 'Unknown')}")
                        
                        # Download datasheet if available
                        if product.get('datasheet_url'):
                            print(f"      📄 Downloading datasheet...")
                            datasheet_path = await self.download_datasheet(
                                session, product['datasheet_url'], product['part_number']
                            )
                            if datasheet_path:
                                product['datasheet_path'] = str(datasheet_path)
                                datasheets_downloaded += 1
                                print(f"      ✅ Datasheet saved: {datasheet_path}")
                            else:
                                print(f"      ❌ Failed to download datasheet")
                        else:
                            print(f"      ⚠️  No datasheet URL found")
                        
                        # Delay between requests
                        await asyncio.sleep(2.0)
                        
                    except Exception as e:
                        error_msg = f"Error processing product {product.get('part_number', 'Unknown')}: {str(e)}"
                        errors.append(error_msg)
                        print(f"      ❌ {error_msg}")
                
                print(f"\n✅ Scraping completed!")
                print(f"📊 Results:")
                print(f"   - Products scraped: {len(unique_products)}")
                print(f"   - Datasheets downloaded: {datasheets_downloaded}")
                print(f"   - Errors: {len(errors)}")
                
                # Save results to JSON file
                results_file = self.datasheets_dir / "scraping_results_direct.json"
                results = {
                    "timestamp": datetime.now().isoformat(),
                    "total_products": len(unique_products),
                    "datasheets_downloaded": datasheets_downloaded,
                    "errors": errors,
                    "products": unique_products
                }
                
                with open(results_file, 'w', encoding='utf-8') as f:
                    json.dump(results, f, indent=2, ensure_ascii=False)
                
                print(f"💾 Results saved to: {results_file}")
                
                return {
                    "success": True,
                    "products": unique_products,
                    "errors": errors,
                    "total_products": len(unique_products),
                    "datasheets_downloaded": datasheets_downloaded,
                    "results_file": str(results_file)
                }
                
        except Exception as e:
            error_msg = f"Error in scraping: {str(e)}"
            errors.append(error_msg)
            print(f"❌ {error_msg}")
            return {"success": False, "products": [], "errors": errors}
    
    async def scrape_product_table(self, session: aiohttp.ClientSession, table_url: str) -> List[Dict[str, Any]]:
        """Scrape products from a product table page"""
        products = []
        
        try:
            async with session.get(table_url, timeout=30) as response:
                if response.status != 200:
                    print(f"      ❌ Failed to fetch table: {response.status}")
                    return products
                
                html = await response.text()
            
            # Look for product links in the table
            product_links = self.extract_product_links_from_table(html)
            
            for product_url in product_links:
                try:
                    product_info = await self.scrape_product_page(session, product_url)
                    if product_info:
                        products.append(product_info)
                    
                    # Small delay between product requests
                    await asyncio.sleep(1.0)
                    
                except Exception as e:
                    print(f"      ❌ Error scraping product {product_url}: {e}")
            
            return products
            
        except Exception as e:
            print(f"      ❌ Error scraping table {table_url}: {e}")
            return products
    
    def extract_product_links_from_table(self, html: str) -> List[str]:
        """Extract product links from a product table page"""
        links = []
        
        # Look for various patterns that might indicate product pages
        patterns = [
            r'href=["\']([^"\']*product-detail[^"\']*)["\']',
            r'href=["\']([^"\']*datasheet[^"\']*)["\']',
            r'href=["\']([^"\']*CoolGaN[^"\']*)["\']',
            r'href=["\']([^"\']*IGT[^"\']*)["\']',
            r'href=["\']([^"\']*IGL[^"\']*)["\']',
            r'href=["\']([^"\']*IGW[^"\']*)["\']',
            r'href=["\']([^"\']*gan[^"\']*transistor[^"\']*)["\']',
            r'href=["\']([^"\']*\.pdf)["\']'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                if match.startswith('/'):
                    link = urljoin(self.base_url, match)
                elif match.startswith('http'):
                    link = match
                else:
                    link = urljoin(self.base_url, '/' + match)
                
                # Filter for actual product pages
                if self.is_likely_product_page(link):
                    links.append(link)
        
        return list(set(links))
    
    def is_likely_product_page(self, url: str) -> bool:
        """Check if a URL is likely to be a product page"""
        # Look for patterns that indicate product pages
        product_indicators = [
            'product-detail',
            'datasheet',
            'CoolGaN',
            'IGT',
            'IGL',
            'IGW',
            '.pdf'
        ]
        
        url_lower = url.lower()
        return any(indicator.lower() in url_lower for indicator in product_indicators)
    
    async def scrape_product_page(self, session: aiohttp.ClientSession, product_url: str) -> Optional[Dict[str, Any]]:
        """Scrape individual product page"""
        try:
            async with session.get(product_url, timeout=30) as response:
                if response.status != 200:
                    return None
                
                html = await response.text()
            
            # Extract product information
            product_info = self.extract_product_info_from_page(html, product_url)
            
            return product_info
            
        except Exception as e:
            print(f"      ❌ Error scraping product page: {e}")
            return None
    
    def extract_product_info_from_page(self, html: str, product_url: str) -> Optional[Dict[str, Any]]:
        """Extract product information from a product page"""
        
        # Extract part number
        part_number = self.extract_part_number_from_page(html, product_url)
        if not part_number:
            return None
        
        # Extract other information
        name = self.extract_product_name_from_page(html)
        description = self.extract_description_from_page(html)
        datasheet_url = self.extract_datasheet_url_from_page(html)
        specifications = self.extract_specifications_from_page(html)
        
        return {
            'part_number': part_number,
            'name': name,
            'description': description,
            'product_url': product_url,
            'datasheet_url': datasheet_url,
            'specifications': specifications,
            'scraped_at': datetime.now().isoformat()
        }
    
    def extract_part_number_from_page(self, html: str, url: str) -> Optional[str]:
        """Extract part number from page HTML or URL"""
        # Try URL first
        url_patterns = [
            r'/([A-Z0-9]+(?:-[A-Z0-9]+)*)/?$',
            r'product/([A-Z0-9]+(?:-[A-Z0-9]+)*)',
            r'CoolGaN[™]?\s*([A-Z0-9]+(?:-[A-Z0-9]+)*)',
            r'IGT([A-Z0-9]+(?:-[A-Z0-9]+)*)',
            r'IGL([A-Z0-9]+(?:-[A-Z0-9]+)*)',
            r'IGW([A-Z0-9]+(?:-[A-Z0-9]+)*)'
        ]
        
        for pattern in url_patterns:
            match = re.search(pattern, url, re.IGNORECASE)
            if match:
                return match.group(1)
        
        # Try HTML content
        html_patterns = [
            r'CoolGaN[™]?\s*([A-Z0-9]+(?:-[A-Z0-9]+)*)',
            r'Part\s*Number[:\s]*([A-Z0-9]+(?:-[A-Z0-9]+)*)',
            r'Model[:\s]*([A-Z0-9]+(?:-[A-Z0-9]+)*)',
            r'IGT([A-Z0-9]+(?:-[A-Z0-9]+)*)',
            r'IGL([A-Z0-9]+(?:-[A-Z0-9]+)*)',
            r'IGW([A-Z0-9]+(?:-[A-Z0-9]+)*)'
        ]
        
        for pattern in html_patterns:
            match = re.search(pattern, html, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def extract_product_name_from_page(self, html: str) -> str:
        """Extract product name from page"""
        name_patterns = [
            r'<h1[^>]*>([^<]+)</h1>',
            r'<title[^>]*>([^<]+)</title>',
            r'product-name[^>]*>([^<]+)',
            r'CoolGaN[™]?\s*([A-Z0-9\s\-]+)'
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, html, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return "Infineon GaN Transistor"
    
    def extract_description_from_page(self, html: str) -> str:
        """Extract product description from page"""
        desc_patterns = [
            r'<meta[^>]*name="description"[^>]*content="([^"]+)"',
            r'<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)</p>',
            r'product-description[^>]*>([^<]+)'
        ]
        
        for pattern in desc_patterns:
            match = re.search(pattern, html, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return "Infineon Gallium Nitride (GaN) transistor for power applications"
    
    def extract_datasheet_url_from_page(self, html: str) -> Optional[str]:
        """Extract datasheet URL from page"""
        datasheet_patterns = [
            r'href=["\']([^"\']*datasheet[^"\']*\.pdf)["\']',
            r'href=["\']([^"\']*download[^"\']*\.pdf)["\']',
            r'href=["\']([^"\']*document[^"\']*\.pdf)["\']',
            r'href=["\']([^"\']*\.pdf)["\']'
        ]
        
        for pattern in datasheet_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                if match.startswith('/'):
                    return urljoin(self.base_url, match)
                elif match.startswith('http'):
                    return match
                else:
                    return urljoin(self.base_url, '/' + match)
        
        return None
    
    def extract_specifications_from_page(self, html: str) -> Dict[str, Any]:
        """Extract specifications from page"""
        specs = {}
        
        # Extract voltage rating
        voltage_match = re.search(r'(\d+)\s*V', html, re.IGNORECASE)
        if voltage_match:
            specs['voltage_rating'] = float(voltage_match.group(1))
        
        # Extract current rating
        current_match = re.search(r'(\d+(?:\.\d+)?)\s*A', html, re.IGNORECASE)
        if current_match:
            specs['current_rating'] = float(current_match.group(1))
        
        # Extract power rating
        power_match = re.search(r'(\d+(?:\.\d+)?)\s*W', html, re.IGNORECASE)
        if power_match:
            specs['power_rating'] = float(power_match.group(1))
        
        # Extract package type
        package_match = re.search(r'(TO-[A-Z0-9]+|DFN|QFN|PQFN|SMD)', html, re.IGNORECASE)
        if package_match:
            specs['package_type'] = package_match.group(1)
        
        return specs
    
    def remove_duplicate_products(self, products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate products based on part number"""
        seen_part_numbers = set()
        unique_products = []
        
        for product in products:
            part_number = product.get('part_number')
            if part_number and part_number not in seen_part_numbers:
                seen_part_numbers.add(part_number)
                unique_products.append(product)
        
        return unique_products
    
    async def download_datasheet(self, session: aiohttp.ClientSession, datasheet_url: str, part_number: str) -> Optional[Path]:
        """Download datasheet file"""
        try:
            async with session.get(datasheet_url, timeout=60) as response:
                if response.status != 200:
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
            print(f"      ❌ Error downloading datasheet: {e}")
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
    print("🔧 Direct Infineon GaN Scraper")
    print("=" * 50)
    
    scraper = DirectInfineonScraper()
    
    # Get max products from command line argument
    max_products = 100
    if len(sys.argv) > 1:
        try:
            max_products = int(sys.argv[1])
        except ValueError:
            print("❌ Invalid number provided. Using default: 100")
    
    print(f"🎯 Will scrape up to {max_products} products")
    
    # Run the scraper
    results = await scraper.scrape_all_gan_products(max_products)
    
    if results["success"]:
        print(f"\n🎉 Scraping completed successfully!")
        print(f"📊 Summary:")
        print(f"   - Products found: {results['total_products']}")
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