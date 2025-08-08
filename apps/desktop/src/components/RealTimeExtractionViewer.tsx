import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { EnhancedPDFProcessor } from '../services/enhancedPDFProcessor';
import { ParameterValidationService } from '../services/parameterValidationService';
import type { 
  PDFProcessingResult, 
  ExtractedTable, 
  ExtractedParameter,
  ProcessingProgress
} from '../types/pdf';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Table,
  FileText,
  Eye,
  EyeOff,
  Clock,
  Settings
} from 'lucide-react';
import { 
  Button, 
  Progress, 
  Badge, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Separator, 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger, 
  ScrollArea 
} from '@espice/ui';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface RealTimeExtractionViewerProps {
  file: File;
  onExtractionComplete?: (result: PDFProcessingResult) => void;
  className?: string;
}

interface HighlightedElement {
  id: string;
  type: 'table' | 'parameter' | 'text-block' | 'ocr' | 'layout';
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
  confidence: number;
}

interface ExtractionEvent {
  type: 'text-extracted' | 'table-detected' | 'parameter-found' | 'ocr-completed' | 'layout-analyzed';
  data: any;
  timestamp: number;
  page?: number;
}

export const RealTimeExtractionViewer: React.FC<RealTimeExtractionViewerProps> = ({
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [highlightedElements, setHighlightedElements] = useState<HighlightedElement[]>([]);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [extractionResult, setExtractionResult] = useState<PDFProcessingResult | null>(null);
  const [showHighlights, setShowHighlights] = useState(true);
  const [showExtractionPanel, setShowExtractionPanel] = useState(true);
  const [extractionEvents, setExtractionEvents] = useState<ExtractionEvent[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const enhancedPdfProcessor = EnhancedPDFProcessor.getInstance();
  const parameterValidator = ParameterValidationService.getInstance();

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

  // Start real-time extraction
  const startExtraction = useCallback(async () => {
    if (!pdfDoc || isProcessing) return;
    
    setIsProcessing(true);
    setHighlightedElements([]);
    setExtractionEvents([]);
    setExtractionResult(null);
    
    try {
      const result = await enhancedPdfProcessor.processPDF(
        file,
        { extractTables: true },
        (progress: ProcessingProgress) => {
          setProgress(progress);
          
          // Add extraction events based on progress
          if (progress.stage === 'extracting' && progress.progress > 30) {
            addExtractionEvent('text-extracted', { message: 'Text extraction completed' });
          }
          
          if (progress.stage === 'extracting' && progress.progress > 70) {
            addExtractionEvent('table-detected', { message: 'Table detection in progress' });
          }
        }
      );

      if (result.success) {
        // Process results and add highlights
        await processExtractionResults(result);
        setExtractionResult(result);
        onExtractionComplete?.(result);
      } else {
        throw new Error(result.error?.message || 'Extraction failed');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      addExtractionEvent('error', { message: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsProcessing(false);
      setProgress({ stage: 'complete', progress: 100, message: 'Processing complete' });
    }
  }, [pdfDoc, file, isProcessing, enhancedPdfProcessor, onExtractionComplete]);

  // Process extraction results and add highlights
  const processExtractionResults = useCallback(async (result: PDFProcessingResult) => {
    const newHighlights: HighlightedElement[] = [];
    
    // Add table highlights
    if (result.tables) {
      result.tables.forEach((table, index) => {
        newHighlights.push({
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
          animation: 'slide-in',
          confidence: table.confidence
        });
        
        addExtractionEvent('table-detected', table);
      });
    }
    
    // Add parameter highlights
    if (result.parameters) {
      const validatedParams = parameterValidator.validateParameters(result.parameters);
      
      validatedParams.forEach((validation, index) => {
        const param = validation.enhancedParameter;
        newHighlights.push({
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
          animation: 'fade-in',
          confidence: validation.confidence
        });
        
        addExtractionEvent('parameter-found', param);
      });
    }
    
    // Add OCR highlights
    if (result.ocrResults) {
      result.ocrResults.forEach((ocr, index) => {
        if (ocr.confidence > 0.7) {
          newHighlights.push({
            id: `ocr-${index}`,
            type: 'ocr',
            bounds: {
              x: 50,
              y: 300 + (index * 30),
              width: 350,
              height: 30,
              page: ocr.pageNum
            },
            data: ocr,
            color: elementColors.ocr,
            animation: 'slide-in',
            confidence: ocr.confidence
          });
          
          addExtractionEvent('ocr-completed', ocr);
        }
      });
    }
    
    // Add layout highlights
    if (result.layoutInfo) {
      result.layoutInfo.pages.forEach((page, index) => {
        newHighlights.push({
          id: `layout-${index}`,
          type: 'layout',
          bounds: {
            x: 50,
            y: 200 + (index * 40),
            width: 600,
            height: 40,
            page: page.pageNum
          },
          data: page,
          color: elementColors.layout,
          animation: 'pulse',
          confidence: 0.8
        });
        
        addExtractionEvent('layout-analyzed', page);
      });
    }
    
    // Add highlights with animation delay
    newHighlights.forEach((highlight, index) => {
      setTimeout(() => {
        setHighlightedElements(prev => [...prev, highlight]);
      }, index * 500); // Fixed 500ms delay between highlights
    });
  }, [elementColors, parameterValidator]);

  // Add extraction event
  const addExtractionEvent = useCallback((type: ExtractionEvent['type'], data: any) => {
    const event: ExtractionEvent = {
      type,
      data,
      timestamp: Date.now()
    };
    
    setExtractionEvents(prev => [...prev, event]);
  }, []);

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

  // Reset extraction
  const resetExtraction = () => {
    setIsProcessing(false);
    setHighlightedElements([]);
    setExtractionEvents([]);
    setProgress(null);
    setExtractionResult(null);
  };

  // Get status icon
  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'text-extracted': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'table-detected': return <Table className="h-4 w-4 text-green-500" />;
      case 'parameter-found': return <FileText className="h-4 w-4 text-emerald-500" />;
      case 'ocr-completed': return <Eye className="h-4 w-4 text-purple-500" />;
      case 'layout-analyzed': return <Settings className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Control Panel */}
      <div className="flex items-center justify-between p-4 bg-background border-b">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={startExtraction}
            disabled={!pdfDoc || isProcessing}
          >
            {isProcessing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isProcessing ? 'Processing...' : 'Start Extraction'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetExtraction}
            disabled={isProcessing}
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
            <span className="text-sm text-muted-foreground capitalize">{progress.stage}</span>
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
                  className="absolute -top-6 left-0 px-2 py-1 text-xs text-white rounded flex items-center space-x-1"
                  style={{ backgroundColor: element.color }}
                >
                  {element.type === 'table' && <Table className="h-3 w-3" />}
                  {element.type === 'parameter' && <FileText className="h-3 w-3" />}
                  {element.type === 'text-block' && <FileText className="h-3 w-3" />}
                  {element.type === 'ocr' && <Eye className="h-3 w-3" />}
                  {element.type === 'layout' && <Settings className="h-3 w-3" />}
                  <span>{element.type}</span>
                  <Badge variant="secondary" className="text-xs ml-1">
                    {Math.round(element.confidence * 100)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Extraction Panel */}
        {showExtractionPanel && (
          <div className="w-80 border-l bg-background overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <div className="p-4 border-b">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="events">Events</TabsTrigger>
                  <TabsTrigger value="results">Results</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="p-4 space-y-4">
                {/* Real-time Statistics */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Real-time Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Tables Detected:</span>
                      <span>{highlightedElements.filter(e => e.type === 'table').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Parameters Found:</span>
                      <span>{highlightedElements.filter(e => e.type === 'parameter').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>OCR Results:</span>
                      <span>{highlightedElements.filter(e => e.type === 'ocr').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Layout Areas:</span>
                      <span>{highlightedElements.filter(e => e.type === 'layout').length}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total Elements:</span>
                      <span>{highlightedElements.length}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Processing Status */}
                {isProcessing && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Processing Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-sm">Extracting data...</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="events" className="p-4">
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {extractionEvents.map((event, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex items-start space-x-2">
                          {getStatusIcon(event.type)}
                          <div className="flex-1">
                            <div className="text-sm font-medium capitalize">
                              {event.type.replace('-', ' ')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {event.data.message || event.data.name || JSON.stringify(event.data).slice(0, 50)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {extractionEvents.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No extraction events yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="results" className="p-4">
                <ScrollArea className="h-96">
                  {extractionResult ? (
                    <div className="space-y-4">
                      {/* Tables */}
                      {extractionResult.tables && extractionResult.tables.length > 0 && (
                        <Card>
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
                      {extractionResult.parameters && extractionResult.parameters.length > 0 && (
                        <Card>
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
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Final Statistics</CardTitle>
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
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No extraction results yet
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
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