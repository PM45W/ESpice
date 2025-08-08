import requests
import json
import io

def test_mcp_pdf_processing():
    base_url = "http://localhost:8000"
    
    print("🧪 Testing MCP PDF Processing...")
    
    # Create a mock PDF file (just for testing)
    mock_pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n297\n%%EOF"
    
    # Test PDF processing endpoint
    try:
        files = {'file': ('test.pdf', io.BytesIO(mock_pdf_content), 'application/pdf')}
        response = requests.post(f"{base_url}/api/process-pdf", files=files)
        print(f"✅ PDF Processing: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"📄 Extracted Parameters: {data['data']['parameters']}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ PDF Processing failed: {e}")
        return
    
    return data['data'] if response.status_code == 200 else None

def test_available_models():
    base_url = "http://localhost:8000"
    
    print("\n🔧 Testing Available Models...")
    
    try:
        response = requests.get(f"{base_url}/api/models")
        print(f"✅ Models API: {response.status_code}")
        if response.status_code == 200:
            models = response.json()
            print(f"📋 Available Models:")
            for model in models['models']:
                print(f"   - {model['name']} ({model['id']}): {model['description']}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Models API failed: {e}")

def test_parameter_fitting(extracted_data):
    base_url = "http://localhost:8000"
    
    print("\n⚙️ Testing Parameter Fitting...")
    
    # Test parameter fitting for ASM-HEMT
    try:
        fit_data = {
            "extracted_data": extracted_data,
            "model_type": "asm_hemt"
        }
        response = requests.post(f"{base_url}/api/fit-parameters", json=fit_data)
        print(f"✅ ASM-HEMT Parameter Fitting: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"📊 Fitted Parameters: {json.dumps(result['fitted_parameters'], indent=2)}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Parameter Fitting failed: {e}")

def test_spice_generation(extracted_data):
    base_url = "http://localhost:8000"
    
    print("\n🔌 Testing SPICE Model Generation...")
    
    # Test different model types
    model_types = ["asm_hemt", "mvsg", "si_mosfet"]
    
    for model_type in model_types:
        try:
            spice_data = {
                "device_name": f"test_device_{model_type}",
                "device_type": "GaN-HEMT" if model_type == "asm_hemt" else "SiC-MOSFET" if model_type == "mvsg" else "Si-MOSFET",
                "model_type": model_type,
                "extracted_data": extracted_data
            }
            response = requests.post(f"{base_url}/api/generate-spice", json=spice_data)
            print(f"✅ {model_type.upper()} SPICE Generation: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"📄 Model Type: {result['model_info']['name']}")
                print(f"📄 Device: {result['device_name']}")
                print(f"📄 Parameters: {len(result['parameters'])} parameters fitted")
                print(f"📄 Model Length: {len(result['model'])} characters")
                # Show first few lines of the SPICE model
                lines = result['model'].split('\n')[:5]
                print(f"📄 Model Preview:")
                for line in lines:
                    if line.strip():
                        print(f"   {line}")
            else:
                print(f"❌ Error: {response.text}")
        except Exception as e:
            print(f"❌ {model_type} SPICE Generation failed: {e}")

def test_custom_parameters():
    base_url = "http://localhost:8000"
    
    print("\n🎛️ Testing Custom Parameter Override...")
    
    try:
        custom_params = {
            "v_th": 3.0,
            "r_ds_on": 0.05,
            "kp": 20.0
        }
        
        spice_data = {
            "device_name": "custom_device",
            "device_type": "GaN-HEMT",
            "model_type": "asm_hemt",
            "parameters": custom_params
        }
        response = requests.post(f"{base_url}/api/generate-spice", json=spice_data)
        print(f"✅ Custom Parameters SPICE Generation: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"📄 Custom Parameters Applied: {list(custom_params.keys())}")
            print(f"📄 Final Parameters: {len(result['parameters'])} total")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Custom Parameters failed: {e}")

def main():
    print("🚀 Starting Comprehensive MCP Server Testing...")
    
    # Test PDF processing and get extracted data
    extracted_data = test_mcp_pdf_processing()
    
    # Test available models
    test_available_models()
    
    # Test parameter fitting
    if extracted_data:
        test_parameter_fitting(extracted_data)
        
        # Test SPICE generation with different models
        test_spice_generation(extracted_data)
        
        # Test custom parameter override
        test_custom_parameters()
    
    print("\n🎉 Comprehensive MCP Integration Test Complete!")

if __name__ == "__main__":
    main() 