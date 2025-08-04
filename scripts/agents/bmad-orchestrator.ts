import { BaseAgent, AgentContext, AgentResult } from './base-agent';
import { EnvironmentSetupAgent } from './build/environment-setup-agent';
import { SystemHealthAgent } from './monitor/system-health-agent';
import { CodeQualityAgent } from './analyze/code-quality-agent';
import { ErrorDebuggerAgent } from './debug/error-debugger-agent';

interface BMADResult {
  build: AgentResult;
  monitor: AgentResult;
  analyze: AgentResult;
  debug: AgentResult;
  overall: {
    success: boolean;
    totalErrors: number;
    totalWarnings: number;
    recommendations: string[];
    metrics: Record<string, number>;
  };
}

export class BMADOrchestrator {
  private context: AgentContext;
  private results: BMADResult;

  constructor(projectPath: string, environment: string = 'development') {
    this.context = {
      projectPath,
      environment,
      options: {},
      logger: this.createLogger(),
      config: {
        name: 'BMAD Orchestrator',
        description: 'Coordinates all BMAD agents',
        version: '1.0.0',
        enabled: true,
        timeout: 900000, // 15 minutes
        retries: 1,
        logLevel: 'info'
      }
    };

    this.results = {
      build: {} as AgentResult,
      monitor: {} as AgentResult,
      analyze: {} as AgentResult,
      debug: {} as AgentResult,
      overall: {
        success: false,
        totalErrors: 0,
        totalWarnings: 0,
        recommendations: [],
        metrics: {}
      }
    };
  }

  private createLogger() {
    return {
      debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args),
      info: (message: string, ...args: any[]) => console.info(`[INFO] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
      error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
    };
  }

  async runFullBMAD(): Promise<BMADResult> {
    this.context.logger.info('Starting full BMAD cycle...');

    try {
      // Phase 1: Build
      this.context.logger.info('=== PHASE 1: BUILD ===');
      this.results.build = await this.runBuildPhase();

      // Phase 2: Monitor
      this.context.logger.info('=== PHASE 2: MONITOR ===');
      this.results.monitor = await this.runMonitorPhase();

      // Phase 3: Analyze
      this.context.logger.info('=== PHASE 3: ANALYZE ===');
      this.results.analyze = await this.runAnalyzePhase();

      // Phase 4: Debug
      this.context.logger.info('=== PHASE 4: DEBUG ===');
      this.results.debug = await this.runDebugPhase();

      // Calculate overall results
      this.calculateOverallResults();

      // Generate report
      await this.generateReport();

      this.context.logger.info('BMAD cycle completed successfully');

    } catch (error) {
      this.context.logger.error('BMAD cycle failed', error);
      throw error;
    }

    return this.results;
  }

  async runBuildPhase(): Promise<AgentResult> {
    this.context.logger.info('Running Build phase...');

    const buildAgent = new EnvironmentSetupAgent(this.context);
    const result = await buildAgent.run();
    await buildAgent.cleanup();

    return result;
  }

  async runMonitorPhase(): Promise<AgentResult> {
    this.context.logger.info('Running Monitor phase...');

    const monitorAgent = new SystemHealthAgent(this.context);
    const result = await monitorAgent.run();
    await monitorAgent.cleanup();

    return result;
  }

  async runAnalyzePhase(): Promise<AgentResult> {
    this.context.logger.info('Running Analyze phase...');

    const analyzeAgent = new CodeQualityAgent(this.context);
    const result = await analyzeAgent.run();
    await analyzeAgent.cleanup();

    return result;
  }

  async runDebugPhase(): Promise<AgentResult> {
    this.context.logger.info('Running Debug phase...');

    const debugAgent = new ErrorDebuggerAgent(this.context);
    const result = await debugAgent.run();
    await debugAgent.cleanup();

    return result;
  }

  private calculateOverallResults(): void {
    const phases = [this.results.build, this.results.monitor, this.results.analyze, this.results.debug];
    
    let totalErrors = 0;
    let totalWarnings = 0;
    const allRecommendations: string[] = [];
    const allMetrics: Record<string, number> = {};

    for (const phase of phases) {
      if (phase.errors) {
        totalErrors += phase.errors.length;
      }
      if (phase.warnings) {
        totalWarnings += phase.warnings.length;
      }
      if (phase.recommendations) {
        allRecommendations.push(...phase.recommendations);
      }
      if (phase.metrics) {
        Object.assign(allMetrics, phase.metrics);
      }
    }

    this.results.overall = {
      success: totalErrors === 0,
      totalErrors,
      totalWarnings,
      recommendations: [...new Set(allRecommendations)], // Remove duplicates
      metrics: allMetrics
    };
  }

  private async generateReport(): Promise<void> {
    this.context.logger.info('Generating BMAD report...');

    const report = {
      timestamp: new Date().toISOString(),
      project: this.context.projectPath,
      environment: this.context.environment,
      summary: this.results.overall,
      phases: {
        build: {
          success: this.results.build.success,
          errors: this.results.build.errors?.length || 0,
          warnings: this.results.build.warnings?.length || 0,
          recommendations: this.results.build.recommendations || []
        },
        monitor: {
          success: this.results.monitor.success,
          errors: this.results.monitor.errors?.length || 0,
          warnings: this.results.monitor.warnings?.length || 0,
          recommendations: this.results.monitor.recommendations || []
        },
        analyze: {
          success: this.results.analyze.success,
          errors: this.results.analyze.errors?.length || 0,
          warnings: this.results.analyze.warnings?.length || 0,
          recommendations: this.results.analyze.recommendations || []
        },
        debug: {
          success: this.results.debug.success,
          errors: this.results.debug.errors?.length || 0,
          warnings: this.results.debug.warnings?.length || 0,
          recommendations: this.results.debug.recommendations || []
        }
      },
      details: this.results
    };

    const reportPath = path.join(this.context.projectPath, 'logs', 'bmad-report.json');
    await this.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable summary
    await this.generateSummaryReport();
  }

  private async generateSummaryReport(): Promise<void> {
    const summaryPath = path.join(this.context.projectPath, 'logs', 'bmad-summary.md');
    
    let summary = `# BMAD Analysis Report\n\n`;
    summary += `**Generated:** ${new Date().toLocaleString()}\n`;
    summary += `**Project:** ${this.context.projectPath}\n`;
    summary += `**Environment:** ${this.context.environment}\n\n`;

    // Overall status
    const status = this.results.overall.success ? '✅ PASSED' : '❌ FAILED';
    summary += `## Overall Status: ${status}\n\n`;

    // Summary metrics
    summary += `## Summary\n`;
    summary += `- **Total Errors:** ${this.results.overall.totalErrors}\n`;
    summary += `- **Total Warnings:** ${this.results.overall.totalWarnings}\n`;
    summary += `- **Recommendations:** ${this.results.overall.recommendations.length}\n\n`;

    // Phase results
    summary += `## Phase Results\n\n`;

    const phases = [
      { name: 'Build', result: this.results.build },
      { name: 'Monitor', result: this.results.monitor },
      { name: 'Analyze', result: this.results.analyze },
      { name: 'Debug', result: this.results.debug }
    ];

    for (const phase of phases) {
      const phaseStatus = phase.result.success ? '✅' : '❌';
      summary += `### ${phase.name} ${phaseStatus}\n`;
      summary += `- **Errors:** ${phase.result.errors?.length || 0}\n`;
      summary += `- **Warnings:** ${phase.result.warnings?.length || 0}\n`;
      
      if (phase.result.recommendations?.length) {
        summary += `- **Recommendations:**\n`;
        for (const rec of phase.result.recommendations) {
          summary += `  - ${rec}\n`;
        }
      }
      summary += `\n`;
    }

    // Key metrics
    if (Object.keys(this.results.overall.metrics).length > 0) {
      summary += `## Key Metrics\n\n`;
      for (const [key, value] of Object.entries(this.results.overall.metrics)) {
        summary += `- **${key}:** ${value}\n`;
      }
      summary += `\n`;
    }

    // Recommendations
    if (this.results.overall.recommendations.length > 0) {
      summary += `## Recommendations\n\n`;
      for (const rec of this.results.overall.recommendations) {
        summary += `- ${rec}\n`;
      }
      summary += `\n`;
    }

    // Next steps
    summary += `## Next Steps\n\n`;
    if (this.results.overall.totalErrors > 0) {
      summary += `1. **Fix Critical Issues:** Address all errors before proceeding\n`;
    }
    if (this.results.overall.totalWarnings > 0) {
      summary += `2. **Review Warnings:** Investigate and resolve warnings\n`;
    }
    summary += `3. **Implement Recommendations:** Follow the recommendations above\n`;
    summary += `4. **Re-run BMAD:** After making changes, re-run the analysis\n`;

    await this.writeFile(summaryPath, summary);
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(filePath, content, 'utf-8');
  }

  // Individual phase runners
  async runBuildOnly(): Promise<AgentResult> {
    return this.runBuildPhase();
  }

  async runMonitorOnly(): Promise<AgentResult> {
    return this.runMonitorPhase();
  }

  async runAnalyzeOnly(): Promise<AgentResult> {
    return this.runAnalyzePhase();
  }

  async runDebugOnly(): Promise<AgentResult> {
    return this.runDebugPhase();
  }

  // Continuous monitoring
  async startContinuousMonitoring(interval: number = 60000): Promise<void> {
    this.context.logger.info(`Starting continuous monitoring (interval: ${interval}ms)...`);

    const monitor = async () => {
      try {
        await this.runMonitorPhase();
        this.context.logger.info('Continuous monitoring cycle completed');
      } catch (error) {
        this.context.logger.error('Continuous monitoring cycle failed', error);
      }
    };

    // Run initial monitoring
    await monitor();

    // Set up interval
    setInterval(monitor, interval);
  }
}

// Export for use in scripts
export { BMADOrchestrator as default }; 