# EPC2040 All Graph Types Configuration

## Overview

This document provides configurations for all graph types found in the [EPC2040 datasheet](https://epc-co.com/epc/portals/0/epc/documents/datasheets/EPC2040_datasheet.pdf). The EPC2040 is a Gallium Nitride (GaN) enhancement mode power transistor with VDS rating up to 15V.

## EPC2040 Device Specifications

- **Device Type**: Enhancement Mode Power Transistor
- **Technology**: Gallium Nitride (GaN)
- **VDS Rating**: 15V
- **RDS(on)**: 30 mΩ
- **I0**: 3.4A (continuous)
- **VGS**: ±6V (gate voltage range)

## All Graph Types Configuration

### 1. Output Characteristics (Figures 1-9)
**Purpose**: Shows drain current vs drain-source voltage for different gate-source voltages

```typescript
const outputConfig = {
  x_axis_name: 'VDS',
  y_axis_name: 'ID',
  x_min: 0, x_max: 3,
  y_min: 0, y_max: 27.5,
  x_scale_type: 'linear',
  y_scale_type: 'linear',
  title: 'EPC2040 Output Characteristics at 25°C'
};

// Color mapping for VGS curves:
const colorMapping = {
  'red': '5V',    // VGS = 5V
  'green': '4V',  // VGS = 4V
  'yellow': '3V', // VGS = 3V
  'blue': '2V'    // VGS = 2V
};
```

### 2. Transfer Characteristics
**Purpose**: Shows drain current vs gate-source voltage

```typescript
const transferConfig = {
  x_axis_name: 'VGS',
  y_axis_name: 'ID',
  x_min: 0, x_max: 6,
  y_min: 0, y_max: 30,
  x_scale_type: 'linear',
  y_scale_type: 'linear',
  title: 'EPC2040 Transfer Characteristics at 25°C'
};
```

### 3. On-Resistance Characteristics
**Purpose**: Shows drain-source on-resistance vs drain current

```typescript
const onResistanceConfig = {
  x_axis_name: 'ID',
  y_axis_name: 'RDS(on)',
  x_min: 0, x_max: 3.4,
  y_min: 0, y_max: 50,
  x_scale_type: 'linear',
  y_scale_type: 'linear',
  title: 'EPC2040 On-Resistance vs Drain Current'
};
```

### 4. Gate Charge Characteristics
**Purpose**: Shows total gate charge vs gate-source voltage

```typescript
const gateChargeConfig = {
  x_axis_name: 'VGS',
  y_axis_name: 'QG',
  x_min: 0, x_max: 6,
  y_min: 0, y_max: 1000,
  x_scale_type: 'linear',
  y_scale_type: 'linear',
  title: 'EPC2040 Gate Charge vs Gate-Source Voltage'
};
```

### 5. Capacitance Characteristics
**Purpose**: Shows input, output, and reverse transfer capacitance vs drain-source voltage

```typescript
const capacitanceConfig = {
  x_axis_name: 'VDS',
  y_axis_name: 'C',
  x_min: 0, x_max: 15,
  y_min: 0, y_max: 200,
  x_scale_type: 'linear',
  y_scale_type: 'linear',
  title: 'EPC2040 Capacitance vs Drain-Source Voltage'
};
```

### 6. Switching Characteristics
**Purpose**: Shows turn-on and turn-off switching waveforms

```typescript
const switchingConfig = {
  x_axis_name: 'Time',
  y_axis_name: 'V/I',
  x_min: 0, x_max: 100,
  y_min: 0, y_max: 20,
  x_scale_type: 'linear',
  y_scale_type: 'linear',
  title: 'EPC2040 Switching Characteristics'
};
```

### 7. Thermal Characteristics
**Purpose**: Shows on-resistance vs junction temperature

```typescript
const thermalConfig = {
  x_axis_name: 'Temperature',
  y_axis_name: 'RDS(on)',
  x_min: -40, x_max: 150,
  y_min: 0, y_max: 100,
  x_scale_type: 'linear',
  y_scale_type: 'linear',
  title: 'EPC2040 On-Resistance vs Temperature'
};
```

### 8. Safe Operating Area (SOA)
**Purpose**: Shows safe operating area boundaries

```typescript
const soaConfig = {
  x_axis_name: 'VDS',
  y_axis_name: 'ID',
  x_min: 0, x_max: 15,
  y_min: 0, y_max: 10,
  x_scale_type: 'linear',
  y_scale_type: 'linear',
  title: 'EPC2040 Safe Operating Area'
};
```

### 9. Body Diode Characteristics
**Purpose**: Shows source-drain forward voltage vs current

```typescript
const bodyDiodeConfig = {
  x_axis_name: 'ISD',
  y_axis_name: 'VSD',
  x_min: 0, x_max: 5,
  y_min: 0, y_max: 3,
  x_scale_type: 'linear',
  y_scale_type: 'linear',
  title: 'EPC2040 Body Diode Characteristics'
};
```

## Usage Examples

### Get All Configurations
```typescript
import { CurveExtractionService } from './curveExtractionService';

const curveService = CurveExtractionService.getInstance();
const allConfigs = curveService.getAllEPC2040Configs();

// Access specific configurations
const outputConfig = allConfigs['output_characteristics'];
const transferConfig = allConfigs['transfer_characteristics'];
```

### Extract Specific Graph Type
```typescript
// Extract output characteristics
const outputResult = await curveService.extractCurves(
  imageData, 
  ['red', 'green', 'yellow', 'blue'], 
  curveService.createEPC2040OutputConfig()
);

// Extract transfer characteristics
const transferResult = await curveService.extractCurves(
  imageData, 
  ['blue'], 
  curveService.createEPC2040TransferConfig()
);
```

### Automatic Detection
```typescript
// The system automatically detects EPC2040 output characteristics
const config = curveService.createEPC2040OutputConfig();
const result = await curveService.extractCurves(imageData, colors, config);
console.log('Detected preset:', curveService.getGraphPreset()); // 'epc2040_output'
```

## Hard-Coded Offset Preset

All EPC2040 graphs use the `epc2040_output` preset with fixed offsets:

```typescript
epc2040_output: {
  marginLeft: 85,    // Space for Y-axis labels
  marginRight: 30,   // Minimal right margin
  marginTop: 50,     // Space for title
  marginBottom: 75   // Space for X-axis labels
}
```

**Key Features:**
- **No Scaling**: Fixed pixel values for consistent results
- **Optimized Margins**: Specific offsets for EPC2040 datasheet layout
- **Automatic Detection**: System recognizes EPC2040 characteristics

## Color Detection Guidelines

### Output Characteristics
- **Red**: VGS = 5V curve
- **Green**: VGS = 4V curve
- **Yellow**: VGS = 3V curve
- **Blue**: VGS = 2V curve

### Other Graphs
- Use detected colors from the image
- Apply appropriate color mapping based on graph type
- Consider using single color extraction for simpler graphs

## Expected Results

With these configurations, extracted curves should:

1. **Start exactly at axes** (no gaps)
2. **Maintain proper scaling** for the specified ranges
3. **Follow correct curve shapes** from the datasheet
4. **Preserve color mapping** for VGS curves
5. **Provide accurate data points** for analysis

## Integration with Product Management

```typescript
// In ProductManagementPage.tsx
const handleEPC2040Extraction = async (graphType: string) => {
  const curveService = CurveExtractionService.getInstance();
  const allConfigs = curveService.getAllEPC2040Configs();
  
  if (allConfigs[graphType]) {
    const config = allConfigs[graphType];
    const colors = graphType === 'output_characteristics' 
      ? ['red', 'green', 'yellow', 'blue'] 
      : ['blue']; // Default color
    
    const result = await curveService.extractCurves(imageData, colors, config);
    // Process results...
  }
};
```

## Benefits

1. **Comprehensive Coverage**: All graph types from the datasheet
2. **Consistent Configuration**: Standardized approach across all graphs
3. **Automatic Detection**: System recognizes EPC2040 characteristics
4. **Fixed Offsets**: No scaling issues for reliable extraction
5. **Easy Integration**: Simple API for accessing configurations
6. **Accurate Results**: Optimized for EPC2040 datasheet layout
