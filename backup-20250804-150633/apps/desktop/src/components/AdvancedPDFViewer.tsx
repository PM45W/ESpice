import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';
import type { PDFViewerProps, PDFRegion, PDFViewerState } from '../types/pdf';

const AdvancedPDFViewer: React.FC<PDFViewerProps> = ({
  file,
  regions = [],
  onRegionSelect,
  onPageChange,
  showOverlays = true,
  interactive = true,
  className = ''
}) => {
  const [state, setState] = useState<PDFViewerState>({
    currentPage: 1,
    totalPages: 0,
    scale: 1.0,
    regions: regions,
    showOverlays: showOverlays,
    loading: true,
    error: undefined
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const currentPageRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF document
  useEffect(() => {
    loadPDF();
  }, [file]);

  // Update regions when prop changes
  useEffect(() => {
    setState(prev => ({ ...prev, regions }));
  }, [regions]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const loadPDF = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: undefined }));
      
      // Dynamic import of pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

      let pdfSource: string | ArrayBuffer;
      
      if (typeof file === 'string') {
        pdfSource = file;
      } else {
        pdfSource = await file.arrayBuffer();
      }

      const pdf = await pdfjsLib.getDocument(pdfSource).promise;
      pdfDocRef.current = pdf;
      
      setState(prev => ({ 
        ...prev, 
        totalPages: pdf.numPages,
        loading: false 
      }));

      // Load first page
      await loadPage(1);
    } catch (error) {
      console.error('Failed to load PDF:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to load PDF file' 
      }));
    }
  };

  const loadPage = async (pageNumber: number) => {
    if (!pdfDocRef.current) return;

    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const page = await pdfDocRef.current.getPage(pageNumber);
      currentPageRef.current = page;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const container = containerRef.current;
      if (!container) return;

      // Calculate scale to fit page in container
      const containerWidth = container.clientWidth - 40; // Padding
      const containerHeight = container.clientHeight - 40;
      
      const pageWidth = page.getViewport({ scale: 1 }).width;
      const pageHeight = page.getViewport({ scale: 1 }).height;
      
      const scaleX = containerWidth / pageWidth;
      const scaleY = containerHeight / pageHeight;
      const scale = Math.min(scaleX, scaleY, state.scale);

      const viewport = page.getViewport({ scale });
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (renderTaskRef.current) {
        try { 
          renderTaskRef.current.cancel(); 
        } catch (cancelError) {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null;
      }
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      
      // Wait for the render task to complete
      await renderTask.promise;
      
      // Only update state if this is still the current task
      if (renderTaskRef.current === renderTask) {
        renderTaskRef.current = null;
        
        setState(prev => ({ 
          ...prev, 
          currentPage: pageNumber,
          loading: false 
        }));

        onPageChange?.(pageNumber);
      }
    } catch (error) {
      // Check if this is a cancellation error
      if (error && typeof error === 'object' && 'name' in error && error.name === 'RenderingCancelledException') {
        // This is expected when switching pages quickly, don't show as error
        return;
      }
      
      console.error('Failed to load page:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to load page' 
      }));
    }
  };

  const changePage = useCallback((delta: number) => {
    const newPage = state.currentPage + delta;
    if (newPage >= 1 && newPage <= state.totalPages) {
      loadPage(newPage);
    }
  }, [state.currentPage, state.totalPages]);

  const changeScale = useCallback((delta: number) => {
    const newScale = Math.max(0.5, Math.min(3.0, state.scale + delta));
    setState(prev => ({ ...prev, scale: newScale }));
    loadPage(state.currentPage); // Reload current page with new scale
  }, [state.scale, state.currentPage]);

  const toggleOverlays = useCallback(() => {
    setState(prev => ({ ...prev, showOverlays: !prev.showOverlays }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const handleRegionClick = useCallback((region: PDFRegion) => {
    if (!interactive) return;
    
    setState(prev => ({ ...prev, selectedRegion: region }));
    onRegionSelect?.(region);
  }, [interactive, onRegionSelect]);

  const getRegionColor = (type: PDFRegion['type'], confidence: number) => {
    const alpha = Math.max(0.3, confidence);
    
    switch (type) {
      case 'table':
        return `rgba(59, 130, 246, ${alpha})`; // Blue
      case 'graph':
        return `rgba(16, 185, 129, ${alpha})`; // Green
      case 'parameter_section':
        return `rgba(245, 158, 11, ${alpha})`; // Orange
      case 'text_block':
        return `rgba(139, 92, 246, ${alpha})`; // Purple
      case 'figure':
        return `rgba(236, 72, 153, ${alpha})`; // Pink
      case 'header':
        return `rgba(107, 114, 128, ${alpha})`; // Gray
      case 'footer':
        return `rgba(107, 114, 128, ${alpha})`; // Gray
      default:
        return `rgba(156, 163, 175, ${alpha})`; // Light gray
    }
  };

  const renderOverlays = () => {
    if (!state.showOverlays || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    const canvasScaleX = canvas.width / canvasRect.width;
    const canvasScaleY = canvas.height / canvasRect.height;

    return state.regions
      .filter(region => region.boundingBox.page === state.currentPage)
      .map(region => {
        const isSelected = state.selectedRegion?.id === region.id;
        const color = getRegionColor(region.type, region.confidence);
        
        // Convert PDF coordinates to screen coordinates
        const x = region.boundingBox.x / canvasScaleX;
        const y = region.boundingBox.y / canvasScaleY;
        const width = region.boundingBox.width / canvasScaleX;
        const height = region.boundingBox.height / canvasScaleY;
        
        return (
          <div
            key={region.id}
            className={`region-overlay ${isSelected ? 'selected' : ''}`}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: `${width}px`,
              height: `${height}px`,
              border: `2px solid ${color}`,
              backgroundColor: `${color}20`,
              cursor: interactive ? 'pointer' : 'default',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
              zIndex: isSelected ? 10 : 5
            }}
            onClick={() => handleRegionClick(region)}
            title={`${region.label} (${Math.round(region.confidence * 100)}% confidence)`}
          >
            <div
              className="region-label"
              style={{
                position: 'absolute',
                top: '-24px',
                left: '0',
                background: color,
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                zIndex: 15
              }}
            >
              {region.label}
            </div>
          </div>
        );
      });
  };

  if (state.error) {
    return (
      <div className={`pdf-viewer error ${className}`}>
        <div className="error-message">
          <p>{state.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`advanced-pdf-viewer ${className} ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Toolbar */}
      <div className="pdf-toolbar">
        <div className="toolbar-left">
          <button
            onClick={() => changePage(-1)}
            disabled={state.currentPage <= 1}
            className="toolbar-button"
            title="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          
          <span className="page-info">
            {state.currentPage} / {state.totalPages}
          </span>
          
          <button
            onClick={() => changePage(1)}
            disabled={state.currentPage >= state.totalPages}
            className="toolbar-button"
            title="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="toolbar-center">
          <button
            onClick={() => changeScale(-0.2)}
            disabled={state.scale <= 0.5}
            className="toolbar-button"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          
          <span className="scale-info">
            {Math.round(state.scale * 100)}%
          </span>
          
          <button
            onClick={() => changeScale(0.2)}
            disabled={state.scale >= 3.0}
            className="toolbar-button"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        <div className="toolbar-right">
          <button
            onClick={toggleOverlays}
            className={`toolbar-button ${state.showOverlays ? 'active' : ''}`}
            title={state.showOverlays ? 'Hide overlays' : 'Show overlays'}
          >
            {state.showOverlays ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          
          <button
            onClick={() => loadPage(state.currentPage)}
            className="toolbar-button"
            title="Refresh page"
          >
            <RotateCw size={16} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="toolbar-button"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div className="pdf-container" ref={containerRef}>
        {state.loading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <span>Loading page {state.currentPage}...</span>
          </div>
        )}
        
        <div className="canvas-container" style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            className="pdf-canvas"
            style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
          />
          {renderOverlays()}
        </div>
      </div>

      {/* Region Info Panel */}
      {state.selectedRegion && (
        <div className="region-info-panel">
          <h4>{state.selectedRegion.label}</h4>
          <div className="region-details">
            <p><strong>Type:</strong> {state.selectedRegion.type}</p>
            <p><strong>Confidence:</strong> {Math.round(state.selectedRegion.confidence * 100)}%</p>
            {state.selectedRegion.content && (
              <p><strong>Content:</strong> {state.selectedRegion.content.substring(0, 100)}...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedPDFViewer; 