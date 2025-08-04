# Architecture Overview

## System Architecture

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Frontend │ │ Backend │ │ Data Layer │
│ (React/TS) │◄──►│ (Tauri/Rust) │◄──►│ (SQLite) │
└─────────────────┘ └─────────────────┘ └─────────────────┘
│ │ │
▼ ▼ ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ UI Components │ │ Data Processors│ │ Models │
│ - File Upload │ │ - PDF Parser │ │ - Products │
│ - Data Tables │ │ - Image OCR │ │ - Parameters │
│ - Model View │ │ - SPICE Gen │ │ - Models │
└─────────────────┘ └─────────────────┘ └─────────────────┘

## Core Modules

### 1. Data Extraction Engine
- **PDF Parser**: Extract text and tables from datasheets
- **Image Processor**: Extract curves from graphs using OpenCV
- **Data Validator**: Ensure extracted data quality

### 2. SPICE Model Generator
- **Template Engine**: Use predefined SPICE model templates
- **Parameter Mapper**: Map extracted data to SPICE parameters
- **Model Validator**: Verify generated models

### 3. Product Management
- **Product Database**: Store device information and parameters
- **Version Control**: Track model versions and changes
- **Export System**: Generate files for various EDA tools

## Data Flow
1. **Input**: PDF datasheet uploaded
2. **Parse**: Extract text, tables, and images
3. **Process**: Identify parameters and values
4. **Validate**: Check data consistency
5. **Generate**: Create SPICE model
6. **Export**: Save to target format