import React, { useState, useRef, useCallback, useMemo } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  Settings,
  Info,
  Database,
  Zap,
  Thermometer,
  Gauge,
  Target,
  BarChart3,
  Download,
  Play,
  Cpu,
  Clock,
  Eye,
  Copy,
  FileText,
  TrendingUp,
  Activity
} from 'lucide-react';
import SiliconValidationService, { 
  type SiliconDataPoint,
  type SiliconValidationResult
} from '../services/siliconValidationService';
import { 
  Button,
  Progress,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Separator,
  Input
} from '@espice/ui';
import { useSystemMonitor } from '../hooks/useSystemMonitor';
// import { productService } from '../services/productService';
import type { SPICEModel, Product } from '../types';

interface SiliconValidationPageProps {
  selectedModel?: SPICEModel;
}

export default function SiliconValidationPage({ selectedModel }: SiliconValidationPageProps) {
  const [siliconData, setSiliconData] = useState<SiliconDataPoint[]>([]);
  const [validationResult, setValidationResult] = useState<SiliconValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationOptions, setValidationOptions] = useState({
    temperatureRange: { min: -40, max: 175 },
    voltageRange: { min: 0, max: 100 },
    frequencyRange: { min: 0, max: 1000000 },
    tolerance: 5
  });
  const [dataSource, setDataSource] = useState<'upload' | 'generate'>('upload');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [validationStats, setValidationStats] = useState({
    totalValidations: 0,
    successfulValidations: 0,
    averageAccuracy: 0,
    lastValidationTime: 0
  });
  const [exportedReport, setExportedReport] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validationService = SiliconValidationService.getInstance();
  const { metrics } = useSystemMonitor(5000);

  // Load available products
  React.useEffect(() => {
    const loadProducts = async () => {
      try {
        // const products = await productService.getAllProducts(); // This line was removed
        // setAvailableProducts(products);
        // if (products.length > 0 && !selectedProduct) {
        //   setSelectedProduct(products[0]);
        // }
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    };
    loadProducts();
  }, [selectedProduct]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = parseCSVData(content);
        setSiliconData(data);
      } catch (error) {
        console.error('Error parsing file:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  const parseCSVData = useCallback((content: string): SiliconDataPoint[] => {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data: SiliconDataPoint[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Convert to SiliconDataPoint format
      const dataPoint: SiliconDataPoint = {
        voltage: parseFloat(row.voltage || row.V || '0'),
        current: parseFloat(row.current || row.I || '0'),
        temperature: parseFloat(row.temperature || row.T || '25'),
        ...(row.frequency && { frequency: parseFloat(row.frequency) }),
        timestamp: new Date(row.timestamp || Date.now()),
        source: 'measurement' as const,
        confidence: parseFloat(row.confidence || '0.9')
      };

      if (!isNaN(dataPoint.voltage) && !isNaN(dataPoint.current)) {
        data.push(dataPoint);
      }
    }

    return data;
  }, []);

  const generateSampleData = useCallback(() => {
    const sampleData: SiliconDataPoint[] = [];
    const baseVoltage = 5;
    const baseCurrent = 0.1;
    
    for (let i = 0; i < 50; i++) {
      const voltage = baseVoltage * (i / 50);
      const current = baseCurrent * Math.exp(voltage / 2) + Math.random() * 0.01;
      const temperature = 25 + Math.random() * 10;
      
      sampleData.push({
        voltage,
        current,
        temperature,
        frequency: 1000000,
        timestamp: new Date(Date.now() - (50 - i) * 1000),
        source: 'simulation',
        confidence: 0.95
      });
    }
    
    setSiliconData(sampleData);
  }, []);

  const handleValidation = useCallback(async () => {
    if (!selectedProduct || siliconData.length === 0) return;

    setIsValidating(true);
    try {
      // Create a mock SPICE model for validation
      const mockModel: SPICEModel = {
        id: `model-${Date.now()}`,
        productId: selectedProduct.id,
        modelText: `* SPICE Model for ${selectedProduct.name}\n.model ${selectedProduct.name} NMOS\n+ LEVEL=1\n+ L=1e-6\n+ W=1e-6\n+ KP=50e-6\n+ VTO=1.0\n+ LAMBDA=0.01`,
        parameters: {},
        version: '1.0',
        createdAt: new Date(),
        validatedAt: new Date()
      };

      const result = validationService.validateSiliconData(
        mockModel,
        siliconData,
        validationOptions
      );
      
      setValidationResult(result);
      
      // Update stats
      setValidationStats(prev => ({
        totalValidations: prev.totalValidations + 1,
        successfulValidations: prev.successfulValidations + (result.accuracy >= 80 ? 1 : 0),
        averageAccuracy: (prev.averageAccuracy + result.accuracy) / 2,
        lastValidationTime: Date.now()
      }));
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  }, [selectedProduct, siliconData, validationOptions, validationService]);

  const getAccuracyColor = useCallback((score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  }, []);

  const getAccuracyIcon = useCallback((score: number) => {
    if (score >= 90) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 70) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  }, []);

  const exportValidationReport = useCallback(() => {
    if (!validationResult) return;

    const report = `Silicon Validation Report
Generated: ${new Date().toISOString()}
Product: ${selectedProduct?.name || 'Unknown'}

VALIDATION SUMMARY
=================
Accuracy Score: ${validationResult.accuracy}%
Data Points: ${validationResult.dataPoints}
Temperature Range: ${validationResult.temperatureRange.min}°C to ${validationResult.temperatureRange.max}°C
Voltage Range: ${validationResult.voltageRange.min}V to ${validationResult.voltageRange.max}V

DETAILED RESULTS
================
${validationResult.details.map(detail => `- ${detail}`).join('\n')}

RECOMMENDATIONS
==============
${validationResult.recommendations.map(rec => `- ${rec}`).join('\n')}
`;

    setExportedReport(report);
  }, [validationResult, selectedProduct]);

  const downloadReport = useCallback(() => {
    if (!exportedReport) return;

    const blob = new Blob([exportedReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `silicon_validation_${selectedProduct?.name || 'report'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportedReport, selectedProduct]);

  const copyReport = useCallback(async () => {
    if (!exportedReport) return;
    
    try {
      await navigator.clipboard.writeText(exportedReport);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy report:', error);
    }
  }, [exportedReport]);

  const formatTime = useCallback((timestamp: number) => {
    if (timestamp === 0) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  }, []);

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">SILICON VALIDATION</h1>
        <p className="page-description">
          Validate SPICE models against silicon measurement data for accuracy verification
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="responsive-grid-4">
        <div className="metric-card">
          <div className="unified-panel-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">TOTAL VALIDATIONS</p>
                <p className="metric-value">{validationStats.totalValidations}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="unified-panel-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">SUCCESS RATE</p>
                <p className="metric-value text-green-600">
                  {validationStats.totalValidations > 0 
                    ? Math.round((validationStats.successfulValidations / validationStats.totalValidations) * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="unified-panel-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">AVG ACCURACY</p>
                <p className="metric-value text-purple-600">
                  {Math.round(validationStats.averageAccuracy)}%
                </p>
              </div>
              <Gauge className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="unified-panel-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">DATA POINTS</p>
                <p className="metric-value text-orange-600">{siliconData.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="responsive-grid-2">
        {/* Configuration Panel */}
        <div className="unified-panel">
          <div className="unified-panel-header">
            <h3>VALIDATION CONFIGURATION</h3>
          </div>
          <div className="unified-panel-content space-y-6">
            {/* Product Selection */}
            <div className="form-group">
              <Label className="form-label">SELECT PRODUCT</Label>
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  // const product = availableProducts.find(p => p.id === e.target.value); // This line was removed
                  // setSelectedProduct(product || null);
                }}
                className="w-full p-2 border border-border rounded-md bg-[hsl(var(--background))] text-[hsl(var(--foreground))] font-mono"
              >
                <option value="">Choose a product to validate</option>
                {/* {availableProducts.map((product) => ( // This line was removed
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.manufacturer})
                  </option>
                ))} */}
              </select>
              <p className="form-description">
                Select a product from your database to validate against silicon data
              </p>
            </div>

            {/* Data Source Selection */}
            <div className="form-group">
              <Label className="form-label">DATA SOURCE</Label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="upload"
                    checked={dataSource === 'upload'}
                    onChange={(e) => setDataSource(e.target.value as 'upload' | 'generate')}
                    className="text-primary"
                  />
                  <span className="text-sm font-mono">Upload CSV</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="generate"
                    checked={dataSource === 'generate'}
                    onChange={(e) => setDataSource(e.target.value as 'upload' | 'generate')}
                    className="text-primary"
                  />
                  <span className="text-sm font-mono">Generate Sample</span>
                </label>
              </div>
            </div>

            {/* File Upload */}
            {dataSource === 'upload' && (
              <div className="form-group">
                <Label className="form-label">UPLOAD SILICON DATA</Label>
                <div className="file-upload-area" onClick={() => fileInputRef.current?.click()}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-primary mx-auto" />
                    <p className="text-sm font-mono text-[hsl(var(--foreground))]">Click to upload CSV file</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Expected columns: voltage, current, temperature, frequency (optional)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Generate Sample Data */}
            {dataSource === 'generate' && (
              <div className="form-group">
                <Label className="form-label">SAMPLE DATA</Label>
                <Button
                  onClick={generateSampleData}
                  variant="outline"
                  className="action-button-ghost"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  GENERATE SAMPLE DATA
                </Button>
                <p className="form-description">
                  Generate synthetic silicon measurement data for testing
                </p>
              </div>
            )}

            {/* Validation Options */}
            <div className="space-y-4">
              <Label className="form-label">VALIDATION OPTIONS</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <Label className="form-label">TEMP RANGE (°C)</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      value={validationOptions.temperatureRange.min}
                      onChange={(e) => setValidationOptions(prev => ({
                        ...prev,
                        temperatureRange: { ...prev.temperatureRange, min: parseInt(e.target.value) }
                      }))}
                      className="text-sm font-mono"
                    />
                    <span className="text-sm font-mono self-center">to</span>
                    <Input
                      type="number"
                      value={validationOptions.temperatureRange.max}
                      onChange={(e) => setValidationOptions(prev => ({
                        ...prev,
                        temperatureRange: { ...prev.temperatureRange, max: parseInt(e.target.value) }
                      }))}
                      className="text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <Label className="form-label">VOLTAGE RANGE (V)</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      value={validationOptions.voltageRange.min}
                      onChange={(e) => setValidationOptions(prev => ({
                        ...prev,
                        voltageRange: { ...prev.voltageRange, min: parseInt(e.target.value) }
                      }))}
                      className="text-sm font-mono"
                    />
                    <span className="text-sm font-mono self-center">to</span>
                    <Input
                      type="number"
                      value={validationOptions.voltageRange.max}
                      onChange={(e) => setValidationOptions(prev => ({
                        ...prev,
                        voltageRange: { ...prev.voltageRange, max: parseInt(e.target.value) }
                      }))}
                      className="text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <Label className="form-label">TOLERANCE (%)</Label>
                <Input
                  type="number"
                  value={validationOptions.tolerance}
                  onChange={(e) => setValidationOptions(prev => ({
                    ...prev,
                    tolerance: parseInt(e.target.value)
                  }))}
                  className="text-sm font-mono"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleValidation}
                disabled={!selectedProduct || siliconData.length === 0 || isValidating}
                className="action-button-primary"
              >
                {isValidating ? (
                  <>
                    <Cpu className="h-4 w-4 mr-2 animate-spin" />
                    VALIDATING...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    VALIDATE SILICON
                  </>
                )}
              </Button>

              <Button
                onClick={exportValidationReport}
                disabled={!validationResult}
                variant="outline"
                className="action-button-ghost"
              >
                <FileText className="h-4 w-4 mr-2" />
                EXPORT REPORT
              </Button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="unified-panel">
          <div className="unified-panel-header">
            <h3>VALIDATION RESULTS</h3>
          </div>
          <div className="unified-panel-content">
            {validationResult ? (
              <div className="space-y-6">
                {/* Accuracy Score */}
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    {getAccuracyIcon(validationResult.accuracy)}
                    <span className={`text-2xl font-bold font-mono ${getAccuracyColor(validationResult.accuracy)}`}>
                      {validationResult.accuracy}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    Silicon Validation Accuracy
                  </p>
                </div>

                <Separator />

                {/* Validation Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold font-mono text-[hsl(var(--foreground))]">VALIDATION DETAILS</h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground font-mono">Data Points</p>
                      <p className="font-mono text-[hsl(var(--foreground))]">{validationResult.dataPoints}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-mono">Temperature Range</p>
                      <p className="font-mono text-[hsl(var(--foreground))]">
                        {validationResult.temperatureRange.min}°C - {validationResult.temperatureRange.max}°C
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-mono">Voltage Range</p>
                      <p className="font-mono text-[hsl(var(--foreground))]">
                        {validationResult.voltageRange.min}V - {validationResult.voltageRange.max}V
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-mono">Validation Time</p>
                      <p className="font-mono text-[hsl(var(--foreground))]">{validationResult.validationTime}ms</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-sm font-semibold font-mono text-[hsl(var(--foreground))]">DETAILED RESULTS</h5>
                    {validationResult.details.map((detail, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-md">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-mono text-[hsl(var(--foreground))]">{detail}</span>
                      </div>
                    ))}
                  </div>

                  {validationResult.recommendations.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold font-mono text-[hsl(var(--foreground))] mb-2">RECOMMENDATIONS</h5>
                      <ul className="space-y-2">
                        {validationResult.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm font-mono text-[hsl(var(--foreground))]">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Export Results */}
                {exportedReport && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold font-mono text-[hsl(var(--foreground))]">VALIDATION REPORT</h4>
                        <div className="flex space-x-2">
                          <Button
                            onClick={copyReport}
                            size="sm"
                            variant="outline"
                            className="action-button-ghost"
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            COPY
                          </Button>
                          <Button
                            onClick={downloadReport}
                            size="sm"
                            className="action-button-primary"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            DOWNLOAD
                          </Button>
                        </div>
                      </div>
                      
                      <div className="bg-muted/30 rounded-md p-4 max-h-60 overflow-y-auto">
                        <pre className="text-xs font-mono text-[hsl(var(--foreground))] whitespace-pre-wrap">
                          {exportedReport}
                        </pre>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <Target className="empty-state-icon" />
                <p className="empty-state-title">No validation results</p>
                <p className="empty-state-description">
                  Configure your settings and run a silicon validation to see results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div className="unified-panel">
        <div className="unified-panel-header">
          <h3>SYSTEM RESOURCES</h3>
        </div>
        <div className="unified-panel-content">
          <div className="responsive-grid-4">
            <div className="flex items-center space-x-3">
              <Cpu className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-mono">CPU</p>
                <p className="text-xs text-muted-foreground font-mono">{metrics.cpu.usage}% / 100%</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Database className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-mono">MEMORY</p>
                <p className="text-xs text-muted-foreground font-mono">{metrics.memory.usage}% / 100%</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-mono">DATA POINTS</p>
                <p className="text-xs text-muted-foreground font-mono">{siliconData.length} loaded</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Thermometer className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-mono">TEMP RANGE</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {validationOptions.temperatureRange.min}°C - {validationOptions.temperatureRange.max}°C
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 