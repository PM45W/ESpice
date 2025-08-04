import { ASMHEMTParameter, getParameterByName } from './asmHemtParameters';
import { getMeasurementDataByType, getAvailableMeasurementData } from '../data/mockMeasurementData';

export interface ProductSpiceSyncData {
  productId: string;
  availableMeasurementData: string[];
  extractedParameters: Record<string, {
    value: number;
    source: 'datasheet' | 'extraction' | 'manual' | 'default';
    confidence: number;
    lastUpdated: Date;
  }>;
  missingParameters: string[];
  requiredParameters: string[];
  parameterStatus: Record<string, 'complete' | 'missing' | 'no-data' | 'partial'>;
}

export interface MeasurementDataStatus {
  type: string;
  available: boolean;
  lastUpdated?: Date;
  source?: string;
  quality?: 'high' | 'medium' | 'low';
}

export interface ParameterExtractionStatus {
  parameterName: string;
  extracted: boolean;
  value?: number;
  source?: string;
  confidence: number;
  measurementDataRequired: string[];
  measurementDataAvailable: string[];
  missingData: string[];
}

export class ProductSpiceSyncService {
  /**
   * Get synchronization data for a specific product
   */
  static async getProductSyncData(productId: string): Promise<ProductSpiceSyncData> {
    // In real implementation, this would fetch from the database
    const availableData = getAvailableMeasurementData(productId);
    
    // Mock extracted parameters - in real implementation, this would come from the database
    const extractedParameters: Record<string, any> = {
      'voff': {
        value: -2.1,
        source: 'datasheet' as const,
        confidence: 0.95,
        lastUpdated: new Date()
      },
      'u0': {
        value: 170e-3,
        source: 'extraction' as const,
        confidence: 0.88,
        lastUpdated: new Date()
      },
      'vsat': {
        value: 1.9e5,
        source: 'extraction' as const,
        confidence: 0.92,
        lastUpdated: new Date()
      }
    };

    const requiredParameters = ['voff', 'u0', 'vsat', 'tbar', 'epsilon', 'nfactor', 'gamma0i', 'gamma1i'];
    const allParameters = ['voff', 'u0', 'vsat', 'tbar', 'epsilon', 'lambda', 'nfactor', 'cdscd', 'gamma0i', 'gamma1i', 'ua', 'ub', 'uc', 'ute', 'delta', 'at', 'thesat', 'lsg', 'ldg', 'rsc', 'rdc', 'cgso', 'cgdo', 'rth0', 'cth0'];
    
    const missingParameters = allParameters.filter(param => !extractedParameters[param]);
    
    const parameterStatus: Record<string, 'complete' | 'missing' | 'no-data' | 'partial'> = {};
    
    allParameters.forEach(paramName => {
      const param = getParameterByName(paramName);
      if (!param) {
        parameterStatus[paramName] = 'missing';
        return;
      }

      const hasValue = !!extractedParameters[paramName];
      const hasMeasurementData = Object.entries(param.measurementData).some(([key, required]) => {
        if (!required) return false;
        return availableData.includes(key);
      });

      if (param.required && !hasValue) {
        parameterStatus[paramName] = 'missing';
      } else if (param.required && !hasMeasurementData) {
        parameterStatus[paramName] = 'no-data';
      } else if (hasValue && hasMeasurementData) {
        parameterStatus[paramName] = 'complete';
      } else {
        parameterStatus[paramName] = 'partial';
      }
    });

    return {
      productId,
      availableMeasurementData: availableData,
      extractedParameters,
      missingParameters,
      requiredParameters,
      parameterStatus
    };
  }

  /**
   * Get measurement data status for a product
   */
  static async getMeasurementDataStatus(productId: string): Promise<MeasurementDataStatus[]> {
    const availableData = getAvailableMeasurementData(productId);
    const allDataTypes = ['outputCharacteristics', 'transferCharacteristics', 'cvCharacteristics', 'thermalData', 'noiseData'];
    
    return allDataTypes.map(type => ({
      type,
      available: availableData.includes(type),
      lastUpdated: availableData.includes(type) ? new Date() : undefined,
      source: availableData.includes(type) ? 'datasheet' : undefined,
      quality: availableData.includes(type) ? 'high' as const : undefined
    }));
  }

  /**
   * Get parameter extraction status for a product
   */
  static async getParameterExtractionStatus(productId: string): Promise<ParameterExtractionStatus[]> {
    const syncData = await this.getProductSyncData(productId);
    const allParameters = ['voff', 'u0', 'vsat', 'tbar', 'epsilon', 'lambda', 'nfactor', 'cdscd', 'gamma0i', 'gamma1i', 'ua', 'ub', 'uc', 'ute', 'delta', 'at', 'thesat', 'lsg', 'ldg', 'rsc', 'rdc', 'cgso', 'cgdo', 'rth0', 'cth0'];
    
    return allParameters.map(paramName => {
      const param = getParameterByName(paramName);
      const extracted = !!syncData.extractedParameters[paramName];
      const measurementDataRequired = param ? Object.keys(param.measurementData).filter(key => param.measurementData[key as keyof typeof param.measurementData]) : [];
      const measurementDataAvailable = measurementDataRequired.filter(key => syncData.availableMeasurementData.includes(key));
      const missingData = measurementDataRequired.filter(key => !syncData.availableMeasurementData.includes(key));

      return {
        parameterName: paramName,
        extracted,
        value: syncData.extractedParameters[paramName]?.value,
        source: syncData.extractedParameters[paramName]?.source,
        confidence: syncData.extractedParameters[paramName]?.confidence || 0,
        measurementDataRequired,
        measurementDataAvailable,
        missingData
      };
    });
  }

  /**
   * Update parameter value for a product
   */
  static async updateParameterValue(
    productId: string, 
    parameterName: string, 
    value: number, 
    source: 'datasheet' | 'extraction' | 'manual' | 'default' = 'manual'
  ): Promise<void> {
    // In real implementation, this would update the database
    console.log(`Updating parameter ${parameterName} for product ${productId} with value ${value} from source ${source}`);
  }

  /**
   * Get products that need parameter extraction
   */
  static async getProductsNeedingExtraction(): Promise<Array<{
    productId: string;
    productName: string;
    missingRequiredParams: string[];
    missingMeasurementData: string[];
  }>> {
    // Mock implementation - in real implementation, this would query the database
    return [
      {
        productId: 'prod-001',
        productName: 'CoolGaN™ 600V Enhancement Mode HEMT',
        missingRequiredParams: ['tbar', 'epsilon'],
        missingMeasurementData: ['thermalData', 'noiseData']
      },
      {
        productId: 'prod-002',
        productName: '650V SiC MOSFET',
        missingRequiredParams: ['voff', 'u0', 'vsat'],
        missingMeasurementData: ['cvCharacteristics']
      }
    ];
  }

  /**
   * Export parameter data to CSV
   */
  static async exportParameterData(productId: string): Promise<string> {
    const syncData = await this.getProductSyncData(productId);
    const extractionStatus = await this.getParameterExtractionStatus(productId);
    
    const headers = ['Parameter', 'Value', 'Unit', 'Source', 'Confidence', 'Status', 'Required', 'Measurement Data Available'];
    const rows = extractionStatus.map(status => {
      const param = getParameterByName(status.parameterName);
      return [
        status.parameterName,
        status.value?.toString() || '',
        param?.unit || '',
        status.source || '',
        status.confidence.toString(),
        syncData.parameterStatus[status.parameterName] || 'missing',
        param?.required ? 'Yes' : 'No',
        status.measurementDataAvailable.join(', ')
      ];
    });
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Import parameter data from CSV
   */
  static async importParameterData(productId: string, csvData: string): Promise<void> {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const parameterName = values[0];
      const value = parseFloat(values[1]);
      const source = values[3] as 'datasheet' | 'extraction' | 'manual' | 'default';
      
      if (!isNaN(value)) {
        await this.updateParameterValue(productId, parameterName, value, source);
      }
    }
  }

  /**
   * Get parameter extraction recommendations
   */
  static async getExtractionRecommendations(productId: string): Promise<Array<{
    parameterName: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
    suggestedAction: string;
  }>> {
    const syncData = await this.getProductSyncData(productId);
    const recommendations = [];
    
    // Check for missing required parameters
    syncData.missingParameters.forEach(paramName => {
      const param = getParameterByName(paramName);
      if (param?.required) {
        recommendations.push({
          parameterName: paramName,
          priority: 'high' as const,
          reason: 'Required parameter missing',
          suggestedAction: `Extract from ${param.datasheetSection}`
        });
      }
    });
    
    // Check for missing measurement data
    const measurementDataStatus = await this.getMeasurementDataStatus(productId);
    measurementDataStatus.forEach(status => {
      if (!status.available) {
        recommendations.push({
          parameterName: status.type,
          priority: 'medium' as const,
          reason: 'Measurement data not available',
          suggestedAction: 'Upload or extract measurement data'
        });
      }
    });
    
    return recommendations;
  }
} 