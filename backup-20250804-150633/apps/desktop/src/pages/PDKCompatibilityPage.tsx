import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  Download, 
  FileText, 
  Settings,
  Info,
  TrendingUp,
  Shield,
  Database,
  Zap,
  Cpu,
  BarChart3,
  Clock,
  Target,
  Eye,
  Copy,
  ExternalLink
} from 'lucide-react';
import PDKCompatibilityService, { 
  type FoundryType, 
  type ProcessNode, 
  type EDATool,
  type PDKValidationResult,
  type EDAExportOptions 
} from '../services/pdkCompatibilityService';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { useSystemMonitor } from '../hooks/useSystemMonitor';
import { productService } from '../services/productService';
import type { SPICEModel, Product } from '../types';

interface PDKCompatibilityPageProps {
  selectedModel?: SPICEModel;
}

export default function PDKCompatibilityPage({ selectedModel }: PDKCompatibilityPageProps) {
  const [selectedFoundry, setSelectedFoundry] = useState<FoundryType>('TSMC');
  const [selectedProcessNode, setSelectedProcessNode] = useState<ProcessNode>('28nm');
  const [validationResult, setValidationResult] = useState<PDKValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [exportOptions, setExportOptions] = useState<EDAExportOptions>({
    tool: 'Cadence',
    format: 'scs',
    includeProcessCorners: true,
    includeTemperatureRange: true,
    includeMonteCarlo: false
  });
  const [exportedContent, setExportedContent] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [compatibilityStats, setCompatibilityStats] = useState({
    totalValidations: 0,
    successfulValidations: 0,
    averageComplianceScore: 0,
    lastValidationTime: 0
  });

  const pdkService = PDKCompatibilityService.getInstance();
  const { metrics } = useSystemMonitor(5000);
  const supportedFoundries = pdkService.getSupportedFoundries();
  const edaFormats = pdkService.getEDAExportFormats();
  const processNodes = supportedFoundries[selectedFoundry] || [];

  // Load available products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await productService.getAllProducts();
        setAvailableProducts(products);
        if (products.length > 0 && !selectedProduct) {
          setSelectedProduct(products[0]);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    };
    loadProducts();
  }, [selectedProduct]);

  const handleValidation = useCallback(async () => {
    if (!selectedProduct) return;

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

      const result = pdkService.validatePDKCompatibility(
        mockModel,
        selectedFoundry,
        selectedProcessNode
      );
      
      setValidationResult(result);
      
      // Update stats
      setCompatibilityStats(prev => ({
        totalValidations: prev.totalValidations + 1,
        successfulValidations: prev.successfulValidations + (result.complianceScore >= 80 ? 1 : 0),
        averageComplianceScore: (prev.averageComplianceScore + result.complianceScore) / 2,
        lastValidationTime: Date.now()
      }));
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  }, [selectedProduct, selectedFoundry, selectedProcessNode, pdkService]);

  const handleExport = useCallback(async () => {
    if (!selectedProduct) return;

    setIsExporting(true);
    try {
      // Create a mock SPICE model for export
      const mockModel: SPICEModel = {
        id: `model-${Date.now()}`,
        productId: selectedProduct.id,
        modelText: `* SPICE Model for ${selectedProduct.name}\n.model ${selectedProduct.name} NMOS\n+ LEVEL=1\n+ L=1e-6\n+ W=1e-6\n+ KP=50e-6\n+ VTO=1.0\n+ LAMBDA=0.01`,
        parameters: {},
        version: '1.0',
        createdAt: new Date(),
        validatedAt: new Date()
      };

      const exported = pdkService.exportForEDATool(mockModel, exportOptions);
      setExportedContent(exported);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [selectedProduct, exportOptions, pdkService]);

  const downloadExportedFile = useCallback(() => {
    if (!exportedContent) return;

    const blob = new Blob([exportedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spice_model_${selectedFoundry}_${selectedProcessNode}.${exportOptions.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportedContent, selectedFoundry, selectedProcessNode, exportOptions.format]);

  const copyToClipboard = useCallback(async () => {
    if (!exportedContent) return;
    
    try {
      await navigator.clipboard.writeText(exportedContent);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [exportedContent]);

  const getComplianceIcon = useCallback((score: number) => {
    if (score >= 90) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 70) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  }, []);

  const getComplianceColor = useCallback((score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  }, []);

  const formatTime = useCallback((timestamp: number) => {
    if (timestamp === 0) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  }, []);

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">PDK COMPATIBILITY VALIDATION</h1>
        <p className="page-description">
          Validate SPICE models against Process Design Kits (PDK) and export for EDA tools
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="responsive-grid-4">
        <div className="metric-card">
          <div className="unified-panel-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">TOTAL VALIDATIONS</p>
                <p className="metric-value">{compatibilityStats.totalValidations}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="unified-panel-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">SUCCESS RATE</p>
                <p className="metric-value text-green-600">
                  {compatibilityStats.totalValidations > 0 
                    ? Math.round((compatibilityStats.successfulValidations / compatibilityStats.totalValidations) * 100)
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
                <p className="metric-label">AVG COMPLIANCE</p>
                <p className="metric-value text-purple-600">
                  {Math.round(compatibilityStats.averageComplianceScore)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="unified-panel-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">LAST VALIDATION</p>
                <p className="metric-value text-orange-600">
                  {formatTime(compatibilityStats.lastValidationTime)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
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
              <Select
                value={selectedProduct?.id || ''}
                onValueChange={(value) => {
                  const product = availableProducts.find(p => p.id === value);
                  setSelectedProduct(product || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product to validate" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.manufacturer})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="form-description">
                Select a product from your database to validate against PDK
              </p>
            </div>

            {/* Foundry Selection */}
            <div className="form-group">
              <Label className="form-label">FOUNDRY</Label>
              <Select
                value={selectedFoundry}
                onValueChange={(value: FoundryType) => setSelectedFoundry(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(supportedFoundries).map((foundry) => (
                    <SelectItem key={foundry} value={foundry}>
                      {foundry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Process Node Selection */}
            <div className="form-group">
              <Label className="form-label">PROCESS NODE</Label>
              <Select
                value={selectedProcessNode}
                onValueChange={(value: ProcessNode) => setSelectedProcessNode(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {processNodes.map((node) => (
                    <SelectItem key={node} value={node}>
                      {node}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Export Options */}
            <div className="space-y-4">
              <Label className="form-label">EXPORT OPTIONS</Label>
              
              <div className="form-group">
                <Label className="form-label">EDA TOOL</Label>
                <Select
                  value={exportOptions.tool}
                  onValueChange={(value: EDATool) => 
                    setExportOptions(prev => ({ ...prev, tool: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {edaFormats.map((tool) => (
                      <SelectItem key={tool} value={tool}>
                        {tool}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="form-group">
                <Label className="form-label">FORMAT</Label>
                <Select
                  value={exportOptions.format}
                  onValueChange={(value) => 
                    setExportOptions(prev => ({ ...prev, format: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scs">Spectre (.scs)</SelectItem>
                    <SelectItem value="sp">SPICE (.sp)</SelectItem>
                    <SelectItem value="cir">Circuit (.cir)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="process-corners"
                    checked={exportOptions.includeProcessCorners}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeProcessCorners: checked }))
                    }
                  />
                  <Label htmlFor="process-corners" className="form-label">
                    Include Process Corners
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="temperature-range"
                    checked={exportOptions.includeTemperatureRange}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeTemperatureRange: checked }))
                    }
                  />
                  <Label htmlFor="temperature-range" className="form-label">
                    Include Temperature Range
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="monte-carlo"
                    checked={exportOptions.includeMonteCarlo}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeMonteCarlo: checked }))
                    }
                  />
                  <Label htmlFor="monte-carlo" className="form-label">
                    Include Monte Carlo Analysis
                  </Label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleValidation}
                disabled={!selectedProduct || isValidating}
                className="action-button-primary"
              >
                {isValidating ? (
                  <>
                    <Cpu className="h-4 w-4 mr-2 animate-spin" />
                    VALIDATING...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    VALIDATE PDK
                  </>
                )}
              </Button>

              <Button
                onClick={handleExport}
                disabled={!selectedProduct || isExporting}
                variant="outline"
                className="action-button-ghost"
              >
                {isExporting ? (
                  <>
                    <Cpu className="h-4 w-4 mr-2 animate-spin" />
                    EXPORTING...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    EXPORT MODEL
                  </>
                )}
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
                {/* Compliance Score */}
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    {getComplianceIcon(validationResult.complianceScore)}
                    <span className={`text-2xl font-bold font-mono ${getComplianceColor(validationResult.complianceScore)}`}>
                      {validationResult.complianceScore}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    PDK Compliance Score
                  </p>
                </div>

                <Separator />

                {/* Validation Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold font-mono text-[hsl(var(--foreground))]">VALIDATION DETAILS</h4>
                  
                  <div className="space-y-3">
                    {validationResult.issues.map((issue, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-md">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-mono text-[hsl(var(--foreground))]">{issue.description}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            Severity: {issue.severity} | Category: {issue.category}
                          </p>
                        </div>
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
                {exportedContent && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold font-mono text-[hsl(var(--foreground))]">EXPORTED MODEL</h4>
                        <div className="flex space-x-2">
                          <Button
                            onClick={copyToClipboard}
                            size="sm"
                            variant="outline"
                            className="action-button-ghost"
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            COPY
                          </Button>
                          <Button
                            onClick={downloadExportedFile}
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
                          {exportedContent}
                        </pre>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <Shield className="empty-state-icon" />
                <p className="empty-state-title">No validation results</p>
                <p className="empty-state-description">
                  Configure your settings and run a PDK validation to see results
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
                <p className="text-sm font-mono">PRODUCTS</p>
                <p className="text-xs text-muted-foreground font-mono">{availableProducts.length} available</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Target className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-mono">FOUNDRIES</p>
                <p className="text-xs text-muted-foreground font-mono">{Object.keys(supportedFoundries).length} supported</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 