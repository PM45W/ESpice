import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  BarChart3, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
  Save
} from 'lucide-react';
import DatasheetImageExtractionService, { 
  DatasheetImageExtractionConfig, 
  ExtractedGraphImage, 
  DatasheetExtractionResult 
} from '../services/datasheetImageExtractionService';
import customGraphTypeService, { CustomGraphType } from '../services/customGraphTypeService';
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
  ScrollArea, 
  Switch, 
  Label, 
  Input, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@espice/ui';

interface DatasheetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractionComplete?: (result: DatasheetExtractionResult) => void;
  partNumber?: string;
}

interface UploadedFile {
  file: File;
  type: 'datasheet' | 'csv';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

const DatasheetUploadModal: React.FC<DatasheetUploadModalProps> = ({
  isOpen,
  onClose,
  onExtractionComplete,
  partNumber
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [extractionConfig, setExtractionConfig] = useState<DatasheetImageExtractionConfig>({
    extractGraphs: true,
    extractText: true,
    extractImages: true,
    graphDetectionSensitivity: 0.7,
    defaultGraphType: 'output_characteristics',
    autoProcessGraphs: true,
    saveExtractedImages: true,
    outputDirectory: 'extracted_graphs'
  });
  const [extractionResult, setExtractionResult] = useState<DatasheetExtractionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [selectedGraphs, setSelectedGraphs] = useState<Set<string>>(new Set());
  const [customGraphTypes, setCustomGraphTypes] = useState<CustomGraphType[]>([]);

  const datasheetExtractionService = DatasheetImageExtractionService.getInstance();

  useEffect(() => {
    if (isOpen) {
      loadCustomGraphTypes();
    }
  }, [isOpen]);

  const loadCustomGraphTypes = async () => {
    try {
      const types = await customGraphTypeService.getAllCustomGraphTypes();
      setCustomGraphTypes(types);
    } catch (error) {
      console.error('Failed to load custom graph types:', error);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      type: file.type.includes('pdf') ? 'datasheet' : 'csv',
      status: 'pending',
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    if (rejectedFiles.length > 0) {
      console.warn('Rejected files:', rejectedFiles);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 5,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartExtraction = async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessing(true);
    const datasheetFiles = uploadedFiles.filter(f => f.type === 'datasheet');
    
    if (datasheetFiles.length === 0) {
      console.warn('No datasheet files found');
      setIsProcessing(false);
      return;
    }

    try {
      // Process the first datasheet file (can be extended to handle multiple)
      const datasheetFile = datasheetFiles[0];
      
      // Update file status
      setUploadedFiles(prev => prev.map(f => 
        f.file === datasheetFile.file 
          ? { ...f, status: 'processing', progress: 10 }
          : f
      ));

      // Start extraction
      const result = await datasheetExtractionService.extractGraphImagesFromDatasheet(
        datasheetFile.file,
        extractionConfig
      );

      // Update file status
      setUploadedFiles(prev => prev.map(f => 
        f.file === datasheetFile.file 
          ? { 
              ...f, 
              status: result.success ? 'completed' : 'error',
              progress: 100,
              error: result.error
            }
          : f
      ));

      if (result.success) {
        setExtractionResult(result);
        onExtractionComplete?.(result);
      }

    } catch (error) {
      console.error('Extraction failed:', error);
      setUploadedFiles(prev => prev.map(f => ({
        ...f,
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      })));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = async () => {
    if (!extractionResult) return;

    try {
      const csvContent = await datasheetExtractionService.exportCurvesToCSV(
        extractionResult.extractedGraphs
      );
      
      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${partNumber || 'extracted_curves'}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleSaveImages = async () => {
    if (!extractionResult) return;

    try {
      const savedPaths = await datasheetExtractionService.saveExtractedImages(
        extractionResult.extractedGraphs,
        extractionConfig.outputDirectory
      );
      console.log('Saved images:', savedPaths);
    } catch (error) {
      console.error('Save images failed:', error);
    }
  };

  const toggleGraphSelection = (graphId: string) => {
    setSelectedGraphs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(graphId)) {
        newSet.delete(graphId);
      } else {
        newSet.add(graphId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getGraphTypeColor = (graphType: string) => {
    switch (graphType) {
      case 'output_characteristics':
      case 'output_characteristics_log': return 'bg-blue-100 text-blue-800';
      case 'transfer_characteristics':
      case 'transfer_characteristics_log': return 'bg-green-100 text-green-800';
      case 'capacitance_characteristics': return 'bg-purple-100 text-purple-800';
      case 'on_resistance_characteristics': return 'bg-orange-100 text-orange-800';
      case 'gate_charge_characteristics': return 'bg-pink-100 text-pink-800';
      case 'switching_characteristics': return 'bg-indigo-100 text-indigo-800';
      case 'thermal_characteristics': return 'bg-red-100 text-red-800';
      case 'safe_operating_area': return 'bg-yellow-100 text-yellow-800';
      case 'body_diode_characteristics': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getColorMeanings = (graphType: string) => {
    // Check if it's a custom graph type
    const customType = customGraphTypes.find(type => type.id === graphType);
    if (customType) {
      return customType.color_reps;
    }

    const colorMeanings: { [key: string]: { [key: string]: string } } = {
             output_characteristics: {
         red: 'VGS = 5V',
         green: 'VGS = 4V',
         yellow: 'VGS = 3V',
         blue: 'VGS = 2V'
       },
       output_characteristics_log: {
         red: 'VGS = 5V',
         green: 'VGS = 4V',
         yellow: 'VGS = 3V',
         blue: 'VGS = 2V'
       },
             transfer_characteristics: {
         blue: 'T = 25°C',
         red: 'T = 125°C'
       },
       transfer_characteristics_log: {
         blue: 'T = 25°C',
         red: 'T = 125°C'
       },
                           capacitance_characteristics: {
          red: 'COSS = CGD + CSD',
          yellow: 'CISS = CGD + CGS',
          green: 'CRSS = CGD'
        },
        capacitance_characteristics_log: {
          red: 'COSS = CGD + CSD',
          yellow: 'CISS = CGD + CGS',
          green: 'CRSS = CGD'
        },
             on_resistance_characteristics: {
         blue: 'ID = 20A',
         green: 'ID = 40A',
         yellow: 'ID = 60A',
         red: 'ID = 80A'
       },
       on_resistance_temperature: {
         blue: 'T = 25°C',
         red: 'T = 125°C'
       },
      gate_charge_characteristics: {
        blue: 'VDS = 6V',
        red: 'VDS = 12V',
        green: 'VDS = 3V',
        yellow: 'VDS = 9V'
      },
      switching_characteristics: {
        red: 'VDS',
        blue: 'ID',
        green: 'VGS',
        yellow: 'IG'
      },
             thermal_characteristics: {
         blue: 'ID = 40A, VGS = 5V'
       },
      safe_operating_area: {
        red: 'DC',
        blue: 'Pulse',
        green: 'Single Pulse',
        yellow: 'Repetitive Pulse'
      },
             body_diode_characteristics: {
         blue: 'T = 25°C',
         red: 'T = 125°C'
       },
      reverse_drain_source_characteristics: {
        blue: 'T = 25°C',
        red: 'T = 125°C'
      }
    };
    
    return colorMeanings[graphType] || {};
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Upload Datasheet & Extract Graphs</h2>
            <p className="text-sm text-muted-foreground">
              Upload datasheet PDF and CSV files for automatic graph extraction
              {partNumber && ` - Part: ${partNumber}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Upload and Configuration */}
          <div className="w-1/2 p-6 border-r border-border overflow-y-auto">
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload Files</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                {/* File Upload Zone */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to select files
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supports PDF datasheets and CSV data files (max 50MB each)
                  </p>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-foreground">Uploaded Files</h3>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{file.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(file.status)}
                          {file.status === 'processing' && (
                            <Progress value={file.progress} className="w-20" />
                          )}
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Start Extraction Button */}
                {uploadedFiles.some(f => f.type === 'datasheet') && (
                  <Button
                    onClick={handleStartExtraction}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Start Graph Extraction
                      </>
                    )}
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-process">Auto-process graphs</Label>
                    <Switch
                      id="auto-process"
                      checked={extractionConfig.autoProcessGraphs}
                      onCheckedChange={(checked) => 
                        setExtractionConfig(prev => ({ ...prev, autoProcessGraphs: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="save-images">Save extracted images</Label>
                    <Switch
                      id="save-images"
                      checked={extractionConfig.saveExtractedImages}
                      onCheckedChange={(checked) => 
                        setExtractionConfig(prev => ({ ...prev, saveExtractedImages: checked }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="default-graph-type">Default Graph Type</Label>
                    <Select
                      value={extractionConfig.defaultGraphType}
                      onValueChange={(value: any) => 
                        setExtractionConfig(prev => ({ ...prev, defaultGraphType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="output_characteristics">Output Characteristics</SelectItem>
                        <SelectItem value="output_characteristics_log">Output Characteristics (Log Scale)</SelectItem>
                        <SelectItem value="transfer_characteristics">Transfer Characteristics</SelectItem>
                        <SelectItem value="transfer_characteristics_log">Transfer Characteristics (Log Scale)</SelectItem>
                        <SelectItem value="capacitance_characteristics">Capacitance Characteristics</SelectItem>
                        <SelectItem value="capacitance_characteristics_log">Capacitance Characteristics (Log Scale)</SelectItem>
                                                 <SelectItem value="on_resistance_characteristics">On-Resistance Characteristics</SelectItem>
                         <SelectItem value="on_resistance_temperature">On-Resistance vs Temperature</SelectItem>
                         <SelectItem value="gate_charge_characteristics">Gate Charge Characteristics</SelectItem>
                         <SelectItem value="switching_characteristics">Switching Characteristics</SelectItem>
                         <SelectItem value="thermal_characteristics">Normalized On-State Resistance vs Temperature</SelectItem>
                         <SelectItem value="safe_operating_area">Safe Operating Area</SelectItem>
                         <SelectItem value="body_diode_characteristics">Body Diode Characteristics</SelectItem>
                         <SelectItem value="reverse_drain_source_characteristics">Reverse Drain-Source Characteristics</SelectItem>
                        {customGraphTypes.length > 0 && (
                          <>
                            <SelectItem value="custom" disabled>── Custom Graph Types ──</SelectItem>
                            {customGraphTypes.map((customType) => (
                              <SelectItem key={customType.id} value={customType.id}>
                                {customType.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="sensitivity">Graph Detection Sensitivity</Label>
                    <Input
                      id="sensitivity"
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={extractionConfig.graphDetectionSensitivity}
                      onChange={(e) => 
                        setExtractionConfig(prev => ({ 
                          ...prev, 
                          graphDetectionSensitivity: parseFloat(e.target.value) 
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {extractionConfig.graphDetectionSensitivity} - Higher values detect more graphs but may include false positives
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="output-dir">Output Directory</Label>
                    <Input
                      id="output-dir"
                      value={extractionConfig.outputDirectory}
                      onChange={(e) => 
                        setExtractionConfig(prev => ({ ...prev, outputDirectory: e.target.value }))
                      }
                      placeholder="extracted_graphs"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Results */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">Extraction Results</h3>
              {extractionResult && (
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleExportCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              )}
            </div>

            {extractionResult ? (
              <div className="space-y-4">
                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Extraction Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Pages</p>
                        <p className="font-medium">{extractionResult.totalPages}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Extracted Graphs</p>
                        <p className="font-medium">{extractionResult.extractedGraphs.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Successful</p>
                        <p className="font-medium text-green-600">
                          {extractionResult.metadata?.successfulExtractions || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Failed</p>
                        <p className="font-medium text-red-600">
                          {extractionResult.metadata?.failedExtractions || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Extracted Graphs */}
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Extracted Graphs</h4>
                  <ScrollArea className="h-64">
                    {extractionResult.extractedGraphs.map((graph) => (
                      <Card key={graph.id} className="mb-2">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={selectedGraphs.has(graph.id)}
                                onChange={() => toggleGraphSelection(graph.id)}
                                className="rounded border-border"
                              />
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  Graph {graph.id.slice(-8)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Page {graph.pageNumber} • Confidence: {(graph.confidence * 100).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getGraphTypeColor(graph.graphType || 'custom')}>
                                {graph.graphType || 'custom'}
                              </Badge>
                              {getStatusIcon(graph.processingStatus)}
                            </div>
                          </div>
                          
                          {graph.detectedColors && graph.detectedColors.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground mb-1">Detected Colors:</p>
                              <div className="flex flex-wrap gap-1">
                                {graph.detectedColors.slice(0, 5).map((color, index) => (
                                  <div
                                    key={index}
                                    className="w-4 h-4 rounded border border-border"
                                    style={{ backgroundColor: color.color }}
                                    title={color.name}
                                  />
                                ))}
                                {graph.detectedColors.length > 5 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{graph.detectedColors.length - 5} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Color Meanings */}
                          {graph.graphType && graph.graphType !== 'custom' && (
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground mb-1">Color Meanings:</p>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                {Object.entries(getColorMeanings(graph.graphType)).map(([color, meaning]) => (
                                  <div key={color} className="flex items-center gap-1">
                                    <div
                                      className="w-3 h-3 rounded border border-border"
                                      style={{ 
                                        backgroundColor: color === 'red' ? '#ef4444' : 
                                                       color === 'blue' ? '#3b82f6' : 
                                                       color === 'green' ? '#22c55e' : 
                                                       color === 'yellow' ? '#eab308' : 
                                                       color === 'purple' ? '#a855f7' : 
                                                       color === 'orange' ? '#f97316' : '#6b7280'
                                      }}
                                    />
                                    <span className="text-muted-foreground">{meaning}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {graph.error && (
                            <p className="text-xs text-red-600 mt-1">{graph.error}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No extraction results yet</p>
                <p className="text-sm">Upload a datasheet and start extraction to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatasheetUploadModal; 