import React from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
}

interface MCPProcessingStepsProps {
  steps: ProcessingStep[];
}

const MCPProcessingSteps: React.FC<MCPProcessingStepsProps> = ({ steps }) => {
  const getStatusIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'processing':
        return <Loader2 size={20} className="animate-spin" />;
      case 'completed':
        return <CheckCircle size={20} className="text-success" />;
      case 'error':
        return <AlertCircle size={20} className="text-error" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-[hsl(var(--border))]" />;
    }
  };

  const getStepIconColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-[hsl(var(--success-600))]';
      case 'current':
        return 'text-[hsl(var(--primary))]';
      case 'pending':
        return 'text-[hsl(var(--muted-foreground))]';
      default:
        return 'text-[hsl(var(--muted-foreground))]';
    }
  };

  return (
    <div className="mcp-processing-steps">
      {steps.map((step, index) => (
        <div key={step.id} className={`step-item ${step.status}`}>
          <div className="step-indicator">
            {getStatusIcon(step.status)}
          </div>
          <div className="step-content">
            <div className={`step-name ${getStepIconColor(step.status)}`}>
              {step.name}
            </div>
            {step.message && (
              <div className="step-message text-sm text-[hsl(var(--muted-foreground))]">
                {step.message}
              </div>
            )}
          </div>
          <div className="step-status">
            {step.status === 'completed' && (
              <CheckCircle size={16} className="text-success" />
            )}
            {step.status === 'error' && (
              <AlertCircle size={16} className="text-error" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MCPProcessingSteps;
