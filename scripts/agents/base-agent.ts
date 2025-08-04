import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface AgentContext {
  projectPath: string;
  environment: string;
  options: Record<string, any>;
  logger: Logger;
  config: AgentConfig;
}

export interface AgentResult {
  success: boolean;
  data: any;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  metrics: Record<string, number>;
  timestamp: Date;
  duration: number;
}

export interface AgentConfig {
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  timeout: number;
  retries: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export abstract class BaseAgent extends EventEmitter {
  protected context: AgentContext;
  protected startTime: number;
  protected result: AgentResult;

  constructor(context: AgentContext) {
    super();
    this.context = context;
    this.startTime = Date.now();
    this.result = {
      success: false,
      data: {},
      errors: [],
      warnings: [],
      recommendations: [],
      metrics: {},
      timestamp: new Date(),
      duration: 0
    };
  }

  abstract execute(): Promise<AgentResult>;
  abstract validate(): boolean;

  async run(): Promise<AgentResult> {
    try {
      this.context.logger.info(`Starting agent: ${this.context.config.name}`);
      this.emit('start', this.context.config.name);

      // Validate context
      if (!this.validate()) {
        throw new Error('Agent validation failed');
      }

      // Execute agent logic
      this.result = await this.execute();

      // Calculate duration
      this.result.duration = Date.now() - this.startTime;
      this.result.timestamp = new Date();

      // Log results
      this.context.logger.info(`Agent completed: ${this.context.config.name}`, {
        success: this.result.success,
        duration: this.result.duration,
        errors: this.result.errors.length,
        warnings: this.result.warnings.length
      });

      this.emit('complete', this.result);
      return this.result;

    } catch (error) {
      this.result.success = false;
      this.result.errors.push(error instanceof Error ? error.message : String(error));
      this.result.duration = Date.now() - this.startTime;
      this.result.timestamp = new Date();

      this.context.logger.error(`Agent failed: ${this.context.config.name}`, error);
      this.emit('error', error);
      return this.result;
    }
  }

  protected addMetric(name: string, value: number): void {
    this.result.metrics[name] = value;
  }

  protected addError(message: string): void {
    this.result.errors.push(message);
  }

  protected addWarning(message: string): void {
    this.result.warnings.push(message);
  }

  protected addRecommendation(message: string): void {
    this.result.recommendations.push(message);
  }

  protected async readFile(filePath: string): Promise<string> {
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  protected async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.promises.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error}`);
    }
  }

  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  protected async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  protected getProjectFile(filePath: string): string {
    return path.join(this.context.projectPath, filePath);
  }

  protected async executeCommand(command: string, args: string[] = [], options: any = {}): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const child = spawn(command, args, {
        cwd: this.context.projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number) => {
        resolve({ stdout, stderr, code });
      });

      child.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  protected async timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
      })
    ]);
  }

  async cleanup(): Promise<void> {
    this.context.logger.debug(`Cleaning up agent: ${this.context.config.name}`);
    this.emit('cleanup');
  }
} 