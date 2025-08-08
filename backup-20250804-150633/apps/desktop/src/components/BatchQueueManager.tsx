import React, { useState } from 'react';

interface BatchQueueManagerProps {
  batchId: string;
  onBatchComplete: () => void;
}

const BatchQueueManager: React.FC<BatchQueueManagerProps> = ({ batchId, onBatchComplete }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  const pauseBatch = async () => {
    setIsPausing(true);
    try {
      // TODO: Implement pause functionality
      // This would typically call a pause endpoint on the batch processor
      console.log('Pausing batch...');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsPaused(true);
    } catch (error) {
      console.error('Failed to pause batch:', error);
      alert('Failed to pause batch. Please try again.');
    } finally {
      setIsPausing(false);
    }
  };

  const resumeBatch = async () => {
    setIsResuming(true);
    try {
      // TODO: Implement resume functionality
      console.log('Resuming batch...');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to resume batch:', error);
      alert('Failed to resume batch. Please try again.');
    } finally {
      setIsResuming(false);
    }
  };

  const cancelBatch = async () => {
    if (!confirm('Are you sure you want to cancel this batch? This action cannot be undone.')) {
      return;
    }

    setIsCancelling(true);
    try {
      const response = await fetch(`http://localhost:807/batch/${batchId}/cancel`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      alert('Batch cancelled successfully.');
      onBatchComplete();
    } catch (error) {
      console.error('Failed to cancel batch:', error);
      alert('Failed to cancel batch. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="batch-queue-manager">
      <div className="queue-header">
        <h4>Queue Management</h4>
        <div className="queue-status">
          <span className={`status-indicator ${isPaused ? 'paused' : 'running'}`}>{isPaused ? '⏸️ Paused' : '▶️ Running'}</span>
        </div>
      </div>

      <div className="queue-controls">
        {!isPaused ? (
          <button
            type="button"
            onClick={pauseBatch}
            disabled={isPausing || isCancelling}
            className="pause-btn"
          >
            {isPausing ? 'Pausing...' : '⏸️ Pause Batch'}
          </button>
        ) : (
          <button
            type="button"
            onClick={resumeBatch}
            disabled={isResuming || isCancelling}
            className="resume-btn"
          >
            {isResuming ? 'Resuming...' : '▶️ Resume Batch'}
          </button>
        )}

        <button
          type="button"
          onClick={cancelBatch}
          disabled={isCancelling || isPausing || isResuming}
          className="cancel-btn"
        >
          {isCancelling ? 'Cancelling...' : '⏹️ Cancel Batch'}
        </button>
      </div>

      <div className="queue-info">
        <div className="info-item">   <span className="label">Batch ID:</span>
          <span className="value">{batchId}</span>
        </div>
        <div className="info-item">   <span className="label">Status:</span>
          <span className="value">{isPaused ? 'Paused' : 'Running'}</span>
        </div>
        <div className="info-item">   <span className="label">Queue Position:</span>
          <span className="value">Active</span>
        </div>
      </div>

      <div className="queue-notifications">
        <div className="notification info">   <span className="icon">ℹ️</span>
          <span className="text">
            {isPaused 
              ? 'Batch is paused. Click "Resume Batch" to continue processing.'
              : 'Batch is actively processing. You can pause or cancel at any time.'
            }
          </span>
        </div>
        
        {isPaused && (
          <div className="notification warning">
            <span className="icon">⚠️</span>
            <span className="text">            Paused batches will not process new jobs until resumed.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchQueueManager; 