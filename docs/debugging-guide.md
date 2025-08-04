# ESpice Debugging Guide

## Advanced Bug Fixing & Debugging Protocol

This guide provides comprehensive debugging procedures specifically designed for complex features like PDF processing and image extraction in the ESpice application.

## Bug Context Analysis Template

When reporting a bug, include the following information:

```
# BUG CONTEXT ANALYSIS

## Current Problem:
[Describe the exact issue - error messages, unexpected behavior, performance problems]

## Expected Behavior:
[What should happen when working correctly]

## Current Behavior:
[What is actually happening - include error logs, screenshots, or output examples]

## Environment:
- OS: [Windows/macOS/Linux]
- App Version: [Version number]
- Node.js Version: [Version number]
- Rust Version: [Version number]
- File Size: [If applicable]
- File Format: [If applicable]
```

## Systematic Debugging Protocol

### Phase 1: Deep Investigation (Required First)

Execute this comprehensive analysis before any code changes:

#### 1. Error Trace Analysis
- Examine the complete error stack trace
- Identify the exact line and function where failure occurs
- Check TypeScript compilation errors vs runtime errors
- Analyze console logs and network requests

#### 2. Data Flow Debugging
- Log input data at each processing stage
- Verify data transformations step-by-step
- Check type mismatches and null/undefined values
- Validate file format and structure assumptions

#### 3. Environment & Dependencies
- Verify all required dependencies are installed and compatible
- Check Tauri permissions for file system access
- Validate PDF processing library configurations
- Test with different file sizes and formats

#### 4. Reproduce with Minimal Test Case
- Create the smallest possible test case that reproduces the bug
- Test with known good data vs problematic data
- Isolate the specific component causing the issue

### Phase 2: Root Cause Identification

Based on the investigation, categorize the bug type:

#### A) PDF Processing Issues
- File access permissions in Tauri environment
- PDF parsing library limitations or configuration
- Memory issues with large PDF files
- Encoding problems (UTF-8, special characters)
- Table detection algorithm failures

#### B) Image Extraction Problems
- Canvas rendering issues in web context
- Image format compatibility (PNG, JPEG, embedded images)
- Coordinate system misalignment
- Image quality or resolution problems
- OCR or computer vision processing errors

#### C) Data Processing Bugs
- Type conversion errors (string to number)
- Regex pattern matching failures
- Array/object manipulation mistakes
- Async/await timing issues
- Data validation logic errors

#### D) UI/UX Integration Issues
- State management problems (React hooks)
- File upload component malfunctions
- Progress indicator or loading state bugs
- Error boundary not catching exceptions
- Memory leaks in component lifecycle

### Phase 3: Comprehensive Fix Implementation

For each identified issue, implement fixes with this approach:

#### 1. Create Failing Test First
```typescript
// Example for PDF table extraction bug
describe('PDF Table Extraction Bug Fix', () => {
  test('should extract parameters from complex table layout', async () => {
    const testPdf = 'test-files/problematic-datasheet.pdf';
    const extractor = new PDFExtractor();
    
    const result = await extractor.extractTables(testPdf);
    
    expect(result).toHaveLength(3);
    expect(result[0].parameters).toContainEqual({
      name: 'VTH',
      min: '2.0',
      typ: '2.5',
      max: '3.0',
      unit: 'V'
    });
  });
  
  test('should handle edge case: rotated table headers', async () => {
    // Test specific edge case that was failing
  });
});
```

#### 2. Implement Robust Error Handling
```typescript
// Example for image extraction with comprehensive error handling
async function extractImageFromPDF(pdfPage: PDFPage, bounds: Rectangle): Promise<ImageData> {
  try {
    // Validate inputs first
    if (!pdfPage || !bounds || bounds.width <= 0 || bounds.height <= 0) {
      throw new ValidationError('Invalid PDF page or bounds parameters');
    }
    
    // Check Tauri permissions
    if (!await hasFileSystemAccess()) {
      throw new PermissionError('File system access denied');
    }
    
    // Extract with fallback strategies
    let imageData: ImageData;
    try {
      imageData = await extractImageHighQuality(pdfPage, bounds);
    } catch (highQualityError) {
      console.warn('High quality extraction failed, trying fallback:', highQualityError);
      imageData = await extractImageFallback(pdfPage, bounds);
    }
    
    // Validate extracted data
    if (!imageData || imageData.data.length === 0) {
      throw new ExtractionError('No image data extracted from specified bounds');
    }
    
    return imageData;
    
  } catch (error) {
    // Log detailed context for debugging
    console.error('Image extraction failed:', {
      error: error.message,
      pdfPage: pdfPage ? 'valid' : 'null',
      bounds,
      timestamp: new Date().toISOString()
    });
    
    // Re-throw with context
    throw new ImageExtractionError(
      `Failed to extract image: ${error.message}`,
      { originalError: error, bounds, pageInfo: pdfPage?.getSize() }
    );
  }
}
```

#### 3. Add Comprehensive Logging
```typescript
// Enhanced logging for debugging complex data flows
class DebugLogger {
  static logPDFProcessing(stage: string, data: any, metadata?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔍 PDF Processing: ${stage}`);
      console.log('Data:', data);
      console.log('Metadata:', metadata);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }
  
  static logImageExtraction(bounds: Rectangle, result: ImageData | null) {
    console.log('📸 Image Extraction:', {
      bounds,
      success: !!result,
      dataSize: result?.data.length || 0,
      dimensions: result ? `${result.width}x${result.height}` : 'none'
    });
  }
}
```

### Phase 4: Validation & Performance Testing

#### 1. Test Multiple Scenarios
```typescript
// Comprehensive test suite for PDF processing
describe('PDF Processing - Real World Scenarios', () => {
  const testFiles = [
    'simple-datasheet.pdf',        // Basic case
    'complex-layout.pdf',          // Complex table layouts
    'large-file-50mb.pdf',         // Performance test
    'scanned-datasheet.pdf',       // OCR required
    'rotated-pages.pdf',           // Orientation issues
    'corrupted-file.pdf',          // Error handling
    'password-protected.pdf'       // Security test
  ];
  
  testFiles.forEach(filename => {
    test(`should process ${filename} correctly`, async () => {
      // Test implementation
    });
  });
});
```

#### 2. Performance Validation
- Monitor memory usage during processing
- Check processing time for different file sizes
- Validate UI responsiveness during heavy operations
- Test concurrent file processing

## Common Debugging Tools

### Browser DevTools
- **Console**: Check for JavaScript errors and logs
- **Network**: Monitor API calls and file uploads
- **Performance**: Profile memory usage and processing time
- **Sources**: Set breakpoints and step through code

### Tauri Debugging
- **Rust Console**: Check backend logs and errors
- **File System**: Verify file access permissions
- **Memory**: Monitor native memory usage
- **Performance**: Profile Rust backend operations

### PDF Processing Debugging
- **PDF.js Worker**: Check worker initialization and errors
- **File Validation**: Verify PDF file integrity
- **Memory Usage**: Monitor during large file processing
- **Error Boundaries**: Catch and handle PDF processing errors

## Debugging Checklist

### Before Starting Debugging
- [ ] Reproduce the issue consistently
- [ ] Check if it's a known issue in Bug_tracking.md
- [ ] Verify the development environment setup
- [ ] Create a minimal test case

### During Debugging
- [ ] Add comprehensive logging
- [ ] Test with different file types and sizes
- [ ] Check for memory leaks
- [ ] Validate error handling
- [ ] Test error recovery scenarios

### After Fixing
- [ ] Write tests for the fix
- [ ] Test with edge cases
- [ ] Update documentation
- [ ] Add to Bug_tracking.md if it was a new issue
- [ ] Verify the fix doesn't introduce new issues

## Performance Debugging

### Memory Issues
- Monitor memory usage during file processing
- Check for memory leaks in long-running operations
- Validate cleanup of temporary files and data
- Test with files of various sizes

### Processing Speed
- Profile processing time for different operations
- Identify bottlenecks in the processing pipeline
- Optimize algorithms for better performance
- Consider parallel processing for independent operations

### UI Responsiveness
- Ensure heavy operations don't block the UI
- Use web workers for CPU-intensive tasks
- Implement progress indicators for long operations
- Add cancellation support for user-initiated stops

## Error Recovery Strategies

### Graceful Degradation
- Provide fallback options when primary methods fail
- Show helpful error messages to users
- Allow manual correction of extracted data
- Save partial results when possible

### Data Validation
- Validate extracted data before saving
- Provide warnings for suspicious values
- Allow users to review and correct data
- Implement confidence scoring for extractions

### User Feedback
- Clear error messages with actionable steps
- Progress indicators for long operations
- Success confirmations for completed tasks
- Helpful suggestions for common issues 