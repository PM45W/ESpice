export interface MeasurementDataPoint {
  x: number;
  y: number;
  series?: string;
}

export interface MeasurementDataset {
  name: string;
  type: 'output' | 'transfer' | 'cv';
  data: MeasurementDataPoint[];
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  description: string;
}

// Mock Output Characteristics (Id vs Vds at different Vgs)
export const mockOutputCharacteristics: MeasurementDataset = {
  name: 'Output Characteristics',
  type: 'output',
  xLabel: 'Drain-Source Voltage',
  yLabel: 'Drain Current',
  xUnit: 'V',
  yUnit: 'A',
  description: 'Drain current vs drain-source voltage at different gate-source voltages',
  data: [
    // Vgs = 0V
    { x: 0, y: 0, series: 'Vgs=0V' },
    { x: 1, y: 0, series: 'Vgs=0V' },
    { x: 2, y: 0, series: 'Vgs=0V' },
    { x: 3, y: 0, series: 'Vgs=0V' },
    { x: 4, y: 0, series: 'Vgs=0V' },
    { x: 5, y: 0, series: 'Vgs=0V' },
    { x: 6, y: 0, series: 'Vgs=0V' },
    { x: 7, y: 0, series: 'Vgs=0V' },
    { x: 8, y: 0, series: 'Vgs=0V' },
    { x: 9, y: 0, series: 'Vgs=0V' },
    { x: 10, y: 0, series: 'Vgs=0V' },
    
    // Vgs = 1V
    { x: 0, y: 0, series: 'Vgs=1V' },
    { x: 1, y: 0.5, series: 'Vgs=1V' },
    { x: 2, y: 1.2, series: 'Vgs=1V' },
    { x: 3, y: 1.8, series: 'Vgs=1V' },
    { x: 4, y: 2.1, series: 'Vgs=1V' },
    { x: 5, y: 2.3, series: 'Vgs=1V' },
    { x: 6, y: 2.4, series: 'Vgs=1V' },
    { x: 7, y: 2.5, series: 'Vgs=1V' },
    { x: 8, y: 2.6, series: 'Vgs=1V' },
    { x: 9, y: 2.7, series: 'Vgs=1V' },
    { x: 10, y: 2.8, series: 'Vgs=1V' },
    
    // Vgs = 2V
    { x: 0, y: 0, series: 'Vgs=2V' },
    { x: 1, y: 1.2, series: 'Vgs=2V' },
    { x: 2, y: 2.8, series: 'Vgs=2V' },
    { x: 3, y: 4.2, series: 'Vgs=2V' },
    { x: 4, y: 5.1, series: 'Vgs=2V' },
    { x: 5, y: 5.8, series: 'Vgs=2V' },
    { x: 6, y: 6.2, series: 'Vgs=2V' },
    { x: 7, y: 6.5, series: 'Vgs=2V' },
    { x: 8, y: 6.8, series: 'Vgs=2V' },
    { x: 9, y: 7.1, series: 'Vgs=2V' },
    { x: 10, y: 7.4, series: 'Vgs=2V' },
    
    // Vgs = 3V
    { x: 0, y: 0, series: 'Vgs=3V' },
    { x: 1, y: 2.1, series: 'Vgs=3V' },
    { x: 2, y: 4.8, series: 'Vgs=3V' },
    { x: 3, y: 7.2, series: 'Vgs=3V' },
    { x: 4, y: 8.7, series: 'Vgs=3V' },
    { x: 5, y: 9.9, series: 'Vgs=3V' },
    { x: 6, y: 10.6, series: 'Vgs=3V' },
    { x: 7, y: 11.2, series: 'Vgs=3V' },
    { x: 8, y: 11.8, series: 'Vgs=3V' },
    { x: 9, y: 12.4, series: 'Vgs=3V' },
    { x: 10, y: 13.0, series: 'Vgs=3V' },
    
    // Vgs = 4V
    { x: 0, y: 0, series: 'Vgs=4V' },
    { x: 1, y: 3.2, series: 'Vgs=4V' },
    { x: 2, y: 7.1, series: 'Vgs=4V' },
    { x: 3, y: 10.6, series: 'Vgs=4V' },
    { x: 4, y: 12.8, series: 'Vgs=4V' },
    { x: 5, y: 14.6, series: 'Vgs=4V' },
    { x: 6, y: 15.7, series: 'Vgs=4V' },
    { x: 7, y: 16.6, series: 'Vgs=4V' },
    { x: 8, y: 17.5, series: 'Vgs=4V' },
    { x: 9, y: 18.4, series: 'Vgs=4V' },
    { x: 10, y: 19.3, series: 'Vgs=4V' },
    
    // Vgs = 5V
    { x: 0, y: 0, series: 'Vgs=5V' },
    { x: 1, y: 4.5, series: 'Vgs=5V' },
    { x: 2, y: 9.8, series: 'Vgs=5V' },
    { x: 3, y: 14.7, series: 'Vgs=5V' },
    { x: 4, y: 17.8, series: 'Vgs=5V' },
    { x: 5, y: 20.3, series: 'Vgs=5V' },
    { x: 6, y: 21.9, series: 'Vgs=5V' },
    { x: 7, y: 23.2, series: 'Vgs=5V' },
    { x: 8, y: 24.5, series: 'Vgs=5V' },
    { x: 9, y: 25.8, series: 'Vgs=5V' },
    { x: 10, y: 27.1, series: 'Vgs=5V' }
  ]
};

// Mock Transfer Characteristics (Id vs Vgs at different Vds)
export const mockTransferCharacteristics: MeasurementDataset = {
  name: 'Transfer Characteristics',
  type: 'transfer',
  xLabel: 'Gate-Source Voltage',
  yLabel: 'Drain Current',
  xUnit: 'V',
  yUnit: 'A',
  description: 'Drain current vs gate-source voltage at different drain-source voltages',
  data: [
    // Vds = 0.1V (linear region)
    { x: -3, y: 0, series: 'Vds=0.1V' },
    { x: -2.5, y: 0, series: 'Vds=0.1V' },
    { x: -2, y: 0, series: 'Vds=0.1V' },
    { x: -1.5, y: 0.1, series: 'Vds=0.1V' },
    { x: -1, y: 0.3, series: 'Vds=0.1V' },
    { x: -0.5, y: 0.8, series: 'Vds=0.1V' },
    { x: 0, y: 1.5, series: 'Vds=0.1V' },
    { x: 0.5, y: 2.4, series: 'Vds=0.1V' },
    { x: 1, y: 3.5, series: 'Vds=0.1V' },
    { x: 1.5, y: 4.8, series: 'Vds=0.1V' },
    { x: 2, y: 6.2, series: 'Vds=0.1V' },
    { x: 2.5, y: 7.8, series: 'Vds=0.1V' },
    { x: 3, y: 9.5, series: 'Vds=0.1V' },
    { x: 3.5, y: 11.3, series: 'Vds=0.1V' },
    { x: 4, y: 13.2, series: 'Vds=0.1V' },
    { x: 4.5, y: 15.1, series: 'Vds=0.1V' },
    { x: 5, y: 17.0, series: 'Vds=0.1V' },
    
    // Vds = 5V (saturation region)
    { x: -3, y: 0, series: 'Vds=5V' },
    { x: -2.5, y: 0, series: 'Vds=5V' },
    { x: -2, y: 0, series: 'Vds=5V' },
    { x: -1.5, y: 0.2, series: 'Vds=5V' },
    { x: -1, y: 0.6, series: 'Vds=5V' },
    { x: -0.5, y: 1.2, series: 'Vds=5V' },
    { x: 0, y: 2.1, series: 'Vds=5V' },
    { x: 0.5, y: 3.2, series: 'Vds=5V' },
    { x: 1, y: 4.5, series: 'Vds=5V' },
    { x: 1.5, y: 6.0, series: 'Vds=5V' },
    { x: 2, y: 7.7, series: 'Vds=5V' },
    { x: 2.5, y: 9.5, series: 'Vds=5V' },
    { x: 3, y: 11.4, series: 'Vds=5V' },
    { x: 3.5, y: 13.3, series: 'Vds=5V' },
    { x: 4, y: 15.2, series: 'Vds=5V' },
    { x: 4.5, y: 17.1, series: 'Vds=5V' },
    { x: 5, y: 19.0, series: 'Vds=5V' },
    
    // Vds = 10V (high voltage)
    { x: -3, y: 0, series: 'Vds=10V' },
    { x: -2.5, y: 0, series: 'Vds=10V' },
    { x: -2, y: 0, series: 'Vds=10V' },
    { x: -1.5, y: 0.3, series: 'Vds=10V' },
    { x: -1, y: 0.8, series: 'Vds=10V' },
    { x: -0.5, y: 1.5, series: 'Vds=10V' },
    { x: 0, y: 2.4, series: 'Vds=10V' },
    { x: 0.5, y: 3.5, series: 'Vds=10V' },
    { x: 1, y: 4.8, series: 'Vds=10V' },
    { x: 1.5, y: 6.3, series: 'Vds=10V' },
    { x: 2, y: 8.0, series: 'Vds=10V' },
    { x: 2.5, y: 9.8, series: 'Vds=10V' },
    { x: 3, y: 11.7, series: 'Vds=10V' },
    { x: 3.5, y: 13.6, series: 'Vds=10V' },
    { x: 4, y: 15.5, series: 'Vds=10V' },
    { x: 4.5, y: 17.4, series: 'Vds=10V' },
    { x: 5, y: 19.3, series: 'Vds=10V' }
  ]
};

// Mock CV Characteristics (Cgs vs Vgs)
export const mockCVCharacteristics: MeasurementDataset = {
  name: 'CV Characteristics',
  type: 'cv',
  xLabel: 'Gate-Source Voltage',
  yLabel: 'Gate-Source Capacitance',
  xUnit: 'V',
  yUnit: 'F',
  description: 'Gate-source capacitance vs gate-source voltage',
  data: [
    { x: -5, y: 1.2e-12, series: 'Cgs' },
    { x: -4.5, y: 1.3e-12, series: 'Cgs' },
    { x: -4, y: 1.4e-12, series: 'Cgs' },
    { x: -3.5, y: 1.5e-12, series: 'Cgs' },
    { x: -3, y: 1.6e-12, series: 'Cgs' },
    { x: -2.5, y: 1.7e-12, series: 'Cgs' },
    { x: -2, y: 1.8e-12, series: 'Cgs' },
    { x: -1.5, y: 1.9e-12, series: 'Cgs' },
    { x: -1, y: 2.0e-12, series: 'Cgs' },
    { x: -0.5, y: 2.1e-12, series: 'Cgs' },
    { x: 0, y: 2.2e-12, series: 'Cgs' },
    { x: 0.5, y: 2.3e-12, series: 'Cgs' },
    { x: 1, y: 2.4e-12, series: 'Cgs' },
    { x: 1.5, y: 2.5e-12, series: 'Cgs' },
    { x: 2, y: 2.6e-12, series: 'Cgs' },
    { x: 2.5, y: 2.7e-12, series: 'Cgs' },
    { x: 3, y: 2.8e-12, series: 'Cgs' },
    { x: 3.5, y: 2.9e-12, series: 'Cgs' },
    { x: 4, y: 3.0e-12, series: 'Cgs' },
    { x: 4.5, y: 3.1e-12, series: 'Cgs' },
    { x: 5, y: 3.2e-12, series: 'Cgs' }
  ]
};

// Mock Gate-Drain Capacitance (Cgd vs Vgd)
export const mockCgdCharacteristics: MeasurementDataset = {
  name: 'Gate-Drain Capacitance',
  type: 'cv',
  xLabel: 'Gate-Drain Voltage',
  yLabel: 'Gate-Drain Capacitance',
  xUnit: 'V',
  yUnit: 'F',
  description: 'Gate-drain capacitance vs gate-drain voltage',
  data: [
    { x: -10, y: 0.8e-12, series: 'Cgd' },
    { x: -9, y: 0.9e-12, series: 'Cgd' },
    { x: -8, y: 1.0e-12, series: 'Cgd' },
    { x: -7, y: 1.1e-12, series: 'Cgd' },
    { x: -6, y: 1.2e-12, series: 'Cgd' },
    { x: -5, y: 1.3e-12, series: 'Cgd' },
    { x: -4, y: 1.4e-12, series: 'Cgd' },
    { x: -3, y: 1.5e-12, series: 'Cgd' },
    { x: -2, y: 1.6e-12, series: 'Cgd' },
    { x: -1, y: 1.7e-12, series: 'Cgd' },
    { x: 0, y: 1.8e-12, series: 'Cgd' },
    { x: 1, y: 1.9e-12, series: 'Cgd' },
    { x: 2, y: 2.0e-12, series: 'Cgd' },
    { x: 3, y: 2.1e-12, series: 'Cgd' },
    { x: 4, y: 2.2e-12, series: 'Cgd' },
    { x: 5, y: 2.3e-12, series: 'Cgd' },
    { x: 6, y: 2.4e-12, series: 'Cgd' },
    { x: 7, y: 2.5e-12, series: 'Cgd' },
    { x: 8, y: 2.6e-12, series: 'Cgd' },
    { x: 9, y: 2.7e-12, series: 'Cgd' },
    { x: 10, y: 2.8e-12, series: 'Cgd' }
  ]
};

// Mock Transconductance (gm vs Vgs)
export const mockTransconductance: MeasurementDataset = {
  name: 'Transconductance',
  type: 'transfer',
  xLabel: 'Gate-Source Voltage',
  yLabel: 'Transconductance',
  xUnit: 'V',
  yUnit: 'S',
  description: 'Transconductance vs gate-source voltage',
  data: [
    { x: -2, y: 0, series: 'gm' },
    { x: -1.5, y: 0.2, series: 'gm' },
    { x: -1, y: 0.5, series: 'gm' },
    { x: -0.5, y: 0.8, series: 'gm' },
    { x: 0, y: 1.2, series: 'gm' },
    { x: 0.5, y: 1.6, series: 'gm' },
    { x: 1, y: 2.0, series: 'gm' },
    { x: 1.5, y: 2.4, series: 'gm' },
    { x: 2, y: 2.8, series: 'gm' },
    { x: 2.5, y: 3.2, series: 'gm' },
    { x: 3, y: 3.6, series: 'gm' },
    { x: 3.5, y: 4.0, series: 'gm' },
    { x: 4, y: 4.4, series: 'gm' },
    { x: 4.5, y: 4.8, series: 'gm' },
    { x: 5, y: 5.2, series: 'gm' }
  ]
};

export const allMeasurementData = {
  outputCharacteristics: mockOutputCharacteristics,
  transferCharacteristics: mockTransferCharacteristics,
  cvCharacteristics: mockCVCharacteristics,
  cgdCharacteristics: mockCgdCharacteristics,
  transconductance: mockTransconductance
};

// Function to convert measurement data to CSV format
export function measurementDataToCSV(dataset: MeasurementDataset): string {
  const headers = ['X', 'Y', 'Series'];
  const rows = dataset.data.map(point => [
    point.x.toString(),
    point.y.toString(),
    point.series || ''
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Function to get available measurement data types for a product
export function getAvailableMeasurementData(productId: string): string[] {
  // Mock function - in real implementation, this would check the database
  return ['outputCharacteristics', 'transferCharacteristics', 'cvCharacteristics'];
}

// Function to get measurement data by type
export function getMeasurementDataByType(type: string): MeasurementDataset | null {
  switch (type) {
    case 'outputCharacteristics':
      return mockOutputCharacteristics;
    case 'transferCharacteristics':
      return mockTransferCharacteristics;
    case 'cvCharacteristics':
      return mockCVCharacteristics;
    case 'cgdCharacteristics':
      return mockCgdCharacteristics;
    case 'transconductance':
      return mockTransconductance;
    default:
      return null;
  }
} 