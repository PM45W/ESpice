import React, { useState, useEffect } from 'react';
import { X, Zap, Download, AlertCircle, CheckCircle, Upload, Settings, FileText } from 'lucide-react';
import Button from './Button';
import { mcpService } from '../services/mcpService';
import { productService, spiceModelService } from '../services/database';
import type { Product, SPICEModel } from '../types';
import MCPProcessingSteps from './MCPProcessingSteps';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  onModelGenerated?: (model: SPICEModel) => void;
}

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message: string;
}

const MCPModelGenerationModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  product, 
  onModelGenerated 
}) => {
  const [step, setStep] = useState<'upload' | 'processing' | 'model' | 'preview'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedModelType, setSelectedModelType] = useState<string>('asm_hemt');
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [generatedModel, setGeneratedModel] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('GaN-HEMT');

  useEffect(() => {
    if (isOpen) {
      loadAvailableModels();
      if (product) {
        setDeviceName(product.name);
        setDeviceType(product.type || 'GaN-HEMT');
      }
    }
  }, [isOpen, product]);

  const loadAvailableModels = async () => {
    try {
      const models = await mcpService.getAvailableModels();
      setAvailableModels(models.models);
    } catch (error) {
      console.error('Failed to load available models:', error);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
  };

  const handleGenerateModel = async () => {
    if (!selectedFile) {
      setError('Please select a PDF datasheet');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStep('processing');

    // Initialize processing steps
    const steps: ProcessingStep[] = [
      { id: 'upload', name: 'Uploading PDF', status: 'pending', message: 'Ready to upload' },
      { id: 'extract', name: 'Extracting parameters', status: 'pending', message: 'Waiting for upload' },
      { id: 'fit', name: 'Fitting parameters', status: 'pending', message: 'Waiting for extraction' },
      { id: 'generate', name: 'Generating SPICE model', status: 'pending', message: 'Waiting for fitting' }
    ];
    setProcessingSteps(steps);

    try {
      // Step 1: Upload and process PDF
      updateStepStatus('upload', 'processing', 'Uploading PDF to MCP server...');
      
      // Convert file to path for Tauri
      const filePath = URL.createObjectURL(selectedFile);
      
      // Process PDF with MCP server
      updateStepStatus('upload', 'completed', 'PDF uploaded successfully');
      updateStepStatus('extract', 'processing', 'Extracting parameters from datasheet...');

      const pdfResult = await mcpService.processPDF(filePath);
      
      if (!pdfResult.success) {
        throw new Error(pdfResult.error || 'PDF processing failed');
      }

      updateStepStatus('extract', 'completed', 'Parameters extracted successfully');
      updateStepStatus('fit', 'processing', 'Fitting parameters to model...');

      // Step 2: Fit parameters
      const fitResult = await mcpService.fitParameters(
        pdfResult.data,
        selectedModelType
      );

      if (!fitResult.success) {
        throw new Error('Parameter fitting failed');
      }

      updateStepStatus('fit', 'completed', 'Parameters fitted successfully');
      updateStepStatus('generate', 'processing', 'Generating SPICE model...');

      // Step 3: Generate SPICE model
      const spiceResult = await mcpService.generateSPICE(
        deviceName,
        deviceType,
        selectedModelType,
        fitResult.fitted_parameters,
        pdfResult.data
      );

      if (!spiceResult.success) {
        throw new Error('SPICE model generation failed');
      }

      updateStepStatus('generate', 'completed', 'SPICE model generated successfully');

      setGeneratedModel(spiceResult);
      setStep('preview');

      // Save to database
      if (product) {
        const model: Omit<SPICEModel, 'id'> = {
          productId: product.id,
          modelText: spiceResult.model,
          parameters: spiceResult.parameters,
          version: selectedModelType,
          createdAt: new Date(),
          validatedAt: new Date()
        };

        const savedModel = await spiceModelService.create(model);
        onModelGenerated?.(savedModel);
      }

    } catch (error) {
      console.error('Generation failed:', error);
      setError(error instanceof Error ? error.message : 'Generation failed');
      
      // Update failed step
      const failedStep = processingSteps.find(step => step.status === 'processing');
      if (failedStep) {
        updateStepStatus(failedStep.id, 'error', error instanceof Error ? error.message : 'Failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const updateStepStatus = (stepId: string, status: ProcessingStep['status'], message: string = '') => {
    setProcessingSteps(prev => 
      prev.map(step => 
        step.id === stepId 
          ? { ...step, status, message }
          : step
      )
    );
  };

  const handleExportModel = (format: 'generic' | 'ltspice' | 'kicad') => {
    if (!generatedModel) return;

    const filename = `${deviceName}_${selectedModelType}.${format === 'ltspice' ? 'asc' : format === 'kicad' ? 'lib' : 'cir'}`;
    const blob = new Blob([generatedModel.model], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetModal = () => {
    setStep('upload');
    setSelectedFile(null);
    setGeneratedModel(null);
    setError(null);
    setProcessingSteps([]);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content mcp-model-generation-modal">
        <div className="modal-header">
          <h2>Generate SPICE Model with MCP Server</h2>
          <button onClick={handleClose} className="close-button">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {step === 'upload' && (
            <div className="upload-section">
              <div className="upload-header">
                <FileText size={48} className="upload-icon" />
                <h3>Upload Datasheet</h3>
                <p>Select a PDF datasheet to automatically generate a SPICE model</p>
              </div>

              <div className="model-type-selection">
                <label>Select Model Type:</label>
                <select 
                  value={selectedModelType} 
                  onChange={(e) => setSelectedModelType(e.target.value)}
                  className="model-type-select"
                >
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="device-info">
                <div className="info-group">
                  <label>Device Name:</label>
                  <input 
                    type="text" 
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="Enter device name"
                  />
                </div>
                <div className="info-group">
                  <label>Device Type:</label>
                  <select 
                    value={deviceType} 
                    onChange={(e) => setDeviceType(e.target.value)}
                  >
                    <option value="GaN-HEMT">GaN-HEMT</option>
                    <option value="SiC-MOSFET">SiC-MOSFET</option>
                    <option value="Si-MOSFET">Si-MOSFET</option>
                  </select>
                </div>
              </div>

              <div className="file-upload-area">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="file-input"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="file-upload-label">
                  <Upload size={24} />
                  <span>{selectedFile ? selectedFile.name : 'Choose PDF file'}</span>
                </label>
              </div>

              {error && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="supported-formats">
                <p>Supported formats: PDF datasheets with parameter tables and I-V curves</p>
              </div>
            </div>
          )}

              {step === 'processing' && (
                <div className="processing-section">
                  <h3>Processing Datasheet</h3>
                  <MCPProcessingSteps steps={processingSteps} />
                  
                  {isProcessing && (
                    <div className="processing-info">
                      <div className="spinner"></div>
                      <p>Please wait while we process your datasheet...</p>
                    </div>
                  )}
                </div>
              )}

          {step === 'preview' && generatedModel && (
            <div className="preview-section">
              <div className="preview-header">
                <CheckCircle className="success-icon" />
                <h3>SPICE Model Generated Successfully!</h3>
              </div>

              <div className="model-summary">
                <div className="summary-grid">
                  <div className="summary-item">
                    <label>Device:</label>
                    <span>{deviceName}</span>
                  </div>
                  <div className="summary-item">
                    <label>Type:</label>
                    <span>{deviceType}</span>
                  </div>
                  <div className="summary-item">
                    <label>Model:</label>
                    <span>{availableModels.find(m => m.id === selectedModelType)?.name}</span>
                  </div>
                  <div className="summary-item">
                    <label>Parameters:</label>
                    <span>{Object.keys(generatedModel.parameters).length}</span>
                  </div>
                </div>
              </div>

              <div className="parameters-preview">
                <h4>Extracted Parameters</h4>
                <div className="parameters-grid">
                  {Object.entries(generatedModel.parameters).map(([key, value]) => (
                    <div key={key} className="parameter-item">
                      <span className="param-name">{key}:</span>
                      <span className="param-value">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="model-code">
                <h4>SPICE Model Code</h4>
                <div className="code-preview">
                  <pre><code>{generatedModel.model}</code></pre>
                </div>
              </div>

              <div className="export-options">
                <h4>Export Options</h4>
                <div className="export-buttons">
                  <Button 
                    variant="secondary" 
                    onClick={() => handleExportModel('generic')}
                  >
                    Generic SPICE (.cir)
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => handleExportModel('ltspice')}
                  >
                    LTSpice (.asc)
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => handleExportModel('kicad')}
                  >
                    KiCad (.lib)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 'upload' && (
            <>
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleGenerateModel}
                disabled={!selectedFile || !deviceName}
                icon={Zap}
              >
                Generate Model
              </Button>
            </>
          )}

          {step === 'processing' && (
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
              <Button 
                variant="primary" 
                onClick={() => handleExportModel('generic')}
                icon={Download}
              >
                Export Model
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MCPModelGenerationModal;
