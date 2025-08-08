# EPC2040 Output Characteristics Configuration

## Overview

This document provides the configuration for extracting output characteristics curves from the EPC2040 datasheet (Figures 1-9) using the hard-coded offset system.

## EPC2040 Device Information

Based on the [EPC2040 datasheet](https://epc-co.com/epc/portals/0/epc/documents/datasheets/EPC2040_datasheet.pdf):

- **Device Type**: Enhancement Mode Power Transistor
- **Technology**: Gallium Nitride (GaN)
- **VDS Rating**: 15V
- **RDS(on)**: 30 mΩ
- **I0**: 3.4A (continuous)

## Graph Configuration

### Output Characteristics at 25°C

```typescript
const epc2040Config = {
  x_axis_name: 'VDS',
  y_axis_name: 'ID', 
  x_min: 0,
  x_max: 3,
  y_min: 0,
  y_max: 27.5,
  x_scale_type: 'linear',
  y_scale_type: 'linear',
  x_scale: 1,
  y_scale: 1,
  title: 'EPC2040 Output Characteristics at 25°C',
  description: 'Drain Current vs Drain-Source Voltage for different Gate-Source Voltages'
};
```

### Color Mapping for VGS Curves

```typescript
const colorMapping = {
  'red': '5V',    // VGS = 5V
  'green': '4V',  // VGS = 4V
  'yellow': '3V', // VGS = 3V
  'blue': '2V'    // VGS = 2V
};
```

## Hard-Coded Offset Configuration

### EPC2040 Output Characteristics Preset

```typescript
epc2040_output: {
  marginLeft: 85,    // Space for ID labels (0-27.5A)
  marginRight: 30,   // Minimal right margin
  marginTop: 50,     // Space for title
  marginBottom: 75   // Space for VDS labels (0-3V)
}
```

**Key Features:**
- **No Scaling**: Fixed pixel values regardless of image size
- **Optimized for VDS 0-3V range**: 75px bottom margin for axis labels
- **Optimized for ID 0-27.5A range**: 85px left margin for current labels
- **Minimal right margin**: 30px to maximize graph area

## Usage Example

### Automatic Detection

```typescript
import { CurveExtractionService } from './curveExtractionService';

const curveService = CurveExtractionService.getInstance();

// Create EPC2040 configuration
const config = curveService.createEPC2040OutputConfig();

// Extract curves - will automatically detect EPC2040 preset
const result = await curveService.extractCurves(imageData, ['red', 'green', 'yellow', 'blue'], config);
```

### Manual Preset Selection

```typescript
// Manually set EPC2040 preset
curveService.setGraphPreset('epc2040_output');

// Extract curves with fixed offsets
const result = await curveService.extractCurves(imageData, colors, config);
```

### Custom Offset Adjustment

```typescript
// Adjust offsets if needed for specific image
curveService.setOffsetOverrides({
  marginLeft: 90,   // More space for ID labels
  marginBottom: 80  // More space for VDS labels
});

const result = await curveService.extractCurves(imageData, colors, config);
```

## Detection Logic

The system automatically detects EPC2040 output characteristics based on:

1. **X-axis range**: VDS 0-3V
2. **Y-axis range**: ID 0-27.5A  
3. **Axis names**: Contains "VDS" and "ID"
4. **Scale types**: Both linear
5. **No scaling applied**: Fixed pixel offsets

## Expected Results

With this configuration, the extracted curves should:

- **Start exactly at VDS = 0V** (no gap from Y-axis)
- **Start exactly at ID = 0A** (no gap from X-axis)
- **Follow the correct VGS curves**:
  - Red curve: VGS = 5V
  - Green curve: VGS = 4V
  - Yellow curve: VGS = 3V
  - Blue curve: VGS = 2V
- **Maintain proper scaling** for the 0-3V VDS and 0-27.5A ID ranges

## Troubleshooting

### Curves Not Starting at Axis
1. Verify the preset is correctly detected: `curveService.getGraphPreset()`
2. Check if manual preset setting is needed: `curveService.setGraphPreset('epc2040_output')`
3. Adjust offsets if needed: `curveService.setOffsetOverrides({ marginLeft: 90 })`

### Wrong Color Mapping
1. Verify color detection in the image
2. Check that colors match the expected mapping (red=5V, green=4V, etc.)
3. Use the provided color mapping: `curveService.getEPC2040ColorMapping()`

### Scaling Issues
1. EPC2040 preset uses fixed offsets (no scaling)
2. If scaling is needed, use a different preset or manual overrides
3. Verify image dimensions are reasonable for the fixed offsets

## Integration with Product Management

This configuration can be integrated into the product management system:

```typescript
// In ProductManagementPage.tsx
const handleEPC2040Extraction = async () => {
  const curveService = CurveExtractionService.getInstance();
  const config = curveService.createEPC2040OutputConfig();
  const colors = ['red', 'green', 'yellow', 'blue'];
  
  // Extract curves with EPC2040-specific settings
  const result = await curveService.extractCurves(imageData, colors, config);
  
  // Process results...
};
```

## Benefits of EPC2040-Specific Configuration

1. **Accurate Axis Alignment**: Curves start exactly at VDS=0 and ID=0
2. **Optimized Margins**: Specific offsets for EPC2040 datasheet layout
3. **No Scaling Issues**: Fixed pixel values prevent scaling problems
4. **Automatic Detection**: System recognizes EPC2040 characteristics automatically
5. **Consistent Results**: Same offsets used across all EPC2040 extractions
