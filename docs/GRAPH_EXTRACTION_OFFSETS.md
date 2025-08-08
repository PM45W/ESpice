# Graph Extraction Offset System

## Overview

The graph extraction system now uses hard-coded axis offset values to ensure consistent and accurate curve extraction without gaps between curves and axes.

## Problem Solved

Previously, the system used dynamic axis detection which could result in:
- Inconsistent offset calculations
- Gaps between extracted curves and axes
- Varying results across different images
- Poor accuracy for specific graph types

## Solution: Hard-Coded Offset System

### 1. Fixed Offset Values

The system now uses predefined offset values:

```typescript
private readonly HARDCODED_OFFSETS = {
  // Standard offsets for typical graph layouts
  marginLeft: 80,    // Y-axis offset from left edge
  marginRight: 40,   // Right margin
  marginTop: 40,     // Top margin
  marginBottom: 60,  // X-axis offset from bottom edge
}
```

### 2. Graph Type Presets

Different presets for various graph types:

#### SPICE Transistor Curves
- **Use Case**: VDS vs ID curves
- **Margins**: Left: 90px, Right: 35px, Top: 45px, Bottom: 70px
- **Auto-Detection**: Based on axis names containing "VDS" and "ID"

#### Datasheet Graphs
- **Use Case**: Complex graphs with dense labels
- **Margins**: Left: 110px, Right: 25px, Top: 60px, Bottom: 85px
- **Auto-Detection**: Based on detailed labels and wide value ranges

#### Simple Line Graphs
- **Use Case**: Basic line graphs
- **Margins**: Left: 70px, Right: 45px, Top: 35px, Bottom: 55px
- **Auto-Detection**: Based on basic labels and small value ranges

#### Minimal Margins
- **Use Case**: Graphs with no axis labels
- **Margins**: Left: 50px, Right: 50px, Top: 30px, Bottom: 40px
- **Auto-Detection**: Based on missing axis labels

### 3. Automatic Detection

The system automatically detects graph type and applies appropriate presets:

```typescript
// Auto-detect graph type and set appropriate preset
this.autoDetectGraphPreset(config);
```

#### Detection Logic

1. **SPICE Transistor Curves**:
   - X-axis contains "VDS", "V_DS", or "drain-source"
   - Y-axis contains "ID", "I_D", or "drain current"

2. **Datasheet Graphs**:
   - Has detailed axis labels
   - Value ranges > 100

3. **Simple Line Graphs**:
   - Basic or missing axis labels
   - Value ranges < 50

### 4. User Overrides

Users can manually adjust offsets if needed:

```typescript
// Set custom offsets
curveExtractionService.setOffsetOverrides({
  marginLeft: 100,
  marginBottom: 80
});

// Reset to defaults
curveExtractionService.resetOffsetOverrides();

// Get current overrides
const overrides = curveExtractionService.getOffsetOverrides();
```

### 5. Scaling

Offsets are automatically scaled based on image size:

```typescript
const scaleFactor = Math.min(width, height) / 600; // Base on 600px reference
const scaledMargin = Math.round(baseMargin * scaleFactor);
```

## Implementation Details

### Coordinate Transformation

The coordinate transformation functions now use hard-coded offsets:

```typescript
private pixelToLogicalXImproved(pixelX: number, width: number, height: number, config: GraphConfig): number {
  const offsets = this.getHardcodedOffsets(width, height);
  const { marginLeft, marginRight } = offsets;
  const graphWidth = width - marginLeft - marginRight;
  
  const adjustedPixelX = Math.max(0, pixelX - marginLeft);
  const normalizedX = Math.min(1, adjustedPixelX / graphWidth);
  
  return normalizedX * (config.x_max - config.x_min) + config.x_min;
}
```

### Preset Management

```typescript
// Set specific preset
curveExtractionService.setGraphPreset('spice');

// Get current preset
const preset = curveExtractionService.getGraphPreset();

// Available presets: 'standard', 'spice', 'datasheet', 'simple', 'minimal'
```

## Benefits

1. **Consistency**: Same offset values across all extractions
2. **Accuracy**: Curves start exactly at axes without gaps
3. **Reliability**: No dependency on dynamic detection algorithms
4. **Flexibility**: Multiple presets for different graph types
5. **User Control**: Manual override capability
6. **Auto-Detection**: Automatic preset selection based on graph characteristics

## Usage Examples

### Basic Usage
```typescript
const result = await curveExtractionService.extractCurves(imageData, colors, config);
// Automatically detects graph type and applies appropriate offsets
```

### Manual Preset Selection
```typescript
curveExtractionService.setGraphPreset('spice');
const result = await curveExtractionService.extractCurves(imageData, colors, config);
```

### Custom Offsets
```typescript
curveExtractionService.setOffsetOverrides({
  marginLeft: 120,  // More space for Y-axis labels
  marginBottom: 90  // More space for X-axis labels
});
const result = await curveExtractionService.extractCurves(imageData, colors, config);
```

## Migration from Dynamic Detection

The system automatically uses hard-coded offsets instead of dynamic detection. No changes required in existing code - the improvement is transparent to users.

## Troubleshooting

### Curves Still Have Gaps
1. Check if the correct preset is being used
2. Try adjusting offsets manually
3. Verify image dimensions are reasonable

### Wrong Preset Selected
1. Check axis names in GraphConfig
2. Verify value ranges
3. Manually set appropriate preset

### Performance Issues
1. Hard-coded offsets are faster than dynamic detection
2. No performance impact expected
3. If issues occur, check image size scaling

## Future Enhancements

1. **Machine Learning**: Train models to predict optimal offsets
2. **Image Analysis**: Analyze actual axis positions in images
3. **User Feedback**: Learn from user corrections
4. **More Presets**: Add presets for additional graph types
5. **Dynamic Adjustment**: Fine-tune offsets based on extraction results
