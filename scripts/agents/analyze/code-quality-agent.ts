import { BaseAgent, AgentContext, AgentResult } from '../base-agent';
import * as fs from 'fs';
import * as path from 'path';

interface CodeQualityMetrics {
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  complexity: number;
  maintainability: number;
  testCoverage: number;
  securityIssues: number;
  performanceIssues: number;
  codeDuplication: number;
}

interface FileAnalysis {
  path: string;
  size: number;
  lines: number;
  complexity: number;
  issues: string[];
  suggestions: string[];
}

export class CodeQualityAgent extends BaseAgent {
  private metrics: CodeQualityMetrics;
  private fileAnalyses: FileAnalysis[];

  constructor(context: AgentContext) {
    super(context);
    this.context.config = {
      name: 'Code Quality Analyzer',
      description: 'Analyzes code quality and suggests improvements',
      version: '1.0.0',
      enabled: true,
      timeout: 300000, // 5 minutes
      retries: 1,
      logLevel: 'info'
    };
    this.metrics = this.initializeMetrics();
    this.fileAnalyses = [];
  }

  validate(): boolean {
    return this.context.projectPath && fs.existsSync(this.context.projectPath);
  }

  async execute(): Promise<AgentResult> {
    this.context.logger.info('Analyzing code quality...');

    try {
      // Analyze TypeScript/JavaScript files
      await this.analyzeTypeScriptFiles();

      // Analyze Rust files
      await this.analyzeRustFiles();

      // Analyze Python files
      await this.analyzePythonFiles();

      // Run ESLint analysis
      await this.runESLintAnalysis();

      // Run TypeScript compiler checks
      await this.runTypeScriptChecks();

      // Analyze test coverage
      await this.analyzeTestCoverage();

      // Check for security vulnerabilities
      await this.checkSecurityVulnerabilities();

      // Analyze performance issues
      await this.analyzePerformanceIssues();

      // Calculate overall metrics
      await this.calculateOverallMetrics();

      // Generate recommendations
      await this.generateRecommendations();

      this.result.success = true;
      this.context.logger.info('Code quality analysis completed');

    } catch (error) {
      this.addError(`Code quality analysis failed: ${error}`);
      this.context.logger.error('Code quality analysis failed', error);
    }

    return this.result;
  }

  private initializeMetrics(): CodeQualityMetrics {
    return {
      totalLines: 0,
      codeLines: 0,
      commentLines: 0,
      blankLines: 0,
      complexity: 0,
      maintainability: 0,
      testCoverage: 0,
      securityIssues: 0,
      performanceIssues: 0,
      codeDuplication: 0
    };
  }

  private async analyzeTypeScriptFiles(): Promise<void> {
    this.context.logger.info('Analyzing TypeScript/JavaScript files...');

    const tsFiles = await this.findFiles(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']);
    
    for (const file of tsFiles) {
      try {
        const analysis = await this.analyzeFile(file);
        this.fileAnalyses.push(analysis);
        
        // Update metrics
        this.metrics.totalLines += analysis.lines;
        this.metrics.complexity += analysis.complexity;
        
        // Check for specific issues
        await this.checkTypeScriptIssues(file, analysis);
        
      } catch (error) {
        this.addWarning(`Failed to analyze ${file}: ${error}`);
      }
    }

    this.addMetric('typescript_files', tsFiles.length);
    this.addMetric('total_lines', this.metrics.totalLines);
    this.addMetric('average_complexity', this.metrics.complexity / Math.max(tsFiles.length, 1));
  }

  private async analyzeRustFiles(): Promise<void> {
    this.context.logger.info('Analyzing Rust files...');

    const rustFiles = await this.findFiles(['**/*.rs']);
    
    for (const file of rustFiles) {
      try {
        const analysis = await this.analyzeFile(file);
        this.fileAnalyses.push(analysis);
        
        // Update metrics
        this.metrics.totalLines += analysis.lines;
        this.metrics.complexity += analysis.complexity;
        
        // Check for Rust-specific issues
        await this.checkRustIssues(file, analysis);
        
      } catch (error) {
        this.addWarning(`Failed to analyze ${file}: ${error}`);
      }
    }

    this.addMetric('rust_files', rustFiles.length);
  }

  private async analyzePythonFiles(): Promise<void> {
    this.context.logger.info('Analyzing Python files...');

    const pythonFiles = await this.findFiles(['**/*.py']);
    
    for (const file of pythonFiles) {
      try {
        const analysis = await this.analyzeFile(file);
        this.fileAnalyses.push(analysis);
        
        // Update metrics
        this.metrics.totalLines += analysis.lines;
        this.metrics.complexity += analysis.complexity;
        
        // Check for Python-specific issues
        await this.checkPythonIssues(file, analysis);
        
      } catch (error) {
        this.addWarning(`Failed to analyze ${file}: ${error}`);
      }
    }

    this.addMetric('python_files', pythonFiles.length);
  }

  private async analyzeFile(filePath: string): Promise<FileAnalysis> {
    const content = await this.readFile(filePath);
    const lines = content.split('\n');
    
    let codeLines = 0;
    let commentLines = 0;
    let blankLines = 0;
    let complexity = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '') {
        blankLines++;
      } else if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('#')) {
        commentLines++;
      } else {
        codeLines++;
        
        // Calculate complexity based on control structures
        if (trimmedLine.includes('if ') || trimmedLine.includes('else ') || 
            trimmedLine.includes('for ') || trimmedLine.includes('while ') ||
            trimmedLine.includes('switch ') || trimmedLine.includes('case ')) {
          complexity++;
        }
      }
    }

    return {
      path: filePath,
      size: content.length,
      lines: lines.length,
      complexity,
      issues: [],
      suggestions: []
    };
  }

  private async findFiles(patterns: string[]): Promise<string[]> {
    const files: string[] = [];
    
    for (const pattern of patterns) {
      try {
        const { stdout } = await this.executeCommand('find', ['.', '-name', pattern.replace('**/*', '*'), '-type', 'f']);
        const foundFiles = stdout.split('\n').filter(f => f.trim());
        files.push(...foundFiles);
      } catch (error) {
        // Fallback to glob pattern
        const glob = require('glob');
        const foundFiles = await glob(pattern, { cwd: this.context.projectPath });
        files.push(...foundFiles);
      }
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private async checkTypeScriptIssues(filePath: string, analysis: FileAnalysis): Promise<void> {
    const content = await this.readFile(filePath);
    
    // Check for common TypeScript issues
    if (content.includes('any')) {
      analysis.issues.push('Uses "any" type - consider using proper TypeScript types');
      this.metrics.securityIssues++;
    }

    if (content.includes('eval(')) {
      analysis.issues.push('Uses eval() - security risk');
      this.metrics.securityIssues++;
    }

    if (content.includes('innerHTML')) {
      analysis.issues.push('Uses innerHTML - potential XSS risk');
      this.metrics.securityIssues++;
    }

    if (analysis.complexity > 10) {
      analysis.suggestions.push('High complexity - consider breaking down into smaller functions');
      this.metrics.performanceIssues++;
    }

    if (analysis.lines > 500) {
      analysis.suggestions.push('Large file - consider splitting into smaller modules');
    }
  }

  private async checkRustIssues(filePath: string, analysis: FileAnalysis): Promise<void> {
    const content = await this.readFile(filePath);
    
    // Check for common Rust issues
    if (content.includes('unsafe')) {
      analysis.issues.push('Uses unsafe code - review for safety');
      this.metrics.securityIssues++;
    }

    if (content.includes('unwrap()')) {
      analysis.suggestions.push('Uses unwrap() - consider proper error handling');
    }

    if (analysis.complexity > 15) {
      analysis.suggestions.push('High complexity - consider refactoring');
      this.metrics.performanceIssues++;
    }
  }

  private async checkPythonIssues(filePath: string, analysis: FileAnalysis): Promise<void> {
    const content = await this.readFile(filePath);
    
    // Check for common Python issues
    if (content.includes('exec(')) {
      analysis.issues.push('Uses exec() - security risk');
      this.metrics.securityIssues++;
    }

    if (content.includes('eval(')) {
      analysis.issues.push('Uses eval() - security risk');
      this.metrics.securityIssues++;
    }

    if (content.includes('import *')) {
      analysis.suggestions.push('Uses wildcard import - specify exact imports');
    }

    if (analysis.complexity > 10) {
      analysis.suggestions.push('High complexity - consider breaking down');
      this.metrics.performanceIssues++;
    }
  }

  private async runESLintAnalysis(): Promise<void> {
    this.context.logger.info('Running ESLint analysis...');

    try {
      const { stdout, stderr, code } = await this.executeCommand('npx', ['eslint', '.', '--format', 'json']);
      
      if (code === 0) {
        this.context.logger.info('ESLint analysis completed successfully');
        this.addMetric('eslint_issues', 0);
      } else {
        const eslintResults = JSON.parse(stdout);
        const issueCount = eslintResults.reduce((total: number, file: any) => total + file.errorCount + file.warningCount, 0);
        
        this.addMetric('eslint_issues', issueCount);
        
        if (issueCount > 0) {
          this.addWarning(`ESLint found ${issueCount} issues`);
          this.addRecommendation('Fix ESLint issues to improve code quality');
        }
      }
    } catch (error) {
      this.addWarning(`ESLint analysis failed: ${error}`);
    }
  }

  private async runTypeScriptChecks(): Promise<void> {
    this.context.logger.info('Running TypeScript compiler checks...');

    try {
      const { stdout, stderr, code } = await this.executeCommand('npx', ['tsc', '--noEmit']);
      
      if (code === 0) {
        this.context.logger.info('TypeScript checks passed');
        this.addMetric('typescript_errors', 0);
      } else {
        const errorLines = stderr.split('\n').filter(line => line.includes('error'));
        const errorCount = errorLines.length;
        
        this.addMetric('typescript_errors', errorCount);
        this.addError(`TypeScript compiler found ${errorCount} errors`);
        this.addRecommendation('Fix TypeScript errors before deployment');
      }
    } catch (error) {
      this.addWarning(`TypeScript checks failed: ${error}`);
    }
  }

  private async analyzeTestCoverage(): Promise<void> {
    this.context.logger.info('Analyzing test coverage...');

    try {
      const { stdout, stderr, code } = await this.executeCommand('npm', ['run', 'test:coverage']);
      
      if (code === 0) {
        // Parse coverage report
        const coverageMatch = stdout.match(/All files\s+\|\s+(\d+\.\d+)/);
        if (coverageMatch) {
          const coverage = parseFloat(coverageMatch[1]);
          this.metrics.testCoverage = coverage;
          this.addMetric('test_coverage_percent', coverage);
          
          if (coverage < 80) {
            this.addWarning(`Test coverage is low (${coverage}%)`);
            this.addRecommendation('Increase test coverage to at least 80%');
          }
        }
      }
    } catch (error) {
      this.addWarning(`Test coverage analysis failed: ${error}`);
    }
  }

  private async checkSecurityVulnerabilities(): Promise<void> {
    this.context.logger.info('Checking for security vulnerabilities...');

    try {
      const { stdout, stderr, code } = await this.executeCommand('npm', ['audit', '--json']);
      
      if (code === 0) {
        const auditResults = JSON.parse(stdout);
        const vulnerabilities = auditResults.vulnerabilities || {};
        const totalVulnerabilities = Object.values(vulnerabilities).reduce((total: number, vuln: any) => total + vuln.length, 0);
        
        this.addMetric('security_vulnerabilities', totalVulnerabilities);
        
        if (totalVulnerabilities > 0) {
          this.addError(`Found ${totalVulnerabilities} security vulnerabilities`);
          this.addRecommendation('Run "npm audit fix" to resolve vulnerabilities');
        }
      }
    } catch (error) {
      this.addWarning(`Security audit failed: ${error}`);
    }
  }

  private async analyzePerformanceIssues(): Promise<void> {
    this.context.logger.info('Analyzing performance issues...');

    // Check for common performance issues
    const performanceIssues = this.fileAnalyses.filter(file => 
      file.complexity > 10 || file.lines > 500
    );

    this.addMetric('performance_issues', performanceIssues.length);
    
    if (performanceIssues.length > 0) {
      this.addWarning(`Found ${performanceIssues.length} files with potential performance issues`);
      this.addRecommendation('Review and optimize high-complexity files');
    }
  }

  private async calculateOverallMetrics(): Promise<void> {
    this.context.logger.info('Calculating overall metrics...');

    const totalFiles = this.fileAnalyses.length;
    const averageComplexity = this.metrics.complexity / Math.max(totalFiles, 1);
    const maintainabilityIndex = Math.max(0, 171 - 5.2 * Math.log(averageComplexity) - 0.23 * Math.log(this.metrics.totalLines));

    this.metrics.maintainability = maintainabilityIndex;
    
    this.addMetric('total_files', totalFiles);
    this.addMetric('average_complexity', averageComplexity);
    this.addMetric('maintainability_index', maintainabilityIndex);
    this.addMetric('security_issues', this.metrics.securityIssues);
    this.addMetric('performance_issues', this.metrics.performanceIssues);
  }

  private async generateRecommendations(): Promise<void> {
    this.context.logger.info('Generating recommendations...');

    // Security recommendations
    if (this.metrics.securityIssues > 0) {
      this.addRecommendation('Address security vulnerabilities immediately');
      this.addRecommendation('Implement proper input validation and sanitization');
    }

    // Performance recommendations
    if (this.metrics.performanceIssues > 0) {
      this.addRecommendation('Optimize high-complexity functions');
      this.addRecommendation('Consider code splitting for large files');
    }

    // Test coverage recommendations
    if (this.metrics.testCoverage < 80) {
      this.addRecommendation('Write more unit tests to improve coverage');
      this.addRecommendation('Implement integration tests for critical paths');
    }

    // Code quality recommendations
    if (this.metrics.maintainability < 65) {
      this.addRecommendation('Refactor code to improve maintainability');
      this.addRecommendation('Reduce cyclomatic complexity');
    }

    // General recommendations
    this.addRecommendation('Use TypeScript strict mode for better type safety');
    this.addRecommendation('Implement automated code quality checks in CI/CD');
    this.addRecommendation('Regular code reviews to maintain quality standards');
  }
} 