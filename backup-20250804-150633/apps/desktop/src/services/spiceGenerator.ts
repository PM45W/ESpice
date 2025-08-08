import type { Parameter, SPICEModel, Product } from '../types/index';
import { 
  SPICETemplate, 
  ParameterMapping, 
  parameterMappingService,
  ValidationRule
} from './spiceTemplates';

// Re-export types for components to use
export type { SPICETemplate, ParameterMapping, ValidationRule } from './spiceTemplates';

export interface GenerationOptions {
  templateId: string;
  deviceName: string;
  modelName?: string;
  subcircuitName?: string;
  includeSubcircuit?: boolean;
  includeComments?: boolean;
  exportFormat?: 'ltspice' | 'kicad' | 'generic';
}

export interface GenerationResult {
  success: boolean;
  model?: SPICEModel;
  spiceText?: string;
  validationErrors: string[];
  warnings: string[];
  mappingConfidence: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class SPICEModelGenerator {
  private mappingService = parameterMappingService;

  /**
   * Generate SPICE model from datasheet parameters
   */
  public async generateModel(
    product: Product,
    parameters: Parameter[],
    options: GenerationOptions
  ): Promise<GenerationResult> {
    try {
      // Get template
      const template = this.mappingService.getTemplate(options.templateId);
      if (!template) {
        return {
          success: false,
          validationErrors: [`Template not found: ${options.templateId}`],
          warnings: [],
          mappingConfidence: 0
        };
      }

      // Map parameters
      const mappings = this.mappingService.mapParameters(parameters, options.templateId);
      
      // Calculate overall confidence
      const mappingConfidence = this.calculateOverallConfidence(mappings, template);
      
      // Generate parameter values
      const parameterValues = this.generateParameterValues(mappings, template);
      
      // Validate parameters
      const validationResult = this.validateParameters(parameterValues, template);
      
      // Generate SPICE text
      const spiceText = this.generateSPICEText(
        template,
        parameterValues,
        product,
        options
      );
      
      // Create SPICE model object
      const model: SPICEModel = {
        id: this.generateId(),
        productId: product.id,
        modelText: spiceText,
        parameters: parameterValues,
        version: template.version,
        createdAt: new Date(),
        ...(validationResult.isValid && { validatedAt: new Date() })
      };

      return {
        success: true,
        model,
        spiceText,
        validationErrors: validationResult.errors,
        warnings: validationResult.warnings,
        mappingConfidence
      };
    } catch (error) {
      return {
        success: false,
        validationErrors: [`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        mappingConfidence: 0
      };
    }
  }

  /**
   * Calculate overall mapping confidence
   */
  private calculateOverallConfidence(
    mappings: ParameterMapping[],
    template: SPICETemplate
  ): number {
    const requiredParams = template.parameters.filter(p => p.required);
    const mappedRequired = mappings.filter(m => m.spiceParam.required);
    
    if (requiredParams.length === 0) return 1.0;
    
    const requiredCoverage = mappedRequired.length / requiredParams.length;
    const avgConfidence = mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length;
    
    return (requiredCoverage * 0.7) + (avgConfidence * 0.3);
  }

  /**
   * Generate parameter values from mappings
   */
  private generateParameterValues(
    mappings: ParameterMapping[],
    template: SPICETemplate
  ): Record<string, string | number> {
    const values: Record<string, string | number> = {};
    
    // Apply mapped values
    for (const mapping of mappings) {
      let value = mapping.datasheetParam.value;
      
      // Apply transformation if needed
      if (mapping.transformValue) {
        value = mapping.transformValue(value);
      }
      
      values[mapping.spiceParam.spiceName] = value;
    }
    
    // Fill in default values for unmapped parameters
    for (const param of template.parameters) {
      if (!(param.spiceName in values) && param.defaultValue !== undefined) {
        values[param.spiceName] = param.defaultValue;
      }
    }
    
    return values;
  }

  /**
   * Validate parameter values against template rules
   */
  private validateParameters(
    values: Record<string, string | number>,
    template: SPICETemplate
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required parameters
    for (const param of template.parameters) {
      if (param.required && !(param.spiceName in values)) {
        errors.push(`Required parameter missing: ${param.name} (${param.spiceName})`);
      }
    }

    // Check parameter ranges
    for (const param of template.parameters) {
      const value = values[param.spiceName];
      if (value !== undefined && param.range) {
        const numValue = Number(value);
        if (numValue < param.range.min || numValue > param.range.max) {
          errors.push(
            `Parameter ${param.name} (${numValue}) is outside valid range [${param.range.min}, ${param.range.max}]`
          );
        }
      }
    }

    // Apply validation rules
    for (const rule of template.validationRules) {
      const ruleResult = this.evaluateValidationRule(rule, values);
      if (!ruleResult.valid) {
        if (rule.type === 'range' || rule.type === 'physical') {
          errors.push(rule.message);
        } else {
          warnings.push(rule.message);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Evaluate a validation rule
   */
  private evaluateValidationRule(
    rule: ValidationRule,
    values: Record<string, string | number>
  ): { valid: boolean; message?: string } {
    try {
      // Simple expression evaluation (for demonstration)
      // In production, use a proper expression evaluator
      const condition = rule.condition;
      
      // Replace parameter names with values
      let expression = condition;
      for (const [param, value] of Object.entries(values)) {
        expression = expression.replace(new RegExp(`\\b${param}\\b`, 'g'), String(value));
      }
      
      // Basic evaluation (simplified)
      if (expression.includes('&&') || expression.includes('||') || expression.includes('>=') || 
          expression.includes('<=') || expression.includes('>') || expression.includes('<')) {
        // This is a simplified check - in production, use a proper expression evaluator
        return { valid: true };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, message: `Validation rule evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Generate SPICE text from template and values
   */
  private generateSPICEText(
    template: SPICETemplate,
    values: Record<string, string | number>,
    product: Product,
    options: GenerationOptions
  ): string {
    const modelName = options.modelName || `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_MODEL`;
    const subcircuitName = options.subcircuitName || `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_SUBCKT`;
    
    let spiceText = '';
    
    // Add header
    if (options.includeComments !== false) {
      spiceText += this.processTemplate(template.headerTemplate, {
        DATE: new Date().toISOString().split('T')[0],
        DEVICE_NAME: product.name,
        MANUFACTURER: product.manufacturer
      });
    }
    
    // Add model
    spiceText += this.processTemplate(template.modelTemplate, {
      MODEL_NAME: modelName,
      ...values
    });
    
    // Add subcircuit if requested
    if (options.includeSubcircuit && template.subcircuitTemplate) {
      spiceText += this.processTemplate(template.subcircuitTemplate, {
        SUBCKT_NAME: subcircuitName,
        MODEL_NAME: modelName,
        ...values
      });
    }
    
    // Format for specific export formats
    if (options.exportFormat) {
      spiceText = this.formatForExport(spiceText, options.exportFormat);
    }
    
    return spiceText;
  }

  /**
   * Process template string with variable substitution
   */
  private processTemplate(
    template: string,
    variables: Record<string, string | number>
  ): string {
    let processed = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      processed = processed.replace(regex, String(value));
    }
    
    return processed;
  }

  /**
   * Format SPICE text for different export formats
   */
  private formatForExport(spiceText: string, format: 'ltspice' | 'kicad' | 'generic'): string {
    switch (format) {
      case 'ltspice':
        return this.formatForLTSpice(spiceText);
      case 'kicad':
        return this.formatForKiCad(spiceText);
      default:
        return spiceText;
    }
  }

  /**
   * Format for LTSpice compatibility
   */
  private formatForLTSpice(spiceText: string): string {
    // LTSpice specific formatting
    return spiceText
      .replace(/\n\+/g, '\n+')  // Ensure proper continuation lines
      .replace(/\*\s*$/gm, '*') // Clean up comment lines
      .trim();
  }

  /**
   * Format for KiCad compatibility
   */
  private formatForKiCad(spiceText: string): string {
    // KiCad specific formatting
    return spiceText
      .replace(/\.MODEL/g, '.model')  // KiCad prefers lowercase
      .replace(/\.SUBCKT/g, '.subckt')
      .replace(/\.ENDS/g, '.ends')
      .trim();
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
  }

  /**
   * Get available templates for a device type
   */
  public getAvailableTemplates(deviceType: string): SPICETemplate[] {
    return this.mappingService.getTemplatesForDeviceType(deviceType);
  }

  /**
   * Get template by ID
   */
  public getTemplate(templateId: string): SPICETemplate | undefined {
    return this.mappingService.getTemplate(templateId);
  }

  /**
   * Preview parameter mapping for a template
   */
  public previewParameterMapping(
    parameters: Parameter[],
    templateId: string
  ): ParameterMapping[] {
    return this.mappingService.mapParameters(parameters, templateId);
  }

  /**
   * Validate a SPICE model text
   */
  public validateSPICEText(spiceText: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic SPICE syntax validation
    const lines = spiceText.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('*')) continue;
      
      // Check for basic SPICE syntax errors
      if (line.startsWith('.MODEL') || line.startsWith('.model')) {
        if (!line.includes('(') || !line.includes(')')) {
          errors.push(`Line ${i + 1}: Invalid .MODEL syntax`);
        }
      }
      
      if (line.startsWith('.SUBCKT') || line.startsWith('.subckt')) {
        if (line.split(/\s+/).length < 3) {
          errors.push(`Line ${i + 1}: Invalid .SUBCKT syntax - missing nodes`);
        }
      }
    }

    // Check for balanced subcircuit definitions
    const subcktCount = (spiceText.match(/\.SUBCKT|\.subckt/gi) || []).length;
    const endsCount = (spiceText.match(/\.ENDS|\.ends/gi) || []).length;
    
    if (subcktCount !== endsCount) {
      errors.push('Unbalanced .SUBCKT/.ENDS statements');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export singleton instance
export const spiceModelGenerator = new SPICEModelGenerator(); 