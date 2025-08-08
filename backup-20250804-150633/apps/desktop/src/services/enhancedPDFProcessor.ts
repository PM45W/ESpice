import * as pdfjsLib from 'pdfjs-dist';
import type {
  PDFProcessingResult,
  PDFMetadata,
  PDFProcessingOptions,
  ExtractedTable,
  ExtractedParameter,
  PDFProcessingError,
  ProcessingProgress,
  OCRResult,
  LayoutAnalysisResult
} from '../types/pdf';
import { PDFErrorCode } from '../types/pdf';

// Configure PDF.js worker
const configureWorker = () => {
  try {
    const workerUrl = new URL('/pdf.worker.min.js', import.meta.url).href;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    console.log('PDF.js worker configured with URL:', workerUrl);
  } catch (error) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    console.log('PDF.js worker configured with fallback path: /pdf.worker.min.js');
  }
};

configureWorker();

export class EnhancedPDFProcessor {
  private static instance: EnhancedPDFProcessor;
  private cache: Map<string, PDFProcessingResult> = new Map();

  public static getInstance(): EnhancedPDFProcessor {
    if (!EnhancedPDFProcessor.instance) {
      EnhancedPDFProcessor.instance = new EnhancedPDFProcessor();
    }
    return EnhancedPDFProcessor.instance;
  }

  /**
   * Enhanced PDF processing with OCR and layout analysis
   */
  public async processPDF(
    file: File,
    options: PDFProcessingOptions = {},
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<PDFProcessingResult> {
    const startTime = performance.now();
    const fileHash = await this.generateFileHash(file);

    // Check cache first
    if (this.cache.has(fileHash)) {
      console.log('Returning cached result for:', file.name);
      return this.cache.get(fileHash)!;
    }

    try {
      // Stage 1: Reading file
      onProgress?.({
        stage: 'reading',
        progress: 10,
        message: 'Reading PDF file...'
      });

      const arrayBuffer = await this.fileToArrayBuffer(file);
      
      // Stage 2: Parsing PDF
      onProgress?.({
        stage: 'parsing',
        progress: 20,
        message: 'Parsing PDF structure...'
      });

      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      // Stage 3: Extract text with layout preservation
      onProgress?.({
        stage: 'extracting',
        progress: 30,
        message: 'Extracting text with layout...'
      });

      const { text, pageCount, layoutInfo } = await this.extractTextWithLayout(pdfDoc, onProgress);
      const metadata = await this.extractMetadata(pdfDoc, file.size);

      // Stage 4: Extract images for OCR
      onProgress?.({
        stage: 'extracting',
        progress: 50,
        message: 'Extracting images for OCR...'
      });

      const images = await this.extractImages(pdfDoc);
      
      // Stage 5: Perform OCR on images
      onProgress?.({
        stage: 'extracting',
        progress: 60,
        message: 'Performing OCR on images...'
      });

      const ocrResults = await this.performOCR(images);
      
      // Stage 6: Enhanced table detection
      onProgress?.({
        stage: 'extracting',
        progress: 70,
        message: 'Detecting tables with enhanced algorithms...'
      });

      const tables = await this.detectTablesEnhanced(text, layoutInfo, ocrResults);
      
      // Stage 7: Semantic parameter extraction
      onProgress?.({
        stage: 'extracting',
        progress: 85,
        message: 'Extracting parameters with semantic analysis...'
      });

      const parameters = await this.extractParametersSemantic(text, tables, ocrResults);
      
      // Initialize result
      const result: PDFProcessingResult = {
        success: true,
        text,
        pageCount,
        metadata,
        processingTime: performance.now() - startTime,
        tables,
        parameters,
        ocrResults,
        layoutInfo,
        cacheKey: fileHash
      };

      // Cache the result
      this.cache.set(fileHash, result);

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Processing complete'
      });

      return result;

    } catch (error) {
      const errorResult: PDFProcessingResult = {
        success: false,
        text: '',
        pageCount: 0,
        metadata: { pages: 0, encrypted: false, fileSize: file.size },
        processingTime: performance.now() - startTime,
        error: this.handleError(error)
      };
      return errorResult;
    }
  }

  /**
   * Extract text with layout preservation
   */
  private async extractTextWithLayout(
    pdfDoc: pdfjsLib.PDFDocumentProxy, 
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<{ text: string; pageCount: number; layoutInfo: LayoutAnalysisResult }> {
    let fullText = '';
    const layoutInfo: LayoutAnalysisResult = {
      pages: [],
      textBlocks: [],
      tables: [],
      images: []
    };

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      onProgress?.({
        stage: 'extracting',
        progress: 30 + (pageNum / pdfDoc.numPages) * 20,
        message: `Processing page ${pageNum}/${pdfDoc.numPages}`
      });

      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Analyze layout structure
      const pageLayout = this.analyzePageLayout(textContent, pageNum);
      layoutInfo.pages.push(pageLayout);

      // Extract text with positioning information
      let pageText = '';
      for (const item of textContent.items) {
        const textItem = item as any;
        pageText += textItem.str + ' ';
        
        // Store text block information
        layoutInfo.textBlocks.push({
          text: textItem.str,
          page: pageNum,
          x: textItem.transform[4],
          y: textItem.transform[5],
          width: textItem.width,
          height: textItem.height,
          fontSize: Math.sqrt(textItem.transform[0] * textItem.transform[0] + textItem.transform[1] * textItem.transform[1])
        });
      }
      
      fullText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
    }

    return { text: fullText, pageCount: pdfDoc.numPages, layoutInfo };
  }

  /**
   * Analyze page layout structure
   */
  private analyzePageLayout(textContent: pdfjsLib.TextContent, pageNum: number) {
    const textItems = textContent.items as any[];
    
    // Group text items by vertical position (lines)
    const lines = new Map<number, any[]>();
    textItems.forEach(item => {
      const y = Math.round(item.transform[5]);
      if (!lines.has(y)) {
        lines.set(y, []);
      }
      lines.get(y)!.push(item);
    });

    // Sort lines by Y position (top to bottom)
    const sortedLines = Array.from(lines.entries())
      .sort(([a], [b]) => b - a) // Reverse sort for top-to-bottom
      .map(([y, items]) => ({
        y,
        items: items.sort((a: any, b: any) => a.transform[4] - b.transform[4]) // Sort by X position
      }));

    return {
      pageNum,
      lineCount: sortedLines.length,
      lines: sortedLines,
      textBlocks: textItems.length
    };
  }

  /**
   * Extract images from PDF for OCR processing
   */
  private async extractImages(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<ImageData[]> {
    const images: ImageData[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const operatorList = await page.getOperatorList();
      
      // Extract image objects from operator list
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        if (operatorList.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
          const imageObj = operatorList.argsArray[i][0];
          try {
            const image = await page.objs.get(imageObj);
            if (image) {
              images.push({
                pageNum,
                data: image.data,
                width: image.width,
                height: image.height,
                format: image.format
              });
            }
          } catch (error) {
            console.warn('Failed to extract image:', error);
          }
        }
      }
    }

    return images;
  }

  /**
   * Perform OCR on extracted images
   */
  private async performOCR(images: ImageData[]): Promise<OCRResult[]> {
    const ocrResults: OCRResult[] = [];

    for (const image of images) {
      try {
        // Convert image data to base64 for OCR processing
        const base64Data = this.imageDataToBase64(image);
        
        // Call MCP server for OCR processing
        const ocrResult = await this.callMCPServerOCR(base64Data, image.pageNum);
        ocrResults.push(ocrResult);
        } catch (error) {
        console.warn('OCR failed for image on page', image.pageNum, error);
        ocrResults.push({
          pageNum: image.pageNum,
          text: '',
          confidence: 0,
          error: error instanceof Error ? error.message : 'Unknown OCR error'
        });
      }
    }

    return ocrResults;
  }

  /**
   * Enhanced table detection with layout analysis
   */
  private async detectTablesEnhanced(
    text: string,
    layoutInfo: LayoutAnalysisResult, 
    ocrResults: OCRResult[]
  ): Promise<ExtractedTable[]> {
    const tables: ExtractedTable[] = [];
    
    // Combine OCR text with extracted text
    const combinedText = this.combineTextWithOCR(text, ocrResults);
    
    // Use layout information for better table detection
    const layoutTables = this.detectTablesFromLayout(layoutInfo);
    tables.push(...layoutTables);
    
    // Use pattern-based detection as fallback
    const patternTables = this.extractTablesPattern(combinedText);
    tables.push(...patternTables);
    
    // Remove duplicates and merge similar tables
    return this.mergeAndDeduplicateTables(tables);
  }

  /**
   * Detect tables using layout information
   */
  private detectTablesFromLayout(layoutInfo: LayoutAnalysisResult): ExtractedTable[] {
    const tables: ExtractedTable[] = [];
    
    layoutInfo.pages.forEach(page => {
      // Look for table-like structures in layout
      const tableCandidates = this.findTableCandidates(page);
      
      tableCandidates.forEach((candidate, index) => {
        tables.push({
          id: `table-layout-${page.pageNum}-${index}`,
          title: candidate.title,
          headers: candidate.headers,
          rows: candidate.rows,
          pageNumber: page.pageNum,
          confidence: candidate.confidence,
          extractionMethod: 'layout',
          validationStatus: 'valid'
        });
      });
    });
    
    return tables;
  }

  /**
   * Find table candidates in page layout
   */
  private findTableCandidates(page: any): any[] {
    const candidates: any[] = [];
    
    // Group lines that might form tables
    const lineGroups = this.groupLinesBySpacing(page.lines);
    
    lineGroups.forEach(group => {
      if (this.isTableStructure(group)) {
        const table = this.extractTableFromLines(group);
        if (table) {
          candidates.push(table);
        }
      }
    });
    
    return candidates;
  }

  /**
   * Group lines by consistent spacing (table indicator)
   */
  private groupLinesBySpacing(lines: any[]): any[][] {
    const groups: any[][] = [];
    let currentGroup: any[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (currentGroup.length === 0) {
        currentGroup.push(line);
      } else {
        const lastLine = currentGroup[currentGroup.length - 1];
        const spacing = Math.abs(line.y - lastLine.y);
        
        // If spacing is consistent (within 20% tolerance), add to current group
        const avgSpacing = this.calculateAverageSpacing(currentGroup);
        if (Math.abs(spacing - avgSpacing) / avgSpacing < 0.2) {
          currentGroup.push(line);
        } else {
          if (currentGroup.length >= 3) { // Minimum table size
            groups.push([...currentGroup]);
          }
          currentGroup = [line];
        }
      }
    }
    
    if (currentGroup.length >= 3) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  /**
   * Check if a group of lines forms a table structure
   */
  private isTableStructure(lineGroup: any[]): boolean {
    if (lineGroup.length < 3) return false;
    
    // Check for consistent column structure
    const columnCounts = lineGroup.map(line => line.items.length);
    const avgColumns = columnCounts.reduce((a, b) => a + b, 0) / columnCounts.length;
    
    // At least 80% of lines should have similar column count
    const consistentLines = columnCounts.filter(count => 
      Math.abs(count - avgColumns) <= 1
    ).length;
    
    return consistentLines / lineGroup.length >= 0.8 && avgColumns >= 2;
  }

  /**
   * Extract table from grouped lines
   */
  private extractTableFromLines(lineGroup: any[]): any | null {
    try {
      // First line as headers
      const headers = lineGroup[0].items.map((item: any) => item.str.trim());
      
      // Remaining lines as data rows
      const rows = lineGroup.slice(1).map(line => 
        line.items.map((item: any) => item.str.trim())
      );
      
      // Calculate confidence based on structure consistency
      const confidence = this.calculateTableConfidence(headers, rows);

    return {
        title: this.extractTableTitle(lineGroup),
        headers,
        rows,
        confidence
      };
    } catch (error) {
      console.warn('Failed to extract table from lines:', error);
      return null;
    }
  }

  /**
   * Calculate table confidence score
   */
  private calculateTableConfidence(headers: string[], rows: string[][]): number {
    let confidence = 0.5; // Base confidence
    
    // Check header quality
    const headerQuality = this.assessHeaderQuality(headers);
    confidence += headerQuality * 0.2;
    
    // Check row consistency
    const rowConsistency = this.assessRowConsistency(rows);
    confidence += rowConsistency * 0.2;
    
    // Check for semiconductor-specific patterns
    const semiconductorPatterns = this.checkSemiconductorPatterns(headers, rows);
    confidence += semiconductorPatterns * 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Assess header quality
   */
  private assessHeaderQuality(headers: string[]): number {
    let quality = 0;
    
    headers.forEach(header => {
      // Check for common table header patterns
      if (/parameter|symbol|value|unit|condition|min|typ|max/i.test(header)) {
        quality += 0.2;
      }
      // Check for reasonable length
      if (header.length > 0 && header.length < 50) {
        quality += 0.1;
      }
    });
    
    return Math.min(quality, 1.0);
  }

  /**
   * Assess row consistency
   */
  private assessRowConsistency(rows: string[][]): number {
    if (rows.length === 0) return 0;
    
    const expectedColumns = rows[0].length;
    let consistentRows = 0;
    
    rows.forEach(row => {
      if (row.length === expectedColumns) {
        consistentRows++;
      }
    });
    
    return consistentRows / rows.length;
  }

  /**
   * Check for semiconductor-specific patterns
   */
  private checkSemiconductorPatterns(headers: string[], rows: string[][]): number {
    const semiconductorParams = [
      'vth', 'rds', 'idss', 'bvdss', 'ciss', 'coss', 'crss', 'qg',
      'vgs', 'vds', 'ids', 'vds', 'vg', 'vd', 'vs', 'vgth'
    ];
    
    let patternScore = 0;
    
    // Check headers
    headers.forEach(header => {
      if (semiconductorParams.some(param => 
        header.toLowerCase().includes(param)
      )) {
        patternScore += 0.1;
      }
    });
    
    // Check for numeric values in rows
    rows.forEach(row => {
      const numericValues = row.filter(cell => 
        /^-?\d+\.?\d*/.test(cell.trim())
      ).length;
      if (numericValues > 0) {
        patternScore += 0.05;
      }
    });
    
    return Math.min(patternScore, 1.0);
  }

  /**
   * Extract table title from surrounding context
   */
  private extractTableTitle(lineGroup: any[]): string {
    // Look for title in lines before the table
    const firstLine = lineGroup[0];
    const titleCandidates = [];
    
    // Check if first line might be a title
    const firstLineText = firstLine.items.map((item: any) => item.str).join(' ');
    if (firstLineText.length > 10 && firstLineText.length < 100) {
      titleCandidates.push(firstLineText);
    }
    
    return titleCandidates[0] || '';
  }

  /**
   * Semantic parameter extraction with context awareness
   */
  private async extractParametersSemantic(
    text: string, 
    tables: ExtractedTable[], 
    ocrResults: OCRResult[]
  ): Promise<ExtractedParameter[]> {
    const parameters: ExtractedParameter[] = [];
    
    // Extract from tables with semantic analysis
    tables.forEach(table => {
      const tableParams = this.extractParametersFromTableSemantic(table);
      parameters.push(...tableParams);
    });
    
    // Extract from text with context awareness
    const textParams = this.extractParametersFromTextSemantic(text);
    parameters.push(...textParams);
    
    // Extract from OCR results
    ocrResults.forEach(ocrResult => {
      const ocrParams = this.extractParametersFromTextSemantic(ocrResult.text);
      ocrParams.forEach(param => {
        param.pageNumber = ocrResult.pageNum;
        param.confidence *= ocrResult.confidence; // Adjust confidence based on OCR confidence
      });
      parameters.push(...ocrParams);
    });
    
    // Remove duplicates and merge similar parameters
    return this.mergeAndValidateParameters(parameters);
  }

  /**
   * Extract parameters from table with semantic analysis
   */
  private extractParametersFromTableSemantic(table: ExtractedTable): ExtractedParameter[] {
    const parameters: ExtractedParameter[] = [];
    
    if (!table.headers || table.headers.length === 0) return parameters;
    
    // Find parameter name and value columns
    const paramNameCol = this.findParameterNameColumn(table.headers);
    const valueCol = this.findValueColumn(table.headers);
    const unitCol = this.findUnitColumn(table.headers);
    const conditionCol = this.findConditionColumn(table.headers);
    
    table.rows.forEach((row, rowIndex) => {
      if (paramNameCol >= 0 && valueCol >= 0 && row[paramNameCol] && row[valueCol]) {
        const paramName = row[paramNameCol].trim();
        const paramValue = row[valueCol].trim();
        
        // Validate parameter name and value
        if (this.isValidParameterName(paramName) && this.isValidParameterValue(paramValue)) {
          const parameter: ExtractedParameter = {
            id: `param-${table.id}-${rowIndex}`,
            name: paramName,
            value: this.parseParameterValue(paramValue),
            unit: unitCol >= 0 ? row[unitCol]?.trim() : undefined,
            condition: conditionCol >= 0 ? row[conditionCol]?.trim() : undefined,
        tableId: table.id,
        pageNumber: table.pageNumber,
            confidence: table.confidence,
            dataType: this.classifyParameterType(paramName),
        validationStatus: 'valid'
      };

          parameters.push(parameter);
        }
      }
    });

    return parameters;
  }

  /**
   * Find parameter name column in table headers
   */
  private findParameterNameColumn(headers: string[]): number {
    const paramPatterns = [
      /parameter/i, /symbol/i, /name/i, /description/i
    ];
    
    for (let i = 0; i < headers.length; i++) {
      if (paramPatterns.some(pattern => pattern.test(headers[i]))) {
        return i;
      }
    }
    
    // Fallback: return first column if no clear parameter column found
    return 0;
  }

  /**
   * Find value column in table headers
   */
  private findValueColumn(headers: string[]): number {
    const valuePatterns = [
      /value/i, /min/i, /typ/i, /max/i, /minimum/i, /typical/i, /maximum/i
    ];
    
    for (let i = 0; i < headers.length; i++) {
      if (valuePatterns.some(pattern => pattern.test(headers[i]))) {
        return i;
      }
    }
    
    // Fallback: return second column if no clear value column found
    return headers.length > 1 ? 1 : 0;
  }

  /**
   * Find unit column in table headers
   */
  private findUnitColumn(headers: string[]): number {
    const unitPatterns = [/unit/i, /units/i];
    
    for (let i = 0; i < headers.length; i++) {
      if (unitPatterns.some(pattern => pattern.test(headers[i]))) {
        return i;
      }
    }
    
    return -1; // No unit column found
  }

  /**
   * Find condition column in table headers
   */
  private findConditionColumn(headers: string[]): number {
    const conditionPatterns = [/condition/i, /test.*condition/i, /note/i];
    
    for (let i = 0; i < headers.length; i++) {
      if (conditionPatterns.some(pattern => pattern.test(headers[i]))) {
        return i;
      }
    }
    
    return -1; // No condition column found
  }

  /**
   * Validate parameter name
   */
  private isValidParameterName(name: string): boolean {
    if (!name || name.length < 1 || name.length > 50) return false;
    
    // Check for common semiconductor parameter patterns
    const validPatterns = [
      /^[a-zA-Z][a-zA-Z0-9_]*$/i, // Alphanumeric with underscore
      /^[a-zA-Z][a-zA-Z0-9_]*\s*\([^)]*\)$/i, // With parentheses
      /^[a-zA-Z][a-zA-Z0-9_]*\s*\[[^\]]*\]$/i // With brackets
    ];
    
    return validPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Validate parameter value
   */
  private isValidParameterValue(value: string): boolean {
    if (!value || value.length === 0) return false;
    
    // Check for numeric patterns
    const numericPatterns = [
      /^-?\d+\.?\d*$/, // Simple number
      /^-?\d+\.?\d*[eE][+-]?\d+$/, // Scientific notation
      /^-?\d+\.?\d*\s*[a-zA-Z%]+$/, // Number with unit
      /^[<>]?\s*-?\d+\.?\d*/, // With comparison operators
      /^[a-zA-Z]+/ // Text values (for conditions, etc.)
    ];
    
    return numericPatterns.some(pattern => pattern.test(value.trim()));
  }

  /**
   * Parse parameter value
   */
  private parseParameterValue(value: string): string | number {
    const cleanValue = value.trim();
    
    // Try to parse as number
    const numericMatch = cleanValue.match(/^(-?\d+\.?\d*)/);
    if (numericMatch) {
      const num = parseFloat(numericMatch[1]);
      if (!isNaN(num)) {
        return num;
      }
    }
    
    return cleanValue;
  }

  /**
   * Classify parameter type
   */
  private classifyParameterType(name: string): 'electrical' | 'thermal' | 'mechanical' | 'other' {
    const electricalPatterns = [
      /v[gds]|i[d]|r[ds]|c[iss|oss|rss]|q[g]|t[on|off]/i,
      /voltage|current|resistance|capacitance|charge|time/i
    ];
    
    const thermalPatterns = [
      /temp|thermal|heat|junction/i
    ];
    
    const mechanicalPatterns = [
      /size|dimension|weight|package/i
    ];
    
    if (electricalPatterns.some(pattern => pattern.test(name))) {
      return 'electrical';
    } else if (thermalPatterns.some(pattern => pattern.test(name))) {
      return 'thermal';
    } else if (mechanicalPatterns.some(pattern => pattern.test(name))) {
      return 'mechanical';
    }
    
    return 'other';
  }

  /**
   * Extract parameters from text with semantic analysis
   */
  private extractParametersFromTextSemantic(text: string): ExtractedParameter[] {
    const parameters: ExtractedParameter[] = [];
    
    // Split text into sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    sentences.forEach((sentence, index) => {
      // Look for parameter patterns in sentence
      const paramMatches = this.findParameterPatterns(sentence);
      
      paramMatches.forEach(match => {
        const parameter: ExtractedParameter = {
          id: `param-text-${index}-${match.name}`,
          name: match.name,
          value: match.value,
          unit: match.unit,
          condition: match.condition,
          pageNumber: 1, // Will be updated by caller
          confidence: 0.6, // Lower confidence for text extraction
          dataType: this.classifyParameterType(match.name),
          validationStatus: 'valid'
        };
        
        parameters.push(parameter);
      });
    });
    
    return parameters;
  }

  /**
   * Find parameter patterns in text
   */
  private findParameterPatterns(text: string): any[] {
    const patterns = [
      // Pattern: Parameter name = value unit
      /([a-zA-Z][a-zA-Z0-9_]*)\s*[=:]\s*(-?\d+\.?\d*)\s*([a-zA-Z%]+)?/gi,
      // Pattern: Parameter name value unit
      /([a-zA-Z][a-zA-Z0-9_]*)\s+(-?\d+\.?\d*)\s+([a-zA-Z%]+)/gi,
      // Pattern: Value unit parameter name
      /(-?\d+\.?\d*)\s+([a-zA-Z%]+)\s+([a-zA-Z][a-zA-Z0-9_]*)/gi
    ];
    
    const matches: any[] = [];
    
    patterns.forEach(pattern => {
        let match;
      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          name: match[1] || match[3],
          value: match[2] || match[1],
          unit: match[3] || match[2],
          condition: this.extractCondition(text, match.index)
        });
      }
    });
    
    return matches;
  }

  /**
   * Extract condition from surrounding text
   */
  private extractCondition(text: string, matchIndex: number): string | undefined {
    const beforeText = text.substring(Math.max(0, matchIndex - 100), matchIndex);
    const afterText = text.substring(matchIndex, Math.min(text.length, matchIndex + 100));
    
    // Look for condition patterns
    const conditionPatterns = [
      /@\s*([^,;]+)/i,
      /at\s+([^,;]+)/i,
      /when\s+([^,;]+)/i,
      /condition[:\s]+([^,;]+)/i
    ];
    
    for (const pattern of conditionPatterns) {
      const beforeMatch = beforeText.match(pattern);
      if (beforeMatch) return beforeMatch[1].trim();
      
      const afterMatch = afterText.match(pattern);
      if (afterMatch) return afterMatch[1].trim();
    }
    
    return undefined;
  }

  /**
   * Merge and validate parameters
   */
  private mergeAndValidateParameters(parameters: ExtractedParameter[]): ExtractedParameter[] {
    const merged: ExtractedParameter[] = [];
    const seen = new Map<string, ExtractedParameter>();
    
    parameters.forEach(param => {
      const key = param.name.toLowerCase();
      
      if (seen.has(key)) {
        // Merge with existing parameter
        const existing = seen.get(key)!;
        existing.confidence = Math.max(existing.confidence, param.confidence);
        
        // Merge values if they're different
        if (existing.value !== param.value) {
          if (typeof existing.value === 'number' && typeof param.value === 'number') {
            // Take the more reasonable value (closer to typical ranges)
            existing.value = this.selectBetterValue(existing.value, param.value, param.name);
          }
        }
        
        // Merge units if different
        if (existing.unit !== param.unit && param.unit) {
          existing.unit = param.unit;
        }
      } else {
        // New parameter
        seen.set(key, { ...param });
        merged.push(seen.get(key)!);
      }
    });
    
    return merged;
  }

  /**
   * Select better value between two options
   */
  private selectBetterValue(val1: number, val2: number, paramName: string): number {
    // Define typical ranges for common parameters
    const typicalRanges: { [key: string]: [number, number] } = {
      'vth': [0.5, 5],
      'rds': [0.01, 100],
      'idss': [0.1, 100],
      'bvdss': [20, 1000],
      'ciss': [0.1, 1000],
      'coss': [0.1, 1000],
      'crss': [0.1, 100]
    };
    
    const range = typicalRanges[paramName.toLowerCase()];
    if (range) {
      const [min, max] = range;
      const val1InRange = val1 >= min && val1 <= max;
      const val2InRange = val2 >= min && val2 <= max;
      
      if (val1InRange && !val2InRange) return val1;
      if (val2InRange && !val1InRange) return val2;
    }
    
    // Default to the first value
    return val1;
  }

  /**
   * Merge and deduplicate tables
   */
  private mergeAndDeduplicateTables(tables: ExtractedTable[]): ExtractedTable[] {
    const merged: ExtractedTable[] = [];
    const seen = new Map<string, ExtractedTable>();
    
    tables.forEach(table => {
      const key = `${table.pageNumber}-${table.headers?.join('-') || ''}`;
      
      if (seen.has(key)) {
        // Merge with existing table
        const existing = seen.get(key)!;
        existing.confidence = Math.max(existing.confidence, table.confidence);
        
        // Merge rows
        if (table.rows && table.rows.length > 0) {
          existing.rows.push(...table.rows);
        }
      } else {
        // New table
        seen.set(key, { ...table });
        merged.push(seen.get(key)!);
      }
    });
    
    return merged;
  }

  /**
   * Combine text with OCR results
   */
  private combineTextWithOCR(text: string, ocrResults: OCRResult[]): string {
    let combinedText = text;
    
    ocrResults.forEach(ocrResult => {
      if (ocrResult.text && ocrResult.confidence > 0.7) {
        combinedText += `\n--- OCR Page ${ocrResult.pageNum} ---\n${ocrResult.text}\n`;
      }
    });
    
    return combinedText;
  }

  /**
   * Legacy pattern-based table extraction (fallback)
   */
  private extractTablesPattern(text: string): ExtractedTable[] {
    // This is the original pattern-based extraction as fallback
    const tables: ExtractedTable[] = [];
    const lines = text.split('\n');
    
    let currentTable: Partial<ExtractedTable> | null = null;
    let pageNumber = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Track page numbers
      if (line.includes('--- Page') && /\d+/.test(line)) {
        const match = line.match(/--- Page (\d+) ---/);
        if (match) pageNumber = parseInt(match[1]);
        continue;
      }
      
      if (this.isTableHeader(line)) {
        if (currentTable && currentTable.rows && currentTable.rows.length > 0) {
          tables.push(this.finalizeTable(currentTable, pageNumber));
        }
        
        currentTable = {
          id: `table-${tables.length + 1}`,
          headers: this.parseTableRow(line),
          rows: [],
          pageNumber,
          confidence: 0.7,
          extractionMethod: 'pattern',
          validationStatus: 'valid'
        };
      }
      else if (currentTable && this.isTableRow(line, currentTable.headers?.length || 0)) {
        currentTable.rows = currentTable.rows || [];
        currentTable.rows.push(this.parseTableRow(line));
      }
      else if (currentTable && line.length > 0 && !this.isTableRow(line, currentTable.headers?.length || 0)) {
        if (currentTable.rows && currentTable.rows.length > 0) {
          tables.push(this.finalizeTable(currentTable, pageNumber));
        }
        currentTable = null;
      }
    }
    
    if (currentTable && currentTable.rows && currentTable.rows.length > 0) {
      tables.push(this.finalizeTable(currentTable, pageNumber));
    }
    
    return tables;
  }

  /**
   * Legacy helper methods (from original implementation)
   */
  private isTableHeader(line: string): boolean {
    const headerPatterns = [
      /parameter/i, /symbol/i, /min.*typ.*max/i, /condition/i, /unit/i, /characteristics/i, /test.*condition/i,
      /electrical.*characteristics/i, /thermal.*characteristics/i, /mechanical.*characteristics/i,
      /absolute.*maximum.*ratings/i, /switching.*characteristics/i, /capacitance.*characteristics/i,
    ];
    return headerPatterns.some(pattern => pattern.test(line)) && line.split(/\s+/).length >= 3;
  }

  private isTableRow(line: string, expectedColumns: number): boolean {
    const columns = this.parseTableRow(line);
    return columns.length >= Math.max(2, expectedColumns - 1) && 
           columns.length <= expectedColumns + 1 &&
           columns.some(col => col.length > 0);
  }

  private parseTableRow(line: string): string[] {
    return line.split(/\s{2,}|\t+/).map(col => col.trim()).filter(col => col.length > 0);
  }

  private finalizeTable(table: Partial<ExtractedTable>, pageNumber: number): ExtractedTable {
    return {
      id: table.id || `table-${Date.now()}`,
      title: table.title,
      headers: table.headers || [],
      rows: table.rows || [],
      pageNumber,
      confidence: table.confidence || 0.7,
      extractionMethod: table.extractionMethod || 'pattern',
      validationStatus: table.validationStatus || 'valid'
    };
  }

  /**
   * Utility methods
   */
  private async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  private imageDataToBase64(image: ImageData): string {
    // Convert image data to base64 for OCR processing
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    
    if (ctx && image.data) {
      const imageData = ctx.createImageData(image.width, image.height);
      imageData.data.set(image.data);
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    }
    
    return '';
  }

  private async callMCPServerOCR(base64Data: string, pageNum: number): Promise<OCRResult> {
    try {
      // Call MCP server for OCR processing
      const response = await fetch('http://localhost:8000/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: base64Data,
          page_num: pageNum
        })
      });
      
      if (!response.ok) {
        throw new Error(`OCR request failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      return {
        pageNum,
        text: result.text || '',
        confidence: result.confidence || 0,
        error: result.error
      };
    } catch (error) {
      console.warn('MCP server OCR call failed:', error);
      return {
        pageNum,
        text: '',
        confidence: 0,
        error: error instanceof Error ? error.message : 'OCR request failed'
      };
    }
  }

  private calculateAverageSpacing(lineGroup: any[]): number {
    if (lineGroup.length < 2) return 0;
    
    let totalSpacing = 0;
    for (let i = 1; i < lineGroup.length; i++) {
      totalSpacing += Math.abs(lineGroup[i].y - lineGroup[i-1].y);
    }
    
    return totalSpacing / (lineGroup.length - 1);
  }

  private async extractMetadata(pdfDoc: pdfjsLib.PDFDocumentProxy, fileSize: number): Promise<PDFMetadata> {
    const info = await pdfDoc.getMetadata();
    const metadata: PDFMetadata = {
      pages: pdfDoc.numPages,
      encrypted: false,
      fileSize,
    };

    if (info.info) {
      const pdfInfo = info.info as any;
      if (pdfInfo.Title) metadata.title = pdfInfo.Title;
      if (pdfInfo.Author) metadata.author = pdfInfo.Author;
      if (pdfInfo.Subject) metadata.subject = pdfInfo.Subject;
      if (pdfInfo.Creator) metadata.creator = pdfInfo.Creator;
      if (pdfInfo.Producer) metadata.producer = pdfInfo.Producer;
      if (pdfInfo.PDFFormatVersion) metadata.version = pdfInfo.PDFFormatVersion;
      
      try {
        if (pdfInfo.CreationDate) {
          metadata.creationDate = new Date(pdfInfo.CreationDate);
        }
        if (pdfInfo.ModDate) {
          metadata.modificationDate = new Date(pdfInfo.ModDate);
        }
      } catch (error) {
        console.warn('Failed to parse PDF dates', error);
      }
    }

    return metadata;
  }

  private handleError(error: any): PDFProcessingError {
    console.error('PDF processing error:', error);
    
    if (error instanceof Error) {
      return {
        code: PDFErrorCode.PROCESSING_ERROR,
        message: error.message,
        details: error.stack
      };
    }
    
    return {
      code: PDFErrorCode.UNKNOWN_ERROR,
      message: 'Unknown error occurred during PDF processing',
      details: String(error)
    };
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
} 