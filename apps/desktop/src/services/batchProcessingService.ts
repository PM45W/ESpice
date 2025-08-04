import { invoke } from '@tauri-apps/api/core';
import { curveExtractionService } from './curveExtractionService';
import { GraphConfig, CurveExtractionResult, CurveData } from '../types';

export interface BatchJob {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  imageData: Uint8Array;
  selectedColors: string[];
  config: GraphConfig;
  result?: CurveExtractionResult;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface BatchProcessingConfig {
  maxConcurrentJobs: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
}

export class BatchProcessingService {
  private static instance: BatchProcessingService;
  private jobs: Map<string, BatchJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private config: BatchProcessingConfig = {
    maxConcurrentJobs: 3,
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 30000
  };
  private isProcessing = false;

  static getInstance(): BatchProcessingService {
    if (!BatchProcessingService.instance) {
      BatchProcessingService.instance = new BatchProcessingService();
    }
    return BatchProcessingService.instance;
  }

  // Add a new job to the queue
  addJob(
    name: string,
    imageData: Uint8Array,
    selectedColors: string[],
    config: GraphConfig
  ): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: BatchJob = {
      id: jobId,
      name,
      status: 'pending',
      progress: 0,
      imageData,
      selectedColors,
      config,
      startTime: new Date()
    };

    this.jobs.set(jobId, job);
    this.processQueue();
    
    return jobId;
  }

  // Get all jobs
  getAllJobs(): BatchJob[] {
    return Array.from(this.jobs.values());
  }

  // Get a specific job
  getJob(jobId: string): BatchJob | undefined {
    return this.jobs.get(jobId);
  }

  // Remove a job
  removeJob(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  // Clear completed jobs
  clearCompletedJobs(): void {
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.jobs.delete(jobId);
      }
    }
  }

  // Process the job queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      while (this.activeJobs.size < this.config.maxConcurrentJobs) {
        const pendingJob = this.getNextPendingJob();
        if (!pendingJob) break;
        
        this.activeJobs.add(pendingJob.id);
        this.processJob(pendingJob);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Get the next pending job
  private getNextPendingJob(): BatchJob | undefined {
    for (const job of this.jobs.values()) {
      if (job.status === 'pending' && !this.activeJobs.has(job.id)) {
        return job;
      }
    }
    return undefined;
  }

  // Process a single job
  private async processJob(job: BatchJob): Promise<void> {
    try {
      // Update job status
      this.updateJobStatus(job.id, 'processing', 0);
      
      // Process the job with progress updates
      const result = await this.processJobWithProgress(job);
      
      // Update job with result
      this.updateJobResult(job.id, result, 'completed', 100);
      
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      this.updateJobError(job.id, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.activeJobs.delete(job.id);
      this.processQueue(); // Process next job
    }
  }

  // Process job with progress updates
  private async processJobWithProgress(job: BatchJob): Promise<CurveExtractionResult> {
    return new Promise((resolve, reject) => {
      let progress = 0;
      
      const progressInterval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 90) progress = 90;
        this.updateJobProgress(job.id, progress);
      }, 500);

      // Simulate processing time
      setTimeout(async () => {
        try {
          clearInterval(progressInterval);
          
          // Call the actual curve extraction
          const result = await curveExtractionService.extractCurves(
            job.imageData,
            job.selectedColors,
            job.config
          );
          
          resolve(result);
        } catch (error) {
          clearInterval(progressInterval);
          reject(error);
        }
      }, 2000 + Math.random() * 3000); // Random processing time between 2-5 seconds
    });
  }

  // Update job status
  private updateJobStatus(jobId: string, status: BatchJob['status'], progress: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      job.progress = progress;
      if (status === 'processing') {
        job.startTime = new Date();
      } else if (status === 'completed' || status === 'failed') {
        job.endTime = new Date();
      }
    }
  }

  // Update job progress
  private updateJobProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = Math.min(progress, 100);
    }
  }

  // Update job result
  private updateJobResult(
    jobId: string, 
    result: CurveExtractionResult, 
    status: BatchJob['status'], 
    progress: number
  ): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.result = result;
      job.status = status;
      job.progress = progress;
      job.endTime = new Date();
    }
  }

  // Update job error
  private updateJobError(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.error = error;
      job.status = 'failed';
      job.progress = 0;
      job.endTime = new Date();
    }
  }

  // Get processing statistics
  getStats(): {
    totalJobs: number;
    pendingJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageProcessingTime: number;
  } {
    const jobs = Array.from(this.jobs.values());
    const completedJobs = jobs.filter(job => job.status === 'completed');
    
    const averageProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => {
          if (job.startTime && job.endTime) {
            return sum + (job.endTime.getTime() - job.startTime.getTime());
          }
          return sum;
        }, 0) / completedJobs.length
      : 0;

    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(job => job.status === 'pending').length,
      processingJobs: jobs.filter(job => job.status === 'processing').length,
      completedJobs: completedJobs.length,
      failedJobs: jobs.filter(job => job.status === 'failed').length,
      averageProcessingTime
    };
  }

  // Configure batch processing
  configure(config: Partial<BatchProcessingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Pause all processing
  pause(): void {
    this.isProcessing = false;
  }

  // Resume processing
  resume(): void {
    this.processQueue();
  }

  // Cancel a specific job
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Job cancelled by user';
      job.endTime = new Date();
      return true;
    }
    return false;
  }

  // Retry a failed job
  retryJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'failed') {
      job.status = 'pending';
      job.progress = 0;
      job.error = undefined;
      job.startTime = undefined;
      job.endTime = undefined;
      this.processQueue();
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const batchProcessingService = BatchProcessingService.getInstance(); 