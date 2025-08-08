# Datasheet Graph Extraction Guide

## Overview

The ESpice application now includes automatic graph extraction from datasheet PDFs. This feature allows users to upload datasheet files and automatically extract graph images, detect curves, and generate CSV data for SPICE model generation.

## Features

### 🎯 Core Functionality
- **Automatic Graph Detection**: Uses computer vision to identify graphs in datasheet images
- **Curve Extraction**: Extracts data points from detected curves using color analysis
- **CSV Export**: Exports extracted data in CSV format for further processing
- **Image Saving**: Saves extracted graph images for reference
- **Batch Processing**: Supports processing multiple graphs from a single datasheet

### 🔧 Technical Capabilities
- **Graph Detection**: Identifies graphs based on axes, grid lines, curves, and labels
- **Color Analysis**: Detects and analyzes curve colors for data extraction
- **Default Configurations**: Pre-configured settings for common graph types (output, transfer, capacitance)
- **Configurable Sensitivity**: Adjustable detection sensitivity to balance accuracy vs. false positives

## Usage

### 1. Adding a New Product with Datasheet

1. Click **"Add Product"** in the Product Management page
2. In the modal, you'll see a new **"Datasheet & Graph Extraction"** section
3. Click **"Upload Datasheet"** to open the datasheet upload modal
4. Drag and drop or select your datasheet PDF file
5. Configure extraction settings if needed
6. Click **"Start Graph Extraction"**
7. Review the extracted graphs and data
8. Export CSV data or save images as needed
9. Complete the product creation form (part number is required)

### 2. Datasheet Upload Modal

The datasheet upload modal provides:

#### Upload Tab
- **Drag & Drop Zone**: Supports PDF, CSV, Excel files (max 50MB each)
- **File List**: Shows uploaded files with processing status
- **Start Extraction Button**: Initiates the graph extraction process

#### Settings Tab
- **Auto-process graphs**: Automatically extract curves after detection
- **Save extracted images**: Save graph images to disk
- **Default Graph Type**: Set default graph type (output/transfer/capacitance)
- **Detection Sensitivity**: Adjust graph detection sensitivity (0.1-1.0)
- **Output Directory**: Specify where to save extracted images

#### Results Panel
- **Extraction Summary**: Shows total pages, extracted graphs, success/failure counts
- **Graph List**: Lists all detected graphs with confidence scores
- **Export Options**: Export CSV data or save images
- **Color Detection**: Shows detected colors for each graph

## Graph Types

### Output Characteristics
- **Default Config**: V_DS (V) vs I_D (A)
- **Range**: 0-10V, 0-50A
- **Use Case**: Drain-source voltage vs drain current curves

### Transfer Characteristics  
- **Default Config**: V_GS (V) vs I_D (A)
- **Range**: 0-5V, 0-20A
- **Use Case**: Gate-source voltage vs drain current curves

### Capacitance
- **Default Config**: V_DS (V) vs C (pF)
- **Range**: 0-100V, 0-1000pF
- **Use Case**: Drain-source voltage vs capacitance curves

### Custom
- **Default Config**: X vs Y
- **Range**: 0-10, 0-10
- **Use Case**: User-defined graph types

## Technical Implementation

### Services

#### DatasheetImageExtractionService
- **Location**: `apps/desktop/src/services/datasheetImageExtractionService.ts`
- **Purpose**: Main service for datasheet processing and graph extraction
- **Key Methods**:
  - `extractGraphImagesFromDatasheet()`: Main extraction method
  - `detectGraphInImage()`: Graph detection using computer vision
  - `processExtractedGraphs()`: Curve extraction from detected graphs
  - `exportCurvesToCSV()`: Export extracted data to CSV

#### EnhancedPDFProcessor
- **Location**: `apps/desktop/src/services/enhancedPDFProcessor.ts`
- **Purpose**: PDF processing and image extraction
- **Integration**: Used by DatasheetImageExtractionService for PDF handling

#### CurveExtractionService
- **Location**: `apps/desktop/src/services/curveExtractionService.ts`
- **Purpose**: Curve extraction from images
- **Integration**: Used by DatasheetImageExtractionService for curve analysis

### Components

#### DatasheetUploadModal
- **Location**: `apps/desktop/src/components/DatasheetUploadModal.tsx`
- **Purpose**: Main UI component for datasheet upload and extraction
- **Features**:
  - File upload with drag & drop
  - Configuration settings
  - Real-time extraction results
  - Export functionality

#### ProductManagementPage
- **Location**: `apps/desktop/src/pages/ProductManagementPage.tsx`
- **Integration**: Updated to include datasheet upload functionality
- **Changes**:
  - Added datasheet upload section to "Add Product" modal
  - Removed product name field (auto-generated from part number)
  - Added extraction result display

## Graph Detection Algorithm

### Feature Detection
1. **Axes Detection**: Uses Hough line transform to detect straight lines
2. **Grid Detection**: Identifies evenly spaced horizontal/vertical lines
3. **Curve Detection**: Analyzes color patterns for non-linear features
4. **Label Detection**: Identifies small, isolated dark regions (potential text)
5. **Color Analysis**: Counts unique colors and analyzes color distribution

### Confidence Scoring
- **Axes Present**: +0.3 confidence
- **Grid Lines**: +0.2 confidence  
- **Curves Detected**: +0.3 confidence
- **Labels Present**: +0.1 confidence
- **Multiple Colors**: +0.1 confidence
- **Axes + Curves**: +0.1 bonus

### Default Threshold
- **Minimum Confidence**: 0.7 (configurable)
- **Graph Classification**: Based on detected features and color count

## Testing

### Test Script
- **Location**: `examples/test_datasheet_extraction.py`
- **Purpose**: Verify extraction functionality with EPC2040 datasheet
- **Tests**:
  - PDF file validation
  - Image extraction capabilities
  - Graph detection algorithm
  - Curve extraction logic

### Running Tests
```bash
cd examples
python test_datasheet_extraction.py
```

## Configuration

### Default Settings
```typescript
{
  extractGraphs: true,
  extractText: true,
  extractImages: true,
  graphDetectionSensitivity: 0.7,
  defaultGraphType: 'output',
  autoProcessGraphs: true,
  saveExtractedImages: true,
  outputDirectory: 'extracted_graphs'
}
```

### Sensitivity Levels
- **0.1-0.3**: Very strict (fewer false positives, may miss some graphs)
- **0.4-0.6**: Moderate (balanced detection)
- **0.7-0.9**: Relaxed (more graphs detected, may include false positives)
- **1.0**: Very relaxed (detects most graph-like images)

## File Formats

### Supported Input
- **PDF**: Datasheet files (primary format)
- **CSV**: Data point files (for manual upload)
- **Excel**: .xls, .xlsx files (for data import)

### Output Formats
- **CSV**: Extracted curve data
- **PNG**: Extracted graph images
- **JSON**: Processing metadata and results

## Error Handling

### Common Issues
1. **PDF Processing Errors**: Invalid PDF format or corrupted files
2. **Image Extraction Failures**: PDFs without embedded images
3. **Graph Detection Failures**: Low-quality images or unusual graph formats
4. **Curve Extraction Errors**: Insufficient color contrast or complex backgrounds

### Troubleshooting
- **No Graphs Detected**: Lower detection sensitivity or check image quality
- **Poor Curve Extraction**: Verify graph has good color contrast
- **Processing Timeouts**: Reduce file size or simplify extraction settings
- **Memory Issues**: Process smaller files or reduce batch size

## Future Enhancements

### Planned Features
- **OCR Integration**: Extract axis labels and values
- **Machine Learning**: Improved graph detection using ML models
- **Batch Processing**: Process multiple datasheets simultaneously
- **Template Matching**: Pre-defined templates for common graph types
- **Real-time Preview**: Live preview during extraction process

### Performance Optimizations
- **Parallel Processing**: Multi-threaded image processing
- **Caching**: Cache processed results for faster re-processing
- **Compression**: Optimize image storage and transfer
- **Streaming**: Process large files without loading entirely into memory

## Integration Notes

### Dependencies
- **PDF.js**: PDF processing and rendering
- **Canvas API**: Image analysis and manipulation
- **OpenCV.js**: Computer vision operations (optional)
- **Tauri**: File system operations and native integration

### Browser Compatibility
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Limited support (some Canvas operations may differ)

### Performance Considerations
- **Large Files**: Files >50MB may cause performance issues
- **Memory Usage**: Image processing can be memory-intensive
- **Processing Time**: Complex graphs may take several seconds to process
- **Concurrent Operations**: Limit simultaneous extractions to avoid resource conflicts

## Support

For issues or questions about the datasheet graph extraction functionality:

1. Check the troubleshooting section above
2. Review the test script output for diagnostic information
3. Verify file formats and sizes meet requirements
4. Test with the EPC2040 sample datasheet
5. Check browser console for error messages

## Sample Usage

### EPC2040 Datasheet
The EPC2040 datasheet is used as a reference implementation:
- **Location**: `services/web-scraper/datasheets/epc/epc2040_datasheet.pdf`
- **Test Script**: `examples/test_datasheet_extraction.py`
- **Expected Results**: Multiple output and transfer characteristic graphs

### Typical Workflow
1. Upload EPC2040 datasheet
2. Set default graph type to "output"
3. Start extraction with 0.7 sensitivity
4. Review detected graphs (should find 3-5 graphs)
5. Export CSV data for SPICE model generation
6. Save extracted images for reference 