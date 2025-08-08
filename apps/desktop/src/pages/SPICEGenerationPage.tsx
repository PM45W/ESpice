import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardHeader, CardContent, CardTitle, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Alert, AlertDescription } from '@espice/ui';
import { parameterMappingService, SPICE_TEMPLATES } from '../services/spiceTemplates';
import { spiceModelGenerator } from '../services/spiceGenerator';
import type { Parameter, Product } from '../types/index';
import { Button, Switch, Textarea, Modal } from '@espice/ui';
import { Info, Cpu, Database, BarChart3, Download, AlertCircle, CheckCircle, Package, Zap, Search, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@espice/ui';
import { fetchProductParameters, BackendParameter } from '../services/batchService';
import { 
  ASM_HEMT_PARAMETERS, 
  ASM_HEMT_CATEGORIES, 
  getParameterByName, 
  getParametersByCategory,
  getRequiredParameters,
  validateParameterValue 
} from '../services/asmHemtParameters';
import { ASMSpiceExtractionService, ASMExtractionData } from '../services/asmSpiceExtractionService';
// Removed mock measurement data; availability will be based on actual product data presence
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
  const extractionServiceRef = useRef<ASMSpiceExtractionService | null>(null);
  if (!extractionServiceRef.current) extractionServiceRef.current = new ASMSpiceExtractionService();

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

  // Derive available measurement data based on persisted product characteristics
  useEffect(() => {
    if (!selectedProduct) {
      setAvailableMeasurementData([]);
      return;
    }
    const available = (selectedProduct.characteristics || [])
      .filter(c => c.csvData && c.csvData.length > 0)
      .map(c => c.type);
    setAvailableMeasurementData(available);
  }, [selectedProduct]);

  // Build ASMExtractionData from stored product characteristics (CSV rows)
  const buildExtractionDataFromProduct = useCallback((): ASMExtractionData => {
    const data: ASMExtractionData = {};
    if (!selectedProduct?.characteristics) return data;
    const getNum = (row: any, variants: string[], fallback?: number) => {
      for (const key of variants) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          const n = Number(row[key]);
          if (!Number.isNaN(n)) return n;
        }
      }
      return fallback as any;
    };
    const toLower = (s: any) => (typeof s === 'string' ? s.toLowerCase() : s);
    for (const c of selectedProduct.characteristics) {
      if (!c.csvData || c.csvData.length === 0) continue;
      const rows = c.csvData as any[];
      switch (c.type) {
        case 'output': {
          const vds: number[] = [];
          const id: number[] = [];
          const vgs: number[] = [];
          rows.forEach(r => {
            vds.push(getNum(r, ['vds','VDS','Vds','Vds(V)']));
            id.push(getNum(r, ['id','ID','Id','Id(A)']));
            vgs.push(getNum(r, ['vgs','VGS','Vgs','Vgs(V)']));
          });
          data.outputCharacteristics = { vds, id, vgs };
          break;
        }
        case 'transfer': {
          const vgs: number[] = [];
          const id: number[] = [];
          const temp: number[] = [];
          rows.forEach(r => {
            vgs.push(getNum(r, ['vgs','VGS','Vgs','Vgs(V)']));
            id.push(getNum(r, ['id','ID','Id','Id(A)']));
            temp.push(getNum(r, ['temp','Temp','TEMP','Temperature']));
          });
          data.transferCharacteristics = { vgs, id, temp };
          break;
        }
        case 'capacitance': {
          const entries = rows.map(r => ({
            vds: getNum(r, ['vds','VDS','Vds','Vds(V)']),
            c: getNum(r, ['c','C','cap','Capacitance','C(pF)']),
            type: toLower(r['type'] || r['TYPE'] || 'ciss') as 'ciss'|'coss'|'crss'
          }));
          data.capacitance = entries as any;
          break;
        }
        case 'rds_vgs_temp': {
          const vgs: number[] = [];
          const rds: number[] = [];
          const temp: number[] = [];
          rows.forEach(r => {
            vgs.push(getNum(r, ['vgs','VGS','Vgs']));
            rds.push(getNum(r, ['rds','RDS','Rds','Rds(Ω)','Rds(mΩ)'], NaN));
            temp.push(getNum(r, ['temp','Temp','TEMP','Temperature']));
          });
          data.rdsVgsTemp = { vgs, rds, temp };
          break;
        }
        case 'rds_vgs_current': {
          const vgs: number[] = [];
          const rds: number[] = [];
          let idConst: number = 0;
          rows.forEach(r => {
            vgs.push(getNum(r, ['vgs','VGS','Vgs']));
            rds.push(getNum(r, ['rds','RDS','Rds']));
            const idRow = getNum(r, ['id','ID','Id','Id(A)']);
            if (!Number.isNaN(idRow)) idConst = idRow;
          });
          data.rdsVgsId = { vgs, rds, id: idConst || 1.5 };
          break;
        }
        default:
          break;
      }
    }
    return data;
  }, [selectedProduct?.characteristics]);

  // Auto-extract ASM parameters from available CSVs
  useEffect(() => {
    const run = async () => {
      if (!selectedProduct) return;
      // Only run if at least one measurement exists
      if (availableMeasurementData.length === 0) return;
      try {
        const extractionData = buildExtractionDataFromProduct();
        const svc = extractionServiceRef.current!;
        const result = await svc.extractASMParameters(extractionData, selectedProduct as any);
        if (result?.success) {
          const extracted = svc.convertToSPICEParameters(result.parameters);
          setAsmParameters(prev => ({ ...prev, ...extracted }));
        }
      } catch (e) {
        // Silent failure; user can inspect console if needed
        console.warn('Auto-extraction failed:', e);
      }
    };
    void run();
  }, [selectedProduct?.id, availableMeasurementData.join('|')]);

  // Listen for external product characteristic updates (from ParameterInfoModal uploads/deletes)
  useEffect(() => {
    const handler = async (e: Event) => {
      try {
        // Refresh currently selected product to get latest characteristics
        if (selectedProduct?.id) {
          const updated = await productManagementService.getProduct(selectedProduct.id);
          if (updated) setSelectedProduct(updated);
        }
      } catch {}
    };
    window.addEventListener('espice:product-characteristics-updated', handler as EventListener);
    return () => {
      window.removeEventListener('espice:product-characteristics-updated', handler as EventListener);
    };
  }, [selectedProduct?.id]);

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

  // Remove parameters not allowed by the active template from the generated SPICE text
  function cleanSpiceParameters(spice: string, allowedNames: Set<string>): string {
    if (!spice) return spice;
    const lines = spice.split('\n');
    const cleaned: string[] = [];
    const assignRegex = /^\s*\+\s*([A-Za-z0-9_]+)\s*=/;
    for (const line of lines) {
      const m = line.match(assignRegex);
      if (m) {
        const name = m[1];
        if (allowedNames.has(name)) {
          cleaned.push(line);
        } else {
          // skip unknown param line
        }
      } else {
        cleaned.push(line);
      }
    }
    return cleaned.join('\n');
  }

  // Generate SPICE model text using the selected template, parameters, and product
  const spiceText = useMemo(() => {
    if (!selectedProduct || !selectedTemplate) return '';
    
    try {
      // Check if ASM HEMT template is selected
      if (selectedTemplate.id === 'asm-hemt-101.5.0') {
        const raw = generateASMHemtSpiceText(asmParameters, selectedProduct, { includeComments, includeSubcircuit });
        // Allow all ASM parameter names from ASM_HEMT_PARAMETERS
        const allowed = new Set(ASM_HEMT_PARAMETERS.map(p => p.name));
        return cleanSpiceParameters(raw, allowed);
      }
      
      // Use existing logic for other templates
      const mappings = parameterMappingService.mapParameters(backendParameters, selectedTemplate.id);
      const values = (spiceModelGenerator as any).generateParameterValues
        ? (spiceModelGenerator as any).generateParameterValues(mappings, selectedTemplate)
        : {};
      const raw = (spiceModelGenerator as any).generateSPICEText
        ? (spiceModelGenerator as any).generateSPICEText(selectedTemplate, values, selectedProduct, { modelName: selectedProduct.name, includeComments, includeSubcircuit })
        : '';
      // Permit only the parameters defined by the selected template
      const allowed = new Set(selectedTemplate.parameters.map(p => p.spiceName));
      return cleanSpiceParameters(raw, allowed);
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

  // CSV upload modal state and helpers
  const [noCsvModalOpen, setNoCsvModalOpen] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [outputCsvFile, setOutputCsvFile] = useState<File | null>(null);
  const [transferCsvFile, setTransferCsvFile] = useState<File | null>(null);
  const [capacitanceCsvFile, setCapacitanceCsvFile] = useState<File | null>(null);

  useEffect(() => {
    if (selectedProduct && availableMeasurementData.length === 0) {
      setNoCsvModalOpen(true);
    } else {
      setNoCsvModalOpen(false);
    }
  }, [selectedProduct, availableMeasurementData.length]);

  const parseCsvFile = async (file: File): Promise<any[]> => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = (values[idx] ?? '').trim();
      });
      rows.push(row);
    }
    return rows;
  };

  const handleBulkCsvUpload = async () => {
    if (!selectedProduct) return;
    try {
      setUploadingCsv(true);
      if (outputCsvFile) {
        const rows = await parseCsvFile(outputCsvFile);
        await productManagementService.uploadCharacteristicData(selectedProduct.id, {
          type: 'output',
          name: 'Output Characteristics',
          description: 'Drain current vs Drain-Source voltage at various gate voltages',
          csvData: rows,
        } as any);
      }
      if (transferCsvFile) {
        const rows = await parseCsvFile(transferCsvFile);
        await productManagementService.uploadCharacteristicData(selectedProduct.id, {
          type: 'transfer',
          name: 'Transfer Characteristics',
          description: 'Drain current vs Gate-Source voltage at various drain voltages',
          csvData: rows,
        } as any);
      }
      if (capacitanceCsvFile) {
        const rows = await parseCsvFile(capacitanceCsvFile);
        await productManagementService.uploadCharacteristicData(selectedProduct.id, {
          type: 'capacitance',
          name: 'Capacitance Characteristics',
          description: 'Input/Output/Reverse Transfer Capacitance vs VDS',
          csvData: rows,
        } as any);
      }
      const updated = await productManagementService.getProduct(selectedProduct.id);
      setSelectedProduct(updated);
      setNoCsvModalOpen(false);
    } catch (e) {
      console.error('CSV upload failed', e);
    } finally {
      setUploadingCsv(false);
    }
  };

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
    const hasValue = asmParameters[param.name] !== undefined && !Number.isNaN(asmParameters[param.name]);
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
    <div className="h-full flex flex-col">
      {/* Product and Model Selection Header */}
      <div className="bg-muted/20 border-b border-border p-4">
        <div className="mx-auto w-full max-w-7xl px-0">
          <div className="relative flex items-center justify-center">
            <div className="flex items-start gap-8 mx-auto">
              {/* Product Selection */}
              <div className="max-w-md w-[420px] relative" ref={productDropdownRef}>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
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
              <div className="max-w-md w-[420px] relative">
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  SPICE Model Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                >
                  {templateList.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} (v{template.version})
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                  <div className="mt-2 text-xs text-gray-600">
                    <span className="font-medium">Type:</span> {selectedTemplate.modelType} • 
                    <span className="font-medium ml-2">Parameters:</span> {selectedTemplate.parameters?.length || 0}
                  </div>
                )}
              </div>
            </div>

            {/* Floating Controls Toggle */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
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
      <div className="flex flex-row gap-4 items-stretch w-full h-full min-w-0 overflow-hidden p-4 max-w-7xl mx-auto">
        {/* Left: ASM HEMT Parameters Only - Made wider */}
        <div className="flex flex-col w-[560px] min-w-0 max-w-full overflow-hidden" style={{ fontSize: '0.92rem' }}>
          {/* ASM HEMT Parameters Section */}
          <Card className="min-w-0 max-w-full overflow-hidden h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  ASM HEMT Parameters
                </CardTitle>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-48 h-8 text-xs px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  >
                    <option value="all">All Categories</option>
                    {Object.entries(ASM_HEMT_CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 max-w-full overflow-y-auto flex-1">
              <div className="space-y-4">
                {/* Instructions */}
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Info className="w-3 h-3" />
                    <span>💡 <strong>Tip:</strong> Double-click any parameter row to view detailed information</span>
                  </div>
                </div>
                
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

                {/* Parameters Table - Removed Info column and made rows clickable */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-normal break-words">Parameter</TableHead>
                        <TableHead className="whitespace-normal break-words">Value</TableHead>
                        <TableHead className="whitespace-normal break-words">Unit</TableHead>
                        <TableHead className="whitespace-normal break-words">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredParameters().map((param) => {
                        const status = getParameterStatus(param);
                        const raw = asmParameters[param.name];
                        const value = raw === undefined || raw === null || Number.isNaN(raw) ? NaN : raw;
                        
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
                          <TableRow 
                            key={param.name} 
                            className="hover:bg-gray-50 cursor-pointer transition-colors group"
                            onDoubleClick={() => handleParameterClick(param.name)}
                            title="Double-click to view parameter information"
                          >
                            <TableCell className="whitespace-normal break-words">
                              <div className="flex items-center gap-2">
                                <div className="text-left font-medium group-hover:text-blue-600 transition-colors break-words">
                                  {param.name}
                                </div>
                                <Info className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="text-xs text-gray-500 mt-1 break-words">
                                {param.required && <span className="text-red-500 mr-2">Required</span>}
                                {param.category}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={Number.isNaN(value) ? '' : value}
                                  placeholder="N/A"
                                  onChange={(e) => {
                                    const v = e.target.value.trim();
                                    if (v === '') {
                                      // Treat empty as N/A (unset)
                                      setAsmParameters(prev => {
                                        const copy = { ...prev };
                                        delete copy[param.name];
                                        return copy;
                                      });
                                      return;
                                    }
                                    const parsed = parseFloat(v);
                                    if (!Number.isNaN(parsed)) handleParameterValueChange(param.name, parsed);
                                  }}
                                  className="w-full px-2 py-1 text-xs border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                                  step="any"
                                  onClick={(e) => e.stopPropagation()} // Prevent row click when clicking input
                                />
                                {Number.isNaN(value) && (
                                  <span className="text-[10px] text-muted-foreground">N/A</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-gray-600 whitespace-normal break-words">{param.unit}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {getStatusIcon()}
                                <span className="text-xs">{getStatusText()}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
              </div>
            </div>
            </CardContent>
          </Card>
        </div>
        {/* Right: Model Preview Only - Adjusted for wider left panel */}
         <div className="flex flex-col flex-1 min-w-0 max-w-full overflow-hidden" style={{ fontSize: '0.92rem' }}>
           <Card className="min-w-0 max-w-full overflow-hidden h-full flex flex-col">
              <CardHeader>
               <CardTitle className="text-base">SPICE Model Preview</CardTitle>
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
        {/* Missing data notice */}
        {selectedProduct && availableMeasurementData.length === 0 && (
          <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-800 text-sm">
            No extracted CSV data found for this product. Upload a CSV manually or extract from graph images.
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => (window.location.href = `/products/${selectedProduct.id}`)}>Upload CSV</Button>
              <Button size="sm" onClick={() => (window.location.href = `/graph-extraction?productId=${selectedProduct.id}`)}>Open Graph Extraction</Button>
              <Button size="sm" variant="outline" onClick={() => setNoCsvModalOpen(true)}>Upload Now</Button>
            </div>
          </div>
        )}
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

      {/* CSV Upload Modal for missing data */}
      {noCsvModalOpen && (
        <Modal open={noCsvModalOpen} onClose={() => setNoCsvModalOpen(false)} title="Upload Measurement CSVs">
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">Upload extracted CSVs for graphs to enable accurate SPICE generation, or proceed to Graph Extraction.</p>
            <div className="space-y-2">
              <label className="font-medium">Output Characteristics (Vds–Id, per Vgs)</label>
              <input type="file" accept=".csv" onChange={(e) => setOutputCsvFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <label className="font-medium">Transfer Characteristics (Vgs–Id, per Temp/Vds)</label>
              <input type="file" accept=".csv" onChange={(e) => setTransferCsvFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <label className="font-medium">Capacitance (Ciss/Coss/Crss vs Vds)</label>
              <input type="file" accept=".csv" onChange={(e) => setCapacitanceCsvFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleBulkCsvUpload} disabled={uploadingCsv}>{uploadingCsv ? 'Uploading…' : 'Save CSVs'}</Button>
              <Button size="sm" variant="secondary" onClick={() => (window.location.href = `/graph-extraction${selectedProduct ? `?productId=${selectedProduct.id}` : ''}`)}>Open Graph Extraction</Button>
              <Button size="sm" variant="outline" onClick={() => setNoCsvModalOpen(false)}>Close</Button>
            </div>
          </div>
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