import { invoke } from '@tauri-apps/api/core';
import { CurveExtractionService } from './curveExtractionService';
import type { 
  DetectedColor, 
  GraphConfig, 
  CurveExtractionResult, 
  CurveData,
  GraphType,
  BatchJob,
  ProcessingStats
} from '../types';

// Enhanced types for LLM integration
export interface LLMAnalysisResult {
  success: boolean;
  graphType: string;
  xAxis: {
    name: string;
    unit: string;
    min: number;
    max: number;
    interval: number;
    scale: 'linear' | 'log';
  };
  yAxis: {
    name: string;
    unit: string;
    min: number;
    max: number;
    interval: number;
    scale: 'linear' | 'log';
  };
  detectedCurves: Array<{
    color: string;
    label: string;
    description: string;
    confidence: number;
  }>;
  graphFeatures: {
    hasGrid: boolean;
    hasLabels: boolean;
    hasLegend: boolean;
    gridStyle: string;
  };
  confidence: number;
  processingTime: number;
  error?: string;
}

export interface EnhancedGraphConfig extends GraphConfig {
  autoDetectAxes: boolean;
  autoDetectIntervals: boolean;
  useLLMAnalysis: boolean;
  llmProvider: 'local' | 'openai' | 'anthropic' | 'ollama';
  llmModel: string;
  colorDetectionMethod: 'traditional' | 'ml' | 'hybrid';
  curveFittingMethod: 'linear' | 'polynomial' | 'spline' | 'adaptive';
  noiseReduction: boolean;
  outlierRemoval: boolean;
  smoothingLevel: 'none' | 'light' | 'medium' | 'heavy';
}

export interface BatchProcessingResult {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  processingTime: number;
  results: Array<{
    jobId: string;
    success: boolean;
    result?: CurveExtractionResult;
    error?: string;
    llmAnalysis?: LLMAnalysisResult;
  }>;
  statistics: ProcessingStats;
}

export interface AutoProcessingConfig {
  enableAutoProcessing: boolean;
  processOnUpload: boolean;
  processOnDetection: boolean;
  batchSize: number;
  maxConcurrentJobs: number;
  retryFailedJobs: boolean;
  maxRetries: number;
  priorityQueue: boolean;
  timeout: number;
}

// LLM Provider interfaces
interface LLMProvider {
  analyzeImage(imageBase64: string, prompt: string, model: string): Promise<string>;
}

class OllamaProvider implements LLMProvider {
  async analyzeImage(imageBase64: string, prompt: string, model: string): Promise<string> {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: `${prompt}\n\nImage: ${imageBase64}`,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const result = await response.json();
      return result.response || '';

    } catch (error) {
      console.error('Ollama provider error:', error);
      throw new Error(`Ollama analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

class EnhancedGraphExtractionService {
  private static instance: EnhancedGraphExtractionService;
  private curveExtractionService: CurveExtractionService;
  private llmProviders: Map<string, LLMProvider>;
  private batchQueue: BatchJob[] = [];
  private processingJobs: Set<string> = new Set();
  private stats: ProcessingStats = {
    totalProcessed: 0,
    successRate: 100.0,
    averageProcessingTime: 0,
    lastProcessed: null,
    totalErrors: 0,
    averageQueueTime: 0
  };

  private constructor() {
    this.curveExtractionService = CurveExtractionService.getInstance();
    this.initializeLLMProviders();
  }

  static getInstance(): EnhancedGraphExtractionService {
    if (!EnhancedGraphExtractionService.instance) {
      EnhancedGraphExtractionService.instance = new EnhancedGraphExtractionService();
    }
    return EnhancedGraphExtractionService.instance;
  }

  private initializeLLMProviders(): void {
    this.llmProviders = new Map();
    this.llmProviders.set('ollama', new OllamaProvider());
  }

  /**
   * Enhanced graph extraction with LLM analysis
   */
  async extractGraphWithLLM(
    imageData: Uint8Array,
    config: Partial<EnhancedGraphConfig> = {}
  ): Promise<{
    extractionResult: CurveExtractionResult;
    llmAnalysis: LLMAnalysisResult;
    enhancedConfig: EnhancedGraphConfig;
  }> {
    const startTime = performance.now();
    const defaultConfig: EnhancedGraphConfig = {
      x_min: 0,
      x_max: 10,
      y_min: 0,
      y_max: 10,
      x_scale: 1,
      y_scale: 1,
      x_scale_type: 'linear',
      y_scale_type: 'linear',
      graph_type: 'custom',
      x_axis_name: 'X',
      y_axis_name: 'Y',
      autoDetectAxes: true,
      autoDetectIntervals: true,
      useLLMAnalysis: true,
      llmProvider: 'ollama',
      llmModel: 'llama3.2',
      colorDetectionMethod: 'hybrid',
      curveFittingMethod: 'adaptive',
      noiseReduction: true,
      outlierRemoval: true,
      smoothingLevel: 'medium'
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {
      // Step 1: LLM Analysis for automatic detection
      let llmAnalysis: LLMAnalysisResult;
      if (finalConfig.useLLMAnalysis) {
        llmAnalysis = await this.analyzeGraphWithLLM(imageData, finalConfig);
        
        // Update config based on LLM analysis
        if (llmAnalysis.success) {
          finalConfig.x_axis_name = llmAnalysis.xAxis.name;
          finalConfig.y_axis_name = llmAnalysis.yAxis.name;
          finalConfig.x_min = llmAnalysis.xAxis.min;
          finalConfig.x_max = llmAnalysis.xAxis.max;
          finalConfig.y_min = llmAnalysis.yAxis.min;
          finalConfig.y_max = llmAnalysis.yAxis.max;
          finalConfig.x_scale_type = llmAnalysis.xAxis.scale;
          finalConfig.y_scale_type = llmAnalysis.yAxis.scale;
          finalConfig.graph_type = llmAnalysis.graphType as GraphType;
        }
      } else {
        llmAnalysis = this.getDefaultLLMAnalysis();
      }

      // Step 2: Enhanced color detection
      const detectedColors = await this.detectColorsEnhanced(imageData, finalConfig);

      // Step 3: Curve extraction with enhanced processing
      const extractionResult = await this.extractCurvesEnhanced(
        imageData,
        detectedColors.map(c => c.name),
        finalConfig
      );

      // Step 4: Post-processing and validation
      const enhancedResult = await this.postProcessCurves(extractionResult, finalConfig);

      const processingTime = (performance.now() - startTime) / 1000;
      this.updateStats(processingTime, true);

      return {
        extractionResult: enhancedResult,
        llmAnalysis,
        enhancedConfig: finalConfig
      };

    } catch (error) {
      const processingTime = (performance.now() - startTime) / 1000;
      this.updateStats(processingTime, false);
      
      throw new Error(`Enhanced graph extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Placeholder methods to be implemented
  private async analyzeGraphWithLLM(imageData: Uint8Array, config: EnhancedGraphConfig): Promise<LLMAnalysisResult> {
    const startTime = performance.now();
    
    try {
      // Convert image data to base64
      const base64Image = this.arrayBufferToBase64(imageData);
      
      // Create comprehensive prompt for LLM analysis
      const prompt = `Analyze this semiconductor datasheet graph image and provide detailed information in JSON format. Please identify:

1. Graph type (output, transfer, capacitance, resistance, etc.)
2. X-axis: name, unit, min value, max value, interval, scale type (linear/log)
3. Y-axis: name, unit, min value, max value, interval, scale type (linear/log)
4. Detected curves: color, label, description, confidence
5. Graph features: hasGrid, hasLabels, hasLegend, gridStyle

Respond with a valid JSON object containing:
{
  "graphType": "string",
  "xAxis": {"name": "string", "unit": "string", "min": number, "max": number, "interval": number, "scale": "linear|log"},
  "yAxis": {"name": "string", "unit": "string", "min": number, "max": number, "interval": number, "scale": "linear|log"},
  "detectedCurves": [{"color": "string", "label": "string", "description": "string", "confidence": number}],
  "graphFeatures": {"hasGrid": boolean, "hasLabels": boolean, "hasLegend": boolean, "gridStyle": "string"},
  "confidence": number
}`;

      // Get LLM provider
      const provider = this.llmProviders.get(config.llmProvider);
      if (!provider) {
        throw new Error(`LLM provider '${config.llmProvider}' not found`);
      }

      // Analyze with LLM
      const response = await provider.analyzeImage(base64Image, prompt, config.llmModel);
      
      // Parse LLM response
      const analysis = this.parseLLMResponse(response);
      
      const processingTime = (performance.now() - startTime) / 1000;
      
      return {
        success: true,
        graphType: analysis.graphType || 'custom',
        xAxis: analysis.xAxis || { name: 'X', unit: '', min: 0, max: 10, interval: 1, scale: 'linear' },
        yAxis: analysis.yAxis || { name: 'Y', unit: '', min: 0, max: 10, interval: 1, scale: 'linear' },
        detectedCurves: analysis.detectedCurves || [],
        graphFeatures: analysis.graphFeatures || { hasGrid: false, hasLabels: false, hasLegend: false, gridStyle: 'none' },
        confidence: analysis.confidence || 0.5,
        processingTime
      };

    } catch (error) {
      const processingTime = (performance.now() - startTime) / 1000;
      console.error('LLM analysis failed:', error);
      
      return {
        success: false,
        graphType: 'custom',
        xAxis: { name: 'X', unit: '', min: 0, max: 10, interval: 1, scale: 'linear' },
        yAxis: { name: 'Y', unit: '', min: 0, max: 10, interval: 1, scale: 'linear' },
        detectedCurves: [],
        graphFeatures: { hasGrid: false, hasLabels: false, hasLegend: false, gridStyle: 'none' },
        confidence: 0,
        processingTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async detectColorsEnhanced(imageData: Uint8Array, config: EnhancedGraphConfig): Promise<DetectedColor[]> {
    try {
      // Get base color detection from existing service
      const baseColors = await this.curveExtractionService.detectColors(imageData);
      
      if (config.colorDetectionMethod === 'traditional') {
        return baseColors;
      }

      // Enhanced color detection with ML/hybrid methods
      const enhancedColors: DetectedColor[] = [];
      
      for (const color of baseColors) {
        // Apply enhanced filtering based on color characteristics
        const enhancedColor = await this.enhanceColorDetection(color, imageData);
        if (enhancedColor) {
          enhancedColors.push(enhancedColor);
        }
      }

      // If no colors detected, try alternative methods
      if (enhancedColors.length === 0) {
        return await this.fallbackColorDetection(imageData);
      }

      return enhancedColors;

    } catch (error) {
      console.error('Enhanced color detection failed:', error);
      // Fallback to base detection
      return await this.curveExtractionService.detectColors(imageData);
    }
  }

  private async extractCurvesEnhanced(imageData: Uint8Array, selectedColors: string[], config: EnhancedGraphConfig): Promise<CurveExtractionResult> {
    try {
      // Get base curve extraction
      const baseResult = await this.curveExtractionService.extractCurves(imageData, selectedColors, config);
      
      if (!baseResult.success) {
        return baseResult;
      }

      // Apply enhanced processing
      const enhancedCurves = await Promise.all(
        baseResult.curves.map(async (curve) => {
          let processedCurve = { ...curve };

          // Apply noise reduction
          if (config.noiseReduction) {
            processedCurve = await this.reduceNoise(processedCurve);
          }

          // Apply outlier removal
          if (config.outlierRemoval) {
            processedCurve = await this.removeOutliers(processedCurve);
          }

          // Apply smoothing
          if (config.smoothingLevel !== 'none') {
            processedCurve = await this.applySmoothing(processedCurve, config);
          }

          // Apply curve fitting
          processedCurve = await this.applyCurveFitting(processedCurve, config);

          return processedCurve;
        })
      );

      return {
        ...baseResult,
        curves: enhancedCurves
      };

    } catch (error) {
      console.error('Enhanced curve extraction failed:', error);
      // Fallback to base extraction
      return await this.curveExtractionService.extractCurves(imageData, selectedColors, config);
    }
  }

  private async postProcessCurves(result: CurveExtractionResult, config: EnhancedGraphConfig): Promise<CurveExtractionResult> {
    if (!result.success) {
      return result;
    }

    try {
      const processedCurves = await Promise.all(
        result.curves.map(async (curve) => {
          // Validate curve quality
          const quality = this.calculateCurveQuality(curve);
          const confidence = this.calculateCurveConfidence(curve);

          return {
            ...curve,
            quality,
            confidence
          };
        })
      );

      // Filter out low-quality curves
      const filteredCurves = processedCurves.filter(curve => curve.confidence > 0.3);

      return {
        ...result,
        curves: filteredCurves
      };

    } catch (error) {
      console.error('Post-processing failed:', error);
      return result;
    }
  }

  // Helper methods for enhanced processing
  private arrayBufferToBase64(buffer: Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private parseLLMResponse(response: string): any {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, try to parse the entire response
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return {};
    }
  }

  private async enhanceColorDetection(color: DetectedColor, imageData: Uint8Array): Promise<DetectedColor | null> {
    // Enhanced color filtering logic
    const enhancedColor = { ...color };
    
    // Apply confidence scoring based on color characteristics
    enhancedColor.confidence = this.calculateColorConfidence(color, imageData);
    
    // Filter out low-confidence colors
    if (enhancedColor.confidence < 0.4) {
      return null;
    }

    return enhancedColor;
  }

  private async fallbackColorDetection(imageData: Uint8Array): Promise<DetectedColor[]> {
    // Implement fallback color detection methods
    // This could include different HSV ranges, edge detection, etc.
    return await this.curveExtractionService.detectColors(imageData);
  }

  private async reduceNoise(curve: CurveData): Promise<CurveData> {
    // Implement noise reduction using moving average or median filtering
    const smoothedPoints = this.applyMovingAverage(curve.points, 3);
    return { ...curve, points: smoothedPoints };
  }

  private async removeOutliers(curve: CurveData): Promise<CurveData> {
    // Implement outlier removal using statistical methods
    const filteredPoints = this.removeStatisticalOutliers(curve.points);
    return { ...curve, points: filteredPoints };
  }

  private async applySmoothing(curve: CurveData, config: EnhancedGraphConfig): Promise<CurveData> {
    // Apply smoothing based on configuration level
    const smoothingWindow = this.getSmoothingWindow(config.smoothingLevel);
    const smoothedPoints = this.applyMovingAverage(curve.points, smoothingWindow);
    return { ...curve, points: smoothedPoints };
  }

  private async applyCurveFitting(curve: CurveData, config: EnhancedGraphConfig): Promise<CurveData> {
    // Apply curve fitting based on configuration
    switch (config.curveFittingMethod) {
      case 'linear':
        return this.linearFit(curve);
      case 'polynomial':
        return this.polynomialFit(curve);
      case 'spline':
        return this.splineFit(curve);
      case 'adaptive':
        return this.adaptiveFit(curve);
      default:
        return curve;
    }
  }

  // Utility methods for curve processing
  private applyMovingAverage(points: CurvePoint[], window: number): CurvePoint[] {
    const smoothed: CurvePoint[] = [];
    
    for (let i = 0; i < points.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(points.length, i + Math.floor(window / 2) + 1);
      
      const windowPoints = points.slice(start, end);
      const avgX = windowPoints.reduce((sum, p) => sum + p.x, 0) / windowPoints.length;
      const avgY = windowPoints.reduce((sum, p) => sum + p.y, 0) / windowPoints.length;
      
      smoothed.push({ x: avgX, y: avgY });
    }
    
    return smoothed;
  }

  private removeStatisticalOutliers(points: CurvePoint[]): CurvePoint[] {
    if (points.length < 3) return points;
    
    const yValues = points.map(p => p.y);
    const median = this.median(yValues);
    const mad = this.medianAbsoluteDeviation(yValues);
    const threshold = 2.5 * mad;
    
    return points.filter(p => Math.abs(p.y - median) <= threshold);
  }

  private getSmoothingWindow(level: string): number {
    switch (level) {
      case 'light': return 3;
      case 'medium': return 5;
      case 'heavy': return 7;
      default: return 1;
    }
  }

  private async linearFit(curve: CurveData): Promise<CurveData> {
    // Implement linear curve fitting
    return curve;
  }

  private async polynomialFit(curve: CurveData): Promise<CurveData> {
    // Implement polynomial curve fitting
    return curve;
  }

  private async splineFit(curve: CurveData): Promise<CurveData> {
    // Implement spline curve fitting
    return curve;
  }

  private async adaptiveFit(curve: CurveData): Promise<CurveData> {
    // Implement adaptive curve fitting based on curve characteristics
    const isLinear = this.isCurveLinear(curve);
    if (isLinear) {
      return this.linearFit(curve);
    } else {
      return this.splineFit(curve);
    }
  }

  private isCurveLinear(curve: CurveData): boolean {
    // Implement linearity detection
    if (curve.points.length < 3) return true;
    
    // Simple linearity check using R-squared
    const xValues = curve.points.map(p => p.x);
    const yValues = curve.points.map(p => p.y);
    
    // Calculate correlation coefficient
    const correlation = this.calculateCorrelation(xValues, yValues);
    return Math.abs(correlation) > 0.95;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n < 2) return 0;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateColorConfidence(color: DetectedColor, imageData: Uint8Array): number {
    // Implement color confidence calculation
    // This could be based on color saturation, brightness, frequency, etc.
    return color.confidence || 0.5;
  }

  private calculateCurveQuality(curve: CurveData): number {
    // Implement curve quality calculation
    // This could be based on smoothness, point density, etc.
    return 0.8; // Placeholder
  }

  private calculateCurveConfidence(curve: CurveData): number {
    // Implement curve confidence calculation
    // This could be based on quality, fitting error, etc.
    return 0.7; // Placeholder
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private medianAbsoluteDeviation(values: number[]): number {
    const med = this.median(values);
    const deviations = values.map(v => Math.abs(v - med));
    return this.median(deviations);
  }

  // Database and export methods
  async saveToDatabase(productId: string, curves: CurveData[], config: GraphConfig, colorRepresentations: Record<string, string>): Promise<void> {
    try {
      // Save to database using Tauri invoke
      if (typeof window !== 'undefined' && window.__TAURI__) {
        await invoke('save_curves_to_database', {
          productId,
          curves: JSON.stringify(curves),
          config: JSON.stringify(config),
          colorRepresentations: JSON.stringify(colorRepresentations)
        });
      }
    } catch (error) {
      console.error('Failed to save to database:', error);
      throw error;
    }
  }

  exportToCSV(curves: CurveData[], colorRepresentations: Record<string, string>): string {
    let csv = 'Color,X,Y\n';
    
    curves.forEach((curve) => {
      const colorName = colorRepresentations[curve.color] || curve.color;
      curve.points.forEach(point => {
        csv += `${colorName},${point.x},${point.y}\n`;
      });
    });
    
    return csv;
  }

  private getDefaultLLMAnalysis(): LLMAnalysisResult {
    return {
      success: false,
      graphType: 'custom',
      xAxis: { name: 'X', unit: '', min: 0, max: 10, interval: 1, scale: 'linear' },
      yAxis: { name: 'Y', unit: '', min: 0, max: 10, interval: 1, scale: 'linear' },
      detectedCurves: [],
      graphFeatures: { hasGrid: false, hasLabels: false, hasLegend: false, gridStyle: 'none' },
      confidence: 0,
      processingTime: 0
    };
  }

  private updateStats(processingTime: number, success: boolean): void {
    this.stats.totalProcessed++;
    this.stats.totalErrors += success ? 0 : 1;
    this.stats.successRate = ((this.stats.totalProcessed - this.stats.totalErrors) / this.stats.totalProcessed) * 100;
    this.stats.averageProcessingTime = (this.stats.averageProcessingTime * (this.stats.totalProcessed - 1) + processingTime) / this.stats.totalProcessed;
    this.stats.lastProcessed = new Date();
  }

  // Get processing statistics
  getStatistics(): ProcessingStats {
    return { ...this.stats };
  }

  // Get queue status
  getQueueStatus(): { queueLength: number; processingCount: number } {
    return {
      queueLength: this.batchQueue.length,
      processingCount: this.processingJobs.size
    };
  }

  // Testing and validation methods
  async testServiceConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const startTime = performance.now();
      
      // Test basic service availability
      const isAvailable = await this.curveExtractionService.isFastApiAvailable();
      if (!isAvailable) {
        return {
          success: false,
          message: 'FastAPI service is not available',
          details: { service: 'FastAPI', status: 'unavailable' }
        };
      }

      // Test LLM providers
      const llmTests = await Promise.allSettled([
        this.testLLMProvider('ollama'),
        this.testLLMProvider('openai'),
        this.testLLMProvider('anthropic')
      ]);

      const llmResults = llmTests.map((result, index) => {
        const providers = ['ollama', 'openai', 'anthropic'];
        if (result.status === 'fulfilled') {
          return { provider: providers[index], ...result.value };
        } else {
          return { 
            provider: providers[index], 
            success: false, 
            message: result.reason 
          };
        }
      });

      const processingTime = (performance.now() - startTime) / 1000;

      return {
        success: true,
        message: 'Service connection test completed',
        details: {
          fastapi: { status: 'available' },
          llm_providers: llmResults,
          processing_time: processingTime
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Service connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async testLLMProvider(provider: string): Promise<{
    success: boolean;
    message: string;
    response_time?: number;
  }> {
    try {
      const startTime = performance.now();
      
      // Create a simple test image (1x1 pixel)
      const testImageData = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 image
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // PNG data
        0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
        0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33, // Image data
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
      ]);

      const testConfig: EnhancedGraphConfig = {
        x_min: 0,
        x_max: 10,
        y_min: 0,
        y_max: 10,
        x_scale: 1,
        y_scale: 1,
        x_scale_type: 'linear',
        y_scale_type: 'linear',
        graph_type: 'custom',
        x_axis_name: 'X',
        y_axis_name: 'Y',
        autoDetectAxes: true,
        autoDetectIntervals: true,
        useLLMAnalysis: true,
        llmProvider: provider as any,
        llmModel: provider === 'ollama' ? 'llama3.2' : 'gpt-4',
        colorDetectionMethod: 'hybrid',
        curveFittingMethod: 'adaptive',
        noiseReduction: true,
        outlierRemoval: true,
        smoothingLevel: 'medium'
      };

      const result = await this.extractGraphWithLLM(testImageData, testConfig);
      const responseTime = (performance.now() - startTime) / 1000;

      return {
        success: result.llmAnalysis.success,
        message: result.llmAnalysis.success ? 'Provider available' : 'Provider unavailable',
        response_time: responseTime
      };
    } catch (error) {
      return {
        success: false,
        message: `Provider test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async validateExtractionResult(result: {
    extractionResult: CurveExtractionResult;
    llmAnalysis: LLMAnalysisResult;
  }): Promise<{
    valid: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Validate extraction result
    if (!result.extractionResult.success) {
      issues.push('Curve extraction failed');
      score -= 50;
    } else {
      // Check curve quality
      if (result.extractionResult.curves.length === 0) {
        issues.push('No curves extracted');
        score -= 30;
      } else {
        // Validate individual curves
        result.extractionResult.curves.forEach((curve, index) => {
          if (curve.points.length < 10) {
            issues.push(`Curve ${index + 1} has too few points (${curve.points.length})`);
            score -= 10;
          }
          if (curve.quality && curve.quality < 0.5) {
            issues.push(`Curve ${index + 1} has low quality (${(curve.quality * 100).toFixed(1)}%)`);
            score -= 15;
          }
        });
      }
    }

    // Validate LLM analysis
    if (!result.llmAnalysis.success) {
      issues.push('LLM analysis failed');
      score -= 30;
    } else {
      // Check LLM analysis quality
      if (result.llmAnalysis.confidence < 0.5) {
        issues.push(`Low LLM confidence (${(result.llmAnalysis.confidence * 100).toFixed(1)}%)`);
        score -= 20;
      }
      if (!result.llmAnalysis.xAxis.name || !result.llmAnalysis.yAxis.name) {
        issues.push('Missing axis names in LLM analysis');
        score -= 10;
      }
    }

    // Generate suggestions
    if (score < 70) {
      suggestions.push('Consider adjusting image quality or preprocessing');
    }
    if (result.extractionResult.curves.length === 0) {
      suggestions.push('Try different color detection settings');
    }
    if (result.llmAnalysis.confidence < 0.5) {
      suggestions.push('Try a different LLM model or provider');
    }

    return {
      valid: score >= 70,
      score: Math.max(0, score),
      issues,
      suggestions
    };
  }

  async benchmarkPerformance(imageData: Uint8Array, config: EnhancedGraphConfig): Promise<{
    traditional: number;
    enhanced: number;
    improvement: number;
    details: any;
  }> {
    try {
      // Test traditional extraction
      const traditionalStart = performance.now();
      const traditionalResult = await this.curveExtractionService.extractCurves(
        imageData,
        ['red', 'blue', 'green'],
        config
      );
      const traditionalTime = (performance.now() - traditionalStart) / 1000;

      // Test enhanced extraction
      const enhancedStart = performance.now();
      const enhancedResult = await this.extractGraphWithLLM(imageData, config);
      const enhancedTime = (performance.now() - enhancedStart) / 1000;

      const improvement = ((traditionalTime - enhancedTime) / traditionalTime) * 100;

      return {
        traditional: traditionalTime,
        enhanced: enhancedTime,
        improvement,
        details: {
          traditional_curves: traditionalResult.curves.length,
          enhanced_curves: enhancedResult.extractionResult.curves.length,
          traditional_points: traditionalResult.totalPoints,
          enhanced_points: enhancedResult.extractionResult.totalPoints,
          llm_analysis_success: enhancedResult.llmAnalysis.success
        }
      };
    } catch (error) {
      throw new Error(`Benchmark failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default EnhancedGraphExtractionService; 