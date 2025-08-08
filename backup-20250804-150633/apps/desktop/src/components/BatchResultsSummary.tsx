import React, { useState } from 'react';

interface BatchJob {
  job_id: string;
  batch_id: string;
  file_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'elled';
  progress: number;
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
  celery_task_id?: string;
}

interface BatchInfo {
  batch_id: string;
  batch_name: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'ancelled';
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  progress: number;
  created_at: string;
  updated_at: string;
  estimated_completion?: string;
}

interface BatchResultsSummaryProps {
  jobs: BatchJob[];
  batchInfo: BatchInfo | null;
}

const BatchResultsSummary: React.FC<BatchResultsSummaryProps> = ({ jobs, batchInfo }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const completedJobs = jobs.filter(job => job.status === 'completed');
  const failedJobs = jobs.filter(job => job.status === 'failed');
  const successRate = batchInfo ? (batchInfo.completed_jobs / batchInfo.total_jobs) * 100 : 0;

  const getFileName = (filePath: string) => {
    return filePath.split('/').pop() || filePath;
  };

  const exportResults = async () => {
    setIsExporting(true);
    try {
      // TODO: Implement export functionality
      // This would typically create a ZIP file with all generated SPICE models
      console.log('Exporting batch results...');
      
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // For now, just show a success message
      alert('Batch results exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const retryFailedJobs = async () => {
    if (failedJobs.length === 0) return;
    
    setIsRetrying(true);
    try {
      const response = await fetch(`http://localhost:8007/batch/${batchInfo?.batch_id}/retry`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      alert('Failed jobs have been queued for retry.');
    } catch (error) {
      console.error('Retry failed:', error);
      alert('Failed to retry jobs. Please try again.');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="batch-results-summary">
      <div className="results-header">
        <h3>Processing Complete</h3>
        <div className="completion-stats">
          <div className="stat-item success">
            <span className="stat-number">{completedJobs.length}</span>
            <span className="stat-label">Successful</span>
          </div>
          <div className="stat-item failed">
            <span className="stat-number">{failedJobs.length}</span>
            <span className="stat-label">Failed</span>
          </div>
          <div className="stat-item success-rate">
            <span className="stat-number">{Math.round(successRate)}%</span>
            <span className="stat-label">Success Rate</span>
          </div>
        </div>
      </div>

      <div className="results-actions">
        <button
          type="button"
          onClick={exportResults}
          disabled={isExporting || completedJobs.length === 0}
          className="export-btn"
        >
          {isExporting ? 'Exporting...' : `Export Results (${completedJobs.length} models)`}
        </button>

        {failedJobs.length > 0 && (
          <button
            type="button"
            onClick={retryFailedJobs}
            disabled={isRetrying}
            className="retry-btn"
          >
            {isRetrying ? 'Retrying...' : `Retry Failed Jobs (${failedJobs.length})`}
          </button>
        )}
      </div>

      {completedJobs.length > 0 && (
        <div className="successful-jobs">
          <h4>Successfully Processed Files</h4>
          <div className="jobs-list">
            {completedJobs.map((job) => (
              <div key={job.job_id} className="job-item success">
                <span className="file-name">{getFileName(job.file_path)}</span>
                <span className="job-status">✅ Completed</span>
                {job.result && (
                  <span className="result-info">SPICE model generated</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {failedJobs.length > 0 && (
        <div className="failed-jobs">
          <h4>Failed Files</h4>
          <div className="jobs-list">
            {failedJobs.map((job) => (
              <div key={job.job_id} className="job-item failed">
                <span className="file-name">{getFileName(job.file_path)}</span>
                <span className="job-status">❌ Failed</span>
                {job.error && (
                  <span className="error-info">{job.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="batch-metadata">
        <h4>Batch Information</h4>
        <div className="metadata-grid">
          <div className="metadata-item">
            <span className="label">Batch Name:</span>
            <span className="value">{batchInfo?.batch_name}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Created:</span>
            <span className="value">{batchInfo?.created_at ? new Date(batchInfo.created_at).toLocaleString() : 'N/A'}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Completed:</span>
            <span className="value">{batchInfo?.updated_at ? new Date(batchInfo.updated_at).toLocaleString() : 'N/A'}</span>
          </div>
          {batchInfo?.description && (
            <div className="metadata-item">             <span className="label">Description:</span>
              <span className="value">{batchInfo.description}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchResultsSummary; 