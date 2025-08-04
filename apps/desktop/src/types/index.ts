// Enhanced types for graph extraction and batch processing

// Tauri global object declaration
declare global {
  interface Window {
    __TAURI__?: {
      invoke: (command: string, args?: any) => Promise<any>;
    };
  }
}

// Database types for product management and SPICE models
export interface Product {
  id: string;
  name: string;
  manufacturer: string;
  type: string;
  datasheetPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Parameter {
  id: string;
  productId: string;
  name: string;
  value: string;
  unit: string;
  category: string;
  extractedFrom: string;
  confidence: number;
  createdAt: Date;
}

export interface SPICEModel {
  id: string;
  productId: string;
  modelText: string;
  parameters: Array<{
    name: string;
    value: string;
    category: string;
    source: string;
  }>;
  version: string;
  createdAt: Date;
  validatedAt?: Date;
}

export interface DetectedColor {
  name: string;
  display_name?: string;
  color: string;
  pixelCount: number;
  hsv?: {
    h: number;
    s: number;
    v: number;
  };
  confidence?: number;
}

export interface GraphConfig {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  x_scale: number;
  y_scale: number;
  x_scale_type: 'linear' | 'log';
  y_scale_type: 'linear' | 'log';
  min_size?: number;
  detection_sensitivity?: number;
  color_tolerance?: number;
  smoothing_factor?: number;
  graph_type: string;
  x_axis_name?: string;
  y_axis_name?: string;
  third_col?: string;
  output_filename?: string;
}

export interface GraphPreset {
  graph_type: string;
  name: string;
  x_axis: string;
  y_axis: string;
  third_col: string;
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  x_scale: number;
  y_scale: number;
  x_scale_type: string;
  y_scale_type: string;
  color_reps: Record<string, string>;
  output_filename: string;
}

export interface SavedGraphType extends GraphPreset {
  id: string;
  isCustom: boolean;
}

export interface CurvePoint {
  x: number;
  y: number;
  label?: string;
  confidence?: number;
}

export interface CurveData {
  name: string;
  color: string;
  points: CurvePoint[];
  representation?: string;
  pointCount?: number;
  metadata?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    averageSlope?: number;
  };
}

export interface CurveExtractionResult {
  curves: CurveData[];
  totalPoints: number;
  processingTime: number;
  success?: boolean;
  error?: string;
  plotImage?: string; // Base64 encoded matplotlib plot
  metadata?: {
    imageWidth?: number;
    imageHeight?: number;
    detectedColors?: number;
    extractionMethod?: string;
    qualityScore?: number;
  };
}

export interface BatchJob {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  imageData: Uint8Array;
  selectedColors: string[];
  config: GraphConfig;
  result?: CurveExtractionResult;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  priority?: number;
  retryCount?: number;
}

export interface BatchProcessingConfig {
  maxConcurrentJobs: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  priorityQueue?: boolean;
}

export interface ProcessingStats {
  totalProcessed: number;
  successRate: number;
  averageProcessingTime: number;
  lastProcessed: Date | null;
  totalErrors: number;
  averageQueueTime: number;
}

export interface ColorDetectionResult {
  colors: DetectedColor[];
  processingTime: number;
  imageStats: {
    width: number;
    height: number;
    totalPixels: number;
    uniqueColors: number;
  };
  qualityMetrics: {
    colorSeparation: number;
    noiseLevel: number;
    contrastRatio: number;
  };
}

export interface GraphValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  includeMetadata: boolean;
  precision: number;
  delimiter?: string;
  filename?: string;
}

export interface DatabaseSaveResult {
  success: boolean;
  recordId?: string;
  error?: string;
  timestamp: Date;
}

// Enhanced PDF types for integration
export interface PDFPage {
  pageNumber: number;
  width: number;
  height: number;
  imageData?: Uint8Array;
  extractedGraphs?: CurveExtractionResult[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface PDFDocument {
  id: string;
  filename: string;
  totalPages: number;
  pages: PDFPage[];
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
  processingConfig: {
    extractGraphs: boolean;
    extractText: boolean;
    extractImages: boolean;
    graphDetectionSensitivity: number;
  };
}

// UI State types
export interface GraphExtractionState {
  currentImage: {
    file: File | null;
    preview: string | null;
    data: Uint8Array | null;
  };
  detectedColors: DetectedColor[];
  selectedColors: string[];
  config: GraphConfig;
  result: CurveExtractionResult | null;
  processing: boolean;
  error: string | null;
  batchJobs: BatchJob[];
  showBatchProcessing: boolean;
}

export interface GraphViewerState {
  curves: CurveData[];
  config: GraphConfig;
  viewport: {
    width: number;
    height: number;
    zoom: number;
    panX: number;
    panY: number;
  };
  displayOptions: {
    showGrid: boolean;
    showLegend: boolean;
    showAxisLabels: boolean;
    showTitle: boolean;
    showPoints: boolean;
    showLines: boolean;
    lineWidth: number;
    pointSize: number;
  };
}

// API Response types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export interface ProcessingError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  context?: {
    operation: string;
    inputData?: any;
    config?: any;
  };
}

// Configuration types
export interface AppConfig {
  graphExtraction: {
    defaultConfig: GraphConfig;
    colorDetection: {
      minPixelCount: number;
      maxColors: number;
      tolerance: number;
      useHSV: boolean;
    };
    curveExtraction: {
      smoothingEnabled: boolean;
      smoothingWindow: number;
      duplicateRemoval: boolean;
      minDistance: number;
    };
    batchProcessing: BatchProcessingConfig;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    defaultViewport: {
      width: number;
      height: number;
    };
  };
  export: {
    defaultFormat: 'csv' | 'json' | 'excel';
    defaultPrecision: number;
    includeMetadata: boolean;
  };
}

// Event types for real-time updates
export interface ProcessingEvent {
  type: 'job_started' | 'job_progress' | 'job_completed' | 'job_failed' | 'batch_completed';
  jobId?: string;
  data?: any;
  timestamp: Date;
}

export interface ProgressUpdate {
  jobId: string;
  progress: number;
  status: BatchJob['status'];
  message?: string;
  estimatedTimeRemaining?: number;
}

// Utility types
export type ColorName = 'red' | 'blue' | 'green' | 'yellow' | 'cyan' | 'magenta' | 'orange' | 'purple' | 'brown' | 'pink';

export type ScaleType = 'linear' | 'log' | 'sqrt' | 'pow';

export type GraphType = 'output' | 'transfer' | 'capacitance' | 'resistance' | 'custom';

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'failed' | 'cancelled';

// Legacy compatibility types
export interface LegacyCurveData {
  name: string;
  color: string;
  points: Array<{
    x: number;
    y: number;
    label: string;
  }>;
  representation: string;
}

export interface LegacyExtractionResult {
  success: boolean;
  curves: LegacyCurveData[];
  error?: string;
} 