// PDF Processing Types
export interface PDFProcessingResult {
  success: boolean;
  text: string;
  pageCount: number;
  metadata?: PDFMetadata;
  tables?: ExtractedTable[];
  parameters?: ExtractedParameter[];
  ocrResults?: OCRResult[];
  layoutInfo?: LayoutAnalysisResult;
  cacheKey?: string;
  error?: PDFProcessingError;
  processingTime?: number;
  memoryUsage?: number;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pages: number;
  encrypted: boolean;
  fileSize: number;
  version?: string;
}

export interface ExtractedTable {
  id: string;
  title?: string;
  headers: string[];
  rows: string[][];
  pageNumber: number;
  confidence: number;
  extractionMethod: 'pattern' | 'structure' | 'manual';
  validationStatus: 'valid' | 'warning' | 'error';
  validationMessages?: string[];
}

export interface ExtractedParameter {
  id: string;
  name: string;
  symbol?: string;
  value: string | number;
  unit?: string;
  condition?: string;
  min?: string | number;
  typ?: string | number;
  max?: string | number;
  tableId?: string;
  pageNumber: number;
  confidence: number;
  dataType: 'electrical' | 'thermal' | 'mechanical' | 'other';
  validationStatus: 'valid' | 'warning' | 'error';
  validationMessages?: string[];
}

export interface PDFProcessingOptions {
  extractTables?: boolean;
  extractParameters?: boolean;
  targetParameters?: string[];
  pageRange?: {
    start: number;
    end: number;
  };
  performanceMode?: 'fast' | 'balanced' | 'thorough';
  maxMemoryUsage?: number; // MB
  enableLogging?: boolean;
  validateResults?: boolean;
  chunkSize?: number;
}

export interface MLProcessingOptions extends PDFProcessingOptions {
  useGPU?: boolean;
  modelPrecision?: 'fp16' | 'fp32';
  batchSize?: number;
  enableParallelProcessing?: boolean;
  ocrModel?: 'paddleocr' | 'easyocr' | 'tesseract' | 'layoutlm';
  tableDetectionModel?: 'tablenet' | 'cascadetabnet' | 'table-transformer';
  parameterModel?: 'bert' | 'roberta' | 'custom-ner';
}

export interface OCRResult {
  pageNum: number;
  text: string;
  confidence: number;
  error?: string;
}

export interface OCRWordResult {
  id: string;
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface LayoutAnalysisResult {
  pages: PageLayout[];
  textBlocks: TextBlock[];
  tables: TableLayout[];
  images: ImageLayout[];
}

export interface PageLayout {
  pageNum: number;
  lineCount: number;
  lines: LineInfo[];
  textBlocks: number;
}

export interface LineInfo {
  y: number;
  items: TextItem[];
}

export interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

export interface TextBlock {
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

export interface TableLayout {
  id: string;
  pageNum: number;
  bounds: Bounds;
  confidence: number;
}

export interface ImageLayout {
  id: string;
  pageNum: number;
  bounds: Bounds;
  type: 'graph' | 'chart' | 'diagram' | 'photo';
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageData {
  pageNum: number;
  data: Uint8Array;
  width: number;
  height: number;
  format: string;
}

export interface TableDetectionResult {
  id: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  structure: {
    rows: number;
    columns: number;
    headers: string[];
  };
}

export interface ParameterExtractionResult {
  id: string;
  name: string;
  value: string;
  unit?: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  dataType: 'electrical' | 'thermal' | 'mechanical' | 'other';
}

export interface PDFProcessingError {
  code: PDFErrorCode;
  message: string;
  details?: string;
  file?: string;
  stack?: string;
  timestamp: Date;
  recoverable: boolean;
  suggestions?: string[];
}

export enum PDFErrorCode {
  INVALID_PDF = 'INVALID_PDF',
  ENCRYPTED_PDF = 'ENCRYPTED_PDF',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ProcessingProgress {
  stage: 'reading' | 'parsing' | 'extracting' | 'validating' | 'complete';
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number;
}

// Common semiconductor parameters to look for
export const SEMICONDUCTOR_PARAMETERS = [
  'VTH', 'VGS(th)', 'Threshold Voltage',
  'RDS(on)', 'RDS(ON)', 'On-Resistance',
  'IDSS', 'ID', 'Drain Current',
  'BVDSS', 'VDSS', 'Breakdown Voltage',
  'VGS', 'Gate-Source Voltage',
  'VDS', 'Drain-Source Voltage',
  'Ciss', 'Coss', 'Crss', 'Capacitance',
  'QG', 'Gate Charge',
  'tON', 'tOFF', 'Switching Time',
  'PD', 'Power Dissipation',
  'TJ', 'Junction Temperature',
  'IS', 'Saturation Current',
  'BF', 'Current Gain',
  'VF', 'Forward Voltage',
  'IR', 'Reverse Current'
] as const;

export type SemiconductorParameter = typeof SEMICONDUCTOR_PARAMETERS[number];

// Parameter validation rules
export interface ParameterValidationRule {
  parameter: string;
  expectedUnit?: string;
  minValue?: number;
  maxValue?: number;
  pattern?: RegExp;
  required?: boolean;
}

export const PARAMETER_VALIDATION_RULES: ParameterValidationRule[] = [
  { parameter: 'VTH', expectedUnit: 'V', minValue: 0, maxValue: 10 },
  { parameter: 'RDS(on)', expectedUnit: 'Ω', minValue: 0, maxValue: 1000 },
  { parameter: 'IDSS', expectedUnit: 'A', minValue: 0, maxValue: 1000 },
  { parameter: 'BVDSS', expectedUnit: 'V', minValue: 0, maxValue: 2000 },
  { parameter: 'QG', expectedUnit: 'nC', minValue: 0, maxValue: 1000 },
];

// Performance monitoring
export interface PerformanceMetrics {
  processingTime: number;
  memoryUsage: number;
  fileSize: number;
  tablesExtracted: number;
  parametersExtracted: number;
  errors: number;
  warnings: number;
}

// --- Enhanced LLM-Driven Extraction Types ---

// Represents a detected section (table or graph) in the PDF
export interface SectionAnalysis {
  id: string;
  type: 'table' | 'graph' | 'table_with_graph' | 'other';
  title: string;
  pageNumber: number;
  confidence: number;
  bounds: { x: number; y: number; width: number; height: number }; // for cropping
}

// Result of LLM-driven semantic extraction
export interface LLMExtractionResult {
  sections: SectionAnalysis[];
  confidence: number;
  extractionMethod: 'llm_semantic';
  processingTime: number;
}

// Represents a cropped/captured graph or table image for further analysis
export interface GraphAnalysis {
  id: string;
  pageNumber: number;
  type: 'graph' | 'table_with_graph';
  imageData: string; // base64 PNG or data URL
  bounds: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface PDFRegion {
  id: string;
  type: 'table' | 'graph' | 'parameter_section' | 'text_block' | 'figure' | 'header' | 'footer';
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  };
  content?: string;
  extractedData?: any;
  metadata?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    alignment?: 'left' | 'center' | 'right';
  };
}

export interface PDFPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  scale: number;
  regions: PDFRegion[];
}

export interface PDFViewerState {
  currentPage: number;
  totalPages: number;
  scale: number;
  regions: PDFRegion[];
  selectedRegion?: PDFRegion;
  showOverlays: boolean;
  loading: boolean;
  error?: string | undefined;
}

export interface PDFViewerProps {
  file: File | string;
  regions?: PDFRegion[];
  onRegionSelect?: (region: PDFRegion) => void;
  onPageChange?: (page: number) => void;
  showOverlays?: boolean;
  interactive?: boolean;
  className?: string;
}

// --- Manual Annotation Tool Types ---

export interface AnnotationBox {
  id: string;
  type: 'table' | 'graph' | 'parameter_section' | 'text_block' | 'figure' | 'header' | 'footer' | 'custom';
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  };
  color: string;
  isSelected: boolean;
  isEditing: boolean;
  metadata?: {
    notes?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high';
    extractionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  };
}

export interface DrawingState {
  isDrawing: boolean;
  drawingMode: 'select' | 'draw' | 'edit' | 'delete';
  startPoint: { x: number; y: number } | null;
  currentBox: Partial<AnnotationBox> | null;
  selectedBoxId: string | null;
  hoveredBoxId: string | null;
}

export interface ExportOptions {
  format: 'png' | 'jpg' | 'svg';
  includeLabels: boolean;
  includeMetadata: boolean;
  quality: number; // 0-100
  padding: number; // pixels around the box
  background: 'transparent' | 'white' | 'original';
}

export interface ExtractionQueueItem {
  id: string;
  boxId: string;
  type: 'table' | 'graph' | 'parameter_section' | 'text_block' | 'figure' | 'header' | 'footer' | 'custom';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  progress?: number;
  imageData?: string | null;
}

export interface ExtractionQueue {
  items: ExtractionQueueItem[];
  isProcessing: boolean;
  maxConcurrent: number;
  currentProcessing: string[];
}

export interface AnnotationToolState {
  boxes: AnnotationBox[];
  drawingState: DrawingState;
  selectedTool: 'select' | 'draw' | 'edit' | 'delete' | 'label';
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  zoom: number;
  pan: { x: number; y: number };
  history: AnnotationBox[][];
  historyIndex: number;
  maxHistorySize: number;
}

export interface AnnotationToolProps {
  file: File | string;
  initialBoxes?: AnnotationBox[];
  onBoxesChange?: (boxes: AnnotationBox[]) => void;
  onExport?: (box: AnnotationBox, options: ExportOptions) => void;
  onQueueExtraction?: (box: AnnotationBox) => void;
  className?: string;
}

// Tool configuration
export interface AnnotationToolConfig {
  defaultColors: {
    table: string;
    graph: string;
    parameter_section: string;
    text_block: string;
    figure: string;
    header: string;
    footer: string;
    custom: string;
  };
  defaultLabels: string[];
  keyboardShortcuts: {
    [key: string]: string;
  };
  exportFormats: ('png' | 'jpg' | 'svg')[];
  maxBoxesPerPage: number;
  minBoxSize: { width: number; height: number };
  maxBoxSize: { width: number; height: number };
} 