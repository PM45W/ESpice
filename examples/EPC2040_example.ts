// EPC2040 Output Characteristics Configuration Example
// Based on datasheet: https://epc-co.com/epc/portals/0/epc/documents/datasheets/EPC2040_datasheet.pdf

import { CurveExtractionService } from '../apps/desktop/src/services/curveExtractionService';

// Initialize the curve extraction service
const curveService = CurveExtractionService.getInstance();

// EPC2040 Output Characteristics Configuration
const epc2040Config = {
  x_axis_name: 'VDS',
  y_axis_name: 'ID',
  x_min: 0,
  x_max: 3,
  y_min: 0,
  y_max: 27.5,
  x_scale_type: 'linear' as const,
  y_scale_type: 'linear' as const,
  x_scale: 1,
  y_scale: 1,
  title: 'EPC2040 Output Characteristics at 25°C',
  description: 'Drain Current vs Drain-Source Voltage for different Gate-Source Voltages'
};

// Color mapping for VGS curves
const colorMapping = {
  'red': '5V',    // VGS = 5V
  'green': '4V',  // VGS = 4V
  'yellow': '3V', // VGS = 3V
  'blue': '2V'    // VGS = 2V
};

// Example usage function
export async function extractEPC2040Curves(imageData: Uint8Array) {
  try {
    // Set EPC2040 preset for fixed offsets (no scaling)
    curveService.setGraphPreset('epc2040_output');
    
    // Extract curves with EPC2040 configuration
    const result = await curveService.extractCurves(
      imageData, 
      ['red', 'green', 'yellow', 'blue'], 
      epc2040Config
    );
    
    console.log('EPC2040 curves extracted successfully');
    console.log('Color mapping:', colorMapping);
    console.log('Results:', result);
    
    return result;
  } catch (error) {
    console.error('EPC2040 curve extraction failed:', error);
    throw error;
  }
}

// Alternative: Use automatic detection
export async function extractEPC2040CurvesAuto(imageData: Uint8Array) {
  try {
    // The system will automatically detect EPC2040 configuration
    const result = await curveService.extractCurves(
      imageData, 
      ['red', 'green', 'yellow', 'blue'], 
      epc2040Config
    );
    
    console.log('Auto-detected preset:', curveService.getGraphPreset());
    return result;
  } catch (error) {
    console.error('EPC2040 curve extraction failed:', error);
    throw error;
  }
}
