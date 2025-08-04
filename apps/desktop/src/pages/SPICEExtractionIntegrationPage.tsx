import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, Tbody, Td, Th, Thead, Tr } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Cpu, 
  Database, 
  BarChart3, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Package, 
  Zap, 
  Search, 
  X,
  Play,
  Pause,
  RotateCcw,
  Eye,
  FileText,
  Settings,
  History,
  GitCompare
} from 'lucide-react';
import { spiceExtractionIntegrationService, SPICEExtractionRequest, SPICEExtractionResult, ModelVersion } from '../services/spiceExtractionIntegrationService';
import { productQueueIntegrationService, GraphExtractionJobRecord, GraphExtractionResultRecord } from '../services/productQueueIntegrationService';
import productManagementService, { ProductWithParameters } from '../services/productManagementService';
import '../styles/spice-extraction-integration.css';

const SPICEExtractionIntegrationPage: React.FC = () => {
  const [products, setProducts] = useState<ProductWithParameters[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithParameters | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'extractions' | 'models' | 'versions' | 'generate'>('overview');

  // SPICE extraction state
  const [extractionJobs, setExtractionJobs] = useState<GraphExtractionJobRecord[]>([]);
  const [spiceExtractions, setSpiceExtractions] = useState<SPICEExtractionResult[]>([]);
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([]);
  const [selectedJob, setSelectedJob] = useState<GraphExtractionJobRecord | null>(null);

  // Generation form state
  const [modelType, setModelType] = useState<'asm_hemt' | 'mvsg' | 'bsim' | 'custom'>('asm_hemt');
  const [modelFormat, setModelFormat] = useState<'EPC' | 'ASM' | 'MVSG' | 'BSIM' | 'generic'>('ASM');
  const [templateId, setTemplateId] = useState('asm_hemt_template');
  const [includeSubcircuit, setIncludeSubcircuit] = useState(false);
  const [includeComments, setIncludeComments] = useState(true);
  const [exportFormat, setExportFormat] = useState<'ltspice' | 'kicad' | 'generic'>('generic');
  const [parameterMapping, setParameterMapping] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.partNumber.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.manufacturer.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  // Load products
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const productsData = await productManagementService.getAllProducts();
      setProducts(productsData);
    } catch (error) {
      setError('Failed to load products');
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load extraction data for selected product
  const loadExtractionData = useCallback(async () => {
    if (!selectedProduct) return;

    try {
      // Load completed extraction jobs
      const jobs = await productQueueIntegrationService.getProductExtractionJobs(selectedProduct.id);
      const completedJobs = jobs.filter(job => job.status === 'completed');
      setExtractionJobs(completedJobs);

      // Load SPICE extractions
      const extractions = await spiceExtractionIntegrationService.getProductSPICEExtractions(selectedProduct.id);
      setSpiceExtractions(extractions);

      // Load model versions (mock data for now)
      setModelVersions([]);
    } catch (error) {
      console.error('Error loading extraction data:', error);
    }
  }, [selectedProduct]);

  // Handle product selection
  const handleProductSelect = (product: ProductWithParameters) => {
    setSelectedProduct(product);
    setProductSearchTerm(product.partNumber);
    setShowProductDropdown(false);
  };

  // Handle product search change
  const handleProductSearchChange = (value: string) => {
    setProductSearchTerm(value);
    setShowProductDropdown(value.length > 0);
  };

  // Handle SPICE model generation
  const handleGenerateSPICEModel = async () => {
    if (!selectedProduct || !selectedJob) {
      setError('Please select a product and extraction job');
      return;
    }

    try {
      setGenerating(true);
      setError('');

      const request: SPICEExtractionRequest = {
        productId: selectedProduct.id,
        jobId: selectedJob.id,
        modelType,
        modelFormat,
        templateId,
        includeSubcircuit,
        includeComments,
        exportFormat,
        parameterMapping
      };

      const result = await spiceExtractionIntegrationService.generateSPICEModel(request);
      
      // Refresh extractions list
      await loadExtractionData();
      
      // Switch to extractions tab to show the new result
      setActiveTab('extractions');
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate SPICE model');
      console.error('Error generating SPICE model:', error);
    } finally {
      setGenerating(false);
    }
  };

  // Handle model version creation
  const handleCreateVersion = async (extraction: SPICEExtractionResult) => {
    if (!extraction.generatedModel) return;

    try {
      const version = await spiceExtractionIntegrationService.createModelVersion(
        extraction.modelId,
        `v${Date.now()}`,
        ['Initial version from curve extraction'],
        'User'
      );
      
      setModelVersions(prev => [...prev, version]);
    } catch (error) {
      console.error('Error creating model version:', error);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'failed': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Play className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      case 'pending': return <Pause className="w-4 h-4" />;
      default: return <X className="w-4 h-4" />;
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  // Load data on mount and when selected product changes
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadExtractionData();
  }, [loadExtractionData]);

  if (loading) {
    return (
      <div className="spice-extraction-integration-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading SPICE extraction integration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="spice-extraction-integration-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <Cpu className="header-icon" />
            <h1>SPICE Extraction Integration</h1>
          </div>
          <p className="header-description">
            Generate SPICE models from extracted curve data with automatic parameter mapping and validation
          </p>
        </div>
      </div>

      {error && (
        <Alert className="error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="product-selection">
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search products by name, part number, or manufacturer..."
              value={productSearchTerm}
              onChange={(e) => handleProductSearchChange(e.target.value)}
              className="search-input"
            />
            {productSearchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setProductSearchTerm('');
                  setSelectedProduct(null);
                }}
                className="clear-button"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {showProductDropdown && filteredProducts.length > 0 && (
            <div className="product-dropdown">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="product-dropdown-item"
                  onClick={() => handleProductSelect(product)}
                >
                  <div className="product-info">
                    <div className="product-name">{product.name}</div>
                    <div className="product-details">
                      {product.partNumber} • {product.manufacturer} • {product.deviceType}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedProduct && (
          <div className="selected-product">
            <div className="product-card">
              <div className="product-header">
                <Package className="product-icon" />
                <div className="product-details">
                  <h3>{selectedProduct.name}</h3>
                  <p>{selectedProduct.partNumber} • {selectedProduct.manufacturer}</p>
                  <Badge variant="outline">{selectedProduct.deviceType}</Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedProduct && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="main-tabs">
          <TabsList className="tabs-list">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="extractions">SPICE Extractions</TabsTrigger>
            <TabsTrigger value="models">Generated Models</TabsTrigger>
            <TabsTrigger value="versions">Model Versions</TabsTrigger>
            <TabsTrigger value="generate">Generate Model</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="tab-content">
            <div className="overview-grid">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Extraction Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <div className="stat-value">{extractionJobs.length}</div>
                      <div className="stat-label">Completed Extractions</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">{spiceExtractions.length}</div>
                      <div className="stat-label">SPICE Models Generated</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">{modelVersions.length}</div>
                      <div className="stat-label">Model Versions</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">
                        {spiceExtractions.filter(e => e.status === 'completed').length}
                      </div>
                      <div className="stat-label">Successful Generations</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="activity-list">
                    {spiceExtractions.slice(0, 5).map((extraction) => (
                      <div key={extraction.id} className="activity-item">
                        <div className="activity-icon">
                          {getStatusIcon(extraction.status)}
                        </div>
                        <div className="activity-content">
                          <div className="activity-title">
                            SPICE Model Generation - {extraction.modelType}
                          </div>
                          <div className="activity-time">
                            {formatDate(extraction.createdAt)}
                          </div>
                        </div>
                        <Badge variant={getStatusColor(extraction.status) as any}>
                          {extraction.status}
                        </Badge>
                      </div>
                    ))}
                    {spiceExtractions.length === 0 && (
                      <div className="no-activity">
                        No SPICE extractions yet. Generate your first model!
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="extractions" className="tab-content">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  SPICE Extraction Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {spiceExtractions.length > 0 ? (
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Model Type</Th>
                        <Th>Status</Th>
                        <Th>Progress</Th>
                        <Th>Confidence</Th>
                        <Th>Created</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {spiceExtractions.map((extraction) => (
                        <Tr key={extraction.id}>
                          <Td>
                            <div className="model-info">
                              <div className="model-type">{extraction.modelType}</div>
                              <div className="model-format">{extraction.modelFormat}</div>
                            </div>
                          </Td>
                          <Td>
                            <Badge variant={getStatusColor(extraction.status) as any}>
                              {getStatusIcon(extraction.status)}
                              {extraction.status}
                            </Badge>
                          </Td>
                          <Td>
                            <div className="progress-container">
                              <Progress value={extraction.progress} className="progress-bar" />
                              <span className="progress-text">{extraction.progress}%</span>
                            </div>
                          </Td>
                          <Td>
                            <div className="confidence-display">
                              {Math.round(extraction.mappingConfidence * 100)}%
                            </div>
                          </Td>
                          <Td>{formatDate(extraction.createdAt)}</Td>
                          <Td>
                            <div className="action-buttons">
                              {extraction.status === 'completed' && (
                                <>
                                  <Button size="sm" variant="outline">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="outline">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleCreateVersion(extraction)}
                                  >
                                    <History className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {extraction.status === 'failed' && (
                                <Button size="sm" variant="outline">
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                ) : (
                  <div className="empty-state">
                    <Cpu className="empty-icon" />
                    <h3>No SPICE Extractions</h3>
                    <p>Generate your first SPICE model from extracted curve data</p>
                    <Button onClick={() => setActiveTab('generate')}>
                      Generate Model
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models" className="tab-content">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Generated SPICE Models
                </CardTitle>
              </CardHeader>
              <CardContent>
                {spiceExtractions.filter(e => e.status === 'completed').length > 0 ? (
                  <div className="models-grid">
                    {spiceExtractions
                      .filter(e => e.status === 'completed')
                      .map((extraction) => (
                        <Card key={extraction.id} className="model-card">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <span>{extraction.modelType.toUpperCase()}</span>
                              <Badge variant="outline">{extraction.modelFormat}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="model-details">
                              <div className="detail-item">
                                <span className="detail-label">Confidence:</span>
                                <span className="detail-value">
                                  {Math.round(extraction.mappingConfidence * 100)}%
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Processing Time:</span>
                                <span className="detail-value">
                                  {extraction.processingTime ? `${Math.round(extraction.processingTime / 1000)}s` : 'N/A'}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Errors:</span>
                                <span className="detail-value">
                                  {extraction.validationErrors.length}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Warnings:</span>
                                <span className="detail-value">
                                  {extraction.warnings.length}
                                </span>
                              </div>
                            </div>
                            <div className="model-actions">
                              <Button size="sm" variant="outline" className="w-full">
                                <Eye className="w-4 h-4 mr-2" />
                                View Model
                              </Button>
                              <Button size="sm" variant="outline" className="w-full">
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <FileText className="empty-icon" />
                    <h3>No Generated Models</h3>
                    <p>Complete a SPICE extraction to see generated models here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="versions" className="tab-content">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Model Versions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {modelVersions.length > 0 ? (
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Version</Th>
                        <Th>Changes</Th>
                        <Th>Created</Th>
                        <Th>Created By</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {modelVersions.map((version) => (
                        <Tr key={version.id}>
                          <Td>
                            <Badge variant="outline">{version.version}</Badge>
                          </Td>
                          <Td>
                            <div className="changes-list">
                              {version.changes.map((change, index) => (
                                <div key={index} className="change-item">
                                  {change}
                                </div>
                              ))}
                            </div>
                          </Td>
                          <Td>{formatDate(version.createdAt)}</Td>
                          <Td>{version.createdBy}</Td>
                          <Td>
                            <div className="action-buttons">
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <GitCompare className="w-4 h-4" />
                              </Button>
                            </div>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                ) : (
                  <div className="empty-state">
                    <History className="empty-icon" />
                    <h3>No Model Versions</h3>
                    <p>Create versions of your SPICE models to track changes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generate" className="tab-content">
            <div className="generate-grid">
              <Card className="generate-form">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Generate SPICE Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="form-section">
                    <h3>Select Extraction Job</h3>
                    <Select onValueChange={(value) => {
                      const job = extractionJobs.find(j => j.id === value);
                      setSelectedJob(job || null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a completed extraction job" />
                      </SelectTrigger>
                      <SelectContent>
                        {extractionJobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.extractionMethod} - {formatDate(job.completedAt || job.createdAt)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="form-section">
                    <h3>Model Configuration</h3>
                    <div className="form-grid">
                      <div className="form-field">
                        <label>Model Type</label>
                        <Select value={modelType} onValueChange={(value: any) => setModelType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asm_hemt">ASM-HEMT</SelectItem>
                            <SelectItem value="mvsg">MVSG</SelectItem>
                            <SelectItem value="bsim">BSIM</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="form-field">
                        <label>Model Format</label>
                        <Select value={modelFormat} onValueChange={(value: any) => setModelFormat(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ASM">ASM</SelectItem>
                            <SelectItem value="MVSG">MVSG</SelectItem>
                            <SelectItem value="BSIM">BSIM</SelectItem>
                            <SelectItem value="EPC">EPC</SelectItem>
                            <SelectItem value="generic">Generic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="form-field">
                        <label>Template ID</label>
                        <input
                          type="text"
                          value={templateId}
                          onChange={(e) => setTemplateId(e.target.value)}
                          placeholder="Template ID"
                          className="form-input"
                        />
                      </div>

                      <div className="form-field">
                        <label>Export Format</label>
                        <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="generic">Generic SPICE</SelectItem>
                            <SelectItem value="ltspice">LTSpice</SelectItem>
                            <SelectItem value="kicad">KiCad</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Options</h3>
                    <div className="options-grid">
                      <div className="option-item">
                        <Switch
                          checked={includeSubcircuit}
                          onCheckedChange={setIncludeSubcircuit}
                        />
                        <label>Include Subcircuit</label>
                      </div>
                      <div className="option-item">
                        <Switch
                          checked={includeComments}
                          onCheckedChange={setIncludeComments}
                        />
                        <label>Include Comments</label>
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Parameter Mapping</h3>
                    <Textarea
                      placeholder="Enter parameter mapping as JSON (e.g., {'V': 'VTH', 'I': 'IDSS'})"
                      value={JSON.stringify(parameterMapping, null, 2)}
                      onChange={(e) => {
                        try {
                          setParameterMapping(JSON.parse(e.target.value));
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                      className="parameter-mapping-input"
                    />
                  </div>

                  <div className="form-actions">
                    <Button
                      onClick={handleGenerateSPICEModel}
                      disabled={!selectedJob || generating}
                      className="generate-button"
                    >
                      {generating ? (
                        <>
                          <div className="spinner"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Generate SPICE Model
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="job-info">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Selected Job Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedJob ? (
                    <div className="job-details">
                      <div className="detail-item">
                        <span className="detail-label">Job ID:</span>
                        <span className="detail-value">{selectedJob.id}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Method:</span>
                        <span className="detail-value">{selectedJob.extractionMethod}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Priority:</span>
                        <span className="detail-value">
                          <Badge variant="outline">{selectedJob.priority}</Badge>
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Completed:</span>
                        <span className="detail-value">
                          {selectedJob.completedAt ? formatDate(selectedJob.completedAt) : 'N/A'}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Duration:</span>
                        <span className="detail-value">
                          {selectedJob.actualDuration ? `${Math.round(selectedJob.actualDuration / 1000)}s` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="no-job-selected">
                      <p>Select a completed extraction job to generate a SPICE model</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {!selectedProduct && (
        <div className="no-product-selected">
          <Cpu className="no-product-icon" />
          <h3>Select a Product</h3>
          <p>Choose a product to start generating SPICE models from extracted curve data</p>
        </div>
      )}
    </div>
  );
};

export default SPICEExtractionIntegrationPage; 