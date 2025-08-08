"""
Base Scraper Module
Provides common functionality for all web scrapers
"""

import asyncio
import aiohttp
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import re
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

class BaseScraper(ABC):
    """Abstract base class for all web scrapers"""
    
    def __init__(self, db_manager, file_manager, data_processor):
        self.db_manager = db_manager
        self.file_manager = file_manager
        self.data_processor = data_processor
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    @abstractmethod
    async def scrape_products(self, **kwargs) -> Dict[str, Any]:
        """Scrape products from the manufacturer's website"""
        pass
    
    @abstractmethod
    async def download_datasheets(self, product_ids: List[str]) -> Dict[str, Any]:
        """Download datasheets for specified products"""
        pass
    
    @abstractmethod
    def get_manufacturer_info(self) -> Dict[str, str]:
        """Get manufacturer information"""
        pass
    
    def get_browser_headers(self) -> Dict[str, str]:
        """Get browser-like headers to avoid blocking"""
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
    
    async def make_request(self, url: str, method: str = 'GET', **kwargs) -> Optional[str]:
        """Make HTTP request with error handling"""
        if not self.session:
            raise RuntimeError("Session not initialized. Use async context manager.")
            
        try:
            async with self.session.request(method, url, headers=self.get_browser_headers(), **kwargs) as response:
                if response.status == 200:
                    return await response.text()
                else:
                    logger.error(f"Request failed for {url}: {response.status}")
                    return None
        except Exception as e:
            logger.error(f"Request error for {url}: {e}")
            return None
    
    def extract_text_with_selectors(self, html: str, selectors: List[str]) -> str:
        """Extract text using multiple CSS selectors"""
        # This is a simplified version - in practice, you'd use BeautifulSoup
        for selector in selectors:
            # Basic regex-based extraction for demonstration
            if selector.startswith('.'):
                # Class selector
                pattern = rf'class="{selector[1:]}"[^>]*>([^<]*)'
            elif selector.startswith('#'):
                # ID selector
                pattern = rf'id="{selector[1:]}"[^>]*>([^<]*)'
            else:
                # Tag selector
                pattern = rf'<{selector}[^>]*>([^<]*)'
            
            match = re.search(pattern, html, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return ""
    
    def extract_url_with_selectors(self, html: str, selectors: List[str], base_url: str) -> Optional[str]:
        """Extract URL using multiple CSS selectors"""
        for selector in selectors:
            if selector.startswith('a[href'):
                # Extract href attribute
                pattern = r'href=["\']([^"\']*)["\']'
                matches = re.findall(pattern, html, re.IGNORECASE)
                for match in matches:
                    if match.startswith('/'):
                        return urljoin(base_url, match)
                    elif match.startswith('http'):
                        return match
        
        return None
    
    async def delay(self, seconds: float = 1.0):
        """Add delay between requests"""
        await asyncio.sleep(seconds) 