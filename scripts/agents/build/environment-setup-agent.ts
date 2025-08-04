import { BaseAgent, AgentContext, AgentResult } from '../base-agent';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export class EnvironmentSetupAgent extends BaseAgent {
  constructor(context: AgentContext) {
    super(context);
    this.context.config = {
      name: 'Environment Setup Agent',
      description: 'Sets up and validates the development environment',
      version: '1.0.0',
      enabled: true,
      timeout: 300000, // 5 minutes
      retries: 3,
      logLevel: 'info'
    };
  }

  validate(): boolean {
    return this.context.projectPath && fs.existsSync(this.context.projectPath);
  }

  async execute(): Promise<AgentResult> {
    this.context.logger.info('Setting up development environment...');

    try {
      // Check system requirements
      await this.checkSystemRequirements();

      // Check Node.js installation
      await this.checkNodeJS();

      // Check Rust installation
      await this.checkRust();

      // Check Python installation
      await this.checkPython();

      // Check Docker installation
      await this.checkDocker();

      // Setup project directories
      await this.setupProjectDirectories();

      // Install dependencies
      await this.installDependencies();

      // Validate environment
      await this.validateEnvironment();

      this.result.success = true;
      this.context.logger.info('Environment setup completed successfully');

    } catch (error) {
      this.addError(`Environment setup failed: ${error}`);
      this.context.logger.error('Environment setup failed', error);
    }

    return this.result;
  }

  private async checkSystemRequirements(): Promise<void> {
    this.context.logger.info('Checking system requirements...');

    const platform = os.platform();
    const arch = os.arch();
    const memory = os.totalmem() / (1024 * 1024 * 1024); // GB

    this.addMetric('platform', platform === 'win32' ? 1 : platform === 'darwin' ? 2 : 3);
    this.addMetric('architecture', arch === 'x64' ? 1 : 0);
    this.addMetric('memory_gb', Math.round(memory));

    if (memory < 8) {
      this.addWarning('System has less than 8GB RAM. Performance may be affected.');
    }

    if (platform === 'win32') {
      this.addRecommendation('Consider using WSL2 for better development experience on Windows');
    }
  }

  private async checkNodeJS(): Promise<void> {
    this.context.logger.info('Checking Node.js installation...');

    try {
      const { stdout, stderr, code } = await this.executeCommand('node', ['--version']);
      
      if (code !== 0) {
        throw new Error(`Node.js check failed: ${stderr}`);
      }

      const version = stdout.trim();
      const majorVersion = parseInt(version.replace('v', '').split('.')[0]);

      this.addMetric('node_version', majorVersion);

      if (majorVersion < 18) {
        this.addError('Node.js version 18 or higher is required');
        this.addRecommendation('Update Node.js to version 18 or higher');
      } else {
        this.context.logger.info(`Node.js version: ${version}`);
      }

      // Check npm
      const npmResult = await this.executeCommand('npm', ['--version']);
      if (npmResult.code === 0) {
        this.context.logger.info(`npm version: ${npmResult.stdout.trim()}`);
      }

    } catch (error) {
      this.addError(`Node.js check failed: ${error}`);
    }
  }

  private async checkRust(): Promise<void> {
    this.context.logger.info('Checking Rust installation...');

    try {
      const { stdout, stderr, code } = await this.executeCommand('rustc', ['--version']);
      
      if (code !== 0) {
        this.addWarning('Rust not found. Tauri backend features will not be available.');
        this.addRecommendation('Install Rust from https://rustup.rs/');
        return;
      }

      const version = stdout.trim();
      this.context.logger.info(`Rust version: ${version}`);

      // Check Cargo
      const cargoResult = await this.executeCommand('cargo', ['--version']);
      if (cargoResult.code === 0) {
        this.context.logger.info(`Cargo version: ${cargoResult.stdout.trim()}`);
      }

    } catch (error) {
      this.addWarning(`Rust check failed: ${error}`);
    }
  }

  private async checkPython(): Promise<void> {
    this.context.logger.info('Checking Python installation...');

    try {
      const { stdout, stderr, code } = await this.executeCommand('python', ['--version']);
      
      if (code !== 0) {
        // Try python3
        const python3Result = await this.executeCommand('python3', ['--version']);
        if (python3Result.code !== 0) {
          this.addWarning('Python not found. Some microservices may not work.');
          this.addRecommendation('Install Python 3.8 or higher');
          return;
        }
      }

      const version = stdout.trim();
      this.context.logger.info(`Python version: ${version}`);

      // Check pip
      const pipResult = await this.executeCommand('pip', ['--version']);
      if (pipResult.code === 0) {
        this.context.logger.info(`pip version: ${pipResult.stdout.trim()}`);
      }

    } catch (error) {
      this.addWarning(`Python check failed: ${error}`);
    }
  }

  private async checkDocker(): Promise<void> {
    this.context.logger.info('Checking Docker installation...');

    try {
      const { stdout, stderr, code } = await this.executeCommand('docker', ['--version']);
      
      if (code !== 0) {
        this.addWarning('Docker not found. Containerized deployment will not be available.');
        this.addRecommendation('Install Docker Desktop for containerized development');
        return;
      }

      const version = stdout.trim();
      this.context.logger.info(`Docker version: ${version}`);

      // Check Docker Compose
      const composeResult = await this.executeCommand('docker-compose', ['--version']);
      if (composeResult.code === 0) {
        this.context.logger.info(`Docker Compose version: ${composeResult.stdout.trim()}`);
      }

    } catch (error) {
      this.addWarning(`Docker check failed: ${error}`);
    }
  }

  private async setupProjectDirectories(): Promise<void> {
    this.context.logger.info('Setting up project directories...');

    const directories = [
      'logs',
      'downloads',
      'temp',
      'build',
      'dist',
      'coverage',
      'node_modules',
      'website/node_modules',
      'website/server/node_modules'
    ];

    for (const dir of directories) {
      const dirPath = path.join(this.context.projectPath, dir);
      if (!await this.directoryExists(dirPath)) {
        await fs.promises.mkdir(dirPath, { recursive: true });
        this.context.logger.debug(`Created directory: ${dir}`);
      }
    }
  }

  private async installDependencies(): Promise<void> {
    this.context.logger.info('Installing dependencies...');

    try {
      // Install root dependencies
      this.context.logger.info('Installing root dependencies...');
      const rootResult = await this.executeCommand('npm', ['install']);
      if (rootResult.code !== 0) {
        throw new Error(`Root dependencies installation failed: ${rootResult.stderr}`);
      }

      // Install website dependencies
      this.context.logger.info('Installing website dependencies...');
      const websiteResult = await this.executeCommand('npm', ['install'], { cwd: path.join(this.context.projectPath, 'website') });
      if (websiteResult.code !== 0) {
        throw new Error(`Website dependencies installation failed: ${websiteResult.stderr}`);
      }

      // Install server dependencies
      this.context.logger.info('Installing server dependencies...');
      const serverResult = await this.executeCommand('npm', ['install'], { cwd: path.join(this.context.projectPath, 'website/server') });
      if (serverResult.code !== 0) {
        throw new Error(`Server dependencies installation failed: ${serverResult.stderr}`);
      }

      this.context.logger.info('All dependencies installed successfully');

    } catch (error) {
      this.addError(`Dependencies installation failed: ${error}`);
    }
  }

  private async validateEnvironment(): Promise<void> {
    this.context.logger.info('Validating environment...');

    // Check if all required files exist
    const requiredFiles = [
      'package.json',
      'website/package.json',
      'website/server/package.json',
      'tsconfig.json',
      'vite.config.ts'
    ];

    for (const file of requiredFiles) {
      if (!await this.fileExists(this.getProjectFile(file))) {
        this.addError(`Required file not found: ${file}`);
      }
    }

    // Check if build works
    try {
      this.context.logger.info('Testing build process...');
      const buildResult = await this.executeCommand('npm', ['run', 'build']);
      if (buildResult.code === 0) {
        this.context.logger.info('Build test successful');
      } else {
        this.addWarning('Build test failed. Check configuration.');
      }
    } catch (error) {
      this.addWarning(`Build test failed: ${error}`);
    }
  }
} 