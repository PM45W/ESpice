from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from datetime import datetime
import json
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
import fitz  # PyMuPDF
import cv2
import numpy as np
from PIL import Image
import pytesseract
import io
import base64
import re

# Create FastAPI app
app = FastAPI(
    title="ESpice PDF Service",
    description="Microservice for PDF processing and extraction",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Tesseract path for Windows
if os.name == 'nt':  # Windows
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Pydantic models for request/response
class TextExtractionRequest(BaseModel):
    include_metadata: bool = True
    include_page_numbers: bool = True

class TableExtractionRequest(BaseModel):
    min_confidence: float = 0.7
    include_coordinates: bool = True

class ImageExtractionRequest(BaseModel):
    min_width: int = 100
    min_height: int = 100
    include_base64: bool = False

class MetadataExtractionRequest(BaseModel):
    include_statistics: bool = True

class ServiceResponse(BaseModel):
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None
    metadata: Dict[str, Any]

def create_metadata(processing_time: float, service: str = "pdf-service") -> Dict[str, Any]:
    """Create standardized metadata for service responses"""
    return {
        "processingTime": processing_time,
        "service": service,
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

def extract_text_from_pdf(pdf_bytes: bytes, include_page_numbers: bool = True) -> Dict[str, Any]:
    """Extract text from PDF using PyMuPDF"""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_lines = []
        page_texts = []
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text("text")
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            
            if include_page_numbers:
                page_texts.append({
                    "page": page_num + 1,
                    "text": text,
                    "lines": lines
                })
            else:
                text_lines.extend(lines)
        
        doc.close()
        
        return {
            "total_pages": len(doc),
            "total_lines": len(text_lines) if not include_page_numbers else sum(len(p["lines"]) for p in page_texts),
            "text_lines": text_lines if not include_page_numbers else None,
            "page_texts": page_texts if include_page_numbers else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting text from PDF: {str(e)}")

def extract_tables_from_pdf(pdf_bytes: bytes, min_confidence: float = 0.7, include_coordinates: bool = True) -> List[Dict]:
    """Extract tables from PDF using OCR and image processing"""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        tables = []
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            
            # Convert page to image
            mat = fitz.Matrix(2, 2)  # 2x zoom for better OCR
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            
            # Convert to OpenCV format
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Detect table lines
            horizontal = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
            vertical = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
            
            # Combine horizontal and vertical lines
            table_mask = cv2.addWeighted(horizontal, 0.5, vertical, 0.5, 0)
            
            # Find contours (potential table cells)
            contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Extract text from table regions using OCR
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                if w > 50 and h > 20:  # Filter small contours
                    roi = gray[y:y+h, x:x+w]
                    text = pytesseract.image_to_string(roi, config='--psm 6').strip()
                    if text:
                        table_data = {
                            "page": page_num + 1,
                            "text": text,
                            "confidence": 0.8  # Default confidence
                        }
                        
                        if include_coordinates:
                            table_data.update({
                                "x": x, "y": y, "width": w, "height": h
                            })
                        
                        tables.append(table_data)
        
        doc.close()
        return tables
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting tables from PDF: {str(e)}")

def extract_images_from_pdf(pdf_bytes: bytes, min_width: int = 100, min_height: int = 100, include_base64: bool = False) -> List[Dict]:
    """Extract images from PDF"""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        images = []
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            
            # Get image list from page
            image_list = page.get_images()
            
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                
                # Get image dimensions
                pil_image = Image.open(io.BytesIO(image_bytes))
                width, height = pil_image.size
                
                if width >= min_width and height >= min_height:
                    image_data = {
                        "page": page_num + 1,
                        "index": img_index,
                        "width": width,
                        "height": height,
                        "format": base_image["ext"],
                        "size_bytes": len(image_bytes)
                    }
                    
                    if include_base64:
                        image_data["base64"] = base64.b64encode(image_bytes).decode('utf-8')
                    
                    images.append(image_data)
        
        doc.close()
        return images
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting images from PDF: {str(e)}")

def extract_metadata_from_pdf(pdf_bytes: bytes, include_statistics: bool = True) -> Dict[str, Any]:
    """Extract metadata from PDF"""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        # Basic metadata
        metadata = {
            "pages": len(doc),
            "encrypted": doc.needs_pass,
            "file_size": len(pdf_bytes),
            "title": "",
            "author": "",
            "subject": "",
            "creator": "",
            "producer": "",
            "creation_date": "",
            "modification_date": ""
        }
        
        # Get document info
        info = doc.metadata
        if info:
            metadata.update({
                "title": info.get("title", ""),
                "author": info.get("author", ""),
                "subject": info.get("subject", ""),
                "creator": info.get("creator", ""),
                "producer": info.get("producer", ""),
                "creation_date": info.get("creationDate", ""),
                "modification_date": info.get("modDate", "")
            })
        
        # Add statistics if requested
        if include_statistics:
            total_text_length = 0
            total_images = 0
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text = page.get_text("text")
                total_text_length += len(text)
                total_images += len(page.get_images())
            
            metadata.update({
                "statistics": {
                    "total_text_length": total_text_length,
                    "total_images": total_images,
                    "average_text_per_page": total_text_length / len(doc) if len(doc) > 0 else 0
                }
            })
        
        doc.close()
        return metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting metadata from PDF: {str(e)}")

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "ESpice PDF Service", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "pdf-service",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/pdf/extract-text")
async def extract_text(file: UploadFile = File(...), request: Optional[TextExtractionRequest] = None):
    """Extract text from PDF file"""
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    start_time = datetime.now()
    
    try:
        pdf_bytes = await file.read()
        result = extract_text_from_pdf(
            pdf_bytes, 
            include_page_numbers=request.include_page_numbers if request else True
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ServiceResponse(
            success=True,
            data=result,
            metadata=create_metadata(processing_time)
        )
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        return ServiceResponse(
            success=False,
            error=str(e),
            metadata=create_metadata(processing_time)
        )

@app.post("/api/pdf/extract-tables")
async def extract_tables(file: UploadFile = File(...), request: Optional[TableExtractionRequest] = None):
    """Extract tables from PDF file"""
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    start_time = datetime.now()
    
    try:
        pdf_bytes = await file.read()
        result = extract_tables_from_pdf(
            pdf_bytes,
            min_confidence=request.min_confidence if request else 0.7,
            include_coordinates=request.include_coordinates if request else True
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ServiceResponse(
            success=True,
            data={"tables": result, "count": len(result)},
            metadata=create_metadata(processing_time)
        )
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        return ServiceResponse(
            success=False,
            error=str(e),
            metadata=create_metadata(processing_time)
        )

@app.post("/api/pdf/extract-images")
async def extract_images(file: UploadFile = File(...), request: Optional[ImageExtractionRequest] = None):
    """Extract images from PDF file"""
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    start_time = datetime.now()
    
    try:
        pdf_bytes = await file.read()
        result = extract_images_from_pdf(
            pdf_bytes,
            min_width=request.min_width if request else 100,
            min_height=request.min_height if request else 100,
            include_base64=request.include_base64 if request else False
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ServiceResponse(
            success=True,
            data={"images": result, "count": len(result)},
            metadata=create_metadata(processing_time)
        )
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        return ServiceResponse(
            success=False,
            error=str(e),
            metadata=create_metadata(processing_time)
        )

@app.post("/api/pdf/extract-metadata")
async def extract_metadata(file: UploadFile = File(...), request: Optional[MetadataExtractionRequest] = None):
    """Extract metadata from PDF file"""
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    start_time = datetime.now()
    
    try:
        pdf_bytes = await file.read()
        result = extract_metadata_from_pdf(
            pdf_bytes,
            include_statistics=request.include_statistics if request else True
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ServiceResponse(
            success=True,
            data=result,
            metadata=create_metadata(processing_time)
        )
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        return ServiceResponse(
            success=False,
            error=str(e),
            metadata=create_metadata(processing_time)
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002) 