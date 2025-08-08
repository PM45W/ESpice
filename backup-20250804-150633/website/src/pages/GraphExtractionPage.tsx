import React, { useState, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Image as ImageIcon, 
  Download, 
  Settings, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Palette,
  BarChart3,
  FileText,
  Server
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Types
interface DetectedColor {
  name: string;
  color: string;
  confidence: number;
  pixelCount: number;
}

interface CurvePoint {
  x: number;
  y: number;
  label: string;
  confidence: number;
}

interface CurveData {
  name: string;
  color: string;
  points: CurvePoint[];
  representation: string;
  pointCount: number;
  metadata: Record<string, any>;
}

interface CurveExtractionResult {
  curves: CurveData[];
  totalPoints: number;
  processingTime: number;
  success: boolean;
  error?: string;
  metadata: Record<string, any>;
}

interface GraphConfig {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  x_scale: number;
  y_scale: number;
  x_scale_type: 'linear' | 'log';
  y_scale_type: 'linear' | 'log';
  min_size: number;
}

// Curve Extraction Service for Web
class WebCurveExtractionService {
  private fastApiBaseUrl: string = 'http://localhost:8002';

  async isFastApiAvailable(): Promise<boolean> {
    try {
      console.log('Checking FastAPI service availability at:', this.fastApiBaseUrl);
      const response = await fetch(`${this.fastApiBaseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        console.log('✅ FastAPI service is available and healthy');
        return true;
      } else {
        console.log('❌ FastAPI service responded with status:', response.status);
        return false;
      }
    } catch (error) {
      console.log('❌ FastAPI service not available:', error);
      return false;
    }
  }

  async detectColors(imageData: Uint8Array): Promise<DetectedColor[]> {
    console.log('Starting color detection with FastAPI service...');
    
    // Check if FastAPI service is available
    if (!(await this.isFastApiAvailable())) {
      throw new Error('FastAPI curve extraction service is not available. Please start the service first with: ./scripts/start-curve-extraction-service-simple.ps1');
    }
    
    try {
      console.log('Using FastAPI curve extraction service for color detection');
      return await this.detectColorsFastApi(imageData);
    } catch (error) {
      console.error('FastAPI color detection failed:', error);
      throw new Error(`Color detection failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the FastAPI service is running.`);
    }
  }

  async extractCurves(
    imageData: Uint8Array,
    selectedColors: string[],
    config: GraphConfig
  ): Promise<CurveExtractionResult> {
    console.log('Starting curve extraction with FastAPI service...');
    
    // Check if FastAPI service is available
    if (!(await this.isFastApiAvailable())) {
      throw new Error('FastAPI curve extraction service is not available. Please start the service first with: ./scripts/start-curve-extraction-service-simple.ps1');
    }
    
    try {
      console.log('Using FastAPI curve extraction service for curve extraction');
      return await this.extractCurvesFastApi(imageData, selectedColors, config);
    } catch (error) {
      console.error('FastAPI curve extraction failed:', error);
      throw new Error(`Curve extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the FastAPI service is running.`);
    }
  }

  private async detectColorsFastApi(imageData: Uint8Array): Promise<DetectedColor[]> {
    console.log('Sending color detection request to FastAPI service...');
    
    const formData = new FormData();
    const blob = new Blob([imageData], { type: 'image/png' });
    formData.append('file', blob, 'image.png');

    try {
      const response = await fetch(`${this.fastApiBaseUrl}/api/curve-extraction/detect-colors`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FastAPI color detection failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'FastAPI color detection failed');
      }

      console.log('✅ Color detection successful, found colors:', result.data.detected_colors.length);
      return result.data.detected_colors;
    } catch (error) {
      console.error('❌ FastAPI color detection error:', error);
      throw error;
    }
  }

  private async extractCurvesFastApi(
    imageData: Uint8Array,
    selectedColors: string[],
    config: GraphConfig
  ): Promise<CurveExtractionResult> {
    console.log('Sending curve extraction request to FastAPI service...');
    console.log('Selected colors:', selectedColors);
    console.log('Config:', config);
    
    const formData = new FormData();
    const blob = new Blob([imageData], { type: 'image/png' });
    formData.append('file', blob, 'image.png');
    formData.append('selected_colors', JSON.stringify(selectedColors));
    formData.append('x_min', config.x_min.toString());
    formData.append('x_max', config.x_max.toString());
    formData.append('y_min', config.y_min.toString());
    formData.append('y_max', config.y_max.toString());
    formData.append('x_scale', config.x_scale.toString());
    formData.append('y_scale', config.y_scale.toString());
    formData.append('x_scale_type', config.x_scale_type);
    formData.append('y_scale_type', config.y_scale_type);
    formData.append('min_size', config.min_size.toString());

    try {
      const response = await fetch(`${this.fastApiBaseUrl}/api/curve-extraction/extract-curves`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FastAPI curve extraction failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'FastAPI curve extraction failed');
      }

      console.log('✅ Curve extraction successful, extracted curves:', result.data.curves.length);
      console.log('Total points:', result.data.total_points);
      console.log('Processing time:', result.data.processing_time);
      
      return result.data;
    } catch (error) {
      console.error('❌ FastAPI curve extraction error:', error);
      throw error;
    }
  }

  private getFallbackColors(): DetectedColor[] {
    throw new Error('FastAPI curve extraction service is not available. Please start the service first.');
  }

  private getFallbackCurves(selectedColors: string[], config: GraphConfig): CurveExtractionResult {
    throw new Error('FastAPI curve extraction service is not available. Please start the service first.');
  }
}

const curveExtractionService = new WebCurveExtractionService();

export default function GraphExtractionPage() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<Uint8Array | null>(null);
  const [detectedColors, setDetectedColors] = useState<DetectedColor[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [extractionResult, setExtractionResult] = useState<CurveExtractionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Graph configuration
  const [config, setConfig] = useState<GraphConfig>({
    x_min: 0,
    x_max: 5,
    y_min: 0,
    y_max: 25,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'linear',
    min_size: 1000
  });

  // Check service availability on component mount
  React.useEffect(() => {
    checkServiceAvailability();
  }, []);

  const checkServiceAvailability = async () => {
    setServiceStatus('checking');
    try {
      const isAvailable = await curveExtractionService.isFastApiAvailable();
      setServiceStatus(isAvailable ? 'available' : 'unavailable');
      
      if (!isAvailable) {
        toast({
          title: "FastAPI Service Unavailable",
          description: "Please start the FastAPI service first. Run: ./scripts/start-curve-extraction-service-simple.ps1",
          variant: "destructive"
        });
      } else {
        toast({
          title: "FastAPI Service Available",
          description: "Service is running and ready for curve extraction.",
        });
      }
    } catch (error) {
      setServiceStatus('unavailable');
      toast({
        title: "Service Check Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Read file data
      const arrayBufferReader = new FileReader();
      arrayBufferReader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        setImageData(new Uint8Array(arrayBuffer));
      };
      arrayBufferReader.readAsArrayBuffer(file);
    }
  }, []);

  const handleDetectColors = async () => {
    if (!imageData) {
      toast({
        title: "No image selected",
        description: "Please select an image file first.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const colors = await curveExtractionService.detectColors(imageData);
      setDetectedColors(colors);
      setSelectedColors(colors.slice(0, 2).map(c => c.name));
      
      toast({
        title: "Colors detected",
        description: `Found ${colors.length} colors in the image.`,
      });
    } catch (error) {
      toast({
        title: "Color detection failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractCurves = async () => {
    if (!imageData || selectedColors.length === 0) {
      toast({
        title: "Missing data",
        description: "Please select an image and at least one color.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await curveExtractionService.extractCurves(imageData, selectedColors, config);
      setExtractionResult(result);
      
      if (result.success) {
        toast({
          title: "Curves extracted successfully",
          description: `Extracted ${result.curves.length} curves with ${result.totalPoints} total points.`,
        });
      } else {
        toast({
          title: "Curve extraction failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Curve extraction failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!extractionResult?.success) return;

    let csvContent = 'X,Y,Color\n';
    extractionResult.curves.forEach(curve => {
      curve.points.forEach(point => {
        csvContent += `${point.x},${point.y},${curve.name}\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_curves.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "CSV downloaded",
      description: "Curve data has been downloaded as CSV file.",
    });
  };

  const getServiceStatusIcon = () => {
    switch (serviceStatus) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unavailable':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getServiceStatusText = () => {
    switch (serviceStatus) {
      case 'checking':
        return 'Checking service availability...';
      case 'available':
        return 'FastAPI service available';
      case 'unavailable':
        return 'FastAPI service unavailable - using web fallback';
    }
  };

  return (
    <>
      <Helmet>
        <title>Graph Extraction - ESpice</title>
        <meta name="description" content="Extract curves from datasheet graphs using advanced image processing" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Graph Extraction</h1>
          <p className="text-lg text-gray-600 mb-4">
            Extract curves from datasheet graphs using advanced image processing with OpenCV and FastAPI.
          </p>
          
          {/* Service Status */}
          <Alert className="mb-6">
            <Server className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              {getServiceStatusIcon()}
              {getServiceStatusText()}
            </AlertDescription>
          </Alert>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload Image</TabsTrigger>
            <TabsTrigger value="detection">Color Detection</TabsTrigger>
            <TabsTrigger value="extraction">Curve Extraction</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Graph Image
                </CardTitle>
                <CardDescription>
                  Select a datasheet graph image to extract curves from.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-4"
                    disabled={isProcessing}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Select Image
                  </Button>
                  <p className="text-sm text-gray-500">
                    Supported formats: PNG, JPG, JPEG, BMP
                  </p>
                </div>

                {imagePreview && (
                  <div className="mt-4">
                    <Label>Image Preview</Label>
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Graph preview"
                        className="w-full h-64 object-contain bg-gray-50"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Color Detection Tab */}
          <TabsContent value="detection" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Color Detection
                </CardTitle>
                <CardDescription>
                  Detect colors in the uploaded image for curve extraction.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleDetectColors}
                  disabled={!imageData || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Detecting Colors...
                    </>
                  ) : (
                    <>
                      <Palette className="h-4 w-4 mr-2" />
                      Detect Colors
                    </>
                  )}
                </Button>

                {detectedColors.length > 0 && (
                  <div className="space-y-4">
                    <Label>Detected Colors</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {detectedColors.map((color) => (
                        <Card key={color.name} className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-6 h-6 rounded-full border"
                              style={{ backgroundColor: color.color }}
                            />
                            <div className="flex-1">
                              <p className="font-medium capitalize">{color.name}</p>
                              <p className="text-sm text-gray-500">
                                Confidence: {(color.confidence * 100).toFixed(1)}%
                              </p>
                              <p className="text-sm text-gray-500">
                                Pixels: {color.pixelCount.toLocaleString()}
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedColors.includes(color.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedColors([...selectedColors, color.name]);
                                } else {
                                  setSelectedColors(selectedColors.filter(c => c !== color.name));
                                }
                              }}
                              className="h-4 w-4"
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Curve Extraction Tab */}
          <TabsContent value="extraction" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Curve Extraction
                </CardTitle>
                <CardDescription>
                  Configure extraction parameters and extract curves from the image.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="x_min">X Min</Label>
                    <Input
                      id="x_min"
                      type="number"
                      value={config.x_min}
                      onChange={(e) => setConfig({ ...config, x_min: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="x_max">X Max</Label>
                    <Input
                      id="x_max"
                      type="number"
                      value={config.x_max}
                      onChange={(e) => setConfig({ ...config, x_max: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="y_min">Y Min</Label>
                    <Input
                      id="y_min"
                      type="number"
                      value={config.y_min}
                      onChange={(e) => setConfig({ ...config, y_min: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="y_max">Y Max</Label>
                    <Input
                      id="y_max"
                      type="number"
                      value={config.y_max}
                      onChange={(e) => setConfig({ ...config, y_max: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <Separator />

                <Button
                  onClick={handleExtractCurves}
                  disabled={selectedColors.length === 0 || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting Curves...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Extract Curves
                    </>
                  )}
                </Button>

                {isProcessing && (
                  <div className="space-y-2">
                    <Label>Processing...</Label>
                    <Progress value={undefined} className="w-full" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Extraction Results
                </CardTitle>
                <CardDescription>
                  View and download the extracted curve data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {extractionResult ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {extractionResult.curves.length}
                          </p>
                          <p className="text-sm text-gray-500">Curves Extracted</p>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {extractionResult.totalPoints}
                          </p>
                          <p className="text-sm text-gray-500">Total Points</p>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">
                            {extractionResult.processingTime.toFixed(3)}s
                          </p>
                          <p className="text-sm text-gray-500">Processing Time</p>
                        </div>
                      </Card>
                    </div>

                    {/* Curves */}
                    <div className="space-y-4">
                      <Label>Extracted Curves</Label>
                      {extractionResult.curves.map((curve, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: curve.color }}
                              />
                              <div>
                                <p className="font-medium capitalize">{curve.name}</p>
                                <p className="text-sm text-gray-500">
                                  {curve.pointCount} points
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">
                              {curve.metadata.average_slope?.toFixed(3) || 'N/A'} slope
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Download */}
                    <div className="flex gap-4">
                      <Button onClick={handleDownloadCSV} className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV
                      </Button>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-2">
                      <Label>Processing Metadata</Label>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Method: {extractionResult.metadata.extraction_method || 'Unknown'}</p>
                        <p>Quality Score: {extractionResult.metadata.quality_score?.toFixed(2) || 'N/A'}</p>
                        <p>Image Size: {extractionResult.metadata.image_width || 'N/A'} x {extractionResult.metadata.image_height || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No extraction results available.</p>
                    <p className="text-sm">Upload an image and extract curves to see results here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
} 