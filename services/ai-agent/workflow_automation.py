"""
Workflow Automation Scripts
Provides automated workflows for common document processing tasks
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
import base64
from mcp_tools import MCPTools

logger = logging.getLogger(__name__)

class WorkflowAutomation:
    """Automated workflow execution for document processing"""
    
    def __init__(self, mcp_tools: MCPTools):
        self.mcp_tools = mcp_tools
    
    async def process_semiconductor_datasheet(
        self, 
        pdf_path: str,
        output_dir: str = "./output"
    ) -> Dict[str, Any]:
        """
        Process a semiconductor datasheet with full extraction
        
        Args:
            pdf_path: Path to the PDF datasheet
            output_dir: Directory to save results
        
        Returns:
            Processing results
        """
        try:
            # Read and encode PDF file
            with open(pdf_path, 'rb') as f:
                pdf_content = f.read()
                pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
            
            logger.info(f"Processing semiconductor datasheet: {pdf_path}")
            
            # Execute full analysis
            result = await self.mcp_tools.execute_full_document_analysis(
                pdf_file=pdf_base64
            )
            
            # Save results
            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            result_file = output_path / f"datasheet_analysis_{timestamp}.json"
            
            with open(result_file, 'w') as f:
                json.dump(result, f, indent=2, default=str)
            
            logger.info(f"Results saved to: {result_file}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing datasheet: {e}")
            raise
    
    async def batch_process_documents(
        self, 
        pdf_directory: str,
        output_dir: str = "./batch_output"
    ) -> List[Dict[str, Any]]:
        """
        Process multiple PDF documents in batch
        
        Args:
            pdf_directory: Directory containing PDF files
            output_dir: Directory to save results
        
        Returns:
            List of processing results
        """
        try:
            pdf_dir = Path(pdf_directory)
            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)
            
            pdf_files = list(pdf_dir.glob("*.pdf"))
            logger.info(f"Found {len(pdf_files)} PDF files to process")
            
            results = []
            
            for i, pdf_file in enumerate(pdf_files, 1):
                try:
                    logger.info(f"Processing {i}/{len(pdf_files)}: {pdf_file.name}")
                    
                    result = await self.process_semiconductor_datasheet(
                        str(pdf_file),
                        str(output_path)
                    )
                    
                    results.append({
                        "file": pdf_file.name,
                        "status": "success",
                        "result": result
                    })
                    
                except Exception as e:
                    logger.error(f"Error processing {pdf_file.name}: {e}")
                    results.append({
                        "file": pdf_file.name,
                        "status": "failed",
                        "error": str(e)
                    })
            
            # Save batch summary
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            summary_file = output_path / f"batch_summary_{timestamp}.json"
            
            with open(summary_file, 'w') as f:
                json.dump({
                    "timestamp": timestamp,
                    "total_files": len(pdf_files),
                    "successful": len([r for r in results if r["status"] == "success"]),
                    "failed": len([r for r in results if r["status"] == "failed"]),
                    "results": results
                }, f, indent=2, default=str)
            
            logger.info(f"Batch processing completed. Summary saved to: {summary_file}")
            return results
            
        except Exception as e:
            logger.error(f"Error in batch processing: {e}")
            raise
    
    async def extract_tables_only(
        self, 
        pdf_path: str,
        output_dir: str = "./table_output"
    ) -> Dict[str, Any]:
        """
        Extract only tables from a PDF document
        
        Args:
            pdf_path: Path to the PDF document
            output_dir: Directory to save results
        
        Returns:
            Table extraction results
        """
        try:
            # Read and encode PDF file
            with open(pdf_path, 'rb') as f:
                pdf_content = f.read()
                pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
            
            logger.info(f"Extracting tables from: {pdf_path}")
            
            # Start table-only workflow
            workflow = await self.mcp_tools.start_document_extraction_workflow(
                pdf_file=pdf_base64,
                workflow_type="table_only"
            )
            
            # Wait for completion
            result = await self.mcp_tools.wait_for_workflow_completion(
                workflow["workflow_id"]
            )
            
            # Save results
            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            result_file = output_path / f"table_extraction_{timestamp}.json"
            
            with open(result_file, 'w') as f:
                json.dump(result, f, indent=2, default=str)
            
            logger.info(f"Table extraction results saved to: {result_file}")
            return result
            
        except Exception as e:
            logger.error(f"Error extracting tables: {e}")
            raise
    
    async def extract_images_only(
        self, 
        pdf_path: str,
        output_dir: str = "./image_output"
    ) -> Dict[str, Any]:
        """
        Extract only images and curves from a PDF document
        
        Args:
            pdf_path: Path to the PDF document
            output_dir: Directory to save results
        
        Returns:
            Image extraction results
        """
        try:
            # Read and encode PDF file
            with open(pdf_path, 'rb') as f:
                pdf_content = f.read()
                pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
            
            logger.info(f"Extracting images from: {pdf_path}")
            
            # Start image-only workflow
            workflow = await self.mcp_tools.start_document_extraction_workflow(
                pdf_file=pdf_base64,
                workflow_type="image_only"
            )
            
            # Wait for completion
            result = await self.mcp_tools.wait_for_workflow_completion(
                workflow["workflow_id"]
            )
            
            # Save results
            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            result_file = output_path / f"image_extraction_{timestamp}.json"
            
            with open(result_file, 'w') as f:
                json.dump(result, f, indent=2, default=str)
            
            logger.info(f"Image extraction results saved to: {result_file}")
            return result
            
        except Exception as e:
            logger.error(f"Error extracting images: {e}")
            raise
    
    async def monitor_workflow_progress(
        self, 
        workflow_id: str,
        interval: int = 5
    ):
        """
        Monitor workflow progress in real-time
        
        Args:
            workflow_id: The workflow ID to monitor
            interval: Polling interval in seconds
        """
        try:
            logger.info(f"Monitoring workflow: {workflow_id}")
            
            while True:
                # Get current status
                status = await self.mcp_tools.get_workflow_status(workflow_id)
                
                print(f"\nWorkflow Status: {status['status']}")
                print(f"Message: {status['message']}")
                print(f"Updated: {status['updated_at']}")
                
                if status['status'] in ['completed', 'failed']:
                    if status['status'] == 'completed':
                        print("✅ Workflow completed successfully!")
                    else:
                        print("❌ Workflow failed!")
                    break
                
                # Wait before next check
                await asyncio.sleep(interval)
                
        except Exception as e:
            logger.error(f"Error monitoring workflow: {e}")
            raise

# Example usage functions
async def example_semiconductor_processing():
    """Example of processing a semiconductor datasheet"""
    mcp_tools = MCPTools()
    automation = WorkflowAutomation(mcp_tools)
    
    try:
        # Check services health first
        health = await mcp_tools.check_services_health()
        print(f"Services health: {health}")
        
        # Process a datasheet
        result = await automation.process_semiconductor_datasheet(
            "path/to/datasheet.pdf"
        )
        
        print(f"Processing completed: {result}")
        
    except Exception as e:
        print(f"Error: {e}")

async def example_batch_processing():
    """Example of batch processing multiple documents"""
    mcp_tools = MCPTools()
    automation = WorkflowAutomation(mcp_tools)
    
    try:
        results = await automation.batch_process_documents(
            "path/to/pdf/directory"
        )
        
        print(f"Batch processing completed. Processed {len(results)} files.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Run example
    asyncio.run(example_semiconductor_processing()) 