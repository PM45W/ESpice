#!/usr/bin/env python3
"""
Enhanced Infineon GaN scraper
Downloads all datasheets from Infineon's GaN transistor page
This version navigates deeper into category pages to find actual products
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

class EnhancedInfineonScraper:
    """Enhanced scraper for Infineon GaN transistors"""
    
    def __init__(self):
        self.base_url = "https://www.infineon.com"
        self.gan_url = "https://www.infineon.com/products/power/gallium-nitride/gallium-nitride-transistor"
        self.datasheets_dir = Path("datasheets/infineon")
        self.datasheets_dir.mkdir(parents=True, exist_ok=True)
        self.visited_urls = set()
        
    async def scrape_all_gan_products(self, max_products: int = 100) -> Dict[str, Any]:
        """Scrape all GaN transistor products and download datasheets"""
        print(f"🚀 Starting Enhanced Infineon GaN scraper...")
        print(f"📡 Target URL: {self.gan_url}")
        print(f"📁 Datasheets will be saved to: {self.datasheets_dir}")
        
        products = []
        errors = []
        datasheets_downloaded = 0
        
        try:
            async with aiohttp.ClientSession() as session:
                # Step 1: Get the main GaN page
                print(f"\n1️⃣ Fetching main GaN page...")
                async with session.get(self.gan_url, timeout=30) as response:
                    if response.status != 200:
                        error_msg = f"Failed to fetch main page: {response.status}"
                        errors.append(error_msg)
                        print(f"❌ {error_msg}")
                        return {"success": False, "products": [], "errors": errors}
                    
                    html = await response.text()
                    print(f"✅ Main page fetched successfully")
                
                # Step 2: Extract category links and navigate deeper
                print(f"\n2️⃣ Extracting category links and navigating deeper...")
                category_links = self.extract_category_links(html)
                print(f"✅ Found {len(category_links)} category links")
                
                # Step 3: Navigate through categories to find product pages
                print(f"\n3️⃣ Navigating through categories to find product pages...")
                product_links = []
                
                for i, category_url in enumerate(category_links):
                    if len(product_links) >= max_products:
                        break
                        
                    print(f"   🔍 Exploring category {i+1}/{len(category_links)}: {category_url}")
                    
                    try:
                        category_products = await self.explore_category(session, category_url)
                        product_links.extend(category_products)
                        print(f"      ✅ Found {len(category_products)} products in this category")
                        
                        # Delay between category requests
                        await asyncio.sleep(2.0)
                        
                    except Exception as e:
                        error_msg = f"Error exploring category {category_url}: {str(e)}"
                        errors.append(error_msg)
                        print(f"      ❌ {error_msg}")
                
                # Remove duplicates and limit
                product_links = list(set(product_links))[:max_products]
                print(f"✅ Total unique product links found: {len(product_links)}")
                
                # Step 4: Scrape each product
                print(f"\n4️⃣ Scraping products (max: {max_products})...")
                for i, product_url in enumerate(product_links):
                    try:
                        print(f"   📦 Processing product {i+1}/{len(product_links)}: {product_url}")
                        
                        product_info = await self.scrape_product(session, product_url)
                        if product_info:
                            products.append(product_info)
                            
                            # Download datasheet if available
                            if product_info.get('datasheet_url'):
                                print(f"      📄 Downloading datasheet...")
                                datasheet_path = await self.download_datasheet(
                                    session, product_info['datasheet_url'], product_info['part_number']
                                )
                                if datasheet_path:
                                    product_info['datasheet_path'] = str(datasheet_path)
                                    datasheets_downloaded += 1
                                    print(f"      ✅ Datasheet saved: {datasheet_path}")
                                else:
                                    print(f"      ❌ Failed to download datasheet")
                            else:
                                print(f"      ⚠️  No datasheet URL found")
                        
                        # Delay between requests
                        await asyncio.sleep(2.0)
                        
                    except Exception as e:
                        error_msg = f"Error processing {product_url}: {str(e)}"
                        errors.append(error_msg)
                        print(f"      ❌ {error_msg}")
                
                print(f"\n✅ Scraping completed!")
                print(f"📊 Results:")
                print(f"   - Products scraped: {len(products)}")
                print(f"   - Datasheets downloaded: {datasheets_downloaded}")
                print(f"   - Errors: {len(errors)}")
                
                # Save results to JSON file
                results_file = self.datasheets_dir / "scraping_results_enhanced.json"
                results = {
                    "timestamp": datetime.now().isoformat(),
                    "url": self.gan_url,
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
    
    def extract_category_links(self, html: str) -> List[str]:
        """Extract category links from the main GaN page"""
        links = []
        
        # Look for category links that might contain products
        patterns = [
            r'href=["\']([^"\']*products/power/gallium-nitride[^"\']*)["\']',
            r'href=["\']([^"\']*cms/en/product/power/gallium-nitride[^"\']*)["\']',
            r'href=["\']([^"\']*gan[^"\']*transistor[^"\']*)["\']',
            r'href=["\']([^"\']*CoolGaN[^"\']*)["\']',
            r'href=["\']([^"\']*product-table[^"\']*)["\']',
            r'href=["\']([^"\']*gan-smart[^"\']*)["\']',
            r'href=["\']([^"\']*gan-with-integrated-driver[^"\']*)["\']',
            r'href=["\']([^"\']*gan-bidirectional-switches[^"\']*)["\']'
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
                links.append(link)
        
        # Remove duplicates and filter
        unique_links = list(set(links))
        filtered_links = [link for link in unique_links if 'infineon.com' in link]
        
        return filtered_links
    
    async def explore_category(self, session: aiohttp.ClientSession, category_url: str) -> List[str]:
        """Explore a category page to find product links"""
        if category_url in self.visited_urls:
            return []
        
        self.visited_urls.add(category_url)
        product_links = []
        
        try:
            async with session.get(category_url, timeout=30) as response:
                if response.status != 200:
                    return []
                
                html = await response.text()
            
            # Look for product links in the category page
            product_patterns = [
                r'href=["\']([^"\']*product-detail[^"\']*)["\']',
                r'href=["\']([^"\']*datasheet[^"\']*)["\']',
                r'href=["\']([^"\']*CoolGaN[^"\']*)["\']',
                r'href=["\']([^"\']*gan[^"\']*transistor[^"\']*)["\']',
                r'href=["\']([^"\']*IGT[^"\']*)["\']',
                r'href=["\']([^"\']*IGL[^"\']*)["\']',
                r'href=["\']([^"\']*IGW[^"\']*)["\']',
                r'href=["\']([^"\']*\.pdf)["\']'
            ]
            
            for pattern in product_patterns:
                matches = re.findall(pattern, html, re.IGNORECASE)
                for match in matches:
                    if match.startswith('/'):
                        link = urljoin(self.base_url, match)
                    elif match.startswith('http'):
                        link = match
                    else:
                        link = urljoin(self.base_url, '/' + match)
                    
                    # Filter for actual product pages or datasheets
                    if self.is_product_link(link):
                        product_links.append(link)
            
            # Also look for sub-category links and explore them
            subcategory_patterns = [
                r'href=["\']([^"\']*products/power/gallium-nitride[^"\']*)["\']',
                r'href=["\']([^"\']*gan[^"\']*)["\']'
            ]
            
            for pattern in subcategory_patterns:
                matches = re.findall(pattern, html, re.IGNORECASE)
                for match in matches:
                    if match.startswith('/'):
                        subcategory_url = urljoin(self.base_url, match)
                    elif match.startswith('http'):
                        subcategory_url = match
                    else:
                        subcategory_url = urljoin(self.base_url, '/' + match)
                    
                    if subcategory_url not in self.visited_urls and 'infineon.com' in subcategory_url:
                        # Recursively explore subcategories (but limit depth)
                        if len(self.visited_urls) < 20:  # Limit to prevent infinite recursion
                            subcategory_products = await self.explore_category(session, subcategory_url)
                            product_links.extend(subcategory_products)
            
            return list(set(product_links))
            
        except Exception as e:
            print(f"      ❌ Error exploring category {category_url}: {e}")
            return []
    
    def is_product_link(self, url: str) -> bool:
        """Check if a URL is likely to be a product page or datasheet"""
        # Look for patterns that indicate product pages or datasheets
        product_indicators = [
            'product-detail',
            'datasheet',
            'CoolGaN',
            'IGT',  # Common Infineon GaN part number prefix
            'IGL',
            'IGW',
            '.pdf'
        ]
        
        url_lower = url.lower()
        return any(indicator.lower() in url_lower for indicator in product_indicators)
    
    async def scrape_product(self, session: aiohttp.ClientSession, product_url: str) -> Optional[Dict[str, Any]]:
        """Scrape individual product information"""
        try:
            async with session.get(product_url, timeout=30) as response:
                if response.status != 200:
                    return None
                
                html = await response.text()
            
            # Extract product information
            product_info = self.extract_product_info(html, product_url)
            
            if not product_info:
                return None
            
            return product_info
            
        except Exception as e:
            print(f"      ❌ Error scraping product: {e}")
            return None
    
    def extract_product_info(self, html: str, product_url: str) -> Optional[Dict[str, Any]]:
        """Extract product information from HTML"""
        
        # Extract part number
        part_number = self.extract_part_number(product_url, html)
        if not part_number:
            return None
        
        # Extract other information
        name = self.extract_product_name(html)
        description = self.extract_description(html)
        datasheet_url = self.extract_datasheet_url(html)
        specifications = self.extract_specifications(html)
        
        return {
            'part_number': part_number,
            'name': name,
            'description': description,
            'product_url': product_url,
            'datasheet_url': datasheet_url,
            'specifications': specifications,
            'scraped_at': datetime.now().isoformat()
        }
    
    def extract_part_number(self, url: str, html: str) -> Optional[str]:
        """Extract part number from URL or HTML"""
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
        
        # Try HTML
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
    
    def extract_product_name(self, html: str) -> str:
        """Extract product name"""
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
    
    def extract_description(self, html: str) -> str:
        """Extract product description"""
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
    
    def extract_datasheet_url(self, html: str) -> Optional[str]:
        """Extract datasheet URL"""
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
    
    def extract_specifications(self, html: str) -> Dict[str, Any]:
        """Extract specifications"""
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
    print("🔧 Enhanced Infineon GaN Scraper")
    print("=" * 50)
    
    scraper = EnhancedInfineonScraper()
    
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