"""
Modular Web Scraper API
Enhanced version with modular architecture for better maintainability
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import logging
from datetime import datetime
import uuid
from pathlib import Path
import asyncio
from fastapi.middleware.cors import CORSMiddleware

# Import modular components
from modules.data_processor import DataProcessor
from modules.file_manager import FileManager
from modules.database_manager import DatabaseManager
from modules.epc_scraper import EPCCoScraper
from modules.infineon_scraper import InfineonGaNScraper

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Modular Web Scraper Service", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize modular components
base_path = Path(__file__).parent
file_manager = FileManager(base_path)
data_processor = DataProcessor()
db_manager = DatabaseManager()

# Initialize scrapers
epc_scraper = EPCCoScraper(db_manager, file_manager, data_processor)
infineon_scraper = InfineonGaNScraper(db_manager, file_manager, data_processor)

# Pydantic models
class ProcessXLSXRequest(BaseModel):
    file_path: str
    manufacturer: Optional[str] = None
    auto_detect: bool = True

class BatchDownloadRequest(BaseModel):
    manufacturer: str
    include_spice: bool = True
    use_csv_data: bool = True
    model_numbers: Optional[List[str]] = None

class ExportRequest(BaseModel):
    manufacturer: str
    format: str = "json"
    filename: Optional[str] = None

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Modular Web Scraper Service starting up...")
    db_manager.init_database()

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0", "timestamp": datetime.now().isoformat()}

# File management endpoints
@app.get("/files/xlsx")
async def get_available_xlsx_files():
    """Get list of available XLSX files"""
    try:
        files = file_manager.get_available_xlsx_files()
        return {
            "files": files,
            "total_count": len(files),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting XLSX files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files/datasheets/{manufacturer}")
async def get_datasheet_info(manufacturer: str):
    """Get information about datasheets for a specific manufacturer"""
    try:
        datasheets = file_manager.get_datasheet_info(manufacturer)
        return {
            "manufacturer": manufacturer,
            "datasheets": datasheets,
            "total_count": len(datasheets),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting datasheet info for {manufacturer}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files/storage-stats")
async def get_storage_stats():
    """Get storage statistics"""
    try:
        stats = file_manager.get_storage_stats()
        return {
            "stats": stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting storage stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Data processing endpoints
@app.post("/process/xlsx")
async def process_xlsx_file(request: ProcessXLSXRequest):
    """Process XLSX file and extract product data"""
    try:
        file_path = Path(request.file_path)
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")
        
        # Process the XLSX file
        if request.manufacturer and request.manufacturer.lower() == "epc":
            result = data_processor.process_epc_xlsx(file_path)
        elif request.manufacturer and request.manufacturer.lower() == "infineon":
            result = data_processor.process_infineon_xlsx(file_path)
        else:
            result = data_processor.process_xlsx_file(file_path)
        
        if 'error' in result:
            raise HTTPException(status_code=500, detail=result['error'])
        
        # Save processed data
        manufacturer = result.get('manufacturer', 'unknown')
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"processed_{manufacturer.lower()}_{timestamp}.json"
        
        saved_path = file_manager.save_processed_data(result, manufacturer, filename)
        
        return {
            "success": True,
            "result": result,
            "saved_path": str(saved_path),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error processing XLSX file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/process/data/{manufacturer}")
async def get_processed_data(manufacturer: str):
    """Get processed data for a manufacturer"""
    try:
        data = file_manager.get_processed_data(manufacturer)
        return {
            "manufacturer": manufacturer,
            "data": data,
            "total_files": len(data),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting processed data for {manufacturer}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# EPC-specific endpoints
@app.post("/epc/process-xlsx")
async def process_epc_xlsx(file_path: str):
    """Process EPC XLSX file specifically"""
    try:
        result = data_processor.process_epc_xlsx(Path(file_path))
        
        if 'error' in result:
            raise HTTPException(status_code=500, detail=result['error'])
        
        # Save processed data
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"epc_processed_{timestamp}.json"
        saved_path = file_manager.save_processed_data(result, "EPC", filename)
        
        return {
            "success": True,
            "result": result,
            "saved_path": str(saved_path),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error processing EPC XLSX: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/epc/batch-download")
async def batch_download_epc_datasheets(request: BatchDownloadRequest):
    """Batch download EPC datasheets"""
    try:
        if request.manufacturer.lower() != "epc":
            raise HTTPException(status_code=400, detail="This endpoint is for EPC products only")
        
        async with epc_scraper:
            if request.use_csv_data and not request.model_numbers:
                # Get model numbers from CSV
                result = await epc_scraper.scrape_products(use_csv_data=True)
                if 'error' in result:
                    raise HTTPException(status_code=500, detail=result['error'])
                
                model_numbers = [p.get('part_number') for p in result.get('products', [])]
            else:
                model_numbers = request.model_numbers or []
            
            if not model_numbers:
                raise HTTPException(status_code=400, detail="No model numbers found")
            
            # Download datasheets
            download_result = await epc_scraper.download_datasheets(model_numbers)
            
            return {
                "success": True,
                "download_result": download_result,
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Error in batch download: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Infineon-specific endpoints
@app.post("/infineon/process-xlsx")
async def process_infineon_xlsx(file_path: str):
    """Process Infineon XLSX file specifically"""
    try:
        result = data_processor.process_infineon_xlsx(Path(file_path))
        
        if 'error' in result:
            raise HTTPException(status_code=500, detail=result['error'])
        
        # Save processed data
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"infineon_processed_{timestamp}.json"
        saved_path = file_manager.save_processed_data(result, "Infineon", filename)
        
        return {
            "success": True,
            "result": result,
            "saved_path": str(saved_path),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error processing Infineon XLSX: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Export endpoints
@app.post("/export/data")
async def export_data(request: ExportRequest):
    """Export processed data"""
    try:
        # Get processed data
        data = file_manager.get_processed_data(request.manufacturer)
        
        if not data:
            raise HTTPException(status_code=404, detail=f"No processed data found for {request.manufacturer}")
        
        # Export data
        export_path = file_manager.export_data(
            {"manufacturer": request.manufacturer, "data": data},
            request.format,
            request.filename
        )
        
        if not export_path:
            raise HTTPException(status_code=500, detail="Failed to export data")
        
        return {
            "success": True,
            "export_path": str(export_path),
            "format": request.format,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error exporting data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Maintenance endpoints
@app.post("/maintenance/cleanup")
async def cleanup_temp_files(max_age_hours: int = 24):
    """Clean up temporary files"""
    try:
        file_manager.cleanup_temp_files(max_age_hours)
        return {
            "success": True,
            "message": f"Cleaned up temp files older than {max_age_hours} hours",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error cleaning up temp files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/maintenance/backup")
async def create_backup(backup_name: Optional[str] = None):
    """Create a backup of all data"""
    try:
        backup_path = file_manager.backup_data(backup_name)
        
        if not backup_path:
            raise HTTPException(status_code=500, detail="Failed to create backup")
        
        return {
            "success": True,
            "backup_path": str(backup_path),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error creating backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Legacy compatibility endpoints
@app.get("/products")
async def get_products(manufacturer: Optional[str] = None, limit: int = 100):
    """Get products from database (legacy compatibility)"""
    try:
        products = db_manager.get_products(manufacturer=manufacturer, limit=limit)
        return {
            "products": [product.dict() for product in products],
            "total": len(products),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting products: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8011) 