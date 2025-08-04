import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Layout, FileText, Save, Undo, Redo, Trash2, MousePointer, Square, X } from 'lucide-react';
import { AnnotationBox, AnnotationToolState, ExportOptions, AnnotationToolConfig } from '../types/pdf';
// CSS moved to unified index.css

// Default configuration for annotation tool
const DEFAULT_CONFIG: AnnotationToolConfig = {
  defaultColors: {
    table: '#3B82F6',
    graph: '#10B981',
    parameter_section: '#F59E0B',
    text_block: '#8B5CF6',
    figure: '#EC4899',
    header: '#6B7280',
    footer: '#6B7280',
    custom: '#9CA3AF'
  },
  defaultLabels: [
    'Table', 'Graph', 'Parameters', 'Text', 'Figure', 'Header', 'Footer', 'Custom'
  ],
  keyboardShortcuts: {
    'v': 'select',
    'b': 'draw',
    'e': 'edit',
    'd': 'delete',
    'l': 'label',
    'Delete': 'delete',
    'Backspace': 'delete',
    'Ctrl+z': 'undo',
    'Ctrl+y': 'redo',
    'Ctrl+s': 'save',
    'Escape': 'select'
  },
  exportFormats: ['png', 'jpg', 'svg'],
  maxBoxesPerPage: 100,
  minBoxSize: { width: 10, height: 10 },
  maxBoxSize: { width: 2000, height: 2000 }
};

interface ManualAnnotationToolProps {
  file: any;
  initialBoxes?: AnnotationBox[];
  onBoxesChange?: (boxes: AnnotationBox[]) => void;
  onExport?: (box: AnnotationBox, options: ExportOptions) => void;
  onQueueExtraction?: (box: AnnotationBox) => void;
  className?: string;
  onBack?: () => void;
  onNext?: () => void;
}

const ManualAnnotationTool: React.FC<ManualAnnotationToolProps> = ({
  file,
  initialBoxes = [],
  onBoxesChange,
  onExport,
  onQueueExtraction,
  className = '',
  onBack,
  onNext
}) => {
  // Core state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'double'>('single');
  const [zoom, setZoom] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showLeftToggle, setShowLeftToggle] = useState(false);
  const [showRightToggle, setShowRightToggle] = useState(false);

  // Drawing state
  const [drawingState, setDrawingState] = useState({
    isDrawing: false,
    startPoint: null as { x: number; y: number } | null,
    currentPoint: null as { x: number; y: number } | null,
    drawingBox: null as AnnotationBox | null,
    mode: 'select' as 'select' | 'draw' | 'delete',
    selectedBoxId: null as string | null,
    hoveredBoxId: null as string | null
  });

  // Tool state
  const [selectedTool, setSelectedTool] = useState<AnnotationToolState['selectedTool']>('select');
  const [selectedType, setSelectedType] = useState<AnnotationBox['type']>('parameter_section');
  const [selectedLabel, setSelectedLabel] = useState<string>('Parameters');
  const [showLabelSelector, setShowLabelSelector] = useState(false);

  // Annotation state
  const [boxes, setBoxes] = useState<AnnotationBox[]>(initialBoxes);
  const [history, setHistory] = useState<AnnotationBox[][]>([initialBoxes]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef2 = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const currentPageRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  // Initialize overlay canvas
  useEffect(() => {
    const overlayCanvas = overlayCanvasRef.current;
    if (overlayCanvas) {
      overlayContextRef.current = overlayCanvas.getContext('2d');
    }
  }, []);

  // Update overlay canvas size when main canvas changes
  useEffect(() => {
    const overlayCanvas = overlayCanvasRef.current;
    const mainCanvas = canvasRef.current;
    if (overlayCanvas && mainCanvas) {
      overlayCanvas.width = mainCanvas.width;
      overlayCanvas.height = mainCanvas.height;
      overlayCanvas.style.width = mainCanvas.style.width;
      overlayCanvas.style.height = mainCanvas.style.height;
    }
  }, [currentPage, viewMode, zoom]);

  // Clear overlay canvas
  const clearOverlay = useCallback(() => {
    const ctx = overlayContextRef.current;
    const canvas = overlayCanvasRef.current;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Draw current box on overlay
  const drawCurrentBox = useCallback(() => {
    const ctx = overlayContextRef.current;
    if (!ctx || !drawingState.drawingBox || !drawingState.startPoint || !drawingState.currentPoint) {
      return;
    }

    clearOverlay();

    const start = drawingState.startPoint;
    const current = drawingState.currentPoint;
    
    // Calculate box dimensions
    const x = Math.min(start.x, current.x);
    const y = Math.min(start.y, current.y);
    const width = Math.abs(current.x - start.x);
    const height = Math.abs(current.y - start.y);

    // Draw semi-transparent fill
    ctx.fillStyle = `${DEFAULT_CONFIG.defaultColors[drawingState.drawingBox.type]}20`;
    ctx.fillRect(x, y, width, height);

    // Draw border
    ctx.strokeStyle = DEFAULT_CONFIG.defaultColors[drawingState.drawingBox.type];
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);

    // Draw corner handles
    const handleSize = 6;
    ctx.fillStyle = DEFAULT_CONFIG.defaultColors[drawingState.drawingBox.type];
    ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
    ctx.fillRect(x + width - handleSize/2, y - handleSize/2, handleSize, handleSize);
    ctx.fillRect(x - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
    ctx.fillRect(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
  }, [drawingState, clearOverlay]);

  // Get canvas coordinates with proper scaling
  const getCanvasCoordinates = useCallback((event: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    return { x, y };
  }, []);

  // Check if point is within canvas boundaries
  const isPointInCanvas = useCallback((point: { x: number; y: number }): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    return point.x >= 0 && point.x <= canvas.width && 
           point.y >= 0 && point.y <= canvas.height;
  }, []);

  // Find box at point
  const findBoxAtPoint = useCallback((point: { x: number; y: number }): AnnotationBox | null => {
    return boxes.find(box => {
      if (box.boundingBox.page !== currentPage) return false;
      const { x, y, width, height } = box.boundingBox;
      return point.x >= x && point.x <= x + width &&
             point.y >= y && point.y <= y + height;
    }) || null;
  }, [boxes, currentPage]);

  // Handle mouse down
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const coords = getCanvasCoordinates(event);
    
    if (!isPointInCanvas(coords)) {
      return;
    }

    if (selectedTool === 'draw') {
      // Start drawing
      const newBox: AnnotationBox = {
        id: `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: selectedType as any,
        label: selectedLabel,
        confidence: 1.0,
        boundingBox: {
          x: coords.x,
          y: coords.y,
          width: 0,
          height: 0,
          page: currentPage
        },
        color: DEFAULT_CONFIG.defaultColors[selectedType],
        isSelected: false,
        isEditing: false
      };

      setDrawingState(prev => ({
        ...prev,
        isDrawing: true,
        startPoint: coords,
        currentPoint: coords,
        drawingBox: newBox,
        mode: 'draw'
      }));
    } else if (selectedTool === 'delete') {
      // Delete box
      const clickedBox = findBoxAtPoint(coords);
      if (clickedBox) {
        deleteBox(clickedBox.id);
      }
    } else if (selectedTool === 'select') {
      // Select box
      const clickedBox = findBoxAtPoint(coords);
      setDrawingState(prev => ({
        ...prev,
        selectedBoxId: clickedBox?.id || null
      }));
      
      // Update boxes selection state
      setBoxes(prev => prev.map(box => ({
        ...box,
        isSelected: box.id === clickedBox?.id
      })));
    }
  }, [selectedTool, selectedType, selectedLabel, currentPage, getCanvasCoordinates, isPointInCanvas, findBoxAtPoint]);

  // Handle mouse move
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const coords = getCanvasCoordinates(event);
    
    // Update coordinate display
    const coordDisplay = document.getElementById('coordinate-display');
    if (coordDisplay) {
      coordDisplay.textContent = `Mouse: (${Math.round(coords.x)}, ${Math.round(coords.y)})`;
    }

    if (drawingState.isDrawing && drawingState.mode === 'draw') {
      // Update drawing box
      setDrawingState(prev => ({
        ...prev,
        currentPoint: coords
      }));
      
      // Draw current box on overlay
      requestAnimationFrame(drawCurrentBox);
    } else {
      // Handle hover effects
      const hoveredBox = findBoxAtPoint(coords);
      setDrawingState(prev => ({
        ...prev,
        hoveredBoxId: hoveredBox?.id || null
      }));
    }
  }, [drawingState, getCanvasCoordinates, drawCurrentBox, findBoxAtPoint]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (drawingState.isDrawing && drawingState.drawingBox && drawingState.startPoint && drawingState.currentPoint) {
      const start = drawingState.startPoint;
      const current = drawingState.currentPoint;
      
      // Calculate final box dimensions
      const x = Math.min(start.x, current.x);
      const y = Math.min(start.y, current.y);
      const width = Math.abs(current.x - start.x);
      const height = Math.abs(current.y - start.y);

      // Check minimum size
      if (width >= DEFAULT_CONFIG.minBoxSize.width && height >= DEFAULT_CONFIG.minBoxSize.height) {
        const finalBox: AnnotationBox = {
          ...drawingState.drawingBox,
          boundingBox: {
            x,
            y,
            width,
            height,
            page: currentPage
          }
        };

        addBox(finalBox);
      }

      // Clear drawing state
      setDrawingState(prev => ({
        ...prev,
        isDrawing: false,
        startPoint: null,
        currentPoint: null,
        drawingBox: null,
        mode: 'select'
      }));

      // Clear overlay
      clearOverlay();
    }
  }, [drawingState, currentPage, clearOverlay]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (drawingState.isDrawing) {
      // Cancel drawing if mouse leaves canvas
      setDrawingState(prev => ({
        ...prev,
        isDrawing: false,
        startPoint: null,
        currentPoint: null,
        drawingBox: null,
        mode: 'select'
      }));
      clearOverlay();
    }
  }, [drawingState.isDrawing, clearOverlay]);

  // Set selected tool
  const setSelectedToolHandler = useCallback((tool: AnnotationToolState['selectedTool']) => {
    if (tool === 'draw') {
      setShowLabelSelector(true);
    } else {
      setShowLabelSelector(false);
      setSelectedTool(tool);
      setDrawingState(prev => ({
        ...prev,
        mode: tool === 'delete' ? 'delete' : 'select'
      }));
    }
  }, []);

  // Select label and type
  const selectLabelAndType = useCallback((type: string, label: string) => {
    setSelectedType(type as AnnotationBox['type']);
    setSelectedLabel(label);
    setShowLabelSelector(false);
    setSelectedToolHandler('draw');
    setDrawingState(prev => ({
      ...prev,
      mode: 'draw'
    }));
  }, []);

  // Add box to state
  const addBox = useCallback((box: AnnotationBox) => {
    const newBoxes = [...boxes, box];
    setBoxes(newBoxes);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newBoxes]);
    setHistoryIndex(prev => prev + 1);

    if (onBoxesChange) {
      onBoxesChange(newBoxes);
    }
  }, [boxes, historyIndex, onBoxesChange]);

  // Delete box
  const deleteBox = useCallback((boxId: string) => {
    const updatedBoxes = boxes.filter(box => box.id !== boxId);
    setBoxes(updatedBoxes);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), updatedBoxes]);
    setHistoryIndex(prev => prev + 1);

    if (onBoxesChange) {
      onBoxesChange(updatedBoxes);
    }
  }, [boxes, historyIndex, onBoxesChange]);

  // Render existing boxes
  const renderBoxes = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render PDF content (this should be handled by loadPage)
    
    // Render boxes
    boxes.forEach(box => {
      if (box.boundingBox.page === currentPage) {
        const { x, y, width, height } = box.boundingBox;
        const isSelected = box.id === drawingState.selectedBoxId;
        const isHovered = box.id === drawingState.hoveredBoxId;

        // Draw fill
        ctx.fillStyle = `${box.color}20`;
        ctx.fillRect(x, y, width, height);

        // Draw border
        ctx.strokeStyle = box.color;
        ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
        ctx.strokeRect(x, y, width, height);

        // Draw label
        ctx.fillStyle = box.color;
        ctx.font = '12px Arial';
        ctx.fillText(box.label, x + 5, y + 15);

        // Draw selection handles if selected
        if (isSelected) {
          const handleSize = 6;
          ctx.fillStyle = box.color;
          ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
          ctx.fillRect(x + width - handleSize/2, y - handleSize/2, handleSize, handleSize);
          ctx.fillRect(x - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
          ctx.fillRect(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
        }
      }
    });
  }, [boxes, currentPage, drawingState.selectedBoxId, drawingState.hoveredBoxId]);

  // Render boxes when state changes
  useEffect(() => {
    renderBoxes();
  }, [renderBoxes]);

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Reload current page when window is resized to adjust to new container size
      if (currentPage > 0) {
        setTimeout(() => loadPage(currentPage, viewMode), 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentPage, viewMode]);

  // Handle view mode changes
  useEffect(() => {
    // Reload current page when view mode changes
    if (currentPage > 0 && pdfDocRef.current) {
      loadPage(currentPage, viewMode);
    }
  }, [viewMode]);

  // Edge detection for page turning
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      setMousePosition({ x, y });

      // Edge detection (50px from edges)
      const edgeThreshold = 50;
      const isNearLeftEdge = x <= edgeThreshold;
      const isNearRightEdge = x >= rect.width - edgeThreshold;

      setShowLeftToggle(isNearLeftEdge && currentPage > 1);
      setShowRightToggle(isNearRightEdge && currentPage < totalPages);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, [currentPage, totalPages]);

  // Load PDF document
  useEffect(() => {
    loadPDF();
  }, [file]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const ctrlKey = event.ctrlKey || event.metaKey;
      
      if (ctrlKey && key === 'z') {
        event.preventDefault();
        undo();
      } else if (ctrlKey && key === 'y') {
        event.preventDefault();
        redo();
      } else if (ctrlKey && key === 's') {
        event.preventDefault();
        saveAnnotations();
      } else if (key === 'escape') {
        if (showLabelSelector) {
          setShowLabelSelector(false);
        } else {
          setSelectedToolHandler('select');
          setDrawingState(prev => ({
            ...prev,
            mode: 'select',
            isDrawing: false,
            startPoint: null,
            currentPoint: null
          }));
        }
      } else if (key === 'arrowleft' && currentPage > 1) {
        event.preventDefault();
        changePage(-1);
      } else if (key === 'arrowright' && currentPage < totalPages) {
        event.preventDefault();
        changePage(1);
      } else if (key === '=' || key === '+') {
        event.preventDefault();
        setZoom(Math.min(3.0, zoom + 0.2));
        setTimeout(() => loadPage(currentPage, viewMode), 100);
      } else if (key === '-') {
        event.preventDefault();
        setZoom(Math.max(0.5, zoom - 0.2));
        setTimeout(() => loadPage(currentPage, viewMode), 100);
      } else if (key === '0') {
        event.preventDefault();
        setZoom(1.0);
        setTimeout(() => loadPage(currentPage, viewMode), 100);
      } else if (key === 'f11') {
        event.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      } else if (DEFAULT_CONFIG.keyboardShortcuts[key]) {
        event.preventDefault();
        setSelectedToolHandler(DEFAULT_CONFIG.keyboardShortcuts[key] as any);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, showLabelSelector, viewMode, zoom]);

  const loadPDF = async () => {
    try {
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
      setTotalPages(pdf.numPages);
      await loadPage(1, viewMode);
    } catch (error) {
      console.error('Failed to load PDF:', error);
    }
  };

  const loadPage = async (pageNumber: number, forceViewMode?: 'single' | 'double') => {
    if (!pdfDocRef.current) return;

    const targetViewMode = forceViewMode || viewMode;
    const pdfjsLib = await import('pdfjs-dist');

    try {
      if (targetViewMode === 'single') {
        // Single page view
        const page = await pdfDocRef.current.getPage(pageNumber);
        currentPageRef.current = page;
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const container = containerRef.current;
        if (!container) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const viewport = page.getViewport({ scale: 1 });
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        const fitScale = Math.min(scaleX, scaleY);
        
        const minScale = 0.5;
        const maxScale = 3.0;
        const scale = Math.max(minScale, Math.min(maxScale, fitScale * zoom));
        const finalViewport = page.getViewport({ scale });
        canvas.width = finalViewport.width * devicePixelRatio;
        canvas.height = finalViewport.height * devicePixelRatio;
        canvas.style.width = `${finalViewport.width}px`;
        canvas.style.height = `${finalViewport.height}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.scale(devicePixelRatio, devicePixelRatio);

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        renderTaskRef.current = page.render({
          canvasContext: ctx,
          viewport: finalViewport
        });

        await renderTaskRef.current.promise;
        setCurrentPage(pageNumber);
      } else {
        // Double page view
        const page1 = await pdfDocRef.current.getPage(pageNumber);
        const page2 = pageNumber + 1 <= totalPages ? await pdfDocRef.current.getPage(pageNumber + 1) : null;
        
        const canvas1 = canvasRef.current;
        const canvas2 = canvasRef2.current;
        if (!canvas1 || !canvas2) return;

        const container = containerRef.current;
        if (!container) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate scales for both pages
        const viewport1 = page1.getViewport({ scale: 1 });
        const scaleX1 = containerWidth / (viewport1.width * 2 + 20); // 20px gap between pages
        const scaleY1 = containerHeight / viewport1.height;
        const fitScale1 = Math.min(scaleX1, scaleY1);
        
        const minScale = 0.5;
        const maxScale = 3.0;
        const scale1 = Math.max(minScale, Math.min(maxScale, fitScale1 * zoom));
        const finalViewport1 = page1.getViewport({ scale: scale1 });
        canvas1.width = finalViewport1.width * devicePixelRatio;
        canvas1.height = finalViewport1.height * devicePixelRatio;
        canvas1.style.width = `${finalViewport1.width}px`;
        canvas1.style.height = `${finalViewport1.height}px`;

        const ctx1 = canvas1.getContext('2d');
        if (!ctx1) return;

        ctx1.scale(devicePixelRatio, devicePixelRatio);

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        renderTaskRef.current = page1.render({
          canvasContext: ctx1,
          viewport: finalViewport1
        });

        await renderTaskRef.current.promise;

        if (page2) {
          const viewport2 = page2.getViewport({ scale: 1 });
          const scaleX2 = containerWidth / (viewport2.width * 2 + 20);
          const scaleY2 = containerHeight / viewport2.height;
          const fitScale2 = Math.min(scaleX2, scaleY2);
          const scale2 = Math.max(minScale, Math.min(maxScale, fitScale2 * zoom));
          const finalViewport2 = page2.getViewport({ scale: scale2 });
          canvas2.width = finalViewport2.width * devicePixelRatio;
          canvas2.height = finalViewport2.height * devicePixelRatio;
          canvas2.style.width = `${finalViewport2.width}px`;
          canvas2.style.height = `${finalViewport2.height}px`;

          const ctx2 = canvas2.getContext('2d');
          if (!ctx2) return;

          ctx2.scale(devicePixelRatio, devicePixelRatio);

          const renderTask2 = page2.render({
            canvasContext: ctx2,
            viewport: finalViewport2
          });

          await renderTask2.promise;
        }

        setCurrentPage(pageNumber);
      }
    } catch (error) {
      console.error('Failed to load page:', error);
    }
  };

  const changePage = (delta: number) => {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
      loadPage(newPage, viewMode);
    }
  };

  const undo = () => {
    setHistoryIndex(prev => {
      if (prev > 0) {
        const newIndex = prev - 1;
        setBoxes(history[newIndex]);
        return newIndex;
      }
      return prev;
    });
  };

  const redo = () => {
    setHistoryIndex(prev => {
      if (prev < history.length - 1) {
        const newIndex = prev + 1;
        setBoxes(history[newIndex]);
        return newIndex;
      }
      return prev;
    });
  };

  const saveAnnotations = () => {
    localStorage.setItem('espace_annotations', JSON.stringify(boxes));
    console.log('Annotations saved');
  };

  const exportBoxAsImage = async (box: AnnotationBox, options: ExportOptions) => {
    try {
      console.log(`Simulating export for box: ${box.label} (ID: ${box.id}) with options:`, options);
      const mockBlob = new Blob([`Mock export for box: ${box.label} (ID: ${box.id})`], { type: 'image/png' });
      const url = URL.createObjectURL(mockBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${box.label}_${box.id}.${options.format}`;
      a.click();
      URL.revokeObjectURL(url);

      onExport?.(box, options);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const queueExtraction = (box: AnnotationBox) => {
    console.log(`Simulating queue extraction for box: ${box.label} (ID: ${box.id})`);
    onQueueExtraction?.(box);
  };

  // Label selector modal
  const renderLabelSelector = () => {
    if (!showLabelSelector) return null;

    return (
      <div className="label-selector-overlay">
        <div className="label-selector">
          <h3>Select Label Type</h3>
          <div className="label-options">
            {DEFAULT_CONFIG.defaultLabels.map((label, index) => {
              const type = Object.keys(DEFAULT_CONFIG.defaultColors)[index] as keyof typeof DEFAULT_CONFIG.defaultColors || 'custom';
              return (
                <button
                  key={type}
                  className="label-option"
                  onClick={() => selectLabelAndType(type, label)}
                  style={{
                    border: `2px solid ${DEFAULT_CONFIG.defaultColors[type]}`,
                    backgroundColor: `${DEFAULT_CONFIG.defaultColors[type]}20`
                  }}
                >
                  <div 
                    className="color-preview"
                    style={{ backgroundColor: DEFAULT_CONFIG.defaultColors[type] }}
                  />
                  {label}
                </button>
              );
            })}
          </div>
          <button 
            className="cancel-btn"
            onClick={() => setShowLabelSelector(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`manual-annotation-tool ${className}`}>
      {/* Toolbar */}
      <div className="annotation-toolbar">
        {/* Left Section */}
        <div className="toolbar-left">
          {/* Workflow Navigation */}
          <div className="tool-group">
            <button
              className="tool-btn workflow-btn"
              onClick={() => {
                if (onBack) {
                  onBack();
                } else {
                  console.log('Back button clicked - no handler provided');
                }
              }}
              title="Back to Previous Step"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>

          {/* Drawing Tools */}
          <div className="tool-group">
            <button
              className={`tool-btn ${selectedTool === 'select' ? 'active' : ''}`}
              onClick={() => setSelectedToolHandler('select')}
              title="Select Tool (V)"
            >
              <MousePointer size={16} />
            </button>
            <button
              className={`tool-btn ${selectedTool === 'draw' ? 'active' : ''}`}
              onClick={() => setSelectedToolHandler('draw')}
              title="Draw Box (B)"
            >
              <Square size={16} />
            </button>
            <button
              className={`tool-btn ${selectedTool === 'delete' ? 'active' : ''}`}
              onClick={() => setSelectedToolHandler('delete')}
              title="Delete Tool (D)"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Current Label Display */}
          {selectedTool === 'draw' && !showLabelSelector && (
            <div className="tool-group">
              <div className="current-label">
                <div 
                  className="label-color-preview" 
                  style={{ backgroundColor: DEFAULT_CONFIG.defaultColors[selectedType] }}
                />
                <span>{selectedLabel}</span>
                <button
                  className="change-label-btn"
                  onClick={() => setShowLabelSelector(true)}
                  title="Change Label"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Center Section */}
        <div className="toolbar-center">
          {/* View Mode Toggle */}
          <div className="tool-group">
            <button
              className={`tool-btn ${viewMode === 'single' ? 'active' : ''}`}
              onClick={() => setViewMode('single')}
              title="Single Page View"
            >
              <FileText size={16} />
            </button>
            <button
              className={`tool-btn ${viewMode === 'double' ? 'active' : ''}`}
              onClick={() => setViewMode('double')}
              title="Double Page View"
            >
              <Layout size={16} />
            </button>
          </div>
        </div>

        {/* Right Section */}
        <div className="toolbar-right">
          {/* Page Navigation */}
          <div className="tool-group">
            <button
              className="tool-btn"
              onClick={() => changePage(-1)}
              disabled={currentPage <= 1}
              title="Previous Page (←)"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="page-info">
              {currentPage} / {totalPages}
            </span>
            <button
              className="tool-btn"
              onClick={() => changePage(1)}
              disabled={currentPage >= totalPages}
              title="Next Page (→)"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Next Step */}
          <div className="tool-group">
            <button
              className="tool-btn workflow-btn"
              onClick={() => {
                if (onNext) {
                  onNext();
                } else {
                  console.log('Next button clicked - no handler provided');
                }
              }}
              title="Proceed to Next Step"
            >
              Next
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="content-area" ref={containerRef}>
        {/* Coordinate Display */}
        <div id="coordinate-display" className="coordinate-display">
          Mouse: (0, 0)
        </div>

        {/* PDF Canvas */}
        <div className="pdf-container">
          {viewMode === 'single' ? (
            <canvas
              ref={canvasRef}
              className="pdf-canvas"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: selectedTool === 'draw' ? 'crosshair' : selectedTool === 'delete' ? 'crosshair' : 'default' }}
            />
          ) : (
            <div className="double-page-container">
              <canvas
                ref={canvasRef}
                className="pdf-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: selectedTool === 'draw' ? 'crosshair' : selectedTool === 'delete' ? 'crosshair' : 'default' }}
              />
              <canvas
                ref={canvasRef2}
                className="pdf-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: selectedTool === 'draw' ? 'crosshair' : selectedTool === 'delete' ? 'crosshair' : 'default' }}
              />
            </div>
          )}

          {/* Drawing Overlay */}
          <canvas
            ref={overlayCanvasRef}
            className="drawing-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 10
            }}
          />
        </div>

        {/* Edge-triggered Page Toggles */}
        {showLeftToggle && (
          <div 
            className="page-toggle left-toggle"
            onClick={() => changePage(-1)}
          >
            <ChevronLeft size={24} />
          </div>
        )}
        {showRightToggle && (
          <div 
            className="page-toggle right-toggle"
            onClick={() => changePage(1)}
          >
            <ChevronRight size={24} />
          </div>
        )}
      </div>

      {/* Label Selector Modal */}
      {renderLabelSelector()}
    </div>
  );
};

export default ManualAnnotationTool;
