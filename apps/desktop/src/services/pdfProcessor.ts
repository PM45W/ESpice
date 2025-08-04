import * as pdfjsLib from 'pdfjs-dist';
import type { 
  PDFProcessingResult, 
  PDFMetadata, 
  PDFProcessingOptions,
  ExtractedTable,
  ExtractedParameter,
  PDFProcessingError,
  ProcessingProgress
} from '../types/pdf';
import { PDFErrorCode } from '../types/pdf';

// Configure PDF.js worker - Use local worker file for Tauri compatibility
// This avoids CDN issues in Tauri's webview environment
const configureWorker = () => {
  try {
    // Try to use local worker file first
    const workerUrl = new URL('/pdf.worker.min.js', import.meta.url).href;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    console.log('PDF.js worker configured with URL:', workerUrl);
  } catch (error) {
    // Fallback to relative path if URL constructor fails
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    console.log('PDF.js worker configured with fallback path: /pdf.worker.min.js');
  }
};

configureWorker();

export class PDFProcessor {
  private static instance: PDFProcessor;

  public static getInstance(): PDFProcessor {
    if (!PDFProcessor.instance) {
      PDFProcessor.instance = new PDFProcessor();
    }
    return PDFProcessor.instance;
  }

  /**
   * Process a PDF file and extract text, metadata, and structured data
   */
  public async processPDF(
    file: File, 
    options: PDFProcessingOptions = {},
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<PDFProcessingResult> {
    const startTime = performance.now();

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
        progress: 30,
        message: 'Parsing PDF structure...'
      });

      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Stage 3: Extracting text and metadata
      onProgress?.({
        stage: 'extracting',
        progress: 50,
        message: 'Extracting text and metadata...'
      });

      const { text, pageCount } = await this.extractTextFromPDF(pdfDoc, onProgress);
      const metadata = await this.extractMetadata(pdfDoc, file.size);
      
      // Initialize result
      const result: PDFProcessingResult = {
        success: true,
        text,
        pageCount,
        metadata,
        processingTime: 0,
      };

      // Stage 4: Extract tables if requested
      if (options.extractTables) {
        onProgress?.({
          stage: 'extracting',
          progress: 70,
          message: 'Extracting tables...'
        });

        result.tables = this.extractTables(text);
      }

      // Stage 5: Extract parameters if requested
      if (options.extractParameters) {
        onProgress?.({
          stage: 'extracting',
          progress: 85,
          message: 'Extracting parameters...'
        });

        result.parameters = this.extractParameters(
          text, 
          result.tables || [],
          options.targetParameters
        );
      }

      // Calculate final metrics
      const endTime = performance.now();
      result.processingTime = endTime - startTime;

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Processing complete'
      });

      console.log('PDF processing completed successfully', {
        processingTime: result.processingTime,
        tablesCount: result.tables?.length || 0,
        parametersCount: result.parameters?.length || 0
      });

      return result;

    } catch (error) {
      console.error('PDF processing failed', error);
      return this.handleError(error, file.name);
    }
  }

  /**
   * Convert File to ArrayBuffer for pdfjs-dist
   */
  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };

      reader.onerror = () => reject(new Error('FileReader error occurred'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Extract text from all pages of the PDF
   */
  private async extractTextFromPDF(
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<{ text: string; pageCount: number }> {
    const pageCount = pdfDoc.numPages;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;

      // Update progress
      const progress = Math.round(30 + (pageNum / pageCount) * 20);
      onProgress?.({
        stage: 'extracting',
        progress,
        message: `Extracting text from page ${pageNum}/${pageCount}...`
      });
    }

    return { text: fullText, pageCount };
  }

  /**
   * Extract metadata from PDF document
   */
  private async extractMetadata(pdfDoc: pdfjsLib.PDFDocumentProxy, fileSize: number): Promise<PDFMetadata> {
    const info = await pdfDoc.getMetadata();
    const metadata: PDFMetadata = {
      pages: pdfDoc.numPages,
      encrypted: false, // PDF.js handles decryption automatically
      fileSize,
    };

    // Extract metadata from info object
    if (info.info) {
      const pdfInfo = info.info as any; // Type assertion for PDF info object
      if (pdfInfo.Title) metadata.title = pdfInfo.Title;
      if (pdfInfo.Author) metadata.author = pdfInfo.Author;
      if (pdfInfo.Subject) metadata.subject = pdfInfo.Subject;
      if (pdfInfo.Creator) metadata.creator = pdfInfo.Creator;
      if (pdfInfo.Producer) metadata.producer = pdfInfo.Producer;
      if (pdfInfo.PDFFormatVersion) metadata.version = pdfInfo.PDFFormatVersion;
      
      // Parse dates
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

  /**
   * Extract tables from PDF text using pattern matching
   */
  private extractTables(text: string): ExtractedTable[] {
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
        
        // Look for table title in previous lines
        for (let j = Math.max(0, i - 3); j < i; j++) {
          const prevLine = lines[j].trim();
          if (this.isTableTitle(prevLine)) {
            currentTable.title = prevLine;
            break;
          }
        }
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
   * Extract semiconductor parameters from text and tables
   */
  private extractParameters(
    text: string, 
    tables: ExtractedTable[],
    targetParameters?: string[]
  ): ExtractedParameter[] {
    const parameters: ExtractedParameter[] = [];
    
    // Extract from tables first (higher confidence)
    tables.forEach(table => {
      const tableParams = this.extractParametersFromTable(table);
      parameters.push(...tableParams);
    });
    
    // Extract from raw text (lower confidence)
    const textParams = this.extractParametersFromText(text);
    parameters.push(...textParams);
    
    // Filter by target parameters if specified
    if (targetParameters && targetParameters.length > 0) {
      return parameters.filter(param => 
        targetParameters.some(target => 
          param.name.toLowerCase().includes(target.toLowerCase()) ||
          param.symbol?.toLowerCase().includes(target.toLowerCase())
        )
      );
    }
    
    return parameters;
  }

  /**
   * Enhanced error handling
   */
  private handleError(error: any, fileName: string): PDFProcessingResult {
    let code = PDFErrorCode.UNKNOWN_ERROR;
    let message = error.message || 'Unknown error occurred';
    
    if (error.message?.includes('Invalid PDF')) {
      code = PDFErrorCode.INVALID_PDF;
      message = 'The file is not a valid PDF document';
    } else if (error.message?.includes('encrypted')) {
      code = PDFErrorCode.ENCRYPTED_PDF;
      message = 'The PDF is encrypted and cannot be processed';
    } else if (error.message?.includes('FileReader')) {
      code = PDFErrorCode.FILE_READ_ERROR;
      message = 'Failed to read the file';
    } else if (error.message?.includes('timeout')) {
      code = PDFErrorCode.TIMEOUT_ERROR;
      message = 'PDF processing timed out';
    } else if (error.message?.includes('worker') || error.message?.includes('Worker')) {
      code = PDFErrorCode.UNKNOWN_ERROR;
      message = 'PDF.js worker failed to load. Please ensure the worker file is accessible.';
    } else if (error.message?.includes('fetch') || error.message?.includes('dynamically imported')) {
      code = PDFErrorCode.UNKNOWN_ERROR;
      message = 'Failed to load PDF.js worker. This may be due to network restrictions or missing worker file.';
    }
    
    const processedError: PDFProcessingError = {
      code,
      message,
      timestamp: new Date(),
      recoverable: code !== PDFErrorCode.INVALID_PDF,
    };
    
    if (fileName) {
      processedError.file = fileName;
    }
    
    console.error('Processing failed', processedError);
    
    return {
      success: false,
      text: '',
      pageCount: 0,
      error: processedError,
      processingTime: 0,
    };
  }

  // Enhanced helper methods for better table detection
  private isTableHeader(line: string): boolean {
    const headerPatterns = [
      /parameter/i, /symbol/i, /min.*typ.*max/i, /condition/i, /unit/i, /characteristics/i, /test.*condition/i,
      /electrical.*characteristics/i, /thermal.*characteristics/i, /mechanical.*characteristics/i,
      /absolute.*maximum.*ratings/i, /switching.*characteristics/i, /capacitance.*characteristics/i,
    ];
    return headerPatterns.some(pattern => pattern.test(line)) && line.split(/\s+/).length >= 3;
  }

  private isAdvancedTableHeader(line: string): boolean {
    // Enhanced table header detection with semiconductor-specific patterns
    const semiconductorPatterns = [
      /(?:v[gds]|i[d]|r[ds]|c[iss|oss|rss]|q[g]|t[on|off])/i, // Common semiconductor parameters
      /(?:min|typ|max|minimum|typical|maximum)/i,
      /(?:parameter|symbol|value|unit|condition)/i,
      /(?:electrical|thermal|mechanical)\s+(?:characteristics|specifications|parameters)/i,
    ];
    
    const hasSemiconductorPattern = semiconductorPatterns.some(pattern => pattern.test(line));
    const hasMultipleColumns = line.split(/\s{2,}|\t+/).length >= 3;
    const hasValidStructure = this.hasValidTableStructure(line);
    
    return hasSemiconductorPattern && hasMultipleColumns && hasValidStructure;
  }

  private hasValidTableStructure(line: string): boolean {
    // Check if the line has a valid table structure (multiple columns with proper spacing)
    const columns = this.parseTableRow(line);
    if (columns.length < 2) return false;
    
    // Check for consistent column structure
    const hasValidColumns = columns.some(col => col.length > 0 && col.length < 50);
    const hasReasonableSpacing = line.includes('  ') || line.includes('\t');
    
    return hasValidColumns && hasReasonableSpacing;
  }

  private calculateTableConfidence(line: string, columns: string[]): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on semiconductor-specific patterns
    const semiconductorParams = ['vth', 'rds', 'idss', 'bvdss', 'ciss', 'coss', 'crss', 'qg'];
    const hasSemiconductorParams = semiconductorParams.some(param => 
      line.toLowerCase().includes(param)
    );
    if (hasSemiconductorParams) confidence += 0.2;
    
    // Increase confidence based on column structure
    if (columns.length >= 3 && columns.length <= 8) confidence += 0.1;
    
    // Increase confidence based on header patterns
    const headerPatterns = [/min/i, /typ/i, /max/i, /unit/i, /condition/i];
    const headerMatches = headerPatterns.filter(pattern => pattern.test(line)).length;
    confidence += headerMatches * 0.05;
    
    return Math.min(confidence, 1.0);
  }

  private isTableTitle(line: string): boolean {
    const titlePatterns = [
      /electrical.*characteristics/i, /absolute.*maximum.*ratings/i, /thermal.*characteristics/i, /switching.*characteristics/i, /capacitance/i,
    ];
    return titlePatterns.some(pattern => pattern.test(line));
  }

  private isTableRow(line: string, expectedColumns: number): boolean {
    if (!line.trim()) return false;
    const columns = this.parseTableRow(line);
    return columns.length >= Math.max(2, expectedColumns - 1) && columns.length <= expectedColumns + 2;
  }

  private parseTableRow(line: string): string[] {
    return line.split(/\s{2,}|\t+/).map(cell => cell.trim()).filter(cell => cell.length > 0);
  }

  private finalizeTable(table: Partial<ExtractedTable>, pageNumber: number): ExtractedTable {
    const finalTable: ExtractedTable = {
      id: table.id || `table-${Date.now()}`,
      headers: table.headers || [],
      rows: table.rows || [],
      pageNumber,
      confidence: table.confidence || 0.5,
      extractionMethod: table.extractionMethod || 'pattern',
      validationStatus: table.validationStatus || 'valid'
    };
    
    if (table.title) finalTable.title = table.title;
    if (table.validationMessages) finalTable.validationMessages = table.validationMessages;
    
    return finalTable;
  }

  private extractParametersFromTable(table: ExtractedTable): ExtractedParameter[] {
    const parameters: ExtractedParameter[] = [];
    
    const nameCol = this.findColumnIndex(table.headers, ['parameter', 'symbol', 'name']);
    const minCol = this.findColumnIndex(table.headers, ['min', 'minimum']);
    const typCol = this.findColumnIndex(table.headers, ['typ', 'typical', 'nom', 'nominal']);
    const maxCol = this.findColumnIndex(table.headers, ['max', 'maximum']);
    const unitCol = this.findColumnIndex(table.headers, ['unit', 'units']);
    const conditionCol = this.findColumnIndex(table.headers, ['condition', 'test condition']);
    
    if (nameCol === -1) return parameters;
    
    table.rows.forEach((row, index) => {
      const name = row[nameCol];
      if (!name || name.trim() === '') return;
      
      const param: ExtractedParameter = {
        id: `${table.id}-param-${index}`,
        name: name.trim(),
        value: row[typCol] || row[minCol] || row[maxCol] || '',
        tableId: table.id,
        pageNumber: table.pageNumber,
        confidence: 0.8,
        dataType: 'other',
        validationStatus: 'valid'
      };
      
      if (minCol !== -1 && row[minCol]) param.min = row[minCol];
      if (typCol !== -1 && row[typCol]) param.typ = row[typCol];
      if (maxCol !== -1 && row[maxCol]) param.max = row[maxCol];
      if (unitCol !== -1 && row[unitCol]) param.unit = row[unitCol];
      if (conditionCol !== -1 && row[conditionCol]) param.condition = row[conditionCol];
      
      parameters.push(param);
    });
    
    return parameters;
  }

  private extractParametersFromText(text: string): ExtractedParameter[] {
    const parameters: ExtractedParameter[] = [];
    const lines = text.split('\n');
    
    // Enhanced semiconductor parameter patterns
    const semiconductorPatterns = [
      // Threshold voltage patterns
      { pattern: /(?:VTH|VGS\(th\)|Threshold\s+Voltage)\s*[=:]\s*([0-9.,]+)\s*([A-Za-z%°]+)?/gi, name: 'VTH', dataType: 'electrical' as const },
      // On-resistance patterns
      { pattern: /(?:RDS\(on\)|RDS\(ON\)|On-Resistance)\s*[=:]\s*([0-9.,]+)\s*([A-Za-z%°]+)?/gi, name: 'RDS(on)', dataType: 'electrical' as const },
      // Drain current patterns
      { pattern: /(?:IDSS|ID|Drain\s+Current)\s*[=:]\s*([0-9.,]+)\s*([A-Za-z%°]+)?/gi, name: 'IDSS', dataType: 'electrical' as const },
      // Breakdown voltage patterns
      { pattern: /(?:BVDSS|VDSS|Breakdown\s+Voltage)\s*[=:]\s*([0-9.,]+)\s*([A-Za-z%°]+)?/gi, name: 'BVDSS', dataType: 'electrical' as const },
      // Gate charge patterns
      { pattern: /(?:QG|Gate\s+Charge)\s*[=:]\s*([0-9.,]+)\s*([A-Za-z%°]+)?/gi, name: 'QG', dataType: 'electrical' as const },
      // Capacitance patterns
      { pattern: /(?:Ciss|Input\s+Capacitance)\s*[=:]\s*([0-9.,]+)\s*([A-Za-z%°]+)?/gi, name: 'Ciss', dataType: 'electrical' as const },
      { pattern: /(?:Coss|Output\s+Capacitance)\s*[=:]\s*([0-9.,]+)\s*([A-Za-z%°]+)?/gi, name: 'Coss', dataType: 'electrical' as const },
      { pattern: /(?:Crss|Reverse\s+Transfer\s+Capacitance)\s*[=:]\s*([0-9.,]+)\s*([A-Za-z%°]+)?/gi, name: 'Crss', dataType: 'electrical' as const },
      // Switching time patterns
      { pattern: /(?:tON|Turn-On\s+Time)\s*[=:]\s*([0-9.,]+)\s*([A-Za-z%°]+)?/gi, name: 'tON', dataType: 'electrical' as const },
      { pattern: /(?:tOFF|Turn-Off\s+Time)\s*[=:]\s*([0-9.,]+)\s*([A-Za-z%°]+)?/gi, name: 'tOFF', dataType: 'electrical' as const },
      // Thermal patterns
      { pattern: /(?:TJ|Junction\s+Temperature)\s*[=:]\s*([0-9.,]+)\s*([A-Za-z%°]+)?/gi, name: 'TJ', dataType: 'thermal' as const },
      { pattern: /(?:PD|Power\s+Dissipation)\s*[=:]\s*([0-9.,]+)\s*([A-Za-z%°]+)?/gi, name: 'PD', dataType: 'thermal' as const },
    ];
    
    lines.forEach((line, index) => {
      // Check for semiconductor-specific patterns first (higher confidence)
      semiconductorPatterns.forEach(({ pattern, name, dataType }) => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const [, value, unit] = match;
          
          parameters.push({
            id: `text-param-${index}-${parameters.length}`,
            name: name,
            value: value.trim(),
            unit: unit?.trim(),
            pageNumber: Math.floor(index / 50) + 1,
            confidence: 0.8, // Higher confidence for semiconductor patterns
            dataType: dataType,
            validationStatus: 'valid'
          });
        }
      });
      
      // Fallback to generic parameter patterns
      const genericPattern = /([A-Za-z_][A-Za-z0-9_\(\)]*)\s*[=:]\s*([0-9.,]+)\s*([A-Za-z%°]+)?/g;
      let match;
      
      while ((match = genericPattern.exec(line)) !== null) {
        const [, name, value, unit] = match;
        
        // Skip if already captured by semiconductor patterns
        const isAlreadyCaptured = parameters.some(p => 
          p.name === name && p.pageNumber === Math.floor(index / 50) + 1
        );
        
        if (!isAlreadyCaptured) {
          parameters.push({
            id: `text-param-${index}-${parameters.length}`,
            name: name.trim(),
            value: value.trim(),
            unit: unit?.trim(),
            pageNumber: Math.floor(index / 50) + 1,
            confidence: 0.6,
            dataType: 'other',
            validationStatus: 'valid'
          });
        }
      }
    });
    
    return parameters;
  }

  private findColumnIndex(headers: string[], patterns: string[]): number {
    return headers.findIndex(header => 
      patterns.some(pattern => header.toLowerCase().includes(pattern.toLowerCase()))
    );
  }
}

// Export singleton instance
export const pdfProcessor = PDFProcessor.getInstance(); 