# ESpice Codebase Restructure Script
# Phase 1: Documentation Consolidation and Service Archiving
# This script automates the initial restructuring to improve development speed

param(
    [switch]$DryRun = $false,
    [switch]$Backup = $true,
    [string]$BackupPath = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
)

Write-Host "=== ESpice Codebase Restructure Script ===" -ForegroundColor Green
Write-Host "Phase 1: Documentation Consolidation and Service Archiving" -ForegroundColor Yellow
Write-Host ""

# Function to create backup
function Create-Backup {
    if ($Backup) {
        Write-Host "Creating backup at: $BackupPath" -ForegroundColor Cyan
        if (Test-Path $BackupPath) {
            Remove-Item $BackupPath -Recurse -Force
        }
        Copy-Item -Path "." -Destination $BackupPath -Recurse -Exclude @("node_modules", "target", "dist", "build", ".git")
        Write-Host "Backup completed successfully" -ForegroundColor Green
    }
}

# Function to create new directory structure
function Create-NewStructure {
    Write-Host "Creating new documentation structure..." -ForegroundColor Cyan
    
    $newDirs = @(
        "docs/architecture",
        "docs/development", 
        "docs/user-guide",
        "docs/api",
        "docs/archive/implementation",
        "docs/archive/stories",
        "docs/archive/templates",
        "docs/archive/agents",
        "docs/archive/workflows",
        "services/core",
        "services/utilities",
        "services/archive",
        "packages/ui/src/components",
        "packages/ui/src/hooks",
        "packages/ui/src/utils",
        "packages/ui/src/types",
        "config/development",
        "config/production",
        "config/shared"
    )
    
    foreach ($dir in $newDirs) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "Created directory: $dir" -ForegroundColor Green
        }
    }
}

# Function to archive legacy documentation
function Archive-LegacyDocumentation {
    Write-Host "Archiving legacy documentation..." -ForegroundColor Cyan
    
    $archiveMoves = @(
        @{Source = "docs/implementation"; Destination = "docs/archive/implementation"},
        @{Source = "docs/stories"; Destination = "docs/archive/stories"},
        @{Source = "docs/templates"; Destination = "docs/archive/templates"},
        @{Source = "docs/agents"; Destination = "docs/archive/agents"},
        @{Source = "docs/workflows"; Destination = "docs/archive/workflows"}
    )
    
    foreach ($move in $archiveMoves) {
        if (Test-Path $move.Source) {
            if ($DryRun) {
                Write-Host "[DRY RUN] Would move: $($move.Source) -> $($move.Destination)" -ForegroundColor Yellow
            } else {
                Move-Item -Path $move.Source -Destination $move.Destination -Force
                Write-Host "Moved: $($move.Source) -> $($move.Destination)" -ForegroundColor Green
            }
        }
    }
}

# Function to archive unused services
function Archive-UnusedServices {
    Write-Host "Archiving unused services..." -ForegroundColor Cyan
    
    $unusedServices = @(
        "ai-agent",
        "customization-manager", 
        "pdk-checker",
        "test-correlation",
        "version-control",
        "backup-recovery",
        "load-balancer",
        "rate-limiter"
    )
    
    foreach ($service in $unusedServices) {
        $servicePath = "services/$service"
        if (Test-Path $servicePath) {
            if ($DryRun) {
                Write-Host "[DRY RUN] Would archive: $servicePath" -ForegroundColor Yellow
            } else {
                Move-Item -Path $servicePath -Destination "services/archive/$service" -Force
                Write-Host "Archived service: $service" -ForegroundColor Green
            }
        }
    }
}

# Function to consolidate core services
function Consolidate-CoreServices {
    Write-Host "Consolidating core services..." -ForegroundColor Cyan
    
    $coreServices = @(
        @{Source = "pdf-service"; Destination = "core/pdf-service"},
        @{Source = "curve-extraction-service"; Destination = "core/curve-extraction"},
        @{Source = "spice-service"; Destination = "core/spice-generation"},
        @{Source = "data-analytics"; Destination = "core/data-management"},
        @{Source = "auth-service"; Destination = "utilities/auth-service"},
        @{Source = "monitoring-service"; Destination = "utilities/monitoring"}
    )
    
    foreach ($service in $coreServices) {
        $sourcePath = "services/$($service.Source)"
        $destPath = "services/$($service.Destination)"
        
        if (Test-Path $sourcePath) {
            if ($DryRun) {
                Write-Host "[DRY RUN] Would move: $sourcePath -> $destPath" -ForegroundColor Yellow
            } else {
                if (!(Test-Path (Split-Path $destPath))) {
                    New-Item -ItemType Directory -Path (Split-Path $destPath) -Force | Out-Null
                }
                Move-Item -Path $sourcePath -Destination $destPath -Force
                Write-Host "Moved service: $($service.Source) -> $($service.Destination)" -ForegroundColor Green
            }
        }
    }
}

# Function to create new documentation files
function Create-NewDocumentation {
    Write-Host "Creating new documentation structure..." -ForegroundColor Cyan
    
    $newDocs = @{
        "docs/README.md" = @"
# ESpice Documentation

## Overview
ESpice is a semiconductor parameter extraction and SPICE model generation tool.

## Quick Links
- [Architecture](architecture/overview.md)
- [Development Guide](development/setup.md)
- [User Guide](user-guide/installation.md)
- [API Documentation](api/endpoints.md)

## Getting Started
See [Development Setup](development/setup.md) for installation and configuration.
"@
        
        "docs/architecture/overview.md" = @"
# ESpice Architecture Overview

## System Architecture
ESpice follows a modular architecture with the following components:

### Core Services
- **PDF Service**: Handles PDF processing and text extraction
- **Curve Extraction**: Extracts I-V curves from datasheet graphs
- **SPICE Generation**: Generates SPICE models for semiconductor devices
- **Data Management**: Manages data storage and retrieval

### Applications
- **Desktop App**: Main Tauri-based desktop application
- **Web App**: Web-based interface (if needed)

### Utilities
- **Authentication**: User authentication and authorization
- **Monitoring**: System monitoring and health checks
"@
        
        "docs/development/setup.md" = @"
# Development Setup

## Prerequisites
- Node.js 18+
- Rust 1.70+
- Python 3.8+ (for services)

## Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up services: See individual service documentation
4. Start development: `npm run dev`

## Development Guidelines
- Follow TypeScript strict mode
- Use component library for UI components
- Write tests for new features
- Update documentation for changes
"@
        
        "docs/user-guide/installation.md" = @"
# User Installation Guide

## System Requirements
- Windows 10+, macOS 10.15+, or Linux
- 4GB RAM minimum, 8GB recommended
- 2GB free disk space

## Installation Steps
1. Download the latest release
2. Run the installer
3. Follow the setup wizard
4. Launch the application

## First Time Setup
1. Configure your workspace
2. Import your first datasheet
3. Extract parameters
4. Generate SPICE models
"@
        
        "docs/api/endpoints.md" = @"
# API Endpoints

## Core Services

### PDF Service
- `POST /api/pdf/extract` - Extract text from PDF
- `POST /api/pdf/tables` - Extract tables from PDF

### Curve Extraction Service
- `POST /api/curve-extraction/extract` - Extract curves from image
- `GET /api/curve-extraction/status` - Get extraction status

### SPICE Generation Service
- `POST /api/spice/generate` - Generate SPICE model
- `GET /api/spice/models` - List available models

### Data Management Service
- `GET /api/data/products` - List products
- `POST /api/data/products` - Create product
- `PUT /api/data/products/:id` - Update product
- `DELETE /api/data/products/:id` - Delete product
"@
    }
    
    foreach ($doc in $newDocs.GetEnumerator()) {
        if ($DryRun) {
            Write-Host "[DRY RUN] Would create: $($doc.Key)" -ForegroundColor Yellow
        } else {
            $doc.Value | Out-File -FilePath $doc.Key -Encoding UTF8
            Write-Host "Created documentation: $($doc.Key)" -ForegroundColor Green
        }
    }
}

# Function to create component library structure
function Create-ComponentLibrary {
    Write-Host "Creating component library structure..." -ForegroundColor Cyan
    
    $componentFiles = @{
        "packages/ui/package.json" = @"
{
  "name": "@espice/ui",
  "version": "1.0.0",
  "description": "ESpice UI Component Library",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.6.2"
  }
}
"@
        
        "packages/ui/tsconfig.json" = @"
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "node",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
"@
        
        "packages/ui/src/index.ts" = @"
// ESpice UI Component Library
export * from './components';
export * from './hooks';
export * from './utils';
export * from './types';
"@
        
        "packages/ui/src/components/index.ts" = @"
// Component exports
export * from './Button';
export * from './Card';
export * from './Modal';
export * from './Table';
"@
        
        "packages/ui/src/hooks/index.ts" = @"
// Hook exports
export * from './useLocalStorage';
export * from './useDebounce';
"@
        
        "packages/ui/src/utils/index.ts" = @"
// Utility exports
export * from './validation';
export * from './formatting';
"@
        
        "packages/ui/src/types/index.ts" = @"
// Type exports
export * from './common';
export * from './api';
"@
    }
    
    foreach ($file in $componentFiles.GetEnumerator()) {
        if ($DryRun) {
            Write-Host "[DRY RUN] Would create: $($file.Key)" -ForegroundColor Yellow
        } else {
            $file.Value | Out-File -FilePath $file.Key -Encoding UTF8
            Write-Host "Created component library file: $($file.Key)" -ForegroundColor Green
        }
    }
}

# Function to generate summary report
function Generate-SummaryReport {
    Write-Host "Generating summary report..." -ForegroundColor Cyan
    
    $report = @"
# ESpice Restructure Summary Report
Generated: $(Get-Date)

## Changes Made

### Documentation Consolidation
- Archived legacy documentation to docs/archive/
- Created new documentation structure
- Generated new documentation files

### Service Consolidation  
- Archived unused services to services/archive/
- Moved core services to services/core/
- Moved utility services to services/utilities/

### Component Library
- Created packages/ui/ structure
- Set up TypeScript configuration
- Created initial component library files

## Next Steps
1. Review archived content for important information
2. Update import paths in code
3. Test build process
4. Update CI/CD pipelines
5. Train team on new structure

## File Count Reduction
- Documentation: ~70% reduction expected
- Services: ~60% reduction expected
- Overall: ~50% reduction expected
"@
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would create summary report" -ForegroundColor Yellow
    } else {
        $report | Out-File -FilePath "RESTRUCTURE_SUMMARY.md" -Encoding UTF8
        Write-Host "Created summary report: RESTRUCTURE_SUMMARY.md" -ForegroundColor Green
    }
}

# Main execution
try {
    Write-Host "Starting ESpice codebase restructure..." -ForegroundColor Green
    
    if ($DryRun) {
        Write-Host "DRY RUN MODE - No actual changes will be made" -ForegroundColor Yellow
    }
    
    # Create backup
    Create-Backup
    
    # Create new structure
    Create-NewStructure
    
    # Archive legacy documentation
    Archive-LegacyDocumentation
    
    # Archive unused services
    Archive-UnusedServices
    
    # Consolidate core services
    Consolidate-CoreServices
    
    # Create new documentation
    Create-NewDocumentation
    
    # Create component library
    Create-ComponentLibrary
    
    # Generate summary report
    Generate-SummaryReport
    
    Write-Host ""
    Write-Host "=== Restructure Phase 1 Complete ===" -ForegroundColor Green
    
    if ($DryRun) {
        Write-Host "Dry run completed. Review the planned changes above." -ForegroundColor Yellow
        Write-Host "Run without -DryRun to execute the actual restructure." -ForegroundColor Yellow
    } else {
        Write-Host "Restructure completed successfully!" -ForegroundColor Green
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Review RESTRUCTURE_SUMMARY.md" -ForegroundColor White
        Write-Host "2. Update import paths in your code" -ForegroundColor White
        Write-Host "3. Test the build process" -ForegroundColor White
        Write-Host "4. Update CI/CD pipelines" -ForegroundColor White
    }
    
} catch {
    Write-Host "Error during restructure: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check the backup at: $BackupPath" -ForegroundColor Yellow
    exit 1
} 