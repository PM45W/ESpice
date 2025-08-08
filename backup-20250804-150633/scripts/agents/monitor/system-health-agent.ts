import { BaseAgent, AgentContext, AgentResult } from '../base-agent';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  network: {
    connections: number;
    bytesIn: number;
    bytesOut: number;
  };
  processes: {
    total: number;
    nodeProcesses: number;
    rustProcesses: number;
    pythonProcesses: number;
  };
}

export class SystemHealthAgent extends BaseAgent {
  private metrics: SystemMetrics;
  private previousMetrics: SystemMetrics | null = null;

  constructor(context: AgentContext) {
    super(context);
    this.context.config = {
      name: 'System Health Monitor',
      description: 'Monitors system health and performance metrics',
      version: '1.0.0',
      enabled: true,
      timeout: 60000, // 1 minute
      retries: 1,
      logLevel: 'info'
    };
    this.metrics = this.initializeMetrics();
  }

  validate(): boolean {
    return this.context.projectPath && fs.existsSync(this.context.projectPath);
  }

  async execute(): Promise<AgentResult> {
    this.context.logger.info('Monitoring system health...');

    try {
      // Collect system metrics
      await this.collectSystemMetrics();

      // Check application health
      await this.checkApplicationHealth();

      // Check disk space
      await this.checkDiskSpace();

      // Check memory usage
      await this.checkMemoryUsage();

      // Check CPU usage
      await this.checkCPUUsage();

      // Check network connectivity
      await this.checkNetworkConnectivity();

      // Check running processes
      await this.checkRunningProcesses();

      // Analyze trends
      await this.analyzeTrends();

      // Generate alerts
      await this.generateAlerts();

      this.result.success = true;
      this.context.logger.info('System health monitoring completed');

    } catch (error) {
      this.addError(`System health monitoring failed: ${error}`);
      this.context.logger.error('System health monitoring failed', error);
    }

    return this.result;
  }

  private initializeMetrics(): SystemMetrics {
    return {
      cpu: { usage: 0, cores: os.cpus().length, loadAverage: os.loadavg() },
      memory: { total: 0, used: 0, free: 0, percentage: 0 },
      disk: { total: 0, used: 0, free: 0, percentage: 0 },
      network: { connections: 0, bytesIn: 0, bytesOut: 0 },
      processes: { total: 0, nodeProcesses: 0, rustProcesses: 0, pythonProcesses: 0 }
    };
  }

  private async collectSystemMetrics(): Promise<void> {
    this.context.logger.debug('Collecting system metrics...');

    // CPU metrics
    const cpus = os.cpus();
    this.metrics.cpu.cores = cpus.length;
    this.metrics.cpu.loadAverage = os.loadavg();

    // Memory metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    this.metrics.memory = {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      percentage: (usedMem / totalMem) * 100
    };

    // Add metrics to result
    this.addMetric('cpu_cores', this.metrics.cpu.cores);
    this.addMetric('cpu_load_1m', this.metrics.cpu.loadAverage[0]);
    this.addMetric('cpu_load_5m', this.metrics.cpu.loadAverage[1]);
    this.addMetric('cpu_load_15m', this.metrics.cpu.loadAverage[2]);
    this.addMetric('memory_total_gb', Math.round(this.metrics.memory.total / (1024 * 1024 * 1024)));
    this.addMetric('memory_used_gb', Math.round(this.metrics.memory.used / (1024 * 1024 * 1024)));
    this.addMetric('memory_usage_percent', Math.round(this.metrics.memory.percentage));
  }

  private async checkApplicationHealth(): Promise<void> {
    this.context.logger.debug('Checking application health...');

    const healthEndpoints = [
      { name: 'Frontend', url: 'http://localhost:3000/health' },
      { name: 'Backend', url: 'http://localhost:3001/health' },
      { name: 'Website', url: 'http://localhost:3000' }
    ];

    for (const endpoint of healthEndpoints) {
      try {
        const response = await fetch(endpoint.url, { 
          method: 'GET',
          timeout: 5000 
        });
        
        if (response.ok) {
          this.context.logger.debug(`${endpoint.name} health check passed`);
          this.addMetric(`${endpoint.name.toLowerCase()}_health`, 1);
        } else {
          this.addWarning(`${endpoint.name} health check failed: ${response.status}`);
          this.addMetric(`${endpoint.name.toLowerCase()}_health`, 0);
        }
      } catch (error) {
        this.addWarning(`${endpoint.name} health check failed: ${error}`);
        this.addMetric(`${endpoint.name.toLowerCase()}_health`, 0);
      }
    }
  }

  private async checkDiskSpace(): Promise<void> {
    this.context.logger.debug('Checking disk space...');

    try {
      const { stdout, stderr, code } = await this.executeCommand('df', ['-h', this.context.projectPath]);
      
      if (code === 0) {
        const lines = stdout.split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          if (parts.length >= 5) {
            const usedPercent = parseInt(parts[4].replace('%', ''));
            this.metrics.disk.percentage = usedPercent;
            
            this.addMetric('disk_usage_percent', usedPercent);
            
            if (usedPercent > 90) {
              this.addError('Disk usage is critically high (>90%)');
              this.addRecommendation('Clean up temporary files and logs');
            } else if (usedPercent > 80) {
              this.addWarning('Disk usage is high (>80%)');
              this.addRecommendation('Consider cleaning up disk space');
            }
          }
        }
      }
    } catch (error) {
      this.addWarning(`Disk space check failed: ${error}`);
    }
  }

  private async checkMemoryUsage(): Promise<void> {
    this.context.logger.debug('Checking memory usage...');

    const memoryUsage = this.metrics.memory.percentage;
    
    if (memoryUsage > 90) {
      this.addError('Memory usage is critically high (>90%)');
      this.addRecommendation('Close unnecessary applications or restart the system');
    } else if (memoryUsage > 80) {
      this.addWarning('Memory usage is high (>80%)');
      this.addRecommendation('Monitor memory usage and consider optimization');
    } else if (memoryUsage < 20) {
      this.addRecommendation('Memory usage is low. Consider increasing application memory limits');
    }
  }

  private async checkCPUUsage(): Promise<void> {
    this.context.logger.debug('Checking CPU usage...');

    const loadAverage = this.metrics.cpu.loadAverage[0]; // 1-minute load average
    const cores = this.metrics.cpu.cores;
    
    // Load average should be less than number of cores
    if (loadAverage > cores * 2) {
      this.addError('CPU load is critically high');
      this.addRecommendation('Check for runaway processes or optimize CPU-intensive operations');
    } else if (loadAverage > cores) {
      this.addWarning('CPU load is high');
      this.addRecommendation('Monitor CPU usage and consider optimization');
    }
  }

  private async checkNetworkConnectivity(): Promise<void> {
    this.context.logger.debug('Checking network connectivity...');

    const testUrls = [
      'https://www.google.com',
      'https://api.github.com',
      'https://registry.npmjs.org'
    ];

    for (const url of testUrls) {
      try {
        const response = await fetch(url, { 
          method: 'HEAD',
          timeout: 5000 
        });
        
        if (response.ok) {
          this.context.logger.debug(`Network connectivity to ${url} is good`);
        } else {
          this.addWarning(`Network connectivity to ${url} returned ${response.status}`);
        }
      } catch (error) {
        this.addWarning(`Network connectivity to ${url} failed: ${error}`);
      }
    }
  }

  private async checkRunningProcesses(): Promise<void> {
    this.context.logger.debug('Checking running processes...');

    try {
      // Check Node.js processes
      const nodeResult = await this.executeCommand('tasklist', ['/FI', 'IMAGENAME eq node.exe', '/FO', 'CSV']);
      if (nodeResult.code === 0) {
        const nodeProcesses = nodeResult.stdout.split('\n').length - 2; // Subtract header and empty line
        this.metrics.processes.nodeProcesses = Math.max(0, nodeProcesses);
        this.addMetric('node_processes', this.metrics.processes.nodeProcesses);
      }

      // Check Rust processes
      const rustResult = await this.executeCommand('tasklist', ['/FI', 'IMAGENAME eq rustc.exe', '/FO', 'CSV']);
      if (rustResult.code === 0) {
        const rustProcesses = rustResult.stdout.split('\n').length - 2;
        this.metrics.processes.rustProcesses = Math.max(0, rustProcesses);
        this.addMetric('rust_processes', this.metrics.processes.rustProcesses);
      }

      // Check Python processes
      const pythonResult = await this.executeCommand('tasklist', ['/FI', 'IMAGENAME eq python.exe', '/FO', 'CSV']);
      if (pythonResult.code === 0) {
        const pythonProcesses = pythonResult.stdout.split('\n').length - 2;
        this.metrics.processes.pythonProcesses = Math.max(0, pythonProcesses);
        this.addMetric('python_processes', this.metrics.processes.pythonProcesses);
      }

    } catch (error) {
      this.addWarning(`Process check failed: ${error}`);
    }
  }

  private async analyzeTrends(): Promise<void> {
    if (!this.previousMetrics) {
      this.previousMetrics = { ...this.metrics };
      return;
    }

    this.context.logger.debug('Analyzing trends...');

    // Memory trend
    const memoryDiff = this.metrics.memory.percentage - this.previousMetrics.memory.percentage;
    if (Math.abs(memoryDiff) > 10) {
      if (memoryDiff > 0) {
        this.addWarning('Memory usage is increasing rapidly');
      } else {
        this.context.logger.debug('Memory usage is decreasing');
      }
    }

    // CPU trend
    const cpuDiff = this.metrics.cpu.loadAverage[0] - this.previousMetrics.cpu.loadAverage[0];
    if (Math.abs(cpuDiff) > 1) {
      if (cpuDiff > 0) {
        this.addWarning('CPU load is increasing');
      } else {
        this.context.logger.debug('CPU load is decreasing');
      }
    }

    this.previousMetrics = { ...this.metrics };
  }

  private async generateAlerts(): Promise<void> {
    this.context.logger.debug('Generating alerts...');

    // Check for critical conditions
    if (this.metrics.memory.percentage > 95) {
      this.addError('CRITICAL: Memory usage is extremely high');
    }

    if (this.metrics.cpu.loadAverage[0] > this.metrics.cpu.cores * 3) {
      this.addError('CRITICAL: CPU load is extremely high');
    }

    // Check for warning conditions
    if (this.metrics.memory.percentage > 85) {
      this.addWarning('WARNING: Memory usage is high');
    }

    if (this.metrics.cpu.loadAverage[0] > this.metrics.cpu.cores * 1.5) {
      this.addWarning('WARNING: CPU load is high');
    }

    // Save metrics to file for historical analysis
    await this.saveMetrics();
  }

  private async saveMetrics(): Promise<void> {
    try {
      const metricsFile = path.join(this.context.projectPath, 'logs', 'system-metrics.json');
      const timestamp = new Date().toISOString();
      
      const metricsData = {
        timestamp,
        metrics: this.metrics,
        alerts: {
          errors: this.result.errors,
          warnings: this.result.warnings
        }
      };

      // Read existing metrics
      let existingMetrics = [];
      if (await this.fileExists(metricsFile)) {
        const existingData = await this.readFile(metricsFile);
        existingMetrics = JSON.parse(existingData);
      }

      // Add new metrics (keep last 1000 entries)
      existingMetrics.push(metricsData);
      if (existingMetrics.length > 1000) {
        existingMetrics = existingMetrics.slice(-1000);
      }

      // Write back to file
      await this.writeFile(metricsFile, JSON.stringify(existingMetrics, null, 2));
      
    } catch (error) {
      this.context.logger.warn(`Failed to save metrics: ${error}`);
    }
  }
} 