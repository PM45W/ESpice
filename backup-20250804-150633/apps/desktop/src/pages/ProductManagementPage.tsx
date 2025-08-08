import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Download, 
  Upload, 
  Search, 
  Filter, 
  Settings, 
  FileText, 
  Zap,
  Database,
  Cpu,
  Layers,
  CheckCircle,
  AlertCircle,
  Clock,
  Play,
  RefreshCw,
  Eye,
  ExternalLink,
  BarChart3,
  Image as ImageIcon,
  List,
  FileCode,
  BarChart,
  Info,
  FileSpreadsheet,
  Activity,
  Target,
  ArrowLeft,
  Grid3X3,
  FileText as FileTextIcon,
  BarChart2
} from 'lucide-react';

// Service imports
import productManagementService, { ProductWithParameters, ProductCreateInput } from '../services/productManagementService';
import { productQueueIntegrationService, GraphImageRecord, GraphExtractionJobRecord, GraphExtractionResultRecord } from '../services/productQueueIntegrationService';
import { spiceExtractionIntegrationService, SPICEExtractionRequest, SPICEExtractionResult, ModelVersion } from '../services/spiceExtractionIntegrationService';
import CSVImportModal from '../components/CSVImportModal';
import DatasheetUploadModal from '../components/DatasheetUploadModal';
import ProductDataUploadModal, { CharacteristicData } from '../components/ProductDataUploadModal';
import type { DatasheetExtractionResult } from '../services/datasheetImageExtractionService';
import EnhancedGraphExtractionService from '../services/enhancedGraphExtractionService';
import EnhancedBatchProcessingService from '../services/enhancedBatchProcessingService';
import MultiImageUpload from '../components/MultiImageUpload';
import GraphImageGallery from '../components/GraphImageGallery';
import GraphImageService, { GraphImage } from '../services/graphImageService';

// UI components
import { Badge } from '../components/ui/badge';

// CSS imports
import '../styles/buttons.css';
import '../styles/tables.css';
import '../styles/product-queue-integration.css';
import '../styles/spice-extraction-integration.css';

interface ProductManagementPageProps {
  // Add any props if needed
}

interface SPICEModelTemplate {
  id: string;
  name: string;
  description: string;
  modelType: string;
  parameters: any[];
}

interface ExtractionJob {
  id: string;
  productId: string;
  status: string;
  modelType: string;
  createdAt: Date;
}

const ProductManagementPage: React.FC<ProductManagementPageProps> = () => {
  // Main view state - Product list or Product detail
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithParameters | null>(null);
  
  // Product detail tab state
  const [activeProductTab, setActiveProductTab] = useState<'overview' | 'specifications' | 'parameters' | 'datasheet' | 'curves'>('overview');
  
  // Products list state
  const [products, setProducts] = useState<ProductWithParameters[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithParameters[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [showCSVImportModal, setShowCSVImportModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedProductsForDelete, setSelectedProductsForDelete] = useState<Set<string>>(new Set());
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showAutoScrapeModal, setShowAutoScrapeModal] = useState(false);
  const [showDatasheetUploadModal, setShowDatasheetUploadModal] = useState(false);
  const [showProductDataUploadModal, setShowProductDataUploadModal] = useState(false);
  const [autoScrapingConfig, setAutoScrapingConfig] = useState({
    manufacturer: 'EPC',
    category: '',
    maxProducts: 50
  });
  const [extractionJobs, setExtractionJobs] = useState<ExtractionJob[]>([]);
  const [templates, setTemplates] = useState<SPICEModelTemplate[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [lastExtractionResult, setLastExtractionResult] = useState<DatasheetExtractionResult | null>(null);
  
  // Product detail data state
  const [productImages, setProductImages] = useState<GraphImageRecord[]>([]);
  const [productExtractionJobs, setProductExtractionJobs] = useState<GraphExtractionJobRecord[]>([]);
  const [productSpiceExtractions, setProductSpiceExtractions] = useState<SPICEExtractionResult[]>([]);
  const [productStats, setProductStats] = useState<{
    totalImages: number;
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    pendingJobs: number;
    processingJobs: number;
    averageProcessingTime: number;
  } | null>(null);
  
  // Graph image management
  const [showMultiImageUpload, setShowMultiImageUpload] = useState(false);
  const [selectedProductForImageUpload, setSelectedProductForImageUpload] = useState<string | null>(null);
  const [productGraphImages, setProductGraphImages] = useState<Map<string, GraphImage[]>>(new Map());
  
  // Data tab state
  const [showGraphExtraction, setShowGraphExtraction] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'standard' | 'legacy' | 'llm'>('standard');
  const [uploadPriority, setUploadPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [autoCreateJobs, setAutoCreateJobs] = useState(true);
  
  // Actions tab state
  const [selectedJob, setSelectedJob] = useState<GraphExtractionJobRecord | null>(null);
  const [modelType, setModelType] = useState<'asm_hemt' | 'mvsg' | 'bsim' | 'custom'>('asm_hemt');
  const [modelFormat, setModelFormat] = useState<'EPC' | 'ASM' | 'MVSG' | 'BSIM' | 'generic'>('ASM');
  const [templateId, setTemplateId] = useState('asm_hemt_template');
  const [includeSubcircuit, setIncludeSubcircuit] = useState(false);
  const [includeComments, setIncludeComments] = useState(true);
  const [exportFormat, setExportFormat] = useState<'ltspice' | 'kicad' | 'generic'>('generic');
  const [parameterMapping, setParameterMapping] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  
  // Enhanced graph extraction services
  const enhancedExtractionService = EnhancedGraphExtractionService.getInstance();
  const batchProcessingService = EnhancedBatchProcessingService.getInstance();
  const graphImageService = GraphImageService.getInstance();

  // Form states
  const [newProduct, setNewProduct] = useState<ProductCreateInput>({
    name: '', // Will be auto-generated from part number
    manufacturer: '',
    partNumber: '',
    deviceType: '',
    package: '',
    description: ''
  });

  const [extractionConfig, setExtractionConfig] = useState({
    modelType: 'empirical' as 'empirical' | 'physical' | 'hybrid',
    modelFormat: 'EPC',
    templateId: ''
  });

  useEffect(() => {
    // Load products from service
    const loadProducts = async () => {
      try {
        setLoading(true);
        const productsData = await productManagementService.getProducts();
        setProducts(productsData);
        const stats = await productManagementService.getStatistics();
        setStatistics(stats);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();

    // Check for search query in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, manufacturerFilter, deviceTypeFilter]);

  // Load product-specific data when selected product changes
  useEffect(() => {
    if (selectedProduct && viewMode === 'detail') {
      loadProductData(selectedProduct.id);
    } else {
      setProductImages([]);
      setProductExtractionJobs([]);
      setProductSpiceExtractions([]);
      setProductStats(null);
    }
  }, [selectedProduct, viewMode]);

  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (manufacturerFilter) {
      filtered = filtered.filter(product =>
        product.manufacturer.toLowerCase().includes(manufacturerFilter.toLowerCase())
      );
    }

    if (deviceTypeFilter) {
      filtered = filtered.filter(product =>
        product.deviceType.toLowerCase().includes(deviceTypeFilter.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const loadProductData = async (productId: string) => {
    try {
      const [images, jobs, spiceExtractions, stats] = await Promise.all([
        productQueueIntegrationService.getProductImages(productId),
        productQueueIntegrationService.getProductExtractionJobs(productId),
        spiceExtractionIntegrationService.getProductSPICEExtractions(productId),
        productQueueIntegrationService.getProductExtractionStats(productId)
      ]);
      
      setProductImages(images);
      setProductExtractionJobs(jobs);
      setProductSpiceExtractions(spiceExtractions);
      setProductStats(stats);
    } catch (error) {
      console.error('Error loading product data:', error);
    }
  };

  const handleProductClick = (product: ProductWithParameters) => {
    setSelectedProduct(product);
    setViewMode('detail');
    setActiveProductTab('overview');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedProduct(null);
    setActiveProductTab('overview');
  };

  const handleCreateProduct = async () => {
    try {
      // Auto-generate name from part number if not provided
      const productToCreate = {
        ...newProduct,
        name: newProduct.name || newProduct.partNumber
      };
      
      await productManagementService.createProduct(productToCreate);
      
      // Reset form
      setNewProduct({
        name: '',
        manufacturer: '',
        partNumber: '',
        deviceType: '',
        package: '',
        description: ''
      });
      
      // Reload products
      const productsData = await productManagementService.getProducts();
      setProducts(productsData);
      const stats = await productManagementService.getStatistics();
      setStatistics(stats);
      
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const handleDatasheetExtractionComplete = (result: DatasheetExtractionResult) => {
    setLastExtractionResult(result);
    console.log('Datasheet extraction completed:', result);
    
    // Auto-fill product information if available
    if (result.metadata?.title) {
      setNewProduct(prev => ({
        ...prev,
        name: result.metadata!.title || '',
        description: `Auto-extracted from datasheet. Found ${result.extractedGraphs.length} graphs.`
      }));
    }
  };

  const handleCharacteristicDataUpload = async (data: CharacteristicData[]) => {
    try {
      if (!selectedProduct) return;
      
      // Upload each characteristic data
      for (const characteristic of data) {
        await productManagementService.uploadCharacteristicData(selectedProduct.id, {
          type: characteristic.type,
          name: characteristic.name,
          description: characteristic.description,
          csvPath: characteristic.csvFile ? `/characteristics/${selectedProduct.id}/${characteristic.type}_data.csv` : undefined,
          imagePath: characteristic.imageFile ? `/characteristics/${selectedProduct.id}/${characteristic.type}_image.png` : undefined,
          csvData: characteristic.csvData
        });
      }
      
      setShowProductDataUploadModal(false);
      // Reload products to show updated data
      const productsData = await productManagementService.getProducts();
      setProducts(productsData);
      const stats = await productManagementService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error uploading characteristic data:', error);
    }
  };

  const handleDeleteProducts = async () => {
    try {
      const productIds = Array.from(selectedProductsForDelete);
      for (const productId of productIds) {
        await productManagementService.deleteProduct(productId);
      }
      
      // Reload products
      const productsData = await productManagementService.getProducts();
      setProducts(productsData);
      const stats = await productManagementService.getStatistics();
      setStatistics(stats);
      
      // Reset delete mode
      setDeleteMode(false);
      setSelectedProductsForDelete(new Set());
      setShowDeleteConfirmModal(false);
    } catch (error) {
      console.error('Error deleting products:', error);
    }
  };

  const handleProductDoubleClick = (productId: string) => {
    window.location.href = `/products/${productId}`;
  };

  const handleProductSelect = (productId: string, selected: boolean) => {
    const newSelected = new Set(selectedProductsForDelete);
    if (selected) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProductsForDelete(newSelected);
  };

  const toggleDeleteMode = () => {
    setDeleteMode(!deleteMode);
    setSelectedProductsForDelete(new Set());
  };

  const handleAutoScrape = async () => {
    try {
      const result = await productManagementService.autoScrapeProducts(
        autoScrapingConfig.manufacturer,
        autoScrapingConfig.category || undefined,
        autoScrapingConfig.maxProducts
      );
      
      if (result.success) {
        // Reload products
        const productsData = await productManagementService.getProducts();
        setProducts(productsData);
        const stats = await productManagementService.getStatistics();
        setStatistics(stats);
        
        setShowAutoScrapeModal(false);
        console.log(`Successfully scraped ${result.scraped} products`);
      }
    } catch (error) {
      console.error('Error auto-scraping:', error);
    }
  };





  const handleStartExtraction = async () => {
    // Simplified for testing
    console.log('Starting extraction:', extractionConfig);
    setShowExtractionModal(false);
  };

  // Graph image management functions
  const handleOpenMultiImageUpload = (productId: string) => {
    setSelectedProductForImageUpload(productId);
    setShowMultiImageUpload(true);
  };

  const handleImagesUploaded = async (uploadedImages: any[]) => {
    if (!selectedProductForImageUpload) return;

    try {
      // Convert uploaded images to GraphImage format
      const graphImages: GraphImage[] = uploadedImages.map(img => ({
        id: img.id,
        productId: selectedProductForImageUpload,
        filename: img.filename,
        filePath: '', // Will be set by the service
        uploadDate: img.uploadDate,
        description: img.description,
        status: img.status,
        fileSize: img.fileSize,
        mimeType: img.mimeType,
        dimensions: img.dimensions,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Update the product's graph images in the state
      const currentImages = productGraphImages.get(selectedProductForImageUpload) || [];
      const updatedImages = [...currentImages, ...graphImages];
      
      setProductGraphImages(prev => new Map(prev).set(selectedProductForImageUpload!, updatedImages));
      
      // Close the upload modal
      setShowMultiImageUpload(false);
      setSelectedProductForImageUpload(null);
      
      // Show success message
      alert(`Successfully uploaded ${uploadedImages.length} image(s)`);
    } catch (error) {
      console.error('Failed to handle uploaded images:', error);
      alert('Failed to process uploaded images');
    }
  };

  const handleImageDelete = (imageId: string) => {
    if (!selectedProduct) return;
    const currentImages = productGraphImages.get(selectedProduct.id) || [];
    const updatedImages = currentImages.filter(img => img.id !== imageId);
    setProductGraphImages(prev => new Map(prev).set(selectedProduct.id, updatedImages));
  };

  const handleImageUpdate = (updatedImage: GraphImage) => {
    if (!selectedProduct) return;
    const currentImages = productGraphImages.get(selectedProduct.id) || [];
    const updatedImages = currentImages.map(img => 
      img.id === updatedImage.id ? updatedImage : img
    );
    setProductGraphImages(prev => new Map(prev).set(selectedProduct.id, updatedImages));
  };

  const getProductGraphImageCount = (productId: string): number => {
    return productGraphImages.get(productId)?.length || 0;
  };

  const handleImportEmpiricalModel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Simplified for testing
    console.log('Importing empirical model');
  };

  const handleConvertToPhysical = async (modelId: string, targetFormat: 'ASM' | 'MVSG') => {
    // Simplified for testing
    console.log('Converting to physical model:', modelId, targetFormat);
  };

  const getModelTypeIcon = (modelType: string) => {
    switch (modelType) {
      case 'empirical': return <Database className="w-4 h-4" />;
      case 'physical': return <Cpu className="w-4 h-4" />;
      case 'hybrid': return <Layers className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Integrated Tab Navigation */}
        <div className="bg-card rounded-lg shadow-md border border-border mb-6">
          <div className="border-b border-border">
            <div className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveProductTab('overview')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeProductTab === 'overview'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Overview
                </div>
              </button>
              <button
                onClick={() => setActiveProductTab('specifications')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeProductTab === 'specifications'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  Specification
                </div>
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'data'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Data
                </div>
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'actions'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Actions
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Optimized Controls Bar */}
        <div className="bg-card rounded-lg shadow-md border border-border mb-6">
          <div className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  />
                </div>
                
                {/* Filters */}
                <div className="flex gap-2">
                  <select
                    value={manufacturerFilter}
                    onChange={(e) => setManufacturerFilter(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  >
                    <option value="">All Manufacturers</option>
                    {statistics?.manufacturersList?.map((manufacturer: string) => (
                      <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                    ))}
                  </select>
                  <select
                    value={deviceTypeFilter}
                    onChange={(e) => setDeviceTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  >
                    <option value="">All Device Types</option>
                    {statistics?.deviceTypesList?.map((deviceType: string) => (
                      <option key={deviceType} value={deviceType}>{deviceType}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Action Buttons - Icon Only with Hover Text */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors relative group"
                  title="Add Product"
                >
                  <Plus className="w-5 h-5" />
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Add Product
                  </span>
                </button>
                
                <button
                  onClick={() => setShowCSVImportModal(true)}
                  className="flex items-center justify-center w-10 h-10 bg-info text-info-foreground rounded-lg hover:bg-info/90 transition-colors relative group"
                  title="Import Product List"
                >
                  <Upload className="w-5 h-5" />
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Import Product List
                  </span>
                </button>
                
                <button
                  onClick={() => setShowAutoScrapeModal(true)}
                  className="flex items-center justify-center w-10 h-10 bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 transition-colors relative group"
                  title="Auto Scrape"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Auto Scrape
                  </span>
                </button>
                
                <button
                  onClick={toggleDeleteMode}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors relative group ${
                    deleteMode 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                  }`}
                  title={deleteMode ? 'Exit Delete Mode' : 'Delete Mode'}
                >
                  <Settings className="w-5 h-5" />
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {deleteMode ? 'Exit Delete Mode' : 'Delete Mode'}
                  </span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/graph-extraction'}
                  className="flex items-center justify-center w-10 h-10 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors relative group"
                  title="Graph Extraction (with Enhanced LLM)"
                >
                  <Zap className="w-5 h-5" />
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Graph Extraction (with Enhanced LLM)
                  </span>
                </button>
                
                {deleteMode && selectedProductsForDelete.size > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirmModal(true)}
                    className="flex items-center justify-center w-10 h-10 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors relative group"
                    title={`Delete Selected (${selectedProductsForDelete.size})`}
                  >
                    <Settings className="w-5 h-5" />
                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Delete Selected ({selectedProductsForDelete.size})
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  {deleteMode && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedProductsForDelete.size === filteredProducts.length && filteredProducts.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProductsForDelete(new Set(filteredProducts.map(p => p.id)));
                          } else {
                            setSelectedProductsForDelete(new Set());
                          }
                        }}
                        className="rounded border-border"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Manufacturer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Device Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Characteristics
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Graph Images
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredProducts.map((product) => (
                  <tr 
                    key={product.id} 
                    className={`hover:bg-muted/50 transition-colors ${deleteMode ? 'cursor-default' : 'cursor-pointer'} ${selectedProduct?.id === product.id ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                    onDoubleClick={() => !deleteMode && handleProductDoubleClick(product.id)}
                    onClick={() => !deleteMode && handleProductClick(product)}
                  >
                    {deleteMode && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedProductsForDelete.has(product.id)}
                          onChange={(e) => handleProductSelect(product.id, e.target.checked)}
                          className="rounded border-border"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-foreground">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.partNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {product.manufacturer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {product.deviceType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {product.package}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        {product.characteristics && product.characteristics.length > 0 ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {product.characteristics.length} uploaded
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            None
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        {getProductGraphImageCount(product.id) > 0 ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            <ImageIcon className="w-3 h-3 mr-1" />
                            {getProductGraphImageCount(product.id)} images
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            <ImageIcon className="w-3 h-3 mr-1" />
                            No images
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.location.href = `/products/${product.id}`}
                          className="text-primary hover:text-primary/80 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenMultiImageUpload(product.id)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Upload Graph Images"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowExtractionModal(true)}
                          className="text-success hover:text-success/80 transition-colors"
                          title="Start Extraction"
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                        <button 
                          className="text-info hover:text-info/80 transition-colors"
                          title="Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

          </>
        )}

        {/* Specification Tab */}
        {activeTab === 'specification' && (
          <div className="space-y-6">
            <div className="bg-card rounded-lg shadow-md border border-border p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">Product Specification</h2>
              
              {selectedProduct && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Product Details */}
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Product Details</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Name:</span>
                        <span className="text-lg font-bold text-foreground">{selectedProduct.name}</span>
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Part Number:</span>
                        <span className="text-lg font-bold text-foreground">{selectedProduct.partNumber}</span>
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Manufacturer:</span>
                        <span className="text-lg font-bold text-foreground">{selectedProduct.manufacturer}</span>
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Device Type:</span>
                        <span className="text-lg font-bold text-foreground">{selectedProduct.deviceType}</span>
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Package:</span>
                        <span className="text-lg font-bold text-foreground">{selectedProduct.package}</span>
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Description:</span>
                        <p className="text-foreground">{selectedProduct.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Characteristics */}
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Characteristics</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Uploaded Characteristics:</span>
                        <span className="text-lg font-bold text-foreground">{selectedProduct.characteristics?.length || 0}</span>
                      </div>
                                             <div>
                         <span className="block text-sm font-medium text-muted-foreground">Datasheet URL:</span>
                         <span className="text-lg font-bold text-foreground">{selectedProduct.datasheetUrl ? 'Available' : 'Not Available'}</span>
                       </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Uploaded Graph Images:</span>
                        <span className="text-lg font-bold text-foreground">{productImages.length}</span>
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Extraction Jobs:</span>
                        <span className="text-lg font-bold text-foreground">{productExtractionJobs.length}</span>
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">SPICE Extractions:</span>
                        <span className="text-lg font-bold text-foreground">{productSpiceExtractions.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowProductDataUploadModal(true)}
                        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!selectedProduct}
                      >
                        Upload Characteristic Data
                      </button>
                      <button
                        onClick={() => setShowDatasheetUploadModal(true)}
                        className="w-full px-4 py-2 bg-info text-info-foreground rounded-lg hover:bg-info/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!selectedProduct}
                      >
                        Upload Datasheet
                      </button>
                      <button
                        onClick={() => setShowExtractionModal(true)}
                        className="w-full px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!selectedProduct}
                      >
                        Start SPICE Extraction
                      </button>
                      <button
                        onClick={() => setShowGraphExtraction(true)}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!selectedProduct}
                      >
                        Open Graph Extraction Tool
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <div className="bg-card rounded-lg shadow-md border border-border p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">Product Data</h2>
              
              {selectedProduct && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     {/* Datasheets */}
                   <div className="bg-muted rounded-lg p-4">
                     <h3 className="text-lg font-semibold text-foreground mb-4">Datasheets</h3>
                     <div className="space-y-3">
                       {selectedProduct.datasheetUrl && (
                         <div className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                           <div>
                             <span className="block text-sm font-medium text-muted-foreground">Datasheet URL:</span> 
                             <a href={selectedProduct.datasheetUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                               View Datasheet
                             </a>
                           </div>
                           <div>
                             <span className="block text-sm font-medium text-muted-foreground">Status:</span> Available
                           </div>
                         </div>
                       )}
                       <button
                         onClick={() => setShowDatasheetUploadModal(true)}
                         className="w-full px-4 py-2 bg-info text-info-foreground rounded-lg hover:bg-info/90 transition-colors"
                       >
                         Upload New Datasheet
                       </button>
                     </div>
                   </div>

                  {/* Characteristic Data */}
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Characteristic Data</h3>
                    <div className="space-y-3">
                                             {selectedProduct.characteristics?.map((characteristic, index) => (
                         <div key={index} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                           <div>
                             <span className="block text-sm font-medium text-muted-foreground">Type:</span> {characteristic.type}
                           </div>
                           <div>
                             <span className="block text-sm font-medium text-muted-foreground">Name:</span> {characteristic.name}
                           </div>
                           <div>
                             <span className="block text-sm font-medium text-muted-foreground">Uploaded:</span> {new Date(characteristic.uploadedAt).toLocaleDateString()}
                           </div>
                         </div>
                       ))}
                      <button
                        onClick={() => setShowProductDataUploadModal(true)}
                        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Upload New Characteristic Data
                      </button>
                    </div>
                  </div>

                  {/* Graph Images */}
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Graph Images</h3>
                    <div className="space-y-3">
                      {productImages.map((image, index) => (
                        <div key={index} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <span className="block text-sm font-medium text-muted-foreground">File:</span> {image.filename}
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-muted-foreground">Upload Date:</span> {new Date(image.uploadDate).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-muted-foreground">Status:</span> {image.status}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => handleOpenMultiImageUpload(selectedProduct.id)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Upload New Graph Image
                      </button>
                    </div>
                  </div>

                  {/* Extraction Jobs */}
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Extraction Jobs</h3>
                    <div className="space-y-3">
                      {productExtractionJobs.map((job, index) => (
                        <div key={index} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <span className="block text-sm font-medium text-muted-foreground">Job ID:</span> {job.id}
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-muted-foreground">Status:</span> {job.status}
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-muted-foreground">Started:</span> {job.startedAt ? new Date(job.startedAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowExtractionModal(true)}
                        className="w-full px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors"
                      >
                        Start New Extraction
                      </button>
                    </div>
                  </div>

                  {/* SPICE Extractions */}
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">SPICE Extractions</h3>
                    <div className="space-y-3">
                      {productSpiceExtractions.map((extraction, index) => (
                        <div key={index} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <span className="block text-sm font-medium text-muted-foreground">Model Type:</span> {extraction.modelType}
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-muted-foreground">Status:</span> {extraction.status}
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-muted-foreground">Confidence:</span> {(extraction.mappingConfidence * 100).toFixed(1)}%
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowExtractionModal(true)}
                        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Start New SPICE Extraction
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <div className="space-y-6">
            <div className="bg-card rounded-lg shadow-md border border-border p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">Product Actions</h2>
              
              {selectedProduct && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Queue Management */}
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Queue Management</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Total Images:</span> {productStats?.totalImages || 0}
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Total Jobs:</span> {productStats?.totalJobs || 0}
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Completed Jobs:</span> {productStats?.completedJobs || 0}
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Failed Jobs:</span> {productStats?.failedJobs || 0}
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Pending Jobs:</span> {productStats?.pendingJobs || 0}
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Processing Jobs:</span> {productStats?.processingJobs || 0}
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Average Processing Time:</span> {productStats?.averageProcessingTime ? `${productStats.averageProcessingTime.toFixed(2)}s` : 'N/A'}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowGraphExtraction(true)}
                      className="w-full px-4 py-2 bg-info text-info-foreground rounded-lg hover:bg-info/90 transition-colors"
                    >
                      Open Queue Management Tool
                    </button>
                  </div>

                  {/* SPICE Extraction */}
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">SPICE Extraction</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">Total SPICE Extractions:</span> {productSpiceExtractions.length}
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-muted-foreground">SPICE Extraction Jobs:</span> {productExtractionJobs.length}
                      </div>
                      <button
                        onClick={() => setShowExtractionModal(true)}
                        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Start New SPICE Extraction
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Product Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-md border border-border shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-foreground">Add New Product</h2>
              
              {/* Datasheet Upload Section */}
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-foreground">Datasheet & Graph Extraction</h3>
                  <button
                    onClick={() => setShowDatasheetUploadModal(true)}
                    className="flex items-center px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Upload Datasheet
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload datasheet PDF to automatically extract graphs and data points. 
                  Product name will be auto-generated from part number.
                </p>
                {lastExtractionResult && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <p className="text-green-800">
                      ✓ Extracted {lastExtractionResult.extractedGraphs.length} graphs from datasheet
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Manufacturer"
                  value={newProduct.manufacturer}
                  onChange={(e) => setNewProduct({...newProduct, manufacturer: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Part Number *"
                  value={newProduct.partNumber}
                  onChange={(e) => setNewProduct({...newProduct, partNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
                <input
                  type="text"
                  placeholder="Device Type"
                  value={newProduct.deviceType}
                  onChange={(e) => setNewProduct({...newProduct, deviceType: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Package"
                  value={newProduct.package}
                  onChange={(e) => setNewProduct({...newProduct, package: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <textarea
                  placeholder="Description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProduct}
                  disabled={!newProduct.partNumber.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Extraction Modal */}
        {showExtractionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-md border border-border shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-foreground">SPICE Model Extraction</h2>
              <div className="space-y-4">
                <select
                  value={extractionConfig.modelType}
                  onChange={(e) => setExtractionConfig({...extractionConfig, modelType: e.target.value as any})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="empirical">Empirical Model</option>
                  <option value="physical">Physical Model</option>
                  <option value="hybrid">Hybrid Model</option>
                </select>
                <select
                  value={extractionConfig.modelFormat}
                  onChange={(e) => setExtractionConfig({...extractionConfig, modelFormat: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="EPC">EPC Format</option>
                  <option value="ASM">ASM Format</option>
                  <option value="MVSG">MVSG Format</option>
                </select>
                <select
                  value={extractionConfig.templateId}
                  onChange={(e) => setExtractionConfig({...extractionConfig, templateId: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select Template</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowExtractionModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartExtraction}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Start Extraction
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CSV Import Modal */}
        <CSVImportModal
          isOpen={showCSVImportModal}
          onClose={() => setShowCSVImportModal(false)}
          onImport={async (file) => {
            const result = await productManagementService.importProductsFromCSV(file);
            if (result.success) {
              // Reload products after successful import
              const productsData = await productManagementService.getProducts();
              setProducts(productsData);
              const stats = await productManagementService.getStatistics();
              setStatistics(stats);
            }
            return result;
          }}
          title="Import Product List"
          description="Upload a CSV or Excel file containing product data from manufacturer websites. The system will automatically structure the data to match the current database format."
        />

        {/* Auto Scrape Modal */}
        {showAutoScrapeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">Auto Scrape Products</h2>
                <button
                  onClick={() => setShowAutoScrapeModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Manufacturer</label>
                    <select
                      value={autoScrapingConfig.manufacturer}
                      onChange={(e) => setAutoScrapingConfig({...autoScrapingConfig, manufacturer: e.target.value})}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="EPC">EPC</option>
                      <option value="TI">Texas Instruments</option>
                      <option value="Infineon">Infineon</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Category (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., GaN FET, Power MOSFET"
                      value={autoScrapingConfig.category}
                      onChange={(e) => setAutoScrapingConfig({...autoScrapingConfig, category: e.target.value})}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Max Products</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={autoScrapingConfig.maxProducts}
                      onChange={(e) => setAutoScrapingConfig({...autoScrapingConfig, maxProducts: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setShowAutoScrapeModal(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAutoScrape}
                    className="flex-1 px-4 py-2 bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 transition-colors"
                  >
                    Start Scraping
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">Confirm Deletion</h2>
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <p className="text-foreground mb-4">
                  Are you sure you want to delete {selectedProductsForDelete.size} selected product(s)? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirmModal(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteProducts}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Datasheet Upload Modal */}
        <DatasheetUploadModal
          isOpen={showDatasheetUploadModal}
          onClose={() => setShowDatasheetUploadModal(false)}
          onExtractionComplete={handleDatasheetExtractionComplete}
          partNumber={newProduct.partNumber}
        />

        {/* Product Data Upload Modal */}
        <ProductDataUploadModal
          isOpen={showProductDataUploadModal}
          onClose={() => setShowProductDataUploadModal(false)}
          productId={selectedProduct?.id || ''}
          productName={selectedProduct?.name || ''}
          onUploadComplete={handleCharacteristicDataUpload}
        />

        {/* Multi-Image Upload Modal */}
        {showMultiImageUpload && selectedProductForImageUpload && (
          <MultiImageUpload
            productId={selectedProductForImageUpload}
            onImagesUploaded={handleImagesUploaded}
            onCancel={() => {
              setShowMultiImageUpload(false);
              setSelectedProductForImageUpload(null);
            }}
            maxImages={10}
            acceptedFileTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/tiff']}
          />
        )}

        {/* Graph Extraction Tool Modal */}
        {showGraphExtraction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-4xl h-full flex flex-col border border-border shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
                <h2 className="text-xl font-bold text-foreground">Graph Extraction Tool</h2>
                <button
                  onClick={() => setShowGraphExtraction(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                                 <GraphImageGallery
                   productId={selectedProduct?.id || ''}
                   onImageDelete={handleImageDelete}
                   onImageUpdate={handleImageUpdate}
                 />
              </div>
              <div className="p-4 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Upload New Graph Image</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Image File</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                    <input
                      type="text"
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder="e.g., I-V characteristics, C-V curves"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Extraction Method</label>
                      <select
                        value={uploadMethod}
                        onChange={(e) => setUploadMethod(e.target.value as any)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="standard">Standard</option>
                        <option value="legacy">Legacy Algorithm</option>
                        <option value="llm">LLM Assisted</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Priority</label>
                      <select
                        value={uploadPriority}
                        onChange={(e) => setUploadPriority(e.target.value as any)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoCreateJobs"
                      checked={autoCreateJobs}
                      onChange={(e) => setAutoCreateJobs(e.target.checked)}
                      className="rounded border-border"
                    />
                    <label htmlFor="autoCreateJobs" className="text-sm text-foreground">
                      Automatically create extraction jobs
                    </label>
                  </div>
                  <button
                    onClick={() => {/* TODO: Implement upload */}}
                    disabled={!uploadFile}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upload Image
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductManagementPage; 