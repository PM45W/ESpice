import { BaseAgent, AgentContext, AgentResult } from '../base-agent';
import * as fs from 'fs';
import * as path from 'path';

interface ErrorPattern {
  pattern: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  solution: string;
  examples: string[];
}

interface ErrorAnalysis {
  error: string;
  category: string;
  severity: string;
  solution: string;
  context: string;
  timestamp: Date;
  frequency: number;
}

export class ErrorDebuggerAgent extends BaseAgent {
  private errorPatterns: ErrorPattern[];
  private errorAnalyses: ErrorAnalysis[];
  private logFiles: string[];

  constructor(context: AgentContext) {
    super(context);
    this.context.config = {
      name: 'Error Debugger',
      description: 'Automatically debugs common errors and suggests fixes',
      version: '1.0.0',
      enabled: true,
      timeout: 300000, // 5 minutes
      retries: 1,
      logLevel: 'info'
    };
    this.errorPatterns = this.initializeErrorPatterns();
    this.errorAnalyses = [];
    this.logFiles = [];
  }

  validate(): boolean {
    return this.context.projectPath && fs.existsSync(this.context.projectPath);
  }

  async execute(): Promise<AgentResult> {
    this.context.logger.info('Starting error debugging...');

    try {
      // Find log files
      await this.findLogFiles();

      // Analyze error logs
      await this.analyzeErrorLogs();

      // Check for common build errors
      await this.checkBuildErrors();

      // Check for runtime errors
      await this.checkRuntimeErrors();

      // Check for dependency issues
      await this.checkDependencyIssues();

      // Check for configuration errors
      await this.checkConfigurationErrors();

      // Generate error report
      await this.generateErrorReport();

      // Suggest fixes
      await this.suggestFixes();

      this.result.success = true;
      this.context.logger.info('Error debugging completed');

    } catch (error) {
      this.addError(`Error debugging failed: ${error}`);
      this.context.logger.error('Error debugging failed', error);
    }

    return this.result;
  }

  private initializeErrorPatterns(): ErrorPattern[] {
    return [
      // TypeScript/JavaScript errors
      {
        pattern: 'TS\\d+',
        category: 'TypeScript',
        severity: 'medium',
        solution: 'Fix TypeScript type errors by adding proper type annotations',
        examples: ['TS2322: Type \'string\' is not assignable to type \'number\'']
      },
      {
        pattern: 'Cannot find module',
        category: 'Module Resolution',
        severity: 'high',
        solution: 'Check import paths and ensure modules are installed',
        examples: ['Cannot find module \'./components/Button\'']
      },
      {
        pattern: 'Unexpected token',
        category: 'Syntax',
        severity: 'high',
        solution: 'Fix syntax errors in the code',
        examples: ['Unexpected token \'{\' in expression']
      },

      // Build errors
      {
        pattern: 'Build failed',
        category: 'Build',
        severity: 'critical',
        solution: 'Check build configuration and dependencies',
        examples: ['Build failed with exit code 1']
      },
      {
        pattern: 'Module not found',
        category: 'Dependencies',
        severity: 'high',
        solution: 'Install missing dependencies with npm install',
        examples: ['Module not found: Can\'t resolve \'react\'']
      },

      // Runtime errors
      {
        pattern: 'TypeError',
        category: 'Runtime',
        severity: 'high',
        solution: 'Check variable types and null/undefined values',
        examples: ['TypeError: Cannot read property \'map\' of undefined']
      },
      {
        pattern: 'ReferenceError',
        category: 'Runtime',
        severity: 'high',
        solution: 'Check variable declarations and scope',
        examples: ['ReferenceError: x is not defined']
      },

      // Network errors
      {
        pattern: 'ECONNREFUSED',
        category: 'Network',
        severity: 'medium',
        solution: 'Check if the server is running and accessible',
        examples: ['ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:3001']
      },
      {
        pattern: 'ENOTFOUND',
        category: 'Network',
        severity: 'medium',
        solution: 'Check network connectivity and DNS resolution',
        examples: ['ENOTFOUND: getaddrinfo ENOTFOUND api.example.com']
      },

      // Memory errors
      {
        pattern: 'JavaScript heap out of memory',
        category: 'Memory',
        severity: 'critical',
        solution: 'Increase Node.js memory limit or optimize memory usage',
        examples: ['FATAL ERROR: Ineffective mark-compacts near heap limit']
      },

      // Permission errors
      {
        pattern: 'EACCES',
        category: 'Permissions',
        severity: 'medium',
        solution: 'Check file permissions and user access rights',
        examples: ['EACCES: permission denied, open \'/path/to/file\'']
      }
    ];
  }

  private async findLogFiles(): Promise<void> {
    this.context.logger.info('Finding log files...');

    const logDirectories = [
      'logs',
      'dist',
      'build',
      'coverage',
      'node_modules/.cache'
    ];

    for (const dir of logDirectories) {
      const logDir = path.join(this.context.projectPath, dir);
      if (await this.directoryExists(logDir)) {
        try {
          const files = await fs.promises.readdir(logDir);
          const logFiles = files.filter(file => 
            file.endsWith('.log') || 
            file.endsWith('.txt') || 
            file.includes('error') ||
            file.includes('debug')
          );
          
          this.logFiles.push(...logFiles.map(file => path.join(logDir, file)));
        } catch (error) {
          this.context.logger.debug(`Could not read directory ${logDir}: ${error}`);
        }
      }
    }

    this.addMetric('log_files_found', this.logFiles.length);
  }

  private async analyzeErrorLogs(): Promise<void> {
    this.context.logger.info('Analyzing error logs...');

    for (const logFile of this.logFiles) {
      try {
        const content = await this.readFile(logFile);
        const lines = content.split('\n');
        
        for (const line of lines) {
          const errorAnalysis = this.analyzeErrorLine(line);
          if (errorAnalysis) {
            this.errorAnalyses.push(errorAnalysis);
          }
        }
      } catch (error) {
        this.addWarning(`Failed to analyze log file ${logFile}: ${error}`);
      }
    }

    this.addMetric('errors_found', this.errorAnalyses.length);
  }

  private analyzeErrorLine(line: string): ErrorAnalysis | null {
    for (const pattern of this.errorPatterns) {
      if (line.includes(pattern.pattern) || new RegExp(pattern.pattern).test(line)) {
        return {
          error: line.trim(),
          category: pattern.category,
          severity: pattern.severity,
          solution: pattern.solution,
          context: this.extractContext(line),
          timestamp: new Date(),
          frequency: 1
        };
      }
    }
    return null;
  }

  private extractContext(line: string): string {
    // Extract relevant context from error line
    const parts = line.split(':');
    if (parts.length >= 3) {
      return `${parts[0]}:${parts[1]}`; // File and line number
    }
    return line.substring(0, 100); // First 100 characters
  }

  private async checkBuildErrors(): Promise<void> {
    this.context.logger.info('Checking for build errors...');

    try {
      const { stdout, stderr, code } = await this.executeCommand('npm', ['run', 'build']);
      
      if (code !== 0) {
        const buildErrors = stderr.split('\n').filter(line => 
          line.includes('error') || line.includes('Error') || line.includes('ERROR')
        );

        for (const error of buildErrors) {
          const errorAnalysis = this.analyzeErrorLine(error);
          if (errorAnalysis) {
            errorAnalysis.category = 'Build';
            this.errorAnalyses.push(errorAnalysis);
          }
        }

        this.addError(`Build failed with ${buildErrors.length} errors`);
        this.addMetric('build_errors', buildErrors.length);
      } else {
        this.context.logger.info('Build completed successfully');
        this.addMetric('build_errors', 0);
      }
    } catch (error) {
      this.addWarning(`Build check failed: ${error}`);
    }
  }

  private async checkRuntimeErrors(): Promise<void> {
    this.context.logger.info('Checking for runtime errors...');

    try {
      // Check if development server is running
      const response = await fetch('http://localhost:3000', { 
        method: 'GET',
        timeout: 5000 
      });
      
      if (!response.ok) {
        this.addWarning(`Development server returned status ${response.status}`);
        this.addRecommendation('Check if the development server is running properly');
      }
    } catch (error) {
      this.addWarning('Development server is not accessible');
      this.addRecommendation('Start the development server with npm run dev');
    }

    // Check for common runtime error patterns in console output
    const runtimeErrorPatterns = [
      'Uncaught TypeError',
      'Uncaught ReferenceError',
      'Uncaught SyntaxError',
      'React Hook Error',
      'Maximum update depth exceeded'
    ];

    for (const pattern of runtimeErrorPatterns) {
      const matchingErrors = this.errorAnalyses.filter(error => 
        error.error.includes(pattern)
      );
      
      if (matchingErrors.length > 0) {
        this.addWarning(`Found ${matchingErrors.length} runtime errors matching "${pattern}"`);
      }
    }
  }

  private async checkDependencyIssues(): Promise<void> {
    this.context.logger.info('Checking for dependency issues...');

    try {
      const { stdout, stderr, code } = await this.executeCommand('npm', ['ls']);
      
      if (code !== 0) {
        const dependencyErrors = stderr.split('\n').filter(line => 
          line.includes('missing') || line.includes('unmet') || line.includes('peer')
        );

        for (const error of dependencyErrors) {
          this.addWarning(`Dependency issue: ${error.trim()}`);
        }

        this.addMetric('dependency_issues', dependencyErrors.length);
        this.addRecommendation('Run npm install to fix dependency issues');
      } else {
        this.context.logger.info('Dependencies are properly installed');
        this.addMetric('dependency_issues', 0);
      }
    } catch (error) {
      this.addWarning(`Dependency check failed: ${error}`);
    }
  }

  private async checkConfigurationErrors(): Promise<void> {
    this.context.logger.info('Checking for configuration errors...');

    const configFiles = [
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'tailwind.config.js',
      'postcss.config.js'
    ];

    for (const configFile of configFiles) {
      const filePath = this.getProjectFile(configFile);
      if (await this.fileExists(filePath)) {
        try {
          const content = await this.readFile(filePath);
          
          // Check for JSON syntax errors
          if (configFile.endsWith('.json')) {
            try {
              JSON.parse(content);
            } catch (error) {
              this.addError(`Invalid JSON in ${configFile}: ${error}`);
            }
          }

          // Check for common configuration issues
          if (configFile === 'package.json') {
            await this.checkPackageJsonIssues(content);
          } else if (configFile === 'tsconfig.json') {
            await this.checkTsConfigIssues(content);
          }
        } catch (error) {
          this.addWarning(`Failed to check ${configFile}: ${error}`);
        }
      } else {
        this.addWarning(`Configuration file not found: ${configFile}`);
      }
    }
  }

  private async checkPackageJsonIssues(content: string): Promise<void> {
    try {
      const packageJson = JSON.parse(content);
      
      // Check for missing required fields
      if (!packageJson.name) {
        this.addWarning('package.json missing "name" field');
      }
      if (!packageJson.version) {
        this.addWarning('package.json missing "version" field');
      }
      if (!packageJson.scripts) {
        this.addWarning('package.json missing "scripts" field');
      }

      // Check for common script issues
      const scripts = packageJson.scripts || {};
      if (!scripts.build) {
        this.addWarning('package.json missing "build" script');
      }
      if (!scripts.dev) {
        this.addWarning('package.json missing "dev" script');
      }
    } catch (error) {
      this.addError(`Invalid package.json: ${error}`);
    }
  }

  private async checkTsConfigIssues(content: string): Promise<void> {
    try {
      const tsConfig = JSON.parse(content);
      
      // Check for common TypeScript configuration issues
      if (!tsConfig.compilerOptions) {
        this.addWarning('tsconfig.json missing "compilerOptions"');
      } else {
        const options = tsConfig.compilerOptions;
        
        if (options.strict === false) {
          this.addRecommendation('Consider enabling TypeScript strict mode for better type safety');
        }
        
        if (!options.target) {
          this.addWarning('tsconfig.json missing "target" in compilerOptions');
        }
      }
    } catch (error) {
      this.addError(`Invalid tsconfig.json: ${error}`);
    }
  }

  private async generateErrorReport(): Promise<void> {
    this.context.logger.info('Generating error report...');

    // Group errors by category
    const errorsByCategory = this.errorAnalyses.reduce((acc, error) => {
      if (!acc[error.category]) {
        acc[error.category] = [];
      }
      acc[error.category].push(error);
      return acc;
    }, {} as Record<string, ErrorAnalysis[]>);

    // Calculate metrics
    const totalErrors = this.errorAnalyses.length;
    const criticalErrors = this.errorAnalyses.filter(e => e.severity === 'critical').length;
    const highErrors = this.errorAnalyses.filter(e => e.severity === 'high').length;

    this.addMetric('total_errors', totalErrors);
    this.addMetric('critical_errors', criticalErrors);
    this.addMetric('high_errors', highErrors);

    // Add category-specific metrics
    for (const [category, errors] of Object.entries(errorsByCategory)) {
      this.addMetric(`${category.toLowerCase()}_errors`, errors.length);
    }

    // Save error report
    const reportPath = path.join(this.context.projectPath, 'logs', 'error-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors,
        criticalErrors,
        highErrors,
        categories: Object.keys(errorsByCategory)
      },
      errors: this.errorAnalyses,
      recommendations: this.result.recommendations
    };

    await this.writeFile(reportPath, JSON.stringify(report, null, 2));
  }

  private async suggestFixes(): Promise<void> {
    this.context.logger.info('Generating fix suggestions...');

    // Group errors by severity
    const criticalErrors = this.errorAnalyses.filter(e => e.severity === 'critical');
    const highErrors = this.errorAnalyses.filter(e => e.severity === 'high');
    const mediumErrors = this.errorAnalyses.filter(e => e.severity === 'medium');

    // Prioritize fixes
    if (criticalErrors.length > 0) {
      this.addRecommendation(`Fix ${criticalErrors.length} critical errors immediately`);
      this.addRecommendation('Critical errors may prevent the application from running');
    }

    if (highErrors.length > 0) {
      this.addRecommendation(`Address ${highErrors.length} high-severity errors`);
      this.addRecommendation('High-severity errors may cause runtime failures');
    }

    if (mediumErrors.length > 0) {
      this.addRecommendation(`Review ${mediumErrors.length} medium-severity errors`);
      this.addRecommendation('Medium-severity errors may affect functionality');
    }

    // Category-specific recommendations
    const buildErrors = this.errorAnalyses.filter(e => e.category === 'Build');
    if (buildErrors.length > 0) {
      this.addRecommendation('Fix build errors before deployment');
      this.addRecommendation('Run npm run build to verify fixes');
    }

    const dependencyErrors = this.errorAnalyses.filter(e => e.category === 'Dependencies');
    if (dependencyErrors.length > 0) {
      this.addRecommendation('Run npm install to fix dependency issues');
      this.addRecommendation('Check package.json for version conflicts');
    }

    const runtimeErrors = this.errorAnalyses.filter(e => e.category === 'Runtime');
    if (runtimeErrors.length > 0) {
      this.addRecommendation('Test the application thoroughly after fixing runtime errors');
      this.addRecommendation('Add error boundaries to handle runtime errors gracefully');
    }

    // General recommendations
    this.addRecommendation('Set up automated error monitoring in production');
    this.addRecommendation('Implement comprehensive error logging');
    this.addRecommendation('Create automated tests to prevent regression');
  }
} 