# User Installation Guide

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free disk space
- **Processor**: Intel i3 or equivalent

### Recommended Requirements
- **RAM**: 16GB or more
- **Storage**: 10GB free disk space
- **Processor**: Intel i5/AMD Ryzen 5 or better
- **Graphics**: Dedicated GPU for image processing

## Installation Steps

### Windows Installation

#### Option 1: Installer (Recommended)
1. Download the latest Windows installer from the releases page
2. Run the installer as administrator
3. Follow the installation wizard
4. Launch ESpice from the Start menu

#### Option 2: Portable Version
1. Download the portable ZIP file
2. Extract to your preferred location
3. Run `ESpice.exe` from the extracted folder

### macOS Installation

#### Option 1: DMG Installer
1. Download the macOS DMG file
2. Open the DMG and drag ESpice to Applications
3. Launch from Applications folder

#### Option 2: Homebrew
```bash
brew install --cask espice
```

### Linux Installation

#### Option 1: AppImage (Recommended)
1. Download the AppImage file
2. Make it executable: `chmod +x ESpice.AppImage`
3. Run: `./ESpice.AppImage`

#### Option 2: Package Manager
```bash
# Ubuntu/Debian
sudo apt install espice

# Fedora
sudo dnf install espice

# Arch Linux
yay -S espice
```

## First Time Setup

### 1. Initial Configuration
1. Launch ESpice
2. Accept the license agreement
3. Choose installation directory
4. Configure user preferences

### 2. Workspace Setup
1. Create a new workspace
2. Set default file locations
3. Configure backup settings
4. Set up user profile

### 3. Import First Datasheet
1. Click "Import Datasheet"
2. Select a PDF file
3. Wait for processing
4. Review extracted data

### 4. Extract Parameters
1. Open the datasheet viewer
2. Select parameter tables
3. Extract key values
4. Save to database

### 5. Generate SPICE Model
1. Select device type
2. Choose model template
3. Generate SPICE model
4. Export to file

## Configuration

### Application Settings
- **Theme**: Light/Dark mode
- **Language**: Interface language
- **Units**: Measurement units
- **Auto-save**: Automatic saving frequency

### Processing Settings
- **OCR Quality**: Text recognition accuracy
- **Image Processing**: Curve extraction precision
- **Model Generation**: SPICE model complexity
- **Export Format**: Output file formats

### Performance Settings
- **Memory Usage**: RAM allocation
- **Processing Threads**: CPU core usage
- **Cache Size**: Temporary file storage
- **Background Processing**: Enable/disable

## Troubleshooting

### Common Installation Issues

#### Windows
- **Permission Denied**: Run as administrator
- **Missing DLLs**: Install Visual C++ Redistributable
- **Antivirus Blocking**: Add exception to antivirus

#### macOS
- **Unidentified Developer**: Allow in Security settings
- **Gatekeeper Blocking**: Right-click and select "Open"
- **Permission Issues**: Grant full disk access

#### Linux
- **Missing Dependencies**: Install required packages
- **Permission Issues**: Check file permissions
- **Display Issues**: Update graphics drivers

### Performance Issues
- **Slow Processing**: Increase RAM allocation
- **High CPU Usage**: Reduce processing threads
- **Memory Errors**: Clear cache and restart
- **Crash on Startup**: Check system requirements

### Data Issues
- **Import Failures**: Check file format and size
- **Extraction Errors**: Verify PDF quality
- **Model Generation**: Check parameter completeness
- **Export Problems**: Verify output directory permissions

## Support

### Getting Help
1. **Check Documentation**: Review user guides
2. **Search Issues**: Look for similar problems
3. **Contact Support**: Submit detailed bug report
4. **Community Forum**: Ask other users

### System Information
When reporting issues, include:
- Operating system and version
- ESpice version
- System specifications
- Error messages and logs
- Steps to reproduce

### Updates
- **Automatic Updates**: Enable in settings
- **Manual Updates**: Download from website
- **Release Notes**: Review before updating
- **Backup**: Backup data before major updates 