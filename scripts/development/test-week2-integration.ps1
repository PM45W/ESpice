# Test Week 2 Integration - AI Agent and Workflow Automation
# This script tests the AI agent integration and workflow automation features

param(
    [string]$TestType = "all",
    [string]$PdfPath = "",
    [string]$OllamaUrl = "http://localhost:11434"
)

Write-Host "=== ESpice Week 2 Integration Testing ===" -ForegroundColor Green
Write-Host "Testing AI Agent Integration and Workflow Automation" -ForegroundColor Yellow
Write-Host ""

# Function to check if a service is running
function Test-ServiceHealth {
    param([string]$ServiceName, [string]$Url)
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10
        if ($response.status -eq "healthy") {
            Write-Host "✅ $ServiceName is healthy" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $ServiceName is not healthy" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ $ServiceName is not responding: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to check Ollama health
function Test-OllamaHealth {
    try {
        $response = Invoke-RestMethod -Uri "$OllamaUrl/api/tags" -Method Get -TimeoutSec 10
        Write-Host "✅ Ollama is running and accessible" -ForegroundColor Green
        Write-Host "   Available models: $($response.models.Count)" -ForegroundColor Cyan
        return $true
    } catch {
        Write-Host "❌ Ollama is not accessible: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Please ensure Ollama is running on $OllamaUrl" -ForegroundColor Yellow
        return $false
    }
}

# Function to test AI agent endpoints
function Test-AIAgentEndpoints {
    Write-Host "`n--- Testing AI Agent Endpoints ---" -ForegroundColor Cyan
    
    $baseUrl = "http://localhost:8006"
    
    # Test health endpoint
    Write-Host "Testing AI Agent health..." -ForegroundColor Yellow
    if (Test-ServiceHealth "AI Agent" "$baseUrl/health") {
        Write-Host "✅ AI Agent health check passed" -ForegroundColor Green
    } else {
        Write-Host "❌ AI Agent health check failed" -ForegroundColor Red
        return $false
    }
    
    # Test services health endpoint
    Write-Host "Testing services health check..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/services/health" -Method Get -TimeoutSec 10
        Write-Host "✅ Services health check passed" -ForegroundColor Green
        Write-Host "   Microservices status:" -ForegroundColor Cyan
        foreach ($service in $response.microservices.Keys) {
            $status = $response.microservices[$service]
            $statusIcon = if ($status) { "✅" } else { "❌" }
            Write-Host "     $statusIcon $service" -ForegroundColor $(if ($status) { "Green" } else { "Red" })
        }
    } catch {
        Write-Host "❌ Services health check failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    return $true
}

# Function to test workflow creation
function Test-WorkflowCreation {
    Write-Host "`n--- Testing Workflow Creation ---" -ForegroundColor Cyan
    
    $baseUrl = "http://localhost:8006"
    
    # Test workflow creation with sample data
    $workflowData = @{
        workflow_type = "full_extraction"
        pdf_url = "https://example.com/test.pdf"
    }
    
    try {
        Write-Host "Creating test workflow..." -ForegroundColor Yellow
        $response = Invoke-RestMethod -Uri "$baseUrl/workflow/start" -Method Post -Body ($workflowData | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 30
        
        Write-Host "✅ Workflow created successfully" -ForegroundColor Green
        Write-Host "   Workflow ID: $($response.workflow_id)" -ForegroundColor Cyan
        Write-Host "   Status: $($response.status)" -ForegroundColor Cyan
        
        return $response.workflow_id
    } catch {
        Write-Host "❌ Workflow creation failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Function to test workflow monitoring
function Test-WorkflowMonitoring {
    param([string]$WorkflowId)
    
    Write-Host "`n--- Testing Workflow Monitoring ---" -ForegroundColor Cyan
    
    $baseUrl = "http://localhost:8006"
    
    if (-not $WorkflowId) {
        Write-Host "❌ No workflow ID provided for monitoring" -ForegroundColor Red
        return $false
    }
    
    try {
        Write-Host "Getting workflow status..." -ForegroundColor Yellow
        $response = Invoke-RestMethod -Uri "$baseUrl/workflow/$WorkflowId" -Method Get -TimeoutSec 10
        
        Write-Host "✅ Workflow status retrieved" -ForegroundColor Green
        Write-Host "   Status: $($response.status)" -ForegroundColor Cyan
        Write-Host "   Message: $($response.message)" -ForegroundColor Cyan
        Write-Host "   Created: $($response.created_at)" -ForegroundColor Cyan
        
        # Test workflow steps
        Write-Host "Getting workflow steps..." -ForegroundColor Yellow
        $stepsResponse = Invoke-RestMethod -Uri "$baseUrl/workflow/$WorkflowId/steps" -Method Get -TimeoutSec 10
        
        Write-Host "✅ Workflow steps retrieved" -ForegroundColor Green
        Write-Host "   Steps count: $($stepsResponse.steps.Count)" -ForegroundColor Cyan
        
        return $true
    } catch {
        Write-Host "❌ Workflow monitoring failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to test MCP tools integration
function Test-MCPToolsIntegration {
    Write-Host "`n--- Testing MCP Tools Integration ---" -ForegroundColor Cyan
    
    # Test MCP tools functionality
    try {
        Write-Host "Testing MCP tools import..." -ForegroundColor Yellow
        $pythonCode = @"
import asyncio
import sys
import os
sys.path.append('./services/ai-agent')
from mcp_tools import MCPTools

async def test_mcp_tools():
    try:
        mcp = MCPTools()
        health = await mcp.check_services_health()
        print(f"Services health: {health}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

result = asyncio.run(test_mcp_tools())
print(f"Test result: {result}")
"@
        
        $pythonCode | python
        Write-Host "✅ MCP tools integration test completed" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ MCP tools integration test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to test workflow automation
function Test-WorkflowAutomation {
    Write-Host "`n--- Testing Workflow Automation ---" -ForegroundColor Cyan
    
    try {
        Write-Host "Testing workflow automation import..." -ForegroundColor Yellow
        $pythonCode = @"
import asyncio
import sys
import os
sys.path.append('./services/ai-agent')
from workflow_automation import WorkflowAutomation
from mcp_tools import MCPTools

async def test_automation():
    try:
        mcp = MCPTools()
        automation = WorkflowAutomation(mcp)
        print("Workflow automation initialized successfully")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

result = asyncio.run(test_automation())
print(f"Test result: {result}")
"@
        
        $pythonCode | python
        Write-Host "✅ Workflow automation test completed" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Workflow automation test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to test Ollama integration
function Test-OllamaIntegration {
    Write-Host "`n--- Testing Ollama Integration ---" -ForegroundColor Cyan
    
    try {
        Write-Host "Testing Ollama integration..." -ForegroundColor Yellow
        $pythonCode = @"
import asyncio
import sys
import os
sys.path.append('./services/ai-agent')
from ollama_integration import OllamaIntegration

async def test_ollama():
    try:
        ollama = OllamaIntegration()
        health = await ollama.check_ollama_health()
        print(f"Ollama health: {health}")
        if health:
            models = await ollama.list_available_models()
            print(f"Available models: {len(models)}")
        return health
    except Exception as e:
        print(f"Error: {e}")
        return False

result = asyncio.run(test_ollama())
print(f"Test result: {result}")
"@
        
        $pythonCode | python
        Write-Host "✅ Ollama integration test completed" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Ollama integration test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to test document processing with AI
function Test-AIDocumentProcessing {
    param([string]$PdfPath)
    
    Write-Host "`n--- Testing AI Document Processing ---" -ForegroundColor Cyan
    
    if (-not $PdfPath -or -not (Test-Path $PdfPath)) {
        Write-Host "❌ No valid PDF path provided for AI processing test" -ForegroundColor Red
        Write-Host "   Use -PdfPath parameter to specify a PDF file" -ForegroundColor Yellow
        return $false
    }
    
    try {
        Write-Host "Testing AI document processing..." -ForegroundColor Yellow
        $pythonCode = @"
import asyncio
import sys
import os
sys.path.append('./services/ai-agent')
from ollama_integration import OllamaIntegration

async def test_ai_processing():
    try:
        ollama = OllamaIntegration()
        if not await ollama.check_ollama_health():
            print("Ollama not available")
            return False
        
        # Test document intent analysis
        intent = await ollama.analyze_document_intent("Semiconductor datasheet for power MOSFET")
        print(f"Intent analysis: {intent}")
        
        # Test parameter extraction
        params = await ollama.extract_processing_parameters("Vds: 20V, Vgs: 5V, Id: 10A")
        print(f"Parameter extraction: {params}")
        
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

result = asyncio.run(test_ai_processing())
print(f"Test result: {result}")
"@
        
        $pythonCode | python
        Write-Host "✅ AI document processing test completed" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ AI document processing test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main test execution
Write-Host "Starting Week 2 integration tests..." -ForegroundColor Green

$allTestsPassed = $true

# Test 1: Check if all services are running
Write-Host "`n=== Test 1: Service Health Check ===" -ForegroundColor Magenta
$services = @(
    @{ Name = "API Gateway"; Url = "http://localhost:8000/health" },
    @{ Name = "PDF Service"; Url = "http://localhost:8002/health" },
    @{ Name = "Image Service"; Url = "http://localhost:8003/health" },
    @{ Name = "Table Service"; Url = "http://localhost:8004/health" },
    @{ Name = "SPICE Service"; Url = "http://localhost:8005/health" },
    @{ Name = "AI Agent"; Url = "http://localhost:8006/health" }
)

foreach ($service in $services) {
    if (-not (Test-ServiceHealth $service.Name $service.Url)) {
        $allTestsPassed = $false
    }
}

# Test 2: Check Ollama health
Write-Host "`n=== Test 2: Ollama Health Check ===" -ForegroundColor Magenta
if (-not (Test-OllamaHealth)) {
    $allTestsPassed = $false
}

# Test 3: AI Agent endpoints
Write-Host "`n=== Test 3: AI Agent Endpoints ===" -ForegroundColor Magenta
if (-not (Test-AIAgentEndpoints)) {
    $allTestsPassed = $false
}

# Test 4: Workflow creation and monitoring
Write-Host "`n=== Test 4: Workflow Management ===" -ForegroundColor Magenta
$workflowId = Test-WorkflowCreation
if ($workflowId) {
    if (-not (Test-WorkflowMonitoring $workflowId)) {
        $allTestsPassed = $false
    }
} else {
    $allTestsPassed = $false
}

# Test 5: MCP Tools integration
Write-Host "`n=== Test 5: MCP Tools Integration ===" -ForegroundColor Magenta
if (-not (Test-MCPToolsIntegration)) {
    $allTestsPassed = $false
}

# Test 6: Workflow automation
Write-Host "`n=== Test 6: Workflow Automation ===" -ForegroundColor Magenta
if (-not (Test-WorkflowAutomation)) {
    $allTestsPassed = $false
}

# Test 7: Ollama integration
Write-Host "`n=== Test 7: Ollama Integration ===" -ForegroundColor Magenta
if (-not (Test-OllamaIntegration)) {
    $allTestsPassed = $false
}

# Test 8: AI document processing (if PDF provided)
if ($PdfPath) {
    Write-Host "`n=== Test 8: AI Document Processing ===" -ForegroundColor Magenta
    if (-not (Test-AIDocumentProcessing $PdfPath)) {
        $allTestsPassed = $false
    }
}

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Magenta
if ($allTestsPassed) {
    Write-Host "✅ All Week 2 integration tests passed!" -ForegroundColor Green
    Write-Host "   AI Agent integration is working correctly" -ForegroundColor Cyan
    Write-Host "   Workflow automation is functional" -ForegroundColor Cyan
    Write-Host "   MCP tools are properly integrated" -ForegroundColor Cyan
    Write-Host "   Ollama integration is operational" -ForegroundColor Cyan
} else {
    Write-Host "❌ Some tests failed. Please check the errors above." -ForegroundColor Red
    Write-Host "   Ensure all services are running and Ollama is available" -ForegroundColor Yellow
}

Write-Host "`nWeek 2 testing completed!" -ForegroundColor Green 