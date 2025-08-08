from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import logging
from datetime import datetime
import uuid
import pandas as pd
import numpy as np
from pathlib import Path
import aiofiles
import asyncio
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Test Data Correlation Service", version="1.0.0")

class CorrelationStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class TestDataType(str, Enum):
    IV_CURVE = "iv_curve"
    CV_CURVE = "cv_curve"
    TEMPERATURE = "temperature"
    FREQUENCY = "frequency"
    NOISE = "noise"
    AGING = "aging"

class CorrelationResult(BaseModel):
    correlation_id: str
    model_id: Optional[str] = None
    test_data_id: str
    parameter_name: str
    extracted_value: float
    measured_value: float
    correlation_score: float
    error_percentage: float
    tolerance: float
    within_tolerance: bool
    confidence_level: float
    created_at: datetime

class TestDataUpload(BaseModel):
    device_id: str
    test_type: TestDataType
    temperature: Optional[float] = None
    voltage_range: Optional[List[float]] = None
    frequency_range: Optional[List[float]] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class CorrelationRequest(BaseModel):
    test_data_id: str
    model_id: Optional[str] = None
    extracted_parameters: Dict[str, float]
    tolerance_percentage: float = 10.0
    confidence_threshold: float = 0.8

class TestDataInfo(BaseModel):
    test_data_id: str
    device_id: str
    test_type: TestDataType
    file_path: str
    data_points: int
    temperature: Optional[float]
    voltage_range: Optional[List[float]]
    frequency_range: Optional[List[float]]
    description: Optional[str]
    metadata: Optional[Dict[str, Any]]
    uploaded_at: datetime
    processed_at: Optional[datetime]

# In-memory storage (in production, use database)
test_data_files: Dict[str, TestDataInfo] = {}
correlation_results: Dict[str, List[CorrelationResult]] = {}

class TestDataCorrelator:
    """Test data correlation and validation engine"""
    
    def __init__(self):
        self.data_path = Path("/app/test_data")
        self.data_path.mkdir(exist_ok=True)
        self.results_path = Path("/app/correlation_results")
        self.results_path.mkdir(exist_ok=True)
    
    async def save_test_data(self, file: UploadFile, info: TestDataUpload) -> str:
        """Save uploaded test data file"""
        test_data_id = str(uuid.uuid4())
        file_path = self.data_path / f"{test_data_id}_{file.filename}"
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Parse data to get basic info
        data_points = await self.get_data_points(file_path)
        
        # Create test data info
        test_info = TestDataInfo(
            test_data_id=test_data_id,
            device_id=info.device_id,
            test_type=info.test_type,
            file_path=str(file_path),
            data_points=data_points,
            temperature=info.temperature,
            voltage_range=info.voltage_range,
            frequency_range=info.frequency_range,
            description=info.description,
            metadata=info.metadata,
            uploaded_at=datetime.now()
        )
        
        test_data_files[test_data_id] = test_info
        logger.info(f"Saved test data {test_data_id} with {data_points} data points")
        
        return test_data_id
    
    async def get_data_points(self, file_path: Path) -> int:
        """Get number of data points in test data file"""
        try:
            # Try to read as CSV first
            df = pd.read_csv(file_path)
            return len(df)
        except:
            try:
                # Try to read as JSON
                async with aiofiles.open(file_path, 'r') as f:
                    content = await f.read()
                    data = json.loads(content)
                    if isinstance(data, list):
                        return len(data)
                    elif isinstance(data, dict) and 'data' in data:
                        return len(data['data'])
                    else:
                        return 1
            except:
                return 0
    
    async def parse_test_data(self, test_data_id: str) -> Dict[str, Any]:
        """Parse test data file and extract key parameters"""
        if test_data_id not in test_data_files:
            raise Exception(f"Test data {test_data_id} not found")
        
        test_info = test_data_files[test_data_id]
        file_path = Path(test_info.file_path)
        
        try:
            # Try CSV format first
            df = pd.read_csv(file_path)
            
            # Extract parameters based on test type
            if test_info.test_type == TestDataType.IV_CURVE:
                return await self.extract_iv_parameters(df)
            elif test_info.test_type == TestDataType.CV_CURVE:
                return await self.extract_cv_parameters(df)
            elif test_info.test_type == TestDataType.TEMPERATURE:
                return await self.extract_temperature_parameters(df)
            else:
                return await self.extract_generic_parameters(df)
                
        except Exception as e:
            logger.error(f"Error parsing test data {test_data_id}: {e}")
            return {}
    
    async def extract_iv_parameters(self, df: pd.DataFrame) -> Dict[str, float]:
        """Extract I-V curve parameters"""
        params = {}
        
        try:
            # Look for common column names
            voltage_col = None
            current_col = None
            
            for col in df.columns:
                col_lower = col.lower()
                if any(v in col_lower for v in ['vds', 'vgs', 'voltage', 'v_']):
                    voltage_col = col
                elif any(i in col_lower for i in ['ids', 'id', 'current', 'i_']):
                    current_col = col
            
            if voltage_col and current_col:
                # Extract key parameters
                vds_values = df[voltage_col].values
                ids_values = df[current_col].values
                
                # Threshold voltage (Vth) - where current starts to flow
                threshold_idx = np.where(ids_values > ids_values.max() * 0.01)[0]
                if len(threshold_idx) > 0:
                    params['vth'] = float(vds_values[threshold_idx[0]])
                
                # On-resistance (Rds_on) - slope at high current
                high_current_idx = np.where(ids_values > ids_values.max() * 0.8)[0]
                if len(high_current_idx) > 1:
                    v_high = vds_values[high_current_idx]
                    i_high = ids_values[high_current_idx]
                    slope = np.polyfit(v_high, i_high, 1)[0]
                    params['rds_on'] = float(1 / slope) if slope > 0 else float('inf')
                
                # Maximum current
                params['id_max'] = float(ids_values.max())
                
                # Maximum voltage
                params['vds_max'] = float(vds_values.max())
        
        except Exception as e:
            logger.error(f"Error extracting I-V parameters: {e}")
        
        return params
    
    async def extract_cv_parameters(self, df: pd.DataFrame) -> Dict[str, float]:
        """Extract C-V curve parameters"""
        params = {}
        
        try:
            # Look for voltage and capacitance columns
            voltage_col = None
            cap_col = None
            
            for col in df.columns:
                col_lower = col.lower()
                if any(v in col_lower for v in ['vgs', 'voltage', 'v_']):
                    voltage_col = col
                elif any(c in col_lower for c in ['ciss', 'coss', 'crss', 'capacitance', 'c_']):
                    cap_col = col
            
            if voltage_col and cap_col:
                vgs_values = df[voltage_col].values
                cap_values = df[cap_col].values
                
                # Input capacitance (Ciss)
                params['ciss'] = float(cap_values.max())
                
                # Output capacitance (Coss) - typically at Vgs = 0
                zero_v_idx = np.argmin(np.abs(vgs_values))
                params['coss'] = float(cap_values[zero_v_idx])
                
                # Reverse transfer capacitance (Crss)
                params['crss'] = float(cap_values.min())
        
        except Exception as e:
            logger.error(f"Error extracting C-V parameters: {e}")
        
        return params
    
    async def extract_temperature_parameters(self, df: pd.DataFrame) -> Dict[str, float]:
        """Extract temperature-dependent parameters"""
        params = {}
        
        try:
            # Look for temperature and parameter columns
            temp_col = None
            param_col = None
            
            for col in df.columns:
                col_lower = col.lower()
                if any(t in col_lower for t in ['temp', 'temperature', 't_']):
                    temp_col = col
                elif any(p in col_lower for p in ['rds', 'vth', 'gm', 'parameter']):
                    param_col = col
            
            if temp_col and param_col:
                temp_values = df[temp_col].values
                param_values = df[param_col].values
                
                # Temperature coefficient
                if len(temp_values) > 1:
                    slope = np.polyfit(temp_values, param_values, 1)[0]
                    params['temp_coefficient'] = float(slope)
                
                # Room temperature value (25°C)
                room_temp_idx = np.argmin(np.abs(temp_values - 25))
                params['room_temp_value'] = float(param_values[room_temp_idx])
        
        except Exception as e:
            logger.error(f"Error extracting temperature parameters: {e}")
        
        return params
    
    async def extract_generic_parameters(self, df: pd.DataFrame) -> Dict[str, float]:
        """Extract generic parameters from any test data"""
        params = {}
        
        try:
            # Extract basic statistics for numeric columns
            for col in df.columns:
                if df[col].dtype in ['float64', 'int64']:
                    params[f'{col}_mean'] = float(df[col].mean())
                    params[f'{col}_max'] = float(df[col].max())
                    params[f'{col}_min'] = float(df[col].min())
                    params[f'{col}_std'] = float(df[col].std())
        
        except Exception as e:
            logger.error(f"Error extracting generic parameters: {e}")
        
        return params
    
    async def correlate_parameters(
        self, 
        request: CorrelationRequest
    ) -> List[CorrelationResult]:
        """Correlate extracted parameters with test data"""
        correlation_id = str(uuid.uuid4())
        results = []
        
        try:
            # Parse test data
            test_params = await self.parse_test_data(request.test_data_id)
            
            # Correlate each parameter
            for param_name, extracted_value in request.extracted_parameters.items():
                if param_name in test_params:
                    measured_value = test_params[param_name]
                    
                    # Calculate correlation metrics
                    error = abs(extracted_value - measured_value)
                    error_percentage = (error / measured_value) * 100 if measured_value != 0 else float('inf')
                    within_tolerance = error_percentage <= request.tolerance_percentage
                    
                    # Calculate correlation score (simplified)
                    if measured_value != 0:
                        correlation_score = max(0, 1 - (error_percentage / 100))
                    else:
                        correlation_score = 0.0
                    
                    # Determine confidence level
                    confidence_level = min(1.0, correlation_score / request.confidence_threshold)
                    
                    # Create correlation result
                    result = CorrelationResult(
                        correlation_id=correlation_id,
                        model_id=request.model_id,
                        test_data_id=request.test_data_id,
                        parameter_name=param_name,
                        extracted_value=extracted_value,
                        measured_value=measured_value,
                        correlation_score=correlation_score,
                        error_percentage=error_percentage,
                        tolerance=request.tolerance_percentage,
                        within_tolerance=within_tolerance,
                        confidence_level=confidence_level,
                        created_at=datetime.now()
                    )
                    
                    results.append(result)
            
            # Store results
            correlation_results[correlation_id] = results
            
            # Save to file
            await self.save_correlation_results(correlation_id, results)
            
            logger.info(f"Correlation {correlation_id} completed with {len(results)} results")
            
        except Exception as e:
            logger.error(f"Error in correlation {correlation_id}: {e}")
            raise
        
        return results
    
    async def save_correlation_results(self, correlation_id: str, results: List[CorrelationResult]):
        """Save correlation results to file"""
        result_file = self.results_path / f"{correlation_id}.json"
        
        result_data = {
            "correlation_id": correlation_id,
            "created_at": datetime.now().isoformat(),
            "results": [result.dict() for result in results],
            "summary": {
                "total_parameters": len(results),
                "within_tolerance": sum(1 for r in results if r.within_tolerance),
                "average_correlation_score": np.mean([r.correlation_score for r in results]) if results else 0,
                "average_error_percentage": np.mean([r.error_percentage for r in results]) if results else 0
            }
        }
        
        async with aiofiles.open(result_file, 'w') as f:
            await f.write(json.dumps(result_data, indent=2))
    
    async def get_correlation_summary(self, correlation_id: str) -> Dict[str, Any]:
        """Get summary of correlation results"""
        if correlation_id not in correlation_results:
            raise Exception(f"Correlation {correlation_id} not found")
        
        results = correlation_results[correlation_id]
        
        return {
            "correlation_id": correlation_id,
            "total_parameters": len(results),
            "within_tolerance": sum(1 for r in results if r.within_tolerance),
            "tolerance_rate": sum(1 for r in results if r.within_tolerance) / len(results) if results else 0,
            "average_correlation_score": np.mean([r.correlation_score for r in results]) if results else 0,
            "average_error_percentage": np.mean([r.error_percentage for r in results]) if results else 0,
            "best_correlated": max(results, key=lambda r: r.correlation_score).parameter_name if results else None,
            "worst_correlated": min(results, key=lambda r: r.correlation_score).parameter_name if results else None
        }

# Initialize correlator
correlator = TestDataCorrelator()

@app.on_event("startup")
async def startup_event():
    """Initialize the test correlation service"""
    logger.info("Test Data Correlation Service starting up...")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "test-correlation"}

@app.post("/test-data/upload")
async def upload_test_data(
    file: UploadFile = File(...),
    device_id: str = None,
    test_type: TestDataType = None,
    temperature: Optional[float] = None,
    voltage_range: Optional[str] = None,
    frequency_range: Optional[str] = None,
    description: Optional[str] = None
):
    """Upload test data file"""
    try:
        # Parse ranges
        v_range = None
        f_range = None
        
        if voltage_range:
            v_range = [float(x.strip()) for x in voltage_range.split(',')]
        if frequency_range:
            f_range = [float(x.strip()) for x in frequency_range.split(',')]
        
        # Create upload info
        upload_info = TestDataUpload(
            device_id=device_id or "unknown",
            test_type=test_type or TestDataType.IV_CURVE,
            temperature=temperature,
            voltage_range=v_range,
            frequency_range=f_range,
            description=description
        )
        
        # Save test data
        test_data_id = await correlator.save_test_data(file, upload_info)
        
        return {
            "test_data_id": test_data_id,
            "message": "Test data uploaded successfully",
            "file_name": file.filename,
            "data_points": test_data_files[test_data_id].data_points
        }
        
    except Exception as e:
        logger.error(f"Error uploading test data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test-data/{test_data_id}")
async def get_test_data_info(test_data_id: str):
    """Get test data information"""
    try:
        if test_data_id not in test_data_files:
            raise HTTPException(status_code=404, detail="Test data not found")
        
        return test_data_files[test_data_id]
    except Exception as e:
        logger.error(f"Error getting test data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test-data")
async def list_test_data():
    """List all test data files"""
    try:
        return {
            "test_data": [info.dict() for info in test_data_files.values()],
            "total": len(test_data_files)
        }
    except Exception as e:
        logger.error(f"Error listing test data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/correlate")
async def correlate_data(request: CorrelationRequest, background_tasks: BackgroundTasks):
    """Correlate extracted parameters with test data"""
    try:
        # Start correlation in background
        correlation_id = str(uuid.uuid4())
        background_tasks.add_task(correlator.correlate_parameters, request)
        
        return {
            "correlation_id": correlation_id,
            "message": "Correlation started",
            "test_data_id": request.test_data_id,
            "parameters_count": len(request.extracted_parameters)
        }
        
    except Exception as e:
        logger.error(f"Error starting correlation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/correlate/{correlation_id}")
async def get_correlation_results(correlation_id: str):
    """Get correlation results"""
    try:
        if correlation_id not in correlation_results:
            raise HTTPException(status_code=404, detail="Correlation not found")
        
        results = correlation_results[correlation_id]
        summary = await correlator.get_correlation_summary(correlation_id)
        
        return {
            "correlation_id": correlation_id,
            "summary": summary,
            "results": [result.dict() for result in results]
        }
        
    except Exception as e:
        logger.error(f"Error getting correlation results: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/correlate")
async def list_correlations():
    """List all correlations"""
    try:
        correlations = []
        for correlation_id in correlation_results:
            summary = await correlator.get_correlation_summary(correlation_id)
            correlations.append(summary)
        
        return {
            "correlations": correlations,
            "total": len(correlations)
        }
        
    except Exception as e:
        logger.error(f"Error listing correlations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/validate/{test_data_id}")
async def validate_extraction(test_data_id: str, extracted_parameters: Dict[str, float]):
    """Quick validation of extracted parameters against test data"""
    try:
        # Parse test data
        test_params = await correlator.parse_test_data(test_data_id)
        
        validation_results = []
        for param_name, extracted_value in extracted_parameters.items():
            if param_name in test_params:
                measured_value = test_params[param_name]
                error_percentage = abs(extracted_value - measured_value) / measured_value * 100 if measured_value != 0 else float('inf')
                
                validation_results.append({
                    "parameter": param_name,
                    "extracted": extracted_value,
                    "measured": measured_value,
                    "error_percentage": error_percentage,
                    "within_10_percent": error_percentage <= 10.0,
                    "within_20_percent": error_percentage <= 20.0
                })
        
        return {
            "test_data_id": test_data_id,
            "validation_results": validation_results,
            "total_parameters": len(validation_results),
            "average_error": np.mean([r["error_percentage"] for r in validation_results]) if validation_results else 0
        }
        
    except Exception as e:
        logger.error(f"Error validating extraction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/test-data/{test_data_id}")
async def delete_test_data(test_data_id: str):
    """Delete test data file"""
    try:
        if test_data_id not in test_data_files:
            raise HTTPException(status_code=404, detail="Test data not found")
        
        # Remove file
        test_info = test_data_files[test_data_id]
        file_path = Path(test_info.file_path)
        if file_path.exists():
            file_path.unlink()
        
        # Remove from storage
        del test_data_files[test_data_id]
        
        return {"message": "Test data deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting test data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009) 