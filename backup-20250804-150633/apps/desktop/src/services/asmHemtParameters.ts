export interface ASMHEMTParameter {
  name: string;
  description: string;
  unit: string;
  defaultValue: number;
  minValue?: number;
  maxValue?: number;
  category: 'basic' | 'mobility' | 'velocity' | 'access' | 'gate' | 'trap' | 'thermal' | 'capacitance' | 'noise';
  required: boolean;
  measurementData: {
    outputCharacteristics?: boolean;
    transferCharacteristics?: boolean;
    cvCharacteristics?: boolean;
    thermalData?: boolean;
    noiseData?: boolean;
  };
  extractionMethod: string;
  datasheetSection: string;
  graphType?: string;
  tableType?: string;
  notes: string;
  relatedParameters: string[];
}

export const ASM_HEMT_PARAMETERS: ASMHEMTParameter[] = [
  // Basic Device Parameters
  {
    name: 'voff',
    description: 'Cut-off voltage - the gate voltage at which the device turns off',
    unit: 'V',
    defaultValue: -2.0,
    minValue: -100.0,
    maxValue: 5.0,
    category: 'basic',
    required: true,
    measurementData: {
      transferCharacteristics: true,
      outputCharacteristics: true
    },
    extractionMethod: 'Extract from transfer characteristic curve (Id vs Vgs) at low Vds',
    datasheetSection: 'Transfer Characteristics',
    graphType: 'Id vs Vgs curve',
    tableType: 'Threshold voltage table',
    notes: 'Critical parameter for device operation. Should be extracted at Vds = 0.1V or similar low voltage.',
    relatedParameters: ['nfactor', 'cdscd']
  },
  {
    name: 'u0',
    description: 'Low field mobility - electron mobility in the 2DEG channel',
    unit: 'm²/(V·s)',
    defaultValue: 170e-3,
    minValue: 0.0,
    category: 'mobility',
    required: true,
    measurementData: {
      transferCharacteristics: true,
      outputCharacteristics: true
    },
    extractionMethod: 'Extract from linear region of transfer characteristic (Id vs Vgs)',
    datasheetSection: 'Transfer Characteristics',
    graphType: 'Id vs Vgs curve (linear region)',
    tableType: 'Transconductance table',
    notes: 'Affects device current drive capability. Higher values indicate better performance.',
    relatedParameters: ['ua', 'ub', 'uc', 'ute']
  },
  {
    name: 'vsat',
    description: 'Saturation velocity - maximum electron velocity in the channel',
    unit: 'm/s',
    defaultValue: 1.9e5,
    minValue: 1.0e3,
    category: 'velocity',
    required: true,
    measurementData: {
      outputCharacteristics: true
    },
    extractionMethod: 'Extract from output characteristic curves at high Vds',
    datasheetSection: 'Output Characteristics',
    graphType: 'Id vs Vds curves',
    tableType: 'Saturation current table',
    notes: 'Determines maximum current capability. Typical values for GaN HEMTs are 1.5-2.5e5 m/s.',
    relatedParameters: ['delta', 'at', 'thesat']
  },
  {
    name: 'tbar',
    description: 'Barrier layer thickness - thickness of the AlGaN barrier layer',
    unit: 'm',
    defaultValue: 2.5e-8,
    minValue: 0.1e-9,
    category: 'basic',
    required: true,
    measurementData: {
      cvCharacteristics: true
    },
    extractionMethod: 'Extract from CV characteristics or device structure information',
    datasheetSection: 'Capacitance Characteristics',
    graphType: 'Cgs vs Vgs curve',
    tableType: 'Device structure table',
    notes: 'Critical for 2DEG formation and device performance. Usually provided in device specifications.',
    relatedParameters: ['epsilon', 'gamma0i', 'gamma1i']
  },
  {
    name: 'epsilon',
    description: 'Dielectric permittivity of AlGaN layer',
    unit: 'F/m',
    defaultValue: 10.66e-11,
    minValue: 0.0,
    category: 'basic',
    required: true,
    measurementData: {
      cvCharacteristics: true
    },
    extractionMethod: 'Calculate from AlGaN composition or extract from CV measurements',
    datasheetSection: 'Capacitance Characteristics',
    graphType: 'Cgs vs Vgs curve',
    tableType: 'Material properties table',
    notes: 'Depends on AlGaN composition. Higher Al content increases permittivity.',
    relatedParameters: ['tbar', 'cgso', 'cgdo']
  },
  {
    name: 'lambda',
    description: 'Channel length modulation coefficient',
    unit: 'V⁻¹',
    defaultValue: 0.0,
    minValue: 0.0,
    category: 'basic',
    required: false,
    measurementData: {
      outputCharacteristics: true
    },
    extractionMethod: 'Extract from output conductance in saturation region',
    datasheetSection: 'Output Characteristics',
    graphType: 'Id vs Vds curves (saturation region)',
    tableType: 'Output conductance table',
    notes: 'Models the increase in drain current with drain voltage in saturation.',
    relatedParameters: ['delta', 'vsat']
  },
  {
    name: 'nfactor',
    description: 'Sub-threshold slope parameter',
    unit: '',
    defaultValue: 0.5,
    minValue: 0.0,
    category: 'basic',
    required: true,
    measurementData: {
      transferCharacteristics: true
    },
    extractionMethod: 'Extract from sub-threshold region of transfer characteristic',
    datasheetSection: 'Transfer Characteristics',
    graphType: 'Id vs Vgs curve (log scale)',
    tableType: 'Sub-threshold slope table',
    notes: 'Controls the steepness of the sub-threshold region. Lower values indicate better switching.',
    relatedParameters: ['voff', 'cdscd']
  },
  {
    name: 'cdscd',
    description: 'Sub-threshold slope change due to drain voltage',
    unit: '',
    defaultValue: 1.0e-3,
    minValue: 0.0,
    category: 'basic',
    required: false,
    measurementData: {
      transferCharacteristics: true
    },
    extractionMethod: 'Extract from transfer characteristics at different Vds values',
    datasheetSection: 'Transfer Characteristics',
    graphType: 'Id vs Vgs curves at different Vds',
    tableType: 'DIBL table',
    notes: 'Models drain-induced barrier lowering (DIBL) effect.',
    relatedParameters: ['nfactor', 'eta0', 'vdscale']
  },
  {
    name: 'gamma0i',
    description: 'Schrodinger-Poisson solution parameter',
    unit: '',
    defaultValue: 2.12e-12,
    minValue: 0.0,
    maxValue: 1.0,
    category: 'basic',
    required: true,
    measurementData: {
      cvCharacteristics: true
    },
    extractionMethod: 'Extract from CV characteristics or use default values',
    datasheetSection: 'Capacitance Characteristics',
    graphType: 'Cgs vs Vgs curve',
    tableType: 'Quantum effects table',
    notes: 'Quantum mechanical parameter for 2DEG modeling. Usually kept at default values.',
    relatedParameters: ['gamma1i', 'tbar', 'epsilon']
  },
  {
    name: 'gamma1i',
    description: 'Schrodinger-Poisson solution parameter',
    unit: '',
    defaultValue: 3.73e-12,
    minValue: 0.0,
    maxValue: 1.0,
    category: 'basic',
    required: true,
    measurementData: {
      cvCharacteristics: true
    },
    extractionMethod: 'Extract from CV characteristics or use default values',
    datasheetSection: 'Capacitance Characteristics',
    graphType: 'Cgs vs Vgs curve',
    tableType: 'Quantum effects table',
    notes: 'Quantum mechanical parameter for 2DEG modeling. Usually kept at default values.',
    relatedParameters: ['gamma0i', 'tbar', 'epsilon']
  },
  // Mobility Parameters
  {
    name: 'ua',
    description: 'Mobility degradation coefficient (first order)',
    unit: 'V⁻¹',
    defaultValue: 0.0e-9,
    minValue: 0.0,
    category: 'mobility',
    required: false,
    measurementData: {
      transferCharacteristics: true
    },
    extractionMethod: 'Extract from transconductance vs gate voltage',
    datasheetSection: 'Transfer Characteristics',
    graphType: 'gm vs Vgs curve',
    tableType: 'Transconductance table',
    notes: 'Models mobility degradation with gate voltage. Higher values indicate stronger degradation.',
    relatedParameters: ['u0', 'ub', 'uc']
  },
  {
    name: 'ub',
    description: 'Mobility degradation coefficient (second order)',
    unit: 'V⁻²',
    defaultValue: 0.0e-18,
    minValue: 0.0,
    category: 'mobility',
    required: false,
    measurementData: {
      transferCharacteristics: true
    },
    extractionMethod: 'Extract from transconductance vs gate voltage (higher order effects)',
    datasheetSection: 'Transfer Characteristics',
    graphType: 'gm vs Vgs curve',
    tableType: 'Transconductance table',
    notes: 'Models higher order mobility degradation effects.',
    relatedParameters: ['u0', 'ua', 'uc']
  },
  {
    name: 'uc',
    description: 'Mobility degradation coefficient with substrate bias',
    unit: 'V⁻¹',
    defaultValue: 0.0e-9,
    minValue: 0.0,
    category: 'mobility',
    required: false,
    measurementData: {
      transferCharacteristics: true
    },
    extractionMethod: 'Extract from transfer characteristics at different substrate biases',
    datasheetSection: 'Transfer Characteristics',
    graphType: 'Id vs Vgs at different Vbs',
    tableType: 'Body effect table',
    notes: 'Models mobility degradation due to substrate bias effects.',
    relatedParameters: ['u0', 'ua', 'ub', 'asub', 'ksub']
  },
  {
    name: 'ute',
    description: 'Temperature dependence of mobility',
    unit: '',
    defaultValue: -0.5,
    minValue: -10.0,
    maxValue: 0.0,
    category: 'mobility',
    required: false,
    measurementData: {
      thermalData: true
    },
    extractionMethod: 'Extract from transfer characteristics at different temperatures',
    datasheetSection: 'Thermal Characteristics',
    graphType: 'Id vs Vgs at different temperatures',
    tableType: 'Temperature coefficients table',
    notes: 'Negative values indicate mobility decreases with temperature.',
    relatedParameters: ['u0', 'tnom']
  },
  // Velocity Parameters
  {
    name: 'delta',
    description: 'Exponent for effective drain voltage',
    unit: '',
    defaultValue: 2.0,
    minValue: 2.0,
    category: 'velocity',
    required: true,
    measurementData: {
      outputCharacteristics: true
    },
    extractionMethod: 'Extract from output characteristics in saturation region',
    datasheetSection: 'Output Characteristics',
    graphType: 'Id vs Vds curves',
    tableType: 'Saturation characteristics table',
    notes: 'Controls the shape of the saturation region. Usually kept at 2.0.',
    relatedParameters: ['vsat', 'thesat']
  },
  {
    name: 'at',
    description: 'Temperature dependence for saturation velocity',
    unit: '',
    defaultValue: 0.0,
    category: 'velocity',
    required: false,
    measurementData: {
      thermalData: true
    },
    extractionMethod: 'Extract from output characteristics at different temperatures',
    datasheetSection: 'Thermal Characteristics',
    graphType: 'Id vs Vds at different temperatures',
    tableType: 'Temperature coefficients table',
    notes: 'Models temperature dependence of saturation velocity.',
    relatedParameters: ['vsat', 'tnom']
  },
  {
    name: 'thesat',
    description: 'Velocity saturation parameter',
    unit: 'V⁻²',
    defaultValue: 1.0,
    minValue: 1.0,
    category: 'velocity',
    required: true,
    measurementData: {
      outputCharacteristics: true
    },
    extractionMethod: 'Extract from output characteristics',
    datasheetSection: 'Output Characteristics',
    graphType: 'Id vs Vds curves',
    tableType: 'Saturation characteristics table',
    notes: 'Controls the transition to velocity saturation. Usually kept at 1.0.',
    relatedParameters: ['vsat', 'delta']
  },
  // Access Region Parameters
  {
    name: 'lsg',
    description: 'Length of source-gate access region',
    unit: 'm',
    defaultValue: 1.0e-6,
    minValue: 0.0,
    category: 'access',
    required: true,
    measurementData: {
      outputCharacteristics: true
    },
    extractionMethod: 'Extract from device layout or output resistance',
    datasheetSection: 'Device Structure',
    graphType: 'Layout diagram',
    tableType: 'Device dimensions table',
    notes: 'Critical for access resistance modeling. Affects on-resistance.',
    relatedParameters: ['ldg', 'rsc', 'rdc']
  },
  {
    name: 'ldg',
    description: 'Length of drain-gate access region',
    unit: 'm',
    defaultValue: 1.0e-6,
    minValue: 0.0,
    category: 'access',
    required: true,
    measurementData: {
      outputCharacteristics: true
    },
    extractionMethod: 'Extract from device layout or output resistance',
    datasheetSection: 'Device Structure',
    graphType: 'Layout diagram',
    tableType: 'Device dimensions table',
    notes: 'Critical for access resistance modeling. Affects on-resistance.',
    relatedParameters: ['lsg', 'rsc', 'rdc']
  },
  {
    name: 'rsc',
    description: 'Source contact resistance',
    unit: 'Ω·m',
    defaultValue: 1.0e-4,
    minValue: 0.0,
    category: 'access',
    required: false,
    measurementData: {
      outputCharacteristics: true
    },
    extractionMethod: 'Extract from on-resistance measurements',
    datasheetSection: 'On-Resistance Characteristics',
    graphType: 'Rds(on) vs Id curve',
    tableType: 'Contact resistance table',
    notes: 'Contributes to total on-resistance. Lower values indicate better contacts.',
    relatedParameters: ['rdc', 'lsg', 'ldg']
  },
  {
    name: 'rdc',
    description: 'Drain contact resistance',
    unit: 'Ω·m',
    defaultValue: 1.0e-4,
    minValue: 0.0,
    category: 'access',
    required: false,
    measurementData: {
      outputCharacteristics: true
    },
    extractionMethod: 'Extract from on-resistance measurements',
    datasheetSection: 'On-Resistance Characteristics',
    graphType: 'Rds(on) vs Id curve',
    tableType: 'Contact resistance table',
    notes: 'Contributes to total on-resistance. Lower values indicate better contacts.',
    relatedParameters: ['rsc', 'lsg', 'ldg']
  },
  // Gate Parameters
  {
    name: 'cgso',
    description: 'Gate-source overlap capacitance',
    unit: 'F',
    defaultValue: 10.0e-15,
    minValue: 0.0,
    category: 'capacitance',
    required: true,
    measurementData: {
      cvCharacteristics: true
    },
    extractionMethod: 'Extract from CV measurements at high frequencies',
    datasheetSection: 'Capacitance Characteristics',
    graphType: 'Cgs vs Vgs curve',
    tableType: 'Capacitance table',
    notes: 'Parasitic capacitance that affects switching speed.',
    relatedParameters: ['cgdo', 'epsilon', 'tbar']
  },
  {
    name: 'cgdo',
    description: 'Gate-drain overlap capacitance',
    unit: 'F',
    defaultValue: 10.0e-15,
    minValue: 0.0,
    category: 'capacitance',
    required: true,
    measurementData: {
      cvCharacteristics: true
    },
    extractionMethod: 'Extract from CV measurements at high frequencies',
    datasheetSection: 'Capacitance Characteristics',
    graphType: 'Cgd vs Vgd curve',
    tableType: 'Capacitance table',
    notes: 'Critical for switching losses and Miller effect.',
    relatedParameters: ['cgso', 'epsilon', 'tbar']
  },
  // Thermal Parameters
  {
    name: 'rth0',
    description: 'Thermal resistance',
    unit: 'K/W',
    defaultValue: 5.0,
    minValue: 0.0,
    category: 'thermal',
    required: false,
    measurementData: {
      thermalData: true
    },
    extractionMethod: 'Extract from thermal impedance measurements',
    datasheetSection: 'Thermal Characteristics',
    graphType: 'Thermal impedance vs time',
    tableType: 'Thermal resistance table',
    notes: 'Critical for self-heating effects. Lower values indicate better thermal performance.',
    relatedParameters: ['cth0', 'shmod']
  },
  {
    name: 'cth0',
    description: 'Thermal capacitance',
    unit: 's·W/K',
    defaultValue: 1.0e-9,
    minValue: 0.0,
    category: 'thermal',
    required: false,
    measurementData: {
      thermalData: true
    },
    extractionMethod: 'Extract from thermal impedance measurements',
    datasheetSection: 'Thermal Characteristics',
    graphType: 'Thermal impedance vs time',
    tableType: 'Thermal capacitance table',
    notes: 'Models thermal time constants. Affects transient thermal response.',
    relatedParameters: ['rth0', 'shmod']
  }
];

export const ASM_HEMT_CATEGORIES = {
  basic: 'Basic Device Parameters',
  mobility: 'Mobility Parameters',
  velocity: 'Velocity Parameters',
  access: 'Access Region Parameters',
  gate: 'Gate Parameters',
  trap: 'Trap Parameters',
  thermal: 'Thermal Parameters',
  capacitance: 'Capacitance Parameters',
  noise: 'Noise Parameters'
};

export const MEASUREMENT_DATA_TYPES = {
  outputCharacteristics: 'Output Characteristics (Id vs Vds)',
  transferCharacteristics: 'Transfer Characteristics (Id vs Vgs)',
  cvCharacteristics: 'CV Characteristics (Cgs, Cgd vs Vgs)',
  thermalData: 'Thermal Data',
  noiseData: 'Noise Data'
};

export function getParameterByName(name: string): ASMHEMTParameter | undefined {
  return ASM_HEMT_PARAMETERS.find(param => param.name === name);
}

export function getParametersByCategory(category: string): ASMHEMTParameter[] {
  return ASM_HEMT_PARAMETERS.filter(param => param.category === category);
}

export function getRequiredParameters(): ASMHEMTParameter[] {
  return ASM_HEMT_PARAMETERS.filter(param => param.required);
}

export function getParametersByMeasurementData(dataType: keyof typeof MEASUREMENT_DATA_TYPES): ASMHEMTParameter[] {
  return ASM_HEMT_PARAMETERS.filter(param => param.measurementData[dataType]);
}

export function validateParameterValue(paramName: string, value: number): { valid: boolean; message?: string } {
  const param = getParameterByName(paramName);
  if (!param) {
    return { valid: false, message: 'Parameter not found' };
  }

  if (param.minValue !== undefined && value < param.minValue) {
    return { valid: false, message: `Value must be >= ${param.minValue}` };
  }

  if (param.maxValue !== undefined && value > param.maxValue) {
    return { valid: false, message: `Value must be <= ${param.maxValue}` };
  }

  return { valid: true };
} 