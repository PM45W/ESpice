import { invoke } from '@tauri-apps/api/core';
import { CurveExtractionService } from './curveExtractionService';
import { EnhancedPDFProcessor } from './enhancedPDFProcessor';
import type { 
  DetectedColor, 
  GraphConfig, 
  CurveExtractionResult, 
  CurveData,
  GraphType 
} from '../types';

export interface DatasheetImageExtractionConfig {
  extractGraphs: boolean;
  extractText: boolean;
  extractImages: boolean;
  graphDetectionSensitivity: number;
  defaultGraphType: GraphType;
  autoProcessGraphs: boolean;
  saveExtractedImages: boolean;
  outputDirectory?: string;
}

export interface ExtractedGraphImage {
  id: string;
  pageNumber: number;
  imageData: Uint8Array;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  graphType?: GraphType;
  detectedColors?: DetectedColor[];
  extractedCurves?: CurveData[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface DatasheetExtractionResult {
  success: boolean;
  datasheetId: string;
  extractedGraphs: ExtractedGraphImage[];
  totalPages: number;
  processingTime: number;
  error?: string;
  metadata?: {
    title?: string;
    manufacturer?: string;
    partNumber?: string;
    extractedImagesCount: number;
    successfulExtractions: number;
    failedExtractions: number;
  };
}

export interface GraphDetectionResult {
  isGraph: boolean;
  confidence: number;
  graphType?: GraphType;
  features: {
    hasAxes: boolean;
    hasGrid: boolean;
    hasCurves: boolean;
    hasLabels: boolean;
    colorCount: number;
  };
  suggestedConfig?: GraphConfig;
}

class DatasheetImageExtractionService {
  private static instance: DatasheetImageExtractionService;
  private curveExtractionService: CurveExtractionService;
  private enhancedPdfProcessor: EnhancedPDFProcessor;
  private defaultConfig: DatasheetImageExtractionConfig;

  private constructor() {
    this.curveExtractionService = CurveExtractionService.getInstance();
    this.enhancedPdfProcessor = EnhancedPDFProcessor.getInstance();
    this.defaultConfig = {
      extractGraphs: true,
      extractText: true,
      extractImages: true,
      graphDetectionSensitivity: 0.7,
      defaultGraphType: 'output',
      autoProcessGraphs: true,
      saveExtractedImages: true,
      outputDirectory: 'extracted_graphs'
    };
  }

  static getInstance(): DatasheetImageExtractionService {
    if (!DatasheetImageExtractionService.instance) {
      DatasheetImageExtractionService.instance = new DatasheetImageExtractionService();
    }
    return DatasheetImageExtractionService.instance;
  }

  /**
   * Extract graph images from a datasheet PDF
   */
  async extractGraphImagesFromDatasheet(
    file: File,
    config: Partial<DatasheetImageExtractionConfig> = {}
  ): Promise<DatasheetExtractionResult> {
    const startTime = performance.now();
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      console.log('Starting datasheet image extraction...');
      
      // Extract images from PDF using enhanced processor
      const pdfResult = await this.enhancedPdfProcessor.processPDF(file, {
        extractImages: true,
        extractText: false,
        performOCR: false
      });

      if (!pdfResult.success) {
        throw new Error(`PDF processing failed: ${pdfResult.error?.message}`);
      }

      const extractedGraphs: ExtractedGraphImage[] = [];
      let successfulExtractions = 0;
      let failedExtractions = 0;

      // Process each extracted image
      for (let pageNum = 0; pageNum < pdfResult.data?.pageCount || 0; pageNum++) {
        const pageImages = await this.extractImagesFromPage(file, pageNum + 1);
        
        for (const imageData of pageImages) {
          try {
            // Detect if image contains a graph
            const detectionResult = await this.detectGraphInImage(imageData);
            
            if (detectionResult.isGraph && detectionResult.confidence >= finalConfig.graphDetectionSensitivity) {
              const graphImage: ExtractedGraphImage = {
                id: `graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                pageNumber: pageNum + 1,
                imageData,
                bounds: { x: 0, y: 0, width: 0, height: 0 }, // Will be updated with actual bounds
                confidence: detectionResult.confidence,
                graphType: detectionResult.graphType || finalConfig.defaultGraphType,
                processingStatus: 'pending'
              };

              // Auto-process graphs if enabled
              if (finalConfig.autoProcessGraphs) {
                try {
                  graphImage.processingStatus = 'processing';
                  
                  // Detect colors in the graph
                  const detectedColors = await this.curveExtractionService.detectColors(imageData);
                  graphImage.detectedColors = detectedColors;

                  // Extract curves using default configuration
                  const curveConfig = detectionResult.suggestedConfig || this.getDefaultGraphConfig(
                    detectionResult.graphType || finalConfig.defaultGraphType
                  );
                  
                  const curveResult = await this.curveExtractionService.extractCurves(
                    imageData,
                    detectedColors.map(c => c.name),
                    curveConfig
                  );

                  if (curveResult.success) {
                    graphImage.extractedCurves = curveResult.curves;
                    graphImage.processingStatus = 'completed';
                    successfulExtractions++;
                  } else {
                    graphImage.processingStatus = 'failed';
                    graphImage.error = curveResult.error;
                    failedExtractions++;
                  }
                } catch (error) {
                  graphImage.processingStatus = 'failed';
                  graphImage.error = error instanceof Error ? error.message : 'Unknown error';
                  failedExtractions++;
                }
              }

              extractedGraphs.push(graphImage);
            }
          } catch (error) {
            console.error(`Error processing image on page ${pageNum + 1}:`, error);
            failedExtractions++;
          }
        }
      }

      const processingTime = performance.now() - startTime;

      return {
        success: true,
        datasheetId: `datasheet_${Date.now()}`,
        extractedGraphs,
        totalPages: pdfResult.data?.pageCount || 0,
        processingTime,
        metadata: {
          title: pdfResult.data?.metadata?.title,
          extractedImagesCount: extractedGraphs.length,
          successfulExtractions,
          failedExtractions
        }
      };

    } catch (error) {
      console.error('Datasheet image extraction failed:', error);
      return {
        success: false,
        datasheetId: '',
        extractedGraphs: [],
        totalPages: 0,
        processingTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract images from a specific page of a PDF
   */
  private async extractImagesFromPage(file: File, pageNumber: number): Promise<Uint8Array[]> {
    try {
      // Use Tauri invoke to extract images from PDF page
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const result = await invoke('extract_images_from_pdf_page', {
          filePath: file.name,
          pageNumber: pageNumber - 1 // Tauri uses 0-based indexing
        });
        
        if (result && Array.isArray(result)) {
          return result.map((imgData: any) => new Uint8Array(imgData));
        }
      }
      
      // Fallback: use enhanced PDF processor
      const pdfResult = await this.enhancedPdfProcessor.processPDF(file, {
        extractImages: true,
        extractText: false,
        performOCR: false
      });

      if (pdfResult.success && pdfResult.data?.images) {
        return pdfResult.data.images
          .filter(img => img.pageNumber === pageNumber)
          .map(img => img.imageData || new Uint8Array());
      }

      return [];
    } catch (error) {
      console.error(`Error extracting images from page ${pageNumber}:`, error);
      return [];
    }
  }

  /**
   * Detect if an image contains a graph using computer vision techniques
   */
  private async detectGraphInImage(imageData: Uint8Array): Promise<GraphDetectionResult> {
    try {
      // Use Tauri invoke for graph detection if available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const result = await invoke('detect_graph_in_image', {
          imageData: Array.from(imageData)
        });
        
        if (result && typeof result === 'object') {
          return result as GraphDetectionResult;
        }
      }

      // Fallback: basic graph detection using canvas analysis
      return await this.detectGraphBasic(imageData);
    } catch (error) {
      console.error('Graph detection failed:', error);
      return {
        isGraph: false,
        confidence: 0,
        features: {
          hasAxes: false,
          hasGrid: false,
          hasCurves: false,
          hasLabels: false,
          colorCount: 0
        }
      };
    }
  }

  /**
   * Basic graph detection using canvas analysis
   */
  private async detectGraphBasic(imageData: Uint8Array): Promise<GraphDetectionResult> {
    return new Promise((resolve) => {
      try {
        const blob = new Blob([imageData], { type: 'image/png' });
        const imageUrl = URL.createObjectURL(blob);
        
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              isGraph: false,
              confidence: 0,
              features: {
                hasAxes: false,
                hasGrid: false,
                hasCurves: false,
                hasLabels: false,
                colorCount: 0
              }
            });
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData2D = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData2D.data;

          // Analyze image for graph features
          const features = this.analyzeImageForGraphFeatures(data, canvas.width, canvas.height);
          
          // Calculate confidence based on features
          let confidence = 0;
          if (features.hasAxes) confidence += 0.3;
          if (features.hasGrid) confidence += 0.2;
          if (features.hasCurves) confidence += 0.3;
          if (features.hasLabels) confidence += 0.1;
          if (features.colorCount > 2) confidence += 0.1;

          // Determine graph type based on features
          let graphType: GraphType = 'output';
          if (features.hasCurves && features.colorCount > 3) {
            graphType = 'transfer';
          }

          resolve({
            isGraph: confidence > 0.3,
            confidence: Math.min(confidence, 1),
            graphType,
            features,
            suggestedConfig: this.getDefaultGraphConfig(graphType)
          });

          URL.revokeObjectURL(imageUrl);
        };

        img.onerror = () => {
          resolve({
            isGraph: false,
            confidence: 0,
            features: {
              hasAxes: false,
              hasGrid: false,
              hasCurves: false,
              hasLabels: false,
              colorCount: 0
            }
          });
          URL.revokeObjectURL(imageUrl);
        };

        img.src = imageUrl;
      } catch (error) {
        resolve({
          isGraph: false,
          confidence: 0,
          features: {
            hasAxes: false,
            hasGrid: false,
            hasCurves: false,
            hasLabels: false,
            colorCount: 0
          }
        });
      }
    });
  }

  /**
   * Analyze image data for graph features
   */
  private analyzeImageForGraphFeatures(data: Uint8ClampedArray, width: number, height: number) {
    const colorMap = new Map<string, number>();
    let hasAxes = false;
    let hasGrid = false;
    let hasCurves = false;
    let hasLabels = false;

    // Analyze pixel data
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Skip white/black pixels
      if ((r > 240 && g > 240 && b > 240) || (r < 20 && g < 20 && b < 20)) {
        continue;
      }

      const colorKey = `${r},${g},${b}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }

    // Simple heuristics for graph detection
    const colorCount = colorMap.size;
    
    // Check for straight lines (potential axes)
    hasAxes = this.detectStraightLines(data, width, height);
    
    // Check for grid patterns
    hasGrid = this.detectGridPattern(data, width, height);
    
    // Check for curved lines
    hasCurves = this.detectCurvedLines(data, width, height);
    
    // Check for text labels
    hasLabels = this.detectTextLabels(data, width, height);

    return {
      hasAxes,
      hasGrid,
      hasCurves,
      hasLabels,
      colorCount
    };
  }

  /**
   * Detect straight lines in image (potential axes)
   */
  private detectStraightLines(data: Uint8ClampedArray, width: number, height: number): boolean {
    // Simple line detection using edge detection
    let lineCount = 0;
    
    // Check horizontal lines
    for (let y = 0; y < height; y += 10) {
      let consecutiveDark = 0;
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        if (r < 100 && g < 100 && b < 100) {
          consecutiveDark++;
        } else {
          if (consecutiveDark > width * 0.3) {
            lineCount++;
          }
          consecutiveDark = 0;
        }
      }
    }

    // Check vertical lines
    for (let x = 0; x < width; x += 10) {
      let consecutiveDark = 0;
      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        if (r < 100 && g < 100 && b < 100) {
          consecutiveDark++;
        } else {
          if (consecutiveDark > height * 0.3) {
            lineCount++;
          }
          consecutiveDark = 0;
        }
      }
    }

    return lineCount >= 2; // At least 2 lines (x and y axes)
  }

  /**
   * Detect grid patterns in image
   */
  private detectGridPattern(data: Uint8ClampedArray, width: number, height: number): boolean {
    // Simple grid detection
    let gridLines = 0;
    
    // Check for evenly spaced lines
    for (let y = 0; y < height; y += 20) {
      let darkPixels = 0;
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        if (r < 150 && g < 150 && b < 150) {
          darkPixels++;
        }
      }
      if (darkPixels > width * 0.1) {
        gridLines++;
      }
    }

    return gridLines >= 3; // At least 3 grid lines
  }

  /**
   * Detect curved lines in image
   */
  private detectCurvedLines(data: Uint8ClampedArray, width: number, height: number): boolean {
    // Simple curve detection by looking for non-linear color patterns
    let curveSegments = 0;
    
    for (let y = 0; y < height; y += 5) {
      let colorChanges = 0;
      let lastColor = '';
      
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        const colorKey = `${Math.round(r/50)*50},${Math.round(g/50)*50},${Math.round(b/50)*50}`;
        
        if (colorKey !== lastColor && colorKey !== '0,0,0' && colorKey !== '255,255,255') {
          colorChanges++;
          lastColor = colorKey;
        }
      }
      
      if (colorChanges > 5) {
        curveSegments++;
      }
    }

    return curveSegments > height * 0.1; // At least 10% of rows have curves
  }

  /**
   * Detect text labels in image
   */
  private detectTextLabels(data: Uint8ClampedArray, width: number, height: number): boolean {
    // Simple text detection by looking for small, isolated dark regions
    let textRegions = 0;
    
    for (let y = 0; y < height; y += 10) {
      for (let x = 0; x < width; x += 10) {
        let darkPixels = 0;
        
        // Check 10x10 region
        for (let dy = 0; dy < 10 && y + dy < height; dy++) {
          for (let dx = 0; dx < 10 && x + dx < width; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            if (r < 100 && g < 100 && b < 100) {
              darkPixels++;
            }
          }
        }
        
        if (darkPixels > 20 && darkPixels < 80) { // Text-like region
          textRegions++;
        }
      }
    }

    return textRegions > 5; // At least 5 potential text regions
  }

  /**
   * Get default graph configuration based on graph type
   */
  private getDefaultGraphConfig(graphType: GraphType): GraphConfig {
    switch (graphType) {
      case 'output':
        return {
          x_min: 0,
          x_max: 10,
          y_min: 0,
          y_max: 50,
          x_scale: 1,
          y_scale: 1,
          x_scale_type: 'linear',
          y_scale_type: 'linear',
          graph_type: 'output',
          x_axis_name: 'V_DS (V)',
          y_axis_name: 'I_D (A)'
        };
      case 'transfer':
        return {
          x_min: 0,
          x_max: 5,
          y_min: 0,
          y_max: 20,
          x_scale: 1,
          y_scale: 1,
          x_scale_type: 'linear',
          y_scale_type: 'linear',
          graph_type: 'transfer',
          x_axis_name: 'V_GS (V)',
          y_axis_name: 'I_D (A)'
        };
      case 'capacitance':
        return {
          x_min: 0,
          x_max: 100,
          y_min: 0,
          y_max: 1000,
          x_scale: 1,
          y_scale: 1,
          x_scale_type: 'linear',
          y_scale_type: 'linear',
          graph_type: 'capacitance',
          x_axis_name: 'V_DS (V)',
          y_axis_name: 'C (pF)'
        };
      default:
        return {
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
          y_axis_name: 'Y'
        };
    }
  }

  /**
   * Process extracted graph images with curve extraction
   */
  async processExtractedGraphs(
    extractedGraphs: ExtractedGraphImage[],
    config: Partial<DatasheetImageExtractionConfig> = {}
  ): Promise<ExtractedGraphImage[]> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    for (const graph of extractedGraphs) {
      if (graph.processingStatus === 'pending' && finalConfig.autoProcessGraphs) {
        try {
          graph.processingStatus = 'processing';
          
          // Detect colors
          const detectedColors = await this.curveExtractionService.detectColors(graph.imageData);
          graph.detectedColors = detectedColors;

          // Extract curves
          const curveConfig = this.getDefaultGraphConfig(graph.graphType || finalConfig.defaultGraphType);
          const curveResult = await this.curveExtractionService.extractCurves(
            graph.imageData,
            detectedColors.map(c => c.name),
            curveConfig
          );

          if (curveResult.success) {
            graph.extractedCurves = curveResult.curves;
            graph.processingStatus = 'completed';
          } else {
            graph.processingStatus = 'failed';
            graph.error = curveResult.error;
          }
        } catch (error) {
          graph.processingStatus = 'failed';
          graph.error = error instanceof Error ? error.message : 'Unknown error';
        }
      }
    }

    return extractedGraphs;
  }

  /**
   * Export extracted curves to CSV
   */
  async exportCurvesToCSV(extractedGraphs: ExtractedGraphImage[]): Promise<string> {
    let csvContent = 'Graph ID,Page,Graph Type,Color,X,Y\n';
    
    for (const graph of extractedGraphs) {
      if (graph.extractedCurves) {
        for (const curve of graph.extractedCurves) {
          for (const point of curve.points) {
            csvContent += `${graph.id},${graph.pageNumber},${graph.graphType},${curve.color},${point.x},${point.y}\n`;
          }
        }
      }
    }
    
    return csvContent;
  }

  /**
   * Save extracted graph images to disk
   */
  async saveExtractedImages(
    extractedGraphs: ExtractedGraphImage[],
    outputDirectory: string = 'extracted_graphs'
  ): Promise<string[]> {
    const savedPaths: string[] = [];
    
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        for (const graph of extractedGraphs) {
          const fileName = `${graph.id}_page${graph.pageNumber}.png`;
          const result = await invoke('save_image_data', {
            imageData: Array.from(graph.imageData),
            fileName,
            outputDirectory
          });
          
          if (result) {
            savedPaths.push(`${outputDirectory}/${fileName}`);
          }
        }
      }
    } catch (error) {
      console.error('Error saving extracted images:', error);
    }
    
    return savedPaths;
  }
}

export default DatasheetImageExtractionService; 