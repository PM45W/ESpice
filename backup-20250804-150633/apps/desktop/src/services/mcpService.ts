import { invoke } from '@tauri-apps/api/core';

export interface MCPResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface SPICEGenerationRequest {
  device_name: string;
  device_type: string;
  model_type: string;
  parameters?: any;
  extracted_data?: any;
}

export interface SPICEModel {
  id: string;
  name: string;
  description: string;
  default_parameters: any;
}

export interface SPICEGenerationResponse {
  success: boolean;
  model: string;
  device_name: string;
  device_type: string;
  model_type: string;
  parameters: any;
  model_info: {
    name: string;
    description: string;
  };
}

export interface ParameterFittingResponse {
  success: boolean;
  model_type: string;
  fitted_parameters: any;
  model_info: {
    name: string;
    description: string;
  };
}

// Enhanced error types for better debugging
export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class NetworkError extends MCPError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class ProcessingError extends MCPError {
  constructor(message: string, details?: any) {
    super(message, 'PROCESSING_ERROR', details);
    this.name = 'ProcessingError';
  }
}

export class ValidationError extends MCPError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class MCPService {
  private static instance: MCPService;
  private baseUrl: string = 'http://localhost:8001'; // Updated to port 8001 to avoid conflicts

  static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }

  /**
   * Check if MCP server is healthy
   */
  async checkHealth(): Promise<MCPResponse> {
    try {
      const result = await invoke('check_mcp_server_health');
      return result as MCPResponse;
    } catch (error) {
      console.error('MCP Health Check Failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown health check error'
      };
    }
  }

  /**
   * Get available SPICE model types
   */
  async getAvailableModels(): Promise<{ models: SPICEModel[] }> {
    try {
      const result = await invoke('get_available_models');
      return result as { models: SPICEModel[] };
    } catch (error) {
      console.error('Failed to get available models:', error);
      throw new NetworkError(
        `Failed to get available models: ${error}`,
        { originalError: error }
      );
    }
  }

  /**
   * Process PDF datasheet with MCP server
   */
  async processPDF(filePath: string): Promise<MCPResponse> {
    try {
      if (!filePath || filePath.trim() === '') {
        throw new ValidationError('File path is required');
      }

      const result = await invoke('process_pdf_with_mcp', { filePath });
      const response = result as MCPResponse;
      
      if (!response.success && response.error) {
        throw new ProcessingError(`PDF processing failed: ${response.error}`, response);
      }
      
      return response;
    } catch (error) {
      console.error('PDF Processing Error:', error);
      if (error instanceof MCPError) {
        throw error;
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown PDF processing error'
      };
    }
  }

  /**
   * Fit parameters for a specific model type
   */
  async fitParameters(extractedData: any, modelType: string): Promise<ParameterFittingResponse> {
    try {
      if (!extractedData) {
        throw new ValidationError('Extracted data is required');
      }
      
      if (!modelType || modelType.trim() === '') {
        throw new ValidationError('Model type is required');
      }

      const result = await invoke('fit_parameters_with_mcp', {
        extractedData,
        modelType
      });
      
      const response = result as ParameterFittingResponse;
      
      if (!response.success) {
        throw new ProcessingError('Parameter fitting failed', response);
      }
      
      return response;
    } catch (error) {
      console.error('Parameter Fitting Error:', error);
      if (error instanceof MCPError) {
        throw error;
      }
      throw new ProcessingError(
        `Parameter fitting failed: ${error}`,
        { originalError: error }
      );
    }
  }

  /**
   * Generate SPICE model with MCP server
   */
  async generateSPICE(
    deviceName: string,
    deviceType: string,
    modelType: string,
    parameters?: any,
    extractedData?: any
  ): Promise<SPICEGenerationResponse> {
    try {
      if (!deviceName || deviceName.trim() === '') {
        throw new ValidationError('Device name is required');
      }
      
      if (!deviceType || deviceType.trim() === '') {
        throw new ValidationError('Device type is required');
      }
      
      if (!modelType || modelType.trim() === '') {
        throw new ValidationError('Model type is required');
      }

      const result = await invoke('generate_spice_with_mcp', {
        deviceName,
        deviceType,
        modelType,
        parameters,
        extractedData
      });
      
      const response = result as SPICEGenerationResponse;
      
      if (!response.success) {
        throw new ProcessingError('SPICE generation failed', response);
      }
      
      return response;
    } catch (error) {
      console.error('SPICE Generation Error:', error);
      if (error instanceof MCPError) {
        throw error;
      }
      throw new ProcessingError(
        `SPICE generation failed: ${error}`,
        { originalError: error }
      );
    }
  }

  /**
   * Process PDF and generate SPICE model in one call
   */
  async processPDFAndGenerateSPICE(
    filePath: string,
    deviceName: string,
    modelType: string = 'asm_hemt',
    deviceType?: string
  ): Promise<SPICEGenerationResponse> {
    try {
      if (!filePath || filePath.trim() === '') {
        throw new ValidationError('File path is required');
      }
      
      if (!deviceName || deviceName.trim() === '') {
        throw new ValidationError('Device name is required');
      }

      const result = await invoke('process_pdf_and_generate_spice', {
        filePath,
        deviceName,
        modelType,
        deviceType
      });
      
      const response = result as SPICEGenerationResponse;
      
      if (!response.success) {
        throw new ProcessingError('PDF processing and SPICE generation failed', response);
      }
      
      return response;
    } catch (error) {
      console.error('PDF Processing and SPICE Generation Error:', error);
      if (error instanceof MCPError) {
        throw error;
      }
      throw new ProcessingError(
        `PDF processing and SPICE generation failed: ${error}`,
        { originalError: error }
      );
    }
  }

  /**
   * Generate SPICE model with custom parameters
   */
  async generateSPICEWithCustomParameters(
    deviceName: string,
    deviceType: string,
    modelType: string,
    customParameters: any
  ): Promise<SPICEGenerationResponse> {
    try {
      if (!deviceName || deviceName.trim() === '') {
        throw new ValidationError('Device name is required');
      }
      
      if (!deviceType || deviceType.trim() === '') {
        throw new ValidationError('Device type is required');
      }
      
      if (!modelType || modelType.trim() === '') {
        throw new ValidationError('Model type is required');
      }
      
      if (!customParameters || typeof customParameters !== 'object') {
        throw new ValidationError('Custom parameters must be an object');
      }

      const result = await invoke('generate_spice_with_custom_parameters', {
        deviceName,
        deviceType,
        modelType,
        customParameters
      });
      
      const response = result as SPICEGenerationResponse;
      
      if (!response.success) {
        throw new ProcessingError('SPICE generation with custom parameters failed', response);
      }
      
      return response;
    } catch (error) {
      console.error('SPICE Generation with Custom Parameters Error:', error);
      if (error instanceof MCPError) {
        throw error;
      }
      throw new ProcessingError(
        `SPICE generation with custom parameters failed: ${error}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get comprehensive server status
   */
  async getServerStatus(): Promise<{
    healthy: boolean;
    services: string[];
    version: string;
    availableModels: string[];
  }> {
    try {
      const healthResult = await this.checkHealth();
      const modelsResult = await this.getAvailableModels();
      
      return {
        healthy: healthResult.success,
        services: healthResult.success ? ['pdf-processing', 'spice-generation', 'parameter-fitting'] : [],
        version: '1.0.0',
        availableModels: modelsResult.models?.map(m => m.id) || []
      };
    } catch (error) {
      console.error('Server Status Check Error:', error);
      return {
        healthy: false,
        services: [],
        version: 'unknown',
        availableModels: []
      };
    }
  }

  /**
   * Validate if a model type is supported
   */
  async validateModelType(modelType: string): Promise<boolean> {
    try {
      const models = await this.getAvailableModels();
      return models.models?.some(m => m.id === modelType) || false;
    } catch (error) {
      console.error('Model Type Validation Error:', error);
      return false;
    }
  }

  /**
   * Get detailed information about a specific model
   */
  async getModelInfo(modelType: string): Promise<SPICEModel | null> {
    try {
      const models = await this.getAvailableModels();
      return models.models?.find(m => m.id === modelType) || null;
    } catch (error) {
      console.error('Get Model Info Error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const mcpService = MCPService.getInstance(); 