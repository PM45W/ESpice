import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { batchService, BatchInfo, BatchRequest } from '../services/batchService';

const BatchUploadZone: React.FC<BatchUploadZoneProps> = ({ onBatchCreated }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchName, setBatchName] = useState('');
  const [description, setDescription] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter for PDF files only
    const pdfFiles = acceptedFiles.filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length !== acceptedFiles.length) {
      setError('Some files were skipped. Only PDF files are supported.');
    }
    
    setFiles(prev => [...prev, ...pdfFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
    setError(null);
  };

  const createBatch = async () => {
    if (files.length === 0) {
      setError('Please select at least one PDF file');
      return;
    }

    if (!batchName.trim()) {
      setError('Please enter a batch name');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Create batch request
      const batchRequest: BatchRequest = {
        batch_name: batchName,
        description: description,
        workflow_type: 'full_extraction',
        priority: 'normal'
      };

      // Use batch service to upload
      const result = await batchService.uploadBatch(files, batchRequest);
      
      // Call the callback with batch info
      onBatchCreated(result.batch_id, result.batch_info);
      
    } catch (err) {
      console.error('Error creating batch:', err);
      setError(err instanceof Error ? err.message : 'Failed to create batch');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="batch-upload-zone">
      <div className="upload-header">
        <h2>Upload Multiple PDF Datasheets</h2>
        <p>Drag and drop PDF files or click to select multiple files</p>
      </div>

      <div className="batch-info-inputs">
        <div className="input-group">
          <label htmlFor="batchName">Batch Name *</label>
          <input
            id="batchName"
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="Enter batch name (e.g., GaN HEMT Models - Q1 225)"
            disabled={isUploading}
          />
        </div>

        <div className="input-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this batch of datasheets..."
            rows={3}
            disabled={isUploading}
          />
        </div>
      </div>

      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'active' : ''} ${files.length > 0 ? 'has-files' : ''}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the PDF files here...</p>
        ) : (
          <div className="dropzone-content">
            <div className="upload-icon">📄</div>
            <p>Drag & drop PDF files here, or click to select files</p>
            <p className="file-limit">Supports up to 50+ files</p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="file-list">
          <div className="file-list-header">
            <h3>Selected Files ({files.length})</h3>
            <button 
              type="button" 
              onClick={clearFiles}
              disabled={isUploading}
              className="clear-files-btn"
            >
              Clear All
            </button>
          </div>
          
          <div className="files">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <span className="file-name">{file.name}</span>
                <span className="file-size">({(file.size / 1024 /1024).toFixed(2)} MB)</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                  className="remove-file-btn"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="upload-actions">
        <button
          type="button"
          onClick={createBatch}
          disabled={files.length === 0 || !batchName.trim() || isUploading}
          className="create-batch-btn"
        >
          {isUploading ? 'Creating Batch...' : `Create Batch (${files.length} files)`}
        </button>
      </div>
    </div>
  );
};

export default BatchUploadZone; 