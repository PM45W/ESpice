from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import logging
from datetime import datetime
import uuid
from pathlib import Path
import aiofiles
import asyncio
import aiohttp
import sqlite3
import os
from enum import Enum
import re
from urllib.parse import urljoin, urlparse
import hashlib
import time
from dataclasses import dataclass
import pandas as pd
import csv
import io
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Web Scraper Service", version="1.0.0")

# Add CORS middleware for frontend-backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Manufacturer(str, Enum):
    INFINEON = "infineon"
    WOLFSPEED = "wolfspeed"
    QORVO = "qorvo"
    NXP = "nxp"
    TI = "ti"
    STMICRO = "stmicro"
    ROHM = "rohm"
    TOSHIBA = "toshiba"
    RENESAS = "renesas"
    EPC_CO = "epc_co"
    CUSTOM = "custom"

class ProductCategory(str, Enum):
    GAN_POWER = "gan_power"
    GAN_RF = "gan_rf"
    GAN_DRIVER = "gan_driver"
    GAN_MODULE = "gan_module"
    GAN_DISCRETE = "gan_discrete"
    GAN_IC = "gan_ic"

class ScrapingStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ScrapingJob(BaseModel):
    job_id: str
    manufacturer: Manufacturer
    category: Optional[ProductCategory] = None
    keywords: Optional[List[str]] = None
    max_products: Optional[int] = 100
    include_datasheets: bool = True
    status: ScrapingStatus = ScrapingStatus.PENDING
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_products: int = 0
    scraped_products: int = 0
    downloaded_datasheets: int = 0
    errors: List[str] = []

class GaNProduct(BaseModel):
    product_id: str
    manufacturer: Manufacturer
    part_number: str
    category: ProductCategory
    name: str
    description: str
    specifications: Dict[str, Any]
    datasheet_url: Optional[str] = None
    datasheet_path: Optional[str] = None
    datasheet_hash: Optional[str] = None
    product_url: Optional[str] = None
    image_url: Optional[str] = None
    price_range: Optional[str] = None
    availability: Optional[str] = None
    package_type: Optional[str] = None
    voltage_rating: Optional[float] = None
    current_rating: Optional[float] = None
    power_rating: Optional[float] = None
    frequency_range: Optional[str] = None
    temperature_range: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ScrapingConfig(BaseModel):
    manufacturer: Manufacturer
    base_url: str
    search_url: str
    product_selector: str
    datasheet_selector: str
    pagination_selector: Optional[str] = None
    delay_between_requests: float = 1.0
    max_retries: int = 3
    timeout: int = 30

@dataclass
class ScrapingResult:
    success: bool
    products: List[GaNProduct]
    errors: List[str]
    total_found: int
    datasheets_downloaded: int

class DatabaseManager:
    """Database manager for storing scraped data"""
    
    def __init__(self, db_path: str = "scraped_data.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create products table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                product_id TEXT PRIMARY KEY,
                manufacturer TEXT NOT NULL,
                part_number TEXT UNIQUE NOT NULL,
                category TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                specifications TEXT,
                datasheet_url TEXT,
                datasheet_path TEXT,
                datasheet_hash TEXT,
                product_url TEXT,
                image_url TEXT,
                price_range TEXT,
                availability TEXT,
                package_type TEXT,
                voltage_rating REAL,
                current_rating REAL,
                power_rating REAL,
                frequency_range TEXT,
                temperature_range TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        
        # Create scraping jobs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scraping_jobs (
                job_id TEXT PRIMARY KEY,
                manufacturer TEXT NOT NULL,
                category TEXT,
                keywords TEXT,
                max_products INTEGER,
                include_datasheets BOOLEAN,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                started_at TEXT,
                completed_at TEXT,
                total_products INTEGER DEFAULT 0,
                scraped_products INTEGER DEFAULT 0,
                downloaded_datasheets INTEGER DEFAULT 0,
                errors TEXT
            )
        ''')
        
        # Create datasheets table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS datasheets (
                datasheet_id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER,
                file_hash TEXT,
                download_url TEXT,
                download_date TEXT NOT NULL,
                FOREIGN KEY (product_id) REFERENCES products (product_id)
            )
        ''')
        
        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_products_manufacturer ON products (manufacturer)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_products_category ON products (category)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_products_part_number ON products (part_number)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_jobs_status ON scraping_jobs (status)')
        
        conn.commit()
        conn.close()
    
    def save_product(self, product: GaNProduct) -> bool:
        """Save product to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                product.product_id,
                product.manufacturer.value,
                product.part_number,
                product.category.value,
                product.name,
                product.description,
                json.dumps(product.specifications),
                product.datasheet_url,
                product.datasheet_path,
                product.datasheet_hash,
                product.product_url,
                product.image_url,
                product.price_range,
                product.availability,
                product.package_type,
                product.voltage_rating,
                product.current_rating,
                product.power_rating,
                product.frequency_range,
                product.temperature_range,
                product.created_at.isoformat(),
                product.updated_at.isoformat()
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error saving product {product.part_number}: {e}")
            return False
    
    def save_job(self, job: ScrapingJob) -> bool:
        """Save scraping job to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO scraping_jobs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                job.job_id,
                job.manufacturer.value,
                job.category.value if job.category else None,
                json.dumps(job.keywords) if job.keywords else None,
                job.max_products,
                job.include_datasheets,
                job.status.value,
                job.created_at.isoformat(),
                job.started_at.isoformat() if job.started_at else None,
                job.completed_at.isoformat() if job.completed_at else None,
                job.total_products,
                job.scraped_products,
                job.downloaded_datasheets,
                json.dumps(job.errors)
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error saving job {job.job_id}: {e}")
            return False
    
    def get_products(self, manufacturer: Optional[Manufacturer] = None, 
                    category: Optional[ProductCategory] = None,
                    limit: int = 100) -> List[GaNProduct]:
        """Get products from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = "SELECT * FROM products WHERE 1=1"
            params = []
            
            if manufacturer:
                query += " AND manufacturer = ?"
                params.append(manufacturer.value)
            
            if category:
                query += " AND category = ?"
                params.append(category.value)
            
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            products = []
            for row in cursor.fetchall():
                product = GaNProduct(
                    product_id=row[0],
                    manufacturer=Manufacturer(row[1]),
                    part_number=row[2],
                    category=ProductCategory(row[3]),
                    name=row[4],
                    description=row[5],
                    specifications=json.loads(row[6]) if row[6] else {},
                    datasheet_url=row[7],
                    datasheet_path=row[8],
                    datasheet_hash=row[9],
                    product_url=row[10],
                    image_url=row[11],
                    price_range=row[12],
                    availability=row[13],
                    package_type=row[14],
                    voltage_rating=row[15],
                    current_rating=row[16],
                    power_rating=row[17],
                    frequency_range=row[18],
                    temperature_range=row[19],
                    created_at=datetime.fromisoformat(row[20]),
                    updated_at=datetime.fromisoformat(row[21])
                )
                products.append(product)
            
            conn.close()
            return products
        except Exception as e:
            logger.error(f"Error getting products: {e}")
            return []
    
    def get_job(self, job_id: str) -> Optional[ScrapingJob]:
        """Get scraping job from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM scraping_jobs WHERE job_id = ?", (job_id,))
            row = cursor.fetchone()
            
            if row:
                job = ScrapingJob(
                    job_id=row[0],
                    manufacturer=Manufacturer(row[1]),
                    category=ProductCategory(row[2]) if row[2] else None,
                    keywords=json.loads(row[3]) if row[3] else None,
                    max_products=row[4],
                    include_datasheets=row[5],
                    status=ScrapingStatus(row[6]),
                    created_at=datetime.fromisoformat(row[7]),
                    started_at=datetime.fromisoformat(row[8]) if row[8] else None,
                    completed_at=datetime.fromisoformat(row[9]) if row[9] else None,
                    total_products=row[10],
                    scraped_products=row[11],
                    downloaded_datasheets=row[12],
                    errors=json.loads(row[13]) if row[13] else []
                )
                conn.close()
                return job
            
            conn.close()
            return None
        except Exception as e:
            logger.error(f"Error getting job {job_id}: {e}")
            return None

class WebScraper:
    """Web scraper for GaN products"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        self.datasheets_path = Path("datasheets")
        self.datasheets_path.mkdir(exist_ok=True)
        
        # Manufacturer configurations
        self.configs = {
            Manufacturer.INFINEON: ScrapingConfig(
                manufacturer=Manufacturer.INFINEON,
                base_url="https://www.infineon.com",
                search_url="https://www.infineon.com/products/power/gallium-nitride/gallium-nitride-transistor",
                product_selector=".product-item",
                datasheet_selector="a[href*='datasheet']",
                delay_between_requests=2.0
            ),
            Manufacturer.WOLFSPEED: ScrapingConfig(
                manufacturer=Manufacturer.WOLFSPEED,
                base_url="https://www.wolfspeed.com",
                search_url="https://www.wolfspeed.com/products/power-devices/gan-transistors",
                product_selector=".product-card",
                datasheet_selector="a[href*='datasheet']",
                delay_between_requests=1.5
            ),
            Manufacturer.QORVO: ScrapingConfig(
                manufacturer=Manufacturer.QORVO,
                base_url="https://www.qorvo.com",
                search_url="https://www.qorvo.com/products/p/gan-power",
                product_selector=".product-item",
                datasheet_selector="a[href*='datasheet']",
                delay_between_requests=1.0
            ),
            Manufacturer.EPC_CO: ScrapingConfig(
                manufacturer=Manufacturer.EPC_CO,
                base_url="https://www.epc-co.com",
                search_url="https://www.epc-co.com/products/gan-power-devices",
                product_selector=".product-item",
                datasheet_selector="a[href*='datasheet']",
                delay_between_requests=1.0
            )
        }
    
    async def scrape_manufacturer(self, job: ScrapingJob) -> ScrapingResult:
        """Scrape products from a specific manufacturer"""
        config = self.configs.get(job.manufacturer)
        if not config:
            return ScrapingResult(
                success=False,
                products=[],
                errors=[f"No configuration found for manufacturer {job.manufacturer}"],
                total_found=0,
                datasheets_downloaded=0
            )
        
        products = []
        errors = []
        datasheets_downloaded = 0
        
        try:
            async with aiohttp.ClientSession() as session:
                # Get product listing page
                async with session.get(config.search_url, timeout=config.timeout) as response:
                    if response.status != 200:
                        errors.append(f"Failed to fetch {config.search_url}: {response.status}")
                        return ScrapingResult(False, [], errors, 0, 0)
                    
                    html = await response.text()
                
                # Extract product links (simplified - in real implementation, use proper HTML parsing)
                product_links = self.extract_product_links(html, config)
                
                for i, product_url in enumerate(product_links[:job.max_products]):
                    try:
                        # Scrape individual product
                        product = await self.scrape_product(session, product_url, config, job)
                        if product:
                            products.append(product)
                            
                            # Download datasheet if requested
                            if job.include_datasheets and product.datasheet_url:
                                datasheet_path = await self.download_datasheet(
                                    session, product.datasheet_url, product.part_number
                                )
                                if datasheet_path:
                                    product.datasheet_path = str(datasheet_path)
                                    datasheets_downloaded += 1
                            
                            # Save to database
                            self.db_manager.save_product(product)
                        
                        # Delay between requests
                        await asyncio.sleep(config.delay_between_requests)
                        
                    except Exception as e:
                        error_msg = f"Error scraping product {product_url}: {str(e)}"
                        errors.append(error_msg)
                        logger.error(error_msg)
                
                return ScrapingResult(
                    success=True,
                    products=products,
                    errors=errors,
                    total_found=len(product_links),
                    datasheets_downloaded=datasheets_downloaded
                )
                
        except Exception as e:
            error_msg = f"Error scraping manufacturer {job.manufacturer}: {str(e)}"
            errors.append(error_msg)
            logger.error(error_msg)
            return ScrapingResult(False, [], errors, 0, 0)
    
    def extract_product_links(self, html: str, config: ScrapingConfig) -> List[str]:
        """Extract product links from HTML with manufacturer-specific parsing"""
        links = []
        
        # Manufacturer-specific parsing patterns
        patterns = {
            Manufacturer.INFINEON: [
                r'href=["\']([^"\']*product[^"\']*gan[^"\']*)["\']',
                r'href=["\']([^"\']*cms/en/product/power/gallium-nitride[^"\']*)["\']',
                r'href=["\']([^"\']*product-detail[^"\']*)["\']'
            ],
            Manufacturer.WOLFSPEED: [
                r'href=["\']([^"\']*products/power-devices[^"\']*)["\']',
                r'href=["\']([^"\']*product-detail[^"\']*)["\']',
                r'href=["\']([^"\']*gan-transistors[^"\']*)["\']'
            ],
            Manufacturer.QORVO: [
                r'href=["\']([^"\']*products/p/gan[^"\']*)["\']',
                r'href=["\']([^"\']*product-detail[^"\']*)["\']',
                r'href=["\']([^"\']*gan-power[^"\']*)["\']'
            ],
            Manufacturer.EPC_CO: [
                r'href=["\']([^"\']*products/gan-power-devices[^"\']*)["\']',
                r'href=["\']([^"\']*product-detail[^"\']*)["\']'
            ]
        }
        
        # Get patterns for the specific manufacturer
        manufacturer_patterns = patterns.get(config.manufacturer, [r'href=["\']([^"\']*product[^"\']*)["\']'])
        
        for pattern in manufacturer_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                if match.startswith('/'):
                    link = urljoin(config.base_url, match)
                elif match.startswith('http'):
                    link = match
                else:
                    link = urljoin(config.base_url, '/' + match)
                links.append(link)
        
        return list(set(links))  # Remove duplicates
    
    async def scrape_product(self, session: aiohttp.ClientSession, 
                           product_url: str, config: ScrapingConfig, 
                           job: ScrapingJob) -> Optional[GaNProduct]:
        """Scrape individual product information"""
        try:
            async with session.get(product_url, timeout=config.timeout) as response:
                if response.status != 200:
                    return None
                
                html = await response.text()
            
            # Extract product information (simplified)
            product_info = self.extract_product_info(html, product_url, config)
            
            if not product_info:
                return None
            
            # Create GaN product object
            product = GaNProduct(
                product_id=str(uuid.uuid4()),
                manufacturer=config.manufacturer,
                part_number=product_info.get('part_number', ''),
                category=job.category or ProductCategory.GAN_POWER,
                name=product_info.get('name', ''),
                description=product_info.get('description', ''),
                specifications=product_info.get('specifications', {}),
                datasheet_url=product_info.get('datasheet_url'),
                product_url=product_url,
                image_url=product_info.get('image_url'),
                price_range=product_info.get('price_range'),
                availability=product_info.get('availability'),
                package_type=product_info.get('package_type'),
                voltage_rating=product_info.get('voltage_rating'),
                current_rating=product_info.get('current_rating'),
                power_rating=product_info.get('power_rating'),
                frequency_range=product_info.get('frequency_range'),
                temperature_range=product_info.get('temperature_range'),
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            return product
            
        except Exception as e:
            logger.error(f"Error scraping product {product_url}: {e}")
            return None
    
    def extract_product_info(self, html: str, product_url: str, 
                           config: ScrapingConfig) -> Optional[Dict[str, Any]]:
        """Extract product information from HTML with manufacturer-specific parsing"""
        
        # Extract part number from URL or HTML
        part_number = self.extract_part_number(product_url, html)
        if not part_number:
            return None
        
        # Manufacturer-specific extraction patterns
        extraction_patterns = {
            Manufacturer.INFINEON: {
                'name_selectors': ['h1.product-title', '.product-name', 'h1'],
                'description_selectors': ['.product-description', '.description', '.product-summary'],
                'spec_table_selectors': ['.specifications-table', '.product-specs', 'table'],
                'datasheet_selectors': ['a[href*="datasheet"]', 'a[href*="DataSheet"]', '.download-datasheet'],
                'image_selectors': ['.product-image img', '.product-gallery img', 'img[alt*="product"]']
            },
            Manufacturer.WOLFSPEED: {
                'name_selectors': ['.product-title', 'h1', '.product-name'],
                'description_selectors': ['.product-description', '.description', '.product-summary'],
                'spec_table_selectors': ['.specifications', '.product-specs', 'table'],
                'datasheet_selectors': ['a[href*="datasheet"]', 'a[href*="pdf"]', '.download-datasheet'],
                'image_selectors': ['.product-image img', '.product-gallery img', 'img[alt*="product"]']
            },
            Manufacturer.QORVO: {
                'name_selectors': ['.product-title', 'h1', '.product-name'],
                'description_selectors': ['.product-description', '.description', '.product-summary'],
                'spec_table_selectors': ['.specifications', '.product-specs', 'table'],
                'datasheet_selectors': ['a[href*="datasheet"]', 'a[href*="pdf"]', '.download-datasheet'],
                'image_selectors': ['.product-image img', '.product-gallery img', 'img[alt*="product"]']
            },
            Manufacturer.EPC_CO: {
                'name_selectors': ['.product-title', 'h1', '.product-name'],
                'description_selectors': ['.product-description', '.description', '.product-summary'],
                'spec_table_selectors': ['.specifications', '.product-specs', 'table'],
                'datasheet_selectors': ['a[href*="datasheet"]', 'a[href*="pdf"]', '.download-datasheet'],
                'image_selectors': ['.product-image img', '.product-gallery img', 'img[alt*="product"]']
            }
        }
        
        patterns = extraction_patterns.get(config.manufacturer, {
            'name_selectors': ['h1', '.product-title', '.product-name'],
            'description_selectors': ['.product-description', '.description', 'p'],
            'spec_table_selectors': ['.specifications', 'table'],
            'datasheet_selectors': ['a[href*="datasheet"]', 'a[href*="pdf"]'],
            'image_selectors': ['img[alt*="product"]', '.product-image img']
        })
        
        # Extract information using patterns
        info = {
            'part_number': part_number,
            'name': self.extract_text_with_selectors(html, patterns['name_selectors']),
            'description': self.extract_text_with_selectors(html, patterns['description_selectors']),
            'datasheet_url': self.extract_datasheet_url_with_selectors(html, patterns['datasheet_selectors'], config),
            'image_url': self.extract_image_url_with_selectors(html, patterns['image_selectors'], config),
            'specifications': self.extract_specifications_with_selectors(html, patterns['spec_table_selectors']),
            'voltage_rating': self.extract_voltage_rating(html),
            'current_rating': self.extract_current_rating(html),
            'power_rating': self.extract_power_rating(html)
        }
        
        return info
    
    def extract_part_number(self, url: str, html: str) -> Optional[str]:
        """Extract part number from URL or HTML"""
        # Try to extract from URL first
        url_parts = url.split('/')
        for part in url_parts:
            if re.match(r'^[A-Z0-9]{3,20}$', part):
                return part
        
        # Try to extract from HTML
        # This is simplified - in practice, you'd need more sophisticated parsing
        return None
    
    def extract_text_with_selectors(self, html: str, selectors: List[str]) -> str:
        """Extract text using multiple selectors with regex fallback"""
        # Try to extract text using regex patterns for common HTML structures
        for selector in selectors:
            # Convert CSS selector to regex pattern
            if selector.startswith('h1'):
                pattern = r'<h1[^>]*>(.*?)</h1>'
            elif selector.startswith('.product-title'):
                pattern = r'<[^>]*class="[^"]*product-title[^"]*"[^>]*>(.*?)</[^>]*>'
            elif selector.startswith('.product-name'):
                pattern = r'<[^>]*class="[^"]*product-name[^"]*"[^>]*>(.*?)</[^>]*>'
            elif selector.startswith('.product-description'):
                pattern = r'<[^>]*class="[^"]*product-description[^"]*"[^>]*>(.*?)</[^>]*>'
            elif selector.startswith('.description'):
                pattern = r'<[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)</[^>]*>'
            elif selector.startswith('p'):
                pattern = r'<p[^>]*>(.*?)</p>'
            else:
                continue
            
            matches = re.findall(pattern, html, re.IGNORECASE | re.DOTALL)
            if matches:
                # Clean up HTML tags and return first match
                text = re.sub(r'<[^>]+>', '', matches[0]).strip()
                if text:
                    return text
        
        return "Product description"
    
    def extract_datasheet_url_with_selectors(self, html: str, selectors: List[str], config: ScrapingConfig) -> Optional[str]:
        """Extract datasheet URL using selectors"""
        for selector in selectors:
            if 'datasheet' in selector:
                pattern = r'<a[^>]*href=["\']([^"\']*datasheet[^"\']*)["\'][^>]*>'
            elif 'pdf' in selector:
                pattern = r'<a[^>]*href=["\']([^"\']*\.pdf[^"\']*)["\'][^>]*>'
            else:
                continue
            
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                if match.startswith('/'):
                    return urljoin(config.base_url, match)
                elif match.startswith('http'):
                    return match
                else:
                    return urljoin(config.base_url, '/' + match)
        
        return None
    
    def extract_image_url_with_selectors(self, html: str, selectors: List[str], config: ScrapingConfig) -> Optional[str]:
        """Extract product image URL using selectors"""
        for selector in selectors:
            if 'img' in selector:
                pattern = r'<img[^>]*src=["\']([^"\']*)["\'][^>]*>'
                matches = re.findall(pattern, html, re.IGNORECASE)
                for match in matches:
                    if match.startswith('/'):
                        return urljoin(config.base_url, match)
                    elif match.startswith('http'):
                        return match
                    else:
                        return urljoin(config.base_url, '/' + match)
        
        return None
    
    def extract_specifications_with_selectors(self, html: str, selectors: List[str]) -> Dict[str, Any]:
        """Extract specifications using table selectors"""
        specs = {}
        
        # Look for table structures
        table_pattern = r'<table[^>]*>(.*?)</table>'
        tables = re.findall(table_pattern, html, re.IGNORECASE | re.DOTALL)
        
        for table in tables:
            # Extract rows
            row_pattern = r'<tr[^>]*>(.*?)</tr>'
            rows = re.findall(row_pattern, table, re.IGNORECASE | re.DOTALL)
            
            for row in rows:
                # Extract cells
                cell_pattern = r'<t[dh][^>]*>(.*?)</t[dh]>'
                cells = re.findall(cell_pattern, row, re.IGNORECASE | re.DOTALL)
                
                if len(cells) >= 2:
                    key = re.sub(r'<[^>]+>', '', cells[0]).strip()
                    value = re.sub(r'<[^>]+>', '', cells[1]).strip()
                    
                    if key and value:
                        specs[key] = value
        
        return specs
    
    def extract_datasheet_url(self, html: str, config: ScrapingConfig) -> Optional[str]:
        """Extract datasheet URL from HTML"""
        # Simplified implementation
        # In practice, use proper HTML parsing
        return None
    
    def extract_image_url(self, html: str) -> Optional[str]:
        """Extract product image URL"""
        # Simplified implementation
        return None
    
    def extract_specifications(self, html: str) -> Dict[str, Any]:
        """Extract product specifications"""
        # Simplified implementation
        return {}
    
    def extract_voltage_rating(self, html: str) -> Optional[float]:
        """Extract voltage rating"""
        # Simplified implementation
        return None
    
    def extract_current_rating(self, html: str) -> Optional[float]:
        """Extract current rating"""
        # Simplified implementation
        return None
    
    def extract_power_rating(self, html: str) -> Optional[float]:
        """Extract power rating"""
        # Simplified implementation
        return None
    
    async def download_datasheet(self, session: aiohttp.ClientSession, 
                               datasheet_url: str, part_number: str) -> Optional[Path]:
        """Download datasheet file"""
        try:
            logger.info(f"Attempting to download datasheet from: {datasheet_url}")
            async with session.get(datasheet_url) as response:
                logger.info(f"Response status: {response.status}")
                if response.status != 200:
                    logger.error(f"Failed to download datasheet: HTTP {response.status}")
                    return None
                
                # Determine file extension
                content_type = response.headers.get('content-type', '')
                logger.info(f"Content type: {content_type}")
                if 'pdf' in content_type.lower():
                    ext = '.pdf'
                else:
                    ext = '.pdf'  # Default to PDF
                
                # Create filename
                filename = f"{part_number}_datasheet{ext}"
                file_path = self.datasheets_path / filename
                logger.info(f"Saving datasheet to: {file_path}")
                
                # Download file
                async with aiofiles.open(file_path, 'wb') as f:
                    content = await response.read()
                    await f.write(content)
                    logger.info(f"Successfully downloaded {len(content)} bytes to {file_path}")
                
                return file_path
                
        except Exception as e:
            logger.error(f"Error downloading datasheet {datasheet_url}: {e}")
            return None

class EPCCoScraper(WebScraper):
    """Specialized scraper for EPC-Co.com with support for datasheet and SPICE model downloads"""
    
    def __init__(self, db_manager: DatabaseManager):
        super().__init__(db_manager)
        self.epc_config = ScrapingConfig(
            manufacturer=Manufacturer.EPC_CO,
            base_url="https://epc-co.com",
            search_url="https://epc-co.com/epc/products/gan-fets-and-ics",
            product_selector=".product-item",
            datasheet_selector="a[href*='datasheet']",
            delay_between_requests=1.5,
            max_retries=3,
            timeout=30
        )
    
    async def scrape_epc_manufacturer(self, job: ScrapingJob) -> ScrapingResult:
        """Scrape products from EPC-Co.com manufacturer"""
        products = []
        errors = []
        datasheets_downloaded = 0
        
        try:
            # For EPC-Co.com, we'll scrape the main product listing page
            async with aiohttp.ClientSession() as session:
                async with session.get(self.epc_config.search_url, timeout=self.epc_config.timeout) as response:
                    if response.status != 200:
                        errors.append(f"Failed to fetch {self.epc_config.search_url}: {response.status}")
                        return ScrapingResult(False, [], errors, 0, 0)
                    
                    html = await response.text()
                
                # Extract product links from the main page
                product_links = self.extract_epc_product_links(html)
                
                for i, product_url in enumerate(product_links[:job.max_products]):
                    try:
                        # Extract model number from URL
                        model_number = self.extract_model_number_from_url(product_url)
                        if not model_number:
                            continue
                        
                        # Scrape individual product
                        product = await self.scrape_epc_product(model_number)
                        if product:
                            products.append(product)
                            
                            # Download files if requested
                            if job.include_datasheets:
                                downloaded_files = await self.download_epc_files(
                                    model_number, 
                                    include_datasheet=True, 
                                    include_spice=True
                                )
                                if downloaded_files['datasheet']:
                                    datasheets_downloaded += 1
                            
                            # Save to database
                            self.db_manager.save_product(product)
                        
                        # Delay between requests
                        await asyncio.sleep(self.epc_config.delay_between_requests)
                        
                    except Exception as e:
                        error_msg = f"Error scraping EPC product {product_url}: {str(e)}"
                        errors.append(error_msg)
                        logger.error(error_msg)
                
                return ScrapingResult(
                    success=True,
                    products=products,
                    errors=errors,
                    total_found=len(product_links),
                    datasheets_downloaded=datasheets_downloaded
                )
                
        except Exception as e:
            error_msg = f"Error scraping EPC manufacturer: {str(e)}"
            errors.append(error_msg)
            logger.error(error_msg)
            return ScrapingResult(False, [], errors, 0, 0)
    
    def extract_epc_product_links(self, html: str) -> List[str]:
        """Extract product links from EPC-Co.com main page"""
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
                    link = urljoin(self.epc_config.base_url, match)
                elif match.startswith('http'):
                    link = match
                else:
                    link = urljoin(self.epc_config.base_url, '/' + match)
                links.append(link)
        
        return list(set(links))  # Remove duplicates
    
    def extract_model_number_from_url(self, url: str) -> Optional[str]:
        """Extract model number from EPC product URL"""
        # Look for model number in URL path
        # Example: /epc/products/gan-fets-and-ics/epc2040
        match = re.search(r'/epc/products/gan-fets-and-ics/([^/]+)', url, re.IGNORECASE)
        if match:
            return match.group(1).upper()
        
        # Fallback: look for any alphanumeric pattern that could be a model number
        match = re.search(r'/([A-Z0-9]{3,20})/?$', url, re.IGNORECASE)
        if match:
            return match.group(1).upper()
        
        return None
    
    async def scrape_epc_product(self, model_number: str) -> Optional[GaNProduct]:
        """Scrape a specific EPC product by model number"""
        try:
            # Construct the product URL using the EPC-Co.com pattern
            product_url = f"{self.epc_config.base_url}/epc/products/gan-fets-and-ics/{model_number.lower()}"
            
            # Add browser-like headers to avoid 403 errors
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(product_url, headers=headers, timeout=self.epc_config.timeout) as response:
                    if response.status != 200:
                        logger.error(f"Failed to fetch EPC product {model_number}: {response.status}")
                        return None
                    
                    html = await response.text()
                
                # Extract product information
                product_info = self.extract_epc_product_info(html, product_url, model_number)
                
                if not product_info:
                    return None
                
                # Create GaN product object
                product = GaNProduct(
                    product_id=str(uuid.uuid4()),
                    manufacturer=Manufacturer.EPC_CO,
                    part_number=model_number.upper(),
                    category=ProductCategory.GAN_POWER,
                    name=product_info.get('name', f'EPC {model_number.upper()}'),
                    description=product_info.get('description', ''),
                    specifications=product_info.get('specifications', {}),
                    datasheet_url=product_info.get('datasheet_url'),
                    product_url=product_url,
                    image_url=product_info.get('image_url'),
                    voltage_rating=product_info.get('voltage_rating'),
                    current_rating=product_info.get('current_rating'),
                    power_rating=product_info.get('power_rating'),
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                
                return product
                
        except Exception as e:
            logger.error(f"Error scraping EPC product {model_number}: {e}")
            return None
    
    def extract_epc_product_info(self, html: str, product_url: str, model_number: str) -> Optional[Dict[str, Any]]:
        """Extract product information from EPC-Co.com HTML"""
        
        # EPC-Co.com specific extraction patterns
        epc_patterns = {
            'name_selectors': [
                'h1.product-title',
                '.product-name h1',
                'h1[class*="product"]',
                'h1'
            ],
            'description_selectors': [
                '.product-description',
                '.description',
                '.product-summary',
                '.product-details p'
            ],
            'spec_table_selectors': [
                '.specifications-table',
                '.product-specs table',
                'table.specifications',
                'table'
            ],
            'datasheet_selectors': [
                'a[href*="datasheet"]',
                'a[href*="DataSheet"]',
                'a[href*=".pdf"]',
                '.download-datasheet a'
            ],
            'spice_model_selectors': [
                'a[href*="spice"]',
                'a[href*="SPICE"]',
                'a[href*=".net"]',
                'a[href*=".lib"]',
                'a[href*="model"]'
            ],
            'image_selectors': [
                '.product-image img',
                '.product-gallery img',
                'img[alt*="product"]',
                'img[alt*="EPC"]'
            ]
        }
        
        # Extract basic information
        info = {
            'part_number': model_number.upper(),
            'name': self.extract_text_with_selectors(html, epc_patterns['name_selectors']),
            'description': self.extract_text_with_selectors(html, epc_patterns['description_selectors']),
            'specifications': self.extract_specifications_with_selectors(html, epc_patterns['spec_table_selectors']),
            'image_url': self.extract_image_url_with_selectors(html, epc_patterns['image_selectors'], self.epc_config)
        }
        
        # Extract download links
        datasheet_url = self.extract_download_url_with_selectors(html, epc_patterns['datasheet_selectors'], self.epc_config, 'datasheet')
        spice_model_url = self.extract_download_url_with_selectors(html, epc_patterns['spice_model_selectors'], self.epc_config, 'spice')
        
        # Fallback: Construct datasheet URL directly if not found in HTML
        if not datasheet_url:
            datasheet_url = f"https://epc-co.com/epc/portals/0/epc/documents/datasheets/{model_number.upper()}_datasheet.pdf"
        
        info['datasheet_url'] = datasheet_url
        info['spice_model_url'] = spice_model_url
        
        # Extract voltage and current ratings from specifications
        specs = info['specifications']
        info['voltage_rating'] = self.extract_voltage_from_specs(specs)
        info['current_rating'] = self.extract_current_from_specs(specs)
        info['power_rating'] = self.extract_power_from_specs(specs)
        
        return info
    
    def extract_download_url_with_selectors(self, html: str, selectors: List[str], config: ScrapingConfig, file_type: str) -> Optional[str]:
        """Extract download URL using selectors with file type filtering"""
        for selector in selectors:
            if 'href' in selector:
                # Extract href attributes
                pattern = r'<a[^>]*href=["\']([^"\']*)["\'][^>]*>'
                matches = re.findall(pattern, html, re.IGNORECASE)
                
                for match in matches:
                    # Filter by file type
                    if file_type == 'datasheet' and any(ext in match.lower() for ext in ['datasheet', '.pdf']):
                        if match.startswith('/'):
                            return urljoin(config.base_url, match)
                        elif match.startswith('http'):
                            return match
                        else:
                            return urljoin(config.base_url, '/' + match)
                    elif file_type == 'spice' and any(ext in match.lower() for ext in ['spice', '.net', '.lib', 'model']):
                        if match.startswith('/'):
                            return urljoin(config.base_url, match)
                        elif match.startswith('http'):
                            return match
                        else:
                            return urljoin(config.base_url, '/' + match)
        
        return None
    
    def extract_voltage_from_specs(self, specs: Dict[str, Any]) -> Optional[float]:
        """Extract voltage rating from specifications"""
        voltage_keywords = ['voltage', 'vds', 'v_ds', 'breakdown', 'bv']
        for key, value in specs.items():
            if any(keyword in key.lower() for keyword in voltage_keywords):
                # Extract numeric value
                if isinstance(value, str):
                    voltage_match = re.search(r'(\d+(?:\.\d+)?)\s*V', value, re.IGNORECASE)
                    if voltage_match:
                        return float(voltage_match.group(1))
        return None
    
    def extract_current_from_specs(self, specs: Dict[str, Any]) -> Optional[float]:
        """Extract current rating from specifications"""
        current_keywords = ['current', 'id', 'i_d', 'drain', 'continuous']
        for key, value in specs.items():
            if any(keyword in key.lower() for keyword in current_keywords):
                # Extract numeric value
                if isinstance(value, str):
                    current_match = re.search(r'(\d+(?:\.\d+)?)\s*A', value, re.IGNORECASE)
                    if current_match:
                        return float(current_match.group(1))
        return None
    
    def extract_power_from_specs(self, specs: Dict[str, Any]) -> Optional[float]:
        """Extract power rating from specifications"""
        power_keywords = ['power', 'pd', 'p_d', 'dissipation']
        for key, value in specs.items():
            if any(keyword in key.lower() for keyword in power_keywords):
                # Extract numeric value
                if isinstance(value, str):
                    power_match = re.search(r'(\d+(?:\.\d+)?)\s*W', value, re.IGNORECASE)
                    if power_match:
                        return float(power_match.group(1))
        return None
    
    async def download_epc_files(self, model_number: str, include_datasheet: bool = True, include_spice: bool = True) -> Dict[str, Optional[Path]]:
        """Download both datasheet and SPICE model files for an EPC product"""
        try:
            # First, scrape the product to get download URLs
            product = await self.scrape_epc_product(model_number)
            downloaded_files = {'datasheet': None, 'spice_model': None}
            
            async with aiohttp.ClientSession() as session:
                # Download datasheet if requested
                if include_datasheet:
                    datasheet_url = None
                    if product and product.datasheet_url:
                        datasheet_url = product.datasheet_url
                    else:
                        # Fallback: Construct datasheet URL directly
                        datasheet_url = f"https://epc-co.com/epc/portals/0/epc/documents/datasheets/{model_number.upper()}_datasheet.pdf"
                    
                    datasheet_path = await self.download_datasheet(session, datasheet_url, model_number)
                    if datasheet_path:
                        downloaded_files['datasheet'] = datasheet_path
                        if product:
                            product.datasheet_path = str(datasheet_path)
                
                # Download SPICE model if requested
                if include_spice and product and product.product_url:
                    try:
                        # Extract SPICE model URL from product info
                        product_info = self.extract_epc_product_info(
                            await self.get_product_html(session, product.product_url), 
                            product.product_url, 
                            model_number
                        )
                        
                        if product_info and product_info.get('spice_model_url'):
                            spice_path = await self.download_spice_model(
                                session, 
                                product_info['spice_model_url'], 
                                model_number
                            )
                            if spice_path:
                                downloaded_files['spice_model'] = spice_path
                    except Exception as e:
                        logger.warning(f"Could not download SPICE model for {model_number}: {e}")
                
                # Save updated product to database if it exists
                if product:
                    self.db_manager.save_product(product)
                
                return downloaded_files
                
        except Exception as e:
            logger.error(f"Error downloading EPC files for {model_number}: {e}")
            return {'datasheet': None, 'spice_model': None}
    
    async def get_product_html(self, session: aiohttp.ClientSession, url: str) -> str:
        """Get HTML content for a product page"""
        # Add browser-like headers to avoid 403 errors
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        async with session.get(url, headers=headers, timeout=self.epc_config.timeout) as response:
            if response.status == 200:
                return await response.text()
            else:
                raise Exception(f"Failed to fetch {url}: {response.status}")
    
    async def download_spice_model(self, session: aiohttp.ClientSession, spice_url: str, model_number: str) -> Optional[Path]:
        """Download SPICE model file"""
        try:
            async with session.get(spice_url) as response:
                if response.status != 200:
                    return None
                
                # Determine file extension
                content_type = response.headers.get('content-type', '')
                if 'text' in content_type.lower():
                    ext = '.lib'
                elif 'net' in spice_url.lower():
                    ext = '.net'
                else:
                    ext = '.lib'  # Default to .lib
                
                # Create filename
                filename = f"{model_number}_spice_model{ext}"
                file_path = self.datasheets_path / filename
                
                # Download file
                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(await response.read())
                
                return file_path
                
        except Exception as e:
            logger.error(f"Error downloading SPICE model {spice_url}: {e}")
            return None

    async def download_epc_csv(self, session: aiohttp.ClientSession) -> Optional[str]:
        """Download the CSV file from EPC website with product information"""
        try:
            # The CSV download URL pattern for EPC
            csv_url = "https://epc-co.com/epc/products/gan-fets-and-ics"
            
            logger.info(f"Attempting to download EPC CSV from: {csv_url}")
            
            # First, get the main page to find the CSV download link
            async with session.get(csv_url, headers=self.get_browser_headers()) as response:
                if response.status != 200:
                    logger.error(f"Failed to fetch EPC main page: {response.status}")
                    return None
                
                html = await response.text()
                
                # Look for CSV download links in the HTML - enhanced patterns for download table button
                csv_patterns = [
                    r'href=["\']([^"\']*\.csv[^"\']*)["\']',
                    r'href=["\']([^"\']*download[^"\']*\.csv[^"\']*)["\']',
                    r'href=["\']([^"\']*export[^"\']*\.csv[^"\']*)["\']',
                    r'href=["\']([^"\']*table[^"\']*\.csv[^"\']*)["\']',
                    r'href=["\']([^"\']*products[^"\']*\.csv[^"\']*)["\']',
                    r'href=["\']([^"\']*gan-fets[^"\']*\.csv[^"\']*)["\']',
                    # Look for data attributes that might contain CSV URLs
                    r'data-csv=["\']([^"\']*)["\']',
                    r'data-download=["\']([^"\']*\.csv[^"\']*)["\']',
                    # Look for onclick handlers that might trigger CSV download
                    r'onclick=["\'][^"\']*["\']([^"\']*\.csv[^"\']*)["\']',
                ]
                
                csv_download_url = None
                for pattern in csv_patterns:
                    matches = re.findall(pattern, html, re.IGNORECASE)
                    for match in matches:
                        if match.startswith('/'):
                            csv_download_url = urljoin(self.epc_config.base_url, match)
                            break
                        elif match.startswith('http'):
                            csv_download_url = match
                            break
                    if csv_download_url:
                        break
                
                # If no direct CSV link found, try to find download table button and extract URL
                if not csv_download_url:
                    csv_download_url = self.extract_download_table_url(html)
                
                if not csv_download_url:
                    logger.warning("No CSV download link found in EPC page")
                    return None
                
                logger.info(f"Found CSV download URL: {csv_download_url}")
                
                # Download the CSV file
                async with session.get(csv_download_url, headers=self.get_browser_headers()) as csv_response:
                    if csv_response.status != 200:
                        logger.error(f"Failed to download CSV: {csv_response.status}")
                        return None
                    
                    csv_content = await csv_response.text()
                    logger.info(f"Successfully downloaded CSV with {len(csv_content)} characters")
                    
                    return csv_content
                    
        except Exception as e:
            logger.error(f"Error downloading EPC CSV: {e}")
            return None

    def parse_epc_csv(self, csv_content: str) -> List[Dict[str, Any]]:
        """Parse EPC CSV content and extract product information"""
        try:
            products = []
            
            # Use pandas to parse CSV
            df = pd.read_csv(io.StringIO(csv_content))
            logger.info(f"Parsed CSV with {len(df)} rows and columns: {list(df.columns)}")
            
            # Process each row
            for index, row in df.iterrows():
                try:
                    # Extract basic product information
                    product_info = {
                        'part_number': str(row.get('Part Number', row.get('Model', row.get('Part', '')))).strip(),
                        'name': str(row.get('Name', row.get('Description', row.get('Title', '')))).strip(),
                        'description': str(row.get('Description', row.get('Summary', ''))).strip(),
                        'voltage_rating': self.extract_voltage_from_text(str(row.get('Voltage', row.get('VDS', '')))),
                        'current_rating': self.extract_current_from_text(str(row.get('Current', row.get('ID', '')))),
                        'power_rating': self.extract_power_from_text(str(row.get('Power', row.get('PD', '')))),
                        'package_type': str(row.get('Package', row.get('Package Type', ''))).strip(),
                        'category': ProductCategory.GAN_POWER,  # Default for EPC
                        'manufacturer': Manufacturer.EPC_CO
                    }
                    
                    # Only add if we have a valid part number
                    if product_info['part_number'] and product_info['part_number'] != 'nan':
                        products.append(product_info)
                        
                except Exception as e:
                    logger.warning(f"Error parsing CSV row {index}: {e}")
                    continue
            
            logger.info(f"Successfully parsed {len(products)} products from CSV")
            return products
            
        except Exception as e:
            logger.error(f"Error parsing EPC CSV: {e}")
            return []

    def extract_voltage_from_text(self, text: str) -> Optional[float]:
        """Extract voltage rating from text"""
        try:
            # Look for voltage patterns like "15V", "15 V", "15.0V", etc.
            voltage_pattern = r'(\d+(?:\.\d+)?)\s*[Vv]'
            match = re.search(voltage_pattern, text)
            if match:
                return float(match.group(1))
        except:
            pass
        return None

    def extract_current_from_text(self, text: str) -> Optional[float]:
        """Extract current rating from text"""
        try:
            # Look for current patterns like "3.4A", "3.4 A", "3.4mA", etc.
            current_pattern = r'(\d+(?:\.\d+)?)\s*[mM]?[Aa]'
            match = re.search(current_pattern, text)
            if match:
                value = float(match.group(1))
                # Convert mA to A if needed
                if 'm' in text.lower():
                    value /= 1000
                return value
        except:
            pass
        return None

    def extract_power_from_text(self, text: str) -> Optional[float]:
        """Extract power rating from text"""
        try:
            # Look for power patterns like "10W", "10 W", "10mW", etc.
            power_pattern = r'(\d+(?:\.\d+)?)\s*[mM]?[Ww]'
            match = re.search(power_pattern, text)
            if match:
                value = float(match.group(1))
                # Convert mW to W if needed
                if 'm' in text.lower():
                    value /= 1000
                return value
        except:
            pass
        return None

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

    async def scrape_epc_from_csv(self, include_datasheets: bool = True) -> ScrapingResult:
        """Scrape EPC products using CSV data instead of individual page scraping"""
        try:
            products = []
            errors = []
            datasheets_downloaded = 0
            
            async with aiohttp.ClientSession() as session:
                # Download CSV
                csv_content = await self.download_epc_csv(session)
                if not csv_content:
                    # Try direct CSV download if regular method fails
                    csv_content = await self.download_epc_csv_direct(session)
                    if not csv_content:
                        errors.append("Failed to download EPC CSV")
                        return ScrapingResult(False, [], errors, 0, 0)
                
                # Parse CSV
                csv_products = self.parse_epc_csv(csv_content)
                if not csv_products:
                    errors.append("Failed to parse EPC CSV")
                    return ScrapingResult(False, [], errors, 0, 0)
                
                # Convert CSV data to GaNProduct objects
                for csv_product in csv_products:
                    try:
                        product = GaNProduct(
                            product_id=str(uuid.uuid4()),
                            manufacturer=Manufacturer.EPC_CO,
                            part_number=csv_product['part_number'],
                            category=csv_product['category'],
                            name=csv_product['name'],
                            description=csv_product['description'],
                            specifications={
                                'voltage_rating': csv_product['voltage_rating'],
                                'current_rating': csv_product['current_rating'],
                                'power_rating': csv_product['power_rating'],
                                'package_type': csv_product['package_type']
                            },
                            datasheet_url=f"https://epc-co.com/epc/portals/0/epc/documents/datasheets/{csv_product['part_number'].upper()}_datasheet.pdf",
                            product_url=f"https://epc-co.com/epc/products/gan-fets-and-ics/{csv_product['part_number'].lower()}",
                            voltage_rating=csv_product['voltage_rating'],
                            current_rating=csv_product['current_rating'],
                            power_rating=csv_product['power_rating'],
                            package_type=csv_product['package_type'],
                            created_at=datetime.now(),
                            updated_at=datetime.now()
                        )
                        
                        products.append(product)
                        
                        # Download datasheet if requested
                        if include_datasheets:
                            downloaded_files = await self.download_epc_files(
                                csv_product['part_number'], 
                                include_datasheet=True, 
                                include_spice=False
                            )
                            if downloaded_files['datasheet']:
                                datasheets_downloaded += 1
                                product.datasheet_path = str(downloaded_files['datasheet'])
                        
                        # Save to database
                        self.db_manager.save_product(product)
                        
                    except Exception as e:
                        error_msg = f"Error processing CSV product {csv_product.get('part_number', 'unknown')}: {str(e)}"
                        errors.append(error_msg)
                        logger.error(error_msg)
                
                return ScrapingResult(
                    success=True,
                    products=products,
                    errors=errors,
                    total_found=len(csv_products),
                    datasheets_downloaded=datasheets_downloaded
                )
                
        except Exception as e:
            error_msg = f"Error in CSV-based EPC scraping: {str(e)}"
            errors.append(error_msg)
            logger.error(error_msg)
            return ScrapingResult(False, [], errors, 0, 0)

    def extract_download_table_url(self, html: str) -> Optional[str]:
        """Extract download table URL from HTML by looking for download table button"""
        try:
            # Look for download table button patterns
            download_patterns = [
                # Button with download text
                r'<button[^>]*download[^>]*table[^>]*>.*?</button>',
                r'<a[^>]*download[^>]*table[^>]*>.*?</a>',
                # Button with export text
                r'<button[^>]*export[^>]*>.*?</button>',
                r'<a[^>]*export[^>]*>.*?</a>',
                # Button with CSV text
                r'<button[^>]*csv[^>]*>.*?</button>',
                r'<a[^>]*csv[^>]*>.*?</a>',
                # Generic download button
                r'<button[^>]*download[^>]*>.*?</button>',
                r'<a[^>]*download[^>]*>.*?</a>',
            ]
            
            for pattern in download_patterns:
                matches = re.findall(pattern, html, re.IGNORECASE | re.DOTALL)
                for match in matches:
                    # Extract href or data attributes from the button/link
                    href_match = re.search(r'href=["\']([^"\']*)["\']', match)
                    if href_match:
                        url = href_match.group(1)
                        if url.startswith('/'):
                            return urljoin(self.epc_config.base_url, url)
                        elif url.startswith('http'):
                            return url
                    
                    # Look for data attributes
                    data_match = re.search(r'data-url=["\']([^"\']*)["\']', match)
                    if data_match:
                        url = data_match.group(1)
                        if url.startswith('/'):
                            return urljoin(self.epc_config.base_url, url)
                        elif url.startswith('http'):
                            return url
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting download table URL: {e}")
            return None

    async def download_epc_csv_direct(self, session: aiohttp.ClientSession) -> Optional[str]:
        """Try direct CSV download URLs for EPC products"""
        try:
            # Common direct CSV URLs for EPC
            csv_urls = [
                "https://epc-co.com/epc/products/gan-fets-and-ics/export/csv",
                "https://epc-co.com/epc/products/gan-fets-and-ics/download/csv",
                "https://epc-co.com/epc/products/gan-fets-and-ics/table.csv",
                "https://epc-co.com/epc/products/gan-fets-and-ics/products.csv",
            ]
            
            for csv_url in csv_urls:
                try:
                    logger.info(f"Trying direct CSV URL: {csv_url}")
                    async with session.get(csv_url, headers=self.get_browser_headers()) as response:
                        if response.status == 200:
                            csv_content = await response.text()
                            logger.info(f"Successfully downloaded CSV from {csv_url} with {len(csv_content)} characters")
                            return csv_content
                        else:
                            logger.warning(f"Failed to download from {csv_url}: {response.status}")
                except Exception as e:
                    logger.warning(f"Error trying {csv_url}: {e}")
                    continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error in direct CSV download: {e}")
            return None

    async def batch_download_epc_datasheets(self, model_numbers: List[str], include_spice: bool = True) -> Dict[str, Any]:
        """Batch download datasheets for multiple EPC products"""
        try:
            results = {
                "successful": [],
                "failed": [],
                "total_requested": len(model_numbers),
                "datasheets_downloaded": 0,
                "spice_models_downloaded": 0
            }
            
            async with aiohttp.ClientSession() as session:
                for model_number in model_numbers:
                    try:
                        logger.info(f"Downloading files for EPC product: {model_number}")
                        
                        # Download files
                        downloaded_files = await self.download_epc_files(
                            model_number, 
                            include_datasheet=True, 
                            include_spice=include_spice
                        )
                        
                        result = {
                            "model_number": model_number,
                            "datasheet_path": str(downloaded_files.get('datasheet', '')) if downloaded_files.get('datasheet') else None,
                            "spice_model_path": str(downloaded_files.get('spice_model', '')) if downloaded_files.get('spice_model') else None,
                            "success": True
                        }
                        
                        if downloaded_files.get('datasheet'):
                            results["datasheets_downloaded"] += 1
                        if downloaded_files.get('spice_model'):
                            results["spice_models_downloaded"] += 1
                        
                        results["successful"].append(result)
                        
                        # Delay between requests
                        await asyncio.sleep(self.epc_config.delay_between_requests)
                        
                    except Exception as e:
                        error_msg = f"Failed to download files for {model_number}: {str(e)}"
                        logger.error(error_msg)
                        results["failed"].append({
                            "model_number": model_number,
                            "error": str(e),
                            "success": False
                        })
            
            return results
            
        except Exception as e:
            logger.error(f"Error in batch datasheet download: {e}")
            return {
                "successful": [],
                "failed": [],
                "total_requested": len(model_numbers),
                "datasheets_downloaded": 0,
                "spice_models_downloaded": 0,
                "error": str(e)
            }

class InfineonGaNScraper(WebScraper):
    """Specialized scraper for Infineon GaN transistors"""
    
    def __init__(self, db_manager: DatabaseManager):
        super().__init__(db_manager)
        self.base_url = "https://www.infineon.com"
        self.gan_url = "https://www.infineon.com/products/power/gallium-nitride/gallium-nitride-transistor"
        
    async def scrape_infineon_gan_products(self, job: ScrapingJob) -> ScrapingResult:
        """Scrape all GaN transistor products from Infineon's specific page"""
        products = []
        errors = []
        datasheets_downloaded = 0
        
        try:
            async with aiohttp.ClientSession() as session:
                # First, get the main GaN page to find product categories
                logger.info(f"Scraping Infineon GaN page: {self.gan_url}")
                
                async with session.get(self.gan_url, timeout=30) as response:
                    if response.status != 200:
                        error_msg = f"Failed to fetch Infineon GaN page: {response.status}"
                        errors.append(error_msg)
                        return ScrapingResult(False, [], errors, 0, 0)
                    
                    html = await response.text()
                
                # Extract product category links
                category_links = self.extract_infineon_category_links(html)
                logger.info(f"Found {len(category_links)} category links")
                
                for category_link in category_links[:job.max_products]:
                    try:
                        # Get products from each category
                        category_products = await self.scrape_infineon_category(
                            session, category_link, job
                        )
                        
                        for product in category_products:
                            if len(products) >= job.max_products:
                                break
                                
                            products.append(product)
                            
                            # Download datasheet if requested
                            if job.include_datasheets and product.datasheet_url:
                                datasheet_path = await self.download_datasheet(
                                    session, product.datasheet_url, product.part_number
                                )
                                if datasheet_path:
                                    product.datasheet_path = str(datasheet_path)
                                    datasheets_downloaded += 1
                            
                            # Save to database
                            self.db_manager.save_product(product)
                        
                        # Delay between category requests
                        await asyncio.sleep(2.0)
                        
                    except Exception as e:
                        error_msg = f"Error scraping category {category_link}: {str(e)}"
                        errors.append(error_msg)
                        logger.error(error_msg)
                
                return ScrapingResult(
                    success=True,
                    products=products,
                    errors=errors,
                    total_found=len(products),
                    datasheets_downloaded=datasheets_downloaded
                )
                
        except Exception as e:
            error_msg = f"Error in Infineon GaN scraping: {str(e)}"
            errors.append(error_msg)
            logger.error(error_msg)
            return ScrapingResult(False, [], errors, 0, 0)
    
    def extract_infineon_category_links(self, html: str) -> List[str]:
        """Extract links to product categories from the main GaN page"""
        links = []
        
        # Look for category links in the page content
        patterns = [
            r'href=["\']([^"\']*products/power/gallium-nitride[^"\']*)["\']',
            r'href=["\']([^"\']*cms/en/product/power/gallium-nitride[^"\']*)["\']',
            r'href=["\']([^"\']*gan[^"\']*transistor[^"\']*)["\']',
            r'href=["\']([^"\']*CoolGaN[^"\']*)["\']',
            r'href=["\']([^"\']*product-detail[^"\']*)["\']'
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
        
        return list(set(links))
    
    async def scrape_infineon_category(self, session: aiohttp.ClientSession, 
                                     category_url: str, job: ScrapingJob) -> List[GaNProduct]:
        """Scrape products from a specific Infineon category page"""
        products = []
        
        try:
            async with session.get(category_url, timeout=30) as response:
                if response.status != 200:
                    logger.warning(f"Failed to fetch category {category_url}: {response.status}")
                    return products
                
                html = await response.text()
            
            # Extract product links from category page
            product_links = self.extract_infineon_product_links(html)
            
            for product_url in product_links:
                try:
                    product = await self.scrape_infineon_product(session, product_url, job)
                    if product:
                        products.append(product)
                    
                    # Delay between product requests
                    await asyncio.sleep(1.5)
                    
                except Exception as e:
                    logger.error(f"Error scraping product {product_url}: {e}")
            
            return products
            
        except Exception as e:
            logger.error(f"Error scraping category {category_url}: {e}")
            return products
    
    def extract_infineon_product_links(self, html: str) -> List[str]:
        """Extract individual product links from category page"""
        links = []
        
        # Look for product links
        patterns = [
            r'href=["\']([^"\']*product-detail[^"\']*)["\']',
            r'href=["\']([^"\']*datasheet[^"\']*)["\']',
            r'href=["\']([^"\']*CoolGaN[^"\']*)["\']',
            r'href=["\']([^"\']*gan[^"\']*transistor[^"\']*)["\']'
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
        
        return list(set(links))
    
    async def scrape_infineon_product(self, session: aiohttp.ClientSession, 
                                    product_url: str, job: ScrapingJob) -> Optional[GaNProduct]:
        """Scrape individual Infineon product information"""
        try:
            async with session.get(product_url, timeout=30) as response:
                if response.status != 200:
                    return None
                
                html = await response.text()
            
            # Extract product information
            product_info = self.extract_infineon_product_info(html, product_url)
            
            if not product_info:
                return None
            
            # Create GaN product object
            product = GaNProduct(
                product_id=str(uuid.uuid4()),
                manufacturer=Manufacturer.INFINEON,
                part_number=product_info.get('part_number', ''),
                category=job.category or ProductCategory.GAN_POWER,
                name=product_info.get('name', ''),
                description=product_info.get('description', ''),
                specifications=product_info.get('specifications', {}),
                datasheet_url=product_info.get('datasheet_url'),
                product_url=product_url,
                image_url=product_info.get('image_url'),
                price_range=product_info.get('price_range'),
                availability=product_info.get('availability'),
                package_type=product_info.get('package_type'),
                voltage_rating=product_info.get('voltage_rating'),
                current_rating=product_info.get('current_rating'),
                power_rating=product_info.get('power_rating'),
                frequency_range=product_info.get('frequency_range'),
                temperature_range=product_info.get('temperature_range'),
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            return product
            
        except Exception as e:
            logger.error(f"Error scraping Infineon product {product_url}: {e}")
            return None
    
    def extract_infineon_product_info(self, html: str, product_url: str) -> Optional[Dict[str, Any]]:
        """Extract product information from Infineon product page"""
        
        # Extract part number from URL or HTML
        part_number = self.extract_infineon_part_number(product_url, html)
        if not part_number:
            return None
        
        # Extract product name
        name = self.extract_infineon_product_name(html)
        
        # Extract description
        description = self.extract_infineon_description(html)
        
        # Extract datasheet URL
        datasheet_url = self.extract_infineon_datasheet_url(html)
        
        # Extract specifications
        specifications = self.extract_infineon_specifications(html)
        
        # Extract image URL
        image_url = self.extract_infineon_image_url(html)
        
        return {
            'part_number': part_number,
            'name': name,
            'description': description,
            'datasheet_url': datasheet_url,
            'specifications': specifications,
            'image_url': image_url,
            'voltage_rating': self.extract_voltage_rating(html),
            'current_rating': self.extract_current_rating(html),
            'power_rating': self.extract_power_rating(html)
        }
    
    def extract_infineon_part_number(self, url: str, html: str) -> Optional[str]:
        """Extract part number from Infineon product URL or HTML"""
        # Try to extract from URL first
        url_patterns = [
            r'/([A-Z0-9]+(?:-[A-Z0-9]+)*)/?$',
            r'product/([A-Z0-9]+(?:-[A-Z0-9]+)*)',
            r'CoolGaN[™]?\s*([A-Z0-9]+(?:-[A-Z0-9]+)*)'
        ]
        
        for pattern in url_patterns:
            match = re.search(pattern, url, re.IGNORECASE)
            if match:
                return match.group(1)
        
        # Try to extract from HTML
        html_patterns = [
            r'CoolGaN[™]?\s*([A-Z0-9]+(?:-[A-Z0-9]+)*)',
            r'Part\s*Number[:\s]*([A-Z0-9]+(?:-[A-Z0-9]+)*)',
            r'Model[:\s]*([A-Z0-9]+(?:-[A-Z0-9]+)*)'
        ]
        
        for pattern in html_patterns:
            match = re.search(pattern, html, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def extract_infineon_product_name(self, html: str) -> str:
        """Extract product name from Infineon page"""
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
    
    def extract_infineon_description(self, html: str) -> str:
        """Extract product description from Infineon page"""
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
    
    def extract_infineon_datasheet_url(self, html: str) -> Optional[str]:
        """Extract datasheet URL from Infineon page"""
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
    
    def extract_infineon_specifications(self, html: str) -> Dict[str, Any]:
        """Extract specifications from Infineon page"""
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
    
    def extract_infineon_image_url(self, html: str) -> Optional[str]:
        """Extract product image URL from Infineon page"""
        image_patterns = [
            r'<img[^>]*src=["\']([^"\']*product[^"\']*\.(?:jpg|jpeg|png))["\']',
            r'<img[^>]*src=["\']([^"\']*image[^"\']*\.(?:jpg|jpeg|png))["\']',
            r'<img[^>]*src=["\']([^"\']*\.(?:jpg|jpeg|png))["\']'
        ]
        
        for pattern in image_patterns:
            match = re.search(pattern, html, re.IGNORECASE)
            if match:
                img_url = match.group(1)
                if img_url.startswith('/'):
                    return urljoin(self.base_url, img_url)
                elif img_url.startswith('http'):
                    return img_url
                else:
                    return urljoin(self.base_url, '/' + img_url)
        
        return None

# Add Brave API utility
async def brave_search(query: str, api_key: str, limit: int = 10):
    url = f"https://api.search.brave.com/res/v1/web/search"
    headers = {"Accept": "application/json", "X-Subscription-Token": api_key}
    params = {"q": query, "count": limit}
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers, params=params) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get("web", {}).get("results", [])
            else:
                return []

# Initialize services
db_manager = DatabaseManager()
scraper = WebScraper(db_manager)
epc_scraper = EPCCoScraper(db_manager) # Initialize the new scraper
infineon_gan_scraper = InfineonGaNScraper(db_manager) # Initialize the new scraper

# In-memory storage for active jobs
active_jobs: Dict[str, ScrapingJob] = {}

@app.on_event("startup")
async def startup_event():
    """Initialize the web scraper service"""
    logger.info("Web Scraper Service starting up...")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "web-scraper"}

@app.post("/scrape")
async def start_scraping_job(job: ScrapingJob, background_tasks: BackgroundTasks):
    """Start a new scraping job"""
    try:
        # Generate job ID if not provided
        if not job.job_id:
            job.job_id = str(uuid.uuid4())
        
        # Set creation time
        job.created_at = datetime.now()
        job.status = ScrapingStatus.PENDING
        
        # Save job to database
        db_manager.save_job(job)
        active_jobs[job.job_id] = job
        
        # Start background scraping task
        background_tasks.add_task(run_scraping_job, job.job_id)
        
        return {
            "job_id": job.job_id,
            "status": "started",
            "message": f"Scraping job started for {job.manufacturer}"
        }
    except Exception as e:
        logger.error(f"Error starting scraping job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def run_scraping_job(job_id: str):
    """Run scraping job in background"""
    job = active_jobs.get(job_id)
    if not job:
        return
    
    try:
        # Update job status
        job.status = ScrapingStatus.IN_PROGRESS
        job.started_at = datetime.now()
        db_manager.save_job(job)
        
        # Run scraping
        if job.manufacturer == Manufacturer.EPC_CO:
            result = await epc_scraper.scrape_epc_manufacturer(job) # Use the new scraper for EPC-Co
        elif job.manufacturer == Manufacturer.INFINEON:
            result = await infineon_gan_scraper.scrape_infineon_gan_products(job) # Use the new scraper for Infineon
        else:
            result = await scraper.scrape_manufacturer(job) # Use the original scraper for others
        
        # Update job with results
        job.status = ScrapingStatus.COMPLETED if result.success else ScrapingStatus.FAILED
        job.completed_at = datetime.now()
        job.total_products = result.total_found
        job.scraped_products = len(result.products)
        job.downloaded_datasheets = result.datasheets_downloaded
        job.errors = result.errors
        
        db_manager.save_job(job)
        
        logger.info(f"Scraping job {job_id} completed: {len(result.products)} products scraped")
        
    except Exception as e:
        logger.error(f"Error in scraping job {job_id}: {e}")
        job.status = ScrapingStatus.FAILED
        job.completed_at = datetime.now()
        job.errors.append(str(e))
        db_manager.save_job(job)

@app.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get scraping job status"""
    try:
        job = db_manager.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return job
    except Exception as e:
        logger.error(f"Error getting job status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/jobs")
async def list_jobs():
    """List all scraping jobs"""
    try:
        # This would need to be implemented in DatabaseManager
        # For now, return active jobs
        return {
            "jobs": [
                {
                    "job_id": job.job_id,
                    "manufacturer": job.manufacturer.value,
                    "status": job.status.value,
                    "created_at": job.created_at.isoformat(),
                    "scraped_products": job.scraped_products,
                    "total_products": job.total_products
                }
                for job in active_jobs.values()
            ]
        }
    except Exception as e:
        logger.error(f"Error listing jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/products")
async def get_products(
    manufacturer: Optional[Manufacturer] = None,
    category: Optional[ProductCategory] = None,
    limit: int = 100
):
    """Get scraped products"""
    try:
        products = db_manager.get_products(manufacturer, category, limit)
        return {
            "products": [product.dict() for product in products],
            "total": len(products)
        }
    except Exception as e:
        logger.error(f"Error getting products: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/products/{product_id}")
async def get_product(product_id: str):
    """Get specific product"""
    try:
        # This would need to be implemented in DatabaseManager
        # For now, return a placeholder
        raise HTTPException(status_code=404, detail="Product not found")
    except Exception as e:
        logger.error(f"Error getting product: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
async def search_products(
    query: str,
    manufacturer: Optional[Manufacturer] = None,
    category: Optional[ProductCategory] = None,
    limit: int = 100
):
    """Search products by query with real-time scraping"""
    try:
        # If no manufacturer specified, search across all supported manufacturers
        manufacturers_to_search = [manufacturer] if manufacturer else [
            Manufacturer.INFINEON, 
            Manufacturer.WOLFSPEED, 
            Manufacturer.QORVO
        ]
        
        all_products = []
        
        for mfr in manufacturers_to_search:
            if not mfr:
                continue
                
            # Create a temporary job for searching
            search_job = ScrapingJob(
                job_id=f"search-{mfr.value}-{int(time.time())}",
                manufacturer=mfr,
                category=category,
                keywords=[query] if query else None,
                max_products=limit // len(manufacturers_to_search),
                include_datasheets=False,  # Don't download during search
                created_at=datetime.now()
            )
            
            # Perform quick search
            if mfr == Manufacturer.EPC_CO:
                result = await epc_scraper.scrape_epc_manufacturer(search_job) # Use the new scraper for EPC-Co
            elif mfr == Manufacturer.INFINEON:
                result = await infineon_gan_scraper.scrape_infineon_gan_products(search_job) # Use the new scraper for Infineon
            else:
                result = await scraper.scrape_manufacturer(search_job) # Use the original scraper for others
            all_products.extend(result.products)
        
        # Filter and sort results
        filtered_products = []
        for product in all_products:
            # Check if product matches search criteria
            if query:
                search_terms = query.lower().split()
                product_text = f"{product.part_number} {product.name} {product.description}".lower()
                if not all(term in product_text for term in search_terms):
                    continue
            
            if category and product.category != category:
                continue
                
            filtered_products.append(product)
        
        # Sort by relevance (part number match first, then name match)
        def sort_key(product):
            score = 0
            if query:
                if query.lower() in product.part_number.lower():
                    score += 100
                if query.lower() in product.name.lower():
                    score += 50
                if query.lower() in product.description.lower():
                    score += 10
            return -score  # Negative for descending order
        
        filtered_products.sort(key=sort_key)
        
        return {
            "products": [product.dict() for product in filtered_products[:limit]],
            "total": len(filtered_products),
            "query": query
        }
    except Exception as e:
        logger.error(f"Error searching products: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/prescrap")
async def prescrap(
    manufacturer: Manufacturer,
    category: Optional[ProductCategory] = None,
    keywords: Optional[List[str]] = None,
    use_brave: bool = False,
    limit: int = 20
):
    """Preview product links/titles before full scrape. Optionally supplement with Brave Search."""
    config = scraper.configs.get(manufacturer)
    if not config:
        raise HTTPException(status_code=400, detail=f"No config for manufacturer {manufacturer}")
    preview = []
    errors = []
    # Fetch and parse product listing page
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(config.search_url, timeout=config.timeout) as response:
                if response.status != 200:
                    errors.append(f"Failed to fetch {config.search_url}: {response.status}")
                    return {"preview": [], "errors": errors}
                html = await response.text()
            product_links = scraper.extract_product_links(html, config)
            for url in product_links[:limit]:
                # For preview, just extract part number and name if possible
                async with session.get(url, timeout=10) as prod_resp:
                    if prod_resp.status != 200:
                        continue
                    prod_html = await prod_resp.text()
                    info = scraper.extract_product_info(prod_html, url, config)
                    preview.append({
                        "url": url,
                        "part_number": info.get("part_number", ""),
                        "name": info.get("name", ""),
                        "description": info.get("description", "")
                    })
    except Exception as e:
        errors.append(str(e))
    # Optionally supplement with Brave Search
    brave_results = []
    if use_brave:
        api_key = os.environ.get("BRAVE_API_KEY")
        if not api_key:
            errors.append("Brave API key not set in environment variable BRAVE_API_KEY")
        else:
            query = " ".join(keywords) if keywords else manufacturer.value
            brave_results = await brave_search(query, api_key, limit=limit)
    return {"preview": preview, "brave": brave_results, "errors": errors}

@app.delete("/jobs/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a scraping job"""
    try:
        job = active_jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.status == ScrapingStatus.IN_PROGRESS:
            job.status = ScrapingStatus.CANCELLED
            job.completed_at = datetime.now()
            db_manager.save_job(job)
        
        return {"message": "Job cancelled successfully"}
    except Exception as e:
        logger.error(f"Error cancelling job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/manufacturers")
async def get_manufacturers():
    """Get supported manufacturers"""
    # Define base URLs for each manufacturer
    manufacturer_urls = {
        Manufacturer.INFINEON: "https://www.infineon.com",
        Manufacturer.WOLFSPEED: "https://www.wolfspeed.com",
        Manufacturer.QORVO: "https://www.qorvo.com",
        Manufacturer.NXP: "https://www.nxp.com",
        Manufacturer.TI: "https://www.ti.com",
        Manufacturer.STMICRO: "https://www.st.com",
        Manufacturer.ROHM: "https://www.rohm.com",
        Manufacturer.TOSHIBA: "https://www.toshiba.com",
        Manufacturer.RENESAS: "https://www.renesas.com",
        Manufacturer.EPC_CO: "https://epc-co.com",
        Manufacturer.CUSTOM: ""
    }
    
    return {
        "manufacturers": [
            {
                "name": mfr.value,
                "display_name": mfr.value.replace('_', ' ').title(),
                "base_url": manufacturer_urls.get(mfr, ""),
                "supported": mfr in [Manufacturer.INFINEON, Manufacturer.WOLFSPEED, Manufacturer.QORVO, Manufacturer.EPC_CO]
            }
            for mfr in Manufacturer
        ]
    }

@app.get("/categories")
async def get_categories():
    """Get product categories"""
    return {
        "categories": [
            {
                "name": cat.value,
                "display_name": cat.value.replace('_', ' ').title()
            }
            for cat in ProductCategory
        ]
    }

@app.get("/epc/test-mock")
async def test_epc_mock():
    """Test endpoint that returns mock EPC data to verify frontend integration"""
    mock_product = {
        "product_id": "test-epc-2040",
        "manufacturer": "epc_co",
        "part_number": "EPC2040",
        "category": "gan_power",
        "name": "EPC2040 - 100V eGaN FET",
        "description": "Mock EPC2040 product for testing frontend integration",
        "specifications": {
            "voltage_rating": "100V",
            "current_rating": "15A",
            "power_rating": "150W",
            "package": "QFN 3x5mm"
        },
        "datasheet_url": "https://epc-co.com/epc/products/gan-fets-and-ics/epc2040",
        "product_url": "https://epc-co.com/epc/products/gan-fets-and-ics/epc2040",
        "voltage_rating": 100.0,
        "current_rating": 15.0,
        "power_rating": 150.0,
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00"
    }
    
    return {
        "product": mock_product,
        "downloaded_files": {
            "datasheet": "datasheets/EPC2040_datasheet.pdf",
            "spice_model": "datasheets/EPC2040_spice_model.net"
        },
        "message": "Mock EPC2040 data for testing"
    }

@app.get("/epc/test")
async def test_epc_endpoint():
    """Test endpoint to verify EPC service is working"""
    return {
        "status": "EPC service is running",
        "message": "The EPC scraping service is operational",
        "note": "Web scraping may be blocked by EPC-Co.com's anti-bot protection",
        "suggestions": [
            "Try accessing EPC-Co.com manually in a browser first",
            "Verify the model number exists on the website",
            "Consider using a different approach if 403 errors persist"
        ]
    }

@app.post("/epc/scrape-product-mock")
async def scrape_epc_product_mock(model_number: str, include_datasheet: bool = True, include_spice: bool = True):
    """Mock endpoint that simulates successful EPC scraping for testing"""
    mock_product = {
        "product_id": f"mock-{model_number.lower()}",
        "manufacturer": "epc_co",
        "part_number": model_number.upper(),
        "category": "gan_power",
        "name": f"{model_number.upper()} - Mock eGaN FET",
        "description": f"Mock {model_number.upper()} product for testing frontend integration",
        "specifications": {
            "voltage_rating": "100V",
            "current_rating": "15A",
            "power_rating": "150W",
            "package": "QFN 3x5mm"
        },
        "datasheet_url": f"https://epc-co.com/epc/products/gan-fets-and-ics/{model_number.lower()}",
        "product_url": f"https://epc-co.com/epc/products/gan-fets-and-ics/{model_number.lower()}",
        "voltage_rating": 100.0,
        "current_rating": 15.0,
        "power_rating": 150.0,
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00"
    }
    
    downloaded_files = {}
    if include_datasheet:
        downloaded_files["datasheet"] = f"datasheets/{model_number.upper()}_datasheet.pdf"
    if include_spice:
        downloaded_files["spice_model"] = f"datasheets/{model_number.upper()}_spice_model.net"
    
    return {
        "product": mock_product,
        "downloaded_files": {
            "datasheet": downloaded_files.get("datasheet"),
            "spice_model": downloaded_files.get("spice_model")
        },
        "message": f"Mock successful scraping of EPC {model_number}"
    }

@app.post("/epc/scrape-product")
async def scrape_epc_product(model_number: str, include_datasheet: bool = True, include_spice: bool = True):
    """Scrape a specific EPC product by model number and optionally download files"""
    try:
        # Scrape the product
        product = await epc_scraper.scrape_epc_product(model_number)
        if not product:
            # Provide a helpful error message without making additional requests
            raise HTTPException(
                status_code=404, 
                detail=f"Product {model_number} not found or access blocked by EPC-Co.com. Try accessing https://epc-co.com/epc/products/gan-fets-and-ics/{model_number.lower()} manually in a browser."
            )
        
        # Download files if requested
        downloaded_files = {}
        if include_datasheet or include_spice:
            downloaded_files = await epc_scraper.download_epc_files(
                model_number, 
                include_datasheet=include_datasheet, 
                include_spice=include_spice
            )
        
        return {
            "product": product.dict(),
            "downloaded_files": {
                "datasheet": str(downloaded_files.get('datasheet', '')) if downloaded_files.get('datasheet') else None,
                "spice_model": str(downloaded_files.get('spice_model', '')) if downloaded_files.get('spice_model') else None
            },
            "message": f"Successfully scraped EPC {model_number}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scraping EPC product {model_number}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/epc/download-files")
async def download_epc_files(model_number: str, include_datasheet: bool = True, include_spice: bool = True):
    """Download datasheet and/or SPICE model files for an EPC product"""
    try:
        downloaded_files = await epc_scraper.download_epc_files(
            model_number, 
            include_datasheet=include_datasheet, 
            include_spice=include_spice
        )
        
        return {
            "model_number": model_number,
            "downloaded_files": {
                "datasheet": str(downloaded_files.get('datasheet', '')) if downloaded_files.get('datasheet') else None,
                "spice_model": str(downloaded_files.get('spice_model', '')) if downloaded_files.get('spice_model') else None
            },
            "message": f"Download completed for EPC {model_number}"
        }
    except Exception as e:
        logger.error(f"Error downloading EPC files for {model_number}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/epc/search-products")
async def search_epc_products(query: str = "", limit: int = 50):
    """Search EPC products by query"""
    try:
        # This would search through the database for EPC products
        products = db_manager.get_products(manufacturer=Manufacturer.EPC_CO, limit=limit)
        
        # Filter by query if provided
        if query:
            filtered_products = []
            query_lower = query.lower()
            for product in products:
                if (query_lower in product.part_number.lower() or 
                    query_lower in product.name.lower() or 
                    query_lower in product.description.lower()):
                    filtered_products.append(product)
            products = filtered_products
        
        return {
            "products": [product.dict() for product in products[:limit]],
            "total": len(products),
            "query": query
        }
    except Exception as e:
        logger.error(f"Error searching EPC products: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/epc/product/{model_number}")
async def get_epc_product(model_number: str):
    """Get a specific EPC product by model number"""
    try:
        # First try to get from database
        products = db_manager.get_products(manufacturer=Manufacturer.EPC_CO, limit=1000)
        product = None
        
        for p in products:
            if p.part_number.upper() == model_number.upper():
                product = p
                break
        
        # If not in database, try to scrape it
        if not product:
            product = await epc_scraper.scrape_epc_product(model_number)
            if product:
                db_manager.save_product(product)
        
        if not product:
            raise HTTPException(status_code=404, detail=f"EPC product {model_number} not found")
        
        return {
            "product": product.dict(),
            "message": f"Found EPC product {model_number}"
        }
    except Exception as e:
        logger.error(f"Error getting EPC product {model_number}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/epc/batch-scrape")
async def batch_scrape_epc_products(request: dict):
    """Batch scrape multiple EPC products"""
    try:
        # Extract parameters from request body
        model_numbers = request.get("model_numbers", [])
        include_datasheets = request.get("include_datasheets", True)
        include_spice = request.get("include_spice", True)
        
        if not model_numbers:
            raise HTTPException(status_code=422, detail="model_numbers is required")
        
        results = []
        errors = []
        
        for model_number in model_numbers:
            try:
                # Scrape product
                product = await epc_scraper.scrape_epc_product(model_number)
                if product:
                    # Download files if requested
                    downloaded_files = {}
                    if include_datasheets or include_spice:
                        downloaded_files = await epc_scraper.download_epc_files(
                            model_number, 
                            include_datasheet=include_datasheets, 
                            include_spice=include_spice
                        )
                    
                    results.append({
                        "model_number": model_number,
                        "success": True,
                        "product": product.dict(),
                        "downloaded_files": {
                            "datasheet": str(downloaded_files.get('datasheet', '')) if downloaded_files.get('datasheet') else None,
                            "spice_model": str(downloaded_files.get('spice_model', '')) if downloaded_files.get('spice_model') else None
                        }
                    })
                else:
                    errors.append(f"Failed to scrape {model_number}")
                    
            except Exception as e:
                error_msg = f"Error processing {model_number}: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)
        
        return {
            "results": results,
            "errors": errors,
            "total_processed": len(model_numbers),
            "successful": len(results),
            "failed": len(errors)
        }
    except Exception as e:
        logger.error(f"Error in batch scrape: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/epc/scrape-from-csv")
async def scrape_epc_from_csv(include_datasheets: bool = True):
    """Scrape EPC products using CSV data from the website"""
    try:
        logger.info("Starting EPC CSV-based scraping")
        
        # Create a job for tracking
        job_id = str(uuid.uuid4())
        job = ScrapingJob(
            job_id=job_id,
            manufacturer=Manufacturer.EPC_CO,
            category=ProductCategory.GAN_POWER,
            include_datasheets=include_datasheets,
            created_at=datetime.now()
        )
        
        # Save job to database
        db_manager.save_job(job)
        
        # Run CSV-based scraping
        result = await epc_scraper.scrape_epc_from_csv(include_datasheets=include_datasheets)
        
        # Update job status
        job.status = ScrapingStatus.COMPLETED if result.success else ScrapingStatus.FAILED
        job.completed_at = datetime.now()
        job.total_products = result.total_found
        job.scraped_products = len(result.products)
        job.downloaded_datasheets = result.datasheets_downloaded
        job.errors = result.errors
        db_manager.save_job(job)
        
        return {
            "job_id": job_id,
            "success": result.success,
            "total_products": result.total_found,
            "scraped_products": len(result.products),
            "downloaded_datasheets": result.datasheets_downloaded,
            "errors": result.errors,
            "message": f"CSV-based scraping completed: {len(result.products)} products processed"
        }
        
    except Exception as e:
        logger.error(f"Error in CSV-based EPC scraping: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/epc/batch-download-datasheets")
async def batch_download_epc_datasheets(request: dict):
    """Batch download datasheets for multiple EPC products from CSV data"""
    try:
        # Extract parameters from request body
        model_numbers = request.get("model_numbers", [])
        include_spice = request.get("include_spice", True)
        use_csv_data = request.get("use_csv_data", True)
        
        if not model_numbers and not use_csv_data:
            raise HTTPException(status_code=422, detail="Either model_numbers or use_csv_data=True is required")
        
        # If use_csv_data is True, get model numbers from CSV
        if use_csv_data and not model_numbers:
            logger.info("Getting model numbers from EPC CSV data")
            async with aiohttp.ClientSession() as session:
                csv_content = await epc_scraper.download_epc_csv(session)
                if not csv_content:
                    csv_content = await epc_scraper.download_epc_csv_direct(session)
                
                if csv_content:
                    csv_products = epc_scraper.parse_epc_csv(csv_content)
                    model_numbers = [product['part_number'] for product in csv_products if product.get('part_number')]
                    logger.info(f"Extracted {len(model_numbers)} model numbers from CSV")
                else:
                    raise HTTPException(status_code=500, detail="Failed to download EPC CSV data")
        
        if not model_numbers:
            raise HTTPException(status_code=422, detail="No model numbers found")
        
        logger.info(f"Starting batch datasheet download for {len(model_numbers)} EPC products")
        
        # Perform batch download
        results = await epc_scraper.batch_download_epc_datasheets(model_numbers, include_spice=include_spice)
        
        return {
            "success": True,
            "total_requested": results["total_requested"],
            "datasheets_downloaded": results["datasheets_downloaded"],
            "spice_models_downloaded": results["spice_models_downloaded"],
            "successful": len(results["successful"]),
            "failed": len(results["failed"]),
            "successful_products": results["successful"],
            "failed_products": results["failed"],
            "message": f"Batch download completed: {results['datasheets_downloaded']} datasheets, {results['spice_models_downloaded']} SPICE models"
        }
        
    except Exception as e:
        logger.error(f"Error in batch datasheet download: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Infineon GaN specific endpoints
@app.post("/infineon/scrape-gan")
async def scrape_infineon_gan_products(
    background_tasks: BackgroundTasks,
    max_products: int = 100,
    include_datasheets: bool = True
):
    """Scrape all GaN transistor products from Infineon's specific page"""
    try:
        job_id = str(uuid.uuid4())
        job = ScrapingJob(
            job_id=job_id,
            manufacturer=Manufacturer.INFINEON,
            category=ProductCategory.GAN_POWER,
            max_products=max_products,
            include_datasheets=include_datasheets,
            created_at=datetime.now()
        )
        
        # Save job to database
        db_manager.save_job(job)
        
        # Start scraping in background
        background_tasks.add_task(run_infineon_scraping_job, job_id)
        
        return {
            "job_id": job_id,
            "status": "started",
            "message": f"Started scraping Infineon GaN products (max: {max_products})"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def run_infineon_scraping_job(job_id: str):
    """Run Infineon GaN scraping job in background"""
    try:
        # Get job from database
        job = db_manager.get_job(job_id)
        if not job:
            logger.error(f"Job {job_id} not found")
            return
        
        # Update job status
        job.status = ScrapingStatus.IN_PROGRESS
        job.started_at = datetime.now()
        db_manager.save_job(job)
        
        # Run scraping
        result = await infineon_gan_scraper.scrape_infineon_gan_products(job)
        
        # Update job with results
        job.status = ScrapingStatus.COMPLETED if result.success else ScrapingStatus.FAILED
        job.completed_at = datetime.now()
        job.total_products = result.total_found
        job.scraped_products = len(result.products)
        job.downloaded_datasheets = result.datasheets_downloaded
        job.errors = result.errors
        db_manager.save_job(job)
        
        logger.info(f"Infineon GaN scraping job {job_id} completed: {len(result.products)} products, {result.datasheets_downloaded} datasheets")
        
    except Exception as e:
        logger.error(f"Error in Infineon GaN scraping job {job_id}: {e}")
        # Update job status to failed
        job = db_manager.get_job(job_id)
        if job:
            job.status = ScrapingStatus.FAILED
            job.completed_at = datetime.now()
            job.errors.append(str(e))
            db_manager.save_job(job)

@app.get("/infineon/products")
async def get_infineon_products(limit: int = 100):
    """Get all scraped Infineon GaN products"""
    try:
        products = db_manager.get_products(manufacturer=Manufacturer.INFINEON, limit=limit)
        return {
            "products": [product.dict() for product in products],
            "total": len(products)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/infineon/product/{part_number}")
async def get_infineon_product(part_number: str):
    """Get specific Infineon GaN product by part number"""
    try:
        products = db_manager.get_products(manufacturer=Manufacturer.INFINEON)
        for product in products:
            if product.part_number.upper() == part_number.upper():
                return product.dict()
        
        raise HTTPException(status_code=404, detail=f"Product {part_number} not found")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/infineon/download-datasheet")
async def download_infineon_datasheet(part_number: str):
    """Download datasheet for specific Infineon product"""
    try:
        products = db_manager.get_products(manufacturer=Manufacturer.INFINEON)
        target_product = None
        
        for product in products:
            if product.part_number.upper() == part_number.upper():
                target_product = product
                break
        
        if not target_product:
            raise HTTPException(status_code=404, detail=f"Product {part_number} not found")
        
        if not target_product.datasheet_url:
            raise HTTPException(status_code=404, detail=f"No datasheet URL found for {part_number}")
        
        # Download datasheet
        async with aiohttp.ClientSession() as session:
            datasheet_path = await infineon_gan_scraper.download_datasheet(
                session, target_product.datasheet_url, target_product.part_number
            )
            
            if datasheet_path:
                # Update product with datasheet path
                target_product.datasheet_path = str(datasheet_path)
                db_manager.save_product(target_product)
                
                return {
                    "success": True,
                    "part_number": part_number,
                    "datasheet_path": str(datasheet_path),
                    "message": f"Datasheet downloaded successfully for {part_number}"
                }
            else:
                raise HTTPException(status_code=500, detail=f"Failed to download datasheet for {part_number}")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8011) 