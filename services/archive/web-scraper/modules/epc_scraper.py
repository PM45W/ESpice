"""
EPC Scraper Module
Specialized scraper for EPC-Co.com products
"""

import asyncio
import aiohttp
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import re
from urllib.parse import urljoin
import uuid

from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)

class EPCCoScraper(BaseScraper):
    """Specialized scraper for EPC-Co.com with support for datasheet and SPICE model downloads"""
    
    def __init__(self, db_manager, file_manager, data_processor):
        super().__init__(db_manager, file_manager, data_processor)
        self.base_url = "https://epc-co.com"
        self.search_url = "https://epc-co.com/epc/products/gan-fets-and-ics"
        self.delay_between_requests = 1.5
        self.max_retries = 3
        self.timeout = 30
    
    def get_manufacturer_info(self) -> Dict[str, str]:
        """Get manufacturer information"""
        return {
            'name': 'EPC',
            'display_name': 'Efficient Power Conversion (EPC)',
            'base_url': self.base_url,
            'supported': True
        }
    
    async def scrape_products(self, **kwargs) -> Dict[str, Any]:
        """Scrape products from EPC website"""
        try:
            use_csv_data = kwargs.get('use_csv_data', False)
            
            if use_csv_data:
                return await self._scrape_from_csv()
            else:
                return await self._scrape_from_website()
                
        except Exception as e:
            logger.error(f"Error scraping EPC products: {e}")
            return {'error': str(e)}
    
    async def _scrape_from_csv(self) -> Dict[str, Any]:
        """Scrape products using CSV data"""
        try:
            # Look for EPC CSV/XLSX files in the datasheets directory
            epc_files = []
            for file_path in self.file_manager.datasheets_path.rglob("*"):
                if file_path.is_file() and file_path.suffix.lower() in ['.xlsx', '.xls', '.csv']:
                    if 'epc' in file_path.name.lower():
                        epc_files.append(file_path)
            
            if not epc_files:
                return {'error': 'No EPC data files found'}
            
            # Process the first EPC file found
            file_path = epc_files[0]
            result = self.data_processor.process_epc_xlsx(file_path)
            
            if 'error' in result:
                return result
            
            # Save to database
            for product in result.get('products', []):
                product['product_id'] = str(uuid.uuid4())
                product['created_at'] = datetime.now().isoformat()
                product['updated_at'] = datetime.now().isoformat()
                self.db_manager.save_product(product)
            
            return {
                'success': True,
                'manufacturer': 'EPC',
                'total_products': len(result.get('products', [])),
                'products': result.get('products', []),
                'source_file': str(file_path),
                'processed_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error scraping from CSV: {e}")
            return {'error': str(e)}
    
    async def _scrape_from_website(self) -> Dict[str, Any]:
        """Scrape products from EPC website"""
        try:
            products = []
            errors = []
            
            # Get the main page
            html = await self.make_request(self.search_url)
            if not html:
                return {'error': 'Failed to fetch EPC main page'}
            
            # Extract product links
            product_links = self._extract_product_links(html)
            
            for i, product_url in enumerate(product_links[:50]):  # Limit to 50 for demo
                try:
                    # Extract model number from URL
                    model_number = self._extract_model_number_from_url(product_url)
                    if not model_number:
                        continue
                    
                    # Scrape individual product
                    product = await self._scrape_product_page(model_number)
                    if product:
                        products.append(product)
                        self.db_manager.save_product(product)
                    
                    # Delay between requests
                    await self.delay(self.delay_between_requests)
                    
                except Exception as e:
                    error_msg = f"Error scraping product {product_url}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
            
            return {
                'success': True,
                'manufacturer': 'EPC',
                'total_products': len(products),
                'products': products,
                'errors': errors,
                'processed_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error scraping from website: {e}")
            return {'error': str(e)}
    
    def _extract_product_links(self, html: str) -> List[str]:
        """Extract product links from EPC main page"""
        links = []
        
        # Look for links to individual product pages
        patterns = [
            r'href=["\']([^"\']*epc/products/gan-fets-and-ics/[^"\']*)["\']',
            r'href=["\']([^"\']*product-detail[^"\']*)["\']',
            r'href=["\']([^"\']*gan-fets-and-ics/[^"\']*)["\']'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                if match.startswith('/'):
                    link = urljoin(self.base_url, match)
                elif match.startswith('http'):
                    link = match
                else:
                    link = urljoin(self.search_url, match)
                
                if link not in links:
                    links.append(link)
        
        return links
    
    def _extract_model_number_from_url(self, url: str) -> Optional[str]:
        """Extract model number from product URL"""
        try:
            # Common patterns for EPC model numbers
            patterns = [
                r'/([a-zA-Z0-9]+)$',  # End of URL
                r'/([a-zA-Z0-9]+)/?$',  # End of URL with optional slash
                r'product/([a-zA-Z0-9]+)',  # After 'product/'
                r'gan-fets-and-ics/([a-zA-Z0-9]+)',  # After 'gan-fets-and-ics/'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, url, re.IGNORECASE)
                if match:
                    model_number = match.group(1).strip()
                    if model_number and len(model_number) >= 3:
                        return model_number.upper()
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting model number from {url}: {e}")
            return None
    
    async def _scrape_product_page(self, model_number: str) -> Optional[Dict[str, Any]]:
        """Scrape individual product page"""
        try:
            product_url = f"{self.search_url}/{model_number.lower()}"
            html = await self.make_request(product_url)
            
            if not html:
                return None
            
            # Extract product information
            product_info = self._extract_product_info(html, product_url, model_number)
            if not product_info:
                return None
            
            # Create product object
            product = {
                'product_id': str(uuid.uuid4()),
                'manufacturer': 'EPC',
                'part_number': model_number,
                'category': 'GAN_POWER',
                'name': product_info.get('name', f'EPC {model_number}'),
                'description': product_info.get('description', ''),
                'specifications': product_info.get('specifications', {}),
                'datasheet_url': f"https://epc-co.com/epc/portals/0/epc/documents/datasheets/{model_number.upper()}_datasheet.pdf",
                'product_url': product_url,
                'voltage_rating': product_info.get('voltage_rating'),
                'current_rating': product_info.get('current_rating'),
                'power_rating': product_info.get('power_rating'),
                'package_type': product_info.get('package_type'),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            return product
            
        except Exception as e:
            logger.error(f"Error scraping product page for {model_number}: {e}")
            return None
    
    def _extract_product_info(self, html: str, product_url: str, model_number: str) -> Optional[Dict[str, Any]]:
        """Extract product information from HTML"""
        try:
            # Extract basic information using selectors
            name_selectors = ['.product-title', '.product-name', 'h1', '.title']
            description_selectors = ['.product-description', '.description', '.summary']
            
            name = self.extract_text_with_selectors(html, name_selectors)
            description = self.extract_text_with_selectors(html, description_selectors)
            
            # Extract specifications
            specifications = self._extract_specifications(html)
            
            # Extract ratings
            voltage_rating = self._extract_voltage_from_specs(specifications)
            current_rating = self._extract_current_from_specs(specifications)
            power_rating = self._extract_power_from_specs(specifications)
            
            return {
                'name': name or f'EPC {model_number}',
                'description': description or f'GaN FET from EPC',
                'specifications': specifications,
                'voltage_rating': voltage_rating,
                'current_rating': current_rating,
                'power_rating': power_rating,
                'package_type': specifications.get('package_type', '')
            }
            
        except Exception as e:
            logger.error(f"Error extracting product info: {e}")
            return None
    
    def _extract_specifications(self, html: str) -> Dict[str, Any]:
        """Extract specifications from HTML"""
        specs = {}
        
        try:
            # Look for specification tables
            spec_patterns = [
                r'<tr[^>]*>.*?<td[^>]*>([^<]+)</td>.*?<td[^>]*>([^<]+)</td>.*?</tr>',
                r'<dt[^>]*>([^<]+)</dt>.*?<dd[^>]*>([^<]+)</dd>',
            ]
            
            for pattern in spec_patterns:
                matches = re.findall(pattern, html, re.IGNORECASE | re.DOTALL)
                for key, value in matches:
                    key = key.strip().lower().replace(' ', '_')
                    value = value.strip()
                    if key and value:
                        specs[key] = value
            
        except Exception as e:
            logger.error(f"Error extracting specifications: {e}")
        
        return specs
    
    def _extract_voltage_from_specs(self, specs: Dict[str, Any]) -> Optional[float]:
        """Extract voltage rating from specifications"""
        try:
            voltage_fields = ['voltage', 'vds', 'voltage_rating', 'v_ds', 'drain_source_voltage']
            for field in voltage_fields:
                if field in specs:
                    voltage_text = specs[field]
                    voltage_pattern = r'(\d+(?:\.\d+)?)\s*[Vv]'
                    match = re.search(voltage_pattern, voltage_text)
                    if match:
                        return float(match.group(1))
        except:
            pass
        return None
    
    def _extract_current_from_specs(self, specs: Dict[str, Any]) -> Optional[float]:
        """Extract current rating from specifications"""
        try:
            current_fields = ['current', 'id', 'current_rating', 'i_d', 'drain_current']
            for field in current_fields:
                if field in specs:
                    current_text = specs[field]
                    current_pattern = r'(\d+(?:\.\d+)?)\s*[mM]?[Aa]'
                    match = re.search(current_pattern, current_text)
                    if match:
                        value = float(match.group(1))
                        if 'm' in current_text.lower():
                            value /= 1000
                        return value
        except:
            pass
        return None
    
    def _extract_power_from_specs(self, specs: Dict[str, Any]) -> Optional[float]:
        """Extract power rating from specifications"""
        try:
            power_fields = ['power', 'pd', 'power_rating', 'power_dissipation']
            for field in power_fields:
                if field in specs:
                    power_text = specs[field]
                    power_pattern = r'(\d+(?:\.\d+)?)\s*[mM]?[Ww]'
                    match = re.search(power_pattern, power_text)
                    if match:
                        value = float(match.group(1))
                        if 'm' in power_text.lower():
                            value /= 1000
                        return value
        except:
            pass
        return None
    
    async def download_datasheets(self, product_ids: List[str]) -> Dict[str, Any]:
        """Download datasheets for specified products"""
        try:
            results = {
                "successful": [],
                "failed": [],
                "total_requested": len(product_ids),
                "datasheets_downloaded": 0,
                "spice_models_downloaded": 0
            }
            
            for product_id in product_ids:
                try:
                    # Get product info from database
                    product = self.db_manager.get_product_by_part_number(product_id)
                    if not product:
                        results["failed"].append({
                            "product_id": product_id,
                            "error": "Product not found in database",
                            "success": False
                        })
                        continue
                    
                    # Download datasheet
                    datasheet_path = await self._download_datasheet(product_id)
                    if datasheet_path:
                        results["datasheets_downloaded"] += 1
                        results["successful"].append({
                            "product_id": product_id,
                            "datasheet_path": str(datasheet_path),
                            "success": True
                        })
                    else:
                        results["failed"].append({
                            "product_id": product_id,
                            "error": "Failed to download datasheet",
                            "success": False
                        })
                    
                    # Delay between requests
                    await self.delay(self.delay_between_requests)
                    
                except Exception as e:
                    error_msg = f"Failed to download datasheet for {product_id}: {str(e)}"
                    logger.error(error_msg)
                    results["failed"].append({
                        "product_id": product_id,
                        "error": str(e),
                        "success": False
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Error in datasheet download: {e}")
            return {
                "successful": [],
                "failed": [],
                "total_requested": len(product_ids),
                "datasheets_downloaded": 0,
                "spice_models_downloaded": 0,
                "error": str(e)
            }
    
    async def _download_datasheet(self, model_number: str) -> Optional[Path]:
        """Download datasheet for a specific model"""
        try:
            # EPC datasheet URL pattern
            datasheet_url = f"https://epc-co.com/epc/portals/0/epc/documents/datasheets/{model_number.upper()}_datasheet.pdf"
            
            # Download file
            filename = f"{model_number.upper()}_datasheet.pdf"
            file_path = await self.file_manager.download_file(datasheet_url, filename, "epc")
            
            if file_path:
                # Calculate hash
                file_hash = self.file_manager.calculate_file_hash(file_path)
                
                # Update database
                product = self.db_manager.get_product_by_part_number(model_number)
                if product:
                    product['datasheet_path'] = str(file_path)
                    product['datasheet_hash'] = file_hash
                    product['updated_at'] = datetime.now().isoformat()
                    self.db_manager.save_product(product)
                
                return file_path
            
            return None
            
        except Exception as e:
            logger.error(f"Error downloading datasheet for {model_number}: {e}")
            return None 