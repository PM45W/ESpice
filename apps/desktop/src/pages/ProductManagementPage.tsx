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
  BarChart2,
  X
} from 'lucide-react';

// Service imports
import productManagementService, { ProductWithParameters, ProductCreateInput } from '../services/productManagementService';
import { productQueueIntegrationService, GraphImageRecord, GraphExtractionJobRecord, GraphExtractionResultRecord } from '../services/productQueueIntegrationService';
import { spiceExtractionIntegrationService, SPICEExtractionRequest, SPICEExtractionResult, ModelVersion } from '../services/spiceExtractionIntegrationService';
import { CharacteristicData } from '../components/ProductDataUploadModal';
import type { DatasheetExtractionResult } from '../services/datasheetImageExtractionService';
import EnhancedGraphExtractionService from '../services/enhancedGraphExtractionService';
import EnhancedBatchProcessingService from '../services/enhancedBatchProcessingService';
import GraphImageGallery from '../components/GraphImageGallery';
import GraphImageService, { GraphImage } from '../services/graphImageService';
import EPCDownloadModal from '../components/EPCDownloadModal';
import epcProductDownloadService, { EPCDownloadResult } from '../services/epcProductDownloadService';

// UI components
import { Badge } from '@espice/ui';

// CSS imports
import '../styles/buttons.css';
import '../styles/tables.css';
import '../styles/product-queue-integration.css';
import '../styles/spice-extraction-integration.css';
import '../styles/product-management-fixes.css';

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
  const [showEPCDownloadModal, setShowEPCDownloadModal] = useState(false);
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
        
        // Load sample templates
        setTemplates([
          {
            id: 'asm_hemt_template',
            name: 'ASM HEMT Template',
            description: 'Advanced SPICE Model for HEMT devices',
            modelType: 'physical',
            parameters: []
          },
          {
            id: 'mvsg_template',
            name: 'MVSG Template',
            description: 'Multi-Version SPICE Model for GaN devices',
            modelType: 'physical',
            parameters: []
          },
          {
            id: 'bsim_template',
            name: 'BSIM Template',
            description: 'Berkeley Short-channel IGFET Model',
            modelType: 'physical',
            parameters: []
          },
          {
            id: 'empirical_template',
            name: 'Empirical Template',
            description: 'Data-driven empirical model',
            modelType: 'empirical',
            parameters: []
          }
        ]);
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

  const handleEPCDownloadComplete = async (results: EPCDownloadResult[]) => {
    try {
      // Convert EPC products to our product format and add them to the database
      for (const result of results) {
        if (result.success) {
          const productInput = {
            name: result.product.name,
            manufacturer: 'EPC',
            partNumber: result.product.modelNumber,
            deviceType: result.product.category,
            package: result.product.package || 'QFN',
            description: result.product.description,
            voltageRating: result.product.voltageRating,
            currentRating: result.product.currentRating,
            powerRating: result.product.powerRating,
            datasheetUrl: result.product.datasheetUrl,
            spiceModelUrl: result.product.spiceModelUrl,
            specifications: result.product.specifications
          };

          await productManagementService.createProduct(productInput);
        }
      }

      // Reload products to show the newly downloaded ones
      const productsData = await productManagementService.getProducts();
      setProducts(productsData);
      const stats = await productManagementService.getStatistics();
      setStatistics(stats);

      setShowEPCDownloadModal(false);
      alert(`Successfully downloaded ${results.filter(r => r.success).length} EPC products`);
    } catch (error) {
      console.error('Error processing EPC downloads:', error);
      alert('Error processing downloaded products');
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
    <div className="min-h-screen bg-background p-0">
      <div className="mx-auto w-full px-6">
        {selectedProduct ? (
          // Product Detail View
          <div className="space-y-6">
            {/* Product Header */}
            <div className="bg-card rounded-lg shadow-md border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{selectedProduct.name}</h2>
                  <p className="text-muted-foreground">{selectedProduct.partNumber} • {selectedProduct.manufacturer}</p>
                </div>
                <button
                  onClick={handleBackToList}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to List
                </button>
              </div>
              
              {/* Product Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{selectedProduct.characteristics?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Characteristics</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-success">{productImages.length}</div>
                  <div className="text-sm text-muted-foreground">Graph Images</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-info">{productSpiceExtractions.length}</div>
                  <div className="text-sm text-muted-foreground">SPICE Models</div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-card rounded-lg shadow-md border border-border">
              <div className="border-b border-border">
                <nav className="flex space-x-8 px-6 overflow-x-auto tab-navigation">
                  <button
                    onClick={() => setActiveProductTab('overview')}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeProductTab === 'overview'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 flex-shrink-0" />
                      <span>Overview</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveProductTab('specifications')}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeProductTab === 'specifications'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 flex-shrink-0" />
                      <span>Specifications</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveProductTab('parameters')}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeProductTab === 'parameters'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 flex-shrink-0" />
                      <span>Parameters</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveProductTab('datasheet')}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeProductTab === 'datasheet'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileTextIcon className="w-4 h-4 flex-shrink-0" />
                      <span>Datasheet</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveProductTab('curves')}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeProductTab === 'curves'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 flex-shrink-0" />
                      <span>Curves</span>
                    </div>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Overview Tab */}
                {activeProductTab === 'overview' && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Overview
                    </h3>
                    
                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <button 
                        onClick={() => setActiveProductTab('specifications')}
                        className="p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileCode className="w-5 h-5 text-primary" />
                          <span className="font-medium">Specifications</span>
                        </div>
                        <p className="text-sm text-muted-foreground">View product details and data status</p>
                      </button>
                      <button 
                        onClick={() => setActiveProductTab('parameters')}
                        className="p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-5 h-5 text-success" />
                          <span className="font-medium">Parameters</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Manage and validate parameters</p>
                      </button>
                      <button 
                        onClick={() => setActiveProductTab('datasheet')}
                        className="p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileTextIcon className="w-5 h-5 text-info" />
                          <span className="font-medium">Datasheet</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Upload and extract datasheet data</p>
                      </button>
                      <button 
                        onClick={() => setActiveProductTab('curves')}
                        className="p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart2 className="w-5 h-5 text-warning" />
                          <span className="font-medium">Curves</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Manage curve data and extraction</p>
                      </button>
                    </div>

                    {/* Recent Activity */}
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-foreground">Recent Activity</h4>
                      <div className="space-y-2">
                        {productSpiceExtractions.slice(0, 5).map((extraction, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                            {getModelTypeIcon(extraction.modelType)}
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{extraction.modelType} Model</p>
                              <p className="text-xs text-muted-foreground">Created {new Date(extraction.createdAt).toLocaleDateString()}</p>
                            </div>
                            {getStatusIcon(extraction.status)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Specifications Tab */}
                {activeProductTab === 'specifications' && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <FileCode className="w-5 h-5" />
                      Specifications
                    </h3>
                    
                    {/* Product Information */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
                      <div className="md:col-span-2">
                        <h4 className="text-md font-medium text-foreground mb-3">Product Information</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Name:</span>
                            <span className="text-foreground font-medium">{selectedProduct.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Part Number:</span>
                            <span className="text-foreground font-medium">{selectedProduct.partNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Manufacturer:</span>
                            <span className="text-foreground font-medium">{selectedProduct.manufacturer}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Device Type:</span>
                            <span className="text-foreground font-medium">{selectedProduct.deviceType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Package:</span>
                            <span className="text-foreground font-medium">{selectedProduct.package}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="md:col-span-3">
                        <h4 className="text-md font-medium text-foreground mb-3">ASM HEMT Parameters</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Characteristics:</span>
                            <Badge variant={selectedProduct.characteristics && selectedProduct.characteristics.length > 0 ? "default" : "secondary"}>
                              {selectedProduct.characteristics?.length || 0} uploaded
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Graph Images:</span>
                            <Badge variant={productImages.length > 0 ? "default" : "secondary"}>
                              {productImages.length} uploaded
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">SPICE Models:</span>
                            <Badge variant={productSpiceExtractions.length > 0 ? "default" : "secondary"}>
                              {productSpiceExtractions.length} extracted
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Datasheet:</span>
                            <Badge variant={selectedProduct.datasheetUrl ? "default" : "secondary"}>
                              {selectedProduct.datasheetUrl ? "Available" : "Not uploaded"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={() => setActiveProductTab('parameters')}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Manage Parameters
                      </button>
                      <button 
                        onClick={() => setShowDatasheetUploadModal(true)}
                        className="px-4 py-2 bg-info text-info-foreground rounded-lg hover:bg-info/90 transition-colors"
                      >
                        Upload Datasheet
                      </button>
                      <button 
                        onClick={() => setActiveProductTab('curves')}
                        className="px-4 py-2 bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 transition-colors"
                      >
                        View Curves
                      </button>
                      <button 
                        onClick={() => setShowProductDataUploadModal(true)}
                        className="px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors"
                      >
                        Upload Data
                      </button>
                      <button 
                        onClick={() => setShowExtractionModal(true)}
                        className="px-4 py-2 bg-info text-info-foreground rounded-lg hover:bg-info/90 transition-colors"
                      >
                        SPICE Extraction
                      </button>
                    </div>
                  </div>
                )}

                {/* Parameters Tab */}
                {activeProductTab === 'parameters' && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Parameters
                    </h3>
                    
                    {/* Parameter Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">{selectedProduct.parameters?.length || 0}</div>
                        <div className="text-sm text-muted-foreground">Total Parameters</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-success">
                          {selectedProduct.parameters?.filter(p => p.isValidated)?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Validated</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-warning">
                          {selectedProduct.parameters?.filter(p => !p.isValidated)?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                      </div>
                    </div>

                    {/* Parameter Actions */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      <button 
                        onClick={() => {
                          // Import parameters functionality
                          alert('Import Parameters functionality will be implemented');
                        }}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Import Parameters
                      </button>
                      <button 
                        onClick={() => {
                          // Validate all parameters
                          if (selectedProduct?.parameters) {
                            const validatedCount = selectedProduct.parameters.filter(p => p.isValidated).length;
                            alert(`Validated ${validatedCount} out of ${selectedProduct.parameters.length} parameters`);
                          }
                        }}
                        className="px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors"
                      >
                        Validate All
                      </button>
                      <button 
                        onClick={() => {
                          // Export parameters functionality
                          if (selectedProduct?.parameters) {
                            const csvContent = selectedProduct.parameters.map(p => 
                              `${p.name},${p.value},${p.unit || ''},${p.category},${p.isValidated ? 'Yes' : 'No'}`
                            ).join('\n');
                            const blob = new Blob([`Name,Value,Unit,Category,Validated\n${csvContent}`], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${selectedProduct.partNumber}_parameters.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }
                        }}
                        className="px-4 py-2 bg-info text-info-foreground rounded-lg hover:bg-info/90 transition-colors"
                      >
                        Export Parameters
                      </button>
                      <button 
                        onClick={() => {
                          // Compare models functionality
                          alert('Model comparison functionality will be implemented');
                        }}
                        className="px-4 py-2 bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 transition-colors"
                      >
                        Compare Models
                      </button>
                    </div>

                    {/* Parameter List with Sidebar */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '3fr 2fr', 
                      gap: '1.5rem'
                    }}>
                      {/* ASM HEMT Parameters - Wider Section */}
                      <div className="lg:col-span-3">
                        <h4 className="text-md font-medium text-foreground mb-3">ASM HEMT Parameters</h4>
                        {selectedProduct.parameters && selectedProduct.parameters.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-card divide-y divide-border">
                                {selectedProduct.parameters.map((param, index) => (
                                  <tr key={index} className="hover:bg-muted/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{param.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{param.value}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{param.unit || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{param.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                      <Badge variant={param.isValidated ? "default" : "secondary"}>
                                        {param.isValidated ? "Validated" : "Pending"}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                      <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors">
                                        View
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center py-8">No parameters available</p>
                        )}
                      </div>

                      {/* Parameter Details Sidebar - Narrower Section */}
                      <div className="lg:col-span-2">
                        <h4 className="text-md font-medium text-foreground mb-3">Parameter Details</h4>
                        <div className="space-y-4">
                          <div className="p-4 bg-muted rounded-lg">
                            <h5 className="font-medium text-foreground mb-2">Quick Stats</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Parameters:</span>
                                <span className="text-foreground font-medium">{selectedProduct.parameters?.length || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Validated:</span>
                                <span className="text-foreground font-medium">{selectedProduct.parameters?.filter(p => p.isValidated)?.length || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Pending:</span>
                                <span className="text-foreground font-medium">{selectedProduct.parameters?.filter(p => !p.isValidated)?.length || 0}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-4 bg-muted rounded-lg">
                            <h5 className="font-medium text-foreground mb-2">Quick Actions</h5>
                            <div className="space-y-2">
                              <button className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors">
                                Add Parameter
                              </button>
                              <button className="w-full px-3 py-2 bg-success text-success-foreground rounded text-sm hover:bg-success/90 transition-colors">
                                Validate All
                              </button>
                              <button className="w-full px-3 py-2 bg-info text-info-foreground rounded text-sm hover:bg-info/90 transition-colors">
                                Export CSV
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Datasheet Tab */}
                {activeProductTab === 'datasheet' && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <FileTextIcon className="w-5 h-5" />
                      Datasheet
                    </h3>
                    
                    {/* Current Datasheet */}
                    <div className="mb-6">
                      <h4 className="text-md font-medium text-foreground mb-3">Current Datasheet</h4>
                      {selectedProduct.datasheetUrl ? (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium text-foreground">Datasheet uploaded</p>
                          <p className="text-xs text-muted-foreground">{selectedProduct.datasheetUrl}</p>
                          <div className="flex gap-2 mt-3">
                            <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors">
                              View
                            </button>
                            <button className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/90 transition-colors">
                              Download
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No datasheet uploaded</p>
                      )}
                    </div>

                    {/* Datasheet Actions */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      <button 
                        onClick={() => setShowDatasheetUploadModal(true)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Upload Datasheet
                      </button>
                      <button 
                        onClick={() => {
                          if (selectedProduct?.datasheetUrl) {
                            // Extract data from datasheet
                            alert('Data extraction from datasheet will be implemented');
                          } else {
                            alert('Please upload a datasheet first');
                          }
                        }}
                        className="px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors"
                      >
                        Extract Data
                      </button>
                      <button 
                        onClick={() => {
                          // Compare datasheets functionality
                          alert('Datasheet comparison functionality will be implemented');
                        }}
                        className="px-4 py-2 bg-info text-info-foreground rounded-lg hover:bg-info/90 transition-colors"
                      >
                        Compare
                      </button>
                      <button 
                        onClick={() => {
                          // Validate datasheet functionality
                          if (selectedProduct?.datasheetUrl) {
                            alert('Datasheet validation will be implemented');
                          } else {
                            alert('Please upload a datasheet first');
                          }
                        }}
                        className="px-4 py-2 bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 transition-colors"
                      >
                        Validate
                      </button>
                    </div>

                    {/* Last Extraction Results */}
                    {lastExtractionResult && (
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="text-md font-medium text-foreground mb-3">Last Extraction Results</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-2xl font-bold text-primary">{lastExtractionResult.extractedGraphs.length}</div>
                            <div className="text-sm text-muted-foreground">Graphs Extracted</div>
                          </div>
                                                     <div>
                             <div className="text-2xl font-bold text-success">{lastExtractionResult.extractedGraphs.length}</div>
                             <div className="text-sm text-muted-foreground">Parameters Found</div>
                           </div>
                           <div>
                             <div className="text-2xl font-bold text-info">{lastExtractionResult.metadata?.extractedImagesCount || 0}</div>
                             <div className="text-sm text-muted-foreground">Images Processed</div>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Curves Tab */}
                {activeProductTab === 'curves' && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <BarChart2 className="w-5 h-5" />
                      Curves
                    </h3>
                    
                    {/* Curve Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">{productImages.length}</div>
                        <div className="text-sm text-muted-foreground">Total Images</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-success">{productImages.filter(img => img.status === 'completed').length}</div>
                        <div className="text-sm text-muted-foreground">Completed Jobs</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-warning">{productImages.filter(img => img.status === 'processing').length}</div>
                        <div className="text-sm text-muted-foreground">Processing Jobs</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-info">{productSpiceExtractions.length}</div>
                        <div className="text-sm text-muted-foreground">SPICE Models</div>
                      </div>
                    </div>

                    {/* Graph Image Gallery */}
                    <GraphImageGallery
                      productId={selectedProduct.id}
                      onImageDelete={handleImageDelete}
                      onImageUpdate={handleImageUpdate}
                    />

                    {/* Graph Extraction Tool */}
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="text-md font-medium text-foreground mb-3">Graph Extraction Tool</h4>
                      <p className="text-muted-foreground mb-4">Upload new images and extract curve data with advanced AI processing</p>
                      <div className="flex flex-wrap gap-3 justify-center">
                        <button
                          onClick={() => handleOpenMultiImageUpload(selectedProduct.id)}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Upload Images
                        </button>
                        <button
                          onClick={() => window.location.href = '/graph-extraction'}
                          className="px-4 py-2 bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 transition-colors"
                        >
                          Open Extraction Tool
                        </button>
                        <button
                          onClick={() => setShowExtractionModal(true)}
                          className="px-4 py-2 bg-info text-info-foreground rounded-lg hover:bg-info/90 transition-colors"
                        >
                          SPICE Extraction
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Product List View
          <>
            {/* Optimized Controls Bar */}
            <div className="bg-card rounded-lg border border-border mb-4">
              <div className="p-4 md:p-3">
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
                      onClick={() => setShowEPCDownloadModal(true)}
                      className="flex items-center justify-center w-10 h-10 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors relative group"
                      title="Download EPC GaN Products"
                    >
                      <Download className="w-5 h-5" />
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Download EPC GaN Products
                      </span>
                    </button>
                    
                    <button
                      onClick={() => window.location.href = '/graph-extraction'}
                      className="flex items-center justify-center w-10 h-10 bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 transition-colors relative group"
                      title="Graph Extraction (with Enhanced LLM)"
                    >
                      <Zap className="w-5 h-5" />
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Graph Extraction (with Enhanced LLM)
                      </span>
                    </button>
                    
                    <button
                      onClick={() => setShowExtractionModal(true)}
                      className="flex items-center justify-center w-10 h-10 bg-info text-info-foreground rounded-lg hover:bg-info/90 transition-colors relative group"
                      title="SPICE Model Extraction"
                    >
                      <Cpu className="w-5 h-5" />
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        SPICE Model Extraction
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
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto table-responsive">
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
                    {filteredProducts.map((product: any) => (
                      <tr 
                        key={product.id} 
                        className={`hover:bg-muted/50 transition-colors ${deleteMode ? 'cursor-default' : 'cursor-pointer'} ${selectedProduct?.id === product.id ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                        onDoubleClick={() => {
                          if (!deleteMode) {
                            handleProductDoubleClick(product.id);
                          }
                        }}
                        onClick={() => {
                          if (!deleteMode) {
                            handleProductClick(product);
                          }
                        }}
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
                          <div className="max-w-xs">
                            <div className="text-sm font-medium text-foreground truncate" title={product.name}>{product.name}</div>
                            <div className="text-sm text-muted-foreground truncate" title={product.partNumber}>{product.partNumber}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          <span className="truncate block max-w-32" title={product.manufacturer}>{product.manufacturer}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          <span className="truncate block max-w-32" title={product.deviceType}>{product.deviceType}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          <span className="truncate block max-w-32" title={product.package || '-'}>{product.package || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          <div className="flex items-center gap-2">
                            {product.characteristics && product.characteristics.length > 0 ? (
                              <Badge variant="default" className="max-w-32">
                                <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{product.characteristics.length} uploaded</span>
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="max-w-32">
                                <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span>None</span>
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          <div className="flex items-center gap-2">
                              <Badge variant="default" className="max-w-32">
                                <ImageIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{getProductGraphImageCount(product.id)} images</span>
                              </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          <div className="flex items-center gap-2 action-buttons">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMultiImageUpload(product.id);
                              }}
                              className="action-button"
                              title="Upload Images"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/graph-extraction?productId=${product.id}`;
                              }}
                              className="action-button"
                              title="Graph Extraction"
                            >
                              <BarChart3 className="w-4 h-4" />
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

        {/* Modals */}
        
        {/* Create Product Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Create New Product</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    placeholder="Product name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Manufacturer</label>
                  <input
                    type="text"
                    value={newProduct.manufacturer}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, manufacturer: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    placeholder="Manufacturer"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Part Number</label>
                  <input
                    type="text"
                    value={newProduct.partNumber}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, partNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    placeholder="Part number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Device Type</label>
                  <input
                    type="text"
                    value={newProduct.deviceType}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, deviceType: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    placeholder="Device type"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Package</label>
                  <input
                    type="text"
                    value={newProduct.package}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, package: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    placeholder="Package"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    placeholder="Product description"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateProduct}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Create Product
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Auto Scrape Modal */}
        {showAutoScrapeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Auto Scrape Products</h2>
                <button
                  onClick={() => setShowAutoScrapeModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Manufacturer</label>
                  <input
                    type="text"
                    value={autoScrapingConfig.manufacturer}
                    onChange={(e) => setAutoScrapingConfig(prev => ({ ...prev, manufacturer: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    placeholder="Manufacturer"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Category (optional)</label>
                  <input
                    type="text"
                    value={autoScrapingConfig.category}
                    onChange={(e) => setAutoScrapingConfig(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    placeholder="Category"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Max Products</label>
                  <input
                    type="number"
                    value={autoScrapingConfig.maxProducts}
                    onChange={(e) => setAutoScrapingConfig(prev => ({ ...prev, maxProducts: parseInt(e.target.value) || 50 }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    min="1"
                    max="1000"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAutoScrape}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Start Scraping
                </button>
                <button
                  onClick={() => setShowAutoScrapeModal(false)}
                  className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl border border-border p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <h2 className="text-xl font-semibold text-foreground">Confirm Deletion</h2>
              </div>
              
              <p className="text-muted-foreground mb-6">
                Are you sure you want to delete {selectedProductsForDelete.size} selected product(s)? This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteProducts}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CSV Import Modal */}
        {showCSVImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Import CSV</h2>
                <button
                  onClick={() => setShowCSVImportModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-muted-foreground mb-4">CSV import functionality will be implemented</p>
              <button
                onClick={() => setShowCSVImportModal(false)}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Datasheet Upload Modal */}
        {showDatasheetUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Upload Datasheet</h2>
                <button
                  onClick={() => setShowDatasheetUploadModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-muted-foreground mb-4">Datasheet upload functionality will be implemented</p>
              <button
                onClick={() => setShowDatasheetUploadModal(false)}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Product Data Upload Modal */}
        {showProductDataUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Upload Product Data</h2>
                <button
                  onClick={() => setShowProductDataUploadModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-muted-foreground mb-4">Product data upload functionality will be implemented</p>
              <button
                onClick={() => setShowProductDataUploadModal(false)}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Multi Image Upload Modal */}
        {showMultiImageUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Upload Images</h2>
                <button
                  onClick={() => setShowMultiImageUpload(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-muted-foreground mb-4">Multi-image upload functionality will be implemented</p>
              <button
                onClick={() => setShowMultiImageUpload(false)}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
        
        {/* EPC Download Modal */}
        <EPCDownloadModal
          isOpen={showEPCDownloadModal}
          onClose={() => setShowEPCDownloadModal(false)}
          onDownloadComplete={handleEPCDownloadComplete}
        />

        {/* Extraction Modal */}
        {showExtractionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">SPICE Model Extraction</h2>
                <button
                  onClick={() => setShowExtractionModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Model Type</label>
                  <select
                    value={extractionConfig.modelType}
                    onChange={(e) => setExtractionConfig({...extractionConfig, modelType: e.target.value as any})}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  >
                    <option value="empirical">Empirical Model</option>
                    <option value="physical">Physical Model</option>
                    <option value="hybrid">Hybrid Model</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Model Format</label>
                  <select
                    value={extractionConfig.modelFormat}
                    onChange={(e) => setExtractionConfig({...extractionConfig, modelFormat: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  >
                    <option value="EPC">EPC Format</option>
                    <option value="ASM">ASM Format</option>
                    <option value="MVSG">MVSG Format</option>
                    <option value="BSIM">BSIM Format</option>
                    <option value="generic">Generic Format</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Template</label>
                  <select
                    value={extractionConfig.templateId}
                    onChange={(e) => setExtractionConfig({...extractionConfig, templateId: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  >
                    <option value="">Select Template</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} - {template.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
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
      </div>
    </div>
  );
};

export default ProductManagementPage; 