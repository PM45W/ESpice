import { invoke } from '@tauri-apps/api/core';

export interface GraphImage {
  id: string;
  productId: string;
  filename: string;
  filePath: string;
  uploadDate: Date;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileSize?: number;
  mimeType?: string;
  dimensions?: { width: number; height: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphImageUpload {
  productId: string;
  filename: string;
  description?: string;
  fileData: string; // Base64 encoded file data
  mimeType: string;
  fileSize: number;
}

export interface GraphImageCreateInput {
  productId: string;
  filename: string;
  filePath: string;
  description?: string;
  fileSize?: number;
  mimeType?: string;
  dimensions?: { width: number; height: number };
}

class GraphImageService {
  private static instance: GraphImageService;

  private constructor() {}

  public static getInstance(): GraphImageService {
    if (!GraphImageService.instance) {
      GraphImageService.instance = new GraphImageService();
    }
    return GraphImageService.instance;
  }

  /**
   * Upload a single graph image to the database
   */
  async uploadImage(upload: GraphImageUpload): Promise<GraphImage> {
    try {
      const result = await invoke<GraphImage>('upload_graph_image', {
        upload: {
          ...upload,
          uploadDate: new Date().toISOString()
        }
      });
      return result;
    } catch (error) {
      console.error('Failed to upload graph image:', error);
      throw new Error(`Failed to upload image: ${error}`);
    }
  }

  /**
   * Upload multiple graph images to the database
   */
  async uploadMultipleImages(uploads: GraphImageUpload[]): Promise<GraphImage[]> {
    try {
      const results = await Promise.all(
        uploads.map(upload => this.uploadImage(upload))
      );
      return results;
    } catch (error) {
      console.error('Failed to upload multiple graph images:', error);
      throw new Error(`Failed to upload images: ${error}`);
    }
  }

  /**
   * Get all graph images for a product
   */
  async getImagesByProduct(productId: string): Promise<GraphImage[]> {
    try {
      const result = await invoke<GraphImage[]>('get_graph_images_by_product', {
        productId
      });
      return result;
    } catch (error) {
      console.error('Failed to get graph images:', error);
      throw new Error(`Failed to get images: ${error}`);
    }
  }

  /**
   * Get a single graph image by ID
   */
  async getImageById(imageId: string): Promise<GraphImage> {
    try {
      const result = await invoke<GraphImage>('get_graph_image_by_id', {
        imageId
      });
      return result;
    } catch (error) {
      console.error('Failed to get graph image:', error);
      throw new Error(`Failed to get image: ${error}`);
    }
  }

  /**
   * Update graph image metadata
   */
  async updateImage(imageId: string, updates: Partial<GraphImage>): Promise<GraphImage> {
    try {
      const result = await invoke<GraphImage>('update_graph_image', {
        imageId,
        updates: {
          ...updates,
          updatedAt: new Date().toISOString()
        }
      });
      return result;
    } catch (error) {
      console.error('Failed to update graph image:', error);
      throw new Error(`Failed to update image: ${error}`);
    }
  }

  /**
   * Delete a graph image
   */
  async deleteImage(imageId: string): Promise<void> {
    try {
      await invoke('delete_graph_image', { imageId });
    } catch (error) {
      console.error('Failed to delete graph image:', error);
      throw new Error(`Failed to delete image: ${error}`);
    }
  }

  /**
   * Create extraction job for a graph image
   */
  async createExtractionJob(imageId: string, productId: string, options?: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    extractionMethod?: 'standard' | 'legacy' | 'llm';
    parameters?: any;
  }): Promise<string> {
    try {
      const result = await invoke<string>('create_graph_extraction_job', {
        imageId,
        productId,
        options: {
          priority: 'normal',
          extractionMethod: 'standard',
          ...options
        }
      });
      return result;
    } catch (error) {
      console.error('Failed to create extraction job:', error);
      throw new Error(`Failed to create extraction job: ${error}`);
    }
  }

  /**
   * Get extraction jobs for a product
   */
  async getExtractionJobs(productId: string): Promise<any[]> {
    try {
      const result = await invoke<any[]>('get_graph_extraction_jobs', {
        productId
      });
      return result;
    } catch (error) {
      console.error('Failed to get extraction jobs:', error);
      throw new Error(`Failed to get extraction jobs: ${error}`);
    }
  }

  /**
   * Convert file to base64 for upload
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get image dimensions from file
   */
  async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Prepare file for upload
   */
  async prepareFileForUpload(file: File, productId: string, description?: string): Promise<GraphImageUpload> {
    const base64Data = await this.fileToBase64(file);
    const dimensions = await this.getImageDimensions(file);

    return {
      productId,
      filename: file.name,
      description,
      fileData: base64Data,
      mimeType: file.type,
      fileSize: file.size
    };
  }

  /**
   * Batch upload multiple files
   */
  async batchUploadFiles(files: File[], productId: string, descriptions?: string[]): Promise<GraphImage[]> {
    const uploads = await Promise.all(
      files.map((file, index) => 
        this.prepareFileForUpload(file, productId, descriptions?.[index])
      )
    );

    return this.uploadMultipleImages(uploads);
  }
}

export default GraphImageService; 