import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  X,
  FileText,
  Cpu,
  Database,
  Settings,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';
import epcProductDownloadService, { 
  EPCProduct, 
  EPCDownloadResult, 
  EPCBatchDownloadResult,
  EPCProductSearchResult 
} from '../services/epcProductDownloadService';

interface EPCDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadComplete: (results: EPCDownloadResult[]) => void;
}

interface DownloadProgress {
  total: number;
  completed: number;
  failed: number;
  current: string;
  status: 'idle' | 'downloading' | 'completed' | 'error';
}

const EPCDownloadModal: React.FC<EPCDownloadModalProps> = ({
  isOpen,
  onClose,
  onDownloadComplete
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'search' | 'all'>('single');
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    current: '',
    status: 'idle'
  });

  // Single download state
  const [singleModelNumber, setSingleModelNumber] = useState('');
  const [includeDatasheet, setIncludeDatasheet] = useState(true);
  const [includeSpiceModel, setIncludeSpiceModel] = useState(true);

  // Batch download state
  const [batchModelNumbers, setBatchModelNumbers] = useState('');
  const [batchIncludeDatasheets, setBatchIncludeDatasheets] = useState(true);
  const [batchIncludeSpiceModels, setBatchIncludeSpiceModels] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EPCProduct[]>([]);
  const [selectedSearchProducts, setSelectedSearchProducts] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);

  // All products download state
  const [allIncludeDatasheets, setAllIncludeDatasheets] = useState(true);
  const [allIncludeSpiceModels, setAllIncludeSpiceModels] = useState(true);
  const [batchSize, setBatchSize] = useState(10);

  // Results state
  const [downloadResults, setDownloadResults] = useState<EPCDownloadResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setActiveTab('single');
      setDownloadProgress({
        total: 0,
        completed: 0,
        failed: 0,
        current: '',
        status: 'idle'
      });
      setSingleModelNumber('');
      setBatchModelNumbers('');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedSearchProducts(new Set());
      setDownloadResults([]);
      setShowResults(false);
    }
  }, [isOpen]);

  const handleSingleDownload = async () => {
    if (!singleModelNumber.trim()) {
      alert('Please enter a model number');
      return;
    }

    setDownloadProgress({
      total: 1,
      completed: 0,
      failed: 0,
      current: singleModelNumber,
      status: 'downloading'
    });

    try {
      const result = await epcProductDownloadService.downloadEPCProduct(
        singleModelNumber.trim(),
        includeDatasheet,
        includeSpiceModel
      );

      setDownloadResults([result]);
      setDownloadProgress(prev => ({
        ...prev,
        completed: result.success ? 1 : 0,
        failed: result.success ? 0 : 1,
        status: 'completed'
      }));

      if (result.success) {
        onDownloadComplete([result]);
      }
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadProgress(prev => ({
        ...prev,
        failed: 1,
        status: 'error'
      }));
    }
  };

  const handleBatchDownload = async () => {
    const modelNumbers = batchModelNumbers
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (modelNumbers.length === 0) {
      alert('Please enter at least one model number');
      return;
    }

    setDownloadProgress({
      total: modelNumbers.length,
      completed: 0,
      failed: 0,
      current: modelNumbers[0],
      status: 'downloading'
    });

    try {
      const result = await epcProductDownloadService.batchDownloadEPCProducts(
        modelNumbers,
        batchIncludeDatasheets,
        batchIncludeSpiceModels
      );

      setDownloadResults(result.results);
      setDownloadProgress({
        total: result.totalRequested,
        completed: result.successful,
        failed: result.failed,
        current: '',
        status: 'completed'
      });

      if (result.successful > 0) {
        onDownloadComplete(result.results.filter(r => r.success));
      }
    } catch (error) {
      console.error('Batch download failed:', error);
      setDownloadProgress(prev => ({
        ...prev,
        status: 'error'
      }));
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const result = await epcProductDownloadService.searchEPCProducts(searchQuery, 50);
      setSearchResults(result.products);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchDownload = async () => {
    const selectedProducts = searchResults.filter(p => selectedSearchProducts.has(p.modelNumber));
    
    if (selectedProducts.length === 0) {
      alert('Please select at least one product');
      return;
    }

    setDownloadProgress({
      total: selectedProducts.length,
      completed: 0,
      failed: 0,
      current: selectedProducts[0].modelNumber,
      status: 'downloading'
    });

    try {
      const result = await epcProductDownloadService.batchDownloadEPCProducts(
        selectedProducts.map(p => p.modelNumber),
        true,
        true
      );

      setDownloadResults(result.results);
      setDownloadProgress({
        total: result.totalRequested,
        completed: result.successful,
        failed: result.failed,
        current: '',
        status: 'completed'
      });

      if (result.successful > 0) {
        onDownloadComplete(result.results.filter(r => r.success));
      }
    } catch (error) {
      console.error('Search download failed:', error);
      setDownloadProgress(prev => ({
        ...prev,
        status: 'error'
      }));
    }
  };

  const handleDownloadAll = async () => {
    const confirmed = confirm(
      `This will download ALL ${epcProductDownloadService.getKnownEPCProducts().length} EPC products. ` +
      'This may take a very long time and use significant bandwidth. Continue?'
    );

    if (!confirmed) return;

    setDownloadProgress({
      total: epcProductDownloadService.getKnownEPCProducts().length,
      completed: 0,
      failed: 0,
      current: 'Starting...',
      status: 'downloading'
    });

    try {
      const result = await epcProductDownloadService.downloadAllEPCProducts(
        allIncludeDatasheets,
        allIncludeSpiceModels,
        batchSize
      );

      setDownloadResults(result.results);
      setDownloadProgress({
        total: result.totalRequested,
        completed: result.successful,
        failed: result.failed,
        current: '',
        status: 'completed'
      });

      if (result.successful > 0) {
        onDownloadComplete(result.results.filter(r => r.success));
      }
    } catch (error) {
      console.error('Download all failed:', error);
      setDownloadProgress(prev => ({
        ...prev,
        status: 'error'
      }));
    }
  };

  const toggleSearchProduct = (modelNumber: string) => {
    const newSelected = new Set(selectedSearchProducts);
    if (newSelected.has(modelNumber)) {
      newSelected.delete(modelNumber);
    } else {
      newSelected.add(modelNumber);
    }
    setSelectedSearchProducts(newSelected);
  };

  const selectAllSearchProducts = () => {
    setSelectedSearchProducts(new Set(searchResults.map(p => p.modelNumber)));
  };

  const deselectAllSearchProducts = () => {
    setSelectedSearchProducts(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl border border-border max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Download className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Download EPC GaN Products</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        {downloadProgress.status !== 'idle' && (
          <div className="px-6 py-3 bg-muted border-b border-border">
            <div className="flex items-center gap-3 mb-2">
              {downloadProgress.status === 'downloading' && <Clock className="w-4 h-4 text-blue-500 animate-spin" />}
              {downloadProgress.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
              {downloadProgress.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
              <span className="text-sm font-medium">
                {downloadProgress.status === 'downloading' && `Downloading... ${downloadProgress.current}`}
                {downloadProgress.status === 'completed' && 'Download completed'}
                {downloadProgress.status === 'error' && 'Download failed'}
              </span>
            </div>
            <div className="w-full bg-background rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${downloadProgress.total > 0 ? (downloadProgress.completed / downloadProgress.total) * 100 : 0}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{downloadProgress.completed} completed</span>
              <span>{downloadProgress.failed} failed</span>
              <span>{downloadProgress.total} total</span>
            </div>
          </div>
        )}

        <div className="flex h-[60vh]">
          {/* Tabs */}
          <div className="w-64 border-r border-border bg-muted/30">
            <nav className="p-4 space-y-2">
              <button
                onClick={() => setActiveTab('single')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'single' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>Single Product</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('batch')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'batch' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>Batch Download</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'search' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  <span>Search & Download</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'all' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  <span>Download All</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Single Product Tab */}
            {activeTab === 'single' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    EPC Model Number
                  </label>
                  <input
                    type="text"
                    value={singleModelNumber}
                    onChange={(e) => setSingleModelNumber(e.target.value.toUpperCase())}
                    placeholder="e.g., EPC2040"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeDatasheet}
                      onChange={(e) => setIncludeDatasheet(e.target.checked)}
                      className="rounded border-border"
                    />
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Include Datasheet (PDF)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeSpiceModel}
                      onChange={(e) => setIncludeSpiceModel(e.target.checked)}
                      className="rounded border-border"
                    />
                    <Cpu className="w-4 h-4" />
                    <span className="text-sm">Include SPICE Model</span>
                  </label>
                </div>

                <button
                  onClick={handleSingleDownload}
                  disabled={downloadProgress.status === 'downloading'}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Download Product
                </button>
              </div>
            )}

            {/* Batch Download Tab */}
            {activeTab === 'batch' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    EPC Model Numbers (one per line)
                  </label>
                  <textarea
                    value={batchModelNumbers}
                    onChange={(e) => setBatchModelNumbers(e.target.value)}
                    placeholder="EPC2040&#10;EPC2010&#10;EPC2001"
                    rows={8}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground font-mono"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={batchIncludeDatasheets}
                      onChange={(e) => setBatchIncludeDatasheets(e.target.checked)}
                      className="rounded border-border"
                    />
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Include Datasheets</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={batchIncludeSpiceModels}
                      onChange={(e) => setBatchIncludeSpiceModels(e.target.checked)}
                      className="rounded border-border"
                    />
                    <Cpu className="w-4 h-4" />
                    <span className="text-sm">Include SPICE Models</span>
                  </label>
                </div>

                <button
                  onClick={handleBatchDownload}
                  disabled={downloadProgress.status === 'downloading'}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Download Batch
                </button>
              </div>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search EPC products..."
                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isSearching ? <Clock className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Found {searchResults.length} products
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={selectAllSearchProducts}
                          className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                        >
                          Select All
                        </button>
                        <button
                          onClick={deselectAllSearchProducts}
                          className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {searchResults.map((product) => (
                        <label key={product.modelNumber} className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSearchProducts.has(product.modelNumber)}
                            onChange={() => toggleSearchProduct(product.modelNumber)}
                            className="rounded border-border"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{product.modelNumber}</div>
                            <div className="text-sm text-muted-foreground">{product.name}</div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(product.productUrl, '_blank');
                            }}
                            className="p-1 hover:bg-background rounded"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </label>
                      ))}
                    </div>

                    <button
                      onClick={handleSearchDownload}
                      disabled={downloadProgress.status === 'downloading' || selectedSearchProducts.size === 0}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      Download Selected ({selectedSearchProducts.size})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Download All Tab */}
            {activeTab === 'all' && (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Warning</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    This will download ALL {epcProductDownloadService.getKnownEPCProducts().length} EPC products. 
                    This operation may take several hours and use significant bandwidth.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allIncludeDatasheets}
                      onChange={(e) => setAllIncludeDatasheets(e.target.checked)}
                      className="rounded border-border"
                    />
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Include Datasheets</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allIncludeSpiceModels}
                      onChange={(e) => setAllIncludeSpiceModels(e.target.checked)}
                      className="rounded border-border"
                    />
                    <Cpu className="w-4 h-4" />
                    <span className="text-sm">Include SPICE Models</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
                    min="1"
                    max="50"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of products to download in each batch (smaller = slower but more reliable)
                  </p>
                </div>

                <button
                  onClick={handleDownloadAll}
                  disabled={downloadProgress.status === 'downloading'}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Download All EPC Products
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {downloadResults.length > 0 && (
          <div className="border-t border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Download Results</h3>
              <button
                onClick={() => setShowResults(!showResults)}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
              >
                {showResults ? 'Hide' : 'Show'} Details
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {downloadResults.filter(r => r.success).length}
                </div>
                <div className="text-sm text-green-700">Successful</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {downloadResults.filter(r => !r.success).length}
                </div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {downloadResults.length}
                </div>
                <div className="text-sm text-blue-700">Total</div>
              </div>
            </div>

            {showResults && (
              <div className="max-h-40 overflow-y-auto space-y-2">
                {downloadResults.map((result, index) => (
                  <div key={index} className={`p-3 rounded-lg ${
                    result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="font-medium">{result.product.modelNumber}</span>
                      <span className="text-sm text-muted-foreground">{result.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EPCDownloadModal;
