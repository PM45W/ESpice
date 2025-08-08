import type { AnnotationBox, ExportOptions, ExtractionQueueItem } from '../types/pdf';

class ExtractionQueueService {
  private queue: ExtractionQueueItem[] = [];
  private subscribers: (() => void)[] = [];

  addToQueue(box: AnnotationBox, priority: number = 1): string {
    const queueItem: ExtractionQueueItem = {
      id: `extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      boxId: box.id,
      type: box.type,
      status: 'pending',
      priority,
      createdAt: new Date(),
      imageData: null,
      progress: 0
    };

    this.queue.push(queueItem);
    this.notifySubscribers();
    return queueItem.id;
  }

  removeFromQueue(itemId: string): boolean {
    const index = this.queue.findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.notifySubscribers();
      return true;
    }
    return false;
  }

  updateStatus(itemId: string, status: 'pending' | 'processing' | 'completed' | 'failed', progress?: number): boolean {
    const item = this.queue.find(item => item.id === itemId);
    if (item) {
      item.status = status;
      if (progress !== undefined) {
        item.progress = progress;
      }
      this.notifySubscribers();
      return true;
    }
    return false;
  }

  getAllItems(): ExtractionQueueItem[] {
    return [...this.queue];
  }

  getItem(itemId: string): ExtractionQueueItem | null {
    return this.queue.find(item => item.id === itemId) || null;
  }

  clearQueue(): void {
    this.queue = [];
    this.notifySubscribers();
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index !== -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback());
  }

  async exportBoxAsImage(box: AnnotationBox, options: ExportOptions): Promise<Blob> {
    try {
      // Create a canvas to draw the box content
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // For now, create a placeholder image with the box dimensions
      // In a real implementation, this would extract the actual content from the PDF
      const width = box.boundingBox.width + (options.padding * 2);
      const height = box.boundingBox.height + (options.padding * 2);
      
      canvas.width = width;
      canvas.height = height;

      // Fill background
      if (options.background === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      } else if (options.background === 'transparent') {
        ctx.clearRect(0, 0, width, height);
      }

      // Draw a placeholder rectangle representing the box
      ctx.strokeStyle = box.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(options.padding, options.padding, box.boundingBox.width, box.boundingBox.height);

      // Add label if requested
      if (options.includeLabels) {
        ctx.fillStyle = box.color;
        ctx.font = '14px Arial';
        ctx.fillText(box.label, options.padding, options.padding - 5);
      }

      // Add metadata if requested
      if (options.includeMetadata) {
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        const metadata = `Type: ${box.type} | Confidence: ${Math.round(box.confidence * 100)}%`;
        ctx.fillText(metadata, options.padding, height - options.padding + 15);
      }

      // Convert to blob
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, `image/${options.format}`, options.quality / 100);
      });
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  async processQueue(): Promise<void> {
    const pendingItems = this.queue.filter(item => item.status === 'pending');
    
    for (const item of pendingItems) {
      try {
        this.updateStatus(item.id, 'processing', 0);
        
        // Simulate processing with progress updates
        for (let progress = 0; progress <= 100; progress += 10) {
          this.updateStatus(item.id, 'processing', progress);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.updateStatus(item.id, 'completed', 100);
      } catch (error) {
        console.error(`Processing failed for item ${item.id}:`, error);
        this.updateStatus(item.id, 'failed');
      }
    }
  }
}

// Export singleton instance
export const extractionQueueService = new ExtractionQueueService(); 