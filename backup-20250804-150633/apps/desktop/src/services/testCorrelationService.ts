import { invoke } from '@tauri-apps/api/core';

export interface TestDataType {
  iv_curve: 'iv_curve';
  cv_curve: 'cv_curve';
  temperature: 'temperature';
  frequency: 'frequency';
  noise: 'noise';
  aging: 'aging';
}

export interface TestDataUpload {
  device_id: string;
  test_type: keyof TestDataType;
  temperature?: number;
  voltage_range?: number[];
  frequency_range?: number[];
  description?: string;
  metadata?: Record<string, any>;
}

export interface TestDataInfo {
  test_data_id: string;
  device_id: string;
  test_type: keyof TestDataType;
  file_path: string;
  data_points: number;
  temperature?: number;
  voltage_range?: number[];
  frequency_range?: number[];
  description?: string;
  metadata?: Record<string, any>;
  uploaded_at: string;
  processed_at?: string;
}

export interface CorrelationRequest {
  test_data_id: string;
  model_id?: string;
  extracted_parameters: Record<string, number>;
  tolerance_percentage?: number;
  confidence_threshold?: number;
}

export interface CorrelationResult {
  correlation_id: string;
  model_id?: string;
  test_data_id: string;
  parameter_name: string;
  extracted_value: number;
  measured_value: number;
  correlation_score: number;
  error_percentage: number;
  tolerance: number;
  within_tolerance: boolean;
  confidence_level: number;
  created_at: string;
}

export interface CorrelationSummary {
  correlation_id: string;
  total_parameters: number;
  parameters_within_tolerance: number;
  average_correlation_score: number;
  average_error_percentage: number;
  overall_confidence: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

class TestCorrelationService {
  private baseUrl = 'http://localhost:8007'; // Test correlation service port

  async uploadTestData(
    file: File,
    uploadInfo: TestDataUpload
  ): Promise<{ test_data_id: string; success: boolean; message?: string }> {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('device_id', uploadInfo.device_id);
      formData.append('test_type', uploadInfo.test_type);
      
      if (uploadInfo.temperature) {
        formData.append('temperature', uploadInfo.temperature.toString());
      }
      if (uploadInfo.voltage_range) {
        formData.append('voltage_range', uploadInfo.voltage_range.join(','));
      }
      if (uploadInfo.frequency_range) {
        formData.append('frequency_range', uploadInfo.frequency_range.join(','));
      }
      if (uploadInfo.description) {
        formData.append('description', uploadInfo.description);
      }

      const response = await fetch(`${this.baseUrl}/test-data/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        test_data_id: result.test_data_id,
        success: true,
      };
    } catch (error) {
      console.error('Error uploading test data:', error);
      return {
        test_data_id: '',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getTestDataInfo(testDataId: string): Promise<TestDataInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/test-data/${testDataId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting test data info:', error);
      return null;
    }
  }

  async listTestData(): Promise<TestDataInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/test-data`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error listing test data:', error);
      return [];
    }
  }

  async correlateData(request: CorrelationRequest): Promise<{
    correlation_id: string;
    success: boolean;
    message?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/correlate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        correlation_id: result.correlation_id,
        success: true,
      };
    } catch (error) {
      console.error('Error correlating data:', error);
      return {
        correlation_id: '',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getCorrelationResults(correlationId: string): Promise<{
    results: CorrelationResult[];
    summary: CorrelationSummary;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/correlate/${correlationId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting correlation results:', error);
      return null;
    }
  }

  async listCorrelations(): Promise<CorrelationSummary[]> {
    try {
      const response = await fetch(`${this.baseUrl}/correlate`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error listing correlations:', error);
      return [];
    }
  }

  async validateExtraction(
    testDataId: string,
    extractedParameters: Record<string, number>
  ): Promise<{
    success: boolean;
    validation_results?: CorrelationResult[];
    message?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/validate/${testDataId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ extracted_parameters: extractedParameters }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        validation_results: result.validation_results,
      };
    } catch (error) {
      console.error('Error validating extraction:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deleteTestData(testDataId: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/test-data/${testDataId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting test data:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkServiceHealth(): Promise<{
    healthy: boolean;
    version?: string;
    message?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        healthy: true,
        version: result.version,
      };
    } catch (error) {
      console.error('Test correlation service health check failed:', error);
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Service unavailable',
      };
    }
  }
}

// Export singleton instance
export const testCorrelationService = new TestCorrelationService();
export default testCorrelationService; 