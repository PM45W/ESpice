import type { SPICEModel } from '../types';

// Silicon Validation Types
export interface SiliconDataPoint {
  voltage: number;
  current: number;
  temperature: number;
  frequency?: number;
  timestamp: Date;
  source: 'measurement' | 'simulation' | 'datasheet';
  confidence: number;
}

export interface SiliconValidationResult {
  isValid: boolean;
  accuracyScore: number; // 0-100
  correlationCoefficient: number; // -1 to 1
  meanAbsoluteError: number;
  rootMeanSquareError: number;
  maxError: number;
  validationPoints: number;
  temperatureRange: {
    min: number;
    max: number;
  };
  voltageRange: {
    min: number;
    max: number;
  };
  warnings: string[];
  errors: string[];
  recommendations: string[];
  validatedAt: Date;
}

export interface ValidationMetrics {
  dcAccuracy: number;
  acAccuracy: number;
  temperatureAccuracy: number;
  switchingAccuracy: number;
  overallAccuracy: number;
}

export class SiliconValidationService {
  private static instance: SiliconValidationService;

  public static getInstance(): SiliconValidationService {
    if (!SiliconValidationService.instance) {
      SiliconValidationService.instance = new SiliconValidationService();
    }
    return SiliconValidationService.instance;
  }

  /**
   * Validate SPICE model against silicon measurement data
   */
  public validateAgainstSiliconData(
    model: SPICEModel,
    siliconData: SiliconDataPoint[],
    validationOptions: {
      temperatureRange?: { min: number; max: number };
      voltageRange?: { min: number; max: number };
      frequencyRange?: { min: number; max: number };
      tolerance?: number; // Percentage tolerance for validation
    } = {}
  ): SiliconValidationResult {
    const tolerance = validationOptions.tolerance || 5; // Default 5% tolerance

    try {
      // Filter data based on validation options
      const filteredData = this.filterDataByRange(siliconData, validationOptions);
      
      if (filteredData.length === 0) {
        return this.createErrorResult('No silicon data points within specified ranges');
      }

      // Extract model parameters
      const modelParams = this.extractModelParameters(model);
      
      // Generate simulated data points
      const simulatedData = this.generateSimulatedData(modelParams, filteredData);
      
      // Compare simulated vs measured data
      const comparison = this.compareDataPoints(filteredData, simulatedData, tolerance);
      
      // Calculate validation metrics
      const metrics = this.calculateValidationMetrics(comparison);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics, modelParams);
      
      return {
        isValid: metrics.overallAccuracy >= 90,
        accuracyScore: metrics.overallAccuracy,
        correlationCoefficient: this.calculateCorrelation(filteredData, simulatedData),
        meanAbsoluteError: comparison.meanAbsoluteError,
        rootMeanSquareError: comparison.rootMeanSquareError,
        maxError: comparison.maxError,
        validationPoints: filteredData.length,
        temperatureRange: {
          min: Math.min(...filteredData.map(d => d.temperature)),
          max: Math.max(...filteredData.map(d => d.temperature))
        },
        voltageRange: {
          min: Math.min(...filteredData.map(d => d.voltage)),
          max: Math.max(...filteredData.map(d => d.voltage))
        },
        warnings: comparison.warnings,
        errors: comparison.errors,
        recommendations,
        validatedAt: new Date()
      };

    } catch (error) {
      console.error('Silicon validation error:', error);
      return this.createErrorResult(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate comprehensive validation metrics
   */
  private calculateValidationMetrics(comparison: any): ValidationMetrics {
    const { simulatedData, measuredData } = comparison;
    
    // Calculate different accuracy metrics
    const dcAccuracy = this.calculateDCAccuracy(measuredData, simulatedData);
    const acAccuracy = this.calculateACAccuracy(measuredData, simulatedData);
    const temperatureAccuracy = this.calculateTemperatureAccuracy(measuredData, simulatedData);
    const switchingAccuracy = this.calculateSwitchingAccuracy(measuredData, simulatedData);
    
    // Overall accuracy as weighted average
    const overallAccuracy = (
      dcAccuracy * 0.4 + 
      acAccuracy * 0.3 + 
      temperatureAccuracy * 0.2 + 
      switchingAccuracy * 0.1
    );

    return {
      dcAccuracy,
      acAccuracy,
      temperatureAccuracy,
      switchingAccuracy,
      overallAccuracy
    };
  }

  /**
   * Calculate DC accuracy (static characteristics)
   */
  private calculateDCAccuracy(measured: SiliconDataPoint[], simulated: SiliconDataPoint[]): number {
    const dcErrors = measured
      .filter((_, index) => simulated[index] && !simulated[index].frequency)
      .map((point, index) => {
        const simPoint = simulated[index];
        return Math.abs((point.current - simPoint.current) / point.current) * 100;
      });

    if (dcErrors.length === 0) return 0;
    
    const meanError = dcErrors.reduce((sum, error) => sum + error, 0) / dcErrors.length;
    return Math.max(0, 100 - meanError);
  }

  /**
   * Calculate AC accuracy (frequency response)
   */
  private calculateACAccuracy(measured: SiliconDataPoint[], simulated: SiliconDataPoint[]): number {
    const acErrors = measured
      .filter((_, index) => simulated[index] && simulated[index].frequency)
      .map((point, index) => {
        const simPoint = simulated[index];
        return Math.abs((point.current - simPoint.current) / point.current) * 100;
      });

    if (acErrors.length === 0) return 100; // No AC data, assume perfect
    
    const meanError = acErrors.reduce((sum, error) => sum + error, 0) / acErrors.length;
    return Math.max(0, 100 - meanError);
  }

  /**
   * Calculate temperature accuracy
   */
  private calculateTemperatureAccuracy(measured: SiliconDataPoint[], simulated: SiliconDataPoint[]): number {
    const tempErrors = measured
      .filter((_, index) => simulated[index])
      .map((point, index) => {
        const simPoint = simulated[index];
        // Temperature-dependent error calculation
        const tempFactor = 1 + Math.abs(point.temperature - 25) / 100; // Temperature scaling
        return Math.abs((point.current - simPoint.current) / point.current) * 100 * tempFactor;
      });

    if (tempErrors.length === 0) return 0;
    
    const meanError = tempErrors.reduce((sum, error) => sum + error, 0) / tempErrors.length;
    return Math.max(0, 100 - meanError);
  }

  /**
   * Calculate switching accuracy (transient response)
   */
  private calculateSwitchingAccuracy(measured: SiliconDataPoint[], simulated: SiliconDataPoint[]): number {
    // For switching accuracy, we look at rapid changes in current/voltage
    const switchingErrors = measured
      .filter((_, index) => index > 0 && simulated[index])
      .map((point, index) => {
        const prevPoint = measured[index - 1];
        const simPoint = simulated[index];
        const prevSimPoint = simulated[index - 1];
        
        const measuredSlope = (point.current - prevPoint.current) / (point.voltage - prevPoint.voltage);
        const simulatedSlope = (simPoint.current - prevSimPoint.current) / (simPoint.voltage - prevSimPoint.voltage);
        
        return Math.abs((measuredSlope - simulatedSlope) / measuredSlope) * 100;
      });

    if (switchingErrors.length === 0) return 100;
    
    const meanError = switchingErrors.reduce((sum, error) => sum + error, 0) / switchingErrors.length;
    return Math.max(0, 100 - meanError);
  }

  /**
   * Filter silicon data based on validation ranges
   */
  private filterDataByRange(
    data: SiliconDataPoint[], 
    options: {
      temperatureRange?: { min: number; max: number };
      voltageRange?: { min: number; max: number };
      frequencyRange?: { min: number; max: number };
    }
  ): SiliconDataPoint[] {
    return data.filter(point => {
      if (options.temperatureRange) {
        if (point.temperature < options.temperatureRange.min || 
            point.temperature > options.temperatureRange.max) {
          return false;
        }
      }
      
      if (options.voltageRange) {
        if (point.voltage < options.voltageRange.min || 
            point.voltage > options.voltageRange.max) {
          return false;
        }
      }
      
      if (options.frequencyRange && point.frequency) {
        if (point.frequency < options.frequencyRange.min || 
            point.frequency > options.frequencyRange.max) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Extract parameters from SPICE model
   */
  private extractModelParameters(model: SPICEModel): Record<string, number> {
    const params: Record<string, number> = {};
    
    // Parse SPICE model text to extract parameters
    const lines = model.modelText.split('\n');
    
    for (const line of lines) {
      const match = line.match(/(\w+)\s*=\s*([+-]?\d*\.?\d+)/);
      if (match) {
        const [, param, value] = match;
        params[param] = parseFloat(value);
      }
    }
    
    return params;
  }

  /**
   * Generate simulated data points based on model parameters
   */
  private generateSimulatedData(
    params: Record<string, number>, 
    referenceData: SiliconDataPoint[]
  ): SiliconDataPoint[] {
    return referenceData.map(point => {
      // Simple SPICE model simulation (this would be more complex in practice)
      const simulatedCurrent = this.simulateCurrent(point.voltage, point.temperature, params);
      
      return {
        ...point,
        current: simulatedCurrent,
        source: 'simulation' as const,
        confidence: 0.9
      };
    });
  }

  /**
   * Simulate current based on voltage, temperature, and model parameters
   */
  private simulateCurrent(voltage: number, temperature: number, params: Record<string, number>): number {
    // Simplified MOSFET current simulation
    const vth = params.VTH0 || 0.7;
    const kp = params.KP || 1e-6;
    const lambda = params.LAMBDA || 0.01;
    const tempFactor = 1 + (temperature - 25) * 0.003; // Temperature coefficient
    
    if (voltage < vth) {
      return 0; // Cutoff region
    }
    
    const vov = voltage - vth;
    const current = 0.5 * kp * vov * vov * (1 + lambda * voltage) * tempFactor;
    
    return Math.max(0, current);
  }

  /**
   * Compare measured vs simulated data points
   */
  private compareDataPoints(
    measured: SiliconDataPoint[], 
    simulated: SiliconDataPoint[], 
    tolerance: number
  ): any {
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalError = 0;
    let maxError = 0;
    let errorCount = 0;

    for (let i = 0; i < measured.length; i++) {
      const measuredPoint = measured[i];
      const simulatedPoint = simulated[i];
      
      if (!simulatedPoint) continue;
      
      const error = Math.abs((measuredPoint.current - simulatedPoint.current) / measuredPoint.current) * 100;
      totalError += error;
      maxError = Math.max(maxError, error);
      errorCount++;
      
      if (error > tolerance) {
        errors.push(`Point ${i + 1}: ${error.toFixed(2)}% error exceeds ${tolerance}% tolerance`);
      } else if (error > tolerance * 0.8) {
        warnings.push(`Point ${i + 1}: ${error.toFixed(2)}% error approaching tolerance limit`);
      }
    }

    const meanError = errorCount > 0 ? totalError / errorCount : 0;
    const rmsError = Math.sqrt(
      measured.reduce((sum, point, i) => {
        const simPoint = simulated[i];
        if (!simPoint) return sum;
        const error = (point.current - simPoint.current) / point.current;
        return sum + error * error;
      }, 0) / errorCount
    );

    return {
      errors,
      warnings,
      simulatedData: simulated,
      measuredData: measured,
      meanAbsoluteError: meanError,
      rootMeanSquareError: rmsError,
      maxError
    };
  }

  /**
   * Calculate correlation coefficient between measured and simulated data
   */
  private calculateCorrelation(measured: SiliconDataPoint[], simulated: SiliconDataPoint[]): number {
    const n = Math.min(measured.length, simulated.length);
    if (n < 2) return 0;

    const measuredCurrents = measured.slice(0, n).map(p => p.current);
    const simulatedCurrents = simulated.slice(0, n).map(p => p.current);

    const meanMeasured = measuredCurrents.reduce((sum, val) => sum + val, 0) / n;
    const meanSimulated = simulatedCurrents.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let denomMeasured = 0;
    let denomSimulated = 0;

    for (let i = 0; i < n; i++) {
      const diffMeasured = measuredCurrents[i] - meanMeasured;
      const diffSimulated = simulatedCurrents[i] - meanSimulated;
      
      numerator += diffMeasured * diffSimulated;
      denomMeasured += diffMeasured * diffMeasured;
      denomSimulated += diffSimulated * diffSimulated;
    }

    const denominator = Math.sqrt(denomMeasured * denomSimulated);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(metrics: ValidationMetrics, params: Record<string, number>): string[] {
    const recommendations: string[] = [];

    if (metrics.overallAccuracy < 90) {
      recommendations.push('Model accuracy below 90%. Consider parameter optimization.');
    }

    if (metrics.dcAccuracy < 85) {
      recommendations.push('DC characteristics need improvement. Check threshold voltage and transconductance parameters.');
    }

    if (metrics.acAccuracy < 85) {
      recommendations.push('AC response needs improvement. Verify capacitance and frequency-dependent parameters.');
    }

    if (metrics.temperatureAccuracy < 80) {
      recommendations.push('Temperature dependence needs improvement. Check temperature coefficients.');
    }

    if (metrics.switchingAccuracy < 75) {
      recommendations.push('Switching characteristics need improvement. Verify transient response parameters.');
    }

    // Parameter-specific recommendations
    if (!params.VTH0) {
      recommendations.push('Threshold voltage parameter (VTH0) missing or invalid.');
    }

    if (!params.KP) {
      recommendations.push('Transconductance parameter (KP) missing or invalid.');
    }

    return recommendations;
  }

  /**
   * Create error result
   */
  private createErrorResult(message: string): SiliconValidationResult {
    return {
      isValid: false,
      accuracyScore: 0,
      correlationCoefficient: 0,
      meanAbsoluteError: 0,
      rootMeanSquareError: 0,
      maxError: 0,
      validationPoints: 0,
      temperatureRange: { min: 0, max: 0 },
      voltageRange: { min: 0, max: 0 },
      warnings: [],
      errors: [message],
      recommendations: ['Fix validation errors before proceeding'],
      validatedAt: new Date()
    };
  }
}

export default SiliconValidationService; 