import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Image, 
  Table, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Search,
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import enhancedPdfService, { 
  PDFProcessingResult, 
  ExtractedImage, 
  ExtractedTable, 
  ExtractedText,
  PDFProcessingOptions 
} from '../services/enhancedPdfService';
import { cn } from '@/lib/utils';

interface EnhancedPdfViewerProps {
  filePath: string;
  datasheetId?: string;
  onProcessingComplete?: (result: PDFProcessingResult) => void;
  className?: string;
}

const EnhancedPdfViewer: React.FC<EnhancedPdfViewerProps> = ({
  filePath,
  datasheetId,
  onProcessingComplete,
  className
}) => {
  // State management
  const [processingResult, setProcessingResult] = useState<PDFProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'html' | 'images' | 'tables' | 'text'>('html');
  const [selectedImage, setSelectedImage] = useState<ExtractedImage | null>(null);
  const [selectedTable, setSelectedTable] = useState<ExtractedTable | null>(null);
  const [zoom, setZoom] = useState(100);
  const [showImageCaptions, setShowImageCaptions] = useState(true);
  const [showTableCaptions, setShowTableCaptions] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);

  // Refs
  const htmlContainerRef = useRef<HTMLDivElement>(null);
  const imageViewerRef = useRef<HTMLDivElement>(null);

  // Load and process PDF on mount
  useEffect(() => {
    if (filePath) {
      processPdf();
    }
  }, [filePath]);

  // Process PDF with enhanced extraction
  const processPdf = async () => {
    setIsProcessing(true);
    setError(null);
    setProcessingProgress(0);

    try {
      const options: PDFProcessingOptions = {
        extractImages: true,
        extractTables: true,
        extractText: true,
        generateHTML: true,
        imageQuality: 'high',
        includeCaptions: true,
        preserveLayout: true
      };

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await enhancedPdfService.processDatasheet(filePath, options);
      
      clearInterval(progressInterval);
      setProcessingProgress(100);
      
      setProcessingResult(result);
      if (onProcessingComplete) {
        onProcessingComplete(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleZoomReset = () => {
    setZoom(100);
  };

  // Handle search in text content
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Highlight search results in HTML content
    if (htmlContainerRef.current && query) {
      const htmlContent = htmlContainerRef.current.innerHTML;
      const highlightedContent = htmlContent.replace(
        new RegExp(query, 'gi'),
        match => `<mark class="bg-yellow-200">${match}</mark>`
      );
      htmlContainerRef.current.innerHTML = highlightedContent;
    }
  };

  // Filter images by type
  const filteredImages = processingResult?.extractedImages.filter(image => {
    if (!searchQuery) return true;
    return image.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           image.type.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  // Filter tables by content
  const filteredTables = processingResult?.extractedTables.filter(table => {
    if (!searchQuery) return true;
    return table.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           table.data.some(row => row.some(cell => cell.toLowerCase().includes(searchQuery.toLowerCase())));
  }) || [];

  // Filter text by content
  const filteredText = processingResult?.extractedText.filter(text => {
    if (!searchQuery) return true;
    return text.text.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  // Render image viewer
  const renderImageViewer = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Extracted Images ({filteredImages.length})</h3>
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-captions"
            checked={showImageCaptions}
            onCheckedChange={(checked) => setShowImageCaptions(checked as boolean)}
          />
          <Label htmlFor="show-captions">Show Captions</Label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredImages.map((image) => (
          <Card 
            key={image.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedImage(image)}
          >
            <CardContent className="p-4">
              <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                <img
                  src={`data:image/png;base64,${image.imageData}`}
                  alt={image.caption || `Image ${image.id}`}
                  className="max-w-full max-h-full object-contain"
                  style={{ transform: `scale(${zoom / 100})` }}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{image.type}</Badge>
                  <span className="text-sm text-muted-foreground">Page {image.pageNumber}</span>
                </div>
                {showImageCaptions && image.caption && (
                  <p className="text-sm text-muted-foreground">{image.caption}</p>
                )}
                <div className="text-xs text-muted-foreground">
                  {image.width} × {image.height} px
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Render table viewer
  const renderTableViewer = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Extracted Tables ({filteredTables.length})</h3>
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-table-captions"
            checked={showTableCaptions}
            onCheckedChange={(checked) => setShowTableCaptions(checked as boolean)}
          />
          <Label htmlFor="show-table-captions">Show Captions</Label>
        </div>
      </div>
      
      <div className="space-y-6">
        {filteredTables.map((table) => (
          <Card key={table.id}>
            <CardContent className="p-4">
              {showTableCaptions && table.caption && (
                <div className="mb-3">
                  <h4 className="font-medium">{table.caption}</h4>
                  <p className="text-sm text-muted-foreground">Page {table.pageNumber}</p>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr>
                      {table.headers.map((header, index) => (
                                                  <th key={index} className="border border-border px-3 py-2 bg-muted font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.data.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border border-border px-3 py-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Render text viewer
  const renderTextViewer = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Extracted Text ({filteredText.length} blocks)</h3>
        <div className="flex items-center gap-2">
          <Select value={zoom.toString()} onValueChange={(value) => setZoom(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="75">75%</SelectItem>
              <SelectItem value="100">100%</SelectItem>
              <SelectItem value="125">125%</SelectItem>
              <SelectItem value="150">150%</SelectItem>
              <SelectItem value="200">200%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {filteredText.map((text) => (
          <Card key={text.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Page {text.pageNumber}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {text.fontName} {text.fontSize}pt
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {text.isBold && <Badge variant="secondary">Bold</Badge>}
                  {text.isItalic && <Badge variant="secondary">Italic</Badge>}
                </div>
              </div>
              <p 
                className="text-sm leading-relaxed"
                style={{ 
                  fontSize: `${text.fontSize * (zoom / 100)}px`,
                  fontWeight: text.isBold ? 'bold' : 'normal',
                  fontStyle: text.isItalic ? 'italic' : 'normal'
                }}
              >
                {text.text}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Render HTML viewer
  const renderHtmlViewer = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">HTML Preview</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-16 text-center">{zoom}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomReset}>
            Reset
          </Button>
        </div>
      </div>
      
      <div 
        ref={htmlContainerRef}
        className="border rounded-lg p-6 bg-white overflow-auto"
        style={{ 
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left',
          minHeight: '600px'
        }}
        dangerouslySetInnerHTML={{ __html: processingResult?.htmlContent || '' }}
      />
    </div>
  );

  // Image modal
  const renderImageModal = () => {
    if (!selectedImage) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Image Viewer</h3>
            <Button variant="outline" size="sm" onClick={() => setSelectedImage(null)}>
              Close
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <img
              src={`data:image/png;base64,${selectedImage.imageData}`}
              alt={selectedImage.caption || `Image ${selectedImage.id}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          {selectedImage.caption && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              {selectedImage.caption}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (isProcessing) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-4">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Processing PDF...</p>
              <Progress value={processingProgress} className="w-64" />
              <p className="text-xs text-muted-foreground">
                Extracting images, tables, and generating HTML...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Processing Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={processPdf} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Processing
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!processingResult) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No PDF loaded</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Enhanced PDF Viewer
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {processingResult.totalPages} pages • {processingResult.extractedImages.length} images • {processingResult.extractedTables.length} tables
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-64"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>View Options</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setShowImageCaptions(!showImageCaptions)}>
                    {showImageCaptions ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showImageCaptions ? 'Hide' : 'Show'} Image Captions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowTableCaptions(!showTableCaptions)}>
                    {showTableCaptions ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showTableCaptions ? 'Hide' : 'Show'} Table Captions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={processPdf}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reprocess PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={currentView} onValueChange={(value: 'html' | 'images' | 'tables' | 'text') => setCurrentView(value)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="html" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                HTML
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Images ({processingResult.extractedImages.length})
              </TabsTrigger>
              <TabsTrigger value="tables" className="flex items-center gap-2">
                <Table className="h-4 w-4" />
                Tables ({processingResult.extractedTables.length})
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Text ({processingResult.extractedText.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="html" className="p-6">
              {renderHtmlViewer()}
            </TabsContent>

            <TabsContent value="images" className="p-6">
              {renderImageViewer()}
            </TabsContent>

            <TabsContent value="tables" className="p-6">
              {renderTableViewer()}
            </TabsContent>

            <TabsContent value="text" className="p-6">
              {renderTextViewer()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Image Modal */}
      {renderImageModal()}
    </div>
  );
};

export default EnhancedPdfViewer; 