import type { SPICEModel } from '../types';

// PDK Foundry Types
export type FoundryType = 'TSMC' | 'GlobalFoundries' | 'Samsung' | 'UMC' | 'SMIC';
export type ProcessNode = '180nm' | '130nm' | '90nm' | '65nm' | '45nm' | '32nm' | '28nm' | '22nm' | '16nm' | '14nm' | '12nm' | '10nm' | '8nm' | '7nm' | '5nm' | '3nm';
export type EDATool = 'Cadence' | 'Synopsys' | 'Keysight' | 'Mentor' | 'Generic';

// PDK Validation Results
export interface PDKValidationResult {
  isValid: boolean;
  foundry: FoundryType;
  processNode: ProcessNode;
  complianceScore: number; // 0-100
  warnings: string[];
  errors: string[];
  recommendations: string[];
  validatedAt: Date;
}

// EDA Export Options
export interface EDAExportOptions {
  tool: EDATool;
  format: 'scs' | 'sp' | 'lib' | 'cir' | 'mod';
  includeProcessCorners: boolean;
  includeTemperatureRange: boolean;
  includeMonteCarlo: boolean;
  customParameters?: Record<string, any>;
}

// Process Corner Types
export type ProcessCorner = 'TT' | 'FF' | 'SS' | 'SF' | 'FS' | 'MC';

// Temperature Range
export interface TemperatureRange {
  min: number; // Celsius
  max: number; // Celsius
  step: number; // Celsius
}

export class PDKCompatibilityService {
  private static instance: PDKCompatibilityService;

  public static getInstance(): PDKCompatibilityService {
    if (!PDKCompatibilityService.instance) {
      PDKCompatibilityService.instance = new PDKCompatibilityService();
    }
    return PDKCompatibilityService.instance;
  }

  // Supported Foundries and Process Nodes
  private readonly supportedFoundries: Record<FoundryType, ProcessNode[]> = {
    'TSMC': ['180nm', '130nm', '90nm', '65nm', '45nm', '32nm', '28nm', '22nm', '16nm', '14nm', '10nm', '7nm', '5nm', '3nm'],
    'GlobalFoundries': ['180nm', '130nm', '90nm', '65nm', '45nm', '32nm', '28nm', '22nm', '14nm', '12nm', '7nm'],
    'Samsung': ['180nm', '130nm', '90nm', '65nm', '45nm', '32nm', '28nm', '22nm', '14nm', '10nm', '8nm', '7nm', '5nm', '3nm'],
    'UMC': ['180nm', '130nm', '90nm', '65nm', '45nm', '32nm', '28nm', '22nm', '14nm', '12nm'],
    'SMIC': ['180nm', '130nm', '90nm', '65nm', '45nm', '32nm', '28nm', '22nm', '14nm']
  };

  // PDK Validation Rules
  private readonly pdkValidationRules: Record<FoundryType, Record<ProcessNode, any>> = {
    'TSMC': {
      '28nm': {
        requiredParameters: ['VTH0', 'K1', 'K2', 'K3', 'DVT0', 'DVT1', 'DVT2', 'DVT0W', 'DVT1W', 'DVT2W'],
        parameterRanges: {
          'VTH0': { min: -0.5, max: 0.5 },
          'K1': { min: 0.1, max: 2.0 },
          'K2': { min: -0.1, max: 0.1 },
          'K3': { min: 0, max: 100 }
        },
        temperatureRange: { min: -40, max: 125, step: 25 },
        processCorners: ['TT', 'FF', 'SS', 'SF', 'FS']
      },
      '16nm': {
        requiredParameters: ['VTH0', 'K1', 'K2', 'K3', 'DVT0', 'DVT1', 'DVT2', 'DVT0W', 'DVT1W', 'DVT2W', 'U0', 'UA', 'UB'],
        parameterRanges: {
          'VTH0': { min: -0.4, max: 0.4 },
          'K1': { min: 0.05, max: 1.5 },
          'K2': { min: -0.05, max: 0.05 },
          'K3': { min: 0, max: 80 }
        },
        temperatureRange: { min: -40, max: 125, step: 25 },
        processCorners: ['TT', 'FF', 'SS', 'SF', 'FS', 'MC']
      }
    },
    'GlobalFoundries': {
      '28nm': {
        requiredParameters: ['VTH0', 'K1', 'K2', 'K3', 'DVT0', 'DVT1', 'DVT2'],
        parameterRanges: {
          'VTH0': { min: -0.6, max: 0.6 },
          'K1': { min: 0.1, max: 2.5 },
          'K2': { min: -0.15, max: 0.15 },
          'K3': { min: 0, max: 120 }
        },
        temperatureRange: { min: -40, max: 125, step: 25 },
        processCorners: ['TT', 'FF', 'SS', 'SF', 'FS']
      }
    },
    'Samsung': {
      '28nm': {
        requiredParameters: ['VTH0', 'K1', 'K2', 'K3', 'DVT0', 'DVT1', 'DVT2'],
        parameterRanges: {
          'VTH0': { min: -0.5, max: 0.5 },
          'K1': { min: 0.1, max: 2.0 },
          'K2': { min: -0.1, max: 0.1 },
          'K3': { min: 0, max: 100 }
        },
        temperatureRange: { min: -40, max: 125, step: 25 },
        processCorners: ['TT', 'FF', 'SS', 'SF', 'FS']
      }
    },
    'UMC': {
      '28nm': {
        requiredParameters: ['VTH0', 'K1', 'K2', 'K3', 'DVT0', 'DVT1', 'DVT2'],
        parameterRanges: {
          'VTH0': { min: -0.6, max: 0.6 },
          'K1': { min: 0.1, max: 2.5 },
          'K2': { min: -0.15, max: 0.15 },
          'K3': { min: 0, max: 120 }
        },
        temperatureRange: { min: -40, max: 125, step: 25 },
        processCorners: ['TT', 'FF', 'SS', 'SF', 'FS']
      }
    },
    'SMIC': {
      '28nm': {
        requiredParameters: ['VTH0', 'K1', 'K2', 'K3', 'DVT0', 'DVT1', 'DVT2'],
        parameterRanges: {
          'VTH0': { min: -0.6, max: 0.6 },
          'K1': { min: 0.1, max: 2.5 },
          'K2': { min: -0.15, max: 0.15 },
          'K3': { min: 0, max: 120 }
        },
        temperatureRange: { min: -40, max: 125, step: 25 },
        processCorners: ['TT', 'FF', 'SS', 'SF', 'FS']
      }
    }
  };

  /**
   * Validate SPICE model against specific foundry PDK requirements
   */
  public validatePDKCompatibility(
    model: SPICEModel,
    foundry: FoundryType,
    processNode: ProcessNode
  ): PDKValidationResult {
    const result: PDKValidationResult = {
      isValid: false,
      foundry,
      processNode,
      complianceScore: 0,
      warnings: [],
      errors: [],
      recommendations: [],
      validatedAt: new Date()
    };

    try {
      // Check if foundry and process node are supported
      if (!this.supportedFoundries[foundry]?.includes(processNode)) {
        result.errors.push(`Process node ${processNode} is not supported for ${foundry}`);
        return result;
      }

      // Get validation rules for this foundry and process node
      const rules = this.pdkValidationRules[foundry]?.[processNode];
      if (!rules) {
        result.errors.push(`No validation rules found for ${foundry} ${processNode}`);
        return result;
      }

      // Extract parameters from SPICE model
      const extractedParams = this.extractParametersFromSPICE(model.modelText);
      
      // Validate required parameters
      const missingParams = this.validateRequiredParameters(extractedParams, rules.requiredParameters);
      if (missingParams.length > 0) {
        result.errors.push(`Missing required parameters: ${missingParams.join(', ')}`);
      }

      // Validate parameter ranges
      const rangeViolations = this.validateParameterRanges(extractedParams, rules.parameterRanges);
      result.warnings.push(...rangeViolations);

      // Calculate compliance score
      result.complianceScore = this.calculateComplianceScore(
        extractedParams,
        rules.requiredParameters,
        rangeViolations.length
      );

      // Determine if model is valid
      result.isValid = result.errors.length === 0 && result.complianceScore >= 80;

      // Generate recommendations
      result.recommendations = this.generateRecommendations(
        extractedParams,
        rules,
        result.complianceScore
      );

    } catch (error) {
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Export SPICE model for specific EDA tool
   */
  public exportForEDATool(
    model: SPICEModel,
    options: EDAExportOptions
  ): string {
    const { tool, format, includeProcessCorners, includeTemperatureRange, includeMonteCarlo } = options;

    let exportedModel = model.modelText;

    // Add EDA-specific headers
    exportedModel = this.addEDAHeaders(exportedModel, tool, format);

    // Add process corners if requested
    if (includeProcessCorners) {
      exportedModel = this.addProcessCorners(exportedModel, ['TT', 'FF', 'SS', 'SF', 'FS']);
    }

    // Add temperature range if requested
    if (includeTemperatureRange) {
      exportedModel = this.addTemperatureRange(exportedModel, { min: -40, max: 125, step: 25 });
    }

    // Add Monte Carlo parameters if requested
    if (includeMonteCarlo) {
      exportedModel = this.addMonteCarloParameters(exportedModel);
    }

    // Add custom parameters if provided
    if (options.customParameters) {
      exportedModel = this.addCustomParameters(exportedModel, options.customParameters);
    }

    return exportedModel;
  }

  /**
   * Get supported foundries and process nodes
   */
  public getSupportedFoundries(): Record<FoundryType, ProcessNode[]> {
    return this.supportedFoundries;
  }

  /**
   * Get EDA tool export formats
   */
  public getEDAExportFormats(): Record<EDATool, string[]> {
    return {
      'Cadence': ['scs', 'mod'],
      'Synopsys': ['sp', 'mod'],
      'Keysight': ['lib', 'mod'],
      'Mentor': ['cir', 'mod'],
      'Generic': ['cir', 'sp', 'mod']
    };
  }

  /**
   * Extract parameters from SPICE model text
   */
  private extractParametersFromSPICE(modelText: string): Record<string, number> {
    const params: Record<string, number> = {};
    
    // Parse SPICE model parameters
    const paramRegex = /(\w+)\s*=\s*([+-]?\d*\.?\d+[eE]?[+-]?\d*)/g;
    let match;
    
    while ((match = paramRegex.exec(modelText)) !== null) {
      const paramName = match[1];
      const paramValue = parseFloat(match[2]);
      if (!isNaN(paramValue)) {
        params[paramName] = paramValue;
      }
    }

    return params;
  }

  /**
   * Validate required parameters are present
   */
  private validateRequiredParameters(
    extractedParams: Record<string, number>,
    requiredParams: string[]
  ): string[] {
    return requiredParams.filter(param => !(param in extractedParams));
  }

  /**
   * Validate parameter ranges
   */
  private validateParameterRanges(
    extractedParams: Record<string, number>,
    parameterRanges: Record<string, { min: number; max: number }>
  ): string[] {
    const violations: string[] = [];

    for (const [paramName, paramValue] of Object.entries(extractedParams)) {
      const range = parameterRanges[paramName];
      if (range) {
        if (paramValue < range.min || paramValue > range.max) {
          violations.push(
            `Parameter ${paramName} (${paramValue}) is outside valid range [${range.min}, ${range.max}]`
          );
        }
      }
    }

    return violations;
  }

  /**
   * Calculate compliance score (0-100)
   */
  private calculateComplianceScore(
    extractedParams: Record<string, number>,
    requiredParams: string[],
    rangeViolations: number
  ): number {
    const totalRequired = requiredParams.length;
    const presentParams = requiredParams.filter(param => param in extractedParams).length;
    
    // Base score from required parameters (80% weight)
    const paramScore = (presentParams / totalRequired) * 80;
    
    // Penalty for range violations (20% weight)
    const violationPenalty = Math.min(rangeViolations * 5, 20);
    
    return Math.max(0, Math.min(100, paramScore - violationPenalty));
  }

  /**
   * Generate recommendations for improving compliance
   */
  private generateRecommendations(
    extractedParams: Record<string, number>,
    rules: any,
    complianceScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (complianceScore < 80) {
      recommendations.push('Model compliance is below 80%. Review and adjust parameters.');
    }

    if (complianceScore < 60) {
      recommendations.push('Significant compliance issues detected. Consider regenerating model with different parameters.');
    }

    // Check for missing critical parameters
    const missingParams = this.validateRequiredParameters(extractedParams, rules.requiredParameters);
    if (missingParams.length > 0) {
      recommendations.push(`Add missing critical parameters: ${missingParams.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Add EDA-specific headers to model
   */
  private addEDAHeaders(modelText: string, tool: EDATool, format: string): string {
    const headers: Record<string, string> = {
      'Cadence': `* Cadence Spectre Model (${format.toUpperCase()})
* Generated by ESpice PDK Compatibility Service
* Foundry: Compatible with major foundries
* Date: ${new Date().toISOString()}
* Tool: ${tool}
`,
      'Synopsys': `* Synopsys HSPICE Model (${format.toUpperCase()})
* Generated by ESpice PDK Compatibility Service
* Foundry: Compatible with major foundries
* Date: ${new Date().toISOString()}
* Tool: ${tool}
`,
      'Keysight': `* Keysight ADS Model (${format.toUpperCase()})
* Generated by ESpice PDK Compatibility Service
* Foundry: Compatible with major foundries
* Date: ${new Date().toISOString()}
* Tool: ${tool}
`,
      'Mentor': `* Mentor Graphics Model (${format.toUpperCase()})
* Generated by ESpice PDK Compatibility Service
* Foundry: Compatible with major foundries
* Date: ${new Date().toISOString()}
* Tool: ${tool}
`,
      'Generic': `* Generic SPICE Model (${format.toUpperCase()})
* Generated by ESpice PDK Compatibility Service
* Foundry: Compatible with major foundries
* Date: ${new Date().toISOString()}
* Tool: ${tool}
`
    };

    return headers[tool] + modelText;
  }

  /**
   * Add process corners to model
   */
  private addProcessCorners(modelText: string, corners: ProcessCorner[]): string {
    let result = modelText;
    
    for (const corner of corners) {
      result += `\n* Process Corner: ${corner}\n`;
      result += `.MODEL ${corner} CORNER\n`;
    }

    return result;
  }

  /**
   * Add temperature range to model
   */
  private addTemperatureRange(modelText: string, tempRange: TemperatureRange): string {
    return modelText + `\n* Temperature Range: ${tempRange.min}°C to ${tempRange.max}°C\n`;
  }

  /**
   * Add Monte Carlo parameters to model
   */
  private addMonteCarloParameters(modelText: string): string {
    return modelText + `
* Monte Carlo Parameters
.MODEL MC MONTE
+ VTH0_MC=0.1
+ K1_MC=0.05
+ K2_MC=0.02
+ K3_MC=0.1
`;
  }

  /**
   * Add custom parameters to model
   */
  private addCustomParameters(modelText: string, customParams: Record<string, any>): string {
    let result = modelText + '\n* Custom Parameters\n';
    
    for (const [key, value] of Object.entries(customParams)) {
      result += `+ ${key}=${value}\n`;
    }

    return result;
  }
}

export default PDKCompatibilityService; 