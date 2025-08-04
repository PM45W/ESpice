import React, { useState, useEffect } from 'react';
import { mcpService, type SPICEModel, type SPICEGenerationResponse } from '../services/mcpService';

interface InlineModelSelectorProps {
  extractedData?: any;
  onModelGenerated: (result: SPICEGenerationResponse) => void;
  isVisible: boolean;
}

const InlineModelSelector: React.FC<InlineModelSelectorProps> = ({
  extractedData,
  onModelGenerated,
  isVisible
}) => {
  const [availableModels, setAvailableModels] = useState<SPICEModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('asm_hemt');
  const [deviceName, setDeviceName] = useState<string>('');
  const [deviceType, setDeviceType] = useState<string>('GaN-HEMT');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedModel, setGeneratedModel] = useState<SPICEGenerationResponse | null>(null);
  const [error, setError] = useState<string>('');

  // Load available models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await mcpService.getAvailableModels();
        setAvailableModels(models.models);
        
        // Auto-select model based on extracted data
        if (extractedData?.parameters?.device_type) {
          const deviceType = extractedData.parameters.device_type.toLowerCase();
          if (deviceType.includes('gan')) {
            setSelectedModel('asm_hemt');
            setDeviceType('GaN-HEMT');
          } else if (deviceType.includes('sic')) {
            setSelectedModel('mvsg');
            setDeviceType('SiC-MOSFET');
          } else if (deviceType.includes('si')) {
            setSelectedModel('si_mosfet');
            setDeviceType('Si-MOSFET');
          }
        }
        
        // Set device name from extracted data
        if (extractedData?.parameters?.device_name) {
          setDeviceName(extractedData.parameters.device_name);
        } else {
          setDeviceName('extracted_device');
        }
      } catch (error) {
        setError('Failed to load available models');
        console.error('Error loading models:', error);
      }
    };
    
    if (isVisible) {
      loadModels();
    }
  }, [extractedData, isVisible]);

  const handleGenerateModel = async () => {
    if (!deviceName.trim()) {
      setError('Device name is required');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const result = await mcpService.generateSPICE(
        deviceName,
        deviceType,
        selectedModel,
        undefined,
        extractedData
      );

      setGeneratedModel(result);
      onModelGenerated(result);
    } catch (error) {
      setError(`Failed to generate SPICE model: ${error}`);
      console.error('SPICE generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getSelectedModelInfo = () => {
    return availableModels.find(model => model.id === selectedModel);
  };

  if (!isVisible) return null;

  return (
    <div className="inline-model-selector">
      <div className="selector-header">
        <h3>Generate SPICE Model</h3>
        <p>Select a model type and generate SPICE parameters from extracted data</p>
      </div>

      <div className="selector-content">
        {/* Model Selection */}
        <div className="model-selection-section">
          <h4>Select Model Type</h4>
          <div className="model-options">
            {availableModels.map(model => (
              <label key={model.id} className="model-option">
                <input
                  type="radio"
                  name="modelType"
                  value={model.id}
                  checked={selectedModel === model.id}
                  onChange={(e) => setSelectedModel(e.target.value)}
                />
                <div className="option-content">
                  <div className="option-header">
                    <span className="option-name">{model.name}</span>
                    <span className="option-type">{model.id}</span>
                  </div>
                  <p className="option-description">{model.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Device Configuration */}
        <div className="device-config-section">
          <h4>Device Configuration</h4>
          <div className="config-inputs">
            <div className="input-group">
              <label htmlFor="device-name">Device Name</label>
              <input
                id="device-name"
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Enter device name"
              />
            </div>
            <div className="input-group">
              <label htmlFor="device-type">Device Type</label>
              <select
                id="device-type"
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
              >
                <option value="GaN-HEMT">GaN HEMT</option>
                <option value="SiC-MOSFET">SiC MOSFET</option>
                <option value="Si-MOSFET">Si MOSFET</option>
                <option value="IGBT">IGBT</option>
                <option value="Diode">Diode</option>
              </select>
            </div>
          </div>
        </div>

        {/* Extracted Data Summary */}
        {extractedData && (
          <div className="extracted-data-section">
            <h4>Extracted Parameters</h4>
            <div className="data-summary">
              {extractedData.parameters && (
                <div className="data-grid">
                  {Object.entries(extractedData.parameters).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="data-item">
                      <span className="data-label">{key}:</span>
                      <span className="data-value">{String(value)}</span>
                    </div>
                  ))}
                  {Object.keys(extractedData.parameters).length > 6 && (
                    <div className="data-more">
                      +{Object.keys(extractedData.parameters).length - 6} more parameters
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Generate Button */}
        <div className="generate-section">
          <button
            className="generate-button"
            onClick={handleGenerateModel}
            disabled={isGenerating || !deviceName.trim()}
          >
            {isGenerating ? 'Generating...' : 'Generate SPICE Model'}
          </button>
        </div>

        {/* Generated Model Display */}
        {generatedModel && (
          <div className="generated-model-section">
            <h4>Generated SPICE Model</h4>
            <div className="model-info">
              <p><strong>Device:</strong> {generatedModel.device_name}</p>
              <p><strong>Type:</strong> {generatedModel.device_type}</p>
              <p><strong>Model:</strong> {generatedModel.model_info.name}</p>
            </div>
            <div className="model-actions">
              <button
                className="action-button copy-button"
                onClick={() => navigator.clipboard.writeText(generatedModel.model)}
              >
                Copy to Clipboard
              </button>
              <button
                className="action-button download-button"
                onClick={() => {
                  const blob = new Blob([generatedModel.model], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${generatedModel.device_name}.sp`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download .sp File
              </button>
            </div>
            <div className="model-preview">
              <pre>{generatedModel.model}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InlineModelSelector; 