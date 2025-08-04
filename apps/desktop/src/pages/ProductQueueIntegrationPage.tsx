import React, { useEffect, useState, useCallback } from 'react';
import { productQueueIntegrationService, GraphImageRecord, GraphExtractionJobRecord, GraphExtractionResultRecord } from '../services/productQueueIntegrationService';
import productManagementService from '../services/productManagementService';
import { ProductWithParameters } from '../services/productManagementService';
import '../styles/product-queue-integration.css';

const ProductQueueIntegrationPage: React.FC = () => {
  const [products, setProducts] = useState<ProductWithParameters[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithParameters | null>(null);
  const [productImages, setProductImages] = useState<GraphImageRecord[]>([]);
  const [extractionJobs, setExtractionJobs] = useState<GraphExtractionJobRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'images' | 'jobs' | 'results' | 'upload'>('overview');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'standard' | 'legacy' | 'llm'>('standard');
  const [uploadPriority, setUploadPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [autoCreateJobs, setAutoCreateJobs] = useState(true);
  const [stats, setStats] = useState<{
    totalImages: number;
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    pendingJobs: number;
    processingJobs: number;
    averageProcessingTime: number;
  } | null>(null);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // Load product data when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      loadProductData(selectedProduct.id);
    } else {
      setProductImages([]);
      setExtractionJobs([]);
      setStats(null);
    }
  }, [selectedProduct]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsData = await productManagementService.getProducts();
      setProducts(productsData);
    } catch (error) {
      setError('Failed to load products');
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductData = async (productId: string) => {
    try {
      setLoading(true);
      const [images, jobs, productStats] = await Promise.all([
        productQueueIntegrationService.getProductImages(productId),
        productQueueIntegrationService.getProductExtractionJobs(productId),
        productQueueIntegrationService.getProductExtractionStats(productId)
      ]);
      
      setProductImages(images);
      setExtractionJobs(jobs);
      setStats(productStats);
    } catch (error) {
      setError('Failed to load product data');
      console.error('Error loading product data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadFile(file);
    } else {
      setError('Please select a valid image file');
    }
  };

  const handleUpload = async () => {
    if (!selectedProduct || !uploadFile) {
      setError('Please select a product and image file');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await productQueueIntegrationService.uploadProductImage({
        productId: selectedProduct.id,
        imageFile: uploadFile,
        description: uploadDescription,
        extractionMethod: uploadMethod,
        priority: uploadPriority
      });

      // Refresh product data
      await loadProductData(selectedProduct.id);

      // Reset upload form
      setUploadFile(null);
      setUploadDescription('');
      setUploadMethod('standard');
      setUploadPriority('normal');

      // Switch to images tab to show the new image
      setActiveTab('images');
    } catch (error) {
      setError('Failed to upload image');
      console.error('Error uploading image:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (imageId: string) => {
    if (!selectedProduct) return;

    try {
      setLoading(true);
      await productQueueIntegrationService.createExtractionJob({
        productId: selectedProduct.id,
        imageId,
        extractionMethod: 'standard',
        priority: 'normal'
      });
      await loadProductData(selectedProduct.id);
    } catch (error) {
      setError('Failed to create extraction job');
      console.error('Error creating job:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      setLoading(true);
      await productQueueIntegrationService.retryExtractionJob(jobId);
      if (selectedProduct) {
        await loadProductData(selectedProduct.id);
      }
    } catch (error) {
      setError('Failed to retry job');
      console.error('Error retrying job:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      setLoading(true);
      await productQueueIntegrationService.deleteProductImage(imageId);
      if (selectedProduct) {
        await loadProductData(selectedProduct.id);
      }
    } catch (error) {
      setError('Failed to delete image');
      console.error('Error deleting image:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      setLoading(true);
      await productQueueIntegrationService.deleteExtractionJob(jobId);
      if (selectedProduct) {
        await loadProductData(selectedProduct.id);
      }
    } catch (error) {
      setError('Failed to delete job');
      console.error('Error deleting job:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'failed': return 'danger';
      case 'pending': return 'info';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'danger';
      case 'high': return 'warning';
      case 'normal': return 'info';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="product-queue-integration-page">
      <div className="page-header">
        <h1>Product Queue Integration</h1>
        <p>Phase 6: Integration between product database and graph extraction queue system</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')} className="close-btn">×</button>
        </div>
      )}

      <div className="main-content">
        {/* Product Selection */}
        <div className="product-selection">
          <h2>Select Product</h2>
          <select 
            value={selectedProduct?.id || ''} 
            onChange={(e) => {
              const product = products.find(p => p.id === e.target.value);
              setSelectedProduct(product || null);
            }}
            disabled={loading}
          >
            <option value="">Choose a product...</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.manufacturer} - {product.partNumber} ({product.name})
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <>
            {/* Product Info */}
            <div className="product-info">
              <h3>{selectedProduct.name}</h3>
              <p><strong>Manufacturer:</strong> {selectedProduct.manufacturer}</p>
              <p><strong>Part Number:</strong> {selectedProduct.partNumber}</p>
              <p><strong>Device Type:</strong> {selectedProduct.deviceType}</p>
              <p><strong>Package:</strong> {selectedProduct.package}</p>
            </div>

            {/* Tabs */}
            <div className="tabs">
              <button 
                className={activeTab === 'overview' ? 'active' : ''} 
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button 
                className={activeTab === 'images' ? 'active' : ''} 
                onClick={() => setActiveTab('images')}
              >
                Images ({productImages.length})
              </button>
              <button 
                className={activeTab === 'jobs' ? 'active' : ''} 
                onClick={() => setActiveTab('jobs')}
              >
                Jobs ({extractionJobs.length})
              </button>
              <button 
                className={activeTab === 'results' ? 'active' : ''} 
                onClick={() => setActiveTab('results')}
              >
                Results
              </button>
              <button 
                className={activeTab === 'upload' ? 'active' : ''} 
                onClick={() => setActiveTab('upload')}
              >
                Upload Image
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-tab">
                  <h3>Extraction Overview</h3>
                  {stats && (
                    <div className="stats-grid">
                      <div className="stat-item">
                        <div className="stat-label">Total Images</div>
                        <div className="stat-value">{stats.totalImages}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Total Jobs</div>
                        <div className="stat-value">{stats.totalJobs}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Completed</div>
                        <div className="stat-value success">{stats.completedJobs}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Failed</div>
                        <div className="stat-value danger">{stats.failedJobs}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Pending</div>
                        <div className="stat-value info">{stats.pendingJobs}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Processing</div>
                        <div className="stat-value warning">{stats.processingJobs}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Avg Processing Time</div>
                        <div className="stat-value">{stats.averageProcessingTime.toFixed(1)}s</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'images' && (
                <div className="images-tab">
                  <h3>Product Images</h3>
                  {productImages.length === 0 ? (
                    <p>No images uploaded for this product yet.</p>
                  ) : (
                    <div className="images-grid">
                      {productImages.map(image => (
                        <div key={image.id} className="image-card">
                          <div className="image-header">
                            <h4>{image.filename}</h4>
                            <span className={`status-badge ${getStatusColor(image.status)}`}>
                              {image.status}
                            </span>
                          </div>
                          <div className="image-details">
                            <p><strong>Size:</strong> {formatFileSize(image.fileSize)}</p>
                            <p><strong>Type:</strong> {image.mimeType}</p>
                            {image.dimensions && (
                              <p><strong>Dimensions:</strong> {image.dimensions.width} × {image.dimensions.height}</p>
                            )}
                            <p><strong>Uploaded:</strong> {formatDate(image.uploadDate)}</p>
                            {image.description && (
                              <p><strong>Description:</strong> {image.description}</p>
                            )}
                          </div>
                          <div className="image-actions">
                            {image.status === 'pending' && (
                              <button 
                                onClick={() => handleCreateJob(image.id)}
                                disabled={loading}
                                className="btn btn-primary btn-sm"
                              >
                                Create Job
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteImage(image.id)}
                              disabled={loading}
                              className="btn btn-danger btn-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'jobs' && (
                <div className="jobs-tab">
                  <h3>Extraction Jobs</h3>
                  {extractionJobs.length === 0 ? (
                    <p>No extraction jobs for this product yet.</p>
                  ) : (
                    <div className="jobs-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Job ID</th>
                            <th>Image</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Method</th>
                            <th>Progress</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {extractionJobs.map(job => (
                            <tr key={job.id}>
                              <td className="job-id">{job.id}</td>
                              <td>
                                {productImages.find(img => img.id === job.imageId)?.filename || 'Unknown'}
                              </td>
                              <td>
                                <span className={`status-badge ${getStatusColor(job.status)}`}>
                                  {job.status}
                                </span>
                              </td>
                              <td>
                                <span className={`priority-badge ${getPriorityColor(job.priority)}`}>
                                  {job.priority}
                                </span>
                              </td>
                              <td>{job.extractionMethod}</td>
                              <td>
                                <div className="progress-container">
                                  <div className="progress-bar">
                                    <div 
                                      className="progress-fill" 
                                      style={{ width: `${job.progress}%` }}
                                    ></div>
                                  </div>
                                  <span className="progress-text">{job.progress}%</span>
                                </div>
                              </td>
                              <td>{formatDate(job.createdAt)}</td>
                              <td className="job-actions">
                                {job.status === 'failed' && (
                                  <button 
                                    onClick={() => handleRetryJob(job.id)}
                                    disabled={loading}
                                    className="btn btn-warning btn-xs"
                                  >
                                    Retry
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDeleteJob(job.id)}
                                  disabled={loading}
                                  className="btn btn-danger btn-xs"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'results' && (
                <div className="results-tab">
                  <h3>Extraction Results</h3>
                  {extractionJobs.filter(job => job.status === 'completed' && job.extractionResult).length === 0 ? (
                    <p>No completed extraction results yet.</p>
                  ) : (
                    <div className="results-grid">
                      {extractionJobs
                        .filter(job => job.status === 'completed' && job.extractionResult)
                        .map(job => (
                          <div key={job.id} className="result-card">
                            <div className="result-header">
                              <h4>Job {job.id}</h4>
                              <span className="confidence-badge">
                                {Math.round((job.extractionResult?.confidence || 0) * 100)}% confidence
                              </span>
                            </div>
                            <div className="result-details">
                              <p><strong>Method:</strong> {job.extractionResult?.extractionMethod}</p>
                              <p><strong>Data Points:</strong> {job.extractionResult?.dataPoints || 'N/A'}</p>
                              <p><strong>Processing Time:</strong> {job.extractionResult?.processingTime?.toFixed(2)}s</p>
                              <p><strong>CSV File:</strong> {job.extractionResult?.csvFilePath}</p>
                            </div>
                            {job.extractionResult?.csvData && (
                              <div className="csv-preview">
                                <h5>CSV Data Preview</h5>
                                <pre>{JSON.stringify(job.extractionResult.csvData.slice(0, 5), null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'upload' && (
                <div className="upload-tab">
                  <h3>Upload Image</h3>
                  <div className="upload-form">
                    <div className="form-group">
                      <label>Image File:</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Description:</label>
                      <input 
                        type="text" 
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="Enter image description..."
                        disabled={loading}
                      />
                    </div>

                    <div className="form-group">
                      <label>Extraction Method:</label>
                      <select 
                        value={uploadMethod}
                        onChange={(e) => setUploadMethod(e.target.value as any)}
                        disabled={loading}
                      >
                        <option value="standard">Standard</option>
                        <option value="legacy">Legacy</option>
                        <option value="llm">LLM Assisted</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Priority:</label>
                      <select 
                        value={uploadPriority}
                        onChange={(e) => setUploadPriority(e.target.value as any)}
                        disabled={loading}
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>
                        <input 
                          type="checkbox" 
                          checked={autoCreateJobs}
                          onChange={(e) => setAutoCreateJobs(e.target.checked)}
                          disabled={loading}
                        />
                        Auto-create extraction job
                      </label>
                    </div>

                    <button 
                      onClick={handleUpload}
                      disabled={!uploadFile || loading}
                      className="btn btn-primary"
                    >
                      {loading ? 'Uploading...' : 'Upload Image'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductQueueIntegrationPage; 