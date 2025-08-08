import React, { useEffect, useState } from 'react';
import webScrapingService, { GaNProduct, PrescrapPreview, BraveResult } from '../services/webScrapingService';
import datasheetService, { Datasheet, GraphicalData, TableData } from '../services/datasheetService';
import { cn } from '@/lib/utils';



const ProductPage: React.FC = () => {
  const [products, setProducts] = useState<GaNProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<GaNProduct | null>(null);
  const [selectedProductDatasheets, setSelectedProductDatasheets] = useState<Datasheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [manufacturer, setManufacturer] = useState('infineon');
  const [uploadingDatasheet, setUploadingDatasheet] = useState(false);
  const [processingStatuses, setProcessingStatuses] = useState<Record<string, { status: string; progress: number; message: string }>>({});
  
  // EPC-specific state
  const [epcModelNumber, setEpcModelNumber] = useState('');
  const [epcScrapingLoading, setEpcScrapingLoading] = useState(false);
  const [epcBatchModels, setEpcBatchModels] = useState('');
  const [epcBatchLoading, setEpcBatchLoading] = useState(false);
  const [showEpcInterface, setShowEpcInterface] = useState(false);
  const [useMockData, setUseMockData] = useState(true); // Default to mock data since real scraping is blocked

  // Fetch products from backend on mount
  useEffect(() => {
    setLoading(true);
    webScrapingService.getProducts()
      .then(setProducts)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Fetch datasheets when a product is selected
  useEffect(() => {
    if (selectedProduct) {
      fetchDatasheetsForProduct(selectedProduct.product_id);
    } else {
      setSelectedProductDatasheets([]);
    }
  }, [selectedProduct]);

  // Poll processing status for datasheets that are being processed
  useEffect(() => {
    const interval = setInterval(() => {
      selectedProductDatasheets.forEach(datasheet => {
        if (datasheet.status === 'processing' || datasheet.status === 'queued') {
          fetchProcessingStatus(datasheet.id);
        }
      });
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [selectedProductDatasheets]);

  const fetchDatasheetsForProduct = async (productId: string) => {
    try {
      const datasheets = await datasheetService.getDatasheetsForProduct(productId);
      setSelectedProductDatasheets(datasheets);
    } catch (error) {
      console.error('Error fetching datasheets:', error);
      setError('Failed to fetch datasheets');
    }
  };

  const fetchProcessingStatus = async (datasheetId: string) => {
    try {
      const status = await datasheetService.getProcessingStatus(datasheetId);
      setProcessingStatuses(prev => ({
        ...prev,
        [datasheetId]: status
      }));

      // If processing is complete, refresh datasheets
      if (status.status === 'completed' || status.status === 'failed') {
        if (selectedProduct) {
          fetchDatasheetsForProduct(selectedProduct.product_id);
        }
      }
    } catch (error) {
      console.error('Error fetching processing status:', error);
    }
  };

  // Handle full scrape (on demand)
  const handleFullScrape = async () => {
    setLoading(true);
    setError(null);
    try {
      await webScrapingService.startScrapingJob({
        manufacturer,
        max_products: 50,
        include_datasheets: true,
      });
      // Refresh product list after scrape
      const refreshed = await webScrapingService.getProducts();
      setProducts(refreshed);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.part_number.toLowerCase().includes(search.toLowerCase()) ||
    product.description.toLowerCase().includes(search.toLowerCase())
  );

  // Handle datasheet upload for selected product
  const handleDatasheetUpload = async (file: File) => {
    if (!selectedProduct) return;
    
    setUploadingDatasheet(true);
    setError(null);
    try {
      const response = await datasheetService.uploadDatasheet(selectedProduct.product_id, file);
      
      if (response.success) {
        // Refresh datasheets list
        await fetchDatasheetsForProduct(selectedProduct.product_id);
      } else {
        setError(response.error || 'Upload failed');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setUploadingDatasheet(false);
    }
  };

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleDatasheetUpload(file);
    }
  };

  // Handle datasheet deletion
  const handleDeleteDatasheet = async (datasheetId: string) => {
    if (!confirm('Are you sure you want to delete this datasheet?')) return;
    
    try {
      await datasheetService.deleteDatasheet(datasheetId);
      if (selectedProduct) {
        await fetchDatasheetsForProduct(selectedProduct.product_id);
      }
    } catch (error) {
      setError('Failed to delete datasheet');
    }
  };

  // Handle SPICE model download
  const handleDownloadSpiceModel = async (datasheetId: string, filename: string) => {
    try {
      const blob = await datasheetService.downloadSpiceModel(datasheetId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_spice_model.lib`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setError('Failed to download SPICE model');
    }
  };

  // Handle retry processing
  const handleRetryProcessing = async (datasheetId: string) => {
    try {
      await datasheetService.retryProcessing(datasheetId);
      if (selectedProduct) {
        await fetchDatasheetsForProduct(selectedProduct.product_id);
      }
    } catch (error) {
      setError('Failed to retry processing');
    }
  };

  // EPC-Co.com specific functions
  const handleEPCScrape = async () => {
    if (!epcModelNumber.trim()) {
      alert('Please enter a model number');
      return;
    }

    setEpcScrapingLoading(true);
    try {
      let result;
      if (useMockData) {
        // Use mock data for testing
        result = await webScrapingService.scrapeEPCProductMock(epcModelNumber.trim());
      } else {
        // Use real scraping
        result = await webScrapingService.scrapeEPCProduct(epcModelNumber.trim());
      }
      
      // Add the scraped product to the list
      setProducts(prev => [result.product, ...prev]);
      setSelectedProduct(result.product);
      setEpcModelNumber('');
      
      // Show success message
      alert(`Successfully scraped ${result.product.part_number}!`);
    } catch (error) {
      console.error('Error scraping EPC product:', error);
      
      // Provide helpful error message based on the error
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          errorMessage = `Product not found or access blocked by EPC-Co.com. Try using mock data instead.`;
        } else if (error.message.includes('403')) {
          errorMessage = `Access blocked by EPC-Co.com's anti-bot protection. Use mock data for testing.`;
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = `Cannot connect to web scraper service. Make sure the backend is running on port 8011.`;
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(`Error scraping product: ${errorMessage}`);
    } finally {
      setEpcScrapingLoading(false);
    }
  };

  const handleEPCBatchScrape = async () => {
    if (!epcBatchModels.trim()) {
      setError('Please enter EPC model numbers');
      return;
    }

    const modelNumbers = epcBatchModels.split(',').map(m => m.trim()).filter(m => m);
    if (modelNumbers.length === 0) {
      setError('Please enter valid EPC model numbers');
      return;
    }

    setEpcBatchLoading(true);
    setError(null);
    try {
      const result = await webScrapingService.batchScrapeEPCProducts(modelNumbers);
      
      // Add successfully scraped products to the list
      const newProducts = result.results
        .filter(r => r.success)
        .map(r => r.product);
      
      setProducts(prev => {
        const existingPartNumbers = new Set(prev.map(p => p.part_number));
        const uniqueNewProducts = newProducts.filter(p => !existingPartNumbers.has(p.part_number));
        return [...uniqueNewProducts, ...prev];
      });
      
      // Show results
      console.log(`Batch scrape completed:`, result);
      
      // Clear the input
      setEpcBatchModels('');
      
    } catch (e) {
      setError(`Failed to batch scrape EPC products: ${e}`);
    } finally {
      setEpcBatchLoading(false);
    }
  };

  const handleEPCDownloadFiles = async (modelNumber: string) => {
    try {
      const result = await webScrapingService.downloadEPCFiles(modelNumber);
      console.log(`Files downloaded for ${modelNumber}:`, result);
      // You could show a success message or update the UI here
    } catch (e) {
      setError(`Failed to download files for ${modelNumber}: ${e}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'status status-success';
      case 'processing': return 'status status-info';
      case 'failed': return 'status status-error';
      case 'queued': return 'status status-warning';
      default: return 'status';
    }
  };

  return (
    <div className="flex h-screen bg-[hsl(var(--background))]">
      {/* Left Panel - Product List */}
      <div className="w-1/3 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <h1 className="text-xl font-bold mb-4 text-[hsl(var(--foreground))]">Products</h1>
          
          {/* EPC Interface Toggle */}
          <button
            onClick={() => setShowEpcInterface(!showEpcInterface)}
            className="epc-toggle-btn"
          >
            {showEpcInterface ? '🔽 Hide EPC Interface' : '🔼 Show EPC Interface'}
          </button>

            {/* EPC-Co.com Scraper Interface */}
            {showEpcInterface && (
              <div className="epc-interface">
                <div className="epc-header">
                  <h3>🔌 EPC-Co.com Scraper</h3>
                  <p className="epc-description">
                    Scrape GaN FET datasheets and SPICE models from EPC-Co.com
                  </p>
                </div>
                
                {/* Mock Data Toggle */}
                <div className="mock-toggle">
                  <label className="mock-label">
                    <input
                      type="checkbox"
                      checked={useMockData}
                      onChange={(e) => setUseMockData(e.target.checked)}
                      className="mock-checkbox"
                    />
                    <span className="mock-text">Use Mock Data (for testing)</span>
                  </label>
                  {useMockData && (
                    <div className="mock-warning">
                      ⚠️ Using mock data - EPC-Co.com blocks automated scraping. This allows you to test the interface safely.
                    </div>
                  )}
                </div>
                
                {/* Single Model Scraping */}
                <div className="scrape-section">
                  <h4>📋 Single Model Scraping</h4>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Enter EPC model number (e.g., epc2040)"
                      value={epcModelNumber}
                      onChange={(e) => setEpcModelNumber(e.target.value)}
                      disabled={epcScrapingLoading}
                      className="epc-input"
                    />
                    <button
                      onClick={handleEPCScrape}
                      disabled={epcScrapingLoading || !epcModelNumber.trim()}
                      className="scrape-btn"
                    >
                      {epcScrapingLoading ? '⏳ Scraping...' : '🚀 Scrape'}
                    </button>
                  </div>
                </div>
                
                {/* Batch Scraping */}
                <div className="scrape-section">
                  <h4>📦 Batch Scraping</h4>
                  <div className="input-group">
                    <textarea
                      placeholder="Enter multiple model numbers separated by commas (e.g., epc2040, epc2010, epc2001)"
                      value={epcBatchModels}
                      onChange={(e) => setEpcBatchModels(e.target.value)}
                      disabled={epcBatchLoading}
                      className="epc-textarea"
                      rows={3}
                    />
                  </div>
                  <div className="button-group">
                    <button
                      onClick={handleEPCBatchScrape}
                      disabled={epcBatchLoading || !epcBatchModels.trim()}
                      className="batch-btn"
                    >
                      {epcBatchLoading ? '⏳ Batch Scraping...' : '📦 Batch Scrape'}
                    </button>
                  </div>
                </div>
                
                {/* Status and Info */}
                <div className="epc-info">
                  <div className="info-item">
                    <span className="info-icon">ℹ️</span>
                    <span className="info-text">
                      EPC-Co.com actively blocks automated scraping with anti-bot protection
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">💡</span>
                    <span className="info-text">
                      Use mock data to test the interface and see how the system works
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">🔧</span>
                    <span className="info-text">
                      For real data, you would need to implement more sophisticated scraping techniques
                    </span>
                  </div>
                </div>
              </div>
            )}
          
          {/* Search and Controls */}
          <div className="space-y-3">
            <input
              className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            
            <div className="flex gap-2">
              <select
                className="flex-1 border border-[hsl(var(--border))] rounded-lg px-3 py-2 bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                value={manufacturer}
                onChange={e => setManufacturer(e.target.value)}
              >
                <option value="infineon">Infineon</option>
                <option value="wolfspeed">Wolfspeed</option>
                <option value="qorvo">Qorvo</option>
                <option value="epc_co">EPC-Co.com</option>
              </select>
              
              <button
                className="btn btn-primary btn-md"
                onClick={handleFullScrape}
                disabled={loading}
              >
                {loading ? 'Scraping...' : 'Scrape'}
              </button>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="overflow-y-auto h-full">
          {error && (
            <div className="p-4 text-[hsl(var(--error-600))] bg-[hsl(var(--error-50))] border-l-4 border-[hsl(var(--error-600))]">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="p-4 text-[hsl(var(--muted-foreground))]">Loading products...</div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]">
              {filteredProducts.map(product => (
                <div
                  key={product.product_id}
                  className={cn(
                    "p-4 cursor-pointer transition-colors hover:bg-[hsl(var(--accent))]",
                    selectedProduct?.product_id === product.product_id
                      ? 'bg-[hsl(var(--primary))] bg-opacity-10 border-l-4 border-[hsl(var(--primary))]'
                      : ''
                  )}
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="font-semibold text-[hsl(var(--foreground))]">
                    {product.part_number}
                  </div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">
                    {product.name}
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    {product.manufacturer} • {product.category}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Product Details */}
      <div className="flex-1 overflow-y-auto">
        {selectedProduct ? (
          <div className="p-6 space-y-6">
            {/* Product Header */}
            <div className="card">
              <div className="card-content">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">
                      {selectedProduct.part_number}
                    </h2>
                    <p className="text-lg text-[hsl(var(--muted-foreground))]">
                      {selectedProduct.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-[hsl(var(--muted-foreground))]">
                      {selectedProduct.manufacturer}
                    </div>
                    <div className="text-sm text-[hsl(var(--muted-foreground))]">
                      {selectedProduct.category}
                    </div>
                  </div>
                </div>
                
                <p className="text-[hsl(var(--foreground))] mb-4">
                  {selectedProduct.description}
                </p>
                
                {selectedProduct.datasheet_url && (
                  <a
                    href={selectedProduct.datasheet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-md"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Datasheet
                  </a>
                )}
                
                {/* EPC Download Files Button */}
                {selectedProduct.manufacturer === 'epc_co' && (
                  <button
                    onClick={() => handleEPCDownloadFiles(selectedProduct.part_number)}
                    className="btn btn-secondary btn-md ml-2"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Files
                  </button>
                )}
              </div>
            </div>

            {/* Datasheets Section */}
            <div className="card">
              <div className="card-header">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    Datasheets & Processed Data
                  </h3>
                  
                  {/* Upload Datasheet Button */}
                  <label className={cn(
                    "btn cursor-pointer",
                    uploadingDatasheet 
                      ? 'btn-secondary cursor-not-allowed' 
                      : 'btn-primary'
                  )}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {uploadingDatasheet ? 'Uploading...' : 'Upload Datasheet'}
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={uploadingDatasheet}
                    />
                  </label>
                </div>
              </div>

              <div className="card-content">
                {selectedProductDatasheets.length === 0 ? (
                  <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                    <svg className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">No datasheets uploaded yet</p>
                    <p className="text-sm">Upload a datasheet to start processing and generate SPICE models</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedProductDatasheets.map(datasheet => {
                      const processingStatus = processingStatuses[datasheet.id];
                      const status = processingStatus?.status || datasheet.status;
                      
                      return (
                        <div key={datasheet.id} className="border border-[hsl(var(--border))] rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h4 className="font-medium text-[hsl(var(--foreground))]">
                                {datasheet.filename}
                              </h4>
                              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                Uploaded {new Date(datasheet.uploadDate).toLocaleDateString()}
                              </p>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(status)}`}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                {processingStatus?.progress && status === 'processing' && (
                                  <span className="ml-2">({processingStatus.progress}%)</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => {/* TODO: Implement view datasheet */}}
                              >
                                View
                              </button>
                              {status === 'failed' && (
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleRetryProcessing(datasheet.id)}
                                >
                                  Retry
                                </button>
                              )}
                              <button 
                                className="btn btn-destructive btn-sm"
                                onClick={() => handleDeleteDatasheet(datasheet.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-[hsl(var(--muted))] rounded p-3">
                              <h5 className="font-medium text-[hsl(var(--foreground))] mb-2">Graphical Data</h5>
                              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                {datasheet.graphicalData.length} curves extracted
                              </p>
                              {datasheet.graphicalData.length > 0 && (
                                <button className="text-sm text-[hsl(var(--primary))] hover:underline mt-1">
                                  View Curves
                                </button>
                              )}
                            </div>
                            
                            <div className="bg-[hsl(var(--muted))] rounded p-3">
                              <h5 className="font-medium text-[hsl(var(--foreground))] mb-2">Table Data</h5>
                              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                {datasheet.tableData.length} tables extracted
                              </p>
                              {datasheet.tableData.length > 0 && (
                                <button className="text-sm text-[hsl(var(--primary))] hover:underline mt-1">
                                  View Tables
                                </button>
                              )}
                            </div>
                            
                            <div className="bg-[hsl(var(--muted))] rounded p-3">
                              <h5 className="font-medium text-[hsl(var(--foreground))] mb-2">SPICE Model</h5>
                              {datasheet.spiceModelPath ? (
                                <button 
                                  className="text-sm text-[hsl(var(--primary))] hover:underline"
                                  onClick={() => handleDownloadSpiceModel(datasheet.id, datasheet.filename)}
                                >
                                  Download Model
                                </button>
                              ) : (
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                  {status === 'completed' ? 'Not generated yet' : 'Processing...'}
                                </p>
                              )}
                            </div>
                          </div>

                          {processingStatus?.message && (
                            <div className="mt-3 p-2 bg-[hsl(var(--info-50))] rounded text-sm text-[hsl(var(--info-700))]">
                              {processingStatus.message}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[hsl(var(--muted-foreground))]">
              <svg className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-medium">Select a product to view details</p>
              <p className="text-sm">Choose a product from the list to see datasheets and processed data</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Add CSS for EPC interface */}
      <style>{`
        .epc-interface {
          margin-bottom: 1rem;
          padding: 1.5rem;
          background: hsl(var(--accent));
          border-radius: 12px;
          border: 1px solid hsl(var(--border));
          max-width: 100%;
          box-sizing: border-box;
        }
        
        .epc-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        
        .epc-header h3 {
          color: hsl(var(--primary));
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-size: 1.25rem;
        }
        
        .epc-description {
          color: hsl(var(--muted-foreground));
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        
        .mock-toggle {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: hsl(var(--muted));
          border-radius: 8px;
          border: 1px solid hsl(var(--border));
        }
        
        .mock-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 500;
          color: hsl(var(--foreground));
          cursor: pointer;
        }
        
        .mock-checkbox {
          width: 1.25rem;
          height: 1.25rem;
          accent-color: hsl(var(--primary));
        }
        
        .mock-text {
          font-weight: 500;
          color: hsl(var(--foreground));
        }
        
        .mock-warning {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: hsl(var(--warning-50));
          border-radius: 6px;
          color: hsl(var(--warning-700));
          font-size: 0.85rem;
          text-align: center;
          border: 1px solid hsl(var(--warning-500));
        }
        
        .scrape-section {
          margin-bottom: 1.5rem;
        }
        
        .scrape-section h4 {
          color: hsl(var(--primary));
          margin-bottom: 0.75rem;
          font-weight: 600;
          font-size: 1.1rem;
        }
        
        .input-group {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        
        .button-group {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.75rem;
          flex-wrap: wrap;
        }
        
        .epc-input {
          flex: 1;
          min-width: 200px;
          padding: 0.75rem;
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          background: hsl(var(--background));
          font-size: 0.9rem;
          transition: all 0.2s ease;
          color: hsl(var(--foreground));
        }
        
        .epc-input:focus {
          outline: none;
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 3px hsl(var(--ring) / 0.2);
        }
        
        .epc-textarea {
          flex: 1;
          min-width: 200px;
          padding: 0.75rem;
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          background: hsl(var(--background));
          min-height: 80px;
          resize: vertical;
          font-size: 0.9rem;
          font-family: inherit;
          transition: all 0.2s ease;
          color: hsl(var(--foreground));
        }
        
        .epc-textarea:focus {
          outline: none;
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 3px hsl(var(--ring) / 0.2);
        }
        
        .scrape-btn {
          padding: 0.75rem 1.5rem;
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        
        .scrape-btn:hover:not(:disabled) {
          background: hsl(var(--primary));
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .scrape-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .batch-btn {
          padding: 0.75rem 1.5rem;
          background: hsl(var(--secondary));
          color: hsl(var(--secondary-foreground));
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        
        .batch-btn:hover:not(:disabled) {
          background: hsl(var(--secondary));
          opacity: 0.8;
          transform: translateY(-1px);
        }
        
        .batch-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .epc-info {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid hsl(var(--border));
          color: hsl(var(--muted-foreground));
          font-size: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          line-height: 1.4;
        }
        
        .info-icon {
          font-size: 1rem;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }
        
        .epc-toggle-btn {
          width: 100%;
          padding: 1rem 1.5rem;
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          font-weight: 600;
          text-align: left;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          margin-bottom: 1rem;
        }
        
        .epc-toggle-btn:hover {
          background: hsl(var(--accent));
          opacity: 0.8;
          transform: translateY(-1px);
        }
        
        .epc-toggle-btn:focus {
          outline: none;
          box-shadow: 0 0 0 3px hsl(var(--ring) / 0.2);
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
          .epc-interface {
            padding: 1rem;
          }
          
          .input-group {
            flex-direction: column;
          }
          
          .epc-input,
          .epc-textarea {
            min-width: 100%;
          }
          
          .button-group {
            justify-content: center;
          }
          
          .scrape-btn,
          .batch-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductPage; 