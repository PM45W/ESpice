# Web Scraper Modules Package
# This package contains modular components for the web scraping service

from .base_scraper import BaseScraper
from .epc_scraper import EPCCoScraper
from .infineon_scraper import InfineonGaNScraper
from .data_processor import DataProcessor
from .file_manager import FileManager
from .database_manager import DatabaseManager

__all__ = [
    'BaseScraper',
    'EPCCoScraper', 
    'InfineonGaNScraper',
    'DataProcessor',
    'FileManager',
    'DatabaseManager'
] 