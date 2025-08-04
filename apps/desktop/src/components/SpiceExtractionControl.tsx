import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Stop, 
  Settings, 
  Eye, 
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  SkipForward,
  Sliders,
  FileText,
  Cpu,
  CircuitBoard
} from 'lucide-react';

interface SpiceParameter {
  id: string;
  name: string;
  value: number;
  unit: string;
  description: string;
  min: number;
  max: number;
  step: number;
}

interface SpiceExtractionControlProps {
  jobId: string;
  productId: string;
  curveDataPath: string;
  onModelGenerated: (model: any) => void;
  onCancel: () => void;
}

const SpiceExtractionControl: React.FC<SpiceExtractionControlProps> = ({
  jobId,
  productId,
  curveDataPath,
  onModelGenerated,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState([
    { id: 'data-analysis', name: 'Data Analysis', status: 'pending', description: 'Analyze extracted curve data' },
    { id: 'parameter-extraction', name: 'Parameter Extraction', status: 'pending', description: 'Extract SPICE parameters' },
    { id: 'model-generation', name: 'Model Generation', status: 'pending', description: 'Generate SPICE model' },
    { id: 'validation', name: 'Model Validation', status: 'pending', description: 'Validate model accuracy' },
    { id: 'export', name: 'Export Model', status: 'pending', description: 'Export SPICE model file' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [parameters, setParameters] = useState<SpiceParameter[]>([
    {
      id: 'vto',
      name: 'VTO',
      value: 0.7,
      unit: 'V',
      description: 'Threshold voltage',
      min: 0.1,
      max: 2.0,
      step: 0.01
    },
    {
      id: 'kp',
      name: 'KP',
      value: 50e-6,
      unit: 'A/V²',
      description: 'Transconductance parameter',
      min: 1e-6,
      max: 1e-3,
      step: 1e-6
    },
    {
      id: 'lambda',
      name: 'LAMBDA',
      value: 0.01,
      unit: '1/V',
      description: 'Channel length modulation',
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ]);

  const handleStepAction = async (action: 'start' | 'skip' | 'retry') => {
    const step = steps[currentStep];
    if (!step) return;

    setIsProcessing(true);

    try {
      switch (action) {
        case 'start':
          await processStep(step);
          break;
        case 'skip':
          setSteps(prev => prev.map((s, i) => 
            i === currentStep ? { ...s, status: 'skipped' } : s
          ));
          moveToNextStep();
          break;
        case 'retry':
          setSteps(prev => prev.map((s, i) => 
            i === currentStep ? { ...s, status: 'pending' } : s
          ));
          break;
      }
    } catch (error) {
      console.error('Step processing error:', error);
      setSteps(prev => prev.map((s, i) => 
        i === currentStep ? { ...s, status: 'failed' } : s
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const processStep = async (step: any) => {
    setSteps(prev => prev.map((s, i) => 
      i === currentStep ? { ...s, status: 'processing' } : s
    ));

    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    setSteps(prev => prev.map((s, i) => 
      i === currentStep ? { ...s, status: 'completed' } : s
    ));

    moveToNextStep();
  };

  const moveToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All steps completed
      const model = {
        id: `model-${Date.now()}`,
        name: `SPICE_Model_${productId}`,
        parameters: parameters,
        accuracy: 0.85
      };
      onModelGenerated(model);
    }
  };

  const moveToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateParameter = (parameterId: string, value: number) => {
    setParameters(prev => prev.map(param => 
      param.id === parameterId ? { ...param, value } : param
    ));
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'skipped':
        return <SkipForward className="w-5 h-5 text-gray-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">SPICE Model Generation</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Job {jobId} - Generate SPICE model from curve data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowParameters(!showParameters)}
              className="flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              <Sliders className="w-4 h-4" />
              Parameters
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Steps Sidebar */}
          <div className="w-80 border-r border-border p-4 overflow-y-auto">
            <h3 className="font-semibold text-foreground mb-4">SPICE Generation Steps</h3>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    index === currentStep 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  <div className="flex items-center gap-3">
                    {getStepIcon(step.status)}
                    <div className="flex-1">
                      <div className="font-medium text-sm text-foreground">{step.name}</div>
                      <div className="text-xs text-muted-foreground">{step.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {currentStepData && (
              <div className="space-y-6">
                {/* Step Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Step {currentStep + 1}: {currentStepData.name}
                    </h3>
                    <p className="text-muted-foreground mt-1">{currentStepData.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      currentStepData.status === 'completed' ? 'bg-green-100 text-green-800' :
                      currentStepData.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      currentStepData.status === 'failed' ? 'bg-red-100 text-red-800' :
                      currentStepData.status === 'skipped' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {currentStepData.status}
                    </span>
                  </div>
                </div>

                {/* Step Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Controls and Parameters */}
                  <div className="space-y-6">
                    {/* Step Controls */}
                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-3">Step Controls</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStepAction('start')}
                          disabled={isProcessing || currentStepData.status === 'completed'}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Start
                        </button>
                        <button
                          onClick={() => handleStepAction('skip')}
                          disabled={isProcessing || currentStepData.status === 'completed'}
                          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <SkipForward className="w-4 h-4" />
                          Skip
                        </button>
                        <button
                          onClick={() => handleStepAction('retry')}
                          disabled={isProcessing || currentStepData.status !== 'failed'}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Retry
                        </button>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-3">Navigation</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={moveToPreviousStep}
                          disabled={currentStep === 0}
                          className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Previous
                        </button>
                        <button
                          onClick={moveToNextStep}
                          disabled={currentStep === steps.length - 1 || currentStepData.status !== 'completed'}
                          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* SPICE Parameters */}
                    {showParameters && (
                      <div className="bg-muted/30 rounded-lg p-4">
                        <h4 className="font-medium text-foreground mb-3">SPICE Parameters</h4>
                        <div className="space-y-4">
                          {parameters.map((param) => (
                            <div key={param.id} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-foreground">
                                  {param.name} ({param.unit})
                                </label>
                              </div>
                              <input
                                type="range"
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                value={param.value}
                                onChange={(e) => updateParameter(param.id, parseFloat(e.target.value))}
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Min: {param.min}</span>
                                <span>Value: {param.value.toExponential(2)}</span>
                                <span>Max: {param.max}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{param.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Results and Preview */}
                  <div className="space-y-6">
                    {/* Model Preview */}
                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-3">Model Preview</h4>
                      <div className="bg-background border border-border rounded p-3 font-mono text-xs overflow-x-auto">
                        <pre>
{`.MODEL SPICE_Model_${productId} NMOS
+ VTO=${parameters.find(p => p.id === 'vto')?.value.toFixed(3)}V
+ KP=${parameters.find(p => p.id === 'kp')?.value.toExponential(2)}A/V²
+ LAMBDA=${parameters.find(p => p.id === 'lambda')?.value.toFixed(3)}1/V`}
                        </pre>
                      </div>
                    </div>

                    {/* Step Results */}
                    {currentStepData.status === 'completed' && (
                      <div className="bg-muted/30 rounded-lg p-4">
                        <h4 className="font-medium text-foreground mb-3">Step Results</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-foreground">Step completed successfully</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for circle icon
const Circle: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export default SpiceExtractionControl; 