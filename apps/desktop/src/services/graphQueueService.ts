// Graph Queue Service for managing graph extraction jobs
// Connects to the graph-queue-service running on port 8008

export interface QueueJob {
  id: string;
  product_id: string;
  image_id: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  progress: number;
  extraction_method: string;
  parameters?: any;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface QueueConfig {
  id: string;
  name: string;
  mode: 'automatic' | 'manual';
  status: 'active' | 'paused' | 'stopped';
  max_concurrent_jobs: number;
  priority: 'fifo' | 'priority' | 'custom';
  description?: string;
}

export interface QueueStatistics {
  queue_id: string;
  statistics: Array<{
    status: string;
    count: number;
    avg_progress?: number;
    avg_duration?: number;
  }>;
}

export interface GlobalStatistics {
  total_queues: number;
  job_statistics: Array<{
    status: string;
    count: number;
  }>;
  processing_statistics: {
    avg_processing_time?: number;
    total_completed_jobs?: number;
  };
}

class GraphQueueService {
  private baseUrl = 'http://localhost:8008';
  private wsConnections: Map<string, WebSocket> = new Map();

  // Health check
  async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Graph queue service health check failed:', error);
      return false;
    }
  }

  // Queue Management
  async createQueue(config: Omit<QueueConfig, 'id'>): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/queue/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Failed to create queue: ${response.statusText}`);
      }

      const result = await response.json();
      return result.queue_id;
    } catch (error) {
      console.error('Error creating queue:', error);
      throw error;
    }
  }

  async getQueueStatus(queueId: string): Promise<QueueConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/api/queue/${queueId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get queue status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting queue status:', error);
      throw error;
    }
  }

  async updateQueue(queueId: string, update: Partial<QueueConfig>): Promise<QueueConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/api/queue/${queueId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      });

      if (!response.ok) {
        throw new Error(`Failed to update queue: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating queue:', error);
      throw error;
    }
  }

  async deleteQueue(queueId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/queue/${queueId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete queue: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting queue:', error);
      throw error;
    }
  }

  async listQueues(): Promise<QueueConfig[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/queues`);
      
      if (!response.ok) {
        throw new Error(`Failed to list queues: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error listing queues:', error);
      throw error;
    }
  }

  // Job Management
  async createJob(queueId: string, job: {
    product_id: string;
    image_id: string;
    extraction_method?: string;
    parameters?: any;
    priority?: QueueJob['priority'];
  }): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/job/create?queue_id=${queueId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(job),
      });

      if (!response.ok) {
        throw new Error(`Failed to create job: ${response.statusText}`);
      }

      const result = await response.json();
      return result.job_id;
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<QueueJob> {
    try {
      const response = await fetch(`${this.baseUrl}/api/job/${jobId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get job status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting job status:', error);
      throw error;
    }
  }

  async updateJobPriority(jobId: string, priority: QueueJob['priority']): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/job/${jobId}/priority`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update job priority: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating job priority:', error);
      throw error;
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/job/${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel job: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
      throw error;
    }
  }

  async retryJob(jobId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/job/${jobId}/retry`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to retry job: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error retrying job:', error);
      throw error;
    }
  }

  async updateJobStatus(jobId: string, status: string, progress?: number, error?: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/job/${jobId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, progress, error }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update job status: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  }

  // Batch Operations
  async createBatchJobs(queueId: string, jobs: Array<{
    product_id: string;
    image_id: string;
    extraction_method?: string;
    parameters?: any;
    priority?: QueueJob['priority'];
  }>): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/batch/create?queue_id=${queueId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobs),
      });

      if (!response.ok) {
        throw new Error(`Failed to create batch jobs: ${response.statusText}`);
      }

      const result = await response.json();
      return result.job_ids;
    } catch (error) {
      console.error('Error creating batch jobs:', error);
      throw error;
    }
  }

  async getBatchStatus(batchId: string): Promise<QueueConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/api/batch/${batchId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get batch status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting batch status:', error);
      throw error;
    }
  }

  async cancelBatch(batchId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/batch/${batchId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel batch: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error cancelling batch:', error);
      throw error;
    }
  }

  // Statistics
  async getQueueStatistics(queueId: string): Promise<QueueStatistics> {
    try {
      const response = await fetch(`${this.baseUrl}/api/stats/queue/${queueId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get queue statistics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting queue statistics:', error);
      throw error;
    }
  }

  async getGlobalStatistics(): Promise<GlobalStatistics> {
    try {
      const response = await fetch(`${this.baseUrl}/api/stats/global`);
      
      if (!response.ok) {
        throw new Error(`Failed to get global statistics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting global statistics:', error);
      throw error;
    }
  }

  // WebSocket Connections for Real-time Updates
  connectToQueueWebSocket(queueId: string, onMessage: (data: any) => void): WebSocket {
    const ws = new WebSocket(`ws://localhost:8008/ws/queue/${queueId}`);
    
    ws.onopen = () => {
      console.log(`Connected to queue ${queueId} WebSocket`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for queue ${queueId}:`, error);
    };

    ws.onclose = () => {
      console.log(`Disconnected from queue ${queueId} WebSocket`);
      this.wsConnections.delete(queueId);
    };

    this.wsConnections.set(queueId, ws);
    return ws;
  }

  connectToJobWebSocket(jobId: string, onMessage: (data: any) => void): WebSocket {
    const ws = new WebSocket(`ws://localhost:8008/ws/job/${jobId}`);
    
    ws.onopen = () => {
      console.log(`Connected to job ${jobId} WebSocket`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for job ${jobId}:`, error);
    };

    ws.onclose = () => {
      console.log(`Disconnected from job ${jobId} WebSocket`);
      this.wsConnections.delete(jobId);
    };

    this.wsConnections.set(jobId, ws);
    return ws;
  }

  disconnectWebSocket(id: string): void {
    const ws = this.wsConnections.get(id);
    if (ws) {
      ws.close();
      this.wsConnections.delete(id);
    }
  }

  disconnectAllWebSockets(): void {
    this.wsConnections.forEach((ws) => ws.close());
    this.wsConnections.clear();
  }
}

// Export singleton instance
export const graphQueueService = new GraphQueueService(); 