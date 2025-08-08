# ESpice Desktop App Build Guide

## Overview

The ESpice desktop application is built using **Tauri**, which combines React frontend with Rust backend for native performance and cross-platform compatibility. The app is already configured and updated to use the real FastAPI service for curve extraction.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   Tauri Bridge  │    │   FastAPI       │
│   (Frontend)    │◄──►│   (Rust)        │◄──►│   (Backend)     │
│                 │    │                 │    │                 │
│ - Graph Viewer  │    │ - File I/O      │    │ - Image Proc    │
│ - File Upload   │    │ - System APIs   │    │ - Curve Extract │
│ - Settings      │    │ - Native UI     │    │ - Data Export   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### Required Software

1. **Node.js 18+** - For React frontend
2. **Rust 1.70+** - For Tauri backend
3. **Python 3.8+** - For FastAPI service
4. **System Dependencies**:
   - **Windows**: Visual Studio Build Tools
   - **macOS**: Xcode Command Line Tools
   - **Linux**: Build essentials, libwebkit2gtk

### Install Rust

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Or on Windows (PowerShell)
winget install Rust.Rust
# OR
choco install rust

# Verify installation
rustc --version
cargo --version
```

### Install Tauri CLI

```bash
# Install Tauri CLI globally
npm install -g @tauri-apps/cli

# Verify installation
tauri --version
```

## Build Instructions

### Step 1: Install Dependencies

```bash
# Navigate to desktop app directory
cd apps/desktop

# Install Node.js dependencies
npm install

# Install Rust dependencies (automatic on first build)
```

### Step 2: Start FastAPI Service

```bash
# From ESpice root directory
./scripts/start-curve-extraction-service-simple.ps1

# Verify service is running
curl http://localhost:8002/health
```

### Step 3: Development Mode

```bash
# Start development server
npm run dev

# This will:
# - Start Vite dev server on port 5176
# - Open Tauri window with hot reload
# - Connect to FastAPI service automatically
```

### Step 4: Build for Production

```bash
# Build for current platform
npm run tauri build

# This creates:
# - Windows: .exe installer in src-tauri/target/release/bundle/
# - macOS: .dmg in src-tauri/target/release/bundle/
# - Linux: .AppImage in src-tauri/target/release/bundle/
```

## Platform-Specific Builds

### Windows Build

```bash
# Build Windows executable
npm run tauri build -- --target x86_64-pc-windows-msvc

# Output: src-tauri/target/release/bundle/msi/espice_1.0.0_x64_en-US.msi
```

### macOS Build

```bash
# Build macOS app
npm run tauri build -- --target x86_64-apple-darwin

# Output: src-tauri/target/release/bundle/dmg/espice_1.0.0_x64.dmg
```

### Linux Build

```bash
# Build Linux AppImage
npm run tauri build -- --target x86_64-unknown-linux-gnu

# Output: src-tauri/target/release/bundle/appimage/espice_1.0.0_x86_64.AppImage
```

## Configuration

### Tauri Configuration

The app is configured in `src-tauri/tauri.conf.json`:

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5176",
    "distDir": "../dist"
  },
  "app": {
    "security": {
      "csp": null
    },
    "windows": [
      {
        "title": "ESpice - Professional SPICE Model Generator",
        "width": 1400,
        "height": 900,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ]
  }
}
```

### FastAPI Service Integration

The desktop app automatically connects to the FastAPI service:

- **Service URL**: `http://localhost:8002`
- **Health Check**: `/health`
- **Color Detection**: `/api/curve-extraction/detect-colors`
- **Curve Extraction**: `/api/curve-extraction/extract-curves`

## Features

### ✅ **Already Implemented**

1. **Graph Extraction**:
   - Real-time image processing
   - Color detection and selection
   - Curve extraction with configurable parameters
   - Multiple graph type presets (output, transfer, capacitance, resistance)

2. **Data Management**:
   - CSV export functionality
   - Database integration
   - Batch processing capabilities
   - Saved graph type configurations

3. **User Interface**:
   - Modern React UI with Tailwind CSS
   - Real-time service status monitoring
   - Interactive graph viewer
   - File upload and preview

4. **System Integration**:
   - Native file system access
   - System notifications
   - Cross-platform compatibility
   - Performance optimization

### 🔧 **Development Features**

- **Hot Reload**: Changes reflect immediately in development
- **Debug Mode**: Full developer tools and console access
- **Error Handling**: Comprehensive error reporting
- **Logging**: Detailed logs for troubleshooting

## Troubleshooting

### Common Build Issues

#### 1. Rust Toolchain Issues

```bash
# Update Rust toolchain
rustup update

# Check target availability
rustup target list --installed

# Add missing target
rustup target add x86_64-pc-windows-msvc
```

#### 2. Node.js Dependencies

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 3. FastAPI Service Issues

```bash
# Check service status
./scripts/test-web-app-connection.ps1

# Restart service
./scripts/start-curve-extraction-service-simple.ps1
```

#### 4. Windows Build Issues

```bash
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/

# Or use winget
winget install Microsoft.VisualStudio.2022.BuildTools
```

### Performance Optimization

#### Build Optimization

```bash
# Release build with optimizations
npm run tauri build -- --release

# Profile build
npm run tauri build -- --profile release
```

#### Runtime Optimization

- **Memory Management**: Automatic cleanup of large images
- **Async Processing**: Non-blocking UI during processing
- **Caching**: Efficient data caching for repeated operations

## Distribution

### Creating Installers

```bash
# Windows MSI installer
npm run tauri build -- --target x86_64-pc-windows-msvc

# macOS DMG
npm run tauri build -- --target x86_64-apple-darwin

# Linux AppImage
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

### Code Signing

For production distribution, you'll need to sign your application:

#### Windows
```bash
# Using signtool
signtool sign /f certificate.pfx /p password espice.exe
```

#### macOS
```bash
# Using codesign
codesign --force --deep --sign "Developer ID Application: Your Name" espice.app
```

#### Linux
```bash
# Using GPG
gpg --detach-sign --armor espice.AppImage
```

## Development Workflow

### 1. Daily Development

```bash
# Start FastAPI service
./scripts/start-curve-extraction-service-simple.ps1

# Start desktop app in dev mode
cd apps/desktop
npm run dev
```

### 2. Testing

```bash
# Run tests
npm test

# Build and test
npm run tauri build
```

### 3. Production Build

```bash
# Build for all platforms
npm run tauri build -- --target x86_64-pc-windows-msvc
npm run tauri build -- --target x86_64-apple-darwin
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

## Migration from Web App

The desktop app is **already migrated** and includes all web app features plus:

### ✅ **Advantages of Desktop App**

1. **Native Performance**: Rust backend for faster processing
2. **System Integration**: Direct file system access
3. **Offline Capability**: Can work without internet
4. **Better Security**: No browser security limitations
5. **Professional UI**: Native window management
6. **Cross-Platform**: Single codebase for all platforms

### 🔄 **Migration Status**

- ✅ **UI Components**: All React components migrated
- ✅ **FastAPI Integration**: Real service connection
- ✅ **File Handling**: Native file system access
- ✅ **Data Export**: CSV and database integration
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Service Monitoring**: Real-time status checking

## Conclusion

The ESpice desktop app is **production-ready** and provides a superior user experience compared to the web version. It combines the best of both worlds:

- **React UI** for modern, responsive interface
- **Rust backend** for native performance
- **FastAPI service** for advanced image processing
- **Cross-platform compatibility** for all major operating systems

The app is ready for distribution and can be easily built for Windows, macOS, and Linux platforms. 