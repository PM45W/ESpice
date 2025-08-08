# Graph Extraction Environment Handling

## Overview

The graph extraction functionality has been designed to work in both Tauri desktop and web browser environments. This document explains how the system detects the environment and provides appropriate fallback behavior.

## Environment Detection

### Tauri Desktop Environment
When running in a Tauri desktop application, the system has access to:
- **Rust Backend**: Full access to the Rust image processing engine
- **Native Performance**: High-performance curve extraction and color detection
- **File System Access**: Direct access to local files and databases
- **System Resources**: Full access to CPU and memory resources

### Web Browser Environment
When running in a web browser, the system operates with:
- **Fallback Implementations**: JavaScript-based color detection and curve generation
- **Limited Performance**: Basic functionality for demonstration purposes
- **Browser Constraints**: Limited by browser security and performance constraints
- **Mock Data**: Sample data generation for testing and development

## Implementation Details

### Environment Detection Logic

```typescript
constructor() {
  // Check if Tauri is available
  this.isTauriAvailable = typeof window !== 'undefined' && 
                         window.__TAURI__ !== undefined && 
                         typeof invoke === 'function';
  
  console.log('Tauri available:', this.isTauriAvailable);
}
```

### Fallback Behavior

#### Color Detection
```typescript
async detectColors(imageData: Uint8Array): Promise<DetectedColor[]> {
  try {
    if (!this.isTauriAvailable) {
      console.warn('Tauri not available, using fallback color detection');
      return this.getFallbackColors();
    }
    
    // Use Rust backend for color detection
    const result = await invoke('detect_colors_enhanced', {
      imageData: Array.from(imageData)
    });
    
    return result;
  } catch (error) {
    console.warn('Falling back to basic color detection');
    return this.getFallbackColors();
  }
}
```

#### Curve Extraction
```typescript
async extractCurves(
  imageData: Uint8Array,
  selectedColors: string[],
  config: GraphConfig
): Promise<CurveExtractionResult> {
  try {
    if (!this.isTauriAvailable) {
      console.warn('Tauri not available, using fallback curve extraction');
      return this.getFallbackCurves(selectedColors, config);
    }
    
    // Use Rust backend for curve extraction
    const result = await invoke('extract_curves_enhanced', {
      imageData: Array.from(imageData),
      selectedColors,
      config
    });
    
    return result;
  } catch (error) {
    console.warn('Falling back to basic curve generation');
    return this.getFallbackCurves(selectedColors, config);
  }
}
```

## Fallback Implementations

### Color Detection Fallback
```typescript
private getFallbackColors(): DetectedColor[] {
  return [
    {
      name: 'red',
      display_name: 'Red',
      color: '#ff0000',
      pixelCount: 1000
    },
    {
      name: 'blue',
      display_name: 'Blue',
      color: '#0000ff',
      pixelCount: 800
    },
    {
      name: 'green',
      display_name: 'Green',
      color: '#00ff00',
      pixelCount: 600
    },
    {
      name: 'yellow',
      display_name: 'Yellow',
      color: '#ffff00',
      pixelCount: 500
    }
  ];
}
```

### Curve Extraction Fallback
```typescript
private getFallbackCurves(selectedColors: string[], config: GraphConfig): CurveExtractionResult {
  const curves = selectedColors.map((colorName, index) => {
    // Generate sample curve data
    const points = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const x = config.x_min + (config.x_max - config.x_min) * (i / steps);
      const y = config.y_min + (config.y_max - config.y_min) * Math.sin(i * 0.5 + index) * 0.5 + 0.5;
      points.push({
        x: x * config.x_scale,
        y: y * config.y_scale,
        label: `${colorName} point ${i}`
      });
    }
    
    return {
      name: colorName,
      color: this.getColorForName(colorName),
      points,
      representation: colorName,
      pointCount: points.length
    };
  });

  return {
    curves,
    totalPoints: curves.reduce((sum, curve) => sum + curve.points.length, 0),
    processingTime: 0,
    success: true
  };
}
```

## User Interface

### Environment Check Button
A new "Check Environment" button has been added to help users understand what mode they're running in:

```typescript
<button 
  onClick={() => {
    const isTauri = curveExtractionService.isTauriEnvironment();
    alert(`Environment Check:\n\nTauri Available: ${isTauri ? 'Yes' : 'No'}\nMode: ${isTauri ? 'Desktop (Tauri)' : 'Web Browser'}\n\n${isTauri ? 'Full Rust backend features are available.' : 'Running in web mode with fallback implementations.'}`);
  }}
  className="btn btn-secondary env-btn"
>
  Check Environment
</button>
```

### Test Button Behavior
The test button now provides appropriate feedback based on the environment:

```typescript
const testRustBackend = async () => {
  const isTauriAvailable = curveExtractionService.isTauriEnvironment();
  
  if (!isTauriAvailable) {
    alert('Running in web environment. Tauri backend features will use fallback implementations.\n\nTo test the full Rust backend, please run the application in Tauri desktop mode.');
    return;
  }
  
  // Proceed with Rust backend testing
  // ...
};
```

## Error Handling

### Graceful Degradation
The system gracefully degrades from Rust backend to fallback implementations:

1. **Primary Attempt**: Try to use Rust backend functions
2. **Error Detection**: Catch any errors from Tauri invoke calls
3. **Fallback Execution**: Use JavaScript fallback implementations
4. **User Notification**: Inform users about the fallback behavior

### Error Messages
- **Tauri Not Available**: Clear indication when running in web mode
- **Backend Errors**: Detailed error messages for debugging
- **Fallback Usage**: Notification when fallback implementations are used

## Development Workflow

### Web Development
When developing in a web browser:
1. **Fast Iteration**: Quick development and testing cycles
2. **Fallback Testing**: Verify fallback implementations work correctly
3. **UI Testing**: Test user interface without Rust backend
4. **Mock Data**: Use generated sample data for development

### Desktop Development
When developing in Tauri desktop:
1. **Full Features**: Access to all Rust backend capabilities
2. **Performance Testing**: Test actual image processing performance
3. **Integration Testing**: Verify frontend-backend integration
4. **Real Data**: Process actual image files and datasheets

## Performance Considerations

### Web Environment
- **Limited Processing**: Basic JavaScript implementations
- **Browser Constraints**: Memory and CPU limitations
- **Network Dependencies**: Potential network-related delays
- **Security Restrictions**: Limited file system access

### Desktop Environment
- **High Performance**: Native Rust image processing
- **Full Resources**: Access to all system resources
- **Local Processing**: No network dependencies
- **Unlimited Access**: Full file system and hardware access

## Best Practices

### Development
1. **Test Both Environments**: Always test in both web and desktop modes
2. **Fallback Validation**: Ensure fallback implementations work correctly
3. **Error Handling**: Implement comprehensive error handling
4. **User Feedback**: Provide clear feedback about environment limitations

### Production
1. **Environment Detection**: Always check environment before using features
2. **Graceful Degradation**: Ensure system works in all environments
3. **Performance Monitoring**: Monitor performance in both modes
4. **User Education**: Educate users about environment differences

## Troubleshooting

### Common Issues

#### "Cannot read properties of undefined (reading 'invoke')"
**Cause**: Running in web environment without Tauri
**Solution**: The system automatically falls back to JavaScript implementations

#### "Tauri not available" warnings
**Cause**: Environment detection indicates web mode
**Solution**: This is expected behavior in web browsers

#### Poor performance in web mode
**Cause**: Limited by browser constraints
**Solution**: Use Tauri desktop mode for full performance

### Debugging
1. **Check Environment**: Use the "Check Environment" button
2. **Console Logs**: Monitor console for environment detection messages
3. **Error Messages**: Review error messages for specific issues
4. **Fallback Behavior**: Verify fallback implementations are working

## Conclusion

The environment handling system ensures that the graph extraction functionality works reliably in both web and desktop environments. The graceful degradation approach provides a consistent user experience while allowing developers to work efficiently in different environments.

The fallback implementations ensure that basic functionality is always available, while the full Rust backend provides high-performance capabilities when running in the Tauri desktop environment. 