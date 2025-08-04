import type { ExtractedParameter } from '../types/pdf';

// Semiconductor parameter domain knowledge
export interface ParameterDefinition {
  name: string;
  symbol: string;
  unit: string;
  typicalRange: [number, number];
  description: string;
  category: 'electrical' | 'thermal' | 'mechanical' | 'other';
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  type: 'range' | 'pattern' | 'unit' | 'format';
  value: any;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// Common semiconductor parameters with validation rules
export const SEMICONDUCTOR_PARAMETERS: ParameterDefinition[] = [
  {
    name: 'Threshold Voltage',
    symbol: 'VTH',
    unit: 'V',
    typicalRange: [0.5, 5.0],
    description: 'Gate-source voltage at which drain current starts to flow',
    category: 'electrical',
    validationRules: [
      { type: 'range', value: [0.1, 10.0], message: 'VTH should be between 0.1V and 10V', severity: 'warning' },
      { type: 'unit', value: ['V', 'v', 'volts'], message: 'VTH should be in volts', severity: 'error' }
    ]
  },
  {
    name: 'On-Resistance',
    symbol: 'RDS(on)',
    unit: 'Ω',
    typicalRange: [0.01, 100],
    description: 'Drain-source on-resistance',
    category: 'electrical',
    validationRules: [
      { type: 'range', value: [0.001, 1000], message: 'RDS(on) should be between 1mΩ and 1kΩ', severity: 'warning' },
      { type: 'unit', value: ['Ω', 'ohm', 'ohms', 'mΩ', 'kΩ'], message: 'RDS(on) should be in ohms', severity: 'error' }
    ]
  },
  {
    name: 'Drain-Source Saturation Current',
    symbol: 'IDSS',
    unit: 'A',
    typicalRange: [0.1, 100],
    description: 'Drain-source saturation current',
    category: 'electrical',
    validationRules: [
      { type: 'range', value: [0.001, 1000], message: 'IDSS should be between 1mA and 1kA', severity: 'warning' },
      { type: 'unit', value: ['A', 'a', 'amps', 'mA', 'kA'], message: 'IDSS should be in amperes', severity: 'error' }
    ]
  },
  {
    name: 'Breakdown Voltage',
    symbol: 'BVDSS',
    unit: 'V',
    typicalRange: [20, 1000],
    description: 'Drain-source breakdown voltage',
    category: 'electrical',
    validationRules: [
      { type: 'range', value: [1, 10000], message: 'BVDSS should be between 1V and 10kV', severity: 'warning' },
      { type: 'unit', value: ['V', 'v', 'volts', 'kV'], message: 'BVDSS should be in volts', severity: 'error' }
    ]
  },
  {
    name: 'Input Capacitance',
    symbol: 'CISS',
    unit: 'F',
    typicalRange: [0.1, 1000],
    description: 'Input capacitance',
    category: 'electrical',
    validationRules: [
      { type: 'range', value: [0.001, 10000], message: 'CISS should be between 1pF and 10nF', severity: 'warning' },
      { type: 'unit', value: ['F', 'f', 'farads', 'pF', 'nF', 'µF'], message: 'CISS should be in farads', severity: 'error' }
    ]
  },
  {
    name: 'Output Capacitance',
    symbol: 'COSS',
    unit: 'F',
    typicalRange: [0.1, 1000],
    description: 'Output capacitance',
    category: 'electrical',
    validationRules: [
      { type: 'range', value: [0.001, 10000], message: 'COSS should be between 1pF and 10nF', severity: 'warning' },
      { type: 'unit', value: ['F', 'f', 'farads', 'pF', 'nF', 'µF'], message: 'COSS should be in farads', severity: 'error' }
    ]
  },
  {
    name: 'Reverse Transfer Capacitance',
    symbol: 'CRSS',
    unit: 'F',
    typicalRange: [0.1, 100],
    description: 'Reverse transfer capacitance',
    category: 'electrical',
    validationRules: [
      { type: 'range', value: [0.001, 1000], message: 'CRSS should be between 1pF and 1nF', severity: 'warning' },
      { type: 'unit', value: ['F', 'f', 'farads', 'pF', 'nF'], message: 'CRSS should be in farads', severity: 'error' }
    ]
  },
  {
    name: 'Gate Charge',
    symbol: 'QG',
    unit: 'C',
    typicalRange: [1, 1000],
    description: 'Total gate charge',
    category: 'electrical',
    validationRules: [
      { type: 'range', value: [0.1, 10000], message: 'QG should be between 0.1nC and 10µC', severity: 'warning' },
      { type: 'unit', value: ['C', 'c', 'coulombs', 'nC', 'µC'], message: 'QG should be in coulombs', severity: 'error' }
    ]
  },
  {
    name: 'Turn-On Time',
    symbol: 'tON',
    unit: 's',
    typicalRange: [1, 1000],
    description: 'Turn-on time',
    category: 'electrical',
    validationRules: [
      { type: 'range', value: [0.1, 10000], message: 'tON should be between 0.1ns and 10µs', severity: 'warning' },
      { type: 'unit', value: ['s', 'sec', 'seconds', 'ns', 'µs', 'ms'], message: 'tON should be in seconds', severity: 'error' }
    ]
  },
  {
    name: 'Turn-Off Time',
    symbol: 'tOFF',
    unit: 's',
    typicalRange: [1, 1000],
    description: 'Turn-off time',
    category: 'electrical',
    validationRules: [
      { type: 'range', value: [0.1, 10000], message: 'tOFF should be between 0.1ns and 10µs', severity: 'warning' },
      { type: 'unit', value: ['s', 'sec', 'seconds', 'ns', 'µs', 'ms'], message: 'tOFF should be in seconds', severity: 'error' }
    ]
  },
  {
    name: 'Junction Temperature',
    symbol: 'TJ',
    unit: '°C',
    typicalRange: [-40, 175],
    description: 'Junction temperature',
    category: 'thermal',
    validationRules: [
      { type: 'range', value: [-55, 200], message: 'TJ should be between -55°C and 200°C', severity: 'warning' },
      { type: 'unit', value: ['°C', 'C', 'celsius', 'K', 'kelvin'], message: 'TJ should be in temperature units', severity: 'error' }
    ]
  },
  {
    name: 'Thermal Resistance',
    symbol: 'RTH',
    unit: '°C/W',
    typicalRange: [0.1, 100],
    description: 'Thermal resistance junction-to-case',
    category: 'thermal',
    validationRules: [
      { type: 'range', value: [0.01, 1000], message: 'RTH should be between 0.01°C/W and 1000°C/W', severity: 'warning' },
      { type: 'unit', value: ['°C/W', 'C/W', 'K/W'], message: 'RTH should be in thermal resistance units', severity: 'error' }
    ]
  }
];

export class ParameterValidationService {
  private static instance: ParameterValidationService;
  private parameterDefinitions: Map<string, ParameterDefinition> = new Map();

  constructor() {
    this.initializeParameterDefinitions();
  }

  public static getInstance(): ParameterValidationService {
    if (!ParameterValidationService.instance) {
      ParameterValidationService.instance = new ParameterValidationService();
    }
    return ParameterValidationService.instance;
  }

  private initializeParameterDefinitions(): void {
    SEMICONDUCTOR_PARAMETERS.forEach(param => {
      this.parameterDefinitions.set(param.symbol.toLowerCase(), param);
      this.parameterDefinitions.set(param.name.toLowerCase(), param);
    });
  }

  /**
   * Validate and enhance a parameter with domain knowledge
   */
  public validateParameter(parameter: ExtractedParameter): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      confidence: parameter.confidence,
      suggestions: [],
      warnings: [],
      errors: [],
      enhancedParameter: { ...parameter }
    };

    // Find matching parameter definition
    const definition = this.findParameterDefinition(parameter.name);
    
    if (definition) {
      // Apply validation rules
      this.applyValidationRules(parameter, definition, result);
      
      // Enhance parameter with definition data
      this.enhanceParameter(parameter, definition, result);
    } else {
      // Unknown parameter - apply general validation
      this.applyGeneralValidation(parameter, result);
    }

    // Update confidence based on validation results
    result.confidence = this.calculateConfidence(result);

    return result;
  }

  /**
   * Find parameter definition by name or symbol
   */
  private findParameterDefinition(name: string): ParameterDefinition | undefined {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    for (const [key, definition] of this.parameterDefinitions) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName)) {
        return definition;
      }
    }
    
    return undefined;
  }

  /**
   * Apply validation rules from parameter definition
   */
  private applyValidationRules(
    parameter: ExtractedParameter, 
    definition: ParameterDefinition, 
    result: ValidationResult
  ): void {
    definition.validationRules.forEach(rule => {
      switch (rule.type) {
        case 'range':
          this.validateRange(parameter, rule, result);
          break;
        case 'unit':
          this.validateUnit(parameter, rule, result);
          break;
        case 'pattern':
          this.validatePattern(parameter, rule, result);
          break;
        case 'format':
          this.validateFormat(parameter, rule, result);
          break;
      }
    });
  }

  /**
   * Validate parameter value range
   */
  private validateRange(parameter: ExtractedParameter, rule: ValidationRule, result: ValidationResult): void {
    if (typeof parameter.value === 'number') {
      const [min, max] = rule.value as [number, number];
      if (parameter.value < min || parameter.value > max) {
        if (rule.severity === 'error') {
          result.errors.push(rule.message);
          result.isValid = false;
        } else {
          result.warnings.push(rule.message);
        }
      }
    }
  }

  /**
   * Validate parameter unit
   */
  private validateUnit(parameter: ExtractedParameter, rule: ValidationRule, result: ValidationResult): void {
    if (parameter.unit) {
      const validUnits = rule.value as string[];
      const normalizedUnit = parameter.unit.toLowerCase().replace(/[^a-z]/g, '');
      const isValidUnit = validUnits.some(unit => 
        normalizedUnit.includes(unit.toLowerCase().replace(/[^a-z]/g, ''))
      );
      
      if (!isValidUnit) {
        if (rule.severity === 'error') {
          result.errors.push(rule.message);
          result.isValid = false;
        } else {
          result.warnings.push(rule.message);
        }
      }
    }
  }

  /**
   * Validate parameter pattern
   */
  private validatePattern(parameter: ExtractedParameter, rule: ValidationRule, result: ValidationResult): void {
    const pattern = rule.value as RegExp;
    const value = String(parameter.value);
    
    if (!pattern.test(value)) {
      if (rule.severity === 'error') {
        result.errors.push(rule.message);
        result.isValid = false;
      } else {
        result.warnings.push(rule.message);
      }
    }
  }

  /**
   * Validate parameter format
   */
  private validateFormat(parameter: ExtractedParameter, rule: ValidationRule, result: ValidationResult): void {
    // Implement format validation logic
    // This could check for scientific notation, decimal places, etc.
  }

  /**
   * Apply general validation for unknown parameters
   */
  private applyGeneralValidation(parameter: ExtractedParameter, result: ValidationResult): void {
    // Check for reasonable value ranges
    if (typeof parameter.value === 'number') {
      if (parameter.value < 0 && !this.canBeNegative(parameter.name)) {
        result.warnings.push(`${parameter.name} should not be negative`);
      }
      
      if (parameter.value === 0 && this.shouldNotBeZero(parameter.name)) {
        result.warnings.push(`${parameter.name} should not be zero`);
      }
    }

    // Check for missing units
    if (!parameter.unit && this.requiresUnit(parameter.name)) {
      result.warnings.push(`${parameter.name} should have a unit specified`);
    }
  }

  /**
   * Enhance parameter with definition data
   */
  private enhanceParameter(
    parameter: ExtractedParameter, 
    definition: ParameterDefinition, 
    result: ValidationResult
  ): void {
    const enhanced = result.enhancedParameter;
    
    // Add symbol if missing
    if (!enhanced.symbol) {
      enhanced.symbol = definition.symbol;
    }
    
    // Add unit if missing
    if (!enhanced.unit) {
      enhanced.unit = definition.unit;
    }
    
    // Add description
    enhanced.description = definition.description;
    
    // Update data type
    enhanced.dataType = definition.category;
    
    // Add suggestions for improvement
    if (typeof enhanced.value === 'number') {
      const [min, max] = definition.typicalRange;
      if (enhanced.value < min) {
        result.suggestions.push(`Consider if ${enhanced.name} value is too low (typical range: ${min}-${max}${definition.unit})`);
      } else if (enhanced.value > max) {
        result.suggestions.push(`Consider if ${enhanced.name} value is too high (typical range: ${min}-${max}${definition.unit})`);
      }
    }
  }

  /**
   * Calculate confidence based on validation results
   */
  private calculateConfidence(result: ValidationResult): number {
    let confidence = result.confidence;
    
    // Reduce confidence for errors
    confidence -= result.errors.length * 0.2;
    
    // Slightly reduce confidence for warnings
    confidence -= result.warnings.length * 0.05;
    
    // Increase confidence for good suggestions
    confidence += result.suggestions.length * 0.02;
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Helper methods for general validation
   */
  private canBeNegative(name: string): boolean {
    const negativeParams = ['voltage', 'vth', 'vgs', 'vds', 'temperature', 'tj'];
    return negativeParams.some(param => name.toLowerCase().includes(param));
  }

  private shouldNotBeZero(name: string): boolean {
    const nonZeroParams = ['current', 'ids', 'idss', 'resistance', 'rds', 'capacitance', 'ciss', 'coss', 'crss'];
    return nonZeroParams.some(param => name.toLowerCase().includes(param));
  }

  private requiresUnit(name: string): boolean {
    const unitParams = ['voltage', 'current', 'resistance', 'capacitance', 'charge', 'time', 'temperature', 'power'];
    return unitParams.some(param => name.toLowerCase().includes(param));
  }

  /**
   * Validate multiple parameters at once
   */
  public validateParameters(parameters: ExtractedParameter[]): ValidationResult[] {
    return parameters.map(param => this.validateParameter(param));
  }

  /**
   * Get parameter definition by symbol
   */
  public getParameterDefinition(symbol: string): ParameterDefinition | undefined {
    return this.parameterDefinitions.get(symbol.toLowerCase());
  }

  /**
   * Get all parameter definitions
   */
  public getAllParameterDefinitions(): ParameterDefinition[] {
    return Array.from(this.parameterDefinitions.values());
  }

  /**
   * Add custom parameter definition
   */
  public addParameterDefinition(definition: ParameterDefinition): void {
    this.parameterDefinitions.set(definition.symbol.toLowerCase(), definition);
    this.parameterDefinitions.set(definition.name.toLowerCase(), definition);
  }

  /**
   * Get validation statistics
   */
  public getValidationStats(validationResults: ValidationResult[]): ValidationStats {
    const stats: ValidationStats = {
      total: validationResults.length,
      valid: 0,
      invalid: 0,
      warnings: 0,
      errors: 0,
      averageConfidence: 0,
      parameterTypes: {
        electrical: 0,
        thermal: 0,
        mechanical: 0,
        other: 0
      }
    };

    let totalConfidence = 0;

    validationResults.forEach(result => {
      if (result.isValid) {
        stats.valid++;
      } else {
        stats.invalid++;
      }

      stats.warnings += result.warnings.length;
      stats.errors += result.errors.length;
      totalConfidence += result.confidence;

      const category = result.enhancedParameter.dataType;
      if (category in stats.parameterTypes) {
        stats.parameterTypes[category as keyof typeof stats.parameterTypes]++;
      }
    });

    stats.averageConfidence = stats.total > 0 ? totalConfidence / stats.total : 0;

    return stats;
  }
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  suggestions: string[];
  warnings: string[];
  errors: string[];
  enhancedParameter: ExtractedParameter;
}

export interface ValidationStats {
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  errors: number;
  averageConfidence: number;
  parameterTypes: {
    electrical: number;
    thermal: number;
    mechanical: number;
    other: number;
  };
} 