"""
MCP (Model Context Protocol) Tools for AI Agent Service
Provides tools for AI agents to interact with the microservices architecture
"""

import json
import asyncio
from typing import Dict, Any, List, Optional
import httpx
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class MCPTools:
    """MCP Tools for AI Agent orchestration"""
    
    def __init__(self, base_url: str = "http://localhost:8005"):
        self.base_url = base_url
        self.http_client = httpx.AsyncClient(timeout=60.0)
    
    async def start_document_extraction_workflow(
        self, 
        pdf_url: Optional[str] = None, 
        pdf_file: Optional[str] = None,
        workflow_type: str = "full_extraction"
    ) -> Dict[str, Any]:
        """
        Start a document extraction workflow
        
        Args:
            pdf_url: URL to the PDF document
            pdf_file: Base64 encoded PDF file content
            workflow_type: Type of workflow (full_extraction, table_only, image_only)
        
        Returns:
            Workflow response with ID and status
        """
        try:
            payload = {
                "workflow_type": workflow_type
            }
            
            if pdf_url:
                payload["pdf_url"] = pdf_url
            if pdf_file:
                payload["pdf_file"] = pdf_file
            
            response = await self.http_client.post(
                f"{self.base_url}/workflow/start",
                json=payload
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Failed to start workflow: {response.text}")
                
        except Exception as e:
            logger.error(f"Error starting workflow: {e}")
            raise
    
    async def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """
        Get the status of a workflow
        
        Args:
            workflow_id: The workflow ID to check
        
        Returns:
            Workflow status and results
        """
        try:
            response = await self.http_client.get(
                f"{self.base_url}/workflow/{workflow_id}"
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Failed to get workflow status: {response.text}")
                
        except Exception as e:
            logger.error(f"Error getting workflow status: {e}")
            raise
    
    async def get_workflow_steps(self, workflow_id: str) -> Dict[str, Any]:
        """
        Get detailed steps of a workflow
        
        Args:
            workflow_id: The workflow ID to check
        
        Returns:
            Detailed workflow steps
        """
        try:
            response = await self.http_client.get(
                f"{self.base_url}/workflow/{workflow_id}/steps"
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Failed to get workflow steps: {response.text}")
                
        except Exception as e:
            logger.error(f"Error getting workflow steps: {e}")
            raise
    
    async def list_workflows(self) -> Dict[str, Any]:
        """
        List all workflows
        
        Returns:
            List of all workflows
        """
        try:
            response = await self.http_client.get(f"{self.base_url}/workflows")
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Failed to list workflows: {response.text}")
                
        except Exception as e:
            logger.error(f"Error listing workflows: {e}")
            raise
    
    async def delete_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """
        Delete a workflow
        
        Args:
            workflow_id: The workflow ID to delete
        
        Returns:
            Deletion confirmation
        """
        try:
            response = await self.http_client.delete(
                f"{self.base_url}/workflow/{workflow_id}"
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Failed to delete workflow: {response.text}")
                
        except Exception as e:
            logger.error(f"Error deleting workflow: {e}")
            raise
    
    async def check_services_health(self) -> Dict[str, Any]:
        """
        Check health of all microservices
        
        Returns:
            Health status of all services
        """
        try:
            response = await self.http_client.get(
                f"{self.base_url}/services/health"
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Failed to check services health: {response.text}")
                
        except Exception as e:
            logger.error(f"Error checking services health: {e}")
            raise
    
    async def wait_for_workflow_completion(
        self, 
        workflow_id: str, 
        timeout: int = 300,
        poll_interval: int = 5
    ) -> Dict[str, Any]:
        """
        Wait for a workflow to complete
        
        Args:
            workflow_id: The workflow ID to monitor
            timeout: Maximum time to wait in seconds
            poll_interval: Time between status checks in seconds
        
        Returns:
            Final workflow status and results
        """
        start_time = datetime.now()
        
        while True:
            # Check if timeout exceeded
            elapsed = (datetime.now() - start_time).total_seconds()
            if elapsed > timeout:
                raise Exception(f"Workflow {workflow_id} timed out after {timeout} seconds")
            
            # Get current status
            status = await self.get_workflow_status(workflow_id)
            
            if status["status"] in ["completed", "failed"]:
                return status
            
            # Wait before next check
            await asyncio.sleep(poll_interval)
    
    async def execute_full_document_analysis(
        self, 
        pdf_url: Optional[str] = None, 
        pdf_file: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute a complete document analysis workflow and wait for completion
        
        Args:
            pdf_url: URL to the PDF document
            pdf_file: Base64 encoded PDF file content
        
        Returns:
            Complete analysis results
        """
        try:
            # Start workflow
            workflow_response = await self.start_document_extraction_workflow(
                pdf_url=pdf_url,
                pdf_file=pdf_file,
                workflow_type="full_extraction"
            )
            
            workflow_id = workflow_response["workflow_id"]
            logger.info(f"Started workflow {workflow_id}")
            
            # Wait for completion
            final_status = await self.wait_for_workflow_completion(workflow_id)
            
            if final_status["status"] == "completed":
                logger.info(f"Workflow {workflow_id} completed successfully")
                return final_status
            else:
                raise Exception(f"Workflow {workflow_id} failed: {final_status['message']}")
                
        except Exception as e:
            logger.error(f"Error in full document analysis: {e}")
            raise

# MCP Tool Schemas for AI Agent Integration
MCP_TOOL_SCHEMAS = {
    "start_document_extraction_workflow": {
        "name": "start_document_extraction_workflow",
        "description": "Start a document extraction workflow",
        "inputSchema": {
            "type": "object",
            "properties": {
                "pdf_url": {
                    "type": "string",
                    "description": "URL to the PDF document"
                },
                "pdf_file": {
                    "type": "string", 
                    "description": "Base64 encoded PDF file content"
                },
                "workflow_type": {
                    "type": "string",
                    "enum": ["full_extraction", "table_only", "image_only"],
                    "description": "Type of extraction workflow to run"
                }
            }
        }
    },
    "get_workflow_status": {
        "name": "get_workflow_status",
        "description": "Get the status of a workflow",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workflow_id": {
                    "type": "string",
                    "description": "The workflow ID to check"
                }
            },
            "required": ["workflow_id"]
        }
    },
    "get_workflow_steps": {
        "name": "get_workflow_steps", 
        "description": "Get detailed steps of a workflow",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workflow_id": {
                    "type": "string",
                    "description": "The workflow ID to check"
                }
            },
            "required": ["workflow_id"]
        }
    },
    "list_workflows": {
        "name": "list_workflows",
        "description": "List all workflows",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    "delete_workflow": {
        "name": "delete_workflow",
        "description": "Delete a workflow",
        "inputSchema": {
            "type": "object", 
            "properties": {
                "workflow_id": {
                    "type": "string",
                    "description": "The workflow ID to delete"
                }
            },
            "required": ["workflow_id"]
        }
    },
    "check_services_health": {
        "name": "check_services_health",
        "description": "Check health of all microservices",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    "execute_full_document_analysis": {
        "name": "execute_full_document_analysis",
        "description": "Execute a complete document analysis workflow and wait for completion",
        "inputSchema": {
            "type": "object",
            "properties": {
                "pdf_url": {
                    "type": "string",
                    "description": "URL to the PDF document"
                },
                "pdf_file": {
                    "type": "string",
                    "description": "Base64 encoded PDF file content"
                }
            }
        }
    }
}

# Example usage
async def example_usage():
    """Example of how to use the MCP tools"""
    mcp_tools = MCPTools()
    
    try:
        # Check services health
        health = await mcp_tools.check_services_health()
        print(f"Services health: {health}")
        
        # Start a workflow
        workflow = await mcp_tools.start_document_extraction_workflow(
            pdf_url="https://example.com/document.pdf",
            workflow_type="full_extraction"
        )
        print(f"Started workflow: {workflow}")
        
        # Wait for completion
        result = await mcp_tools.wait_for_workflow_completion(workflow["workflow_id"])
        print(f"Workflow completed: {result}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(example_usage()) 