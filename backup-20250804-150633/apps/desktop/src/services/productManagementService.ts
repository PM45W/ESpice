import { invoke } from '@tauri-apps/api/core';

export interface CurveData {
  url: string;
  path: string;
  type: string;
}

export interface CharacteristicData {
  id: string;
  type: 'output' | 'transfer' | 'rds_vgs_temp' | 'rds_vgs_current' | 'reverse_drain_source' | 'capacitance';
  name: string;
  description: string;
  csvPath?: string;
  imagePath?: string;
  imageFile?: File;
  imageUrl?: string;
  csvData?: any[];
  uploadedAt: Date;
}

export interface ProductWithParameters {
  id: string;
  name: string;
  manufacturer: string;
  partNumber: string;
  deviceType: string;
  package: string;
  description: string;
  voltageRating?: number;
  currentRating?: number;
  powerRating?: number;
  datasheetUrl?: string;
  datasheetPath?: string;
  spiceModelUrl?: string;
  spiceModelPath?: string;
  applicationNoteUrl?: string;
  applicationNotePath?: string;
  productUrl?: string;
  imageUrl?: string;
  ivCurveData?: CurveData;
  cvCurveData?: CurveData;
  characteristics: CharacteristicData[];
  specifications: Record<string, any>;
  parameters: ProductParameter[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductParameter {
  id: string;
  name: string;
  value: string | number;
  unit?: string;
  description?: string;
  category: 'electrical' | 'thermal' | 'mechanical' | 'other';
}

export interface ProductCreateInput {
  name: string;
  manufacturer: string;
  partNumber: string;
  deviceType: string;
  package: string;
  description: string;
  voltageRating?: number;
  currentRating?: number;
  powerRating?: number;
  specifications?: Record<string, any>;
}

export interface ProductUpdateInput extends Partial<ProductCreateInput> {
  id: string;
}

export interface ProductFilter {
  manufacturer?: string;
  deviceType?: string;
  package?: string;
  voltageRating?: { min?: number; max?: number };
  currentRating?: { min?: number; max?: number };
  searchTerm?: string;
}

export interface CSVImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

export interface AutoStructureResult {
  success: boolean;
  structuredData: ProductCreateInput[];
  errors: string[];
}

export interface ManufacturerProductData {
  partNumber: string;
  name: string;
  description?: string;
  deviceType?: string;
  package?: string;
  voltageRating?: number;
  currentRating?: number;
  powerRating?: number;
  datasheetUrl?: string;
  spiceModelUrl?: string;
  [key: string]: any; // For additional manufacturer-specific fields
}

// Helper functions to create mock image files
const createMockImageUrl = (): string => {
  // Create a data URL for a realistic characteristic curve
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Draw white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 600, 400);
    
    // Draw grid lines
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (600 / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 400);
      ctx.stroke();
    }
    for (let i = 0; i <= 8; i++) {
      const y = (400 / 8) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(600, y);
      ctx.stroke();
    }
    
    // Draw axis labels
    ctx.fillStyle = '#374151';
    ctx.font = '14px Arial';
    ctx.fillText('Vds (V)', 280, 390);
    ctx.save();
    ctx.translate(20, 200);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Id (A)', 0, 0);
    ctx.restore();
    
    // Draw multiple characteristic curves for different Vgs values
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    const vgsValues = [0, 1, 2, 3, 4];
    
    vgsValues.forEach((vgs, index) => {
      ctx.strokeStyle = colors[index];
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i <= 600; i += 5) {
        const vds = (i / 600) * 10; // 0 to 10V
        let id = 0;
        
        if (vgs > 0) {
          // Realistic MOSFET characteristic curve
          if (vds < vgs) {
            // Linear region
            id = (vgs - 1) * 0.5 * vds;
          } else {
            // Saturation region
            id = (vgs - 1) * 0.5 * vgs;
          }
          
          // Add some noise and saturation
          id = Math.max(0, id + Math.sin(vds * 0.5) * 0.1);
          id = Math.min(5, id); // Max current limit
        }
        
        const x = i;
        const y = 400 - (id / 5) * 400;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      
      // Add legend
      ctx.fillStyle = colors[index];
      ctx.fillText(`Vgs = ${vgs}V`, 450, 50 + index * 20);
    });
    
    // Add title
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Output Characteristics', 20, 30);
  }
  
  return canvas.toDataURL('image/png');
};

const createMockImageFile = (filename: string): File => {
  // Create a canvas with the same realistic characteristic curve
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Draw white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 600, 400);
    
    // Draw grid lines
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (600 / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 400);
      ctx.stroke();
    }
    for (let i = 0; i <= 8; i++) {
      const y = (400 / 8) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(600, y);
      ctx.stroke();
    }
    
    // Draw axis labels
    ctx.fillStyle = '#374151';
    ctx.font = '14px Arial';
    ctx.fillText('Vds (V)', 280, 390);
    ctx.save();
    ctx.translate(20, 200);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Id (A)', 0, 0);
    ctx.restore();
    
    // Draw characteristic curves
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    const vgsValues = [0, 1, 2, 3, 4];
    
    vgsValues.forEach((vgs, index) => {
      ctx.strokeStyle = colors[index];
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i <= 600; i += 5) {
        const vds = (i / 600) * 10;
        let id = 0;
        
        if (vgs > 0) {
          if (vds < vgs) {
            id = (vgs - 1) * 0.5 * vds;
          } else {
            id = (vgs - 1) * 0.5 * vgs;
          }
          id = Math.max(0, id + Math.sin(vds * 0.5) * 0.1);
          id = Math.min(5, id);
        }
        
        const x = i;
        const y = 400 - (id / 5) * 400;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      
      // Add legend
      ctx.fillStyle = colors[index];
      ctx.fillText(`Vgs = ${vgs}V`, 450, 50 + index * 20);
    });
    
    // Add title
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Output Characteristics', 20, 30);
  }
  
  // Convert canvas to data URL and create file from it
  const dataUrl = canvas.toDataURL('image/png');
  const base64Data = dataUrl.split(',')[1];
  const binaryData = atob(base64Data);
  const bytes = new Uint8Array(binaryData.length);
  for (let i = 0; i < binaryData.length; i++) {
    bytes[i] = binaryData.charCodeAt(i);
  }
  
  return new File([bytes], filename, { type: 'image/png' });
};

// Mock data for TI, EPC, and Infineon products
const mockProducts: ProductWithParameters[] = [
  // EPC Products
  {
    id: 'epc-2010c',
    name: 'EPC2010C',
    manufacturer: 'EPC',
    partNumber: 'EPC2010C',
    deviceType: 'GaN FET',
    package: 'QFN',
    description: '100V GaN Power Transistor with ultra-low on-resistance',
    voltageRating: 100,
    currentRating: 12,
    powerRating: 120,
    datasheetUrl: 'https://epc-co.com/epc/Portals/0/epc/documents/datasheets/EPC2010C_datasheet.pdf',
    datasheetPath: '/datasheets/epc/EPC2010C_datasheet.pdf',
    spiceModelUrl: 'https://epc-co.com/epc/Portals/0/epc/documents/spice-models/EPC2010C.sp',
    spiceModelPath: '/spice-models/epc/EPC2010C.sp',
    productUrl: 'https://epc-co.com/epc/Products/Transistors/EPC2010C.aspx',
    ivCurveData: {
      url: 'https://epc-co.com/epc/Portals/0/epc/documents/datasheets/EPC2010C_IV_curves.csv',
      path: '/curves/epc/EPC2010C_IV_curves.csv',
      type: 'I-V Characteristics'
    },
    cvCurveData: {
      url: 'https://epc-co.com/epc/Portals/0/epc/documents/datasheets/EPC2010C_CV_curves.csv',
      path: '/curves/epc/EPC2010C_CV_curves.csv',
      type: 'C-V Characteristics'
    },
    characteristics: [
      {
        id: 'char-1',
        type: 'output',
        name: 'Output Characteristics',
        description: 'Drain current vs Drain-Source voltage at various gate voltages',
        csvPath: '/characteristics/epc2010c/output_data.csv',
        imagePath: '/characteristics/epc2010c/output_image.png',
        csvData: [
          { 'Vds(V)': '0', 'Id(A)': '0', 'Vgs(V)': '0' },
          { 'Vds(V)': '1', 'Id(A)': '0.3', 'Vgs(V)': '0' },
          { 'Vds(V)': '2', 'Id(A)': '0.8', 'Vgs(V)': '0' }
        ],
        imageFile: createMockImageFile('output_characteristics.png'),
        imageUrl: createMockImageUrl(),
        uploadedAt: new Date('2024-01-10')
      },
      {
        id: 'char-2',
        type: 'transfer',
        name: 'Transfer Characteristics',
        description: 'Drain current vs Gate-Source voltage at various drain voltages',
        csvPath: '/characteristics/epc2010c/transfer_data.csv',
        imagePath: '/characteristics/epc2010c/transfer_image.png',
        csvData: [
          { 'Vgs(V)': '-2', 'Id(A)': '0', 'Vds(V)': '5' },
          { 'Vgs(V)': '-1', 'Id(A)': '0.2', 'Vds(V)': '5' },
          { 'Vgs(V)': '0', 'Id(A)': '1.2', 'Vds(V)': '5' }
        ],
        imageFile: createMockImageFile('transfer_characteristics.png'),
        imageUrl: createMockImageUrl(),
        uploadedAt: new Date('2024-01-10')
      },
      {
        id: 'char-3',
        type: 'rds_vgs_temp',
        name: 'Rds(on) vs Vgs - Temperature',
        description: 'On-resistance vs Gate-Source voltage at various temperatures',
        csvPath: '/characteristics/epc2010c/rds_temp_data.csv',
        imagePath: '/characteristics/epc2010c/rds_temp_image.png',
        imageFile: createMockImageFile('rds_temp_characteristics.png'),
        imageUrl: createMockImageUrl(),
        // No csvData - this will show "Data Not Yet Extracted"
        uploadedAt: new Date('2024-01-12')
      }
    ],
    specifications: {
      'Vds': '100V',
      'Id': '12A',
      'Rds(on)': '2.8mΩ',
      'Qg': '1.8nC',
      'Qgd': '0.4nC',
      'Ciss': '680pF',
      'Coss': '120pF',
      'Crss': '15pF'
    },
    parameters: [
      { id: '1', name: 'Drain-Source Voltage', value: 100, unit: 'V', category: 'electrical' },
      { id: '2', name: 'Continuous Drain Current', value: 12, unit: 'A', category: 'electrical' },
      { id: '3', name: 'Drain-Source On-Resistance', value: 2.8, unit: 'mΩ', category: 'electrical' },
      { id: '4', name: 'Gate Charge', value: 1.8, unit: 'nC', category: 'electrical' },
      { id: '5', name: 'Input Capacitance', value: 680, unit: 'pF', category: 'electrical' },
      { id: '6', name: 'Thermal Resistance', value: 2.5, unit: '°C/W', category: 'thermal' }
    ],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'epc-2012c',
    name: 'EPC2012C',
    manufacturer: 'EPC',
    partNumber: 'EPC2012C',
    deviceType: 'GaN FET',
    package: 'QFN',
    description: '100V GaN Power Transistor optimized for high-frequency switching',
    voltageRating: 100,
    currentRating: 15,
    powerRating: 150,
    datasheetUrl: 'https://epc-co.com/epc/Portals/0/epc/documents/datasheets/EPC2012C_datasheet.pdf',
    datasheetPath: '/datasheets/epc/EPC2012C_datasheet.pdf',
    spiceModelUrl: 'https://epc-co.com/epc/Portals/0/epc/documents/spice-models/EPC2012C.sp',
    spiceModelPath: '/spice-models/epc/EPC2012C.sp',
    productUrl: 'https://epc-co.com/epc/Products/Transistors/EPC2012C.aspx',
    specifications: {
      'Vds': '100V',
      'Id': '15A',
      'Rds(on)': '2.2mΩ',
      'Qg': '2.1nC',
      'Qgd': '0.5nC',
      'Ciss': '750pF',
      'Coss': '140pF',
      'Crss': '18pF'
    },
    characteristics: [
      {
        id: 'char-1',
        type: 'output',
        name: 'Output Characteristics',
        description: 'Drain current vs Drain-Source voltage at various gate voltages',
        csvPath: '/characteristics/epc2012c/output_data.csv',
        imagePath: '/characteristics/epc2012c/output_image.png',
        csvData: [
          { 'Vds(V)': '0', 'Id(A)': '0', 'Vgs(V)': '0' },
          { 'Vds(V)': '1', 'Id(A)': '0.5', 'Vgs(V)': '0' },
          { 'Vds(V)': '2', 'Id(A)': '1.2', 'Vgs(V)': '0' }
        ],
        imageFile: createMockImageFile('output_characteristics.png'),
        imageUrl: createMockImageUrl(),
        uploadedAt: new Date('2024-01-15')
      },
      {
        id: 'char-2',
        type: 'transfer',
        name: 'Transfer Characteristics',
        description: 'Drain current vs Gate-Source voltage at various drain voltages',
        csvPath: '/characteristics/epc2012c/transfer_data.csv',
        imagePath: '/characteristics/epc2012c/transfer_image.png',
        csvData: [
          { 'Vgs(V)': '-2', 'Id(A)': '0', 'Vds(V)': '5' },
          { 'Vgs(V)': '-1', 'Id(A)': '0.3', 'Vds(V)': '5' },
          { 'Vgs(V)': '0', 'Id(A)': '1.8', 'Vds(V)': '5' }
        ],
        imageFile: createMockImageFile('transfer_characteristics.png'),
        imageUrl: createMockImageUrl(),
        uploadedAt: new Date('2024-01-15')
      },
      {
        id: 'char-3',
        type: 'rds_vgs_temp',
        name: 'Rds(on) vs Vgs - Temperature',
        description: 'On-resistance vs Gate-Source voltage at various temperatures',
        csvPath: '/characteristics/epc2012c/rds_temp_data.csv',
        imagePath: '/characteristics/epc2012c/rds_temp_image.png',
        csvData: [
          { 'Vgs(V)': '0', 'Rds(mΩ)': '25', 'Temp(°C)': '25' },
          { 'Vgs(V)': '2', 'Rds(mΩ)': '15', 'Temp(°C)': '25' },
          { 'Vgs(V)': '4', 'Rds(mΩ)': '12', 'Temp(°C)': '25' }
        ],
        imageFile: createMockImageFile('rds_temp_characteristics.png'),
        imageUrl: createMockImageUrl(),
        uploadedAt: new Date('2024-01-16')
      },
      {
        id: 'char-4',
        type: 'capacitance',
        name: 'Typical Capacitance',
        description: 'Input, output, and reverse transfer capacitance vs frequency',
        csvPath: '/characteristics/epc2012c/capacitance_data.csv',
        imagePath: '/characteristics/epc2012c/capacitance_image.png',
        imageFile: createMockImageFile('capacitance_characteristics.png'),
        imageUrl: createMockImageUrl(),
        // No csvData - this will show "Data Not Yet Extracted"
        uploadedAt: new Date('2024-01-18')
      }
    ],
    parameters: [
      { id: '1', name: 'Drain-Source Voltage', value: 100, unit: 'V', category: 'electrical' },
      { id: '2', name: 'Continuous Drain Current', value: 15, unit: 'A', category: 'electrical' },
      { id: '3', name: 'Drain-Source On-Resistance', value: 2.2, unit: 'mΩ', category: 'electrical' },
      { id: '4', name: 'Gate Charge', value: 2.1, unit: 'nC', category: 'electrical' },
      { id: '5', name: 'Input Capacitance', value: 750, unit: 'pF', category: 'electrical' },
      { id: '6', name: 'Thermal Resistance', value: 2.0, unit: '°C/W', category: 'thermal' }
    ],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: 'epc-2014c',
    name: 'EPC2014C',
    manufacturer: 'EPC',
    partNumber: 'EPC2014C',
    deviceType: 'GaN FET',
    package: 'QFN',
    description: '100V GaN Power Transistor for high-power applications',
    voltageRating: 100,
    currentRating: 20,
    powerRating: 200,
    datasheetUrl: 'https://epc-co.com/epc/Portals/0/epc/documents/datasheets/EPC2014C_datasheet.pdf',
    datasheetPath: '/datasheets/epc/EPC2014C_datasheet.pdf',
    spiceModelUrl: 'https://epc-co.com/epc/Portals/0/epc/documents/spice-models/EPC2014C.sp',
    spiceModelPath: '/spice-models/epc/EPC2014C.sp',
    productUrl: 'https://epc-co.com/epc/Products/Transistors/EPC2014C.aspx',
    characteristics: [
      {
        id: 'char-1',
        type: 'output',
        name: 'Output Characteristics',
        description: 'Drain current vs Drain-Source voltage at various gate voltages',
        csvPath: '/characteristics/epc2014c/output_data.csv',
        imagePath: '/characteristics/epc2014c/output_image.png',
        csvData: [
          { 'Vds(V)': '0', 'Id(A)': '0', 'Vgs(V)': '0' },
          { 'Vds(V)': '1', 'Id(A)': '0.8', 'Vgs(V)': '0' },
          { 'Vds(V)': '2', 'Id(A)': '2.1', 'Vgs(V)': '0' }
        ],
        imageFile: createMockImageFile('output_characteristics.png'),
        imageUrl: createMockImageUrl(),
        uploadedAt: new Date('2024-02-01')
      },
      {
        id: 'char-2',
        type: 'rds_vgs_temp',
        name: 'Rds(on) vs Vgs - Temperature',
        description: 'On-resistance vs Gate-Source voltage at various temperatures',
        csvPath: '/characteristics/epc2014c/rds_temp_data.csv',
        imagePath: '/characteristics/epc2014c/rds_temp_image.png',
        csvData: [
          { 'Vgs(V)': '0', 'Rds(mΩ)': '20', 'Temp(°C)': '25' },
          { 'Vgs(V)': '2', 'Rds(mΩ)': '12', 'Temp(°C)': '25' },
          { 'Vgs(V)': '4', 'Rds(mΩ)': '8', 'Temp(°C)': '25' }
        ],
        imageFile: createMockImageFile('rds_temp_characteristics.png'),
        imageUrl: createMockImageUrl(),
        uploadedAt: new Date('2024-02-01')
      }
    ],
    specifications: {
      'Vds': '100V',
      'Id': '20A',
      'Rds(on)': '1.8mΩ',
      'Qg': '2.5nC',
      'Qgd': '0.6nC',
      'Ciss': '850pF',
      'Coss': '160pF',
      'Crss': '20pF'
    },
    characteristics: [],
    parameters: [
      { id: '1', name: 'Drain-Source Voltage', value: 100, unit: 'V', category: 'electrical' },
      { id: '2', name: 'Continuous Drain Current', value: 20, unit: 'A', category: 'electrical' },
      { id: '3', name: 'Drain-Source On-Resistance', value: 1.8, unit: 'mΩ', category: 'electrical' },
      { id: '4', name: 'Gate Charge', value: 2.5, unit: 'nC', category: 'electrical' },
      { id: '5', name: 'Input Capacitance', value: 850, unit: 'pF', category: 'electrical' },
      { id: '6', name: 'Thermal Resistance', value: 1.8, unit: '°C/W', category: 'thermal' }
    ],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  },

  // TI Products
  {
    id: 'ti-lm5116',
    name: 'LM5116',
    manufacturer: 'TI',
    partNumber: 'LM5116',
    deviceType: 'Buck Controller',
    package: 'SOIC-8',
    description: '100V Half-Bridge Gate Driver with High-Side and Low-Side Drivers',
    voltageRating: 100,
    currentRating: 3,
    powerRating: 30,
    datasheetUrl: 'https://www.ti.com/lit/ds/symlink/lm5116.pdf',
    datasheetPath: '/datasheets/ti/LM5116_datasheet.pdf',
    spiceModelUrl: 'https://www.ti.com/lit/zip/slom123',
    spiceModelPath: '/spice-models/ti/LM5116.sp',
    productUrl: 'https://www.ti.com/product/LM5116',
    specifications: {
      'Vcc': '100V',
      'Iout': '3A',
      'Propagation Delay': '25ns',
      'Rise Time': '8ns',
      'Fall Time': '7ns',
      'Operating Temperature': '-40°C to +125°C'
    },
    characteristics: [
      {
        id: 'char-1',
        type: 'output',
        name: 'Output Characteristics',
        description: 'Output voltage vs load current characteristics',
        csvPath: '/characteristics/ti-lm5116/output_data.csv',
        imagePath: '/characteristics/ti-lm5116/output_image.png',
        csvData: [
          { 'Load(A)': '0', 'Vout(V)': '5.0', 'Efficiency(%)': '85' },
          { 'Load(A)': '1', 'Vout(V)': '4.95', 'Efficiency(%)': '88' },
          { 'Load(A)': '2', 'Vout(V)': '4.90', 'Efficiency(%)': '90' }
        ],
        imageFile: createMockImageFile('output_characteristics.png'),
        imageUrl: createMockImageUrl(),
        uploadedAt: new Date('2024-01-10')
      }
    ],
    parameters: [
      { id: '1', name: 'Supply Voltage', value: 100, unit: 'V', category: 'electrical' },
      { id: '2', name: 'Output Current', value: 3, unit: 'A', category: 'electrical' },
      { id: '3', name: 'Propagation Delay', value: 25, unit: 'ns', category: 'electrical' },
      { id: '4', name: 'Rise Time', value: 8, unit: 'ns', category: 'electrical' },
      { id: '5', name: 'Fall Time', value: 7, unit: 'ns', category: 'electrical' },
      { id: '6', name: 'Operating Temperature', value: -40, unit: '°C', category: 'thermal' }
    ],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10')
  },
  {
    id: 'ti-ucc28064',
    name: 'UCC28064',
    manufacturer: 'TI',
    partNumber: 'UCC28064',
    deviceType: 'PFC Controller',
    package: 'SOIC-8',
    description: 'Natural Interleaving Transition-Mode PFC Controller',
    voltageRating: 600,
    currentRating: 0.5,
    powerRating: 5,
    datasheetUrl: 'https://www.ti.com/lit/ds/symlink/ucc28064.pdf',
    datasheetPath: '/datasheets/ti/UCC28064_datasheet.pdf',
    spiceModelUrl: 'https://www.ti.com/lit/zip/slom124',
    spiceModelPath: '/spice-models/ti/UCC28064.sp',
    productUrl: 'https://www.ti.com/product/UCC28064',
    specifications: {
      'Vcc': '600V',
      'Iout': '0.5A',
      'Switching Frequency': '65kHz',
      'Operating Temperature': '-40°C to +125°C',
      'Package': 'SOIC-8'
    },
    characteristics: [],
    parameters: [
      { id: '1', name: 'Supply Voltage', value: 600, unit: 'V', category: 'electrical' },
      { id: '2', name: 'Output Current', value: 0.5, unit: 'A', category: 'electrical' },
      { id: '3', name: 'Switching Frequency', value: 65, unit: 'kHz', category: 'electrical' },
      { id: '4', name: 'Operating Temperature Min', value: -40, unit: '°C', category: 'thermal' },
      { id: '5', name: 'Operating Temperature Max', value: 125, unit: '°C', category: 'thermal' },
      { id: '6', name: 'Package Type', value: 'SOIC-8', category: 'mechanical' }
    ],
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25')
  },
  {
    id: 'ti-tps62933',
    name: 'TPS62933',
    manufacturer: 'TI',
    partNumber: 'TPS62933',
    deviceType: 'Buck Converter',
    package: 'QFN-8',
    description: '3A, 17V Input, 1.8MHz Step-Down Converter',
    voltageRating: 17,
    currentRating: 3,
    powerRating: 25,
    datasheetUrl: 'https://www.ti.com/lit/ds/symlink/tps62933.pdf',
    datasheetPath: '/datasheets/ti/TPS62933_datasheet.pdf',
    spiceModelUrl: 'https://www.ti.com/lit/zip/slom125',
    spiceModelPath: '/spice-models/ti/TPS62933.sp',
    productUrl: 'https://www.ti.com/product/TPS62933',
    specifications: {
      'Vin': '17V',
      'Iout': '3A',
      'Switching Frequency': '1.8MHz',
      'Efficiency': '95%',
      'Operating Temperature': '-40°C to +125°C'
    },
    parameters: [
      { id: '1', name: 'Input Voltage', value: 17, unit: 'V', category: 'electrical' },
      { id: '2', name: 'Output Current', value: 3, unit: 'A', category: 'electrical' },
      { id: '3', name: 'Switching Frequency', value: 1.8, unit: 'MHz', category: 'electrical' },
      { id: '4', name: 'Efficiency', value: 95, unit: '%', category: 'electrical' },
      { id: '5', name: 'Operating Temperature Min', value: -40, unit: '°C', category: 'thermal' },
      { id: '6', name: 'Operating Temperature Max', value: 125, unit: '°C', category: 'thermal' }
    ],
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05')
  },

  // Infineon Products
  {
    id: 'infineon-ipd90p04p4l',
    name: 'IPD90P04P4L',
    manufacturer: 'Infineon',
    partNumber: 'IPD90P04P4L',
    deviceType: 'Power MOSFET',
    package: 'TO-252',
    description: '90V P-Channel Power MOSFET with ultra-low on-resistance',
    voltageRating: 90,
    currentRating: 4,
    powerRating: 40,
    datasheetUrl: 'https://www.infineon.com/dgdl/Infineon-IPD90P04P4L-DataSheet-v02_00-EN.pdf',
    datasheetPath: '/datasheets/infineon/IPD90P04P4L_datasheet.pdf',
    spiceModelUrl: 'https://www.infineon.com/dgdl/Infineon-IPD90P04P4L-SpiceModel-v01_00-EN.zip',
    spiceModelPath: '/spice-models/infineon/IPD90P04P4L.sp',
    productUrl: 'https://www.infineon.com/cms/en/product/power/mosfet/automotive-mosfet/ipd90p04p4l/',
    specifications: {
      'Vds': '90V',
      'Id': '4A',
      'Rds(on)': '40mΩ',
      'Qg': '8nC',
      'Qgd': '2nC',
      'Ciss': '1200pF',
      'Coss': '200pF',
      'Crss': '50pF'
    },
    parameters: [
      { id: '1', name: 'Drain-Source Voltage', value: 90, unit: 'V', category: 'electrical' },
      { id: '2', name: 'Continuous Drain Current', value: 4, unit: 'A', category: 'electrical' },
      { id: '3', name: 'Drain-Source On-Resistance', value: 40, unit: 'mΩ', category: 'electrical' },
      { id: '4', name: 'Gate Charge', value: 8, unit: 'nC', category: 'electrical' },
      { id: '5', name: 'Input Capacitance', value: 1200, unit: 'pF', category: 'electrical' },
      { id: '6', name: 'Thermal Resistance', value: 3.5, unit: '°C/W', category: 'thermal' }
    ],
    createdAt: new Date('2024-01-30'),
    updatedAt: new Date('2024-01-30')
  },
  {
    id: 'infineon-ipd60r360p7',
    name: 'IPD60R360P7',
    manufacturer: 'Infineon',
    partNumber: 'IPD60R360P7',
    deviceType: 'Power MOSFET',
    package: 'TO-252',
    description: '600V CoolMOS P7 Power MOSFET for high-efficiency applications',
    voltageRating: 600,
    currentRating: 6,
    powerRating: 60,
    datasheetUrl: 'https://www.infineon.com/dgdl/Infineon-IPD60R360P7-DataSheet-v02_00-EN.pdf',
    datasheetPath: '/datasheets/infineon/IPD60R360P7_datasheet.pdf',
    spiceModelUrl: 'https://www.infineon.com/dgdl/Infineon-IPD60R360P7-SpiceModel-v01_00-EN.zip',
    spiceModelPath: '/spice-models/infineon/IPD60R360P7.sp',
    productUrl: 'https://www.infineon.com/cms/en/product/power/mosfet/automotive-mosfet/ipd60r360p7/',
    specifications: {
      'Vds': '600V',
      'Id': '6A',
      'Rds(on)': '360mΩ',
      'Qg': '15nC',
      'Qgd': '4nC',
      'Ciss': '1800pF',
      'Coss': '300pF',
      'Crss': '80pF'
    },
    parameters: [
      { id: '1', name: 'Drain-Source Voltage', value: 600, unit: 'V', category: 'electrical' },
      { id: '2', name: 'Continuous Drain Current', value: 6, unit: 'A', category: 'electrical' },
      { id: '3', name: 'Drain-Source On-Resistance', value: 360, unit: 'mΩ', category: 'electrical' },
      { id: '4', name: 'Gate Charge', value: 15, unit: 'nC', category: 'electrical' },
      { id: '5', name: 'Input Capacitance', value: 1800, unit: 'pF', category: 'electrical' },
      { id: '6', name: 'Thermal Resistance', value: 4.2, unit: '°C/W', category: 'thermal' }
    ],
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10')
  },
  {
    id: 'infineon-ipd50r140p7',
    name: 'IPD50R140P7',
    manufacturer: 'Infineon',
    partNumber: 'IPD50R140P7',
    deviceType: 'Power MOSFET',
    package: 'TO-252',
    description: '500V CoolMOS P7 Power MOSFET with ultra-low on-resistance',
    voltageRating: 500,
    currentRating: 8,
    powerRating: 80,
    datasheetUrl: 'https://www.infineon.com/dgdl/Infineon-IPD50R140P7-DataSheet-v02_00-EN.pdf',
    datasheetPath: '/datasheets/infineon/IPD50R140P7_datasheet.pdf',
    spiceModelUrl: 'https://www.infineon.com/dgdl/Infineon-IPD50R140P7-SpiceModel-v01_00-EN.zip',
    spiceModelPath: '/spice-models/infineon/IPD50R140P7.sp',
    productUrl: 'https://www.infineon.com/cms/en/product/power/mosfet/automotive-mosfet/ipd50r140p7/',
    specifications: {
      'Vds': '500V',
      'Id': '8A',
      'Rds(on)': '140mΩ',
      'Qg': '20nC',
      'Qgd': '5nC',
      'Ciss': '2200pF',
      'Coss': '400pF',
      'Crss': '100pF'
    },
    characteristics: [],
    parameters: [
      { id: '1', name: 'Drain-Source Voltage', value: 500, unit: 'V', category: 'electrical' },
      { id: '2', name: 'Continuous Drain Current', value: 8, unit: 'A', category: 'electrical' },
      { id: '3', name: 'Drain-Source On-Resistance', value: 140, unit: 'mΩ', category: 'electrical' },
      { id: '4', name: 'Gate Charge', value: 20, unit: 'nC', category: 'electrical' },
      { id: '5', name: 'Input Capacitance', value: 2200, unit: 'pF', category: 'electrical' },
      { id: '6', name: 'Thermal Resistance', value: 3.8, unit: '°C/W', category: 'thermal' }
    ],
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15')
  }
];

class ProductManagementService {
  private products: ProductWithParameters[] = [...mockProducts];

  /**
   * Get all products with optional filtering
   */
  async getProducts(filter?: ProductFilter): Promise<ProductWithParameters[]> {
    try {
      let filteredProducts = [...this.products];

      if (filter) {
        if (filter.manufacturer) {
          filteredProducts = filteredProducts.filter(p => 
            p.manufacturer.toLowerCase().includes(filter.manufacturer!.toLowerCase())
          );
        }

        if (filter.deviceType) {
          filteredProducts = filteredProducts.filter(p => 
            p.deviceType.toLowerCase().includes(filter.deviceType!.toLowerCase())
          );
        }

        if (filter.package) {
          filteredProducts = filteredProducts.filter(p => 
            p.package.toLowerCase().includes(filter.package!.toLowerCase())
          );
        }

        if (filter.voltageRating) {
          if (filter.voltageRating.min !== undefined) {
            filteredProducts = filteredProducts.filter(p => 
              p.voltageRating && p.voltageRating >= filter.voltageRating!.min!
            );
          }
          if (filter.voltageRating.max !== undefined) {
            filteredProducts = filteredProducts.filter(p => 
              p.voltageRating && p.voltageRating <= filter.voltageRating!.max!
            );
          }
        }

        if (filter.currentRating) {
          if (filter.currentRating.min !== undefined) {
            filteredProducts = filteredProducts.filter(p => 
              p.currentRating && p.currentRating >= filter.currentRating!.min!
            );
          }
          if (filter.currentRating.max !== undefined) {
            filteredProducts = filteredProducts.filter(p => 
              p.currentRating && p.currentRating <= filter.currentRating!.max!
            );
          }
        }

        if (filter.searchTerm) {
          const searchTerm = filter.searchTerm.toLowerCase();
          filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            p.partNumber.toLowerCase().includes(searchTerm) ||
            p.manufacturer.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm)
          );
        }
      }

      return filteredProducts;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new Error('Failed to fetch products');
    }
  }

  /**
   * Get a single product by ID
   */
  async getProduct(id: string): Promise<ProductWithParameters | null> {
    try {
      const product = this.products.find(p => p.id === id);
      return product || null;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw new Error('Failed to fetch product');
    }
  }

  /**
   * Create a new product
   */
  async createProduct(input: ProductCreateInput): Promise<ProductWithParameters> {
    try {
      const newProduct: ProductWithParameters = {
        id: `product-${Date.now()}`,
        ...input,
        specifications: input.specifications || {},
        parameters: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.products.push(newProduct);
      return newProduct;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error('Failed to create product');
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(input: ProductUpdateInput): Promise<ProductWithParameters> {
    try {
      const index = this.products.findIndex(p => p.id === input.id);
      if (index === -1) {
        throw new Error('Product not found');
      }

      this.products[index] = {
        ...this.products[index],
        ...input,
        updatedAt: new Date()
      };

      return this.products[index];
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error('Failed to update product');
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string): Promise<boolean> {
    try {
      const index = this.products.findIndex(p => p.id === id);
      if (index === -1) {
        return false;
      }

      this.products.splice(index, 1);
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Failed to delete product');
    }
  }

  /**
   * Auto-structure manufacturer product data
   */
  async autoStructureProductData(file: File): Promise<AutoStructureResult> {
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const structuredData: ProductCreateInput[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const values = line.split(',').map(v => v.trim());
          const rowData: any = {};
          
          headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });

          // Auto-detect manufacturer from common patterns
          let manufacturer = 'Unknown';
          if (rowData.manufacturer) {
            manufacturer = rowData.manufacturer;
          } else if (rowData.part_number) {
            const partNumber = rowData.part_number.toUpperCase();
            if (partNumber.startsWith('EPC')) manufacturer = 'EPC';
            else if (partNumber.startsWith('LM') || partNumber.startsWith('TPS') || partNumber.startsWith('UCC')) manufacturer = 'TI';
            else if (partNumber.startsWith('IPD')) manufacturer = 'Infineon';
          }

          // Auto-detect device type from part number or description
          let deviceType = 'Unknown';
          if (rowData.device_type) {
            deviceType = rowData.device_type;
          } else if (rowData.description) {
            const desc = rowData.description.toLowerCase();
            if (desc.includes('gan') || desc.includes('gallium nitride')) deviceType = 'GaN FET';
            else if (desc.includes('mosfet')) deviceType = 'Power MOSFET';
            else if (desc.includes('controller')) deviceType = 'Controller';
            else if (desc.includes('converter')) deviceType = 'Converter';
          }

          // Auto-detect package
          let packageType = 'Unknown';
          if (rowData.package) {
            packageType = rowData.package;
          } else if (rowData.description) {
            const desc = rowData.description.toLowerCase();
            if (desc.includes('qfn')) packageType = 'QFN';
            else if (desc.includes('soic')) packageType = 'SOIC';
            else if (desc.includes('to-252')) packageType = 'TO-252';
          }

          // Extract voltage and current ratings
          let voltageRating: number | undefined;
          let currentRating: number | undefined;
          
          if (rowData.voltage_rating) {
            voltageRating = parseFloat(rowData.voltage_rating);
          } else if (rowData.vds) {
            voltageRating = parseFloat(rowData.vds);
          }

          if (rowData.current_rating) {
            currentRating = parseFloat(rowData.current_rating);
          } else if (rowData.id) {
            currentRating = parseFloat(rowData.id);
          }

          const structuredProduct: ProductCreateInput = {
            name: rowData.name || rowData.part_number || 'Unknown',
            manufacturer,
            partNumber: rowData.part_number || rowData.partnumber || 'Unknown',
            deviceType,
            package: packageType,
            description: rowData.description || rowData.desc || '',
            voltageRating,
            currentRating
          };

          structuredData.push(structuredProduct);
        } catch (error) {
          errors.push(`Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { success: true, structuredData, errors };
    } catch (error) {
      console.error('Error auto-structuring data:', error);
      throw new Error('Failed to auto-structure product data');
    }
  }

  /**
   * Import products from CSV file with auto-structuring
   */
  async importProductsFromCSV(file: File): Promise<CSVImportResult> {
    try {
      // First, auto-structure the data
      const structureResult = await this.autoStructureProductData(file);
      
      if (!structureResult.success) {
        return { success: false, imported: 0, failed: structureResult.structuredData.length, errors: structureResult.errors };
      }

      let imported = 0;
      let failed = 0;
      const errors: string[] = [];

      // Import the structured data
      for (const structuredProduct of structureResult.structuredData) {
        try {
          // Validate required fields
          if (!structuredProduct.name || !structuredProduct.manufacturer || !structuredProduct.partNumber) {
            failed++;
            errors.push(`Missing required fields for product: ${structuredProduct.name || 'Unknown'}`);
            continue;
          }

          // Create product with enhanced data
          const newProduct: ProductWithParameters = {
            id: `imported-${Date.now()}-${imported}`,
            ...structuredProduct,
            specifications: {},
            parameters: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          this.products.push(newProduct);
          imported++;
        } catch (error) {
          failed++;
          errors.push(`Error creating product ${structuredProduct.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { success: true, imported, failed, errors };
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw new Error('Failed to import CSV file');
    }
  }

  /**
   * Export products to CSV
   */
  async exportProductsToCSV(filter?: ProductFilter): Promise<string> {
    try {
      const products = await this.getProducts(filter);
      
      const headers = [
        'id', 'name', 'manufacturer', 'partNumber', 'deviceType', 'package', 
        'description', 'voltageRating', 'currentRating', 'powerRating', 
        'datasheetUrl', 'spiceModelUrl', 'productUrl', 'createdAt', 'updatedAt'
      ];

      const csvLines = [headers.join(',')];

      products.forEach(product => {
        const values = headers.map(header => {
          const value = product[header as keyof ProductWithParameters];
          if (value instanceof Date) {
            return value.toISOString();
          }
          return value || '';
        });
        csvLines.push(values.join(','));
      });

      return csvLines.join('\n');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw new Error('Failed to export CSV');
    }
  }

  /**
   * Get product statistics
   */
  async getStatistics(): Promise<{
    totalProducts: number;
    manufacturers: number;
    deviceTypes: number;
    manufacturersList: string[];
    deviceTypesList: string[];
  }> {
    try {
      const manufacturers = new Set(this.products.map(p => p.manufacturer));
      const deviceTypes = new Set(this.products.map(p => p.deviceType));

      return {
        totalProducts: this.products.length,
        manufacturers: manufacturers.size,
        deviceTypes: deviceTypes.size,
        manufacturersList: Array.from(manufacturers),
        deviceTypesList: Array.from(deviceTypes)
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw new Error('Failed to fetch statistics');
    }
  }

  /**
   * Download datasheet for a product
   */
  async downloadDatasheet(productId: string): Promise<boolean> {
    try {
      const product = await this.getProduct(productId);
      if (!product || !product.datasheetUrl) {
        throw new Error('Product or datasheet URL not found');
      }

      console.log(`Downloading datasheet for ${product.name} from ${product.datasheetUrl}`);

      // Download the file from the web URL
      const response = await fetch(product.datasheetUrl);
      if (!response.ok) {
        throw new Error(`Failed to download datasheet: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Create a local file path for the downloaded datasheet
      const fileName = product.datasheetPath || `datasheet_${product.partNumber}.pdf`;
      const localPath = `downloads/datasheets/${product.id}/${fileName}`;
      
      // In a real Tauri app, you would save the file to the local filesystem
      // For now, we'll create a blob URL and update the product
      const blobUrl = URL.createObjectURL(blob);
      
      // Update the product with the local datasheet path
      await this.updateProduct({
        id: product.id,
        datasheetPath: localPath,
        datasheetUrl: blobUrl // Use blob URL for local viewing
      });

      console.log(`Datasheet downloaded successfully to ${localPath}`);
      return true;
    } catch (error) {
      console.error('Error downloading datasheet:', error);
      throw new Error('Failed to download datasheet');
    }
  }

  /**
   * Download SPICE model for a product
   */
  async downloadSpiceModel(productId: string): Promise<boolean> {
    try {
      const product = await this.getProduct(productId);
      if (!product || !product.spiceModelUrl) {
        throw new Error('Product or SPICE model URL not found');
      }

      console.log(`Downloading SPICE model for ${product.name} from ${product.spiceModelUrl}`);

      // Download the file from the web URL
      const response = await fetch(product.spiceModelUrl);
      if (!response.ok) {
        throw new Error(`Failed to download SPICE model: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Create a local file path for the downloaded SPICE model
      const fileName = product.spiceModelPath || `spice_${product.partNumber}.lib`;
      const localPath = `downloads/spice_models/${product.id}/${fileName}`;
      
      // Create a blob URL for the downloaded file
      const blobUrl = URL.createObjectURL(blob);
      
      // Update the product with the local SPICE model path
      await this.updateProduct({
        id: product.id,
        spiceModelPath: localPath,
        spiceModelUrl: blobUrl // Use blob URL for local access
      });

      console.log(`SPICE model downloaded successfully to ${localPath}`);
      return true;
    } catch (error) {
      console.error('Error downloading SPICE model:', error);
      throw new Error('Failed to download SPICE model');
    }
  }

  /**
   * View datasheet for a product
   */
  async viewDatasheet(productId: string): Promise<string | null> {
    try {
      const product = await this.getProduct(productId);
      if (!product) {
        return null;
      }

      // If we have a local datasheet path (blob URL), use it directly
      if (product.datasheetUrl && product.datasheetUrl.startsWith('blob:')) {
        return product.datasheetUrl;
      }

      // If we have a datasheet URL but haven't downloaded it yet, download it first
      if (product.datasheetUrl && !product.datasheetPath) {
        await this.downloadDatasheet(productId);
        const updatedProduct = await this.getProduct(productId);
        return updatedProduct?.datasheetUrl || null;
      }

      // If we have a local path, return it
      if (product.datasheetPath) {
        return product.datasheetPath;
      }

      return null;
    } catch (error) {
      console.error('Error viewing datasheet:', error);
      throw new Error('Failed to view datasheet');
    }
  }

  /**
   * Auto-scrape products from manufacturer websites
   */
  async autoScrapeProducts(manufacturer: string, category?: string, maxProducts: number = 50): Promise<{
    success: boolean;
    scraped: number;
    errors: string[];
  }> {
    try {
      // Import the web scraping service dynamically to avoid circular dependencies
      const { default: webScrapingService } = await import('./webScrapingService');
      
      // Start scraping job
      const jobResponse = await webScrapingService.startScrapingJob({
        manufacturer,
        category,
        max_products: maxProducts,
        include_datasheets: true,
        include_spice_models: true
      });

      if (!jobResponse.job_id) {
        throw new Error('Failed to start scraping job');
      }

      // Monitor job progress
      let jobStatus = await webScrapingService.getJobStatus(jobResponse.job_id);
      while (jobStatus && jobStatus.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        jobStatus = await webScrapingService.getJobStatus(jobResponse.job_id);
      }

      if (jobStatus && jobStatus.status === 'completed') {
        // Get scraped products
        const scrapedProducts = await webScrapingService.getProducts(manufacturer, category, maxProducts);
        
        let scraped = 0;
        const errors: string[] = [];

        // Convert scraped products to our format and add to database
        for (const scrapedProduct of scrapedProducts) {
          try {
            const newProduct: ProductWithParameters = {
              id: `scraped-${Date.now()}-${scraped}`,
              name: scrapedProduct.name,
              manufacturer: scrapedProduct.manufacturer,
              partNumber: scrapedProduct.part_number,
              deviceType: scrapedProduct.category || 'Unknown',
              package: 'Unknown',
              description: scrapedProduct.description,
              voltageRating: scrapedProduct.voltage_rating,
              currentRating: scrapedProduct.current_rating,
              powerRating: scrapedProduct.power_rating,
              datasheetUrl: scrapedProduct.datasheet_url,
              datasheetPath: scrapedProduct.datasheet_path,
              spiceModelUrl: scrapedProduct.spice_model_url,
              spiceModelPath: scrapedProduct.spice_model_path,
              productUrl: scrapedProduct.product_url,
              imageUrl: scrapedProduct.image_url,
              specifications: scrapedProduct.specifications || {},
              parameters: [],
              createdAt: new Date(),
              updatedAt: new Date()
            };

            this.products.push(newProduct);
            scraped++;
          } catch (error) {
            errors.push(`Error processing scraped product ${scrapedProduct.part_number}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        return { success: true, scraped, errors };
      } else {
        throw new Error(`Scraping job failed with status: ${jobStatus?.status}`);
      }
    } catch (error) {
      console.error('Error auto-scraping products:', error);
      throw new Error('Failed to auto-scrape products');
    }
  }

  /**
   * Upload characteristic data for a product
   */
  async uploadCharacteristicData(
    productId: string, 
    characteristicData: Omit<CharacteristicData, 'id' | 'uploadedAt'>
  ): Promise<CharacteristicData> {
    try {
      const product = this.products.find(p => p.id === productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const newCharacteristic: CharacteristicData = {
        ...characteristicData,
        id: `char-${Date.now()}-${Math.random()}`,
        uploadedAt: new Date()
      };

      // Initialize characteristics array if it doesn't exist
      if (!product.characteristics) {
        product.characteristics = [];
      }

      // Remove existing characteristic of the same type if it exists
      product.characteristics = product.characteristics.filter(
        c => c.type !== characteristicData.type
      );

      // Add new characteristic
      product.characteristics.push(newCharacteristic);
      product.updatedAt = new Date();

      return newCharacteristic;
    } catch (error) {
      console.error('Error uploading characteristic data:', error);
      throw new Error('Failed to upload characteristic data');
    }
  }

  /**
   * Get characteristic data for a product
   */
  async getCharacteristicData(productId: string): Promise<CharacteristicData[]> {
    try {
      const product = this.products.find(p => p.id === productId);
      if (!product) {
        throw new Error('Product not found');
      }

      return product.characteristics || [];
    } catch (error) {
      console.error('Error fetching characteristic data:', error);
      throw new Error('Failed to fetch characteristic data');
    }
  }

  /**
   * Delete characteristic data for a product
   */
  async deleteCharacteristicData(productId: string, characteristicId: string): Promise<boolean> {
    try {
      const product = this.products.find(p => p.id === productId);
      if (!product) {
        throw new Error('Product not found');
      }

      if (!product.characteristics) {
        return false;
      }

      const initialLength = product.characteristics.length;
      product.characteristics = product.characteristics.filter(c => c.id !== characteristicId);
      
      if (product.characteristics.length < initialLength) {
        product.updatedAt = new Date();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting characteristic data:', error);
      throw new Error('Failed to delete characteristic data');
    }
  }
}

// Export singleton instance
const productManagementService = new ProductManagementService();
export default productManagementService; 