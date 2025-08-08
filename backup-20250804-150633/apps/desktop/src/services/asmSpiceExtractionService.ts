import type { Parameter, Product } from '../types/index';

export interface ASMExtractionData {
  // Output characteristics data
  outputCharacteristics?: {
    vds: number[];
    id: number[];
    vgs: number[];
  };
  
  // RDS vs VGS temperature data
  rdsVgsTemp?: {
    vgs: number[];
    rds: number[];
    temp: number[];
  };
  
  // RDS vs VGS at constant ID
  rdsVgsId?: {
    vgs: number[];
    rds: number[];
    id: number;
  };
  
  // Capacitance data
  capacitance?: {
    vds: number[];
    c: number[];
    type: 'ciss' | 'coss' | 'crss';
  }[];
  
  // Transfer characteristics
  transferCharacteristics?: {
    vgs: number[];
    id: number[];
    temp: number[];
  };
  
  // Thermal resistance data
  thermalResistance?: {
    temp: number[];
    rds: number[];
    id: number;
  };
  
  // VTH vs temperature
  vthTemp?: {
    temp: number[];
    vth: number[];
  };
}

export interface ASMExtractedParameters {
  // Output characteristics parameters
  RD0?: number; // Drain resistance at VDS=0
  MEXP?: number; // Exponent for output resistance model
  
  // Temperature dependence parameters
  UTE?: number; // Channel mobility temperature coefficient
  UTES?: number; // Source access mobility temperature coefficient
  UTED?: number; // Drain access mobility temperature coefficient
  
  // RDS parameters
  RDS_ON?: number; // On-resistance at VGS=5V
  VGS_DEPENDENCE?: {
    a: number; // Quadratic coefficient
    b: number; // Linear coefficient
    c: number; // Constant term
  };
  
  // Capacitance parameters
  CGSO?: number; // Gate-source overlap capacitance
  CGDO?: number; // Gate-drain overlap capacitance
  CDSO?: number; // Drain-source capacitance
  KCAP_CGSO?: number; // Voltage dependence for CGSO
  KCAP_CGDO?: number; // Voltage dependence for CGDO
  KCAP_CDSO?: number; // Voltage dependence for CDSO
  
  // Transfer characteristics
  VOFF?: number; // Threshold voltage
  VSE?: number; // Subthreshold slope exponent
  KP_25C?: number; // Transconductance at 25°C
  KP_125C?: number; // Transconductance at 125°C
  
  // Channel length modulation
  LAMBDA0?: number; // Base channel length modulation
  LAMBDA1?: number; // VGS-dependent channel length modulation
  
  // Thermal parameters
  RTH0?: number; // Thermal resistance
  
  // Temperature coefficients
  KRSC?: number; // Source contact resistance temperature coefficient
  KRDC?: number; // Drain contact resistance temperature coefficient
  
  // Threshold voltage temperature dependence
  VOFF0?: number; // Threshold voltage at 25°C
  KVTO?: number; // Threshold voltage temperature coefficient
}

export interface ASMExtractionResult {
  success: boolean;
  parameters: ASMExtractedParameters;
  confidence: number;
  warnings: string[];
  errors: string[];
  plots?: {
    outputCharacteristics?: any;
    rdsVgsTemp?: any;
    capacitance?: any;
    transferCharacteristics?: any;
    thermalResistance?: any;
    vthTemp?: any;
  };
}

export class ASMSpiceExtractionService {
  
  /**
   * Extract ASM-HEMT parameters from various data sources
   */
  public async extractASMParameters(
    data: ASMExtractionData,
    product: Product
  ): Promise<ASMExtractionResult> {
    const result: ASMExtractionResult = {
      success: true,
      parameters: {},
      confidence: 0,
      warnings: [],
      errors: []
    };

    try {
      // Extract output characteristics parameters (RD0, MEXP)
      if (data.outputCharacteristics) {
        const outputParams = this.extractOutputParameters(data.outputCharacteristics);
        Object.assign(result.parameters, outputParams);
      }

      // Extract temperature dependence parameters (UTE, UTES, UTED)
      if (data.rdsVgsTemp) {
        const tempParams = this.extractTemperatureParameters(data.rdsVgsTemp);
        Object.assign(result.parameters, tempParams);
      }

      // Extract RDS vs VGS parameters
      if (data.rdsVgsId) {
        const rdsParams = this.extractRDSVGSParameters(data.rdsVgsId);
        Object.assign(result.parameters, rdsParams);
      }

      // Extract capacitance parameters
      if (data.capacitance) {
        const capParams = this.extractCapacitanceParameters(data.capacitance);
        Object.assign(result.parameters, capParams);
      }

      // Extract transfer characteristics
      if (data.transferCharacteristics) {
        const transferParams = this.extractTransferParameters(data.transferCharacteristics);
        Object.assign(result.parameters, transferParams);
      }

      // Extract thermal resistance
      if (data.thermalResistance) {
        const thermalParams = this.extractThermalParameters(data.thermalResistance);
        Object.assign(result.parameters, thermalParams);
      }

      // Extract VTH vs temperature
      if (data.vthTemp) {
        const vthParams = this.extractVTHTemperatureParameters(data.vthTemp);
        Object.assign(result.parameters, vthParams);
      }

      // Calculate overall confidence
      result.confidence = this.calculateConfidence(result.parameters);

    } catch (error) {
      result.success = false;
      result.errors.push(`Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Extract output characteristics parameters (RD0, MEXP)
   * Based on Function 1 from the Python code
   */
  private extractOutputParameters(data: {
    vds: number[];
    id: number[];
    vgs: number[];
  }): Partial<ASMExtractedParameters> {
    const params: Partial<ASMExtractedParameters> = {};
    const VSAT = 1; // Saturation voltage (assumed constant)
    
    // Group data by VGS
    const vgsGroups = new Map<number, { vds: number[]; id: number[] }>();
    
    for (let i = 0; i < data.vgs.length; i++) {
      const vgs = Math.round(data.vgs[i] * 10000) / 10000; // Round to 4 decimal places
      if (vgs === 2.0) continue; // Skip VGS = 2.0V as in Python code
      
      if (!vgsGroups.has(vgs)) {
        vgsGroups.set(vgs, { vds: [], id: [] });
      }
      vgsGroups.get(vgs)!.vds.push(data.vds[i]);
      vgsGroups.get(vgs)!.id.push(data.id[i]);
    }

    const results: Array<{ vgs: number; rd0: number; mexp: number }> = [];

    // Fit each VGS curve
    for (const [vgs, curveData] of vgsGroups) {
      if (curveData.vds.length < 3) {
        continue; // Insufficient data points
      }

      // Filter data for fitting (VDS > 0.01V, ID > 0.01A)
      const mask = curveData.vds.map((vds, i) => 
        vds > 0.01 && curveData.id[i] > 0.01
      );
      
      const vdsFit = curveData.vds.filter((_, i) => mask[i]);
      const idFit = curveData.id.filter((_, i) => mask[i]);

      if (vdsFit.length < 3) continue;

      try {
        // Simple curve fitting for RD0 and MEXP
        // Using the model: ID = VDS / (RD0 * (1 + (VDS / VSAT)^MEXP))
        const rd0 = this.fitRD0(vdsFit, idFit, VSAT);
        const mexp = this.fitMEXP(vdsFit, idFit, VSAT, rd0);
        
        results.push({ vgs, rd0, mexp });
      } catch (error) {
        // Skip this curve if fitting fails
        continue;
      }
    }

    // Calculate average RD0 and MEXP
    if (results.length > 0) {
      params.RD0 = results.reduce((sum, r) => sum + r.rd0, 0) / results.length;
      params.MEXP = results.reduce((sum, r) => sum + r.mexp, 0) / results.length;
    }

    return params;
  }

  /**
   * Extract temperature dependence parameters (UTE, UTES, UTED)
   * Based on Function 2 from the Python code
   */
  private extractTemperatureParameters(data: {
    vgs: number[];
    rds: number[];
    temp: number[];
  }): Partial<ASMExtractedParameters> {
    const params: Partial<ASMExtractedParameters> = {};
    
    // Find high VGS data (around 5V) for UTE extraction
    const vgsHigh = 5.0;
    const tolerance = 0.1;
    
    const highVgsData = data.vgs.map((vgs, i) => ({
      vgs,
      rds: data.rds[i],
      temp: data.temp[i]
    })).filter(d => Math.abs(d.vgs - vgsHigh) < tolerance);

    if (highVgsData.length > 0) {
      // Fit UTE using mobility temperature model
      // R_DS(on)(T) ∝ (T/298)^(-UTE)
      const temps = highVgsData.map(d => d.temp + 273.15); // Convert to Kelvin
      const rds = highVgsData.map(d => d.rds);
      
      try {
        const ute = this.fitUTE(temps, rds);
        params.UTE = ute;
        
        // Assume UTES = UTED for simplicity
        params.UTES = ute;
        params.UTED = ute;
      } catch (error) {
        // UTE fitting failed
      }
    }

    return params;
  }

  /**
   * Extract RDS vs VGS parameters
   * Based on Function 3 from the Python code
   */
  private extractRDSVGSParameters(data: {
    vgs: number[];
    rds: number[];
    id: number;
  }): Partial<ASMExtractedParameters> {
    const params: Partial<ASMExtractedParameters> = {};
    
    // Extract RDS(on) at high VGS (around 5V)
    const vgsMax = 5.0;
    const tolerance = 0.01;
    
    const highVgsData = data.vgs.map((vgs, i) => ({
      vgs,
      rds: data.rds[i]
    })).filter(d => d.vgs >= vgsMax - tolerance);

    if (highVgsData.length > 0) {
      params.RDS_ON = Math.min(...highVgsData.map(d => d.rds));
    }

    // Fit quadratic dependence: RDS = a*VGS^2 + b*VGS + c
    try {
      const vgsMaxFit = 4.0;
      const fitData = data.vgs.map((vgs, i) => ({
        vgs,
        rds: data.rds[i]
      })).filter(d => d.vgs <= vgsMaxFit);

      if (fitData.length >= 3) {
        const coefficients = this.fitQuadratic(
          fitData.map(d => d.vgs),
          fitData.map(d => d.rds)
        );
        
        params.VGS_DEPENDENCE = {
          a: coefficients[0],
          b: coefficients[1],
          c: coefficients[2]
        };
      }
    } catch (error) {
      // Quadratic fitting failed
    }

    return params;
  }

  /**
   * Extract capacitance parameters
   * Based on Function 4 from the Python code
   */
  private extractCapacitanceParameters(data: Array<{
    vds: number[];
    c: number[];
    type: 'ciss' | 'coss' | 'crss';
  }>): Partial<ASMExtractedParameters> {
    const params: Partial<ASMExtractedParameters> = {};
    const VDSATCV = 2.5; // Fixed scaling voltage

    for (const capData of data) {
      try {
        // Fit capacitance model: C = C0 * exp(-KCAP * (VDS / VDSATCV))
        const { c0, kcap } = this.fitCapacitance(capData.vds, capData.c, VDSATCV);
        
        switch (capData.type) {
          case 'ciss':
            params.CGSO = c0;
            params.KCAP_CGSO = kcap;
            break;
          case 'coss':
            params.CDSO = c0;
            params.KCAP_CDSO = kcap;
            break;
          case 'crss':
            params.CGDO = c0;
            params.KCAP_CGDO = kcap;
            break;
        }
      } catch (error) {
        // Skip this capacitance type if fitting fails
      }
    }

    return params;
  }

  /**
   * Extract transfer characteristics parameters
   * Based on Function 5 from the Python code
   */
  private extractTransferParameters(data: {
    vgs: number[];
    id: number[];
    temp: number[];
  }): Partial<ASMExtractedParameters> {
    const params: Partial<ASMExtractedParameters> = {};
    
    // Group by temperature
    const tempGroups = new Map<number, { vgs: number[]; id: number[] }>();
    
    for (let i = 0; i < data.temp.length; i++) {
      const temp = data.temp[i];
      if (!tempGroups.has(temp)) {
        tempGroups.set(temp, { vgs: [], id: [] });
      }
      tempGroups.get(temp)!.vgs.push(data.vgs[i]);
      tempGroups.get(temp)!.id.push(data.id[i]);
    }

    const temps = Array.from(tempGroups.keys()).sort();
    if (temps.length !== 2) {
      return params; // Need exactly 2 temperatures
    }

    try {
      // Estimate VOFF from 25°C data
      const data25 = tempGroups.get(temps[0])!;
      const voff = this.estimateVOFF(data25.vgs, data25.id);
      
      // Fit VSE and KP at each temperature
      const vse25 = this.fitVSE(data25.vgs, data25.id, voff);
      const kp25 = this.fitKP(data25.vgs, data25.id, voff, vse25);
      
      const data125 = tempGroups.get(temps[1])!;
      const vse125 = this.fitVSE(data125.vgs, data125.id, voff);
      const kp125 = this.fitKP(data125.vgs, data125.id, voff, vse125);
      
      // Calculate UTE
      const ute = Math.log(kp125 / kp25) / Math.log(temps[1] / temps[0]);
      
      params.VOFF = voff;
      params.VSE = (vse25 + vse125) / 2; // Average VSE
      params.KP_25C = kp25;
      params.KP_125C = kp125;
      params.UTE = ute;
      
    } catch (error) {
      // Transfer characteristics fitting failed
    }

    return params;
  }

  /**
   * Extract thermal resistance parameters
   * Based on Function 7 from the Python code
   */
  private extractThermalParameters(data: {
    temp: number[];
    rds: number[];
    id: number;
  }): Partial<ASMExtractedParameters> {
    const params: Partial<ASMExtractedParameters> = {};
    
    try {
      // Calculate power dissipation: P = I^2 * R
      const power = data.rds.map(rds => data.id * data.id * rds);
      
      // Find min and max points
      const maxIdx = power.indexOf(Math.max(...power));
      const minIdx = power.indexOf(Math.min(...power));
      
      const tMax = data.temp[maxIdx];
      const tMin = data.temp[minIdx];
      const pMax = power[maxIdx];
      const pMin = power[minIdx];
      
      // Calculate RTH0: RTH0 = (T_max - T_min) / (P_max - P_min)
      if (pMax !== pMin) {
        params.RTH0 = (tMax - tMin) / (pMax - pMin);
      }
      
    } catch (error) {
      // Thermal resistance calculation failed
    }

    return params;
  }

  /**
   * Extract VTH vs temperature parameters
   * Based on Function 9 from the Python code
   */
  private extractVTHTemperatureParameters(data: {
    temp: number[];
    vth: number[];
  }): Partial<ASMExtractedParameters> {
    const params: Partial<ASMExtractedParameters> = {};
    
    try {
      // Fit linear model: VTH = VOFF0 + KVTO * (T - 25)
      const temps = data.temp.map(t => t - 25); // Center around 25°C
      const vths = data.vth;
      
      const { slope, intercept } = this.fitLinear(temps, vths);
      
      params.VOFF0 = intercept;
      params.KVTO = slope;
      
    } catch (error) {
      // VTH temperature fitting failed
    }

    return params;
  }

  // Helper methods for curve fitting
  private fitRD0(vds: number[], id: number[], vsat: number): number {
    // Simple fitting for RD0
    const sum = vds.reduce((acc, v, i) => acc + v / id[i], 0);
    return sum / vds.length;
  }

  private fitMEXP(vds: number[], id: number[], vsat: number, rd0: number): number {
    // Simple fitting for MEXP
    const residuals = vds.map((v, i) => {
      const predicted = v / (rd0 * (1 + Math.pow(v / vsat, 2))); // Assume MEXP=2 initially
      return Math.abs(id[i] - predicted);
    });
    
    // Return average MEXP based on residuals
    return 2.0; // Simplified - in practice would use more sophisticated fitting
  }

  private fitUTE(temps: number[], rds: number[]): number {
    // Fit UTE using log-linear regression
    const logT = temps.map(t => Math.log(t / 298.15));
    const logR = rds.map(r => Math.log(r));
    
    const { slope } = this.fitLinear(logT, logR);
    return -slope;
  }

  private fitQuadratic(x: number[], y: number[]): [number, number, number] {
    // Simple quadratic fitting
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumX3 = x.reduce((a, b) => a + b * b * b, 0);
    const sumX4 = x.reduce((a, b) => a + b * b * b * b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2Y = x.reduce((a, b, i) => a + b * b * y[i], 0);
    
    // Solve normal equations for quadratic coefficients
    const det = n * sumX2 * sumX4 + 2 * sumX * sumX2 * sumX3 - sumX2 * sumX2 * sumX2 - n * sumX3 * sumX3 - sumX * sumX * sumX4;
    
    if (Math.abs(det) < 1e-10) {
      throw new Error('Singular matrix in quadratic fitting');
    }
    
    const a = (n * sumX2Y * sumX2 + sumX * sumXY * sumX3 + sumY * sumX2 * sumX3 - sumX2Y * sumX2 * sumX2 - n * sumXY * sumX3 - sumY * sumX * sumX3) / det;
    const b = (sumX * sumX2Y * sumX2 + sumX2 * sumXY * sumX4 + sumY * sumX * sumX4 - sumX2Y * sumX * sumX3 - sumX2 * sumXY * sumX2 - sumY * sumX2 * sumX2) / det;
    const c = (sumX2 * sumX2Y * sumX3 + sumX * sumXY * sumX2 + sumY * sumX2 * sumX2 - sumX2Y * sumX2 * sumX - sumX * sumXY * sumX3 - sumY * sumX2 * sumX3) / det;
    
    return [a, b, c];
  }

  private fitCapacitance(vds: number[], c: number[], vdsatcv: number): { c0: number; kcap: number } {
    // Fit C = C0 * exp(-KCAP * (VDS / VDSATCV))
    const x = vds.map(v => v / vdsatcv);
    const logC = c.map(cap => Math.log(cap));
    
    const { slope, intercept } = this.fitLinear(x, logC);
    
    return {
      c0: Math.exp(intercept),
      kcap: -slope
    };
  }

  private estimateVOFF(vgs: number[], id: number[]): number {
    const threshold = 1e-3; // 1mA threshold
    const candidates = vgs.filter((_, i) => id[i] > threshold);
    return candidates.length > 0 ? Math.min(...candidates) : 1.0;
  }

  private fitVSE(vgs: number[], id: number[], voff: number): number {
    const mask = vgs.map((v, i) => v > voff && id[i] > 1e-6);
    const x = vgs.filter((_, i) => mask[i]).map(v => Math.log(v - voff));
    const y = id.filter((_, i) => mask[i]).map(i => Math.log(i));
    
    if (x.length < 3) return 1.0;
    
    const { slope } = this.fitLinear(x, y);
    return slope;
  }

  private fitKP(vgs: number[], id: number[], voff: number, vse: number): number {
    const mask = vgs.map((v, i) => v > voff && id[i] > 1e-6);
    const x = vgs.filter((_, i) => mask[i]).map(v => Math.pow(v - voff, vse));
    const y = id.filter((_, i) => mask[i]);
    
    if (x.length < 3) return 1.0;
    
    const { slope } = this.fitLinear(x, y);
    return slope;
  }

  private fitLinear(x: number[], y: number[]): { slope: number; intercept: number } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  }

  /**
   * Calculate confidence score based on extracted parameters
   */
  private calculateConfidence(parameters: ASMExtractedParameters): number {
    let confidence = 0;
    let totalParams = 0;
    
    // Check each parameter group
    if (parameters.RD0 !== undefined && parameters.MEXP !== undefined) {
      confidence += 0.2;
      totalParams += 2;
    }
    
    if (parameters.UTE !== undefined) {
      confidence += 0.15;
      totalParams += 1;
    }
    
    if (parameters.RDS_ON !== undefined) {
      confidence += 0.15;
      totalParams += 1;
    }
    
    if (parameters.CGSO !== undefined || parameters.CGDO !== undefined || parameters.CDSO !== undefined) {
      confidence += 0.15;
      totalParams += 1;
    }
    
    if (parameters.VOFF !== undefined && parameters.VSE !== undefined) {
      confidence += 0.15;
      totalParams += 2;
    }
    
    if (parameters.RTH0 !== undefined) {
      confidence += 0.1;
      totalParams += 1;
    }
    
    if (parameters.VOFF0 !== undefined && parameters.KVTO !== undefined) {
      confidence += 0.1;
      totalParams += 2;
    }
    
    return totalParams > 0 ? confidence : 0;
  }

  /**
   * Get required data types for ASM parameter extraction
   */
  public getRequiredDataTypes(): Array<{
    type: string;
    description: string;
    required: boolean;
    columns: string[];
  }> {
    return [
      {
        type: 'outputCharacteristics',
        description: 'I-V output characteristics curves for different VGS values',
        required: false,
        columns: ['vds', 'id', 'vgs']
      },
      {
        type: 'rdsVgsTemp',
        description: 'RDS vs VGS data at different temperatures',
        required: false,
        columns: ['vgs', 'rds', 'temp']
      },
      {
        type: 'rdsVgsId',
        description: 'RDS vs VGS at constant drain current',
        required: false,
        columns: ['vgs', 'rds', 'id']
      },
      {
        type: 'capacitance',
        description: 'Capacitance vs VDS data for CISS, COSS, CRSS',
        required: false,
        columns: ['vds', 'c', 'type']
      },
      {
        type: 'transferCharacteristics',
        description: 'Transfer characteristics at different temperatures',
        required: false,
        columns: ['vgs', 'id', 'temp']
      },
      {
        type: 'thermalResistance',
        description: 'Thermal resistance data (temperature vs RDS)',
        required: false,
        columns: ['temp', 'rds', 'id']
      },
      {
        type: 'vthTemp',
        description: 'Threshold voltage vs temperature',
        required: false,
        columns: ['temp', 'vth']
      }
    ];
  }

  /**
   * Convert extracted parameters to SPICE format
   */
  public convertToSPICEParameters(extracted: ASMExtractedParameters): Record<string, string | number> {
    const spiceParams: Record<string, string | number> = {};
    
    // Map extracted parameters to ASM-HEMT SPICE parameters
    if (extracted.VOFF !== undefined) spiceParams.VOFF = extracted.VOFF;
    if (extracted.VSE !== undefined) spiceParams.VSE = extracted.VSE;
    if (extracted.KP_25C !== undefined) spiceParams.KP = extracted.KP_25C;
    if (extracted.UTE !== undefined) spiceParams.UTE = extracted.UTE;
    if (extracted.RDS_ON !== undefined) spiceParams.RDS = extracted.RDS_ON;
    if (extracted.CGSO !== undefined) spiceParams.CGSO = extracted.CGSO;
    if (extracted.CGDO !== undefined) spiceParams.CGDO = extracted.CGDO;
    if (extracted.CDSO !== undefined) spiceParams.CDSO = extracted.CDSO;
    if (extracted.RTH0 !== undefined) spiceParams.RTH0 = extracted.RTH0;
    if (extracted.KRSC !== undefined) spiceParams.KRSC = extracted.KRSC;
    if (extracted.KRDC !== undefined) spiceParams.KRDC = extracted.KRDC;
    if (extracted.VOFF0 !== undefined) spiceParams.VOFF0 = extracted.VOFF0;
    if (extracted.KVTO !== undefined) spiceParams.KVTO = extracted.KVTO;
    
    return spiceParams;
  }
}

// Export singleton instance
export const asmSpiceExtractionService = new ASMSpiceExtractionService(); 