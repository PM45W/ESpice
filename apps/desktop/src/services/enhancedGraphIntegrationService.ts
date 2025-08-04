import { invoke } from '@tauri-apps/api/core';
import EnhancedGraphExtractionService from './enhancedGraphExtractionService';
import EnhancedBatchProcessingService from './enhancedBatchProcessingService';
import productManagementService from './productManagementService';
import type { 
  ProductWithParameters, 
  CurveExtractionResult,
  LLMAnalysisResult 
} from '../types';

export interface EnhancedExtractionJob {
  id: string;
  productId: string;
  productName: string;
  imageData: Uint8Array;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    extractionResult: CurveExtractionResult;
    llmAnalysis: LLMAnalysisResult;
  };
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  priority: number;
}

export interface IntegrationConfig {
  autoProcessOnUpload: boolean;
  autoProcessOnDetection: boolean;
  saveToProductDatabase: boolean;
  generateSpiceModels: boolean;
  exportToCSV: boolean;
  llmProvider: 'ollama' | 'openai' | 'anthropic';
  llmModel: string;
}

class EnhancedGraphIntegrationService {
  private static instance: EnhancedGraphIntegrationService;
  private enhancedExtractionService: EnhancedGraphExtractionService;
  private batchProcessingService: EnhancedBatchProcessingService;
  private config: IntegrationConfig;

  private constructor() {
    this.enhancedExtractionService = EnhancedGraphExtractionService.getInstance();
    this.batchProcessingService = EnhancedBatchProcessingService.getInstance();
    this.config = {
      autoProcessOnUpload: true,
      autoProcessOnDetection: true,
      saveToProductDatabase: true,
      generateSpiceModels: false,
      exportToCSV: true,
      llmProvider: 'ollama',
      llmModel: 'llama3.2'
    };
  }

  static getInstance(): EnhancedGraphIntegrationService {
    if (!EnhancedGraphIntegrationService.instance) {
      EnhancedGraphIntegrationService.instance = new EnhancedGraphIntegrationService();
    }
    return EnhancedGraphIntegrationService.instance;
  }

  /**
   * Configure the integration service
   */
  configure(config: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Process a single image for a specific product
   */
  async processProductImage(
    productId: string,
    imageData: Uint8Array,
    priority: number = 1
  ): Promise<EnhancedExtractionJob> {
    const job: EnhancedExtractionJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId,
      productName: '', // Will be filled after product lookup
      imageData,
      status: 'pending',
      createdAt: new Date(),
      priority
    };

    try {
      // Get product information
      const product = await this.getProductById(productId);
      if (product) {
        job.productName = product.name;
      }

      // Process the image
      job.status = 'processing';
      const result = await this.enhancedExtractionService.extractGraphWithLLM(
        imageData,
        {
          useLLMAnalysis: true,
          llmProvider: this.config.llmProvider,
          llmModel: this.config.llmModel,
          autoDetectAxes: true,
          autoDetectIntervals: true,
          colorDetectionMethod: 'hybrid',
          curveFittingMethod: 'adaptive',
          noiseReduction: true,
          outlierRemoval: true,
          smoothingLevel: 'medium'
        }
      );

      job.result = {
        extractionResult: result.extractionResult,
        llmAnalysis: result.llmAnalysis
      };
      job.status = 'completed';
      job.completedAt = new Date();

      // Save results to database if enabled
      if (this.config.saveToProductDatabase) {
        await this.saveResultsToDatabase(job);
      }

      // Export to CSV if enabled
      if (this.config.exportToCSV && result.extractionResult.success) {
        await this.exportResultsToCSV(job);
      }

      // Generate SPICE models if enabled
      if (this.config.generateSpiceModels && result.extractionResult.success) {
        await this.generateSpiceModels(job);
      }

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
    }

    return job;
  }

  /**
   * Process multiple images for a product
   */
  async processProductImages(
    productId: string,
    images: Array<{ id: string; imageData: Uint8Array; priority?: number }>
  ): Promise<EnhancedExtractionJob[]> {
    const jobs: EnhancedExtractionJob[] = [];

    for (const image of images) {
      const job = await this.processProductImage(
        productId,
        image.imageData,
        image.priority || 1
      );
      jobs.push(job);
    }

    return jobs;
  }

  /**
   * Auto-process all unprocessed images for all products
   */
  async autoProcessAllUnprocessedImages(): Promise<{
    totalProcessed: number;
    successfulJobs: number;
    failedJobs: number;
    jobs: EnhancedExtractionJob[];
  }> {
    try {
      // Get all products
      const products = await productManagementService.getProducts();
      const allJobs: EnhancedExtractionJob[] = [];
      let totalProcessed = 0;
      let successfulJobs = 0;
      let failedJobs = 0;

      for (const product of products) {
        // Get unprocessed images for this product
        const unprocessedImages = await this.getUnprocessedImagesForProduct(product.id);
        
        if (unprocessedImages.length > 0) {
          const jobs = await this.processProductImages(
            product.id,
            unprocessedImages.map(img => ({
              id: img.id,
              imageData: img.imageData,
              priority: 1
            }))
          );

          allJobs.push(...jobs);
          totalProcessed += unprocessedImages.length;
          successfulJobs += jobs.filter(j => j.status === 'completed').length;
          failedJobs += jobs.filter(j => j.status === 'failed').length;
        }
      }

      return {
        totalProcessed,
        successfulJobs,
        failedJobs,
        jobs: allJobs
      };

    } catch (error) {
      console.error('Auto-processing failed:', error);
      return {
        totalProcessed: 0,
        successfulJobs: 0,
        failedJobs: 0,
        jobs: []
      };
    }
  }

  /**
   * Get product by ID
   */
  private async getProductById(productId: string): Promise<ProductWithParameters | null> {
    try {
      const products = await productManagementService.getProducts();
      return products.find(p => p.id === productId) || null;
    } catch (error) {
      console.error('Failed to get product:', error);
      return null;
    }
  }

  /**
   * Get unprocessed images for a product
   */
  private async getUnprocessedImagesForProduct(productId: string): Promise<Array<{ id: string; imageData: Uint8Array }>> {
    try {
      // Use Tauri invoke to get unprocessed images from database
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const result = await invoke('get_unprocessed_images_for_product', { productId });
        return result as Array<{ id: string; imageData: Uint8Array }>;
      }
      
      // Fallback: return empty array
      return [];
    } catch (error) {
      console.error('Failed to get unprocessed images for product:', error);
      return [];
    }
  }

  /**
   * Save extraction results to database
   */
  private async saveResultsToDatabase(job: EnhancedExtractionJob): Promise<void> {
    try {
      if (!job.result || !job.result.extractionResult.success) {
        return;
      }

      // Save curves to product database
      await this.enhancedExtractionService.saveToDatabase(
        job.productId,
        job.result.extractionResult.curves,
        {
          x_min: job.result.llmAnalysis.xAxis.min,
          x_max: job.result.llmAnalysis.xAxis.max,
          y_min: job.result.llmAnalysis.yAxis.min,
          y_max: job.result.llmAnalysis.yAxis.max,
          x_scale: 1,
          y_scale: 1,
          x_scale_type: job.result.llmAnalysis.xAxis.scale,
          y_scale_type: job.result.llmAnalysis.yAxis.scale,
          graph_type: job.result.llmAnalysis.graphType as any,
          x_axis_name: job.result.llmAnalysis.xAxis.name,
          y_axis_name: job.result.llmAnalysis.yAxis.name
        },
        {} // color representations
      );

      console.log(`Saved extraction results for product ${job.productId}`);

    } catch (error) {
      console.error('Failed to save results to database:', error);
    }
  }

  /**
   * Export results to CSV
   */
  private async exportResultsToCSV(job: EnhancedExtractionJob): Promise<void> {
    try {
      if (!job.result || !job.result.extractionResult.success) {
        return;
      }

      const csvContent = this.enhancedExtractionService.exportToCSV(
        job.result.extractionResult.curves,
        {}
      );

      // Create filename with product name and timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${job.productName}_extraction_${timestamp}.csv`;

      // Save file using Tauri
      if (typeof window !== 'undefined' && window.__TAURI__) {
        await invoke('save_csv_file', {
          content: csvContent,
          filename
        });
      }

      console.log(`Exported CSV for product ${job.productId}: ${filename}`);

    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  }

  /**
   * Generate SPICE models from extraction results
   */
  private async generateSpiceModels(job: EnhancedExtractionJob): Promise<void> {
    try {
      if (!job.result || !job.result.extractionResult.success) {
        return;
      }

      // This would integrate with the SPICE model generation service
      // For now, just log that we would generate models
      console.log(`Would generate SPICE models for product ${job.productId} with ${job.result.extractionResult.curves.length} curves`);

    } catch (error) {
      console.error('Failed to generate SPICE models:', error);
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStatistics(): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    successRate: number;
    averageProcessingTime: number;
  }> {
    try {
      const extractionStats = this.enhancedExtractionService.getStatistics();
      const batchStats = this.batchProcessingService.getStatistics();

      return {
        totalJobs: extractionStats.totalProcessed + batchStats.totalProcessed,
        completedJobs: extractionStats.totalProcessed - extractionStats.totalErrors + batchStats.totalProcessed - batchStats.totalErrors,
        failedJobs: extractionStats.totalErrors + batchStats.totalErrors,
        successRate: (extractionStats.successRate + batchStats.successRate) / 2,
        averageProcessingTime: (extractionStats.averageProcessingTime + batchStats.averageProcessingTime) / 2
      };

    } catch (error) {
      console.error('Failed to get processing statistics:', error);
      return {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        successRate: 0,
        averageProcessingTime: 0
      };
    }
  }

  /**
   * Get configuration
   */
  getConfig(): IntegrationConfig {
    return { ...this.config };
  }
}

export default EnhancedGraphIntegrationService; 