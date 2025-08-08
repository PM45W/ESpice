import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import Button from './Button';
import { TestDataUpload as TestDataUploadType, TestDataType } from '../services/testCorrelationService';

interface TestDataUploadProps {
  onUploadComplete: (testDataId: string) => void;
  deviceId?: string;
}

const TestDataUpload: React.FC<TestDataUploadProps> = ({ onUploadComplete, deviceId }) => {
  const [uploadInfo, setUploadInfo] = useState<TestDataUploadType>({
    device_id: deviceId || '',
    test_type: 'iv_curve',
    temperature: 25,
    description: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setUploadStatus({ type: 'idle', message: '' });

    try {
      // Import the service dynamically to avoid circular dependencies
      const { testCorrelationService } = await import('../services/testCorrelationService');
      
      const result = await testCorrelationService.uploadTestData(file, uploadInfo);
      
      if (result.success) {
        setUploadStatus({
          type: 'success',
          message: `Test data uploaded successfully! ID: ${result.test_data_id}`,
        });
        onUploadComplete(result.test_data_id);
      } else {
        setUploadStatus({
          type: 'error',
          message: result.message || 'Upload failed',
        });
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      setIsUploading(false);
    }
  }, [uploadInfo, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/plain': ['.txt'],
    },
    multiple: false,
  });

  const handleInputChange = (field: keyof TestDataUploadType, value: any) => {
    setUploadInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleVoltageRangeChange = (value: string) => {
    const ranges = value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    handleInputChange('voltage_range', ranges.length > 0 ? ranges : undefined);
  };

  const handleFrequencyRangeChange = (value: string) => {
    const ranges = value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    handleInputChange('frequency_range', ranges.length > 0 ? ranges : undefined);
  };

  return (
    <div className="test-data-upload">
      <div className="upload-section">
        <h3>Upload Test Data</h3>
        <p className="upload-description">
          Upload test data files (CSV, JSON) to validate extracted parameters against real silicon measurements.
        </p>

        {/* Upload Form */}
        <div className="upload-form">
          <div className="form-group">
            <label htmlFor="device-id">Device ID *</label>
            <input
              id="device-id"
              type="text"
              value={uploadInfo.device_id}
              onChange={(e) => handleInputChange('device_id', e.target.value)}
              placeholder="Enter device identifier"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="test-type">Test Type *</label>
            <select
              id="test-type"
              value={uploadInfo.test_type}
              onChange={(e) => handleInputChange('test_type', e.target.value as keyof TestDataType)}
            >
              <option value="iv_curve">I-V Curve</option>
              <option value="cv_curve">C-V Curve</option>
              <option value="temperature">Temperature</option>
              <option value="frequency">Frequency</option>
              <option value="noise">Noise</option>
              <option value="aging">Aging</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="temperature">Temperature (°C)</label>
            <input
              id="temperature"
              type="number"
              value={uploadInfo.temperature || ''}
              onChange={(e) => handleInputChange('temperature', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="25"
            />
          </div>

          <div className="form-group">
            <label htmlFor="voltage-range">Voltage Range (V)</label>
            <input
              id="voltage-range"
              type="text"
              value={uploadInfo.voltage_range?.join(', ') || ''}
              onChange={(e) => handleVoltageRangeChange(e.target.value)}
              placeholder="0, 5, 10, 15, 20"
            />
          </div>

          <div className="form-group">
            <label htmlFor="frequency-range">Frequency Range (Hz)</label>
            <input
              id="frequency-range"
              type="text"
              value={uploadInfo.frequency_range?.join(', ') || ''}
              onChange={(e) => handleFrequencyRangeChange(e.target.value)}
              placeholder="1e6, 1e7, 1e8, 1e9"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={uploadInfo.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Test conditions, equipment used, etc."
              rows={3}
            />
          </div>
        </div>

        {/* File Drop Zone */}
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''} ${isDragReject ? 'reject' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="dropzone-content">
            {isUploading ? (
              <div className="upload-loading">
                <Loader className="spinner" />
                <p>Uploading test data...</p>
              </div>
            ) : (
              <>
                <Upload className="upload-icon" />
                <p className="dropzone-text">
                  {isDragActive
                    ? 'Drop the test data file here'
                    : 'Drag & drop test data file here, or click to select'}
                </p>
                <p className="dropzone-hint">
                  Supported formats: CSV, JSON, TXT
                </p>
              </>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {uploadStatus.type !== 'idle' && (
          <div className={`status-message ${uploadStatus.type}`}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="status-icon" />
            ) : (
              <AlertCircle className="status-icon" />
            )}
            <span>{uploadStatus.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestDataUpload; 