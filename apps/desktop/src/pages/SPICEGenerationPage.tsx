import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, Tbody, Td, Th, Thead, Tr } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { parameterMappingService, SPICE_TEMPLATES } from '../services/spiceTemplates';
import { spiceModelGenerator } from '../services/spiceGenerator';
import type { Parameter, Product } from '../types/index';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import Modal from '../components/ui/modal';
import { Info, Cpu, Database, BarChart3, Download, AlertCircle, CheckCircle, Package, Zap, Search, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '../components/ui/popover';
import { fetchProductParameters, BackendParameter } from '../services/batchService';
import { 
  ASM_HEMT_PARAMETERS, 
  ASM_HEMT_CATEGORIES, 
  getParameterByName, 
  getParametersByCategory,
  getRequiredParameters,
  validateParameterValue 
} from '../services/asmHemtParameters';
import { 
  getMeasurementDataByType, 
  measurementDataToCSV, 
  getAvailableMeasurementData 
} from '../data/mockMeasurementData';
import ParameterInfoModal from '../components/ParameterInfoModal';
import { ProductSpiceSyncService } from '../services/productSpiceSync';
import productManagementService, { ProductWithParameters } from '../services/productManagementService';

function safeString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  try {
    return JSON.stringify(val);
  } catch {
    return '[circular or proxy]';
  }
}





const templateList = Object.values(SPICE_TEMPLATES);

// Export helpers
function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export default function SPICEGenerationPage() {
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateList[0].id);
  const [includeComments, setIncludeComments] = useState(true);
  const [includeSubcircuit, setIncludeSubcircuit] = useState(false);

  const selectedTemplate = useMemo(() => templateList.find(t => t.id === selectedTemplateId), [selectedTemplateId]);
  const [backendParameters, setBackendParameters] = useState<BackendParameter[]>([]);
  const [loadingParams, setLoadingParams] = useState(false);
  const [paramError, setParamError] = useState<string | null>(null);

  // ASM HEMT specific state
  const [selectedParameter, setSelectedParameter] = useState<string | null>(null);
  const [parameterInfoModalOpen, setParameterInfoModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [asmParameters, setAsmParameters] = useState<Record<string, number>>({});
  const [availableMeasurementData, setAvailableMeasurementData] = useState<string[]>([]);
  const [syncData, setSyncData] = useState<any>(null);
  const [extractionRecommendations, setExtractionRecommendations] = useState<any[]>([]);
  const [syncStatusMinimized, setSyncStatusMinimized] = useState(true);
  const [validationMinimized, setValidationMinimized] = useState(true);

  // Product management integration
  const [products, setProducts] = useState<ProductWithParameters[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithParameters | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      product.partNumber.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      product.manufacturer.toLowerCase().includes(productSearchTerm.toLowerCase())
    );
  }, [products, productSearchTerm]);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load products from product management database
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const productsData = await productManagementService.getProducts();
        setProducts(productsData);
        
        // Set first product as default if available
        if (productsData.length > 0 && !selectedProductId) {
          setSelectedProductId(productsData[0].id);
          setSelectedProduct(productsData[0]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading products:', error);
        setLoading(false);
      }
    };
    
    loadProducts();
  }, []);

  // Update selected product when selectedProductId changes
  useEffect(() => {
    const product = products.find(p => p.id === selectedProductId);
    setSelectedProduct(product || null);
  }, [selectedProductId, products]);

  useEffect(() => {
    setLoadingParams(true);
    setParamError(null);
    fetchProductParameters(selectedProductId)
      .then(params => {
        setBackendParameters(params);
        setLoadingParams(false);
      })
      .catch(err => {
        setParamError('Failed to load parameters');
        setLoadingParams(false);
      });
  }, [selectedProductId]);

  // Load available measurement data for the selected product
  useEffect(() => {
    const availableData = getAvailableMeasurementData(selectedProductId);
    setAvailableMeasurementData(availableData);
  }, [selectedProductId]);

  // Initialize ASM parameters with default values
  useEffect(() => {
    const defaultParams: Record<string, number> = {};
    ASM_HEMT_PARAMETERS.forEach(param => {
      defaultParams[param.name] = param.defaultValue;
    });
    setAsmParameters(defaultParams);
  }, []);

  // Load synchronization data
  useEffect(() => {
    const loadSyncData = async () => {
      try {
        const data = await ProductSpiceSyncService.getProductSyncData(selectedProductId);
        setSyncData(data);
        
        const recommendations = await ProductSpiceSyncService.getExtractionRecommendations(selectedProductId);
        setExtractionRecommendations(recommendations);
      } catch (error) {
        console.error('Error loading sync data:', error);
      }
    };
    
    loadSyncData();
  }, [selectedProductId]);

  // Map backendParameters to parameterMappings for the table
  const parameterMappings = useMemo(() => {
    // Map backend parameters to Parameter type with correct units for mapping
    const paramUnitMap: Record<string, string> = {
      'RDS_ON': 'Ohms',
      'VTH': 'V',
      'IDSS': 'A',
      'BVDSS': 'V',
      'CGS': 'F',
      'CGD': 'F',
      'SS': 'V/dec',
      'GM': 'S',
      'vto': 'V',
      'cg': 'F/m^2',
      'vx0': 'm/s',
      'mu0': 'm^2/Vs',
      'rsh': 'Ohms/Sq',
      'ss': 'V/dec',
    };
    return backendParameters.map(param => ({
      spiceParam: {
        spiceName: param.name,
        unit: paramUnitMap[param.name] || '',
      },
      datasheetParam: {
        name: param.name,
        value: Array.isArray(param.values) ? param.values.join(', ') : param.values,
        extractedFrom: 'graph', // Assume from graph for mockup
        pageNumber: undefined,
        confidence: 1,
        productId: selectedProductId,
        id: param.name,
        unit: paramUnitMap[param.name] || '',
        category: 'electrical',
        createdAt: new Date(),
      },
      source: param.source,
      type: param.type,
      label: param.label,
    }));
  }, [backendParameters, selectedProductId]);

  // Generate ASM HEMT SPICE text from parameters
  const generateASMHemtSpiceText = (parameters: Record<string, number>, product: ProductWithParameters | null, options: { includeComments: boolean, includeSubcircuit: boolean }) => {
    if (!product) return 'No product selected.';
    
    const modelName = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_ASM_HEMT`;
    const subcircuitName = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_ASM_SUBCKT`;
    
    let spiceText = '';
    
    // Add header
    if (options.includeComments) {
      spiceText += `* ASM-HEMT Model for ${product.name}\n`;
      spiceText += `* Manufacturer: ${product.manufacturer}\n`;
      spiceText += `* Generated on: ${new Date().toISOString().split('T')[0]}\n`;
      spiceText += `* Model Version: 101.5.0\n\n`;
    }
    
    // Add model definition
    spiceText += `.MODEL ${modelName} ASMHEMT(\n`;
    
    // Add parameters in a structured way
    const paramEntries = Object.entries(parameters);
    paramEntries.forEach(([paramName, value], index) => {
      const isLast = index === paramEntries.length - 1;
      spiceText += `+ ${paramName}=${value}${isLast ? '' : '\n'}`;
    });
    
    spiceText += `)\n\n`;
    
    // Add subcircuit if requested
    if (options.includeSubcircuit) {
      spiceText += `.SUBCKT ${subcircuitName} D G S\n`;
      spiceText += `+ M1 D G S S ${modelName}\n`;
      spiceText += `.ENDS ${subcircuitName}\n`;
    }
    
    return spiceText;
  };

  // Generate SPICE model text using the selected template, parameters, and product
  const spiceText = useMemo(() => {
    if (!selectedProduct || !selectedTemplate) return '';
    
    try {
      // Check if ASM HEMT template is selected
      if (selectedTemplate.id === 'asm-hemt-101.5.0') {
        return generateASMHemtSpiceText(asmParameters, selectedProduct, { includeComments, includeSubcircuit });
      }
      
      // Use existing logic for other templates
      const mappings = parameterMappingService.mapParameters(backendParameters, selectedTemplate.id);
      const values = (spiceModelGenerator as any).generateParameterValues
        ? (spiceModelGenerator as any).generateParameterValues(mappings, selectedTemplate)
        : {};
      return (spiceModelGenerator as any).generateSPICEText
        ? (spiceModelGenerator as any).generateSPICEText(selectedTemplate, values, selectedProduct, { modelName: selectedProduct.name, includeComments, includeSubcircuit })
        : '';
    } catch {
      return '';
    }
  }, [selectedProduct, selectedTemplate, backendParameters, asmParameters, includeComments, includeSubcircuit]);

  // Validate the generated SPICE text
  const validation = useMemo(() => {
    if (!spiceText) return null;
    try {
      return spiceModelGenerator.validateSPICEText(spiceText);
    } catch {
      return null;
    }
  }, [spiceText]);

  // Calculate mapping confidence and coverage
  const mappingStats = useMemo(() => {
    if (!selectedTemplate) return { confidence: 0, mapped: 0, required: 0 };
    const requiredParams = selectedTemplate.parameters.filter(p => p.required);
    const mappedRequired = parameterMappings.filter(m => m.spiceParam.required);
    const confidence = parameterMappings.length > 0
      ? parameterMappings.reduce((sum, m) => sum + m.confidence, 0) / parameterMappings.length
      : 0;
    return {
      confidence,
      mapped: mappedRequired.length,
      required: requiredParams.length
    };
  }, [parameterMappings, selectedTemplate]);

  function handleExportSpice() {
    if (!spiceText) return;
    downloadFile(`${selectedProduct?.name || 'spice_model'}.sp`, spiceText, 'text/plain');
    setExportSuccess('SPICE model exported as .sp');
  }
  function handleExportTxt() {
    if (!spiceText) return;
    downloadFile(`${selectedProduct?.name || 'spice_model'}.txt`, spiceText, 'text/plain');
    setExportSuccess('SPICE model exported as .txt');
  }
  function handleExportJson() {
    if (!selectedProduct || !selectedTemplate) return;
    const mappings = parameterMappingService.mapParameters(backendParameters, selectedTemplate.id);
    const values = (spiceModelGenerator as any).generateParameterValues
      ? (spiceModelGenerator as any).generateParameterValues(mappings, selectedTemplate)
      : {};
    downloadFile(`${selectedProduct.name || 'spice_model'}.json`, JSON.stringify(values, null, 2), 'application/json');
    setExportSuccess('Parameter values exported as .json');
  }

  // Feedback form state
  const [feedback, setFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedbackSubmitted(true);
    setFeedback('');
  }

  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [troubleshootingOpen, setTroubleshootingOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // ASM HEMT helper functions
  const handleParameterClick = (paramName: string) => {
    setSelectedParameter(paramName);
    setParameterInfoModalOpen(true);
  };

  const handleParameterValueChange = (paramName: string, value: number) => {
    const validation = validateParameterValue(paramName, value);
    if (validation.valid) {
      setAsmParameters(prev => ({ ...prev, [paramName]: value }));
    } else {
      // In a real implementation, you might want to show an error message
      console.warn(`Invalid value for ${paramName}: ${validation.message}`);
    }
  };

  const handleProductSelect = (product: ProductWithParameters) => {
    setSelectedProduct(product);
    setSelectedProductId(product.id);
    setProductSearchTerm(product.name);
    setShowProductDropdown(false);
  };

  const handleProductSearchChange = (value: string) => {
    setProductSearchTerm(value);
    setShowProductDropdown(true);
    if (!value.trim()) {
      setShowProductDropdown(false);
    }
  };

  const getFilteredParameters = () => {
    if (selectedCategory === 'all') {
      return ASM_HEMT_PARAMETERS;
    }
    return getParametersByCategory(selectedCategory);
  };

  const getParameterStatus = (param: any) => {
    const hasValue = asmParameters[param.name] !== undefined;
    const isRequired = param.required;
    const hasMeasurementData = Object.entries(param.measurementData).some(([key, required]) => {
      if (!required) return false;
      return availableMeasurementData.includes(key);
    });

    if (isRequired && !hasValue) return 'missing';
    if (isRequired && !hasMeasurementData) return 'no-data';
    if (hasValue && hasMeasurementData) return 'complete';
    return 'partial';
  };

  const [showControls, setShowControls] = useState(false);

  return (
    <div className="h-screen flex flex-col">
      {/* Product and Model Selection Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-8 flex-1">
              {/* Product Selection */}
              <div className="flex-1 max-w-md relative" ref={productDropdownRef}>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Product Selection
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      type="text"
                      placeholder={loading ? "Loading products..." : "Search products..."}
                      value={productSearchTerm}
                      onChange={(e) => handleProductSearchChange(e.target.value)}
                      onFocus={() => setShowProductDropdown(true)}
                      className="w-full pl-10 pr-10 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                      disabled={loading}
                    />
                    {productSearchTerm && (
                      <button
                        onClick={() => {
                          setProductSearchTerm('');
                          setSelectedProduct(null);
                          setSelectedProductId('');
                          setShowProductDropdown(false);
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Dropdown */}
                  {showProductDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map(product => (
                          <button
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className="w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{product.name}</span>
                              <span className="text-xs text-muted-foreground">{product.manufacturer} • {product.deviceType}</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-muted-foreground text-sm">
                          No products found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {selectedProduct && (
                  <div className="mt-2 text-xs text-gray-600">
                    <span className="font-medium">Part Number:</span> {selectedProduct.partNumber} • 
                    <span className="font-medium ml-2">Package:</span> {selectedProduct.package}
                  </div>
                )}
              </div>

              {/* Model Template Selection */}
              <div className="flex-1 max-w-md relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  SPICE Model Template
                </label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="w-full h-10 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground">
                    <SelectValue placeholder="Select a template" className="text-foreground" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border rounded-lg shadow-xl max-h-60">
                    {templateList.map(template => (
                      <SelectItem key={template.id} value={template.id} className="hover:bg-muted cursor-pointer">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{template.name}</span>
                          <span className="text-xs text-muted-foreground">Version {template.version}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <div className="mt-2 text-xs text-gray-600">
                    <span className="font-medium">Type:</span> {selectedTemplate.modelType} • 
                    <span className="font-medium ml-2">Parameters:</span> {selectedTemplate.parameters?.length || 0}
                  </div>
                )}
              </div>
            </div>

            {/* Floating Controls Toggle */}
            <div className="ml-4">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowControls(!showControls)}
                className="rounded-lg px-3 py-2 shadow-sm bg-background/90 backdrop-blur-sm border-border hover:border-border/80"
              >
                ⚙️ Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Controls Panel */}
      {showControls && (
        <div className="absolute top-24 right-4 z-20 bg-background/95 backdrop-blur-sm rounded-lg shadow-xl border border-border p-4 min-w-[280px]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
              <button
                onClick={() => setShowControls(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={() => setWorkflowOpen(true)}>Show Workflow</Button>
              <Button size="sm" variant="outline" onClick={() => setTroubleshootingOpen(true)}>Troubleshooting</Button>
              <Button size="sm" variant="outline" onClick={() => setFeedbackOpen(true)}>Feedback</Button>
            </div>
          </div>
        </div>
      )}

      {/* Main horizontal layout for major functions */}
      <div className="flex flex-row gap-4 items-stretch w-full h-full min-w-0 overflow-hidden p-4">
        {/* Left: ASM HEMT Parameters Only */}
        <div className="flex flex-col w-96 min-w-0 max-w-full overflow-hidden" style={{ fontSize: '0.92rem' }}>
          {/* ASM HEMT Parameters Section */}
          <Card className="min-w-0 max-w-full overflow-hidden h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  ASM HEMT Parameters
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-40 h-8 text-xs px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground">
                      <SelectValue placeholder="Filter by category" className="text-foreground" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border rounded-lg shadow-xl max-h-60">
                      <SelectItem value="all" className="text-xs hover:bg-muted cursor-pointer">All Categories</SelectItem>
                      {Object.entries(ASM_HEMT_CATEGORIES).map(([key, label]) => (
                        <SelectItem key={key} value={key} className="text-xs hover:bg-muted cursor-pointer">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 max-w-full overflow-y-auto flex-1">
              <div className="space-y-4">
                {/* Measurement Data Status */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Available Measurement Data</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableMeasurementData.map(dataType => (
                      <span key={dataType} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {dataType}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Parameters Table */}
                <div className="overflow-x-auto">
                  <Table>
                  <Thead>
                    <Tr>
                      <Th>Parameter</Th>
                      <Th>Value</Th>
                      <Th>Unit</Th>
                      <Th>Status</Th>
                      <Th>Info</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {getFilteredParameters().map((param) => {
                      const status = getParameterStatus(param);
                      const value = asmParameters[param.name] || param.defaultValue;
                      
                      const getStatusIcon = () => {
                        switch (status) {
                          case 'complete':
                            return <CheckCircle className="w-4 h-4 text-green-500" />;
                          case 'missing':
                            return <AlertCircle className="w-4 h-4 text-red-500" />;
                          case 'no-data':
                            return <AlertCircle className="w-4 h-4 text-orange-500" />;
                          default:
                            return <AlertCircle className="w-4 h-4 text-yellow-500" />;
                        }
                      };

                      const getStatusText = () => {
                        switch (status) {
                          case 'complete':
                            return 'Complete';
                          case 'missing':
                            return 'Missing';
                          case 'no-data':
                            return 'No Data';
                          default:
                            return 'Partial';
                        }
                      };

                      return (
                        <Tr key={param.name} className="hover:bg-gray-50">
                          <Td className="max-w-[200px]">
                            <button
                              onClick={() => handleParameterClick(param.name)}
                              className="text-left hover:text-blue-600 transition-colors font-medium"
                            >
                              {param.name}
                            </button>
                            <div className="text-xs text-gray-500 mt-1">
                              {param.required && <span className="text-red-500 mr-2">Required</span>}
                              {param.category}
                            </div>
                          </Td>
                          <Td>
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => handleParameterValueChange(param.name, parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-xs border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                              step="any"
                            />
                          </Td>
                          <Td className="text-xs text-gray-600">{param.unit}</Td>
                          <Td>
                            <div className="flex items-center gap-1">
                              {getStatusIcon()}
                              <span className="text-xs">{getStatusText()}</span>
                            </div>
                          </Td>
                          <Td>
                            <button
                              onClick={() => handleParameterClick(param.name)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              <Info className="w-4 h-4 text-blue-600" />
                            </button>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </div>
            </div>
            </CardContent>
          </Card>
        </div>
        {/* Right: Model Preview Only */}
         <div className="flex flex-col flex-1 min-w-0 max-w-full overflow-hidden" style={{ fontSize: '0.92rem' }}>
           <Card className="min-w-0 max-w-full overflow-hidden h-full flex flex-col">
             <CardHeader>
               <CardTitle className="text-base truncate">SPICE Model Preview</CardTitle>
             </CardHeader>
             <CardContent className="min-w-0 max-w-full overflow-x-auto flex-1 flex flex-col">
               {/* Advanced Options */}
               <div className="flex flex-row gap-4 items-center mb-4">
                 <div className="flex items-center gap-2">
                   <Switch checked={includeComments} onCheckedChange={setIncludeComments} id="include-comments" />
                   <label htmlFor="include-comments" className="text-sm">Include Comments</label>
                 </div>
                 <div className="flex items-center gap-2">
                   <Switch checked={includeSubcircuit} onCheckedChange={setIncludeSubcircuit} id="include-subckt" />
                   <label htmlFor="include-subckt" className="text-sm">Include Subcircuit</label>
                 </div>
               </div>
               <div className="flex flex-row gap-2 mb-4">
                 <Button onClick={handleExportSpice} size="sm">Export as .sp</Button>
                 <Button onClick={handleExportTxt} size="sm" variant="secondary">Export as .txt</Button>
                 <Button onClick={handleExportJson} size="sm" variant="outline">Export as .json</Button>
               </div>
               {exportSuccess && (
                 <div className="mb-4 p-2 rounded bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-xs font-mono border border-[hsl(var(--border))]">
                   {exportSuccess}
                 </div>
               )}
               {/* SPICE Model Text */}
               <div className="flex-1 overflow-auto">
                 <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-w-full h-full"><code>{spiceText}</code></pre>
               </div>
             </CardContent>
           </Card>
         </div>
      </div>
      {/* Workflow Modal */}
      {workflowOpen && (
        <Modal open={workflowOpen} onClose={() => setWorkflowOpen(false)} title="SPICE Model Generation Workflow">
          <ul className="list-disc ml-6 text-sm space-y-1">
            <li>Select a product and a SPICE template to begin.</li>
            <li>Review the parameter mapping between datasheet and SPICE model.</li>
            <li>Preview the generated SPICE model and validate for errors or warnings.</li>
            <li>Use advanced options to customize the output (comments, subcircuit).</li>
            <li>Export the SPICE model in your preferred format.</li>
            <li><strong>Tip:</strong> For best results, ensure your datasheet parameters are accurate and complete.</li>
          </ul>
        </Modal>
      )}
      {/* Troubleshooting Modal */}
      {troubleshootingOpen && (
        <Modal open={troubleshootingOpen} onClose={() => setTroubleshootingOpen(false)} title="Troubleshooting & Help">
          <ul className="list-disc ml-6 text-sm space-y-1">
            <li><strong>Invalid .MODEL syntax:</strong> Check that all required parameters are mapped and values are valid. See <a href="#" className="underline text-blue-600">SPICE Model Syntax Guide</a>.</li>
            <li><strong>Missing Parameters:</strong> Ensure your datasheet includes all required electrical characteristics.</li>
            <li><strong>Export Issues:</strong> If the exported file is empty or corrupt, try regenerating the model or check your browser's download settings.</li>
            <li><strong>Need more help?</strong> See the <a href="#" className="underline text-blue-600">Full Documentation</a> or <a href="#" className="underline text-blue-600">Contact Support</a>.</li>
          </ul>
        </Modal>
      )}
      {/* Feedback Modal */}
      {feedbackOpen && (
        <Modal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} title="Feedback">
          {feedbackSubmitted ? (
            <div className="text-green-600">Thank you for your feedback!</div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="flex flex-col gap-2">
              <Textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Let us know if you have suggestions, issues, or requests..."
                rows={3}
                className="resize-none"
                required
              />
              <Button type="submit" className="self-start">Submit Feedback</Button>
            </form>
          )}
        </Modal>
      )}

      {/* Parameter Info Modal */}
      <ParameterInfoModal
        parameter={selectedParameter ? getParameterByName(selectedParameter) || null : null}
        isOpen={parameterInfoModalOpen}
        onClose={() => setParameterInfoModalOpen(false)}
        productId={selectedProductId}
      />
    </div>
  );
} 