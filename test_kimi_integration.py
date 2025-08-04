#!/usr/bin/env python3
"""
Test script for Kimi K2 integration with ESpice MCP Server
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_kimi_integration():
    """Test Kimi K2 integration with MCP server"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Kimi K2 Integration with ESpice MCP Server")
    print("=" * 60)
    
    # Test 1: Health check
    print("\n1️⃣ Testing MCP server health...")
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            print("✅ MCP server is healthy")
            health_data = response.json()
            print(f"   Services: {list(health_data.get('services', {}).keys())}")
        else:
            print(f"❌ MCP server health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to MCP server: {e}")
        return False
    
    # Test 2: Check if Kimi K2 service is available
    print("\n2️⃣ Testing Kimi K2 service availability...")
    try:
        response = requests.post(f"{base_url}/api/analyze-with-kimi", 
                               json={"text_content": "test"}, 
                               timeout=10)
        if response.status_code == 503:
            print("⚠️ Kimi K2 service not available (expected if no API key)")
            print("   This is normal if KIMI_K2_API_KEY is not set")
        elif response.status_code == 200:
            print("✅ Kimi K2 service is available")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
    except Exception as e:
        print(f"❌ Kimi K2 service test failed: {e}")
    
    # Test 3: Kimi K2 analysis (if available)
    print("\n3️⃣ Testing Kimi K2 analysis...")
    test_text = """
    Device: GaN HEMT Power Transistor
    Manufacturer: Example Corp
    Part Number: EGN100K65
    
    Electrical Characteristics:
    V_DS: 650V (Drain-Source Voltage)
    I_D: 15A (Drain Current)
    R_DS(on): 0.1Ω (On-Resistance)
    V_TH: 2.5V (Threshold Voltage)
    
    Capacitance:
    C_iss: 1800pF (Input Capacitance)
    C_oss: 150pF (Output Capacitance)
    C_rss: 25pF (Reverse Transfer Capacitance)
    
    Package: TO-247
    """
    
    try:
        response = requests.post(f"{base_url}/api/analyze-with-kimi", 
                               json={"text_content": test_text}, 
                               timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Kimi K2 analysis successful")
            if result.get('success'):
                analysis = result.get('analysis', {})
                print(f"   Device type: {analysis.get('device_type', 'Unknown')}")
                print(f"   Confidence: {analysis.get('confidence', 'Unknown')}")
                if 'parameters' in analysis:
                    params = analysis['parameters']
                    print(f"   Electrical params: {len(params.get('electrical', {}))}")
                    print(f"   Capacitance params: {len(params.get('capacitance', {}))}")
            else:
                print(f"   Analysis failed: {result.get('error', 'Unknown error')}")
        elif response.status_code == 503:
            print("⚠️ Kimi K2 service not available (no API key)")
        else:
            print(f"❌ Analysis failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Analysis test failed: {e}")
    
    # Test 4: Parameter extraction
    print("\n4️⃣ Testing Kimi K2 parameter extraction...")
    try:
        response = requests.post(f"{base_url}/api/extract-parameters-kimi", 
                               json={"datasheet_text": test_text}, 
                               timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Parameter extraction successful")
            if result.get('success'):
                params = result.get('parameters', {})
                print(f"   Device type: {params.get('device_type', 'Unknown')}")
                print(f"   Confidence: {params.get('confidence', 'Unknown')}")
                if 'parameters' in params:
                    device_params = params['parameters']
                    print(f"   Electrical: {list(device_params.get('electrical', {}).keys())}")
                    print(f"   Capacitance: {list(device_params.get('capacitance', {}).keys())}")
            else:
                print(f"   Extraction failed: {result.get('error', 'Unknown error')}")
        elif response.status_code == 503:
            print("⚠️ Kimi K2 service not available (no API key)")
        else:
            print(f"❌ Parameter extraction failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Parameter extraction test failed: {e}")
    
    # Test 5: SPICE generation
    print("\n5️⃣ Testing Kimi K2 SPICE generation...")
    test_params = {
        "electrical": {
            "vth": 2.5,
            "rds_on": "0.1",
            "id_max": "15"
        },
        "capacitance": {
            "cgs": "1800p",
            "cgd": "25p",
            "cds": "150p"
        },
        "thermal": {
            "rth": "5K/W"
        }
    }
    
    try:
        response = requests.post(f"{base_url}/api/generate-spice-kimi", 
                               json={
                                   "device_type": "GaN-HEMT",
                                   "parameters": test_params,
                                   "model_type": "asm_hemt"
                               }, 
                               timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ SPICE generation successful")
            if result.get('success'):
                spice_model = result.get('spice_model', '')
                print(f"   Model type: {result.get('model_type', 'Unknown')}")
                print(f"   Device type: {result.get('device_type', 'Unknown')}")
                print(f"   SPICE model length: {len(spice_model)} characters")
                if '.SUBCKT' in spice_model:
                    print("   ✅ SPICE model contains .SUBCKT")
                if '.ENDS' in spice_model:
                    print("   ✅ SPICE model contains .ENDS")
            else:
                print(f"   Generation failed: {result.get('error', 'Unknown error')}")
        elif response.status_code == 503:
            print("⚠️ Kimi K2 service not available (no API key)")
        else:
            print(f"❌ SPICE generation failed: {response.status_code}")
    except Exception as e:
        print(f"❌ SPICE generation test failed: {e}")
    
    # Test 6: Available models
    print("\n6️⃣ Testing available models...")
    try:
        response = requests.get(f"{base_url}/api/models", timeout=10)
        if response.status_code == 200:
            result = response.json()
            models = result.get('models', [])
            print(f"✅ Found {len(models)} available models:")
            for model in models:
                print(f"   - {model['name']}: {model['description']}")
        else:
            print(f"❌ Failed to get models: {response.status_code}")
    except Exception as e:
        print(f"❌ Model test failed: {e}")
    
    print("\n" + "=" * 60)
    print("🎯 Kimi K2 Integration Test Summary")
    print("=" * 60)
    
    # Check environment variables
    api_key = os.getenv('KIMI_K2_API_KEY')
    if api_key:
        print("✅ KIMI_K2_API_KEY is set")
        print(f"   Key length: {len(api_key)} characters")
    else:
        print("⚠️ KIMI_K2_API_KEY is not set")
        print("   Set it to enable Kimi K2 functionality:")
        print("   export KIMI_K2_API_KEY='your_api_key_here'")
    
    base_url_env = os.getenv('KIMI_K2_BASE_URL', 'https://api.kimi.com')
    print(f"✅ KIMI_K2_BASE_URL: {base_url_env}")
    
    model_env = os.getenv('KIMI_K2_MODEL', 'kimi-k2')
    print(f"✅ KIMI_K2_MODEL: {model_env}")
    
    print("\n📋 Next Steps:")
    print("1. Set KIMI_K2_API_KEY environment variable")
    print("2. Restart the MCP server")
    print("3. Run this test again to verify full functionality")
    print("4. Test with real datasheets in the desktop app")
    
    return True

def test_with_api_key():
    """Test with actual API key if available"""
    api_key = os.getenv('KIMI_K2_API_KEY')
    if not api_key:
        print("❌ No API key available for testing")
        return False
    
    print("🔑 Testing with actual Kimi K2 API key...")
    return test_kimi_integration()

if __name__ == "__main__":
    print("🚀 Starting Kimi K2 Integration Tests")
    print("Make sure the MCP server is running on http://localhost:8000")
    print()
    
    # Run basic tests
    test_kimi_integration()
    
    # Optionally run with API key
    if os.getenv('KIMI_K2_API_KEY'):
        print("\n" + "=" * 60)
        test_with_api_key() 