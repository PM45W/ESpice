export interface ExtractedImage {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: string; // Base64 encoded image
  caption?: string;
  type: 'figure' | 'graph' | 'table' | 'diagram';
}

export interface ExtractedTable {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  data: string[][];
  headers: string[];
  caption?: string;
}

export interface ExtractedText {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontName: string;
  isBold: boolean;
  isItalic: boolean;
}

export interface PDFProcessingResult {
  success: boolean;
  datasheetId: string;
  totalPages: number;
  extractedImages: ExtractedImage[];
  extractedTables: ExtractedTable[];
  extractedText: ExtractedText[];
  htmlContent: string;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creationDate?: string;
    modificationDate?: string;
  };
  error?: string;
}

export interface PDFProcessingOptions {
  extractImages: boolean;
  extractTables: boolean;
  extractText: boolean;
  generateHTML: boolean;
  imageQuality: 'low' | 'medium' | 'high';
  includeCaptions: boolean;
  preserveLayout: boolean;
}

class EnhancedPdfService {
  private baseUrl = 'http://localhost:8002'; // PDF processing service port

  /**
   * Process a PDF datasheet using PyMuPDF for enhanced extraction
   */
  async processDatasheet(
    filePath: string,
    options: PDFProcessingOptions = {
      extractImages: true,
      extractTables: true,
      extractText: true,
      generateHTML: true,
      imageQuality: 'high',
      includeCaptions: true,
      preserveLayout: true
    }
  ): Promise<PDFProcessingResult> {
    try {
      const response = await fetch(`${this.baseUrl}/process-datasheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          options: options
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to process datasheet:', error);
      throw error;
    }
  }

  /**
   * Extract images from PDF using PyMuPDF
   */
  async extractImages(
    filePath: string,
    options: {
      quality: 'low' | 'medium' | 'high';
      includeCaptions: boolean;
      minSize: number;
    } = {
      quality: 'high',
      includeCaptions: true,
      minSize: 100
    }
  ): Promise<ExtractedImage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/extract-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          options: options
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.images || [];
    } catch (error) {
      console.error('Failed to extract images:', error);
      throw error;
    }
  }

  /**
   * Extract tables from PDF using pdfplumber
   */
  async extractTables(
    filePath: string,
    options: {
      includeCaptions: boolean;
      mergeAdjacent: boolean;
      minRows: number;
    } = {
      includeCaptions: true,
      mergeAdjacent: true,
      minRows: 2
    }
  ): Promise<ExtractedTable[]> {
    try {
      const response = await fetch(`${this.baseUrl}/extract-tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          options: options
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.tables || [];
    } catch (error) {
      console.error('Failed to extract tables:', error);
      throw error;
    }
  }

  /**
   * Generate HTML from PDF with semantic elements
   */
  async generateHTML(
    filePath: string,
    options: {
      includeImages: boolean;
      includeTables: boolean;
      includeText: boolean;
      useSemanticElements: boolean;
      includeCSS: boolean;
      responsive: boolean;
    } = {
      includeImages: true,
      includeTables: true,
      includeText: true,
      useSemanticElements: true,
      includeCSS: true,
      responsive: true
    }
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-html`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          options: options
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.html || '';
    } catch (error) {
      console.error('Failed to generate HTML:', error);
      throw error;
    }
  }

  /**
   * Extract text with formatting information
   */
  async extractText(
    filePath: string,
    options: {
      includeFormatting: boolean;
      preserveLayout: boolean;
      extractHeaders: boolean;
    } = {
      includeFormatting: true,
      preserveLayout: true,
      extractHeaders: true
    }
  ): Promise<ExtractedText[]> {
    try {
      const response = await fetch(`${this.baseUrl}/extract-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          options: options
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.text || [];
    } catch (error) {
      console.error('Failed to extract text:', error);
      throw error;
    }
  }

  /**
   * Get PDF metadata
   */
  async getMetadata(filePath: string): Promise<{
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creationDate?: string;
    modificationDate?: string;
    pageCount: number;
    fileSize: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/get-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get metadata:', error);
      throw error;
    }
  }

  /**
   * Regenerate figures programmatically if plot data is available
   */
  async regenerateFigures(
    datasheetId: string,
    options: {
      regenerateGraphs: boolean;
      regenerateTables: boolean;
      outputFormat: 'svg' | 'png' | 'pdf';
      includeData: boolean;
    } = {
      regenerateGraphs: true,
      regenerateTables: true,
      outputFormat: 'svg',
      includeData: true
    }
  ): Promise<{
    success: boolean;
    regeneratedFigures: Array<{
      id: string;
      type: 'graph' | 'table';
      originalImage: string;
      regeneratedImage: string;
      data?: any;
    }>;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/regenerate-figures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasheet_id: datasheetId,
          options: options
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to regenerate figures:', error);
      throw error;
    }
  }

  /**
   * Create a professional HTML datasheet
   */
  async createProfessionalHTML(
    datasheetId: string,
    options: {
      includeNavigation: boolean;
      includeSearch: boolean;
      includePrintStyles: boolean;
      includeAccessibility: boolean;
      theme: 'light' | 'dark' | 'auto';
    } = {
      includeNavigation: true,
      includeSearch: true,
      includePrintStyles: true,
      includeAccessibility: true,
      theme: 'light'
    }
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/create-professional-html`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasheet_id: datasheetId,
          options: options
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.html || '';
    } catch (error) {
      console.error('Failed to create professional HTML:', error);
      throw error;
    }
  }

  /**
   * Health check for the PDF processing service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('PDF processing service health check failed:', error);
      return false;
    }
  }
}

export const enhancedPdfService = new EnhancedPdfService();
export default enhancedPdfService; 