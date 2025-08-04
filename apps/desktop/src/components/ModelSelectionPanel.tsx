import React, { useState, useEffect } from 'react';
import { mcpService, type SPICEModel, type SPICEGenerationResponse } from '../services/mcpService';
// CSS moved to unified index.css

interface ModelSelectionPanelProps {
  extractedData?: any;
  onModelGenerated: (result: SPICEGenerationResponse) => void;
  onClose: () => void;
}

interface ModelParameter {
  name: string;
  value: any;
  unit?: string;
  description?: string;
  editable: boolean;
}

const ModelSelectionPanel: React.FC<ModelSelectionPanelProps> = ({
  extractedData,
  onModelGenerated,
  onClose
}) => {
  const [availableModels, setAvailableModels] = useState<SPICEModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('asm_hemt');
  const [deviceName, setDeviceName] = useState<string>('');
  const [deviceType, setDeviceType] = useState<string>('GaN-HEMT');
  const [customParameters, setCustomParameters] = useState<Record<string, any>>({});
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
    
    loadModels();
  }, [extractedData]);

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setCustomParameters({}); // Reset custom parameters when model changes
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setCustomParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleGenerateModel = async () => {
    if (!deviceName.trim()) {
      setError('Device name is required');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      let result: SPICEGenerationResponse;

      if (Object.keys(customParameters).length > 0) {
        // Generate with custom parameters
        result = await mcpService.generateSPICEWithCustomParameters(
          deviceName,
          deviceType,
          selectedModel,
          customParameters
        );
      } else {
        // Generate with extracted data and fitted parameters
        result = await mcpService.generateSPICE(
          deviceName,
          deviceType,
          selectedModel,
          undefined,
          extractedData
        );
      }

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

  const getModelParameters = (): ModelParameter[] => {
    const modelInfo = getSelectedModelInfo();
    if (!modelInfo) return [];

    return Object.entries(modelInfo.default_parameters).map(([name, value]) => ({
      name,
      value,
      editable: true,
      description: getParameterDescription(name, selectedModel)
    }));
  };

  const getParameterDescription = (paramName: string, modelType: string): string => {
    const descriptions: Record<string, Record<string, string>> = {
      asm_hemt: {
        voff: 'Threshold voltage (V)',
        rd0: 'Drain resistance at V_DS=0 (Ω)',
        rs_nom: 'Source resistance (Ω)',
        kp: 'Transconductance parameter (A/V²)',
        vse: 'Velocity saturation exponent',
        lambda0: 'Channel length modulation parameter',
        lambda1: 'Secondary channel length modulation',
        cgdo: 'Gate-drain capacitance (F)',
        cgso: 'Gate-source capacitance (F)',
        cdso: 'Drain-source capacitance (F)'
      },
      mvsg: {
        vth: 'Threshold voltage (V)',
        mu: 'Mobility (cm²/V·s)',
        cox: 'Gate oxide capacitance (F/cm²)',
        w: 'Channel width (m)',
        l: 'Channel length (m)',
        lambda: 'Channel length modulation',
        is: 'Saturation current (A)',
        n: 'Ideality factor',
        cgd: 'Gate-drain capacitance (F)',
        cgs: 'Gate-source capacitance (F)',
        cds: 'Drain-source capacitance (F)'
      },
      si_mosfet: {
        vto: 'Threshold voltage (V)',
        kp: 'Transconductance parameter (A/V²)',
        w: 'Channel width (m)',
        l: 'Channel length (m)',
        lambda: 'Channel length modulation',
        is: 'Saturation current (A)',
        n: 'Ideality factor',
        cgd: 'Gate-drain capacitance (F)',
        cgs: 'Gate-source capacitance (F)',
        cds: 'Drain-source capacitance (F)'
      }
    };

    return descriptions[modelType]?.[paramName] || paramName;
  };

  const renderModelCard = (model: SPICEModel) => (
    <div
      key={model.id}
      className={`model-card ${selectedModel === model.id ? 'selected' : ''}`}
      onClick={() => handleModelSelect(model.id)}
    >
      <div className="model-header">
        <h3>{model.name}</h3>
        <div className="model-type-badge">{model.id}</div>
      </div>
      <p className="model-description">{model.description}</p>
      <div className="model-params-count">
        {Object.keys(model.default_parameters).length} parameters
      </div>
    </div>
  );

  const renderParameterInput = (param: ModelParameter) => (
    <div key={param.name} className="parameter-input">
      <label htmlFor={param.name}>
        <span className="param-name">{param.name}</span>
        <span className="param-description">{param.description}</span>
      </label>
      <input
        id={param.name}
        type="text"
        value={customParameters[param.name] ?? param.value}
        onChange={(e) => handleParameterChange(param.name, e.target.value)}
        disabled={!param.editable}
        placeholder={String(param.value)}
      />
      {param.unit && <span className="param-unit">{param.unit}</span>}
    </div>
  );

  return (
    <div className="model-selection-panel">
      <div className="panel-header">
        <h2>SPICE Model Generation</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="panel-content">
        {/* Model Selection */}
        <div className="section">
          <h3>Select Model Type</h3>
          <div className="model-grid">
            {availableModels.map(renderModelCard)}
          </div>
        </div>

        {/* Device Configuration */}
        <div className="section">
          <h3>Device Configuration</h3>
          <div className="device-config">
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

        {/* Model Parameters */}
        <div className="section">
          <h3>Model Parameters</h3>
          <div className="parameters-section">
            <div className="parameters-header">
              <span>Customize parameters (optional)</span>
              <button
                className="reset-button"
                onClick={() => setCustomParameters({})}
                disabled={Object.keys(customParameters).length === 0}
              >
                Reset to Defaults
              </button>
            </div>
            <div className="parameters-grid">
              {getModelParameters().map(renderParameterInput)}
            </div>
          </div>
        </div>

        {/* Extracted Data Summary */}
        {extractedData && (
          <div className="section">
            <h3>Extracted Data Summary</h3>
            <div className="extracted-data">
              {extractedData.parameters && (
                <div className="data-grid">
                  {Object.entries(extractedData.parameters).map(([key, value]) => (
                    <div key={key} className="data-item">
                      <span className="data-label">{key}:</span>
                      <span className="data-value">{String(value)}</span>
                    </div>
                  ))}
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

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            className="generate-button"
            onClick={handleGenerateModel}
            disabled={isGenerating || !deviceName.trim()}
          >
            {isGenerating ? 'Generating...' : 'Generate SPICE Model'}
          </button>
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>

        {/* Generated Model Display */}
        {generatedModel && (
          <div className="generated-model">
            <h3>Generated SPICE Model</h3>
            <div className="model-info">
              <p><strong>Device:</strong> {generatedModel.device_name}</p>
              <p><strong>Type:</strong> {generatedModel.device_type}</p>
              <p><strong>Model:</strong> {generatedModel.model_info.name}</p>
            </div>
            <div className="model-code">
              <pre>{generatedModel.model}</pre>
            </div>
            <div className="model-actions">
              <button
                className="copy-button"
                onClick={() => navigator.clipboard.writeText(generatedModel.model)}
              >
                Copy to Clipboard
              </button>
              <button
                className="download-button"
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelSelectionPanel; 