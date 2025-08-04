// SPICE Extraction Integration Service
// Handles integration between graph extraction results and SPICE model generation

import { productQueueIntegrationService, GraphExtractionResultRecord, GraphExtractionJobRecord } from './productQueueIntegrationService';
import { spiceModelGenerator, GenerationOptions, GenerationResult } from './spiceGenerator';
import productManagementService, { ProductWithParameters } from './productManagementService';
import { SPICEModel, Parameter } from '../types';

export interface SPICEExtractionRequest {
  productId: string;
  jobId: string;
  modelType: 'asm_hemt' | 'mvsg' | 'bsim' | 'custom';
  modelFormat: 'EPC' | 'ASM' | 'MVSG' | 'BSIM' | 'generic';
  templateId: string;
  includeSubcircuit?: boolean;
  includeComments?: boolean;
  exportFormat?: 'ltspice' | 'kicad' | 'generic';
  parameterMapping?: Record<string, string>; // Map CSV columns to SPICE parameters
  validationRules?: Record<string, any>;
}

export interface SPICEExtractionResult {
  id: string;
  productId: string;
  jobId: string;
  modelId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  modelType: string;
  modelFormat: string;
  templateId: string;
  generatedModel?: SPICEModel;
  spiceText?: string;
  validationErrors: string[];
  warnings: string[];
  mappingConfidence: number;
  processingTime?: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ParameterMappingResult {
  csvColumn: string;
  spiceParameter: string;
  mappedValue: number;
  confidence: number;
  source: 'direct' | 'calculated' | 'interpolated' | 'estimated';
  validationStatus: 'valid' | 'warning' | 'error';
}

export interface ModelValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  parameterValidation: Record<string, ParameterMappingResult>;
  modelSyntaxValid: boolean;
  parameterRangeValid: boolean;
  curveFitQuality: number;
}

export interface ModelVersion {
  id: string;
  modelId: string;
  version: string;
  changes: string[];
  createdAt: Date;
  createdBy: string;
  validationResults: ModelValidationResult;
}

class SPICEExtractionIntegrationService {
  private mockSPICEExtractionResults: SPICEExtractionResult[] = [];
  private mockModelVersions: ModelVersion[] = [];

  /**
   * Generate SPICE model from extracted curve data
   */
  async generateSPICEModel(request: SPICEExtractionRequest): Promise<SPICEExtractionResult> {
    const resultId = this.generateId();
    const extractionResult: SPICEExtractionResult = {
      id: resultId,
      productId: request.productId,
      jobId: request.jobId,
      modelId: this.generateId(),
      status: 'pending',
      progress: 0,
      modelType: request.modelType,
      modelFormat: request.modelFormat,
      templateId: request.templateId,
      validationErrors: [],
      warnings: [],
      mappingConfidence: 0,
      createdAt: new Date()
    };

    this.mockSPICEExtractionResults.push(extractionResult);

    try {
      // Update status to processing
      await this.updateExtractionStatus(resultId, 'processing', 10);

      // Get the extraction result from the queue system
      const curveData = await this.getCurveDataFromJob(request.jobId);
      if (!curveData) {
        throw new Error(`No curve data found for job ${request.jobId}`);
      }

      await this.updateExtractionStatus(resultId, 'processing', 30);

      // Get product information
      const product = await productManagementService.getProduct(request.productId);
      if (!product) {
        throw new Error(`Product not found: ${request.productId}`);
      }

      await this.updateExtractionStatus(resultId, 'processing', 50);

      // Map CSV data to SPICE parameters
      const mappedParameters = await this.mapCurveDataToParameters(
        curveData,
        request.parameterMapping || {},
        request.modelType
      );

      await this.updateExtractionStatus(resultId, 'processing', 70);

      // Generate SPICE model
      const generationOptions: GenerationOptions = {
        templateId: request.templateId,
        deviceName: product.partNumber,
        modelName: `${product.partNumber}_${request.modelType}`,
        includeSubcircuit: request.includeSubcircuit || false,
        includeComments: request.includeComments || true,
        exportFormat: request.exportFormat || 'generic'
      };

      const generationResult = await spiceModelGenerator.generateModel(
        product,
        mappedParameters,
        generationOptions
      );

      await this.updateExtractionStatus(resultId, 'processing', 90);

      // Validate the generated model
      const validationResult = await this.validateGeneratedModel(
        generationResult.spiceText || '',
        request.modelType,
        request.validationRules || {}
      );

      // Update the extraction result
      const updatedResult = await this.updateExtractionResult(resultId, {
        status: 'completed',
        progress: 100,
        generatedModel: generationResult.model,
        spiceText: generationResult.spiceText,
        validationErrors: [...generationResult.validationErrors, ...validationResult.errors],
        warnings: [...generationResult.warnings, ...validationResult.warnings],
        mappingConfidence: generationResult.mappingConfidence,
        processingTime: Date.now() - extractionResult.createdAt.getTime(),
        completedAt: new Date()
      });

      return updatedResult;

    } catch (error) {
      console.error('Error generating SPICE model:', error);
      return await this.updateExtractionResult(resultId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      });
    }
  }

  /**
   * Get curve data from extraction job
   */
  private async getCurveDataFromJob(jobId: string): Promise<any> {
    try {
      const result = await productQueueIntegrationService.getExtractionResult(jobId);
      if (!result || !result.csvData) {
        return null;
      }
      return result.csvData;
    } catch (error) {
      console.error('Error getting curve data:', error);
      return null;
    }
  }

  /**
   * Map curve data to SPICE parameters
   */
  private async mapCurveDataToParameters(
    curveData: any,
    parameterMapping: Record<string, string>,
    modelType: string
  ): Promise<Parameter[]> {
    const parameters: Parameter[] = [];
    
    try {
      // Parse CSV data structure
      const dataPoints = this.parseCSVData(curveData);
      
      // Extract key parameters based on model type
      const extractedParams = this.extractParametersFromCurves(dataPoints, modelType);
      
      // Apply custom parameter mapping
      for (const [csvColumn, spiceParam] of Object.entries(parameterMapping)) {
        if (extractedParams[csvColumn]) {
          parameters.push({
            id: this.generateId(),
            name: spiceParam,
            value: extractedParams[csvColumn].toString(),
            unit: this.getParameterUnit(spiceParam),
            category: this.getParameterCategory(spiceParam),
            source: 'Extraction',
            confidence: extractedParams[`${csvColumn}_confidence`] || 0.8
          });
        }
      }

      // Add automatically extracted parameters
      for (const [paramName, value] of Object.entries(extractedParams)) {
        if (!parameterMapping[paramName] && !paramName.includes('_confidence')) {
          parameters.push({
            id: this.generateId(),
            name: paramName,
            value: value.toString(),
            unit: this.getParameterUnit(paramName),
            category: this.getParameterCategory(paramName),
            source: 'Extraction',
            confidence: extractedParams[`${paramName}_confidence`] || 0.7
          });
        }
      }

    } catch (error) {
      console.error('Error mapping curve data to parameters:', error);
    }

    return parameters;
  }

  /**
   * Parse CSV data structure
   */
  private parseCSVData(csvData: any): any[] {
    if (Array.isArray(csvData)) {
      return csvData;
    }
    
    if (typeof csvData === 'string') {
      try {
        return JSON.parse(csvData);
      } catch {
        // Try parsing as CSV string
        return this.parseCSVString(csvData);
      }
    }
    
    return [];
  }

  /**
   * Parse CSV string to array of objects
   */
  private parseCSVString(csvString: string): any[] {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index];
        row[header] = this.parseValue(value);
      });
      
      data.push(row);
    }
    
    return data;
  }

  /**
   * Parse string value to appropriate type
   */
  private parseValue(value: string): number | string {
    const num = parseFloat(value);
    return isNaN(num) ? value : num;
  }

  /**
   * Extract parameters from curve data
   */
  private extractParametersFromCurves(dataPoints: any[], modelType: string): Record<string, number> {
    const params: Record<string, number> = {};
    
    if (!dataPoints || dataPoints.length === 0) {
      return params;
    }

    // Extract basic curve parameters
    const voltages = dataPoints.map(p => p.V || p.voltage || p.VDS || p.VGS || 0).filter(v => !isNaN(v));
    const currents = dataPoints.map(p => p.I || p.current || p.IDS || p.ID || 0).filter(i => !isNaN(i));
    
    if (voltages.length > 0 && currents.length > 0) {
      // Calculate threshold voltage (VTH)
      const thresholdIndex = currents.findIndex(i => i > 0.001 * Math.max(...currents));
      if (thresholdIndex >= 0) {
        params.VTH = voltages[thresholdIndex];
        params.VTH_confidence = 0.8;
      }

      // Calculate on-resistance (RDS_ON)
      const maxCurrentIndex = currents.indexOf(Math.max(...currents));
      if (maxCurrentIndex >= 0 && currents[maxCurrentIndex] > 0) {
        params.RDS_ON = voltages[maxCurrentIndex] / currents[maxCurrentIndex];
        params.RDS_ON_confidence = 0.9;
      }

      // Calculate saturation current (IDSS)
      params.IDSS = Math.max(...currents);
      params.IDSS_confidence = 0.95;

      // Calculate breakdown voltage (BVDSS)
      const breakdownIndex = voltages.findIndex(v => v > 0.8 * Math.max(...voltages));
      if (breakdownIndex >= 0) {
        params.BVDSS = voltages[breakdownIndex];
        params.BVDSS_confidence = 0.7;
      }
    }

    // Model-specific parameter extraction
    if (modelType === 'asm_hemt') {
      this.extractASMHEMTParameters(dataPoints, params);
    } else if (modelType === 'mvsg') {
      this.extractMVSGParameters(dataPoints, params);
    }

    return params;
  }

  /**
   * Extract ASM-HEMT specific parameters
   */
  private extractASMHEMTParameters(dataPoints: any[], params: Record<string, number>): void {
    // Extract ASM-HEMT specific parameters
    const voltages = dataPoints.map(p => p.V || p.voltage || p.VDS || 0).filter(v => !isNaN(v));
    const currents = dataPoints.map(p => p.I || p.current || p.IDS || 0).filter(i => !isNaN(i));
    
    if (voltages.length > 0 && currents.length > 0) {
      // KP - Transconductance parameter
      const maxCurrent = Math.max(...currents);
      const maxVoltage = Math.max(...voltages);
      if (maxCurrent > 0 && maxVoltage > 0) {
        params.KP = maxCurrent / (maxVoltage * maxVoltage);
        params.KP_confidence = 0.8;
      }

      // VOFF - Threshold voltage offset
      const thresholdIndex = currents.findIndex(i => i > 0.001 * maxCurrent);
      if (thresholdIndex >= 0) {
        params.VOFF = voltages[thresholdIndex];
        params.VOFF_confidence = 0.8;
      }

      // VSE - Subthreshold slope parameter
      params.VSE = 1.0; // Default value
      params.VSE_confidence = 0.5;

      // LAMBDA0, LAMBDA1 - Channel length modulation parameters
      params.LAMBDA0 = 0.01;
      params.LAMBDA1 = 0.001;
      params.LAMBDA0_confidence = 0.3;
      params.LAMBDA1_confidence = 0.3;
    }
  }

  /**
   * Extract MVSG specific parameters
   */
  private extractMVSGParameters(dataPoints: any[], params: Record<string, number>): void {
    // Extract MVSG specific parameters
    // Implementation would be similar to ASM-HEMT but with MVSG-specific parameters
    params.MVSG_VTH = params.VTH || 0;
    params.MVSG_KP = params.KP || 1.0;
    params.MVSG_VTH_confidence = 0.8;
    params.MVSG_KP_confidence = 0.7;
  }

  /**
   * Get parameter unit
   */
  private getParameterUnit(paramName: string): string {
    const unitMap: Record<string, string> = {
      VTH: 'V',
      RDS_ON: 'Ω',
      IDSS: 'A',
      BVDSS: 'V',
      KP: 'A/V²',
      VOFF: 'V',
      VSE: '',
      LAMBDA0: '1/V',
      LAMBDA1: '1/V²'
    };
    return unitMap[paramName] || '';
  }

  /**
   * Get parameter category
   */
  private getParameterCategory(paramName: string): string {
    const categoryMap: Record<string, string> = {
      VTH: 'Electrical',
      RDS_ON: 'Electrical',
      IDSS: 'Electrical',
      BVDSS: 'Electrical',
      KP: 'Electrical',
      VOFF: 'Electrical',
      VSE: 'Electrical',
      LAMBDA0: 'Electrical',
      LAMBDA1: 'Electrical'
    };
    return categoryMap[paramName] || 'Electrical';
  }

  /**
   * Validate generated model
   */
  private async validateGeneratedModel(
    spiceText: string,
    modelType: string,
    validationRules: Record<string, any>
  ): Promise<ModelValidationResult> {
    const result: ModelValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      parameterValidation: {},
      modelSyntaxValid: true,
      parameterRangeValid: true,
      curveFitQuality: 0.8
    };

    try {
      // Basic syntax validation
      if (!spiceText || spiceText.trim().length === 0) {
        result.errors.push('SPICE model text is empty');
        result.modelSyntaxValid = false;
        result.isValid = false;
      }

      // Check for required model components
      const requiredComponents = this.getRequiredComponents(modelType);
      for (const component of requiredComponents) {
        if (!spiceText.includes(component)) {
          result.warnings.push(`Missing required component: ${component}`);
        }
      }

      // Parameter range validation
      const parameterRanges = this.getParameterRanges(modelType);
      for (const [param, range] of Object.entries(parameterRanges)) {
        const match = spiceText.match(new RegExp(`${param}\\s*=\\s*([\\d.]+)`));
        if (match) {
          const value = parseFloat(match[1]);
          if (value < range.min || value > range.max) {
            result.warnings.push(`Parameter ${param} (${value}) is outside expected range [${range.min}, ${range.max}]`);
            result.parameterRangeValid = false;
          }
        }
      }

    } catch (error) {
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Get required components for model type
   */
  private getRequiredComponents(modelType: string): string[] {
    const components: Record<string, string[]> = {
      asm_hemt: ['.SUBCKT', 'GId', 'B_CGD', 'B_CGS'],
      mvsg: ['.SUBCKT', 'GId'],
      bsim: ['.MODEL', 'NMOS', 'PMOS']
    };
    return components[modelType] || [];
  }

  /**
   * Get parameter ranges for model type
   */
  private getParameterRanges(modelType: string): Record<string, { min: number; max: number }> {
    const ranges: Record<string, Record<string, { min: number; max: number }>> = {
      asm_hemt: {
        VTH: { min: -10, max: 10 },
        KP: { min: 0.001, max: 100 },
        VOFF: { min: -5, max: 5 },
        VSE: { min: 0.5, max: 2.0 },
        LAMBDA0: { min: 0, max: 1 },
        LAMBDA1: { min: 0, max: 0.1 }
      },
      mvsg: {
        VTH: { min: -10, max: 10 },
        KP: { min: 0.001, max: 100 }
      }
    };
    return ranges[modelType] || {};
  }

  /**
   * Update extraction status
   */
  private async updateExtractionStatus(
    resultId: string,
    status: SPICEExtractionResult['status'],
    progress: number
  ): Promise<void> {
    const result = this.mockSPICEExtractionResults.find(r => r.id === resultId);
    if (result) {
      result.status = status;
      result.progress = progress;
    }
  }

  /**
   * Update extraction result
   */
  private async updateExtractionResult(
    resultId: string,
    updates: Partial<SPICEExtractionResult>
  ): Promise<SPICEExtractionResult> {
    const result = this.mockSPICEExtractionResults.find(r => r.id === resultId);
    if (result) {
      Object.assign(result, updates);
      return result;
    }
    throw new Error(`Extraction result not found: ${resultId}`);
  }

  /**
   * Get SPICE extraction results for a product
   */
  async getProductSPICEExtractions(productId: string): Promise<SPICEExtractionResult[]> {
    return this.mockSPICEExtractionResults.filter(r => r.productId === productId);
  }

  /**
   * Get SPICE extraction result by ID
   */
  async getSPICEExtractionResult(resultId: string): Promise<SPICEExtractionResult | null> {
    return this.mockSPICEExtractionResults.find(r => r.id === resultId) || null;
  }

  /**
   * Create model version
   */
  async createModelVersion(
    modelId: string,
    version: string,
    changes: string[],
    createdBy: string
  ): Promise<ModelVersion> {
    const modelVersion: ModelVersion = {
      id: this.generateId(),
      modelId,
      version,
      changes,
      createdAt: new Date(),
      createdBy,
      validationResults: {
        isValid: true,
        errors: [],
        warnings: [],
        parameterValidation: {},
        modelSyntaxValid: true,
        parameterRangeValid: true,
        curveFitQuality: 0.8
      }
    };

    this.mockModelVersions.push(modelVersion);
    return modelVersion;
  }

  /**
   * Get model versions
   */
  async getModelVersions(modelId: string): Promise<ModelVersion[]> {
    return this.mockModelVersions.filter(v => v.modelId === modelId);
  }

  /**
   * Compare model versions
   */
  async compareModelVersions(version1Id: string, version2Id: string): Promise<{
    differences: string[];
    improvements: string[];
    regressions: string[];
  }> {
    const version1 = this.mockModelVersions.find(v => v.id === version1Id);
    const version2 = this.mockModelVersions.find(v => v.id === version2Id);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    return {
      differences: [...version1.changes, ...version2.changes],
      improvements: version2.changes.filter(c => !version1.changes.includes(c)),
      regressions: version1.changes.filter(c => !version2.changes.includes(c))
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `spice-extraction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const spiceExtractionIntegrationService = new SPICEExtractionIntegrationService(); 