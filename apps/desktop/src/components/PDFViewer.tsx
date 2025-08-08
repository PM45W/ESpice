import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, RotateCw, Download, Fullscreen, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Input, 
  Badge, 
  Progress, 
  Alert, 
  AlertDescription 
} from '@espice/ui';

// Set up PDF.js worker - use the worker from the installed package
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

interface PDFViewerProps {
  file: File | string;
  onPageChange?: (pageNumber: number) => void;
  onLoadSuccess?: (document: any) => void;
  onLoadError?: (error: Error) => void;
  className?: string;
  showToolbar?: boolean;
  showPageNavigation?: boolean;
  initialPage?: number;
  initialScale?: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  onPageChange,
  onLoadSuccess,
  onLoadError,
  className = '',
  showToolbar = true,
  showPageNavigation = true,
  initialPage = 1,
  initialScale = 1.0
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [scale, setScale] = useState(initialScale);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle document load success
  const handleLoadSuccess = useCallback((document: any) => {
    setNumPages(document.numPages);
    setLoading(false);
    setError(null);
    onLoadSuccess?.(document);
  }, [onLoadSuccess]);

  // Handle document load error
  const handleLoadError = useCallback((error: Error) => {
    setLoading(false);
    setError(error.message);
    onLoadError?.(error);
  }, [onLoadError]);

  // Handle page change
  const handlePageChange = useCallback((newPageNumber: number) => {
    setPageNumber(newPageNumber);
    onPageChange?.(newPageNumber);
  }, [onPageChange]);

  // Navigation functions
  const goToPreviousPage = () => {
    if (pageNumber > 1) {
      handlePageChange(pageNumber - 1);
    }
  };

  const goToNextPage = () => {
    if (numPages && pageNumber < numPages) {
      handlePageChange(pageNumber + 1);
    }
  };

  // Zoom functions
  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.25));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  // Rotation function
  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Fullscreen functions
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Download function
  const downloadPDF = () => {
    if (typeof file === 'string') {
      const link = document.createElement('a');
      link.href = file;
      link.download = 'document.pdf';
      link.click();
    } else {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Reset page number when file changes
  useEffect(() => {
    setPageNumber(initialPage);
    setLoading(true);
    setError(null);
  }, [file, initialPage]);

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load PDF: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`} ref={containerRef}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            PDF Viewer
            {numPages && (
              <Badge variant="secondary">
                Page {pageNumber} of {numPages}
              </Badge>
            )}
          </CardTitle>
          
          {showToolbar && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={zoomOut}
                disabled={scale <= 0.25}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={Math.round(scale * 100)}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) / 100;
                    if (value >= 0.25 && value <= 3.0) {
                      setScale(value);
                    }
                  }}
                  className="w-16 text-center"
                  min="25"
                  max="300"
                />
                <span className="text-sm text-[hsl(var(--muted-foreground))]">%</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={zoomIn}
                disabled={scale >= 3.0}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={resetZoom}
              >
                100%
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={rotate}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPDF}
              >
                <Download className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                <Fullscreen className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        {showPageNavigation && numPages && (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={pageNumber}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1 && value <= numPages) {
                    handlePageChange(value);
                  }
                }}
                className="w-20 text-center"
                min={1}
                max={numPages}
              />
              <span className="text-sm text-[hsl(var(--muted-foreground))]">of {numPages}</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="space-y-4 w-full max-w-md">
              <Progress value={undefined} className="w-full" />
              <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
                Loading PDF document...
              </p>
            </div>
          </div>
        )}
        
        <div className="flex justify-center bg-muted/20 min-h-[600px]">
          <Document
            file={file}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={handleLoadError}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="space-y-4 w-full max-w-md">
                  <Progress value={undefined} className="w-full" />
                  <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
                    Loading PDF document...
                  </p>
                </div>
              </div>
            }
            error={
              <div className="flex items-center justify-center p-8">
                <Alert variant="destructive">
                  <AlertDescription>
                    Failed to load PDF document
                  </AlertDescription>
                </Alert>
              </div>
            }
          >
            {numPages && (
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-lg"
              />
            )}
          </Document>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFViewer; 