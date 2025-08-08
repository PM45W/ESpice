import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { 
  PDFProcessingResult, 
  ExtractedTable, 
  ExtractedParameter,
  ProcessingProgress,
  LayoutAnalysisResult,
  OCRResult
} from '../types/pdf';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  Table,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  Button, 
  Progress, 
  Badge, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Separator 
} from '@espice/ui';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface AnimatedPDFViewerProps {
  file: File;
  onExtractionComplete?: (result: PDFProcessingResult) => void;
  className?: string;
}

interface ExtractionStep {
  type: 'text' | 'table' | 'parameter' | 'ocr' | 'layout';
  data: any;
  timestamp: number;
  duration: number;
}

interface HighlightedElement {
  id: string;
  type: 'table' | 'parameter' | 'text-block';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  };
  data: any;
  color: string;
  animation: 'fade-in' | 'pulse' | 'slide-in' | 'none';
}

export const AnimatedPDFViewer: React.FC<AnimatedPDFViewerProps> = ({
  file,
  onExtractionComplete,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [extractionSteps, setExtractionSteps] = useState<ExtractionStep[]>([]);
  const [highlightedElements, setHighlightedElements] = useState<HighlightedElement[]>([]);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [extractionResult, setExtractionResult] = useState<PDFProcessingResult | null>(null);
  const [showHighlights, setShowHighlights] = useState(true);
  const [showExtractionPanel, setShowExtractionPanel] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1000); // ms per step
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Colors for different element types
  const elementColors = {
    table: '#3b82f6', // blue
    parameter: '#10b981', // green
    'text-block': '#f59e0b', // amber
    ocr: '#8b5cf6', // purple
    layout: '#ef4444' // red
  };

  // Load PDF document
  useEffect(() => {
    const loadPDF = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        renderPage(1, doc);
      } catch (error) {
        console.error('Failed to load PDF:', error);
      }
    };

    loadPDF();
  }, [file]);

  // Render PDF page
  const renderPage = useCallback(async (pageNum: number, doc?: pdfjsLib.PDFDocumentProxy) => {
    if (!doc && !pdfDoc) return;
    
    const document = doc || pdfDoc!;
    const page = await document.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
  }, [pdfDoc, scale]);

  // Update page when scale changes
  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage, pdfDoc);
    }
  }, [scale, currentPage, renderPage]);

  // Simulate extraction process with animations
  const startExtractionAnimation = useCallback(async () => {
    if (!pdfDoc) return;
    
    setIsPlaying(true);
    setExtractionSteps([]);
    setHighlightedElements([]);
    setCurrentStepIndex(0);
    
    const steps: ExtractionStep[] = [];
    let stepIndex = 0;
    
    // Step 1: Text extraction
    steps.push({
      type: 'text',
      data: { message: 'Extracting text content...' },
      timestamp: Date.now(),
      duration: 2000
    });
    
    setProgress({ stage: 'reading', progress: 10, message: 'Reading PDF file...' });
    await delay(1000);
    
    // Step 2: Layout analysis
    steps.push({
      type: 'layout',
      data: { message: 'Analyzing page layout...' },
      timestamp: Date.now(),
      duration: 1500
    });
    
    setProgress({ stage: 'parsing', progress: 30, message: 'Parsing PDF structure...' });
    await delay(1500);
    
    // Step 3: Table detection
    const mockTables = generateMockTables();
    steps.push({
      type: 'table',
      data: mockTables,
      timestamp: Date.now(),
      duration: 2500
    });
    
    setProgress({ stage: 'extracting', progress: 60, message: 'Detecting tables...' });
    await delay(2500);
    
    // Step 4: Parameter extraction
    const mockParameters = generateMockParameters();
    steps.push({
      type: 'parameter',
      data: mockParameters,
      timestamp: Date.now(),
      duration: 2000
    });
    
    setProgress({ stage: 'extracting', progress: 85, message: 'Extracting parameters...' });
    await delay(2000);
    
    // Step 5: OCR processing (if needed)
    if (Math.random() > 0.5) {
      steps.push({
        type: 'ocr',
        data: { message: 'Performing OCR on images...' },
        timestamp: Date.now(),
        duration: 1800
      });
      
      setProgress({ stage: 'extracting', progress: 90, message: 'Performing OCR...' });
      await delay(1800);
    }
    
    setExtractionSteps(steps);
    setProgress({ stage: 'complete', progress: 100, message: 'Processing complete' });
    
    // Create final result
    const result: PDFProcessingResult = {
      success: true,
      text: 'Extracted text content...',
      pageCount: totalPages,
      metadata: { pages: totalPages, encrypted: false, fileSize: file.size },
      processingTime: 8000,
      tables: mockTables,
      parameters: mockParameters,
      cacheKey: `mock-${Date.now()}`
    };
    
    setExtractionResult(result);
    onExtractionComplete?.(result);
    
    setIsPlaying(false);
  }, [pdfDoc, totalPages, file.size, onExtractionComplete]);

  // Play extraction animation step by step
  const playExtractionSteps = useCallback(async () => {
    if (currentStepIndex >= extractionSteps.length) {
      setCurrentStepIndex(0);
      return;
    }
    
    const step = extractionSteps[currentStepIndex];
    
    // Add highlights based on step type
    switch (step.type) {
      case 'table':
        addTableHighlights(step.data);
        break;
      case 'parameter':
        addParameterHighlights(step.data);
        break;
      case 'text':
        addTextHighlights();
        break;
      case 'layout':
        addLayoutHighlights();
        break;
      case 'ocr':
        addOCRHighlights();
        break;
    }
    
    setCurrentStepIndex(prev => prev + 1);
    
    // Auto-advance to next step
    setTimeout(() => {
      if (isPlaying) {
        playExtractionSteps();
      }
    }, animationSpeed);
  }, [extractionSteps, currentStepIndex, isPlaying, animationSpeed]);

  // Auto-play steps when extraction is complete
  useEffect(() => {
    if (extractionSteps.length > 0 && isPlaying) {
      playExtractionSteps();
    }
  }, [extractionSteps, isPlaying, playExtractionSteps]);

  // Add table highlights
  const addTableHighlights = (tables: ExtractedTable[]) => {
    const newHighlights: HighlightedElement[] = tables.map((table, index) => ({
      id: `table-${index}`,
      type: 'table',
      bounds: {
        x: 50 + (index * 20),
        y: 100 + (index * 30),
        width: 300,
        height: 150,
        page: table.pageNumber
      },
      data: table,
      color: elementColors.table,
      animation: 'slide-in'
    }));
    
    setHighlightedElements(prev => [...prev, ...newHighlights]);
  };

  // Add parameter highlights
  const addParameterHighlights = (parameters: ExtractedParameter[]) => {
    const newHighlights: HighlightedElement[] = parameters.slice(0, 5).map((param, index) => ({
      id: `param-${index}`,
      type: 'parameter',
      bounds: {
        x: 400 + (index * 10),
        y: 50 + (index * 25),
        width: 200,
        height: 20,
        page: param.pageNumber
      },
      data: param,
      color: elementColors.parameter,
      animation: 'fade-in'
    }));
    
    setHighlightedElements(prev => [...prev, ...newHighlights]);
  };

  // Add text highlights
  const addTextHighlights = () => {
    const newHighlights: HighlightedElement[] = [
      {
        id: 'text-1',
        type: 'text-block',
        bounds: { x: 50, y: 50, width: 500, height: 30, page: 1 },
        data: { text: 'Text block 1' },
        color: elementColors['text-block'],
        animation: 'fade-in'
      },
      {
        id: 'text-2',
        type: 'text-block',
        bounds: { x: 50, y: 100, width: 400, height: 25, page: 1 },
        data: { text: 'Text block 2' },
        color: elementColors['text-block'],
        animation: 'fade-in'
      }
    ];
    
    setHighlightedElements(prev => [...prev, ...newHighlights]);
  };

  // Add layout highlights
  const addLayoutHighlights = () => {
    const newHighlights: HighlightedElement[] = [
      {
        id: 'layout-1',
        type: 'text-block',
        bounds: { x: 50, y: 200, width: 600, height: 40, page: 1 },
        data: { text: 'Layout analysis area' },
        color: elementColors.layout,
        animation: 'pulse'
      }
    ];
    
    setHighlightedElements(prev => [...prev, ...newHighlights]);
  };

  // Add OCR highlights
  const addOCRHighlights = () => {
    const newHighlights: HighlightedElement[] = [
      {
        id: 'ocr-1',
        type: 'text-block',
        bounds: { x: 50, y: 300, width: 350, height: 30, page: 1 },
        data: { text: 'OCR extracted text' },
        color: elementColors.ocr,
        animation: 'slide-in'
      }
    ];
    
    setHighlightedElements(prev => [...prev, ...newHighlights]);
  };

  // Generate mock tables for demonstration
  const generateMockTables = (): ExtractedTable[] => {
    return [
      {
        id: 'table-1',
        title: 'Electrical Characteristics',
        headers: ['Parameter', 'Symbol', 'Min', 'Typ', 'Max', 'Unit'],
        rows: [
          ['Threshold Voltage', 'VTH', '0.5', '1.0', '1.5', 'V'],
          ['On-Resistance', 'RDS(on)', '0.01', '0.02', '0.03', 'Ω'],
          ['Drain Current', 'ID', '10', '15', '20', 'A']
        ],
        pageNumber: 1,
        confidence: 0.9,
        extractionMethod: 'layout',
        validationStatus: 'valid'
      },
      {
        id: 'table-2',
        title: 'Thermal Characteristics',
        headers: ['Parameter', 'Symbol', 'Value', 'Unit'],
        rows: [
          ['Junction Temperature', 'TJ', '175', '°C'],
          ['Thermal Resistance', 'RTH', '2.5', '°C/W']
        ],
        pageNumber: 1,
        confidence: 0.85,
        extractionMethod: 'layout',
        validationStatus: 'valid'
      }
    ];
  };

  // Generate mock parameters for demonstration
  const generateMockParameters = (): ExtractedParameter[] => {
    return [
      {
        id: 'param-1',
        name: 'VTH',
        value: 1.0,
        unit: 'V',
        pageNumber: 1,
        confidence: 0.9,
        dataType: 'electrical',
        validationStatus: 'valid'
      },
      {
        id: 'param-2',
        name: 'RDS(on)',
        value: 0.02,
        unit: 'Ω',
        pageNumber: 1,
        confidence: 0.85,
        dataType: 'electrical',
        validationStatus: 'valid'
      },
      {
        id: 'param-3',
        name: 'ID',
        value: 15,
        unit: 'A',
        pageNumber: 1,
        confidence: 0.8,
        dataType: 'electrical',
        validationStatus: 'valid'
      }
    ];
  };

  // Utility function for delays
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Navigation functions
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.5, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5));
  const resetZoom = () => setScale(1.5);

  // Toggle animation playback
  const togglePlayback = () => {
    if (extractionSteps.length === 0) {
      startExtractionAnimation();
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Reset extraction
  const resetExtraction = () => {
    setIsPlaying(false);
    setExtractionSteps([]);
    setHighlightedElements([]);
    setCurrentStepIndex(0);
    setProgress(null);
    setExtractionResult(null);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Control Panel */}
      <div className="flex items-center justify-between p-4 bg-background border-b">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlayback}
            disabled={!pdfDoc}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {extractionSteps.length === 0 ? 'Start Extraction' : (isPlaying ? 'Pause' : 'Play')}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetExtraction}
            disabled={extractionSteps.length === 0}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHighlights(!showHighlights)}
          >
            {showHighlights ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showHighlights ? 'Hide' : 'Show'} Highlights
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={resetZoom}>
            Reset
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExtractionPanel(!showExtractionPanel)}
          >
            {showExtractionPanel ? 'Hide' : 'Show'} Panel
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="p-4 bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{progress.message}</span>
            <span className="text-sm text-muted-foreground">{progress.stage}</span>
          </div>
          <Progress value={progress.progress} className="h-2" />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* PDF Viewer */}
        <div className="flex-1 relative overflow-auto bg-gray-100">
          <div ref={containerRef} className="relative inline-block">
            <canvas
              ref={canvasRef}
              className="block shadow-lg"
            />
            
            {/* Highlight Overlays */}
            {showHighlights && highlightedElements.map((element) => (
              <div
                key={element.id}
                className={`absolute border-2 rounded pointer-events-none ${
                  element.animation === 'fade-in' ? 'animate-fade-in' :
                  element.animation === 'pulse' ? 'animate-pulse' :
                  element.animation === 'slide-in' ? 'animate-slide-in' : ''
                }`}
                style={{
                  left: element.bounds.x,
                  top: element.bounds.y,
                  width: element.bounds.width,
                  height: element.bounds.height,
                  borderColor: element.color,
                  backgroundColor: `${element.color}20`,
                  zIndex: 10
                }}
              >
                <div
                  className="absolute -top-6 left-0 px-2 py-1 text-xs text-white rounded"
                  style={{ backgroundColor: element.color }}
                >
                  {element.type === 'table' && <Table className="h-3 w-3 inline mr-1" />}
                  {element.type === 'parameter' && <FileText className="h-3 w-3 inline mr-1" />}
                  {element.type === 'text-block' && <FileText className="h-3 w-3 inline mr-1" />}
                  {element.type}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Extraction Panel */}
        {showExtractionPanel && (
          <div className="w-80 border-l bg-background overflow-y-auto">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Extraction Results</h3>
              
              {/* Current Step */}
              {extractionSteps[currentStepIndex] && (
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Current Step: {extractionSteps[currentStepIndex].type}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {extractionSteps[currentStepIndex].data.message || 'Processing...'}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Tables */}
              {extractionResult?.tables && extractionResult.tables.length > 0 && (
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Table className="h-4 w-4 mr-2" />
                      Tables ({extractionResult.tables.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {extractionResult.tables.map((table, index) => (
                      <div key={table.id} className="p-2 border rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{table.title || `Table ${index + 1}`}</span>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(table.confidence * 100)}%
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {table.headers?.length || 0} columns, {table.rows?.length || 0} rows
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Parameters */}
              {extractionResult?.parameters && extractionResult.parameters.length > 0 && (
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Parameters ({extractionResult.parameters.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {extractionResult.parameters.slice(0, 10).map((param) => (
                      <div key={param.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="text-xs font-medium">{param.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {param.value} {param.unit}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {param.dataType}
                        </Badge>
                      </div>
                    ))}
                    {extractionResult.parameters.length > 10 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{extractionResult.parameters.length - 10} more parameters
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Statistics */}
              {extractionResult && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Processing Time:</span>
                      <span>{(extractionResult.processingTime / 1000).toFixed(2)}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tables Found:</span>
                      <span>{extractionResult.tables?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Parameters Found:</span>
                      <span>{extractionResult.parameters?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>OCR Results:</span>
                      <span>{extractionResult.ocrResults?.length || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Page Navigation */}
      <div className="flex items-center justify-center p-4 bg-background border-t">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={prevPage}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

// CSS animations
const styles = `
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slide-in {
    from { transform: translateX(-20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  .animate-fade-in {
    animation: fade-in 0.5s ease-in-out;
  }
  
  .animate-slide-in {
    animation: slide-in 0.5s ease-out;
  }
`;

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
} 