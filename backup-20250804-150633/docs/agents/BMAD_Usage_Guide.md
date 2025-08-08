# ESpice BMAD Development Agents - Usage Guide

## Overview

The BMAD (Build, Monitor, Analyze, Debug) methodology provides automated agents to help developers debug and develop the ESpice application. This guide covers how to use these agents effectively.

## Quick Start

### 1. Run Full BMAD Cycle
```bash
# Run complete BMAD cycle
npm run bmad:full

# Or use PowerShell directly
.\scripts\run-bmad.ps1 -Phase full
```

### 2. Run Individual Phases
```bash
# Build phase only
npm run bmad:build

# Monitor phase only
npm run bmad:monitor

# Analyze phase only
npm run bmad:analyze

# Debug phase only
npm run bmad:debug
```

### 3. Continuous Monitoring
```bash
# Start continuous monitoring (1-minute intervals)
npm run bmad:continuous

# Custom monitoring interval (30 seconds)
.\scripts\run-bmad.ps1 -Phase continuous -MonitoringInterval 30000
```

## BMAD Phases Explained

### B - Build Phase
**Purpose**: Environment setup and build validation

**What it does**:
- Checks system requirements (Node.js, Rust, Python, Docker)
- Validates project structure and dependencies
- Installs missing dependencies
- Tests build process
- Sets up development environment

**Common outputs**:
- Environment validation results
- Dependency installation status
- Build success/failure indicators
- System compatibility warnings

**When to use**:
- Setting up a new development environment
- After pulling new code with dependency changes
- Before starting development work
- Troubleshooting build issues

### M - Monitor Phase
**Purpose**: Real-time system health monitoring

**What it does**:
- Monitors CPU, memory, and disk usage
- Checks application health endpoints
- Tracks running processes
- Analyzes network connectivity
- Generates performance alerts

**Common outputs**:
- System resource metrics
- Application health status
- Performance warnings
- Resource utilization trends

**When to use**:
- During development to monitor system health
- Troubleshooting performance issues
- Continuous monitoring in production
- Capacity planning

### A - Analyze Phase
**Purpose**: Code quality and security analysis

**What it does**:
- Analyzes TypeScript, Rust, and Python code
- Runs ESLint and TypeScript compiler checks
- Checks for security vulnerabilities
- Analyzes test coverage
- Identifies performance issues

**Common outputs**:
- Code quality metrics
- Security vulnerability reports
- Test coverage statistics
- Performance optimization suggestions

**When to use**:
- Before committing code
- Code review preparation
- Security audits
- Performance optimization

### D - Debug Phase
**Purpose**: Automated error debugging and resolution

**What it does**:
- Analyzes error logs and console output
- Identifies common error patterns
- Suggests fixes for known issues
- Checks configuration files
- Validates dependency integrity

**Common outputs**:
- Error categorization and analysis
- Fix suggestions and recommendations
- Configuration validation results
- Dependency issue reports

**When to use**:
- When encountering errors
- Troubleshooting build failures
- Debugging runtime issues
- Configuration problems

## Advanced Usage

### Environment-Specific Runs
```bash
# Development environment
.\scripts\run-bmad.ps1 -Phase full -Environment development

# Staging environment
.\scripts\run-bmad.ps1 -Phase full -Environment staging

# Production environment
.\scripts\run-bmad.ps1 -Phase full -Environment production
```

### Verbose Output
```bash
# Enable detailed logging
.\scripts\run-bmad.ps1 -Phase analyze -Verbose
```

### Custom Project Path
```bash
# Run BMAD on specific project
.\scripts\run-bmad.ps1 -Phase full -ProjectPath "C:\path\to\project"
```

### Generate Reports
```bash
# Generate detailed reports
.\scripts\run-bmad.ps1 -Phase full -GenerateReport
```

## Output and Reports

### Console Output
BMAD agents provide color-coded console output:
- ✅ **Green**: Success messages
- ❌ **Red**: Error messages
- ⚠️ **Yellow**: Warning messages
- ℹ️ **Blue**: Information messages
- 🔍 **Cyan**: Debug messages (verbose mode)

### Generated Reports
Reports are saved in the `logs/` directory:
- `bmad-report.json`: Detailed JSON report
- `bmad-summary.md`: Human-readable summary
- `system-metrics.json`: System performance data
- `error-report.json`: Error analysis results

### Report Structure
```json
{
  "timestamp": "2025-03-21T10:30:00.000Z",
  "project": "/path/to/project",
  "environment": "development",
  "summary": {
    "success": true,
    "totalErrors": 0,
    "totalWarnings": 5,
    "recommendations": ["..."],
    "metrics": {...}
  },
  "phases": {
    "build": {...},
    "monitor": {...},
    "analyze": {...},
    "debug": {...}
  }
}
```

## Troubleshooting

### Common Issues

**1. PowerShell Execution Policy**
```powershell
# Fix execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**2. Missing Dependencies**
```bash
# Install BMAD dependencies
npm install glob chalk ora figlet inquirer --save-dev
```

**3. Node.js Version Issues**
```bash
# Check Node.js version (requires 18+)
node --version

# Update Node.js if needed
# Download from https://nodejs.org/
```

**4. Permission Issues**
```bash
# Run as administrator if needed
# Or check file permissions
```

### Error Categories

**Build Errors**:
- Missing dependencies
- Version conflicts
- Configuration issues
- System requirements not met

**Monitor Errors**:
- Application not running
- Network connectivity issues
- Resource exhaustion
- Health check failures

**Analyze Errors**:
- Code quality issues
- Security vulnerabilities
- Test coverage gaps
- Performance problems

**Debug Errors**:
- Runtime errors
- Configuration problems
- Dependency issues
- Log parsing failures

## Best Practices

### 1. Regular Usage
- Run `bmad:build` after pulling new code
- Use `bmad:analyze` before committing
- Monitor with `bmad:monitor` during development
- Debug with `bmad:debug` when issues arise

### 2. Continuous Integration
```yaml
# GitHub Actions example
- name: Run BMAD Analysis
  run: |
    npm run bmad:analyze
    npm run bmad:debug
```

### 3. Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run bmad:analyze"
    }
  }
}
```

### 4. Monitoring Setup
```bash
# Start monitoring in background
nohup npm run bmad:continuous > bmad-monitor.log 2>&1 &
```

## Customization

### Adding Custom Agents
1. Create new agent class extending `BaseAgent`
2. Implement `execute()` and `validate()` methods
3. Add to BMAD orchestrator
4. Update scripts and documentation

### Custom Error Patterns
```typescript
// Add to error-debugger-agent.ts
{
  pattern: 'CustomError',
  category: 'Custom',
  severity: 'medium',
  solution: 'Custom solution description',
  examples: ['Custom error example']
}
```

### Custom Metrics
```typescript
// Add to any agent
this.addMetric('custom_metric', value);
```

## Support and Maintenance

### Log Locations
- `logs/bmad-report.json`: Main BMAD reports
- `logs/system-metrics.json`: System performance data
- `logs/error-report.json`: Error analysis
- `logs/bmad-summary.md`: Human-readable summaries

### Updating Agents
```bash
# Update agent dependencies
npm update

# Check for agent updates
npm outdated
```

### Reporting Issues
1. Check logs in `logs/` directory
2. Run with `-Verbose` flag for detailed output
3. Include error messages and system information
4. Report to development team

## Future Enhancements

### Planned Features
- Machine learning for error prediction
- Automated fix generation
- Integration with IDEs
- Real-time collaboration features
- Advanced performance profiling
- Security vulnerability prediction

### Contributing
1. Follow the agent interface pattern
2. Add comprehensive tests
3. Update documentation
4. Follow coding standards
5. Submit pull requests

---

**Note**: This guide is part of the ESpice development toolkit. For more information, see the main documentation in `docs/agents/ESpice_Development_Agents.md`. 