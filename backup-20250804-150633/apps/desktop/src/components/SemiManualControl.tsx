import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Stop, 
  Settings, 
  Eye, 
  Download,
  Upload,
  Zap,
  Database,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  SkipForward,
  SkipBack,
  Sliders,
  Target,
  FileText,
  Image as ImageIcon,
  BarChart3,
  Info,
  HelpCircle
} from 'lucide-react';

interface ExtractionStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  duration?: number;
  result?: any;
  error?: string;
  parameters?: any;
}

interface SemiManualControlProps {
  jobId: string;
  productId: string;
  imageId: string;
  extractionMethod: 'standard' | 'legacy' | 'llm' | 'manual';
  onStepComplete: (stepId: string, result: any) => void;
  onJobComplete: (jobId: string, results: any) => void;
  onCancel: () => void;
}

const SemiManualControl: React.FC<SemiManualControlProps> = ({
  jobId,
  productId,
  imageId,
  extractionMethod,
  onStepComplete,
  onJobComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<ExtractionStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [parameters, setParameters] = useState<any>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    // Initialize steps based on extraction method
    const initializeSteps = () => {
      const baseSteps: ExtractionStep[] = [
        {
          id: 'image-load',
          name: 'Image Loading',
          description: 'Load and validate the graph image',
          status: 'pending'
        },
        {
          id: 'preprocessing',
          name: 'Image Preprocessing',
          description: 'Apply filters and enhance image quality',
          status: 'pending'
        },
        {
          id: 'curve-detection',
          name: 'Curve Detection',
          description: 'Detect and extract curve boundaries',
          status: 'pending'
        },
        {
          id: 'data-extraction',
          name: 'Data Extraction',
          description: 'Extract numerical data points from curves',
          status: 'pending'
        },
        {
          id: 'validation',
          name: 'Data Validation',
          description: 'Validate extracted data accuracy',
          status: 'pending'
        },
        {
          id: 'export',
          name: 'Export Results',
          description: 'Export data to CSV format',
          status: 'pending'
        }
      ];

      // Add method-specific steps
      if (extractionMethod === 'llm') {
        baseSteps.splice(3, 0, {
          id: 'llm-analysis',
          name: 'LLM Analysis',
          description: 'Use AI to analyze and extract curve data',
          status: 'pending'
        });
      }

      if (extractionMethod === 'manual') {
        baseSteps.splice(3, 0, {
          id: 'manual-selection',
          name: 'Manual Selection',
          description: 'Manually select curve points',
          status: 'pending'
        });
      }

      setSteps(baseSteps);
    };

    initializeSteps();
  }, [extractionMethod]);

  const handleStepAction = async (action: 'start' | 'pause' | 'skip' | 'retry') => {
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
            i === currentStep ? { ...s, status: 'pending', error: undefined } : s
          ));
          break;
      }
    } catch (error) {
      console.error('Step processing error:', error);
      setSteps(prev => prev.map((s, i) => 
        i === currentStep ? { ...s, status: 'failed', error: error.message } : s
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const processStep = async (step: ExtractionStep) => {
    // Simulate step processing
    setSteps(prev => prev.map((s, i) => 
      i === currentStep ? { ...s, status: 'processing' } : s
    ));

    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    // Simulate step completion
    const result = {
      stepId: step.id,
      success: Math.random() > 0.1, // 90% success rate
      data: generateMockResult(step.id),
      duration: Math.random() * 5000
    };

    if (result.success) {
      setSteps(prev => prev.map((s, i) => 
        i === currentStep ? { 
          ...s, 
          status: 'completed', 
          result: result.data,
          duration: result.duration
        } : s
      ));
      
      onStepComplete(step.id, result.data);
      moveToNextStep();
    } else {
      setSteps(prev => prev.map((s, i) => 
        i === currentStep ? { 
          ...s, 
          status: 'failed', 
          error: 'Processing failed'
        } : s
      ));
    }
  };

  const generateMockResult = (stepId: string) => {
    switch (stepId) {
      case 'image-load':
        return { width: 1920, height: 1080, format: 'PNG', size: '2.3MB' };
      case 'preprocessing':
        return { filters: ['noise_reduction', 'contrast_enhancement'], quality_score: 0.95 };
      case 'curve-detection':
        return { curves_found: 3, confidence: 0.87 };
      case 'data-extraction':
        return { data_points: 150, accuracy: 0.92 };
      case 'validation':
        return { validation_score: 0.89, outliers: 2 };
      case 'export':
        return { csv_path: '/exports/curve_data.csv', file_size: '45KB' };
      default:
        return { success: true };
    }
  };

  const moveToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All steps completed
      const results = steps.reduce((acc, step) => {
        if (step.result) {
          acc[step.id] = step.result;
        }
        return acc;
      }, {} as any);
      
      onJobComplete(jobId, results);
    }
  };

  const moveToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
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
            <h2 className="text-xl font-bold text-foreground">Semi-Manual Control</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Job {jobId} - {extractionMethod} extraction method
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
            <h3 className="font-semibold text-foreground mb-4">Extraction Steps</h3>
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
                  {step.duration && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Duration: {Math.round(step.duration / 1000)}s
                    </div>
                  )}
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

                    {/* Parameters */}
                    {showParameters && (
                      <div className="bg-muted/30 rounded-lg p-4">
                        <h4 className="font-medium text-foreground mb-3">Parameters</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              Threshold
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="255"
                              value={parameters.threshold || 128}
                              onChange={(e) => setParameters(prev => ({ ...prev, threshold: parseInt(e.target.value) }))}
                              className="w-full"
                            />
                            <div className="text-xs text-muted-foreground mt-1">
                              Value: {parameters.threshold || 128}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              Sensitivity
                            </label>
                            <input
                              type="range"
                              min="0.1"
                              max="2.0"
                              step="0.1"
                              value={parameters.sensitivity || 1.0}
                              onChange={(e) => setParameters(prev => ({ ...prev, sensitivity: parseFloat(e.target.value) }))}
                              className="w-full"
                            />
                            <div className="text-xs text-muted-foreground mt-1">
                              Value: {parameters.sensitivity || 1.0}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Results and Preview */}
                  <div className="space-y-6">
                    {/* Step Results */}
                    {currentStepData.result && (
                      <div className="bg-muted/30 rounded-lg p-4">
                        <h4 className="font-medium text-foreground mb-3">Step Results</h4>
                        <div className="space-y-2">
                          {Object.entries(currentStepData.result).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="text-foreground font-medium">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Error Display */}
                    {currentStepData.error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-800 mb-2">Error</h4>
                        <p className="text-red-700 text-sm">{currentStepData.error}</p>
                      </div>
                    )}

                    {/* Image Preview */}
                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-3">Image Preview</h4>
                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-muted-foreground" />
                      </div>
                    </div>
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

export default SemiManualControl; 