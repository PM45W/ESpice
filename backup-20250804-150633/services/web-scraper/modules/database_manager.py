"""
Database Manager Module
Handles database operations and data persistence
"""

import sqlite3
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Manages database operations"""
    
    def __init__(self, db_path: str = "scraped_data.db"):
        self.db_path = db_path
        self.connection = None
        
    def init_database(self):
        """Initialize database with required tables"""
        try:
            self.connection = sqlite3.connect(self.db_path)
            cursor = self.connection.cursor()
            
            # Create products table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id TEXT UNIQUE NOT NULL,
                    manufacturer TEXT NOT NULL,
                    part_number TEXT NOT NULL,
                    category TEXT,
                    name TEXT,
                    description TEXT,
                    specifications TEXT,
                    datasheet_url TEXT,
                    datasheet_path TEXT,
                    datasheet_hash TEXT,
                    product_url TEXT,
                    image_url TEXT,
                    voltage_rating REAL,
                    current_rating REAL,
                    power_rating REAL,
                    package_type TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            # Create scraping jobs table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS scraping_jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT UNIQUE NOT NULL,
                    manufacturer TEXT NOT NULL,
                    category TEXT,
                    keywords TEXT,
                    max_products INTEGER DEFAULT 100,
                    include_datasheets BOOLEAN DEFAULT 1,
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
            
            # Create processed files table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS processed_files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_path TEXT UNIQUE NOT NULL,
                    file_name TEXT NOT NULL,
                    manufacturer TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    file_size INTEGER,
                    processed_at TEXT NOT NULL,
                    product_count INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'processed'
                )
            ''')
            
            self.connection.commit()
            logger.info("Database initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing database: {e}")
            raise
    
    def save_product(self, product_data: Dict[str, Any]) -> bool:
        """Save product to database"""
        try:
            cursor = self.connection.cursor()
            
            # Convert specifications to JSON string
            specifications = json.dumps(product_data.get('specifications', {}))
            
            cursor.execute('''
                INSERT OR REPLACE INTO products (
                    product_id, manufacturer, part_number, category, name, description,
                    specifications, datasheet_url, datasheet_path, datasheet_hash,
                    product_url, image_url, voltage_rating, current_rating, power_rating,
                    package_type, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                product_data.get('product_id'),
                product_data.get('manufacturer'),
                product_data.get('part_number'),
                product_data.get('category'),
                product_data.get('name'),
                product_data.get('description'),
                specifications,
                product_data.get('datasheet_url'),
                product_data.get('datasheet_path'),
                product_data.get('datasheet_hash'),
                product_data.get('product_url'),
                product_data.get('image_url'),
                product_data.get('voltage_rating'),
                product_data.get('current_rating'),
                product_data.get('power_rating'),
                product_data.get('package_type'),
                product_data.get('created_at'),
                product_data.get('updated_at')
            ))
            
            self.connection.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error saving product: {e}")
            return False
    
    def get_products(self, manufacturer: Optional[str] = None, 
                    category: Optional[str] = None,
                    limit: int = 100) -> List[Dict[str, Any]]:
        """Get products from database"""
        try:
            cursor = self.connection.cursor()
            
            query = "SELECT * FROM products WHERE 1=1"
            params = []
            
            if manufacturer:
                query += " AND manufacturer = ?"
                params.append(manufacturer)
            
            if category:
                query += " AND category = ?"
                params.append(category)
            
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            products = []
            for row in rows:
                product = {
                    'id': row[0],
                    'product_id': row[1],
                    'manufacturer': row[2],
                    'part_number': row[3],
                    'category': row[4],
                    'name': row[5],
                    'description': row[6],
                    'specifications': json.loads(row[7]) if row[7] else {},
                    'datasheet_url': row[8],
                    'datasheet_path': row[9],
                    'datasheet_hash': row[10],
                    'product_url': row[11],
                    'image_url': row[12],
                    'voltage_rating': row[13],
                    'current_rating': row[14],
                    'power_rating': row[15],
                    'package_type': row[16],
                    'created_at': row[17],
                    'updated_at': row[18]
                }
                products.append(product)
            
            return products
            
        except Exception as e:
            logger.error(f"Error getting products: {e}")
            return []
    
    def get_product_by_part_number(self, part_number: str) -> Optional[Dict[str, Any]]:
        """Get product by part number"""
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT * FROM products WHERE part_number = ?", (part_number,))
            row = cursor.fetchone()
            
            if row:
                return {
                    'id': row[0],
                    'product_id': row[1],
                    'manufacturer': row[2],
                    'part_number': row[3],
                    'category': row[4],
                    'name': row[5],
                    'description': row[6],
                    'specifications': json.loads(row[7]) if row[7] else {},
                    'datasheet_url': row[8],
                    'datasheet_path': row[9],
                    'datasheet_hash': row[10],
                    'product_url': row[11],
                    'image_url': row[12],
                    'voltage_rating': row[13],
                    'current_rating': row[14],
                    'power_rating': row[15],
                    'package_type': row[16],
                    'created_at': row[17],
                    'updated_at': row[18]
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting product by part number: {e}")
            return None
    
    def save_scraping_job(self, job_data: Dict[str, Any]) -> bool:
        """Save scraping job to database"""
        try:
            cursor = self.connection.cursor()
            
            # Convert keywords and errors to JSON strings
            keywords = json.dumps(job_data.get('keywords', []))
            errors = json.dumps(job_data.get('errors', []))
            
            cursor.execute('''
                INSERT OR REPLACE INTO scraping_jobs (
                    job_id, manufacturer, category, keywords, max_products,
                    include_datasheets, status, created_at, started_at, completed_at,
                    total_products, scraped_products, downloaded_datasheets, errors
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                job_data.get('job_id'),
                job_data.get('manufacturer'),
                job_data.get('category'),
                keywords,
                job_data.get('max_products', 100),
                job_data.get('include_datasheets', True),
                job_data.get('status'),
                job_data.get('created_at'),
                job_data.get('started_at'),
                job_data.get('completed_at'),
                job_data.get('total_products', 0),
                job_data.get('scraped_products', 0),
                job_data.get('downloaded_datasheets', 0),
                errors
            ))
            
            self.connection.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error saving scraping job: {e}")
            return False
    
    def get_scraping_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get scraping job by ID"""
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT * FROM scraping_jobs WHERE job_id = ?", (job_id,))
            row = cursor.fetchone()
            
            if row:
                return {
                    'id': row[0],
                    'job_id': row[1],
                    'manufacturer': row[2],
                    'category': row[3],
                    'keywords': json.loads(row[4]) if row[4] else [],
                    'max_products': row[5],
                    'include_datasheets': bool(row[6]),
                    'status': row[7],
                    'created_at': row[8],
                    'started_at': row[9],
                    'completed_at': row[10],
                    'total_products': row[11],
                    'scraped_products': row[12],
                    'downloaded_datasheets': row[13],
                    'errors': json.loads(row[14]) if row[14] else []
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting scraping job: {e}")
            return None
    
    def save_processed_file(self, file_data: Dict[str, Any]) -> bool:
        """Save processed file information"""
        try:
            cursor = self.connection.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO processed_files (
                    file_path, file_name, manufacturer, file_type, file_size,
                    processed_at, product_count, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                file_data.get('file_path'),
                file_data.get('file_name'),
                file_data.get('manufacturer'),
                file_data.get('file_type'),
                file_data.get('file_size'),
                file_data.get('processed_at'),
                file_data.get('product_count', 0),
                file_data.get('status', 'processed')
            ))
            
            self.connection.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error saving processed file: {e}")
            return False
    
    def get_processed_files(self, manufacturer: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get processed files"""
        try:
            cursor = self.connection.cursor()
            
            query = "SELECT * FROM processed_files WHERE 1=1"
            params = []
            
            if manufacturer:
                query += " AND manufacturer = ?"
                params.append(manufacturer)
            
            query += " ORDER BY processed_at DESC"
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            files = []
            for row in rows:
                file_data = {
                    'id': row[0],
                    'file_path': row[1],
                    'file_name': row[2],
                    'manufacturer': row[3],
                    'file_type': row[4],
                    'file_size': row[5],
                    'processed_at': row[6],
                    'product_count': row[7],
                    'status': row[8]
                }
                files.append(file_data)
            
            return files
            
        except Exception as e:
            logger.error(f"Error getting processed files: {e}")
            return []
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        try:
            cursor = self.connection.cursor()
            
            # Get product counts by manufacturer
            cursor.execute("SELECT manufacturer, COUNT(*) FROM products GROUP BY manufacturer")
            manufacturer_counts = dict(cursor.fetchall())
            
            # Get total counts
            cursor.execute("SELECT COUNT(*) FROM products")
            total_products = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM scraping_jobs")
            total_jobs = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM processed_files")
            total_files = cursor.fetchone()[0]
            
            return {
                'total_products': total_products,
                'total_jobs': total_jobs,
                'total_files': total_files,
                'manufacturer_counts': manufacturer_counts,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {}
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close() 