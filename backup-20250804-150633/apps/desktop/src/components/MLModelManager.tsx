import React, { useState, useEffect } from 'react';
import { Settings, Cpu, Zap, Brain, CheckCircle, AlertTriangle } from 'lucide-react';
import type { MLProcessingOptions } from '../types/pdf';

interface MLModelManagerProps {
  onConfigChange: (config: MLProcessingOptions) => void;
  className?: string;
}

interface ModelStatus {
  name: string;
  available: boolean;
  loading: boolean;
  error?: string;
  gpuSupport: boolean;
  memoryUsage: number; // MB
}

const MLModelManager: React.FC<MLModelManagerProps> = ({
  onConfigChange,
  className = ''
}) => {
  const [config, setConfig] = useState<MLProcessingOptions>({
    useGPU: false,
    modelPrecision: 'fp32',
    batchSize: 1,
    enableParallelProcessing: false,
    ocrModel: 'paddleocr',
    tableDetectionModel: 'tablenet',
    parameterModel: 'bert'
  });

  const [modelStatus, setModelStatus] = useState<Record<string, ModelStatus>>({
    paddleocr: { name: 'PaddleOCR', available: false, loading: true, gpuSupport: true, memoryUsage: 500 },
    easyocr: { name: 'EasyOCR', available: false, loading: true, gpuSupport: true, memoryUsage: 800 },
    layoutlm: { name: 'LayoutLM', available: false, loading: true, gpuSupport: true, memoryUsage: 1200 },
    tablenet: { name: 'TableNet', available: false, loading: true, gpuSupport: true, memoryUsage: 600 },
    cascadetabnet: { name: 'CascadeTabNet', available: false, loading: true, gpuSupport: true, memoryUsage: 900 },
    'table-transformer': { name: 'Table-Transformer', available: false, loading: true, gpuSupport: true, memoryUsage: 1000 },
    bert: { name: 'BERT NER', available: false, loading: true, gpuSupport: true, memoryUsage: 700 },
    roberta: { name: 'RoBERTa NER', available: false, loading: true, gpuSupport: true, memoryUsage: 800 },
    'custom-ner': { name: 'Custom NER', available: false, loading: true, gpuSupport: false, memoryUsage: 400 }
  });

  const [gpuAvailable, setGpuAvailable] = useState(false);
  const [systemMemory, setSystemMemory] = useState(0);

  useEffect(() => {
    checkSystemCapabilities();
    checkModelAvailability();
  }, []);

  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  const checkSystemCapabilities = async () => {
    try {
      // Check GPU availability
      if ('gpu' in navigator) {
        const adapter = await navigator.gpu?.requestAdapter();
        setGpuAvailable(!!adapter);
      }

      // Check system memory
      if ('memory' in performance) {
        setSystemMemory((performance as any).memory.jsHeapSizeLimit / 1024 / 1024);
      }
    } catch (error) {
      console.warn('Could not check system capabilities:', error);
    }
  };

  const checkModelAvailability = async () => {
    const models = Object.keys(modelStatus);
    
    for (const model of models) {
      setModelStatus(prev => ({
        ...prev,
        [model]: { ...prev[model], loading: true }
      }));

      try {
        const available = await checkModelAvailability(model);
        setModelStatus(prev => ({
          ...prev,
          [model]: { 
            ...prev[model], 
            available, 
            loading: false 
          }
        }));
      } catch (error) {
        setModelStatus(prev => ({
          ...prev,
          [model]: { 
            ...prev[model], 
            available: false, 
            loading: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }));
      }
    }
  };

  const checkModelAvailability = async (modelName: string): Promise<boolean> => {
    // Simulate model availability check
    // In real implementation, this would check if models are downloaded and available
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate some models being available
    const availableModels = ['paddleocr', 'tesseract', 'bert', 'custom-ner'];
    return availableModels.includes(modelName);
  };

  const handleConfigChange = (key: keyof MLProcessingOptions, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const getModelIcon = (modelName: string) => {
    switch (modelName) {
      case 'paddleocr':
      case 'easyocr':
      case 'layoutlm':
        return <Brain size={16} />;
      case 'tablenet':
      case 'cascadetabnet':
      case 'table-transformer':
        return <Settings size={16} />;
      case 'bert':
      case 'roberta':
      case 'custom-ner':
        return <Zap size={16} />;
      default:
        return <Cpu size={16} />;
    }
  };

  const getTotalMemoryUsage = () => {
    const ocrModel = modelStatus[config.ocrModel || 'paddleocr'];
    const tableModel = modelStatus[config.tableDetectionModel || 'tablenet'];
    const paramModel = modelStatus[config.parameterModel || 'bert'];
    
    return (ocrModel?.memoryUsage || 0) + (tableModel?.memoryUsage || 0) + (paramModel?.memoryUsage || 0);
  };

  const isConfigValid = () => {
    const ocrModel = modelStatus[config.ocrModel || 'paddleocr'];
    const tableModel = modelStatus[config.tableDetectionModel || 'tablenet'];
    const paramModel = modelStatus[config.parameterModel || 'bert'];
    
    return ocrModel?.available && tableModel?.available && paramModel?.available;
  };

  return (
    <div className={`ml-model-manager ${className}`}>
      <div className="model-manager-header">
        <h3>ML Model Configuration</h3>
        <div className="system-info">
          <span className={`gpu-status ${gpuAvailable ? 'available' : 'unavailable'}`}>
            <Cpu size={14} />
            GPU: {gpuAvailable ? 'Available' : 'Unavailable'}
          </span>
          {systemMemory > 0 && (
            <span className="memory-info">
              Memory: {Math.round(systemMemory)} MB
            </span>
          )}
        </div>
      </div>

      <div className="model-sections">
        {/* OCR Model Selection */}
        <div className="model-section">
          <h4>Text Recognition (OCR)</h4>
          <div className="model-options">
            {['paddleocr', 'easyocr', 'layoutlm', 'tesseract'].map(model => {
              const status = modelStatus[model];
              return (
                <label key={model} className={`model-option ${config.ocrModel === model ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="ocrModel"
                    value={model}
                    checked={config.ocrModel === model}
                    onChange={(e) => handleConfigChange('ocrModel', e.target.value)}
                    disabled={!status.available}
                  />
                  <div className="model-info">
                    <div className="model-header">
                      {getModelIcon(model)}
                      <span className="model-name">{status.name}</span>
                      {status.loading && <div className="loading-spinner" />}
                      {status.available && <CheckCircle size={14} className="status-icon available" />}
                      {!status.available && !status.loading && <AlertTriangle size={14} className="status-icon unavailable" />}
                    </div>
                    <div className="model-details">
                      <span className="memory-usage">{status.memoryUsage} MB</span>
                      {status.gpuSupport && <span className="gpu-support">GPU</span>}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Table Detection Model Selection */}
        <div className="model-section">
          <h4>Table Detection</h4>
          <div className="model-options">
            {['tablenet', 'cascadetabnet', 'table-transformer'].map(model => {
              const status = modelStatus[model];
              return (
                <label key={model} className={`model-option ${config.tableDetectionModel === model ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="tableDetectionModel"
                    value={model}
                    checked={config.tableDetectionModel === model}
                    onChange={(e) => handleConfigChange('tableDetectionModel', e.target.value)}
                    disabled={!status.available}
                  />
                  <div className="model-info">
                    <div className="model-header">
                      {getModelIcon(model)}
                      <span className="model-name">{status.name}</span>
                      {status.loading && <div className="loading-spinner" />}
                      {status.available && <CheckCircle size={14} className="status-icon available" />}
                      {!status.available && !status.loading && <AlertTriangle size={14} className="status-icon unavailable" />}
                    </div>
                    <div className="model-details">
                      <span className="memory-usage">{status.memoryUsage} MB</span>
                      {status.gpuSupport && <span className="gpu-support">GPU</span>}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Parameter Extraction Model Selection */}
        <div className="model-section">
          <h4>Parameter Extraction</h4>
          <div className="model-options">
            {['bert', 'roberta', 'custom-ner'].map(model => {
              const status = modelStatus[model];
              return (
                <label key={model} className={`model-option ${config.parameterModel === model ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="parameterModel"
                    value={model}
                    checked={config.parameterModel === model}
                    onChange={(e) => handleConfigChange('parameterModel', e.target.value)}
                    disabled={!status.available}
                  />
                  <div className="model-info">
                    <div className="model-header">
                      {getModelIcon(model)}
                      <span className="model-name">{status.name}</span>
                      {status.loading && <div className="loading-spinner" />}
                      {status.available && <CheckCircle size={14} className="status-icon available" />}
                      {!status.available && !status.loading && <AlertTriangle size={14} className="status-icon unavailable" />}
                    </div>
                    <div className="model-details">
                      <span className="memory-usage">{status.memoryUsage} MB</span>
                      {status.gpuSupport && <span className="gpu-support">GPU</span>}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Performance Settings */}
        <div className="model-section">
          <h4>Performance Settings</h4>
          <div className="performance-settings">
            <label className="setting-item">
              <span>Use GPU Acceleration</span>
              <input
                type="checkbox"
                checked={config.useGPU}
                onChange={(e) => handleConfigChange('useGPU', e.target.checked)}
                disabled={!gpuAvailable}
              />
            </label>
            
            <label className="setting-item">
              <span>Model Precision</span>
              <select
                value={config.modelPrecision}
                onChange={(e) => handleConfigChange('modelPrecision', e.target.value)}
              >
                <option value="fp32">FP32 (Higher Accuracy)</option>
                <option value="fp16">FP16 (Faster, Less Memory)</option>
              </select>
            </label>
            
            <label className="setting-item">
              <span>Batch Size</span>
              <select
                value={config.batchSize}
                onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value))}
              >
                <option value={1}>1 (Lower Memory)</option>
                <option value={2}>2</option>
                <option value={4}>4 (Higher Memory)</option>
              </select>
            </label>
            
            <label className="setting-item">
              <span>Parallel Processing</span>
              <input
                type="checkbox"
                checked={config.enableParallelProcessing}
                onChange={(e) => handleConfigChange('enableParallelProcessing', e.target.checked)}
              />
            </label>
          </div>
        </div>

        {/* Memory Usage Summary */}
        <div className="memory-summary">
          <div className="memory-info">
            <span>Total Memory Usage: {getTotalMemoryUsage()} MB</span>
            {systemMemory > 0 && (
              <span className={`memory-status ${getTotalMemoryUsage() > systemMemory * 0.8 ? 'warning' : 'ok'}`}>
                {getTotalMemoryUsage() > systemMemory * 0.8 ? 'High Memory Usage' : 'Memory OK'}
              </span>
            )}
          </div>
        </div>

        {/* Configuration Status */}
        <div className={`config-status ${isConfigValid() ? 'valid' : 'invalid'}`}>
          {isConfigValid() ? (
            <div className="status-message">
              <CheckCircle size={16} />
              Configuration is valid and ready to use
            </div>
          ) : (
            <div className="status-message">
              <AlertTriangle size={16} />
              Some selected models are not available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MLModelManager; 