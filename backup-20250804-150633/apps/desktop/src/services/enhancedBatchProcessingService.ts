import { invoke } from '@tauri-apps/api/core';
import EnhancedGraphExtractionService, { 
  EnhancedGraphConfig, 
  AutoProcessingConfig, 
  BatchProcessingResult 
} from './enhancedGraphExtractionService';
import type { 
  BatchJob, 
  ProcessingStats, 
  ProgressUpdate, 
  ProcessingEvent 
} from '../types';

export interface BatchJobConfig {
  id: string;
  imageData: Uint8Array;
  config: Partial<EnhancedGraphConfig>;
  priority: number;
  retryCount: number;
  maxRetries: number;
  timeout: number;
  metadata?: Record<string, any>;
}

export interface BatchQueueConfig {
  maxConcurrentJobs: number;
  maxQueueSize: number;
  retryDelay: number;
  priorityQueue: boolean;
  autoStart: boolean;
  enableLogging: boolean;
}

export interface BatchProcessingStatus {
  isRunning: boolean;
  queueLength: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalJobs: number;
  progress: number;
  estimatedTimeRemaining: number;
  lastUpdate: Date;
}

class EnhancedBatchProcessingService {
  private static instance: EnhancedBatchProcessingService;
  private enhancedExtractionService: EnhancedGraphExtractionService;
  private jobQueue: BatchJobConfig[] = [];
  private activeJobs: Map<string, BatchJobConfig> = new Map();
  private completedJobs: Map<string, any> = new Map();
  private failedJobs: Map<string, { error: string; retryCount: number }> = new Map();
  private isProcessing: boolean = false;
  private config: BatchQueueConfig;
  private eventListeners: Map<string, (event: ProcessingEvent) => void> = new Map();
  private stats: ProcessingStats = {
    totalProcessed: 0,
    successRate: 100.0,
    averageProcessingTime: 0,
    lastProcessed: null,
    totalErrors: 0,
    averageQueueTime: 0
  };

  private constructor() {
    this.enhancedExtractionService = EnhancedGraphExtractionService.getInstance();
    this.config = {
      maxConcurrentJobs: 4,
      maxQueueSize: 100,
      retryDelay: 5000,
      priorityQueue: true,
      autoStart: true,
      enableLogging: true
    };
  }

  static getInstance(): EnhancedBatchProcessingService {
    if (!EnhancedBatchProcessingService.instance) {
      EnhancedBatchProcessingService.instance = new EnhancedBatchProcessingService();
    }
    return EnhancedBatchProcessingService.instance;
  }

  /**
   * Configure the batch processing service
   */
  configure(config: Partial<BatchQueueConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('Batch processing service configured:', this.config);
  }

  /**
   * Add a job to the processing queue
   */
  async addJob(job: Omit<BatchJobConfig, 'id' | 'retryCount'>): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullJob: BatchJobConfig = {
      ...job,
      id: jobId,
      retryCount: 0
    };

    if (this.jobQueue.length >= this.config.maxQueueSize) {
      throw new Error(`Queue is full (${this.config.maxQueueSize} jobs). Please wait for some jobs to complete.`);
    }

    this.jobQueue.push(fullJob);
    this.log(`Job ${jobId} added to queue. Queue length: ${this.jobQueue.length}`);

    // Sort queue by priority if enabled
    if (this.config.priorityQueue) {
      this.jobQueue.sort((a, b) => b.priority - a.priority);
    }

    this.emitEvent({
      type: 'job_started',
      jobId,
      data: { queueLength: this.jobQueue.length },
      timestamp: new Date()
    });

    // Auto-start processing if enabled
    if (this.config.autoStart && !this.isProcessing) {
      this.startProcessing();
    }

    return jobId;
  }

  /**
   * Add multiple jobs to the queue
   */
  async addJobs(jobs: Array<Omit<BatchJobConfig, 'id' | 'retryCount'>>): Promise<string[]> {
    const jobIds: string[] = [];
    
    for (const job of jobs) {
      try {
        const jobId = await this.addJob(job);
        jobIds.push(jobId);
      } catch (error) {
        this.log(`Failed to add job: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue with other jobs
      }
    }

    return jobIds;
  }

  /**
   * Start processing jobs
   */
  async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      this.log('Processing is already running');
      return;
    }

    this.isProcessing = true;
    this.log('Starting batch processing...');

    // Start worker threads
    const workers = Array.from(
      { length: this.config.maxConcurrentJobs }, 
      () => this.processJobWorker()
    );

    await Promise.all(workers);
  }

  /**
   * Stop processing jobs
   */
  stopProcessing(): void {
    this.isProcessing = false;
    this.log('Stopping batch processing...');
  }

  /**
   * Worker function for processing individual jobs
   */
  private async processJobWorker(): Promise<void> {
    while (this.isProcessing) {
      const job = this.getNextJob();
      if (!job) {
        // No jobs available, wait a bit
        await this.sleep(1000);
        continue;
      }

      await this.processJob(job);
    }
  }

  /**
   * Get the next job from the queue
   */
  private getNextJob(): BatchJobConfig | null {
    if (this.jobQueue.length === 0) {
      return null;
    }

    // Check if we can start more jobs
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
      return null;
    }

    const job = this.jobQueue.shift()!;
    this.activeJobs.set(job.id, job);

    return job;
  }

  /**
   * Process a single job
   */
  private async processJob(job: BatchJobConfig): Promise<void> {
    const startTime = performance.now();
    
    try {
      this.log(`Processing job ${job.id}...`);
      
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), job.timeout);
      });

      // Process the job
      const processPromise = this.enhancedExtractionService.extractGraphWithLLM(
        job.imageData,
        job.config
      );

      const result = await Promise.race([processPromise, timeoutPromise]);
      
      // Job completed successfully
      const processingTime = (performance.now() - startTime) / 1000;
      this.completedJobs.set(job.id, {
        result,
        processingTime,
        completedAt: new Date()
      });

      this.updateStats(processingTime, true);
      
      this.log(`Job ${job.id} completed successfully in ${processingTime.toFixed(2)}s`);

      this.emitEvent({
        type: 'job_completed',
        jobId: job.id,
        data: { result, processingTime },
        timestamp: new Date()
      });

    } catch (error) {
      const processingTime = (performance.now() - startTime) / 1000;
      this.updateStats(processingTime, false);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(`Job ${job.id} failed: ${errorMessage}`);

      // Handle retry logic
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        this.log(`Retrying job ${job.id} (attempt ${job.retryCount}/${job.maxRetries})`);
        
        // Add back to queue with delay
        setTimeout(() => {
          this.jobQueue.push(job);
          if (this.config.priorityQueue) {
            this.jobQueue.sort((a, b) => b.priority - a.priority);
          }
        }, this.config.retryDelay);

        this.emitEvent({
          type: 'job_progress',
          jobId: job.id,
          data: { 
            status: 'retrying', 
            retryCount: job.retryCount,
            error: errorMessage 
          },
          timestamp: new Date()
        });

      } else {
        // Job failed permanently
        this.failedJobs.set(job.id, {
          error: errorMessage,
          retryCount: job.retryCount
        });

        this.emitEvent({
          type: 'job_failed',
          jobId: job.id,
          data: { error: errorMessage, retryCount: job.retryCount },
          timestamp: new Date()
        });
      }
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): {
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'retrying';
    progress: number;
    result?: any;
    error?: string;
    retryCount?: number;
    processingTime?: number;
  } {
    // Check if job is active
    if (this.activeJobs.has(jobId)) {
      return { status: 'processing', progress: 50 };
    }

    // Check if job is completed
    const completedJob = this.completedJobs.get(jobId);
    if (completedJob) {
      return {
        status: 'completed',
        progress: 100,
        result: completedJob.result,
        processingTime: completedJob.processingTime
      };
    }

    // Check if job failed
    const failedJob = this.failedJobs.get(jobId);
    if (failedJob) {
      return {
        status: 'failed',
        progress: 0,
        error: failedJob.error,
        retryCount: failedJob.retryCount
      };
    }

    // Check if job is in queue
    const queuedJob = this.jobQueue.find(job => job.id === jobId);
    if (queuedJob) {
      return {
        status: 'queued',
        progress: 0,
        retryCount: queuedJob.retryCount
      };
    }

    return { status: 'failed', progress: 0, error: 'Job not found' };
  }

  /**
   * Get overall processing status
   */
  getProcessingStatus(): BatchProcessingStatus {
    const totalJobs = this.jobQueue.length + this.activeJobs.size + 
                     this.completedJobs.size + this.failedJobs.size;
    const completedJobs = this.completedJobs.size;
    const failedJobs = this.failedJobs.size;
    const progress = totalJobs > 0 ? ((completedJobs + failedJobs) / totalJobs) * 100 : 0;

    return {
      isRunning: this.isProcessing,
      queueLength: this.jobQueue.length,
      activeJobs: this.activeJobs.size,
      completedJobs,
      failedJobs,
      totalJobs,
      progress,
      estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(),
      lastUpdate: new Date()
    };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { queueLength: number; processingCount: number } {
    return {
      queueLength: this.jobQueue.length,
      processingCount: this.activeJobs.size
    };
  }

  /**
   * Get processing statistics
   */
  getStatistics(): ProcessingStats {
    return { ...this.stats };
  }

  /**
   * Clear completed jobs from memory
   */
  clearCompletedJobs(): void {
    this.completedJobs.clear();
    this.failedJobs.clear();
    this.log('Cleared completed jobs from memory');
  }

  /**
   * Remove a specific job from queue
   */
  removeJob(jobId: string): boolean {
    const queueIndex = this.jobQueue.findIndex(job => job.id === jobId);
    if (queueIndex !== -1) {
      this.jobQueue.splice(queueIndex, 1);
      this.log(`Removed job ${jobId} from queue`);
      return true;
    }
    return false;
  }

  /**
   * Pause processing
   */
  pauseProcessing(): void {
    this.isProcessing = false;
    this.log('Processing paused');
    this.emitEvent({
      type: 'processing_paused',
      data: { queueLength: this.jobQueue.length },
      timestamp: new Date()
    });
  }

  /**
   * Resume processing
   */
  resumeProcessing(): void {
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: string, callback: (event: ProcessingEvent) => void): void {
    this.eventListeners.set(eventType, callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string): void {
    this.eventListeners.delete(eventType);
  }

  /**
   * Auto-process unprocessed images
   */
  async autoProcessUnprocessedImages(): Promise<{
    totalProcessed: number;
    successfulJobs: number;
    failedJobs: number;
  }> {
    try {
      this.log('Starting auto-processing of unprocessed images');
      
      // Get unprocessed images from database
      const unprocessedImages = await this.getUnprocessedImages();
      
      if (unprocessedImages.length === 0) {
        this.log('No unprocessed images found');
        return { totalProcessed: 0, successfulJobs: 0, failedJobs: 0 };
      }

      // Add jobs to queue
      const jobIds: string[] = [];
      for (const image of unprocessedImages) {
        const jobId = await this.addJob({
          imageData: image.imageData,
          config: {
            useLLMAnalysis: true,
            llmProvider: 'ollama',
            llmModel: 'llama3.2',
            autoDetectAxes: true,
            autoDetectIntervals: true,
            colorDetectionMethod: 'hybrid',
            curveFittingMethod: 'adaptive',
            noiseReduction: true,
            outlierRemoval: true,
            smoothingLevel: 'medium'
          },
          priority: 1,
          maxRetries: 3,
          timeout: 30000,
          metadata: { productId: image.productId, imageId: image.id }
        });
        jobIds.push(jobId);
      }

      this.log(`Added ${jobIds.length} jobs to auto-processing queue`);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.startProcessing();
      }

      // Wait for all jobs to complete
      const results = await this.waitForJobs(jobIds);
      
      const successfulJobs = results.filter(r => r.success).length;
      const failedJobs = results.filter(r => !r.success).length;

      this.log(`Auto-processing completed: ${successfulJobs} successful, ${failedJobs} failed`);

      return {
        totalProcessed: results.length,
        successfulJobs,
        failedJobs
      };

    } catch (error) {
      console.error('Auto-processing failed:', error);
      return { totalProcessed: 0, successfulJobs: 0, failedJobs: 0 };
    }
  }

  // Utility methods
  private emitEvent(event: ProcessingEvent): void {
    const listener = this.eventListeners.get(event.type);
    if (listener) {
      try {
        listener(event);
      } catch (error) {
        this.log(`Error in event listener: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private updateStats(processingTime: number, success: boolean): void {
    this.stats.totalProcessed++;
    this.stats.totalErrors += success ? 0 : 1;
    this.stats.successRate = ((this.stats.totalProcessed - this.stats.totalErrors) / this.stats.totalProcessed) * 100;
    this.stats.averageProcessingTime = (this.stats.averageProcessingTime * (this.stats.totalProcessed - 1) + processingTime) / this.stats.totalProcessed;
    this.stats.lastProcessed = new Date();
  }

  private calculateEstimatedTimeRemaining(): number {
    if (this.stats.averageProcessingTime === 0) {
      return 0;
    }

    const remainingJobs = this.jobQueue.length + this.activeJobs.size;
    const estimatedTime = remainingJobs * this.stats.averageProcessingTime;
    
    // Account for concurrent processing
    return estimatedTime / this.config.maxConcurrentJobs;
  }

  private async waitForCompletion(jobIds: string[]): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const allCompleted = jobIds.every(jobId => {
          const status = this.getJobStatus(jobId);
          return status.status === 'completed' || status.status === 'failed';
        });

        if (allCompleted) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });
  }

  private async getUnprocessedImages(): Promise<Array<{ id: string; imageData: Uint8Array }>> {
    try {
      // Use Tauri invoke to get unprocessed images from database
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const result = await invoke('get_unprocessed_images');
        return result as Array<{ id: string; imageData: Uint8Array }>;
      }
      
      // Fallback: return empty array
      return [];
    } catch (error) {
      this.log(`Failed to get unprocessed images: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string, ...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(`[EnhancedBatchProcessingService] ${message}`, ...args);
    }
  }

  private async waitForJobs(jobIds: string[]): Promise<Array<{ jobId: string; success: boolean; error?: string }>> {
    const results: Array<{ jobId: string; success: boolean; error?: string }> = [];
    const maxWaitTime = 300000; // 5 minutes
    const startTime = Date.now();

    while (jobIds.length > 0 && (Date.now() - startTime) < maxWaitTime) {
      const completedJobs = jobIds.filter(id => 
        this.completedJobs.has(id) || this.failedJobs.has(id)
      );

      for (const jobId of completedJobs) {
        const jobIndex = jobIds.indexOf(jobId);
        if (jobIndex !== -1) {
          jobIds.splice(jobIndex, 1);
          
          if (this.completedJobs.has(jobId)) {
            results.push({ jobId, success: true });
          } else if (this.failedJobs.has(jobId)) {
            const failedJob = this.failedJobs.get(jobId);
            results.push({ jobId, success: false, error: failedJob?.error });
          }
        }
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Add remaining jobs as failed
    for (const jobId of jobIds) {
      results.push({ jobId, success: false, error: 'Timeout' });
    }

    return results;
  }

  private calculateTimeRemaining(): number {
    if (this.stats.averageProcessingTime === 0 || this.jobQueue.length === 0) {
      return 0;
    }
    return this.jobQueue.length * this.stats.averageProcessingTime;
  }
}

export default EnhancedBatchProcessingService; 