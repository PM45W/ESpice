// Product Queue Integration Service
// Handles integration between product database and graph extraction queue system

import { graphQueueService, QueueJob, QueueConfig } from './graphQueueService';
import productManagementService from './productManagementService';

export interface ProductImageUpload {
  productId: string;
  imageFile: File;
  description?: string;
  extractionMethod?: 'standard' | 'legacy' | 'llm';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  parameters?: any;
}

export interface GraphImageRecord {
  id: string;
  productId: string;
  filename: string;
  filePath: string;
  uploadDate: Date;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileSize: number;
  mimeType: string;
  dimensions?: { width: number; height: number };
  extractionJobs: GraphExtractionJobRecord[];
}

export interface GraphExtractionJobRecord {
  id: string;
  productId: string;
  imageId: string;
  queueId?: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  progress: number;
  extractionMethod: string;
  parameters?: any;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  extractionResult?: GraphExtractionResultRecord;
}

export interface GraphExtractionResultRecord {
  id: string;
  jobId: string;
  csvFilePath: string;
  csvData?: any;
  metadata?: any;
  confidence: number;
  dataPoints?: number;
  processingTime?: number;
  extractionMethod: string;
  parameters?: any;
}

export interface QueueIntegrationConfig {
  defaultQueueId: string;
  autoCreateJobs: boolean;
  defaultExtractionMethod: 'standard' | 'legacy' | 'llm';
  defaultPriority: 'low' | 'normal' | 'high' | 'urgent';
  maxConcurrentJobs: number;
}

class ProductQueueIntegrationService {
  private config: QueueIntegrationConfig = {
    defaultQueueId: 'default-queue',
    autoCreateJobs: true,
    defaultExtractionMethod: 'standard',
    defaultPriority: 'normal',
    maxConcurrentJobs: 3
  };

  private mockGraphImages: GraphImageRecord[] = [];
  private mockExtractionJobs: GraphExtractionJobRecord[] = [];
  private mockExtractionResults: GraphExtractionResultRecord[] = [];

  /**
   * Configure the integration service
   */
  async configure(config: Partial<QueueIntegrationConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Ensure default queue exists
    await this.ensureDefaultQueue();
  }

  /**
   * Ensure the default queue exists in the queue service
   */
  private async ensureDefaultQueue(): Promise<void> {
    try {
      // Check if default queue exists
      await graphQueueService.getQueueStatus(this.config.defaultQueueId);
    } catch (error) {
      // Create default queue if it doesn't exist
      await graphQueueService.createQueue({
        name: 'Default Graph Extraction Queue',
        mode: 'automatic',
        status: 'active',
        max_concurrent_jobs: this.config.maxConcurrentJobs,
        priority: 'fifo',
        description: 'Default queue for automatic graph extraction jobs'
      });
    }
  }

  /**
   * Upload image to product and optionally create extraction job
   */
  async uploadProductImage(upload: ProductImageUpload): Promise<{
    imageRecord: GraphImageRecord;
    jobRecord?: GraphExtractionJobRecord;
  }> {
    try {
      // Validate product exists
      const product = await productManagementService.getProduct(upload.productId);
      if (!product) {
        throw new Error(`Product with ID ${upload.productId} not found`);
      }

      // Create image record
      const imageRecord: GraphImageRecord = {
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        productId: upload.productId,
        filename: upload.imageFile.name,
        filePath: `/uploads/products/${upload.productId}/${upload.imageFile.name}`,
        uploadDate: new Date(),
        description: upload.description,
        status: 'pending',
        fileSize: upload.imageFile.size,
        mimeType: upload.imageFile.type,
        dimensions: await this.getImageDimensions(upload.imageFile),
        extractionJobs: []
      };

      // Store image record (in real implementation, this would be in database)
      this.mockGraphImages.push(imageRecord);

      let jobRecord: GraphExtractionJobRecord | undefined;

      // Auto-create extraction job if enabled
      if (this.config.autoCreateJobs) {
        jobRecord = await this.createExtractionJob({
          productId: upload.productId,
          imageId: imageRecord.id,
          extractionMethod: upload.extractionMethod || this.config.defaultExtractionMethod,
          priority: upload.priority || this.config.defaultPriority,
          parameters: upload.parameters
        });

        // Update image record with job
        imageRecord.extractionJobs.push(jobRecord);
        imageRecord.status = 'processing';
      }

      return { imageRecord, jobRecord };
    } catch (error) {
      console.error('Error uploading product image:', error);
      throw new Error('Failed to upload product image');
    }
  }

  /**
   * Create extraction job for an existing image
   */
  async createExtractionJob(jobData: {
    productId: string;
    imageId: string;
    extractionMethod?: 'standard' | 'legacy' | 'llm';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    parameters?: any;
  }): Promise<GraphExtractionJobRecord> {
    try {
      // Validate image exists
      const image = this.mockGraphImages.find(img => img.id === jobData.imageId);
      if (!image) {
        throw new Error(`Image with ID ${jobData.imageId} not found`);
      }

      // Create job record
      const jobRecord: GraphExtractionJobRecord = {
        id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        productId: jobData.productId,
        imageId: jobData.imageId,
        status: 'pending',
        priority: jobData.priority || this.config.defaultPriority,
        progress: 0,
        extractionMethod: jobData.extractionMethod || this.config.defaultExtractionMethod,
        parameters: jobData.parameters
      };

      // Store job record
      this.mockExtractionJobs.push(jobRecord);

      // Create job in queue service
      const queueJobId = await graphQueueService.createJob(this.config.defaultQueueId, {
        product_id: jobData.productId,
        image_id: jobData.imageId,
        extraction_method: jobData.extractionMethod || this.config.defaultExtractionMethod,
        parameters: jobData.parameters,
        priority: jobData.priority || this.config.defaultPriority
      });

      // Update job record with queue ID
      jobRecord.queueId = queueJobId;

      // Update image status
      const imageIndex = this.mockGraphImages.findIndex(img => img.id === jobData.imageId);
      if (imageIndex !== -1) {
        this.mockGraphImages[imageIndex].status = 'processing';
        this.mockGraphImages[imageIndex].extractionJobs.push(jobRecord);
      }

      return jobRecord;
    } catch (error) {
      console.error('Error creating extraction job:', error);
      throw new Error('Failed to create extraction job');
    }
  }

  /**
   * Get all images for a product
   */
  async getProductImages(productId: string): Promise<GraphImageRecord[]> {
    try {
      return this.mockGraphImages.filter(img => img.productId === productId);
    } catch (error) {
      console.error('Error fetching product images:', error);
      throw new Error('Failed to fetch product images');
    }
  }

  /**
   * Get all extraction jobs for a product
   */
  async getProductExtractionJobs(productId: string): Promise<GraphExtractionJobRecord[]> {
    try {
      return this.mockExtractionJobs.filter(job => job.productId === productId);
    } catch (error) {
      console.error('Error fetching product extraction jobs:', error);
      throw new Error('Failed to fetch product extraction jobs');
    }
  }

  /**
   * Get extraction job by ID
   */
  async getExtractionJob(jobId: string): Promise<GraphExtractionJobRecord | null> {
    try {
      const job = this.mockExtractionJobs.find(j => j.id === jobId);
      if (job && job.extractionResult) {
        const result = this.mockExtractionResults.find(r => r.jobId === jobId);
        if (result) {
          job.extractionResult = result;
        }
      }
      return job || null;
    } catch (error) {
      console.error('Error fetching extraction job:', error);
      throw new Error('Failed to fetch extraction job');
    }
  }

  /**
   * Update extraction job status
   */
  async updateExtractionJobStatus(
    jobId: string, 
    status: GraphExtractionJobRecord['status'], 
    progress?: number,
    error?: string
  ): Promise<GraphExtractionJobRecord> {
    try {
      const jobIndex = this.mockExtractionJobs.findIndex(j => j.id === jobId);
      if (jobIndex === -1) {
        throw new Error(`Job with ID ${jobId} not found`);
      }

      const job = this.mockExtractionJobs[jobIndex];
      job.status = status;
      
      if (progress !== undefined) {
        job.progress = progress;
      }

      if (status === 'processing' && !job.startedAt) {
        job.startedAt = new Date();
      }

      if (status === 'completed' || status === 'failed') {
        job.completedAt = new Date();
        if (job.startedAt) {
          job.actualDuration = Math.floor((job.completedAt.getTime() - job.startedAt.getTime()) / 1000);
        }
      }

      // Update image status based on job status
      const imageIndex = this.mockGraphImages.findIndex(img => img.id === job.imageId);
      if (imageIndex !== -1) {
        const image = this.mockGraphImages[imageIndex];
        const allJobs = image.extractionJobs;
        const allCompleted = allJobs.every(j => j.status === 'completed');
        const anyFailed = allJobs.some(j => j.status === 'failed');
        const anyProcessing = allJobs.some(j => j.status === 'processing');

        if (allCompleted) {
          image.status = 'completed';
        } else if (anyFailed) {
          image.status = 'failed';
        } else if (anyProcessing) {
          image.status = 'processing';
        } else {
          image.status = 'pending';
        }
      }

      // Update queue service
      if (job.queueId) {
        await graphQueueService.updateJobStatus(jobId, status, progress, error);
      }

      return job;
    } catch (error) {
      console.error('Error updating extraction job status:', error);
      throw new Error('Failed to update extraction job status');
    }
  }

  /**
   * Store extraction result
   */
  async storeExtractionResult(
    jobId: string, 
    result: Omit<GraphExtractionResultRecord, 'id' | 'jobId'>
  ): Promise<GraphExtractionResultRecord> {
    try {
      const job = this.mockExtractionJobs.find(j => j.id === jobId);
      if (!job) {
        throw new Error(`Job with ID ${jobId} not found`);
      }

      const resultRecord: GraphExtractionResultRecord = {
        id: `result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        jobId,
        ...result
      };

      // Store result
      this.mockExtractionResults.push(resultRecord);

      // Update job with result
      job.extractionResult = resultRecord;

      // Update job status to completed
      await this.updateExtractionJobStatus(jobId, 'completed', 100);

      return resultRecord;
    } catch (error) {
      console.error('Error storing extraction result:', error);
      throw new Error('Failed to store extraction result');
    }
  }

  /**
   * Get extraction result by job ID
   */
  async getExtractionResult(jobId: string): Promise<GraphExtractionResultRecord | null> {
    try {
      return this.mockExtractionResults.find(r => r.jobId === jobId) || null;
    } catch (error) {
      console.error('Error fetching extraction result:', error);
      throw new Error('Failed to fetch extraction result');
    }
  }

  /**
   * Delete image and all associated jobs
   */
  async deleteProductImage(imageId: string): Promise<boolean> {
    try {
      const imageIndex = this.mockGraphImages.findIndex(img => img.id === imageId);
      if (imageIndex === -1) {
        return false;
      }

      const image = this.mockGraphImages[imageIndex];

      // Delete associated jobs
      const jobIds = image.extractionJobs.map(job => job.id);
      for (const jobId of jobIds) {
        await this.deleteExtractionJob(jobId);
      }

      // Delete image
      this.mockGraphImages.splice(imageIndex, 1);

      return true;
    } catch (error) {
      console.error('Error deleting product image:', error);
      throw new Error('Failed to delete product image');
    }
  }

  /**
   * Delete extraction job
   */
  async deleteExtractionJob(jobId: string): Promise<boolean> {
    try {
      const jobIndex = this.mockExtractionJobs.findIndex(j => j.id === jobId);
      if (jobIndex === -1) {
        return false;
      }

      const job = this.mockExtractionJobs[jobIndex];

      // Cancel job in queue service
      if (job.queueId) {
        try {
          await graphQueueService.cancelJob(jobId);
        } catch (error) {
          console.warn('Failed to cancel job in queue service:', error);
        }
      }

      // Delete associated result
      const resultIndex = this.mockExtractionResults.findIndex(r => r.jobId === jobId);
      if (resultIndex !== -1) {
        this.mockExtractionResults.splice(resultIndex, 1);
      }

      // Remove job from image
      const imageIndex = this.mockGraphImages.findIndex(img => img.id === job.imageId);
      if (imageIndex !== -1) {
        const image = this.mockGraphImages[imageIndex];
        image.extractionJobs = image.extractionJobs.filter(j => j.id !== jobId);
        
        // Update image status if no jobs remain
        if (image.extractionJobs.length === 0) {
          image.status = 'pending';
        }
      }

      // Delete job
      this.mockExtractionJobs.splice(jobIndex, 1);

      return true;
    } catch (error) {
      console.error('Error deleting extraction job:', error);
      throw new Error('Failed to delete extraction job');
    }
  }

  /**
   * Retry failed extraction job
   */
  async retryExtractionJob(jobId: string): Promise<GraphExtractionJobRecord> {
    try {
      const job = this.mockExtractionJobs.find(j => j.id === jobId);
      if (!job) {
        throw new Error(`Job with ID ${jobId} not found`);
      }

      // Reset job status
      job.status = 'pending';
      job.progress = 0;
      job.startedAt = undefined;
      job.completedAt = undefined;
      job.actualDuration = undefined;

      // Remove old result
      job.extractionResult = undefined;
      const resultIndex = this.mockExtractionResults.findIndex(r => r.jobId === jobId);
      if (resultIndex !== -1) {
        this.mockExtractionResults.splice(resultIndex, 1);
      }

      // Retry in queue service
      if (job.queueId) {
        await graphQueueService.retryJob(jobId);
      }

      return job;
    } catch (error) {
      console.error('Error retrying extraction job:', error);
      throw new Error('Failed to retry extraction job');
    }
  }

  /**
   * Get product extraction statistics
   */
  async getProductExtractionStats(productId: string): Promise<{
    totalImages: number;
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    pendingJobs: number;
    processingJobs: number;
    averageProcessingTime: number;
  }> {
    try {
      const images = this.mockGraphImages.filter(img => img.productId === productId);
      const jobs = this.mockExtractionJobs.filter(job => job.productId === productId);

      const completedJobs = jobs.filter(j => j.status === 'completed');
      const failedJobs = jobs.filter(j => j.status === 'failed');
      const pendingJobs = jobs.filter(j => j.status === 'pending');
      const processingJobs = jobs.filter(j => j.status === 'processing');

      const processingTimes = completedJobs
        .map(j => j.actualDuration)
        .filter(d => d !== undefined) as number[];

      const averageProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
        : 0;

      return {
        totalImages: images.length,
        totalJobs: jobs.length,
        completedJobs: completedJobs.length,
        failedJobs: failedJobs.length,
        pendingJobs: pendingJobs.length,
        processingJobs: processingJobs.length,
        averageProcessingTime
      };
    } catch (error) {
      console.error('Error fetching product extraction stats:', error);
      throw new Error('Failed to fetch product extraction stats');
    }
  }

  /**
   * Validate data consistency
   */
  async validateDataConsistency(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for orphaned jobs (jobs without images)
      const orphanedJobs = this.mockExtractionJobs.filter(job => 
        !this.mockGraphImages.find(img => img.id === job.imageId)
      );
      if (orphanedJobs.length > 0) {
        errors.push(`Found ${orphanedJobs.length} orphaned extraction jobs`);
      }

      // Check for orphaned results (results without jobs)
      const orphanedResults = this.mockExtractionResults.filter(result => 
        !this.mockExtractionJobs.find(job => job.id === result.jobId)
      );
      if (orphanedResults.length > 0) {
        errors.push(`Found ${orphanedResults.length} orphaned extraction results`);
      }

      // Check for images with inconsistent status
      for (const image of this.mockGraphImages) {
        const jobs = image.extractionJobs;
        const allCompleted = jobs.every(j => j.status === 'completed');
        const anyFailed = jobs.some(j => j.status === 'failed');
        const anyProcessing = jobs.some(j => j.status === 'processing');

        if (allCompleted && image.status !== 'completed') {
          warnings.push(`Image ${image.id} should have status 'completed'`);
        } else if (anyFailed && image.status !== 'failed') {
          warnings.push(`Image ${image.id} should have status 'failed'`);
        } else if (anyProcessing && image.status !== 'processing') {
          warnings.push(`Image ${image.id} should have status 'processing'`);
        }
      }

      // Check for jobs with missing queue IDs
      const jobsWithoutQueue = this.mockExtractionJobs.filter(job => !job.queueId);
      if (jobsWithoutQueue.length > 0) {
        warnings.push(`Found ${jobsWithoutQueue.length} jobs without queue IDs`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Error validating data consistency:', error);
      throw new Error('Failed to validate data consistency');
    }
  }

  /**
   * Get image dimensions from file
   */
  private async getImageDimensions(file: File): Promise<{ width: number; height: number } | undefined> {
    try {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          resolve(undefined);
        };
        img.src = URL.createObjectURL(file);
      });
    } catch (error) {
      console.warn('Failed to get image dimensions:', error);
      return undefined;
    }
  }

  /**
   * Export extraction data for a product
   */
  async exportProductExtractionData(productId: string): Promise<{
    images: GraphImageRecord[];
    jobs: GraphExtractionJobRecord[];
    results: GraphExtractionResultRecord[];
  }> {
    try {
      const images = this.mockGraphImages.filter(img => img.productId === productId);
      const jobs = this.mockExtractionJobs.filter(job => job.productId === productId);
      const jobIds = jobs.map(job => job.id);
      const results = this.mockExtractionResults.filter(result => jobIds.includes(result.jobId));

      return { images, jobs, results };
    } catch (error) {
      console.error('Error exporting product extraction data:', error);
      throw new Error('Failed to export product extraction data');
    }
  }

  /**
   * Import extraction data for a product
   */
  async importProductExtractionData(
    productId: string, 
    data: {
      images: GraphImageRecord[];
      jobs: GraphExtractionJobRecord[];
      results: GraphExtractionResultRecord[];
    }
  ): Promise<void> {
    try {
      // Remove existing data for this product
      this.mockGraphImages = this.mockGraphImages.filter(img => img.productId !== productId);
      this.mockExtractionJobs = this.mockExtractionJobs.filter(job => job.productId !== productId);
      
      const jobIds = this.mockExtractionJobs.filter(job => job.productId === productId).map(job => job.id);
      this.mockExtractionResults = this.mockExtractionResults.filter(result => !jobIds.includes(result.jobId));

      // Import new data
      this.mockGraphImages.push(...data.images);
      this.mockExtractionJobs.push(...data.jobs);
      this.mockExtractionResults.push(...data.results);
    } catch (error) {
      console.error('Error importing product extraction data:', error);
      throw new Error('Failed to import product extraction data');
    }
  }
}

// Export singleton instance
export const productQueueIntegrationService = new ProductQueueIntegrationService(); 