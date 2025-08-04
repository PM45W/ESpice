import { invoke } from '@tauri-apps/api/core';

export interface BatchJob {
  job_id: string;
  batch_id: string;
  file_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
  celery_task_id?: string;
}

export interface BatchInfo {
  batch_id: string;
  batch_name: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  progress: number;
  created_at: string;
  updated_at: string;
  estimated_completion?: string;
}

export interface BatchRequest {
  batch_name: string;
  description?: string;
  workflow_type: string;
  priority: string;
  metadata?: Record<string, any>;
}

export interface BatchUploadResponse {
  batch_id: string;
  batch_info: BatchInfo;
  message: string;
}

export interface BatchServiceError extends Error {
  code: string;
  details?: any;
}

export interface BackendParameter {
  name: string;
  values: number[];
  source: string;
  type: string;
  label: string;
  unit: string;
}

export class BatchService {
  private static instance: BatchService;
  private baseUrl: string = 'http://localhost:87'; // Batch processor service

  static getInstance(): BatchService {
    if (!BatchService.instance) {
      BatchService.instance = new BatchService();
    }
    return BatchService.instance;
  }

  /**
   * Upload files and create a new batch
   */
  async uploadBatch(
    files: File[],
    request: BatchRequest
  ): Promise<BatchUploadResponse> {
    try {
      if (!files || files.length === 0) {
        throw new Error('No files provided');
      }

      if (!request.batch_name.trim()) {
        throw new Error('Batch name is required');
      }

      // Create FormData with files and batch info
      const formData = new FormData();
      formData.append('request', JSON.stringify(request));

      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${this.baseUrl}/batch/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      return result as BatchUploadResponse;
    } catch (error) {
      console.error('Batch upload error:', error);
      throw new BatchServiceError(
        error instanceof Error ? error.message : 'Unknown batch upload error',
        'BATCH_UPLOAD_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Get batch information
   */
  async getBatchInfo(batchId: string): Promise<BatchInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/batch/${batchId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result as BatchInfo;
    } catch (error) {
      console.error('Get batch info error:', error);
      throw new BatchServiceError(
        error instanceof Error ? error.message : 'Unknown batch info error',
        'BATCH_INFO_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Get all jobs for a batch
   */
  async getBatchJobs(batchId: string): Promise<BatchJob[]> {
    try {
      const response = await fetch(`${this.baseUrl}/batch/${batchId}/jobs`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result as BatchJob[];
    } catch (error) {
      console.error('Get batch jobs error:', error);
      throw new BatchServiceError(
        error instanceof Error ? error.message : 'Unknown batch jobs error',
        'BATCH_JOBS_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Cancel a batch
   */
  async cancelBatch(batchId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/batch/${batchId}/cancel`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result as { success: boolean; message: string };
    } catch (error) {
      console.error('Cancel batch error:', error);
      throw new BatchServiceError(
        error instanceof Error ? error.message : 'Unknown cancel batch error',
        'CANCEL_BATCH_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Retry failed jobs in a batch
   */
  async retryFailedJobs(batchId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/batch/${batchId}/retry`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result as { success: boolean; message: string };
    } catch (error) {
      console.error('Retry failed jobs error:', error);
      throw new BatchServiceError(
        error instanceof Error ? error.message : 'Unknown retry jobs error',
        'RETRY_JOBS_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * List all batches
   */
  async listBatches(): Promise<BatchInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/batches`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result as BatchInfo[];
    } catch (error) {
      console.error('List batches error:', error);
      throw new BatchServiceError(
        error instanceof Error ? error.message : 'Unknown list batches error',
        'LIST_BATCHES_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Delete a batch
   */
  async deleteBatch(batchId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/batch/${batchId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result as { success: boolean; message: string };
    } catch (error) {
      console.error('Delete batch error:', error);
      throw new BatchServiceError(
        error instanceof Error ? error.message : 'Unknown delete batch error',
        'DELETE_BATCH_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Check batch processor health
   */
  async checkHealth(): Promise<{ healthy: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      
      if (!response.ok) {
        return { healthy: false, message: `HTTP error! status: ${response.status}` };
      }

      const result = await response.json();
      return result as { healthy: boolean; message: string };
    } catch (error) {
      console.error('Batch processor health check error:', error);
      return { 
        healthy: false, 
        message: error instanceof Error ? error.message : 'Unknown health check error' 
      };
    }
  }

  /**
   * Export batch results as ZIP
   */
  async exportBatchResults(batchId: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/batch/${batchId}/export`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Export batch results error:', error);
      throw new BatchServiceError(
        error instanceof Error ? error.message : 'Unknown export error',
        'EXPORT_BATCH_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Get batch processing statistics
   */
  async getBatchStats(batchId: string): Promise<{
    total_files: number;
    processed_files: number;
    failed_files: number;
    processing_time: number;
    average_time_per_file: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/batch/${batchId}/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result as {
        total_files: number;
        processed_files: number;
        failed_files: number;
        processing_time: number;
        average_time_per_file: number;
      };
    } catch (error) {
      console.error('Get batch stats error:', error);
      throw new BatchServiceError(
        error instanceof Error ? error.message : 'Unknown batch stats error',
        'BATCH_STATS_ERROR',
        { originalError: error }
      );
    }
  }
}

// Mock backend API for fetching parameters from CSV for a product
export async function fetchProductParameters(productId: string): Promise<BackendParameter[]> {
  // Simulate extracted ASM parameters for different products
  if (productId === 'prod-001') {
    return [
      {
        name: 'RDS_ON',
        values: [0.012],
        source: 'output_characteristics.csv',
        type: 'fit',
        label: 'Output Characteristics (fit)',
        unit: 'Ohms',
      },
      {
        name: 'VTH',
        values: [-2.5],
        source: 'transfer_curve.csv',
        type: 'fit',
        label: 'Transfer Curve (fit)',
        unit: 'V',
      },
      {
        name: 'IDSS',
        values: [12],
        source: 'output_characteristics.csv',
        type: 'fit',
        label: 'Output Characteristics (fit)',
        unit: 'A',
      },
      {
        name: 'BVDSS',
        values: [650],
        source: 'output_characteristics.csv',
        type: 'fit',
        label: 'Output Characteristics (fit)',
        unit: 'V',
      },
      {
        name: 'CGS',
        values: [1.2e-12],
        source: 'capacitance.csv',
        type: 'fit',
        label: 'Capacitance (fit)',
        unit: 'F',
      },
      {
        name: 'CGD',
        values: [1.1e-12],
        source: 'capacitance.csv',
        type: 'fit',
        label: 'Capacitance (fit)',
        unit: 'F',
      },
      {
        name: 'SS',
        values: [0.13],
        source: 'output_characteristics.csv',
        type: 'fit',
        label: 'Output Characteristics (fit)',
        unit: 'V/dec',
      },
      {
        name: 'GM',
        values: [1.1],
        source: 'output_characteristics.csv',
        type: 'fit',
        label: 'Output Characteristics (fit)',
        unit: 'S',
      }
    ];
  } else if (productId === 'prod-002') {
    return [
      {
        name: 'vto',
        values: [2.1],
        source: 'transfer_curve.csv',
        type: 'fit',
        label: 'Transfer Curve (fit)',
        unit: 'V',
      },
      {
        name: 'cg',
        values: [4.0e-3],
        source: 'capacitance.csv',
        type: 'fit',
        label: 'Capacitance (fit)',
        unit: 'F/m^2',
      },
      {
        name: 'vx0',
        values: [3.0e5],
        source: 'output_characteristics.csv',
        type: 'fit',
        label: 'Output Characteristics (fit)',
        unit: 'm/s',
      },
      {
        name: 'mu0',
        values: [0.135],
        source: 'output_characteristics.csv',
        type: 'fit',
        label: 'Output Characteristics (fit)',
        unit: 'm^2/Vs',
      },
      {
        name: 'rsh',
        values: [150],
        source: 'output_characteristics.csv',
        type: 'fit',
        label: 'Output Characteristics (fit)',
        unit: 'Ohms/Sq',
      },
      {
        name: 'ss',
        values: [0.12],
        source: 'output_characteristics.csv',
        type: 'fit',
        label: 'Output Characteristics (fit)',
        unit: 'V/dec',
      }
    ];
  }
  // Default empty
  return [];
}

// Export singleton instance
export const batchService = BatchService.getInstance(); 