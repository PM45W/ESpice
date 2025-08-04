#!/usr/bin/env python3
"""
Test Script for Test Data Correlation Service
Tests the complete workflow from test data upload to correlation results
"""

import requests
import json
import time
import csv
import io
from typing import Dict, Any, List

class TestCorrelationTester:
    def __init__(self, base_url: str = "http://localhost:8007"):
        self.base_url = base_url
        self.test_data_id = None
        self.correlation_id = None
        
    def check_service_health(self) -> bool:
        """Check if the test correlation service is running"""
        try:
            response = requests.get(f"{self.base_url}/health")
            if response.status_code == 200:
                print("✅ Test correlation service is healthy")
                return True
            else:
                print(f"❌ Service health check failed: {response.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            print("❌ Cannot connect to test correlation service")
            print("   Make sure the service is running on port 8007")
            return False
        except Exception as e:
            print(f"❌ Health check error: {e}")
            return False
    
    def create_test_csv_data(self) -> str:
        """Create sample CSV test data for I-V curve"""
        csv_data = io.StringIO()
        writer = csv.writer(csv_data)
        
        # Write header
        writer.writerow(['Vds (V)', 'Ids (A)', 'Vgs (V)', 'Temperature (°C)'])
        
        # Write I-V curve data points
        vds_values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        for vds in vds_values:
            # Simulate typical MOSFET I-V characteristics
            if vds < 2:
                ids = 0.1 * vds  # Linear region
            else:
                ids = 0.2 * (vds - 1)  # Saturation region
            writer.writerow([vds, ids, 5.0, 25.0])
        
        return csv_data.getvalue()
    
    def upload_test_data(self) -> bool:
        """Upload test data file"""
        try:
            # Create test CSV data
            csv_content = self.create_test_csv_data()
            
            # Prepare form data
            files = {'file': ('test_iv_curve.csv', csv_content, 'text/csv')}
            data = {
                'device_id': 'TEST_DEVICE_001',
                'test_type': 'iv_curve',
                'temperature': '25',
                'voltage_range': '0,10',
                'description': 'Test I-V curve data for correlation validation'
            }
            
            print("📤 Uploading test data...")
            response = requests.post(f"{self.base_url}/test-data/upload", files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                self.test_data_id = result['test_data_id']
                print(f"✅ Test data uploaded successfully: {self.test_data_id}")
                return True
            else:
                print(f"❌ Upload failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Upload error: {e}")
            return False
    
    def list_test_data(self) -> bool:
        """List all test data files"""
        try:
            print("📋 Listing test data...")
            response = requests.get(f"{self.base_url}/test-data")
            
            if response.status_code == 200:
                test_data_list = response.json()
                print(f"✅ Found {len(test_data_list)} test data files:")
                for data in test_data_list:
                    print(f"   - {data['test_data_id']}: {data['device_id']} ({data['test_type']})")
                return True
            else:
                print(f"❌ List failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ List error: {e}")
            return False
    
    def run_correlation(self) -> bool:
        """Run correlation analysis"""
        if not self.test_data_id:
            print("❌ No test data ID available")
            return False
            
        try:
            # Mock extracted parameters (in real scenario, these come from PDF extraction)
            extracted_parameters = {
                'vth': 1.2,        # Threshold voltage
                'rds_on': 0.15,    # On-resistance
                'id_max': 25.0,    # Maximum current
                'ciss': 1200e-12,  # Input capacitance
                'coss': 800e-12,   # Output capacitance
                'crss': 50e-12,    # Reverse transfer capacitance
            }
            
            correlation_request = {
                'test_data_id': self.test_data_id,
                'extracted_parameters': extracted_parameters,
                'tolerance_percentage': 10.0,
                'confidence_threshold': 0.8
            }
            
            print("🔄 Running correlation analysis...")
            response = requests.post(
                f"{self.base_url}/correlate",
                json=correlation_request,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                result = response.json()
                self.correlation_id = result['correlation_id']
                print(f"✅ Correlation started: {self.correlation_id}")
                return True
            else:
                print(f"❌ Correlation failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Correlation error: {e}")
            return False
    
    def wait_for_correlation_completion(self, timeout: int = 30) -> bool:
        """Wait for correlation to complete"""
        if not self.correlation_id:
            print("❌ No correlation ID available")
            return False
            
        print(f"⏳ Waiting for correlation completion (timeout: {timeout}s)...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                response = requests.get(f"{self.base_url}/correlate/{self.correlation_id}")
                if response.status_code == 200:
                    result = response.json()
                    if result['summary']['status'] == 'completed':
                        print("✅ Correlation completed!")
                        return True
                    elif result['summary']['status'] == 'failed':
                        print("❌ Correlation failed")
                        return False
                    else:
                        print(f"⏳ Status: {result['summary']['status']}")
                        time.sleep(2)
                else:
                    print(f"❌ Status check failed: {response.status_code}")
                    return False
            except Exception as e:
                print(f"❌ Status check error: {e}")
                return False
        
        print("⏰ Correlation timeout")
        return False
    
    def get_correlation_results(self) -> bool:
        """Get and display correlation results"""
        if not self.correlation_id:
            print("❌ No correlation ID available")
            return False
            
        try:
            print("📊 Getting correlation results...")
            response = requests.get(f"{self.base_url}/correlate/{self.correlation_id}")
            
            if response.status_code == 200:
                result = response.json()
                self.display_results(result)
                return True
            else:
                print(f"❌ Results retrieval failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Results error: {e}")
            return False
    
    def display_results(self, result: Dict[str, Any]):
        """Display correlation results in a formatted way"""
        summary = result['summary']
        results = result['results']
        
        print("\n" + "="*60)
        print("CORRELATION RESULTS")
        print("="*60)
        
        # Summary
        print(f"📈 Summary:")
        print(f"   Total Parameters: {summary['total_parameters']}")
        print(f"   Within Tolerance: {summary['parameters_within_tolerance']}/{summary['total_parameters']}")
        print(f"   Average Correlation: {summary['average_correlation_score']*100:.1f}%")
        print(f"   Average Error: {summary['average_error_percentage']:.2f}%")
        print(f"   Overall Confidence: {summary['overall_confidence']*100:.1f}%")
        print(f"   Status: {summary['status']}")
        
        # Detailed results
        print(f"\n📋 Parameter Details:")
        print(f"{'Parameter':<15} {'Extracted':<12} {'Measured':<12} {'Error %':<8} {'Status':<8}")
        print("-" * 60)
        
        for param_result in results:
            status = "✅ PASS" if param_result['within_tolerance'] else "❌ FAIL"
            print(f"{param_result['parameter_name']:<15} "
                  f"{param_result['extracted_value']:<12.3f} "
                  f"{param_result['measured_value']:<12.3f} "
                  f"{param_result['error_percentage']:<8.2f} "
                  f"{status:<8}")
        
        # Recommendations
        print(f"\n💡 Recommendations:")
        if summary['average_error_percentage'] > 20:
            print("   ⚠️  High average error. Consider reviewing extraction parameters.")
        if summary['parameters_within_tolerance'] / summary['total_parameters'] < 0.8:
            print("   ⚠️  Low tolerance compliance. Verify test conditions.")
        if summary['overall_confidence'] < 0.7:
            print("   ⚠️  Low confidence level. Consider additional validation.")
        if summary['average_error_percentage'] <= 10 and summary['overall_confidence'] >= 0.8:
            print("   ✅ Excellent correlation results!")
        
        print("="*60)
    
    def list_correlations(self) -> bool:
        """List all correlations"""
        try:
            print("📋 Listing correlations...")
            response = requests.get(f"{self.base_url}/correlate")
            
            if response.status_code == 200:
                correlations = response.json()
                print(f"✅ Found {len(correlations)} correlations:")
                for corr in correlations:
                    print(f"   - {corr['correlation_id']}: {corr['status']} "
                          f"({corr['parameters_within_tolerance']}/{corr['total_parameters']} within tolerance)")
                return True
            else:
                print(f"❌ List failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ List error: {e}")
            return False
    
    def cleanup_test_data(self) -> bool:
        """Clean up test data"""
        if not self.test_data_id:
            print("❌ No test data ID available")
            return False
            
        try:
            print(f"🗑️  Cleaning up test data: {self.test_data_id}")
            response = requests.delete(f"{self.base_url}/test-data/{self.test_data_id}")
            
            if response.status_code == 200:
                print("✅ Test data cleaned up successfully")
                return True
            else:
                print(f"❌ Cleanup failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Cleanup error: {e}")
            return False
    
    def run_full_test(self) -> bool:
        """Run the complete test workflow"""
        print("🚀 Starting Test Correlation Service Test")
        print("="*50)
        
        # Step 1: Health check
        if not self.check_service_health():
            return False
        
        # Step 2: Upload test data
        if not self.upload_test_data():
            return False
        
        # Step 3: List test data
        if not self.list_test_data():
            return False
        
        # Step 4: Run correlation
        if not self.run_correlation():
            return False
        
        # Step 5: Wait for completion
        if not self.wait_for_correlation_completion():
            return False
        
        # Step 6: Get results
        if not self.get_correlation_results():
            return False
        
        # Step 7: List correlations
        if not self.list_correlations():
            return False
        
        # Step 8: Cleanup (optional)
        # if not self.cleanup_test_data():
        #     return False
        
        print("\n🎉 Test completed successfully!")
        return True

def main():
    """Main test function"""
    tester = TestCorrelationTester()
    
    try:
        success = tester.run_full_test()
        if success:
            print("\n✅ All tests passed!")
            return 0
        else:
            print("\n❌ Some tests failed!")
            return 1
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    exit(main()) 