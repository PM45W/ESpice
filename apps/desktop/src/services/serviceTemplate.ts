// Standardized Service Template
// All services should follow this pattern for consistency

export interface ServiceConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  healthCheckEndpoint: string;
}

export interface ServiceHealth {
  healthy: boolean;
  message: string;
  details?: any;
  responseTime?: number;
}

export interface ServiceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime?: Date;
}

export abstract class BaseService {
  protected static instance: BaseService;
  protected config: ServiceConfig;
  protected stats: ServiceStats;
  protected isServiceAvailable: boolean = false;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Get singleton instance (standard pattern)
   */
  static getInstance<T extends BaseService>(this: new (config: ServiceConfig) => T, config: ServiceConfig): T {
    if (!this.instance) {
      this.instance = new this(config);
    }
    return this.instance as T;
  }

  /**
   * Check if the service is available (standard pattern)
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      console.log(`Checking service availability at: ${this.config.baseUrl}`);
      const response = await fetch(`${this.config.baseUrl}${this.config.healthCheckEndpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout)
      });
      
      if (response.ok) {
        console.log('✅ Service is available and healthy');
        this.isServiceAvailable = true;
        return true;
      } else {
        console.log('❌ Service responded with status:', response.status);
        this.isServiceAvailable = false;
        return false;
      }
    } catch (error) {
      console.log('❌ Service not available:', error);
      this.isServiceAvailable = false;
      return false;
    }
  }

  /**
   * Perform health check with detailed information
   */
  async checkHealth(): Promise<ServiceHealth> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${this.config.baseUrl}${this.config.healthCheckEndpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout)
      });
      
      const responseTime = performance.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        return {
          healthy: true,
          message: 'Service is healthy',
          details: data,
          responseTime
        };
      } else {
        return {
          healthy: false,
          message: `Service responded with status: ${response.status}`,
          responseTime
        };
      }
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        healthy: false,
        message: `Service health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime
      };
    }
  }

  /**
   * Make a service request with standard error handling and stats tracking
   */
  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const startTime = performance.now();
    this.stats.totalRequests++;

    try {
      // Check service availability first
      if (!this.isServiceAvailable) {
        const isAvailable = await this.isServiceAvailable();
        if (!isAvailable) {
          throw new Error(`Service is not available. Please start the service first.`);
        }
      }

      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        signal: AbortSignal.timeout(this.config.timeout),
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      const responseTime = performance.now() - startTime;
      this.updateStats(true, responseTime);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Service request failed (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.updateStats(false, responseTime);
      
      console.error('Service request error:', error);
      throw new Error(`Service request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update service statistics
   */
  private updateStats(success: boolean, responseTime: number): void {
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    // Update average response time
    const totalTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime;
    this.stats.averageResponseTime = totalTime / this.stats.totalRequests;
    this.stats.lastRequestTime = new Date();
  }

  /**
   * Get service statistics
   */
  getStatistics(): ServiceStats {
    return { ...this.stats };
  }

  /**
   * Get service configuration
   */
  getConfig(): ServiceConfig {
    return { ...this.config };
  }

  /**
   * Test service connection (standard pattern)
   */
  async testServiceConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const health = await this.checkHealth();
      
      if (health.healthy) {
        return {
          success: true,
          message: 'Service connection test successful',
          details: {
            responseTime: health.responseTime,
            baseUrl: this.config.baseUrl
          }
        };
      } else {
        return {
          success: false,
          message: health.message,
          details: {
            responseTime: health.responseTime,
            baseUrl: this.config.baseUrl
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Service connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          baseUrl: this.config.baseUrl,
          error: error
        }
      };
    }
  }

  /**
   * Reset service statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    };
  }
}

// Example implementation of a service using the template:
/*
export class ExampleService extends BaseService {
  private constructor(config: ServiceConfig) {
    super(config);
  }

  static getInstance(): ExampleService {
    if (!ExampleService.instance) {
      ExampleService.instance = new ExampleService({
        baseUrl: 'http://localhost:8000',
        timeout: 10000,
        retryAttempts: 3,
        healthCheckEndpoint: '/health'
      });
    }
    return ExampleService.instance;
  }

  async exampleMethod(): Promise<any> {
    return this.makeRequest('/api/example');
  }
}

// Export singleton instance
export const exampleService = ExampleService.getInstance();
*/
