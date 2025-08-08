"""
Ollama Integration for AI Agent
Provides natural language processing and decision making capabilities
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
import httpx
from datetime import datetime
from mcp_tools import MCPTools

logger = logging.getLogger(__name__)

class OllamaIntegration:
    """Integration with Ollama for AI-powered document processing"""
    
    def __init__(self, ollama_url: str = "http://localhost:11434", mcp_tools: Optional[MCPTools] = None):
        self.ollama_url = ollama_url
        self.mcp_tools = mcp_tools or MCPTools()
        self.http_client = httpx.AsyncClient(timeout=60.0)
    
    async def check_ollama_health(self) -> bool:
        """Check if Ollama is running and healthy"""
        try:
            response = await self.http_client.get(f"{self.ollama_url}/api/tags")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Ollama health check failed: {e}")
            return False
    
    async def list_available_models(self) -> List[Dict[str, Any]]:
        """List available Ollama models"""
        try:
            response = await self.http_client.get(f"{self.ollama_url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                return data.get("models", [])
            else:
                raise Exception(f"Failed to get models: {response.text}")
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            raise
    
    async def generate_response(
        self, 
        model: str, 
        prompt: str, 
        system_prompt: Optional[str] = None,
        temperature: float = 0.7
    ) -> str:
        """
        Generate a response using Ollama
        
        Args:
            model: Ollama model name
            prompt: User prompt
            system_prompt: System prompt for context
            temperature: Response temperature (0.0 to 1.0)
        
        Returns:
            Generated response
        """
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature
                }
            }
            
            if system_prompt:
                payload["system"] = system_prompt
            
            response = await self.http_client.post(
                f"{self.ollama_url}/api/generate",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "")
            else:
                raise Exception(f"Failed to generate response: {response.text}")
                
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            raise
    
    async def analyze_document_intent(self, document_description: str) -> Dict[str, Any]:
        """
        Analyze document to determine processing intent
        
        Args:
            document_description: Description of the document
        
        Returns:
            Analysis results with recommended workflow
        """
        system_prompt = """You are an expert document analysis AI. Analyze the given document description and determine the best processing workflow.

Available workflows:
1. full_extraction - Extract text, tables, images, and generate SPICE models
2. table_only - Extract only tables and parameters
3. image_only - Extract only images and curves

Respond with a JSON object containing:
{
    "workflow_type": "full_extraction|table_only|image_only",
    "confidence": 0.0-1.0,
    "reasoning": "explanation of choice",
    "expected_outputs": ["list", "of", "expected", "outputs"],
    "special_requirements": ["any", "special", "requirements"]
}"""

        prompt = f"""Analyze this document description and recommend the best processing workflow:

Document: {document_description}

Provide your analysis as JSON:"""

        try:
            response = await self.generate_response(
                model="llama2",
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3
            )
            
            # Extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start != -1 and json_end != -1:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
            else:
                # Fallback analysis
                return {
                    "workflow_type": "full_extraction",
                    "confidence": 0.5,
                    "reasoning": "Could not parse AI response, using default workflow",
                    "expected_outputs": ["text", "tables", "images", "spice_model"],
                    "special_requirements": []
                }
                
        except Exception as e:
            logger.error(f"Error analyzing document intent: {e}")
            return {
                "workflow_type": "full_extraction",
                "confidence": 0.0,
                "reasoning": f"Error in analysis: {str(e)}",
                "expected_outputs": ["text", "tables", "images", "spice_model"],
                "special_requirements": []
            }
    
    async def extract_processing_parameters(self, document_text: str) -> Dict[str, Any]:
        """
        Extract processing parameters from document text
        
        Args:
            document_text: Extracted text from document
        
        Returns:
            Extracted parameters
        """
        system_prompt = """You are an expert semiconductor parameter extraction AI. Extract key parameters from the given text.

Look for:
- Device parameters (Vds, Vgs, Id, etc.)
- Temperature specifications
- Operating conditions
- Model parameters
- Test conditions

Respond with a JSON object containing:
{
    "device_type": "device type if identified",
    "parameters": {
        "parameter_name": "value"
    },
    "operating_conditions": {
        "condition": "value"
    },
    "model_type": "suggested model type",
    "confidence": 0.0-1.0
}"""

        prompt = f"""Extract semiconductor parameters from this text:

{document_text}

Provide extracted parameters as JSON:"""

        try:
            response = await self.generate_response(
                model="llama2",
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.2
            )
            
            # Extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start != -1 and json_end != -1:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
            else:
                return {
                    "device_type": "unknown",
                    "parameters": {},
                    "operating_conditions": {},
                    "model_type": "generic",
                    "confidence": 0.0
                }
                
        except Exception as e:
            logger.error(f"Error extracting parameters: {e}")
            return {
                "device_type": "unknown",
                "parameters": {},
                "operating_conditions": {},
                "model_type": "generic",
                "confidence": 0.0
            }
    
    async def validate_extraction_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate extraction results using AI
        
        Args:
            results: Extraction results to validate
        
        Returns:
            Validation results
        """
        system_prompt = """You are an expert validation AI for semiconductor data extraction. Validate the given extraction results.

Check for:
- Completeness of extracted data
- Consistency of parameters
- Reasonable value ranges
- Missing critical information
- Data quality issues

Respond with a JSON object containing:
{
    "is_valid": true/false,
    "confidence": 0.0-1.0,
    "issues": ["list", "of", "issues"],
    "suggestions": ["list", "of", "improvements"],
    "quality_score": 0.0-1.0
}"""

        prompt = f"""Validate these extraction results:

{json.dumps(results, indent=2)}

Provide validation as JSON:"""

        try:
            response = await self.generate_response(
                model="llama2",
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3
            )
            
            # Extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start != -1 and json_end != -1:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
            else:
                return {
                    "is_valid": True,
                    "confidence": 0.5,
                    "issues": ["Could not parse validation response"],
                    "suggestions": ["Manual review recommended"],
                    "quality_score": 0.5
                }
                
        except Exception as e:
            logger.error(f"Error validating results: {e}")
            return {
                "is_valid": True,
                "confidence": 0.0,
                "issues": [f"Validation error: {str(e)}"],
                "suggestions": ["Manual review required"],
                "quality_score": 0.0
            }
    
    async def generate_spice_model_suggestions(self, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate SPICE model suggestions based on extracted data
        
        Args:
            extracted_data: Data extracted from document
        
        Returns:
            SPICE model suggestions
        """
        system_prompt = """You are an expert SPICE model generation AI. Based on the extracted data, suggest appropriate SPICE models and parameters.

Consider:
- Device type and characteristics
- Available parameters
- Model complexity requirements
- Accuracy vs. performance trade-offs

Respond with a JSON object containing:
{
    "suggested_models": [
        {
            "model_name": "model name",
            "model_type": "BSIM4|PSP|EKV|etc",
            "confidence": 0.0-1.0,
            "reasoning": "why this model",
            "parameters": {
                "param": "value"
            }
        }
    ],
    "recommended_model": "best model name",
    "parameter_estimation": {
        "method": "estimation method",
        "confidence": 0.0-1.0
    }
}"""

        prompt = f"""Generate SPICE model suggestions for this extracted data:

{json.dumps(extracted_data, indent=2)}

Provide suggestions as JSON:"""

        try:
            response = await self.generate_response(
                model="llama2",
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.4
            )
            
            # Extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start != -1 and json_end != -1:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
            else:
                return {
                    "suggested_models": [],
                    "recommended_model": "generic",
                    "parameter_estimation": {
                        "method": "manual",
                        "confidence": 0.0
                    }
                }
                
        except Exception as e:
            logger.error(f"Error generating SPICE suggestions: {e}")
            return {
                "suggested_models": [],
                "recommended_model": "generic",
                "parameter_estimation": {
                    "method": "manual",
                    "confidence": 0.0
                }
            }
    
    async def intelligent_document_processing(
        self, 
        pdf_path: str,
        document_description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Intelligent document processing with AI-driven decisions
        
        Args:
            pdf_path: Path to PDF document
            document_description: Optional description of the document
        
        Returns:
            Complete processing results with AI analysis
        """
        try:
            logger.info(f"Starting intelligent processing of: {pdf_path}")
            
            # Step 1: Analyze document intent
            if document_description:
                intent_analysis = await self.analyze_document_intent(document_description)
                workflow_type = intent_analysis["workflow_type"]
                logger.info(f"AI recommended workflow: {workflow_type}")
            else:
                workflow_type = "full_extraction"
                intent_analysis = {
                    "workflow_type": workflow_type,
                    "confidence": 0.5,
                    "reasoning": "No description provided, using default workflow",
                    "expected_outputs": ["text", "tables", "images", "spice_model"],
                    "special_requirements": []
                }
            
            # Step 2: Execute workflow
            workflow = await self.mcp_tools.start_document_extraction_workflow(
                pdf_file=pdf_path,  # This should be base64 encoded in real implementation
                workflow_type=workflow_type
            )
            
            # Step 3: Wait for completion
            result = await self.mcp_tools.wait_for_workflow_completion(
                workflow["workflow_id"]
            )
            
            if result["status"] != "completed":
                raise Exception(f"Workflow failed: {result['message']}")
            
            # Step 4: AI analysis of results
            extracted_data = result["results"]
            
            # Extract parameters from text if available
            if extracted_data.get("text"):
                parameter_analysis = await self.extract_processing_parameters(
                    extracted_data["text"]
                )
            else:
                parameter_analysis = {
                    "device_type": "unknown",
                    "parameters": {},
                    "operating_conditions": {},
                    "model_type": "generic",
                    "confidence": 0.0
                }
            
            # Validate results
            validation = await self.validate_extraction_results(extracted_data)
            
            # Generate SPICE suggestions
            spice_suggestions = await self.generate_spice_model_suggestions(extracted_data)
            
            # Compile final results
            final_results = {
                "workflow_id": workflow["workflow_id"],
                "intent_analysis": intent_analysis,
                "extraction_results": extracted_data,
                "parameter_analysis": parameter_analysis,
                "validation": validation,
                "spice_suggestions": spice_suggestions,
                "processing_timestamp": datetime.now().isoformat(),
                "ai_confidence": {
                    "intent_analysis": intent_analysis.get("confidence", 0.0),
                    "parameter_extraction": parameter_analysis.get("confidence", 0.0),
                    "validation": validation.get("confidence", 0.0),
                    "overall": (intent_analysis.get("confidence", 0.0) + 
                               parameter_analysis.get("confidence", 0.0) + 
                               validation.get("confidence", 0.0)) / 3
                }
            }
            
            logger.info(f"Intelligent processing completed for: {pdf_path}")
            return final_results
            
        except Exception as e:
            logger.error(f"Error in intelligent processing: {e}")
            raise

# Example usage
async def example_intelligent_processing():
    """Example of intelligent document processing"""
    ollama = OllamaIntegration()
    
    try:
        # Check Ollama health
        if not await ollama.check_ollama_health():
            print("❌ Ollama is not running. Please start Ollama first.")
            return
        
        # List available models
        models = await ollama.list_available_models()
        print(f"Available models: {[m['name'] for m in models]}")
        
        # Process document intelligently
        result = await ollama.intelligent_document_processing(
            "path/to/datasheet.pdf",
            "Semiconductor datasheet for power MOSFET device"
        )
        
        print(f"Intelligent processing completed: {result}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(example_intelligent_processing()) 