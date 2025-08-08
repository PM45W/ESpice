"""
File Manager Module
Handles file operations, datasheet management, and file organization
"""

import os
import shutil
import logging
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import hashlib
import aiofiles
import aiohttp
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class FileManager:
    """Manages file operations and organization"""
    
    def __init__(self, base_path: Path):
        self.base_path = Path(base_path)
        self.datasheets_path = self.base_path / "datasheets"
        self.processed_path = self.base_path / "processed"
        self.temp_path = self.base_path / "temp"
        self.exports_path = self.base_path / "exports"
        
        # Create directories if they don't exist
        self._create_directories()
    
    def _create_directories(self):
        """Create necessary directories"""
        directories = [
            self.datasheets_path,
            self.processed_path,
            self.temp_path,
            self.exports_path
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            
        # Create manufacturer-specific directories
        manufacturers = ['epc', 'infineon', 'wolfspeed', 'qorvo', 'nxp', 'ti']
        for manufacturer in manufacturers:
            (self.datasheets_path / manufacturer).mkdir(exist_ok=True)
            (self.processed_path / manufacturer).mkdir(exist_ok=True)
    
    def get_available_xlsx_files(self) -> List[Dict[str, Any]]:
        """Get list of available XLSX files in the datasheets directory"""
        xlsx_files = []
        
        for file_path in self.datasheets_path.rglob("*.xlsx"):
            try:
                stat = file_path.stat()
                xlsx_files.append({
                    'file_path': str(file_path),
                    'file_name': file_path.name,
                    'file_size': stat.st_size,
                    'modified_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'manufacturer': self._detect_manufacturer_from_path(file_path),
                    'relative_path': str(file_path.relative_to(self.datasheets_path))
                })
            except Exception as e:
                logger.error(f"Error processing file {file_path}: {e}")
        
        return sorted(xlsx_files, key=lambda x: x['file_name'])
    
    def _detect_manufacturer_from_path(self, file_path: Path) -> str:
        """Detect manufacturer from file path"""
        path_str = str(file_path).lower()
        
        if 'epc' in path_str:
            return 'EPC'
        elif 'infineon' in path_str:
            return 'Infineon'
        elif 'wolfspeed' in path_str:
            return 'Wolfspeed'
        elif 'qorvo' in path_str:
            return 'Qorvo'
        elif 'nxp' in path_str:
            return 'NXP'
        elif 'ti' in path_str:
            return 'TI'
        else:
            return 'Unknown'
    
    async def download_file(self, url: str, filename: str, manufacturer: str = "unknown") -> Optional[Path]:
        """Download file from URL"""
        try:
            # Create manufacturer directory
            manufacturer_dir = self.datasheets_path / manufacturer.lower()
            manufacturer_dir.mkdir(exist_ok=True)
            
            file_path = manufacturer_dir / filename
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        async with aiofiles.open(file_path, 'wb') as f:
                            await f.write(await response.read())
                        
                        logger.info(f"Downloaded {filename} to {file_path}")
                        return file_path
                    else:
                        logger.error(f"Failed to download {url}: {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error downloading {url}: {e}")
            return None
    
    def save_processed_data(self, data: Dict[str, Any], manufacturer: str, filename: str) -> Path:
        """Save processed data to JSON file"""
        try:
            manufacturer_dir = self.processed_path / manufacturer.lower()
            manufacturer_dir.mkdir(exist_ok=True)
            
            file_path = manufacturer_dir / filename
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Saved processed data to {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"Error saving processed data: {e}")
            raise
    
    def get_processed_data(self, manufacturer: str) -> List[Dict[str, Any]]:
        """Get all processed data for a manufacturer"""
        processed_files = []
        manufacturer_dir = self.processed_path / manufacturer.lower()
        
        if not manufacturer_dir.exists():
            return []
        
        for file_path in manufacturer_dir.glob("*.json"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    data['file_path'] = str(file_path)
                    data['file_name'] = file_path.name
                    processed_files.append(data)
            except Exception as e:
                logger.error(f"Error reading processed file {file_path}: {e}")
        
        return processed_files
    
    def get_datasheet_info(self, manufacturer: str) -> List[Dict[str, Any]]:
        """Get information about available datasheets for a manufacturer"""
        datasheet_files = []
        manufacturer_dir = self.datasheets_path / manufacturer.lower()
        
        if not manufacturer_dir.exists():
            return []
        
        for file_path in manufacturer_dir.rglob("*"):
            if file_path.is_file():
                try:
                    stat = file_path.stat()
                    datasheet_files.append({
                        'file_path': str(file_path),
                        'file_name': file_path.name,
                        'file_size': stat.st_size,
                        'modified_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        'file_type': file_path.suffix.lower(),
                        'relative_path': str(file_path.relative_to(self.datasheets_path))
                    })
                except Exception as e:
                    logger.error(f"Error processing datasheet {file_path}: {e}")
        
        return sorted(datasheet_files, key=lambda x: x['file_name'])
    
    def calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of a file"""
        try:
            hash_sha256 = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except Exception as e:
            logger.error(f"Error calculating hash for {file_path}: {e}")
            return ""
    
    def cleanup_temp_files(self, max_age_hours: int = 24):
        """Clean up temporary files older than specified hours"""
        try:
            current_time = datetime.now()
            cleaned_count = 0
            
            for file_path in self.temp_path.rglob("*"):
                if file_path.is_file():
                    file_age = current_time - datetime.fromtimestamp(file_path.stat().st_mtime)
                    if file_age.total_seconds() > max_age_hours * 3600:
                        file_path.unlink()
                        cleaned_count += 1
            
            logger.info(f"Cleaned up {cleaned_count} temporary files")
            
        except Exception as e:
            logger.error(f"Error cleaning up temp files: {e}")
    
    def export_data(self, data: Dict[str, Any], format: str = "json", filename: str = None) -> Optional[Path]:
        """Export data in specified format"""
        try:
            if not filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"export_{timestamp}.{format}"
            
            export_path = self.exports_path / filename
            
            if format.lower() == "json":
                with open(export_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
            else:
                raise ValueError(f"Unsupported export format: {format}")
            
            logger.info(f"Exported data to {export_path}")
            return export_path
            
        except Exception as e:
            logger.error(f"Error exporting data: {e}")
            return None
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        try:
            stats = {
                'total_size': 0,
                'file_counts': {},
                'manufacturers': {}
            }
            
            # Calculate sizes and counts
            for manufacturer_dir in self.datasheets_path.iterdir():
                if manufacturer_dir.is_dir():
                    manufacturer = manufacturer_dir.name
                    total_size = 0
                    file_count = 0
                    
                    for file_path in manufacturer_dir.rglob("*"):
                        if file_path.is_file():
                            total_size += file_path.stat().st_size
                            file_count += 1
                    
                    stats['manufacturers'][manufacturer] = {
                        'file_count': file_count,
                        'total_size': total_size,
                        'total_size_mb': round(total_size / (1024 * 1024), 2)
                    }
                    stats['total_size'] += total_size
            
            stats['total_size_mb'] = round(stats['total_size'] / (1024 * 1024), 2)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error calculating storage stats: {e}")
            return {}
    
    def backup_data(self, backup_name: str = None) -> Optional[Path]:
        """Create a backup of all data"""
        try:
            if not backup_name:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_name = f"backup_{timestamp}"
            
            backup_path = self.base_path / "backups" / backup_name
            backup_path.mkdir(parents=True, exist_ok=True)
            
            # Copy datasheets and processed data
            if self.datasheets_path.exists():
                shutil.copytree(self.datasheets_path, backup_path / "datasheets", dirs_exist_ok=True)
            
            if self.processed_path.exists():
                shutil.copytree(self.processed_path, backup_path / "processed", dirs_exist_ok=True)
            
            logger.info(f"Created backup at {backup_path}")
            return backup_path
            
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
            return None 