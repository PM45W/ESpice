import React from 'react';
import { Loader2, FileText, Search, Zap, CheckCircle } from 'lucide-react';
import type { ProcessingProgress } from '../types/pdf';

interface PDFProcessingProgressProps {
  progress: ProcessingProgress;
}

const PDFProcessingProgress: React.FC<PDFProcessingProgressProps> = ({ progress }) => {
  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'reading':
        return <FileText size={20} />;
      case 'parsing':
        return <Search size={20} />;
      case 'extracting':
        return <Zap size={20} />;
      case 'validating':
        return <CheckCircle size={20} />;
      case 'complete':
        return <CheckCircle size={20} />;
      default:
        return <Loader2 size={20} />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'reading':
        return 'var(--primary-100)';
      case 'parsing':
        return 'var(--primary-200)';
      case 'extracting':
        return 'var(--accent-color)';
      case 'validating':
        return 'var(--success-color)';
      case 'complete':
        return 'var(--success-color)';
      default:
        return 'var(--text-secondary)';
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'reading':
        return 'Reading PDF';
      case 'parsing':
        return 'Parsing Structure';
      case 'extracting':
        return 'Extracting Data';
      case 'validating':
        return 'Validating Results';
      case 'complete':
        return 'Complete';
      default:
        return 'Processing';
    }
  };

  return (
    <div className="pdf-processing-progress">
      <div className="progress-header">
        <div className="progress-stage">
          {getStageIcon(progress.stage)}
          <div className="stage-info">
            <span className="stage-label">{getStageLabel(progress.stage)}</span>
            <span className="stage-message">{progress.message}</span>
          </div>
        </div>
        <div className="progress-percentage">
          {progress.progress}%
        </div>
      </div>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar"
          style={{ 
            width: `${progress.progress}%`,
            backgroundColor: getStageColor(progress.stage)
          }}
        />
      </div>
      
      {progress.estimatedTimeRemaining && (
        <div className="progress-time">
          <span>Estimated time remaining: {Math.ceil(progress.estimatedTimeRemaining / 1000)}s</span>
        </div>
      )}
    </div>
  );
};

export default PDFProcessingProgress; 