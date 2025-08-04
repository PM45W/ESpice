# ESpice BMAD Development Agents Runner
# BMAD = Build, Monitor, Analyze, Debug

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("full", "build", "monitor", "analyze", "debug", "continuous")]
    [string]$Phase = "full",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [int]$MonitoringInterval = 60000, # 1 minute
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose,
    
    [Parameter(Mandatory=$false)]
    [switch]$GenerateReport,
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectPath = $PWD.Path
)

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Blue = "Blue"
$Cyan = "Cyan"

# Configuration
$Config = @{
    ProjectPath = $ProjectPath
    Environment = $Environment
    Verbose = $Verbose
    GenerateReport = $GenerateReport
}

function Write-BMADStatus {
    param(
        [string]$Message,
        [string]$Status = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    switch ($Status) {
        "SUCCESS" { Write-Host "[$timestamp] ✅ $Message" -ForegroundColor $Green }
        "ERROR" { Write-Host "[$timestamp] ❌ $Message" -ForegroundColor $Red }
        "WARNING" { Write-Host "[$timestamp] ⚠️  $Message" -ForegroundColor $Yellow }
        "INFO" { Write-Host "[$timestamp] ℹ️  $Message" -ForegroundColor $Blue }
        "DEBUG" { 
            if ($Config.Verbose) {
                Write-Host "[$timestamp] 🔍 $Message" -ForegroundColor $Cyan 
            }
        }
    }
}

function Test-Prerequisites {
    Write-BMADStatus "Checking prerequisites..." "INFO"
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-BMADStatus "Node.js: $nodeVersion" "SUCCESS"
    } catch {
        Write-BMADStatus "Node.js not found. Please install Node.js 18+." "ERROR"
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-BMADStatus "npm: $npmVersion" "SUCCESS"
    } catch {
        Write-BMADStatus "npm not found. Please install npm." "ERROR"
        exit 1
    }
    
    # Check if project directory exists
    if (-not (Test-Path $Config.ProjectPath)) {
        Write-BMADStatus "Project path does not exist: $($Config.ProjectPath)" "ERROR"
        exit 1
    }
    
    # Check if package.json exists
    if (-not (Test-Path (Join-Path $Config.ProjectPath "package.json"))) {
        Write-BMADStatus "package.json not found in project directory" "ERROR"
        exit 1
    }
}

function Install-Dependencies {
    Write-BMADStatus "Installing BMAD dependencies..." "INFO"
    
    try {
        # Install required npm packages for BMAD agents
        $dependencies = @(
            "glob",
            "chalk",
            "ora",
            "figlet",
            "inquirer"
        )
        
        foreach ($dep in $dependencies) {
            Write-BMADStatus "Installing $dep..." "DEBUG"
            npm install $dep --save-dev
        }
        
        Write-BMADStatus "Dependencies installed successfully" "SUCCESS"
    } catch {
        Write-BMADStatus "Failed to install dependencies: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

function Run-BMADPhase {
    param(
        [string]$PhaseName,
        [string]$ScriptPath
    )
    
    Write-BMADStatus "Running $PhaseName phase..." "INFO"
    
    try {
        $startTime = Get-Date
        
        # Run the phase using Node.js
        $nodeScript = @"
const { BMADOrchestrator } = require('./scripts/agents/bmad-orchestrator');
const path = require('path');

async function runPhase() {
    const orchestrator = new BMADOrchestrator('$($Config.ProjectPath)', '$($Config.Environment)');
    
    switch ('$PhaseName') {
        case 'build':
            return await orchestrator.runBuildOnly();
        case 'monitor':
            return await orchestrator.runMonitorOnly();
        case 'analyze':
            return await orchestrator.runAnalyzeOnly();
        case 'debug':
            return await orchestrator.runDebugOnly();
        default:
            return await orchestrator.runFullBMAD();
    }
}

runPhase().then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
}).catch(error => {
    console.error('Phase failed:', error);
    process.exit(1);
});
"@
        
        $tempScript = Join-Path $env:TEMP "bmad-$PhaseName.js"
        $nodeScript | Out-File -FilePath $tempScript -Encoding UTF8
        
        $result = node $tempScript 2>&1
        $exitCode = $LASTEXITCODE
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        if ($exitCode -eq 0) {
            Write-BMADStatus "$PhaseName phase completed successfully (${duration}s)" "SUCCESS"
            
            # Parse and display results
            try {
                $parsedResult = $result | ConvertFrom-Json
                Display-PhaseResults $PhaseName $parsedResult
            } catch {
                Write-BMADStatus "Failed to parse results: $($_.Exception.Message)" "WARNING"
            }
        } else {
            Write-BMADStatus "$PhaseName phase failed (${duration}s)" "ERROR"
            Write-BMADStatus "Error output: $result" "ERROR"
        }
        
        # Cleanup
        Remove-Item $tempScript -ErrorAction SilentlyContinue
        
    } catch {
        Write-BMADStatus "$PhaseName phase failed: $($_.Exception.Message)" "ERROR"
    }
}

function Display-PhaseResults {
    param(
        [string]$PhaseName,
        [object]$Results
    )
    
    Write-BMADStatus "=== $PhaseName Results ===" "INFO"
    
    if ($Results.errors -and $Results.errors.Count -gt 0) {
        Write-BMADStatus "Errors ($($Results.errors.Count)):" "ERROR"
        foreach ($error in $Results.errors) {
            Write-BMADStatus "  - $error" "ERROR"
        }
    }
    
    if ($Results.warnings -and $Results.warnings.Count -gt 0) {
        Write-BMADStatus "Warnings ($($Results.warnings.Count)):" "WARNING"
        foreach ($warning in $Results.warnings) {
            Write-BMADStatus "  - $warning" "WARNING"
        }
    }
    
    if ($Results.recommendations -and $Results.recommendations.Count -gt 0) {
        Write-BMADStatus "Recommendations ($($Results.recommendations.Count)):" "INFO"
        foreach ($rec in $Results.recommendations) {
            Write-BMADStatus "  - $rec" "INFO"
        }
    }
    
    if ($Results.metrics) {
        Write-BMADStatus "Metrics:" "INFO"
        foreach ($metric in $Results.metrics.PSObject.Properties) {
            Write-BMADStatus "  - $($metric.Name): $($metric.Value)" "INFO"
        }
    }
}

function Start-ContinuousMonitoring {
    Write-BMADStatus "Starting continuous monitoring..." "INFO"
    Write-BMADStatus "Monitoring interval: $($MonitoringInterval)ms" "INFO"
    Write-BMADStatus "Press Ctrl+C to stop monitoring" "INFO"
    
    try {
        while ($true) {
            Run-BMADPhase "monitor" ""
            Start-Sleep -Milliseconds $MonitoringInterval
        }
    } catch {
        Write-BMADStatus "Continuous monitoring stopped: $($_.Exception.Message)" "INFO"
    }
}

function Show-BMADBanner {
    Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║                    ESpice BMAD Agents                        ║
║              Build • Monitor • Analyze • Debug               ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor $Cyan
}

function Show-Help {
    Write-Host @"
ESpice BMAD Development Agents

Usage:
  .\run-bmad.ps1 [Parameters]

Parameters:
  -Phase <string>           BMAD phase to run (full|build|monitor|analyze|debug|continuous)
  -Environment <string>     Environment (development|staging|production)
  -MonitoringInterval <int> Monitoring interval in milliseconds (default: 60000)
  -Verbose                  Enable verbose output
  -GenerateReport           Generate detailed report
  -ProjectPath <string>     Project path (default: current directory)

Examples:
  .\run-bmad.ps1 -Phase full
  .\run-bmad.ps1 -Phase monitor -Continuous
  .\run-bmad.ps1 -Phase analyze -Verbose
  .\run-bmad.ps1 -Phase continuous -MonitoringInterval 30000

Phases:
  full        - Run complete BMAD cycle
  build       - Environment setup and build validation
  monitor     - System health monitoring
  analyze     - Code quality analysis
  debug       - Error debugging and resolution
  continuous  - Continuous monitoring mode
"@ -ForegroundColor $Blue
}

# Main execution
try {
    Show-BMADBanner
    
    # Check for help parameter
    if ($args -contains "-h" -or $args -contains "--help" -or $args -contains "-?") {
        Show-Help
        exit 0
    }
    
    Write-BMADStatus "Starting ESpice BMAD Development Agents" "INFO"
    Write-BMADStatus "Project Path: $($Config.ProjectPath)" "INFO"
    Write-BMADStatus "Environment: $($Config.Environment)" "INFO"
    Write-BMADStatus "Phase: $Phase" "INFO"
    
    # Check prerequisites
    Test-Prerequisites
    
    # Install dependencies if needed
    Install-Dependencies
    
    # Run selected phase
    switch ($Phase) {
        "full" {
            Write-BMADStatus "Running complete BMAD cycle..." "INFO"
            Run-BMADPhase "full" ""
        }
        "build" {
            Run-BMADPhase "build" ""
        }
        "monitor" {
            Run-BMADPhase "monitor" ""
        }
        "analyze" {
            Run-BMADPhase "analyze" ""
        }
        "debug" {
            Run-BMADPhase "debug" ""
        }
        "continuous" {
            Start-ContinuousMonitoring
        }
        default {
            Write-BMADStatus "Invalid phase: $Phase" "ERROR"
            Show-Help
            exit 1
        }
    }
    
    Write-BMADStatus "BMAD execution completed" "SUCCESS"
    
} catch {
    Write-BMADStatus "BMAD execution failed: $($_.Exception.Message)" "ERROR"
    Write-BMADStatus "Check logs for more details" "INFO"
    exit 1
} 