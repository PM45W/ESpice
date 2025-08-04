import React, { useState, useEffect } from 'react';
import { X, Zap, Download, AlertCircle, CheckCircle } from 'lucide-react';
import Button from './Button';
import { spiceModelGenerator } from '../services/spiceGenerator';
import { parameterService, spiceModelService } from '../services/database';
import type { Product, Parameter, SPICEModel } from '../types';
import type { 
  SPICETemplate, 
  ParameterMapping, 
  GenerationOptions, 
  GenerationResult 
} from '../services/spiceGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  onModelGenerated?: (model: SPICEModel) => void;
}

const ModelGenerationModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  product, 
  onModelGenerated 
}) => {
  const [step, setStep] = useState<'template' | 'mapping' | 'generation' | 'preview'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<SPICETemplate | null>(null);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [parameterMappings, setParameterMappings] = useState<ParameterMapping[]>([]);
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    templateId: '',
    deviceName: '',
    modelName: '',
    subcircuitName: '',
    includeSubcircuit: true,
    includeComments: true,
    exportFormat: 'generic'
  });
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<SPICETemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      loadData();
    }
  }, [isOpen, product]);

  const loadData = async () => {
    if (!product) return;
    
    setLoading(true);
    try {
      // Load parameters
      const productParams = await parameterService.findByProductId(product.id);
      setParameters(productParams);

      // Load available templates
      const templates = spiceModelGenerator.getAvailableTemplates(product.type);
      setAvailableTemplates(templates);

      // Set default generation options
      setGenerationOptions(prev => ({
        ...prev,
        deviceName: product.name,
        modelName: `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_MODEL`,
        subcircuitName: `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_SUBCKT`
      }));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: SPICETemplate) => {
    setSelectedTemplate(template);
    setGenerationOptions(prev => ({ ...prev, templateId: template.id }));
    
    // Preview parameter mapping
    const mappings = spiceModelGenerator.previewParameterMapping(parameters, template.id);
    setParameterMappings(mappings);
    
    setStep('mapping');
  };

  const handleGenerateModel = async () => {
    if (!product || !selectedTemplate) return;

    setIsGenerating(true);
    try {
      const result = await spiceModelGenerator.generateModel(
        product,
        parameters,
        generationOptions
      );
      
      setGenerationResult(result);
      
      if (result.success && result.model) {
        // Save to database
        await spiceModelService.create(result.model);
        setStep('preview');
        onModelGenerated?.(result.model);
      } else {
        setStep('generation');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setGenerationResult({
        success: false,
        validationErrors: ['Generation failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
        warnings: [],
        mappingConfidence: 0
      });
      setStep('generation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportModel = (format: 'ltspice' | 'kicad' | 'generic') => {
    if (!generationResult?.spiceText) return;
    
    const filename = `${product?.name || 'model'}_${selectedTemplate?.name || 'spice'}.${format === 'ltspice' ? 'asc' : format === 'kicad' ? 'lib' : 'cir'}`;
    const blob = new Blob([generationResult.spiceText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetModal = () => {
    setStep('template');
    setSelectedTemplate(null);
    setParameterMappings([]);
    setGenerationResult(null);
    setIsGenerating(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content model-generation-modal">
        <div className="modal-header">
          <h2>Generate SPICE Model</h2>
          <button onClick={handleClose} className="close-button">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading data...</p>
            </div>
          ) : (
            <>
              {/* Progress indicator */}
              <div className="generation-progress">
                <div className={`progress-step ${step === 'template' ? 'active' : ['mapping', 'generation', 'preview'].includes(step) ? 'completed' : ''}`}>
                  <div className="step-number">1</div>
                  <span>Select Template</span>
                </div>
                <div className={`progress-step ${step === 'mapping' ? 'active' : ['generation', 'preview'].includes(step) ? 'completed' : ''}`}>
                  <div className="step-number">2</div>
                  <span>Parameter Mapping</span>
                </div>
                <div className={`progress-step ${step === 'generation' ? 'active' : step === 'preview' ? 'completed' : ''}`}>
                  <div className="step-number">3</div>
                  <span>Generate Model</span>
                </div>
                <div className={`progress-step ${step === 'preview' ? 'active' : ''}`}>
                  <div className="step-number">4</div>
                  <span>Preview & Export</span>
                </div>
              </div>

              {/* Template Selection */}
              {step === 'template' && (
                <div className="template-selection">
                  <h3>Select SPICE Model Template</h3>
                  <p>Choose the most appropriate template for your {product?.type || 'device'}:</p>
                  
                  <div className="template-grid">
                    {availableTemplates.map(template => (
                      <div 
                        key={template.id}
                        className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className="template-header">
                          <h4>{template.name}</h4>
                          <span className="template-version">v{template.version}</span>
                        </div>
                        <p className="template-description">{template.description}</p>
                        <div className="template-meta">
                          <span className="device-type">{template.deviceType}</span>
                          <span className="param-count">{template.parameters.length} parameters</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parameter Mapping */}
              {step === 'mapping' && selectedTemplate && (
                <div className="parameter-mapping">
                  <h3>Parameter Mapping Preview</h3>
                  <p>Review how your datasheet parameters map to SPICE model parameters:</p>
                  
                  <div className="mapping-summary">
                    <div className="confidence-indicator">
                      <div className="confidence-meter">
                        <div 
                          className="confidence-fill" 
                          style={{ 
                            width: `${(parameterMappings.reduce((sum, m) => sum + m.confidence, 0) / parameterMappings.length) * 100}%` 
                          }}
                        />
                      </div>
                      <span>Mapping Confidence: {Math.round((parameterMappings.reduce((sum, m) => sum + m.confidence, 0) / parameterMappings.length) * 100)}%</span>
                    </div>
                  </div>

                  <div className="mapping-table">
                    <table>
                      <thead>
                        <tr>
                          <th>SPICE Parameter</th>
                          <th>Datasheet Parameter</th>
                          <th>Value</th>
                          <th>Unit</th>
                          <th>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTemplate.parameters.map(spiceParam => {
                          const mapping = parameterMappings.find(m => m.spiceParam.spiceName === spiceParam.spiceName);
                          return (
                            <tr key={spiceParam.spiceName}>
                              <td>
                                <strong>{spiceParam.name}</strong>
                                {spiceParam.required && <span className="required">*</span>}
                              </td>
                              <td>{mapping ? mapping.datasheetParam.name : 'Not mapped'}</td>
                              <td>{mapping ? mapping.datasheetParam.value : spiceParam.defaultValue || 'Default'}</td>
                              <td>{mapping ? mapping.datasheetParam.unit : spiceParam.unit}</td>
                              <td>
                                {mapping ? (
                                  <div className="confidence-badge">
                                    <div className={`confidence-dot ${mapping.confidence > 0.8 ? 'high' : mapping.confidence > 0.6 ? 'medium' : 'low'}`} />
                                    {Math.round(mapping.confidence * 100)}%
                                  </div>
                                ) : (
                                  <span className="no-mapping">No mapping</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="generation-options">
                    <h4>Generation Options</h4>
                    <div className="options-grid">
                      <div className="option-group">
                        <label>Model Name:</label>
                        <input
                          type="text"
                          value={generationOptions.modelName}
                          onChange={(e) => setGenerationOptions(prev => ({ ...prev, modelName: e.target.value }))}
                        />
                      </div>
                      <div className="option-group">
                        <label>Export Format:</label>
                        <select
                          value={generationOptions.exportFormat}
                          onChange={(e) => setGenerationOptions(prev => ({ ...prev, exportFormat: e.target.value as any }))}
                        >
                          <option value="generic">Generic SPICE</option>
                          <option value="ltspice">LTSpice</option>
                          <option value="kicad">KiCad</option>
                        </select>
                      </div>
                      <div className="option-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={generationOptions.includeSubcircuit}
                            onChange={(e) => setGenerationOptions(prev => ({ ...prev, includeSubcircuit: e.target.checked }))}
                          />
                          Include Subcircuit
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Generation Results */}
              {step === 'generation' && generationResult && (
                <div className="generation-results">
                  <h3>Generation Results</h3>
                  
                  {generationResult.success ? (
                    <div className="success-message">
                      <CheckCircle className="success-icon" />
                      <span>Model generated successfully!</span>
                    </div>
                  ) : (
                    <div className="error-message">
                      <AlertCircle className="error-icon" />
                      <span>Generation failed</span>
                    </div>
                  )}

                  {generationResult.validationErrors.length > 0 && (
                    <div className="validation-errors">
                      <h4>Validation Errors:</h4>
                      <ul>
                        {generationResult.validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {generationResult.warnings.length > 0 && (
                    <div className="validation-warnings">
                      <h4>Warnings:</h4>
                      <ul>
                        {generationResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Model Preview */}
              {step === 'preview' && generationResult?.success && (
                <div className="model-preview">
                  <h3>Generated SPICE Model</h3>
                  
                  <div className="preview-header">
                    <div className="model-info">
                      <h4>{product?.name} - {selectedTemplate?.name} Model</h4>
                      <p>Generated on {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="export-actions">
                      <Button 
                        variant="secondary" 
                        size="small" 
                        onClick={() => handleExportModel('generic')}
                        icon={Download}
                      >
                        Export SPICE
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="small" 
                        onClick={() => handleExportModel('ltspice')}
                        icon={Download}
                      >
                        Export LTSpice
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="small" 
                        onClick={() => handleExportModel('kicad')}
                        icon={Download}
                      >
                        Export KiCad
                      </Button>
                    </div>
                  </div>

                  <div className="spice-code-preview">
                    <pre><code>{generationResult.spiceText}</code></pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          {step === 'template' && (
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
          )}
          
          {step === 'mapping' && (
            <>
              <Button variant="secondary" onClick={() => setStep('template')}>
                Back
              </Button>
              <Button 
                variant="primary" 
                onClick={() => setStep('generation')}
                disabled={parameterMappings.length === 0}
              >
                Continue
              </Button>
            </>
          )}
          
          {step === 'generation' && (
            <>
              <Button variant="secondary" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button 
                variant="primary" 
                onClick={handleGenerateModel}
                disabled={isGenerating}
                icon={Zap}
                className="btn-text-yellow"
                style={{ color: '#ffd700' }}
              >
                {isGenerating ? 'Generating...' : 'Generate Model'}
              </Button>
            </>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
              <Button 
                variant="primary" 
                onClick={() => handleExportModel(generationOptions.exportFormat || 'generic')}
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

export default ModelGenerationModal; 