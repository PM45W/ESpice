import { invoke } from '@tauri-apps/api/core';
import { DetectedColor, GraphConfig, GraphPreset, SavedGraphType, CurveExtractionResult, CurveData } from '../types';

// Enhanced curve extraction service with improved color detection and batch processing support
export class CurveExtractionService {
  private static instance: CurveExtractionService;
  private savedGraphTypes: SavedGraphType[] = [];
  private isTauriAvailable: boolean = false;
  private fastApiBaseUrl: string = 'http://localhost:8002';

  static getInstance(): CurveExtractionService {
    if (!CurveExtractionService.instance) {
      CurveExtractionService.instance = new CurveExtractionService();
    }
    return CurveExtractionService.instance;
  }

  constructor() {
    this.isTauriAvailable = typeof window !== 'undefined' && 
                           window.__TAURI__ && 
                           typeof window.__TAURI__.invoke === 'function';
  }

  async detectColors(imageData: Uint8Array): Promise<DetectedColor[]> {
    console.log('Starting color detection with FastAPI service...');
    
    // Check if FastAPI service is available
    if (!(await this.isFastApiAvailable())) {
      throw new Error('FastAPI curve extraction service is not available. Please start the service first with: ./scripts/start-curve-extraction-service.ps1');
    }
    
    try {
      console.log('Using FastAPI curve extraction service for color detection');
      return await this.detectColorsFastApi(imageData);
    } catch (error) {
      console.error('FastAPI color detection failed:', error);
      throw new Error(`Color detection failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the FastAPI service is running.`);
    }
  }

  // Web-based color detection using Canvas API
  private async detectColorsWeb(imageData: Uint8Array): Promise<DetectedColor[]> {
    try {
      // Create a blob from the image data
      const blob = new Blob([imageData], { type: 'image/png' });
      const imageUrl = URL.createObjectURL(blob);
      
      // Create canvas and load image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData2D = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData2D.data;

      // Color detection using HSV analysis
      const colorMap = new Map<string, { count: number; r: number; g: number; b: number }>();
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Skip white/black/grayscale pixels
        if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10) {
          continue;
        }

        // Convert to HSV
        const [h, s, v] = this.rgbToHsv(r, g, b);
        
        // Skip low saturation or very dark/light pixels
        if (s < 0.1 || v < 0.1 || v > 0.9) {
          continue;
        }

        // Quantize HSV values for color grouping
        const hQuantized = Math.round(h / 30) * 30; // 12 hue bins
        const sQuantized = Math.round(s * 10) / 10; // 10 saturation bins
        const vQuantized = Math.round(v * 10) / 10; // 10 value bins
        
        const colorKey = `${hQuantized}_${sQuantized}_${vQuantized}`;
        
        if (!colorMap.has(colorKey)) {
          colorMap.set(colorKey, { count: 0, r: 0, g: 0, b: 0 });
        }
        
        const color = colorMap.get(colorKey)!;
        color.count++;
        color.r += r;
        color.g += g;
        color.b += b;
      }

      // Convert to DetectedColor array
      const colors: DetectedColor[] = [];
      for (const [key, color] of colorMap) {
        if (color.count < 500) continue; // Minimum pixel threshold
        
        const avgR = Math.round(color.r / color.count);
        const avgG = Math.round(color.g / color.count);
        const avgB = Math.round(color.b / color.count);
        
        const [h, s, v] = this.rgbToHsv(avgR, avgG, avgB);
        const colorName = this.getColorName(h, s, v);
        
        colors.push({
          name: colorName,
          display_name: colorName.charAt(0).toUpperCase() + colorName.slice(1),
          color: `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`,
          pixelCount: color.count,
          hsv: { h, s, v },
          confidence: Math.min(color.count / 1000, 1.0) // Confidence based on pixel count
        });
      }

      // Sort by pixel count and return top colors
      return colors
        .sort((a, b) => b.pixelCount - a.pixelCount)
        .slice(0, 10);

    } catch (error) {
      console.error('Web-based color detection failed:', error);
      return this.getFallbackColors();
    }
  }

  // Convert RGB to HSV
  private rgbToHsv(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    const s = max === 0 ? 0 : diff / max;
    const v = max;

    if (diff !== 0) {
      switch (max) {
        case r:
          h = ((g - b) / diff) % 6;
          break;
        case g:
          h = (b - r) / diff + 2;
          break;
        case b:
          h = (r - g) / diff + 4;
          break;
      }
      h *= 60;
      if (h < 0) h += 360;
    }

    return [h, s, v];
  }

  // Get color name from HSV values
  private getColorName(h: number, s: number, v: number): string {
    if (s < 0.1) return 'gray';
    if (v < 0.2) return 'black';
    if (v > 0.8) return 'white';

    if (h < 15 || h >= 345) return 'red';
    if (h < 45) return 'orange';
    if (h < 75) return 'yellow';
    if (h < 165) return 'green';
    if (h < 195) return 'cyan';
    if (h < 255) return 'blue';
    if (h < 285) return 'magenta';
    return 'red';
  }

  // No fallback colors - require real service
  private getFallbackColors(): DetectedColor[] {
    throw new Error('FastAPI curve extraction service is not available. Please start the service first.');
  }

  async extractCurves(
    imageData: Uint8Array,
    selectedColors: string[],
    config: GraphConfig
  ): Promise<CurveExtractionResult> {
    console.log('Starting curve extraction with FastAPI service...');
    
    // Check if FastAPI service is available
    if (!(await this.isFastApiAvailable())) {
      throw new Error('FastAPI curve extraction service is not available. Please start the service first with: ./scripts/start-curve-extraction-service.ps1');
    }
    
    try {
      console.log('Using FastAPI curve extraction service for curve extraction');
      return await this.extractCurvesFastApi(imageData, selectedColors, config);
    } catch (error) {
      console.error('FastAPI curve extraction failed:', error);
      throw new Error(`Curve extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the FastAPI service is running.`);
    }
  }

  // Web-based curve extraction using Canvas API
  private async extractCurvesWeb(
    imageData: Uint8Array,
    selectedColors: string[],
    config: GraphConfig
  ): Promise<CurveExtractionResult> {
    try {
      const startTime = performance.now();
      
      // Create a blob from the image data
      const blob = new Blob([imageData], { type: 'image/png' });
      const imageUrl = URL.createObjectURL(blob);
      
      // Create canvas and load image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData2D = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData2D.data;

      const curves: CurveData[] = [];
      let totalPoints = 0;

      // First, detect background colors to filter them out
      const backgroundColors = this.detectBackgroundColors(data, canvas.width, canvas.height);

      // Process each selected color
      for (const colorName of selectedColors) {
        const colorKey = colorName.toLowerCase();
        const colorRange = this.getImprovedColorRange(colorKey);
        
        if (!colorRange) {
          console.warn(`Color range not found for: ${colorName}`);
          continue;
        }

        // Extract points for this color with background filtering
        const points = this.extractColorPointsImproved(
          data, 
          canvas.width, 
          canvas.height, 
          colorRange, 
          config, 
          backgroundColors
        );
        
        if (points.length > 0) {
          // Apply advanced processing
          const processedPoints = this.processCurvePoints(points, config);
          
          if (processedPoints.length > 0) {
            curves.push({
              name: colorName,
              color: colorRange.displayColor,
              points: processedPoints.map(p => ({
                x: p.x * config.x_scale,
                y: p.y * config.y_scale,
                label: `${colorName} point`,
                confidence: 0.9
              })),
              representation: colorName,
              pointCount: processedPoints.length,
              metadata: {
                min_x: Math.min(...processedPoints.map(p => p.x)),
                max_x: Math.max(...processedPoints.map(p => p.x)),
                min_y: Math.min(...processedPoints.map(p => p.y)),
                max_y: Math.max(...processedPoints.map(p => p.y)),
                average_slope: this.calculateAverageSlope(processedPoints)
              }
            });
            
            totalPoints += processedPoints.length;
          }
        }
      }

      const processingTime = (performance.now() - startTime) / 1000;

      return {
        curves,
        totalPoints,
        processingTime,
        success: curves.length > 0,
        error: curves.length === 0 ? 'No curves extracted' : undefined,
        metadata: {
          image_width: canvas.width,
          image_height: canvas.height,
          detected_colors: selectedColors.length,
          extraction_method: 'web-canvas-improved',
          quality_score: curves.length > 0 ? 0.9 : 0.0
        }
      };

    } catch (error) {
      console.error('Web-based curve extraction failed:', error);
      return this.getFallbackCurves(selectedColors, config);
    }
  }

  // Detect background colors to filter them out
  private detectBackgroundColors(data: Uint8ClampedArray, width: number, height: number): Set<string> {
    const colorCounts = new Map<string, number>();
    const backgroundColors = new Set<string>();
    
    // Sample pixels from edges and corners (likely background)
    const samplePositions = [
      // Top edge
      ...Array.from({length: width}, (_, i) => ({x: i, y: 0})),
      // Bottom edge
      ...Array.from({length: width}, (_, i) => ({x: i, y: height - 1})),
      // Left edge
      ...Array.from({length: height}, (_, i) => ({x: 0, y: i})),
      // Right edge
      ...Array.from({length: height}, (_, i) => ({x: width - 1, y: i})),
      // Corners
      {x: 0, y: 0}, {x: width - 1, y: 0}, {x: 0, y: height - 1}, {x: width - 1, y: height - 1}
    ];

    for (const pos of samplePositions) {
      const idx = (pos.y * width + pos.x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Quantize colors to reduce noise
      const quantizedR = Math.round(r / 10) * 10;
      const quantizedG = Math.round(g / 10) * 10;
      const quantizedB = Math.round(b / 10) * 10;
      
      const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
      colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
    }

    // Consider colors that appear frequently as background
    const threshold = samplePositions.length * 0.1; // 10% of samples
    for (const [colorKey, count] of colorCounts) {
      if (count > threshold) {
        backgroundColors.add(colorKey);
      }
    }

    return backgroundColors;
  }

  // Improved color range definitions with better precision
  private getImprovedColorRange(colorName: string): { 
    lower: [number, number, number]; 
    upper: [number, number, number]; 
    displayColor: string;
    tolerance: number;
  } | null {
    const colorRanges: Record<string, { 
      lower: [number, number, number]; 
      upper: [number, number, number]; 
      displayColor: string;
      tolerance: number;
    }> = {
      red: { 
        lower: [160, 0, 0], 
        upper: [255, 100, 100], 
        displayColor: '#ff0000',
        tolerance: 40
      },
      blue: { 
        lower: [0, 0, 160], 
        upper: [100, 100, 255], 
        displayColor: '#0000ff',
        tolerance: 40
      },
      green: { 
        lower: [0, 160, 0], 
        upper: [100, 255, 100], 
        displayColor: '#00ff00',
        tolerance: 40
      },
      yellow: { 
        lower: [200, 200, 0], 
        upper: [255, 255, 120], 
        displayColor: '#ffff00',
        tolerance: 35
      },
      cyan: { 
        lower: [0, 160, 160], 
        upper: [100, 255, 255], 
        displayColor: '#00ffff',
        tolerance: 40
      },
      magenta: { 
        lower: [160, 0, 160], 
        upper: [255, 100, 255], 
        displayColor: '#ff00ff',
        tolerance: 40
      }
    };
    
    return colorRanges[colorName] || null;
  }

  // Improved color point extraction with background filtering
  private extractColorPointsImproved(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    colorRange: { 
      lower: [number, number, number]; 
      upper: [number, number, number]; 
      displayColor: string;
      tolerance: number;
    },
    config: GraphConfig,
    backgroundColors: Set<string>
  ): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    const tolerance = colorRange.tolerance;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Skip if this is a background color
        const quantizedR = Math.round(r / 10) * 10;
        const quantizedG = Math.round(g / 10) * 10;
        const quantizedB = Math.round(b / 10) * 10;
        const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
        
        if (backgroundColors.has(colorKey)) {
          continue;
        }
        
        // Check if pixel matches color range with tolerance
        const matchesColor = this.colorMatchesRangeWithTolerance(
          r, g, b, 
          colorRange.lower, 
          colorRange.upper, 
          tolerance,
          colorName
        );
        
        if (matchesColor) {
          // Convert pixel coordinates to logical coordinates
          const logicalX = this.pixelToLogicalXImproved(x, width, config);
          const logicalY = this.pixelToLogicalYImproved(y, height, config);
          
          // Only add if coordinates are within valid range
          if (this.isValidCoordinate(logicalX, logicalY, config)) {
            points.push({ x: logicalX, y: logicalY });
          }
        }
      }
    }
    
    return points;
  }

  // Enhanced color matching with HSV analysis
  private colorMatchesRangeWithTolerance(
    r: number, g: number, b: number,
    lower: [number, number, number],
    upper: [number, number, number],
    tolerance: number,
    colorName: string
  ): boolean {
    // Convert to HSV for better color matching
    const [h, s, v] = this.rgbToHsv(r, g, b);
    
    // Check if color is within the basic range
    const inRange = r >= lower[0] && r <= upper[0] &&
                   g >= lower[1] && g <= upper[1] &&
                   b >= lower[2] && b <= upper[2];
    
    if (inRange) return true;
    
    // Check with tolerance
    const toleranceLower = lower.map(v => Math.max(0, v - tolerance));
    const toleranceUpper = upper.map(v => Math.min(255, v + tolerance));
    
    const inToleranceRange = r >= toleranceLower[0] && r <= toleranceUpper[0] &&
                            g >= toleranceLower[1] && g <= toleranceUpper[1] &&
                            b >= toleranceLower[2] && b <= toleranceUpper[2];
    
    if (inToleranceRange) return true;
    
    // Additional HSV-based matching for better accuracy
    return this.colorMatchesHSV(h, s, v, colorName);
  }

  // HSV-based color matching
  private colorMatchesHSV(h: number, s: number, v: number, colorName: string): boolean {
    const colorKey = colorName.toLowerCase();
    
    // Define HSV ranges for each color
    const hsvRanges: Record<string, { hRange: [number, number]; sMin: number; vMin: number; vMax: number }> = {
      red: { hRange: [0, 15], sMin: 0.3, vMin: 0.2, vMax: 1.0 },
      blue: { hRange: [200, 260], sMin: 0.3, vMin: 0.2, vMax: 1.0 },
      green: { hRange: [100, 160], sMin: 0.3, vMin: 0.2, vMax: 1.0 },
      yellow: { hRange: [45, 75], sMin: 0.3, vMin: 0.4, vMax: 1.0 },
      cyan: { hRange: [160, 200], sMin: 0.3, vMin: 0.2, vMax: 1.0 },
      magenta: { hRange: [280, 320], sMin: 0.3, vMin: 0.2, vMax: 1.0 }
    };
    
    const range = hsvRanges[colorKey];
    if (!range) return false;
    
    // Handle red color wrapping around 360 degrees
    let hMatch = false;
    if (colorKey === 'red') {
      hMatch = (h >= range.hRange[0] && h <= range.hRange[1]) || 
               (h >= 345 && h <= 360); // Red wraps around
    } else {
      hMatch = h >= range.hRange[0] && h <= range.hRange[1];
    }
    
    return hMatch && s >= range.sMin && v >= range.vMin && v <= range.vMax;
  }

  // Improved coordinate conversion
  private pixelToLogicalXImproved(pixelX: number, width: number, config: GraphConfig): number {
    if (config.x_scale_type === 'linear') {
      return pixelX * (config.x_max - config.x_min) / width + config.x_min;
    } else {
      const f = pixelX / width;
      const logX = Math.log(Math.max(config.x_min, 0.001)) + f * (Math.log(config.x_max) - Math.log(Math.max(config.x_min, 0.001)));
      return Math.exp(logX);
    }
  }

  private pixelToLogicalYImproved(pixelY: number, height: number, config: GraphConfig): number {
    if (config.y_scale_type === 'linear') {
      // Enhanced Y-coordinate transformation with proper axis inversion
      // Invert Y-axis: top of image (y=0) corresponds to y_max, bottom (y=height) corresponds to y_min
      return (height - pixelY) * (config.y_max - config.y_min) / height + config.y_min;
    } else {
      const f = (height - pixelY) / height;
      const logY = Math.log(Math.max(config.y_min, 0.001)) + f * (Math.log(config.y_max) - Math.log(Math.max(config.y_min, 0.001)));
      return Math.exp(logY);
    }
  }

  // Check if coordinate is valid
  private isValidCoordinate(x: number, y: number, config: GraphConfig): boolean {
    return !isNaN(x) && !isNaN(y) && 
           isFinite(x) && isFinite(y) &&
           x >= config.x_min && x <= config.x_max &&
           y >= config.y_min && y <= config.y_max;
  }

  // Advanced curve point processing
  private processCurvePoints(points: Array<{ x: number; y: number }>, config: GraphConfig): Array<{ x: number; y: number }> {
    if (points.length === 0) return points;
    
    // Step 1: Sort by X coordinate
    const sorted = [...points].sort((a, b) => a.x - b.x);
    
    // Step 2: Remove outliers using statistical methods
    const filtered = this.removeOutliers(sorted);
    
    // Step 3: Apply smoothing
    const smoothed = this.smoothCurveAdvanced(filtered);
    
    // Step 4: Remove duplicates and near-duplicates
    const deduplicated = this.removeNearDuplicates(smoothed);
    
    // Step 5: Ensure minimum spacing between points
    const spaced = this.ensureMinimumSpacing(deduplicated, config);
    
    return spaced;
  }

  // Remove outliers using statistical methods
  private removeOutliers(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
    if (points.length < 3) return points;
    
    // Calculate median and MAD (Median Absolute Deviation)
    const yValues = points.map(p => p.y);
    const median = this.median(yValues);
    const mad = this.medianAbsoluteDeviation(yValues, median);
    
    // Filter points within 3 MAD of median
    const threshold = 3 * mad;
    return points.filter(p => Math.abs(p.y - median) <= threshold);
  }

  // Calculate median
  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  // Calculate Median Absolute Deviation
  private medianAbsoluteDeviation(values: number[], median: number): number {
    const deviations = values.map(v => Math.abs(v - median));
    return this.median(deviations);
  }

  // Advanced smoothing with adaptive window
  private smoothCurveAdvanced(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
    if (points.length < 3) return points;
    
    const smoothed: Array<{ x: number; y: number }> = [];
    const baseWindowSize = 5;
    
    for (let i = 0; i < points.length; i++) {
      // Adaptive window size based on local curvature
      const windowSize = Math.min(baseWindowSize, Math.floor(points.length / 10));
      
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      
      for (let j = Math.max(0, i - windowSize); j <= Math.min(points.length - 1, i + windowSize); j++) {
        sumX += points[j].x;
        sumY += points[j].y;
        count++;
      }
      
      smoothed.push({
        x: sumX / count,
        y: sumY / count
      });
    }
    
    return smoothed;
  }

  // Remove near-duplicate points
  private removeNearDuplicates(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
    if (points.length === 0) return points;
    
    const result: Array<{ x: number; y: number }> = [points[0]];
    const minDistance = 0.01; // Minimum distance between points
    
    for (let i = 1; i < points.length; i++) {
      const lastPoint = result[result.length - 1];
      const currentPoint = points[i];
      
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - lastPoint.x, 2) + 
        Math.pow(currentPoint.y - lastPoint.y, 2)
      );
      
      if (distance > minDistance) {
        result.push(currentPoint);
      }
    }
    
    return result;
  }

  // Ensure minimum spacing between points
  private ensureMinimumSpacing(points: Array<{ x: number; y: number }>, config: GraphConfig): Array<{ x: number; y: number }> {
    if (points.length === 0) return points;
    
    const result: Array<{ x: number; y: number }> = [points[0]];
    const minSpacing = (config.x_max - config.x_min) / 100; // 1% of x range
    
    for (let i = 1; i < points.length; i++) {
      const lastPoint = result[result.length - 1];
      const currentPoint = points[i];
      
      if (currentPoint.x - lastPoint.x >= minSpacing) {
        result.push(currentPoint);
      }
    }
    
    return result;
  }

  // Calculate average slope of curve
  private calculateAverageSlope(points: Array<{ x: number; y: number }>): number {
    if (points.length < 2) return 0;
    
    let totalSlope = 0;
    let count = 0;
    
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i-1].x;
      if (dx !== 0) {
        const dy = points[i].y - points[i-1].y;
        totalSlope += dy / dx;
        count++;
      }
    }
    
    return count > 0 ? totalSlope / count : 0;
  }

  // Fallback curve generation for when Tauri is not available
  private getFallbackCurves(selectedColors: string[], config: GraphConfig): CurveExtractionResult {
    throw new Error('FastAPI curve extraction service is not available. Please start the service first.');
  }

  // Get color for color name
  private getColorForName(colorName: string): string {
    const colorMap: Record<string, string> = {
      'red': '#ff0000',
      'blue': '#0000ff',
      'green': '#00ff00',
      'yellow': '#ffff00',
      'cyan': '#00ffff',
      'magenta': '#ff00ff'
    };
    return colorMap[colorName] || '#000000';
  }

  // Enhance extraction result with additional processing
  private enhanceExtractionResult(result: CurveExtractionResult, config: GraphConfig): CurveExtractionResult {
    const enhancedCurves = result.curves.map(curve => {
      // Sort points by x-coordinate for better visualization
      const sortedPoints = [...curve.points].sort((a, b) => a.x - b.x);
      
      // Remove duplicate points
      const uniquePoints = sortedPoints.filter((point, index, array) => {
        if (index === 0) return true;
        const prevPoint = array[index - 1];
        const dx = Math.abs(point.x - prevPoint.x);
        const dy = Math.abs(point.y - prevPoint.y);
        return dx > 0.001 || dy > 0.001; // Minimum distance threshold
      });

      // Apply smoothing if needed
      const smoothedPoints = this.applySmoothing(uniquePoints);

      return {
        ...curve,
        points: smoothedPoints,
        pointCount: smoothedPoints.length
      };
    });

    return {
      ...result,
      curves: enhancedCurves,
      totalPoints: enhancedCurves.reduce((sum, curve) => sum + curve.points.length, 0)
    };
  }

  // Apply smoothing to curve points
  private applySmoothing(points: { x: number; y: number }[]): { x: number; y: number }[] {
    if (points.length < 3) return points;

    const smoothed = [];
    const windowSize = 3;

    for (let i = 0; i < points.length; i++) {
      let sumX = 0;
      let sumY = 0;
      let count = 0;

      for (let j = Math.max(0, i - windowSize); j <= Math.min(points.length - 1, i + windowSize); j++) {
        sumX += points[j].x;
        sumY += points[j].y;
        count++;
      }

      smoothed.push({
        x: sumX / count,
        y: sumY / count
      });
    }

    return smoothed;
  }

  // Batch processing support
  async processBatch(
    jobs: Array<{
      id: string;
      imageData: Uint8Array;
      selectedColors: string[];
      config: GraphConfig;
    }>
  ): Promise<Array<{ id: string; result: CurveExtractionResult; error?: string }>> {
    const results = [];

    for (const job of jobs) {
      try {
        const result = await this.extractCurves(job.imageData, job.selectedColors, job.config);
        results.push({ id: job.id, result });
      } catch (error) {
        results.push({ 
          id: job.id, 
          result: { curves: [], totalPoints: 0, processingTime: 0, success: false },
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  // Save graph type to local storage
  saveGraphType(graphType: SavedGraphType): void {
    try {
      const existing = this.savedGraphTypes.find(gt => gt.id === graphType.id);
      if (existing) {
        const index = this.savedGraphTypes.indexOf(existing);
        this.savedGraphTypes[index] = graphType;
      } else {
        this.savedGraphTypes.push(graphType);
      }
      
      localStorage.setItem('savedGraphTypes', JSON.stringify(this.savedGraphTypes));
    } catch (error) {
      console.error('Failed to save graph type:', error);
    }
  }

  // Load saved graph types from local storage
  async loadSavedGraphTypes(): Promise<SavedGraphType[]> {
    try {
      const saved = localStorage.getItem('savedGraphTypes');
      if (saved) {
        this.savedGraphTypes = JSON.parse(saved);
      }
      return this.savedGraphTypes;
    } catch (error) {
      console.error('Failed to load saved graph types:', error);
      return [];
    }
  }

  // Delete saved graph type
  deleteGraphType(id: string): void {
    try {
      this.savedGraphTypes = this.savedGraphTypes.filter(gt => gt.id !== id);
      localStorage.setItem('savedGraphTypes', JSON.stringify(this.savedGraphTypes));
    } catch (error) {
      console.error('Failed to delete graph type:', error);
    }
  }

  // Save curves to database
  async saveToDatabase(
    productId: string,
    curves: CurveData[],
    config: GraphConfig,
    colorRepresentations: Record<string, string>
  ): Promise<void> {
    try {
      if (!this.isTauriAvailable) {
        console.warn('Tauri not available, database save would be skipped');
        return;
      }

      await invoke('save_curves_to_database', {
        productId,
        curves: curves.map(curve => ({
          ...curve,
          label: colorRepresentations[curve.name] || curve.name
        })),
        config
      });
    } catch (error) {
      console.error('Failed to save curves to database:', error);
      throw new Error(`Database save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Export curves to CSV
  exportToCSV(curves: CurveData[], colorRepresentations: Record<string, string>): string {
    let csv = 'Curve,Label,X,Y\n';
    
    curves.forEach(curve => {
      const label = colorRepresentations[curve.name] || curve.name;
      curve.points.forEach(point => {
        csv += `${curve.name},${label},${point.x.toFixed(6)},${point.y.toFixed(6)}\n`;
      });
    });
    
    return csv;
  }

  // Get graph presets
  getGraphPresets(): Record<string, GraphPreset> {
    return {
      output: {
        graph_type: 'output',
        name: 'Output Characteristics',
        x_axis: 'Vds',
        y_axis: 'Id',
        third_col: 'Vgs',
        x_min: 0,
        x_max: 3,
        y_min: 0,
        y_max: 2.75,
        x_scale: 1,
        y_scale: 10,
        x_scale_type: 'linear',
        y_scale_type: 'linear',
        color_reps: { red: '5', blue: '2', green: '4', yellow: '3' },
        output_filename: 'output_characteristics'
      },
      transfer: {
        graph_type: 'transfer',
        name: 'Transfer Characteristics',
        x_axis: 'Vgs',
        y_axis: 'Id',
        third_col: 'Temperature',
        x_min: 0,
        x_max: 5,
        y_min: 0,
        y_max: 2.75,
        x_scale: 1,
        y_scale: 10,
        x_scale_type: 'linear',
        y_scale_type: 'linear',
        color_reps: { red: '25', blue: '125' },
        output_filename: 'transfer_characteristics'
      },
      capacitance: {
        graph_type: 'capacitance',
        name: 'Capacitance Characteristics',
        x_axis: 'vds',
        y_axis: 'c',
        third_col: 'type',
        x_min: 0,
        x_max: 15,
        y_min: 0,
        y_max: 10,
        x_scale: 1,
        y_scale: 10,
        x_scale_type: 'linear',
        y_scale_type: 'linear',
        color_reps: { red: 'Coss', green: 'Ciss', yellow: 'Crss' },
        output_filename: 'capacitance_characteristics'
      },
      resistance: {
        graph_type: 'resistance',
        name: 'Rds vs Vgs',
        x_axis: 'Vgs',
        y_axis: 'Rds',
        third_col: 'Temp',
        x_min: 0,
        x_max: 5,
        y_min: 0,
        y_max: 8,
        x_scale: 1,
        y_scale: 10,
        x_scale_type: 'linear',
        y_scale_type: 'linear',
        color_reps: { red: '25', blue: '125' },
        output_filename: 'Rds_on_vs_Vgs'
      },
      custom: {
        graph_type: 'custom',
        name: 'Custom',
        x_axis: 'X',
        y_axis: 'Y',
        third_col: 'Label',
        x_min: 0,
        x_max: 10,
        y_min: 0,
        y_max: 100,
        x_scale: 1,
        y_scale: 1,
        x_scale_type: 'linear',
        y_scale_type: 'linear',
        color_reps: {},
        output_filename: 'custom_output'
      }
    };
  }

  // Validate configuration
  validateConfig(config: GraphConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.x_min >= config.x_max) {
      errors.push('X minimum must be less than X maximum');
    }

    if (config.y_min >= config.y_max) {
      errors.push('Y minimum must be less than Y maximum');
    }

    if (config.x_scale <= 0) {
      errors.push('X scale must be positive');
    }

    if (config.y_scale <= 0) {
      errors.push('Y scale must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get processing statistics
  async getProcessingStats(): Promise<{
    totalProcessed: number;
    successRate: number;
    averageProcessingTime: number;
    lastProcessed: Date | null;
  }> {
    try {
      if (!this.isTauriAvailable) {
        console.warn('Tauri not available, returning mock stats');
        return {
          totalProcessed: 0,
          successRate: 100.0,
          averageProcessingTime: 0.5,
          lastProcessed: null
        };
      }

      const stats = await invoke('get_processing_stats') as any;
      return {
        totalProcessed: stats.totalProcessed || 0,
        successRate: stats.successRate || 0,
        averageProcessingTime: stats.averageProcessingTime || 0,
        lastProcessed: stats.lastProcessed ? new Date(stats.lastProcessed) : null
      };
    } catch (error) {
      console.error('Failed to get processing stats:', error);
      return {
        totalProcessed: 0,
        successRate: 0,
        averageProcessingTime: 0,
        lastProcessed: null
      };
    }
  }

  // Check if Tauri is available
  isTauriEnvironment(): boolean {
    return this.isTauriAvailable;
  }

  // Check if FastAPI service is available
  async isFastApiAvailable(): Promise<boolean> {
    try {
      console.log('Checking FastAPI service availability at:', this.fastApiBaseUrl);
      const response = await fetch(`${this.fastApiBaseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (response.ok) {
        console.log('✅ FastAPI service is available and healthy');
        return true;
      } else {
        console.log('❌ FastAPI service responded with status:', response.status);
        return false;
      }
    } catch (error) {
      console.log('❌ FastAPI service not available:', error);
      return false;
    }
  }

  // FastAPI color detection
  private async detectColorsFastApi(imageData: Uint8Array): Promise<DetectedColor[]> {
    console.log('Sending color detection request to FastAPI service...');
    
    const formData = new FormData();
    const blob = new Blob([imageData], { type: 'image/png' });
    formData.append('file', blob, 'image.png');

    try {
      const response = await fetch(`${this.fastApiBaseUrl}/api/curve-extraction/detect-colors`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(15000) // 15 second timeout for color detection
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FastAPI color detection failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'FastAPI color detection failed');
      }

      console.log('✅ Color detection successful, found colors:', result.data.detected_colors.length);
      return result.data.detected_colors;
    } catch (error) {
      console.error('❌ FastAPI color detection error:', error);
      throw error;
    }
  }

  // FastAPI curve extraction
  private async extractCurvesFastApi(
    imageData: Uint8Array,
    selectedColors: string[],
    config: GraphConfig
  ): Promise<CurveExtractionResult> {
    console.log('Sending curve extraction request to FastAPI service...');
    console.log('Selected colors:', selectedColors);
    console.log('Config:', config);
    console.log('Image data size:', imageData.length, 'bytes');
    
    // Validate config properties before using toString()
    if (!config || typeof config.x_min !== 'number' || typeof config.x_max !== 'number' ||
        typeof config.y_min !== 'number' || typeof config.y_max !== 'number' ||
        typeof config.x_scale !== 'number' || typeof config.y_scale !== 'number') {
      throw new Error('Invalid configuration: missing or invalid numeric properties');
    }
    
    const formData = new FormData();
    const blob = new Blob([imageData], { type: 'image/png' });
    formData.append('file', blob, 'image.png');
    formData.append('selected_colors', JSON.stringify(selectedColors));
    formData.append('x_min', config.x_min.toString());
    formData.append('x_max', config.x_max.toString());
    formData.append('y_min', config.y_min.toString());
    formData.append('y_max', config.y_max.toString());
    formData.append('x_scale', config.x_scale.toString());
    formData.append('y_scale', config.y_scale.toString());
    formData.append('x_scale_type', config.x_scale_type || 'linear');
    formData.append('y_scale_type', config.y_scale_type || 'linear');
    formData.append('min_size', (config.min_size || 100).toString());
    formData.append('detection_sensitivity', (config.detection_sensitivity || 5).toString());
    formData.append('color_tolerance', (config.color_tolerance || 20).toString());
    formData.append('smoothing_factor', (config.smoothing_factor || 3).toString());
    formData.append('x_axis_name', config.x_axis_name || 'X-Axis');
    formData.append('y_axis_name', config.y_axis_name || 'Y-Axis');

    console.log('FormData contents:');
    for (const [key, value] of formData.entries()) {
      if (key === 'file') {
        console.log(`${key}: [Blob, size: ${(value as Blob).size} bytes]`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }

    try {
      const response = await fetch(`${this.fastApiBaseUrl}/api/curve-extraction/extract-curves`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000) // 30 second timeout for curve extraction
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`FastAPI curve extraction failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('Response result:', result);
      
      if (!result.success) {
        console.error('FastAPI returned success=false:', result.error);
        throw new Error(result.error || 'FastAPI curve extraction failed');
      }

      console.log('✅ Curve extraction successful, extracted curves:', result.data.curves.length);
      console.log('Total points:', result.data.total_points);
      console.log('Processing time:', result.data.processing_time);
      
      return result.data;
    } catch (error) {
      console.error('❌ FastAPI curve extraction error:', error);
      throw error;
    }
  }

  // Legacy algorithm extraction using Python-based approach
  async extractCurvesLegacy(
    imageData: Uint8Array,
    selectedColors: string[],
    config: GraphConfig
  ): Promise<CurveExtractionResult> {
    console.log('Starting legacy curve extraction...');
    
    try {
      const formData = new FormData();
      const blob = new Blob([imageData], { type: 'image/png' });
      formData.append('file', blob, 'image.png');
      formData.append('selected_colors', JSON.stringify(selectedColors));
      formData.append('x_min', config.x_min.toString());
      formData.append('x_max', config.x_max.toString());
      formData.append('y_min', config.y_min.toString());
      formData.append('y_max', config.y_max.toString());
      formData.append('x_scale', config.x_scale.toString());
      formData.append('y_scale', config.y_scale.toString());
      formData.append('x_scale_type', config.x_scale_type || 'linear');
      formData.append('y_scale_type', config.y_scale_type || 'linear');
      formData.append('min_size', (config.min_size || 100).toString());
      formData.append('algorithm', 'legacy');

      const response = await fetch(`${this.fastApiBaseUrl}/api/curve-extraction/extract-curves-legacy`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(45000) // 45 second timeout for legacy processing
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Legacy extraction failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Legacy curve extraction failed');
      }

      console.log('✅ Legacy curve extraction successful');
      return result.data;
    } catch (error) {
      console.error('❌ Legacy curve extraction error:', error);
      throw error;
    }
  }

  // LLM-assisted extraction using Kimi K2 model
  async extractCurvesLLM(
    imageData: Uint8Array,
    selectedColors: string[],
    config: GraphConfig,
    prompt: string
  ): Promise<CurveExtractionResult> {
    console.log('Starting LLM-assisted curve extraction...');
    
    try {
      const formData = new FormData();
      const blob = new Blob([imageData], { type: 'image/png' });
      formData.append('file', blob, 'image.png');
      formData.append('selected_colors', JSON.stringify(selectedColors));
      formData.append('x_min', config.x_min.toString());
      formData.append('x_max', config.x_max.toString());
      formData.append('y_min', config.y_min.toString());
      formData.append('y_max', config.y_max.toString());
      formData.append('x_scale', config.x_scale.toString());
      formData.append('y_scale', config.y_scale.toString());
      formData.append('x_scale_type', config.x_scale_type || 'linear');
      formData.append('y_scale_type', config.y_scale_type || 'linear');
      formData.append('min_size', (config.min_size || 100).toString());
      formData.append('algorithm', 'llm');
      formData.append('prompt', prompt || 'Extract all visible curves from this graph with high accuracy');

      const response = await fetch(`${this.fastApiBaseUrl}/api/curve-extraction/extract-curves-llm`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(60000) // 60 second timeout for LLM processing
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM extraction failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'LLM curve extraction failed');
      }

      console.log('✅ LLM-assisted curve extraction successful');
      return result.data;
    } catch (error) {
      console.error('❌ LLM curve extraction error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const curveExtractionService = CurveExtractionService.getInstance();
