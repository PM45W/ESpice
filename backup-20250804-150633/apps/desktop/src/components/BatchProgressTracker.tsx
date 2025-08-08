import React from 'react';

interface BatchJob {
  job_id: string;
  batch_id: string;
  file_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
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
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  progress: number;
  created_at: string;
  updated_at: string;
  estimated_completion?: string;
}

interface BatchProgressTrackerProps {
  jobs: BatchJob[];
  batchInfo: BatchInfo | null;
}

const BatchProgressTracker: React.FC<BatchProgressTrackerProps> = ({ jobs, batchInfo }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'cancelled':
        return '⏹️';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'completed':
        return 'status-completed';
      case 'failed':
        return 'status-failed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-unknown';
    }
  };

  const getFileName = (filePath: string) => {
    return filePath.split('/').pop() || filePath;
  };

  const completedJobs = jobs.filter(job => job.status === 'completed').length;
  const failedJobs = jobs.filter(job => job.status === 'failed').length;
  const processingJobs = jobs.filter(job => job.status === 'processing').length;
  const pendingJobs = jobs.filter(job => job.status === 'pending').length;

  return (
    <div className="batch-progress-tracker">
      <div className="overall-progress">
        <div className="progress-header">
          <h3>Batch Progress</h3>
          <div className="progress-stats">
            <span className="stat completed">{completedJobs} Completed</span>
            <span className="stat failed">{failedJobs} Failed</span>
            <span className="stat processing">{processingJobs} Processing</span>
            <span className="stat pending">{pendingJobs} Pending</span>
          </div>
        </div>
        
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(batchInfo?.progress || 0) * 100}%` }}
            />
          </div>
          <span className="progress-text">
            {Math.round((batchInfo?.progress || 0) * 100)}%
          </span>
        </div>
      </div>

      <div className="jobs-list">
        <h4>Individual Files</h4>
        <div className="jobs-container">         {jobs.map((job) => (
            <div key={job.job_id} className={`job-item ${getStatusColor(job.status)}`}>
              <div className="job-header">
                <span className="status-icon">{getStatusIcon(job.status)}</span>
                <span className="file-name">{getFileName(job.file_path)}</span>
                <span className="job-status">{job.status}</span>
              </div>
              
              <div className="job-progress">
                <div className="job-progress-bar">
                  <div 
                    className="job-progress-fill"
                    style={{ width: `${job.progress * 100}%` }}
                  />
                </div>
                <span className="job-progress-text">
                  {Math.round(job.progress * 100)}%
                </span>
              </div>

              {job.error && (
                <div className="job-error">
                  <span className="error-icon">⚠️</span>
                  <span className="error-text">{job.error}</span>
                </div>
              )}

              {job.result && job.status === 'completed' && (
                <div className="job-result">
                  <span className="result-icon">📊</span>
                  <span className="result-text">SPICE model generated successfully</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {batchInfo?.estimated_completion && (
        <div className="estimated-completion">   <span className="clock-icon">🕐</span>
          <span>Estimated completion: {new Date(batchInfo.estimated_completion).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default BatchProgressTracker; 