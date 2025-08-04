import { db, spiceModelService } from './database';
import { ProductManagementService, ProductWithParameters } from './productManagementService';

export interface SPICEModelTemplate {
  id: string;
  name: string;
  deviceType: string;
  modelFormat: string;
  modelType: 'empirical' | 'physical' | 'hybrid';
  template: {
    parameters: SPICEParameterMapping[];
    subcircuit?: string;
    modelDefinition?: string;
  };
}

export interface SPICEParameterMapping {
  spiceName: string;
  datasheetName: string;
  defaultValue: string;
  unit: string;
  category: string;
  description: string;
  required: boolean;
  calculation?: string; // Formula for derived parameters
}

export interface ExtractionJob {
  id: string;
  productId: string;
  templateId?: string;
  modelType: 'empirical' | 'physical' | 'hybrid';
  modelFormat: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractionResult {
  success: boolean;
  modelId?: string;
  modelContent?: string;
  parameters?: Record<string, string>;
  warnings?: string[];
  errors?: string[];
}

export class ModularSpiceExtractionService {
  private static readonly DEFAULT_TEMPLATES: SPICEModelTemplate[] = [
    // EPC Empirical Model Template
    {
      id: 'epc-empirical',
      name: 'EPC Empirical Model',
      deviceType: 'GaN-HEMT',
      modelFormat: 'EPC',
      modelType: 'empirical',
      template: {
        parameters: [
          { spiceName: 'VTO', datasheetName: 'VGS(th)', defaultValue: '1.4', unit: 'V', category: 'DC', description: 'Threshold voltage', required: true },
          { spiceName: 'KP', datasheetName: 'RDS(on)', defaultValue: '7.5', unit: 'mΩ', category: 'DC', description: 'Transconductance parameter', required: true, calculation: '1/(2*RDS(on))' },
          { spiceName: 'LAMBDA', datasheetName: 'LAMBDA', defaultValue: '0.01', unit: '1/V', category: 'DC', description: 'Channel length modulation', required: false },
          { spiceName: 'RS', datasheetName: 'RDS(on)', defaultValue: '7.5', unit: 'mΩ', category: 'DC', description: 'Source resistance', required: true },
          { spiceName: 'RD', datasheetName: 'RDS(on)', defaultValue: '7.5', unit: 'mΩ', category: 'DC', description: 'Drain resistance', required: true },
          { spiceName: 'RG', datasheetName: 'RG', defaultValue: '1', unit: 'Ω', category: 'AC', description: 'Gate resistance', required: false },
          { spiceName: 'CGS', datasheetName: 'CISS', defaultValue: '1000', unit: 'pF', category: 'AC', description: 'Gate-source capacitance', required: false },
          { spiceName: 'CGD', datasheetName: 'CRSS', defaultValue: '100', unit: 'pF', category: 'AC', description: 'Gate-drain capacitance', required: false },
          { spiceName: 'CDS', datasheetName: 'COSS', defaultValue: '200', unit: 'pF', category: 'AC', description: 'Drain-source capacitance', required: false }
        ],
        subcircuit: `
.SUBCKT {modelName} D G S
* EPC Empirical GaN-HEMT Model
* Parameters: {parameters}
M1 D G S S {modelName}_MOSFET
.MODEL {modelName}_MOSFET NMOS(
+ VTO={VTO}
+ KP={KP}
+ LAMBDA={LAMBDA}
+ RS={RS}
+ RD={RD}
+ RG={RG}
+ CGS={CGS}
+ CGD={CGD}
+ CDS={CDS}
+ )
.ENDS {modelName}
        `
      }
    },
    // ASM Physical Model Template
    {
      id: 'asm-physical',
      name: 'ASM Physical Model',
      deviceType: 'GaN-HEMT',
      modelFormat: 'ASM',
      modelType: 'physical',
      template: {
        parameters: [
          { spiceName: 'VTH0', datasheetName: 'VGS(th)', defaultValue: '1.4', unit: 'V', category: 'DC', description: 'Threshold voltage at VBS=0', required: true },
          { spiceName: 'U0', datasheetName: 'U0', defaultValue: '1200', unit: 'cm²/Vs', category: 'DC', description: 'Low-field mobility', required: true },
          { spiceName: 'TOX', datasheetName: 'TOX', defaultValue: '25', unit: 'nm', category: 'DC', description: 'Gate oxide thickness', required: true },
          { spiceName: 'NSUB', datasheetName: 'NSUB', defaultValue: '1e17', unit: 'cm⁻³', category: 'DC', description: 'Substrate doping', required: true },
          { spiceName: 'L', datasheetName: 'L', defaultValue: '0.5', unit: 'μm', category: 'DC', description: 'Channel length', required: true },
          { spiceName: 'W', datasheetName: 'W', defaultValue: '10', unit: 'mm', category: 'DC', description: 'Channel width', required: true },
          { spiceName: 'CGSO', datasheetName: 'CISS', defaultValue: '1000', unit: 'pF', category: 'AC', description: 'Gate-source overlap capacitance', required: false },
          { spiceName: 'CGDO', datasheetName: 'CRSS', defaultValue: '100', unit: 'pF', category: 'AC', description: 'Gate-drain overlap capacitance', required: false },
          { spiceName: 'CGBO', datasheetName: 'CGBO', defaultValue: '0', unit: 'pF', category: 'AC', description: 'Gate-bulk overlap capacitance', required: false }
        ],
        modelDefinition: `
.MODEL {modelName} NMOS(
+ LEVEL=1
+ VTH0={VTH0}
+ U0={U0}
+ TOX={TOX}
+ NSUB={NSUB}
+ L={L}
+ W={W}
+ CGSO={CGSO}
+ CGDO={CGDO}
+ CGBO={CGBO}
+ )
        `
      }
    },
    // MVSG Physical Model Template
    {
      id: 'mvsg-physical',
      name: 'MVSG Physical Model',
      deviceType: 'GaN-HEMT',
      modelFormat: 'MVSG',
      modelType: 'physical',
      template: {
        parameters: [
          { spiceName: 'VTH0', datasheetName: 'VGS(th)', defaultValue: '1.4', unit: 'V', category: 'DC', description: 'Threshold voltage', required: true },
          { spiceName: 'U0', datasheetName: 'U0', defaultValue: '1200', unit: 'cm²/Vs', category: 'DC', description: 'Low-field mobility', required: true },
          { spiceName: 'TOX', datasheetName: 'TOX', defaultValue: '25', unit: 'nm', category: 'DC', description: 'Gate oxide thickness', required: true },
          { spiceName: 'NSUB', datasheetName: 'NSUB', defaultValue: '1e17', unit: 'cm⁻³', category: 'DC', description: 'Substrate doping', required: true },
          { spiceName: 'L', datasheetName: 'L', defaultValue: '0.5', unit: 'μm', category: 'DC', description: 'Channel length', required: true },
          { spiceName: 'W', datasheetName: 'W', defaultValue: '10', unit: 'mm', category: 'DC', description: 'Channel width', required: true },
          { spiceName: 'VSAT', datasheetName: 'VSAT', defaultValue: '1e7', unit: 'cm/s', category: 'DC', description: 'Saturation velocity', required: true },
          { spiceName: 'THETA', datasheetName: 'THETA', defaultValue: '0.1', unit: '1/V', category: 'DC', description: 'Mobility degradation factor', required: true },
          { spiceName: 'ETA', datasheetName: 'ETA', defaultValue: '0.1', unit: '1/V', category: 'DC', description: 'Static feedback factor', required: true }
        ],
        modelDefinition: `
.MODEL {modelName} NMOS(
+ LEVEL=2
+ VTH0={VTH0}
+ U0={U0}
+ TOX={TOX}
+ NSUB={NSUB}
+ L={L}
+ W={W}
+ VSAT={VSAT}
+ THETA={THETA}
+ ETA={ETA}
+ )
        `
      }
    }
  ];

  /**
   * Get available templates for a device type
   */
  static async getTemplates(deviceType?: string, modelType?: string): Promise<SPICEModelTemplate[]> {
    try {
      // For now, just return default templates
      // In a full implementation, you would also query the database for custom templates
      const allTemplates = [...this.DEFAULT_TEMPLATES];

      // Filter by device type and model type if specified
      return allTemplates.filter(template => {
        if (deviceType && template.deviceType !== deviceType) return false;
        if (modelType && template.modelType !== modelType) return false;
        return true;
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw new Error(`Failed to fetch templates: ${error}`);
    }
  }

  /**
   * Create a new extraction job
   */
  static async createExtractionJob(
    productId: string,
    modelType: 'empirical' | 'physical' | 'hybrid',
    modelFormat: string,
    templateId?: string
  ): Promise<ExtractionJob> {
    try {
      const jobId = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
      const now = new Date();
      
      const job: ExtractionJob = {
        id: jobId,
        productId,
        templateId: templateId || '',
        modelType,
        modelFormat,
        status: 'pending',
        progress: 0,
        createdAt: now,
        updatedAt: now
      };

      // Store job in memory for now (in a real app, you'd store this in the database)
      // For simplicity, we'll just return the job object
      return job;
    } catch (error) {
      console.error('Error creating extraction job:', error);
      throw new Error(`Failed to create extraction job: ${error}`);
    }
  }

  /**
   * Execute SPICE model extraction
   */
  static async executeExtraction(
    jobId: string,
    modelType: 'empirical' | 'physical' | 'hybrid',
    modelFormat: string,
    templateId?: string
  ): Promise<ExtractionResult> {
    try {
      // Get product with parameters
      const product = await ProductManagementService.getProductById(jobId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Get template
      const templates = await this.getTemplates(product.deviceType, modelType);
      let template = templates.find(t => t.modelFormat === modelFormat);
      
      if (templateId) {
        template = templates.find(t => t.id === templateId);
      }

      if (!template) {
        throw new Error(`No template found for ${modelFormat} ${modelType} model`);
      }

      // Extract parameters from product
      const extractedParams = await this.extractParameters(product, template);

      // Generate SPICE model
      const modelContent = await this.generateSpiceModel(product, template, extractedParams);

      // Save SPICE model to database
      const spiceModel = await spiceModelService.create({
        productId: product.id,
        modelText: modelContent,
        parameters: Object.entries(extractedParams).map(([name, value]) => ({
          name,
          value: value.toString(),
          category: template.template.parameters.find(p => p.spiceName === name)?.category || 'Unknown',
          source: 'Extracted'
        })),
        version: '1.0'
      });

      return {
        success: true,
        modelId: spiceModel.id,
        modelContent,
        parameters: extractedParams,
        warnings: []
      };

    } catch (error) {
      console.error('Error executing extraction:', error);
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Extract parameters from product using template mapping
   */
  private static async extractParameters(
    product: ProductWithParameters,
    template: SPICEModelTemplate
  ): Promise<Record<string, string>> {
    const extractedParams: Record<string, string> = {};

    for (const paramMapping of template.template.parameters) {
      // Try to find parameter in product parameters
      const productParam = product.parameters.find(p => 
        p.name.toLowerCase().includes(paramMapping.datasheetName.toLowerCase()) ||
        paramMapping.datasheetName.toLowerCase().includes(p.name.toLowerCase())
      );

      if (productParam) {
        extractedParams[paramMapping.spiceName] = productParam.value;
      } else if (paramMapping.calculation) {
        // Calculate derived parameter
        const calculatedValue = this.calculateParameter(paramMapping.calculation, extractedParams);
        extractedParams[paramMapping.spiceName] = calculatedValue;
      } else if (paramMapping.required) {
        // Use default value for required parameters
        extractedParams[paramMapping.spiceName] = paramMapping.defaultValue;
      } else {
        // Optional parameter, use default
        extractedParams[paramMapping.spiceName] = paramMapping.defaultValue;
      }
    }

    return extractedParams;
  }

  /**
   * Calculate derived parameters using formulas
   */
  private static calculateParameter(formula: string, params: Record<string, string>): string {
    try {
      // Replace parameter names with values in formula
      let calculatedFormula = formula;
      for (const [name, value] of Object.entries(params)) {
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        calculatedFormula = calculatedFormula.replace(regex, value);
      }

      // Evaluate the formula (basic arithmetic operations)
      const result = eval(calculatedFormula);
      return result.toString();
    } catch (error) {
      console.warn(`Failed to calculate parameter with formula ${formula}:`, error);
      return '0';
    }
  }

  /**
   * Generate SPICE model content
   */
  private static async generateSpiceModel(
    product: ProductWithParameters,
    template: SPICEModelTemplate,
    parameters: Record<string, string>
  ): Promise<string> {
    const modelName = `${product.partNumber}_${template.modelFormat}`;
    
    let modelContent = '';
    
    if (template.template.subcircuit) {
      // Generate subcircuit model
      modelContent = template.template.subcircuit
        .replace(/{modelName}/g, modelName)
        .replace(/{parameters}/g, Object.entries(parameters)
          .map(([name, value]) => `${name}=${value}`)
          .join('\n+ '));
    } else if (template.template.modelDefinition) {
      // Generate model definition
      modelContent = template.template.modelDefinition
        .replace(/{modelName}/g, modelName)
        .replace(/{parameters}/g, Object.entries(parameters)
          .map(([name, value]) => `${name}=${value}`)
          .join('\n+ '));
    }

    // Add header comment
    const header = `* SPICE Model for ${product.partNumber}
* Generated by ESpice on ${new Date().toISOString()}
* Model Type: ${template.modelType}
* Model Format: ${template.modelFormat}
* Manufacturer: ${product.manufacturer}
* Device Type: ${product.deviceType}
*
`;

    return header + modelContent;
  }

  /**
   * Import empirical model from .lib file (like EPC library)
   */
  static async importEmpiricalModel(
    productId: string,
    libFilePath: string,
    modelName: string
  ): Promise<ExtractionResult> {
    try {
      // For browser environment, we can't directly read files
      // This would need to be handled through file input or Tauri APIs
      const libContent = `* Imported model ${modelName} from ${libFilePath}
* This is a placeholder for the actual model content
.MODEL ${modelName} NMOS(
+ VTO=1.4
+ KP=0.1
+ LAMBDA=0.01
+ RS=0.0075
+ RD=0.0075
+ RG=1
+ CGS=1000p
+ CGD=100p
+ CDS=200p
+ )
`;

      // Parse .lib file to extract model parameters
      const parameters = this.parseLibFile(libContent, modelName);

      // Create SPICE model record
      const spiceModel = await spiceModelService.create({
        productId,
        modelText: libContent,
        parameters: Object.entries(parameters).map(([name, value]) => ({
          name,
          value: value.toString(),
          category: 'DC',
          source: 'Imported'
        })),
        version: '1.0'
      });

      return {
        success: true,
        modelId: spiceModel.id,
        modelContent: libContent,
        parameters
      };

    } catch (error) {
      console.error('Error importing empirical model:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Parse .lib file to extract model parameters
   */
  private static parseLibFile(libContent: string, modelName: string): Record<string, string> {
    const parameters: Record<string, string> = {};
    
    // Find model definition
    const modelRegex = new RegExp(`\\.MODEL\\s+${modelName}\\s+\\w+\\s*\\(([^)]+)\\)`, 'i');
    const match = libContent.match(modelRegex);
    
    if (match) {
      const paramString = match[1];
      const paramRegex = /(\w+)\s*=\s*([^\s,]+)/g;
      let paramMatch;
      
      while ((paramMatch = paramRegex.exec(paramString)) !== null) {
        parameters[paramMatch[1]] = paramMatch[2];
      }
    }
    
    return parameters;
  }

  /**
   * Convert empirical model to physical model
   */
  static async convertToPhysicalModel(
    modelId: string,
    targetFormat: 'ASM' | 'MVSG'
  ): Promise<ExtractionResult> {
    try {
      // Get the empirical model
      const empiricalModel = await spiceModelService.findById(modelId);
      if (!empiricalModel) {
        throw new Error('Model not found');
      }

      // Get product
      const product = await ProductManagementService.getProductById(empiricalModel.productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Get physical template
      const templates = await this.getTemplates(product.deviceType, 'physical');
      const template = templates.find(t => t.modelFormat === targetFormat);

      if (!template) {
        throw new Error(`No template found for ${targetFormat} physical model`);
      }

      // Convert parameters from empirical to physical
      const convertedParams = await this.convertParameters(
        empiricalModel.parameters || [],
        template
      );

      // Generate physical model
      const modelContent = await this.generateSpiceModel(
        product,
        template,
        convertedParams
      );

      // Create new physical model
      const physicalModel = await spiceModelService.create({
        productId: empiricalModel.productId,
        modelText: modelContent,
        parameters: Object.entries(convertedParams).map(([name, value]) => ({
          name,
          value: value.toString(),
          category: template.template.parameters.find(p => p.spiceName === name)?.category || 'Unknown',
          source: 'Converted'
        })),
        version: '1.0'
      });

      return {
        success: true,
        modelId: physicalModel.id,
        modelContent,
        parameters: convertedParams
      };

    } catch (error) {
      console.error('Error converting to physical model:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Convert empirical parameters to physical parameters
   */
  private static async convertParameters(
    empiricalParams: any[],
    physicalTemplate: SPICEModelTemplate
  ): Promise<Record<string, string>> {
    const convertedParams: Record<string, string> = {};
    const empiricalParamMap = new Map(empiricalParams.map(p => [p.name, p.value]));

    for (const paramMapping of physicalTemplate.template.parameters) {
      // Apply conversion rules based on parameter mapping
      switch (paramMapping.spiceName) {
        case 'VTH0':
          convertedParams[paramMapping.spiceName] = empiricalParamMap.get('VTO') || paramMapping.defaultValue;
          break;
        case 'U0':
          // Estimate mobility from transconductance
          const kp = empiricalParamMap.get('KP');
          if (kp) {
            const u0 = (parseFloat(kp) * 2 * 1e6).toString(); // Rough estimation
            convertedParams[paramMapping.spiceName] = u0;
          } else {
            convertedParams[paramMapping.spiceName] = paramMapping.defaultValue;
          }
          break;
        default:
          convertedParams[paramMapping.spiceName] = paramMapping.defaultValue;
      }
    }

    return convertedParams;
  }

  /**
   * Get extraction job status
   */
  static async getJobStatus(jobId: string): Promise<ExtractionJob | null> {
    try {
      // For now, return a mock job status
      // In a real implementation, this would query the database
      return {
        id: jobId,
        productId: '',
        modelType: 'empirical',
        modelFormat: 'EPC',
        status: 'completed',
        progress: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting job status:', error);
      throw new Error(`Failed to get job status: ${error}`);
    }
  }

  /**
   * Get all SPICE models for a product
   */
  static async getProductModels(productId: string): Promise<any[]> {
    try {
      const models = await db.spiceModels.where('productId').equals(productId).toArray();
      return models;
    } catch (error) {
      console.error('Error getting product models:', error);
      throw new Error(`Failed to get product models: ${error}`);
    }
  }
} 