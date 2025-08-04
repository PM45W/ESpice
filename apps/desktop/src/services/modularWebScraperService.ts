/**
 * Modular Web Scraper Service
 * Handles communication with the new modular web scraper API
 */

export interface XLSXFile {
  file_path: string;
  file_name: string;
  file_size: number;
  modified_at: string;
  manufacturer: string;
  relative_path: string;
}

export interface ProcessedData {
  manufacturer: string;
  data: any[];
  total_files: number;
  timestamp: string;
}

export interface StorageStats {
  stats: {
    total_size: number;
    total_size_mb: number;
    manufacturers: Record<string, {
      file_count: number;
      total_size: number;
      total_size_mb: number;
    }>;
  };
  timestamp: string;
}

export interface DatasheetInfo {
  file_path: string;
  file_name: string;
  file_size: number;
  modified_at: string;
  file_type: string;
  relative_path: string;
}

export interface ProcessXLSXRequest {
  file_path: string;
  manufacturer?: string;
  auto_detect?: boolean;
}

export interface BatchDownloadRequest {
  manufacturer: string;
  include_spice?: boolean;
  use_csv_data?: boolean;
  model_numbers?: string[];
}

export interface ExportRequest {
  manufacturer: string;
  format?: string;
  filename?: string;
}

export interface ProcessingResult {
  success: boolean;
  result: any;
  saved_path: string;
  timestamp: string;
}

export interface BatchDownloadResult {
  success: boolean;
  download_result: any;
  timestamp: string;
}

export interface ExportResult {
  success: boolean;
  export_path: string;
  format: string;
  timestamp: string;
}

class ModularWebScraperService {
  private baseUrl: string;

  constructor() {
    // Use the modular API endpoint
    this.baseUrl = 'http://localhost:8011';
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // File management endpoints
  async getAvailableXLSXFiles(): Promise<{ files: XLSXFile[]; total_count: number; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/files/xlsx`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get XLSX files:', error);
      throw error;
    }
  }

  async getDatasheetInfo(manufacturer: string): Promise<{ manufacturer: string; datasheets: DatasheetInfo[]; total_count: number; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/files/datasheets/${manufacturer}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to get datasheet info for ${manufacturer}:`, error);
      throw error;
    }
  }

  async getStorageStats(): Promise<StorageStats> {
    try {
      const response = await fetch(`${this.baseUrl}/files/storage-stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      throw error;
    }
  }

  // Data processing endpoints
  async processXLSXFile(request: ProcessXLSXRequest): Promise<ProcessingResult> {
    try {
      const response = await fetch(`${this.baseUrl}/process/xlsx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to process XLSX file:', error);
      throw error;
    }
  }

  async getProcessedData(manufacturer: string): Promise<ProcessedData> {
    try {
      const response = await fetch(`${this.baseUrl}/process/data/${manufacturer}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to get processed data for ${manufacturer}:`, error);
      throw error;
    }
  }

  // EPC-specific endpoints
  async processEPCXLSX(filePath: string): Promise<ProcessingResult> {
    try {
      const response = await fetch(`${this.baseUrl}/epc/process-xlsx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_path: filePath }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to process EPC XLSX:', error);
      throw error;
    }
  }

  async batchDownloadEPCDatasheets(request: BatchDownloadRequest): Promise<BatchDownloadResult> {
    try {
      const response = await fetch(`${this.baseUrl}/epc/batch-download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to batch download EPC datasheets:', error);
      throw error;
    }
  }

  // Infineon-specific endpoints
  async processInfineonXLSX(filePath: string): Promise<ProcessingResult> {
    try {
      const response = await fetch(`${this.baseUrl}/infineon/process-xlsx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_path: filePath }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to process Infineon XLSX:', error);
      throw error;
    }
  }

  // Export endpoints
  async exportData(request: ExportRequest): Promise<ExportResult> {
    try {
      const response = await fetch(`${this.baseUrl}/export/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  // Maintenance endpoints
  async cleanupTempFiles(maxAgeHours: number = 24): Promise<{ success: boolean; message: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/maintenance/cleanup?max_age_hours=${maxAgeHours}`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
      throw error;
    }
  }

  async createBackup(backupName?: string): Promise<{ success: boolean; backup_path: string; timestamp: string }> {
    try {
      const url = backupName 
        ? `${this.baseUrl}/maintenance/backup?backup_name=${encodeURIComponent(backupName)}`
        : `${this.baseUrl}/maintenance/backup`;
      
      const response = await fetch(url, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  // Legacy compatibility endpoints
  async getProducts(manufacturer?: string, limit: number = 100): Promise<{ products: any[]; total: number; timestamp: string }> {
    try {
      const params = new URLSearchParams();
      if (manufacturer) params.append('manufacturer', manufacturer);
      params.append('limit', limit.toString());
      
      const response = await fetch(`${this.baseUrl}/products?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get products:', error);
      throw error;
    }
  }

  // Utility methods
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }
}

export const modularWebScraperService = new ModularWebScraperService();
export default modularWebScraperService; 