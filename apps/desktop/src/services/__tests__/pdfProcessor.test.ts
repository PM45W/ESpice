import { PDFProcessor } from '../pdfProcessor';
import type { PDFProcessingOptions } from '../../types/pdf';

// Mock PDF.js
jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {
    workerSrc: '/pdf.worker.min.js'
  },
  getDocument: jest.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 5,
      getPage: jest.fn().mockReturnValue({
        getTextContent: jest.fn().mockResolvedValue({
          items: [
            { str: 'Electrical Characteristics' },
            { str: 'Parameter' },
            { str: 'Symbol' },
            { str: 'Min' },
            { str: 'Typ' },
            { str: 'Max' },
            { str: 'Unit' },
            { str: 'VTH' },
            { str: 'VGS(th)' },
            { str: '1.0' },
            { str: '2.0' },
            { str: '3.0' },
            { str: 'V' },
            { str: 'RDS(on)' },
            { str: 'RDS(ON)' },
            { str: '0.1' },
            { str: '0.15' },
            { str: '0.2' },
            { str: 'Ω' }
          ]
        })
      }),
      getMetadata: jest.fn().mockResolvedValue({
        title: 'Test Semiconductor Datasheet',
        author: 'Test Manufacturer',
        creator: 'Test Creator'
      })
    })
  })
}));

describe('PDFProcessor', () => {
  let processor: PDFProcessor;

  beforeEach(() => {
    processor = PDFProcessor.getInstance();
  });

  describe('processPDF', () => {
    it('should process PDF and extract tables and parameters', async () => {
      // Create a mock file
      const mockFile = new File(['mock pdf content'], 'test.pdf', {
        type: 'application/pdf'
      });

      const options: PDFProcessingOptions = {
        extractTables: true,
        extractParameters: true
      };

      const result = await processor.processPDF(mockFile, options);

      expect(result.success).toBe(true);
      expect(result.pageCount).toBe(5);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.title).toBe('Test Semiconductor Datasheet');
      expect(result.tables).toBeDefined();
      expect(result.parameters).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle processing errors gracefully', async () => {
      // Mock a failed PDF processing
      const mockFile = new File(['invalid content'], 'invalid.pdf', {
        type: 'application/pdf'
      });

      // Override the mock to simulate an error
      const pdfjs = require('pdfjs-dist');
      pdfjs.getDocument.mockReturnValue({
        promise: Promise.reject(new Error('Invalid PDF'))
      });

      const result = await processor.processPDF(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_PDF');
    });

    it('should extract semiconductor parameters correctly', async () => {
      const mockFile = new File(['mock content'], 'test.pdf', {
        type: 'application/pdf'
      });

      const options: PDFProcessingOptions = {
        extractParameters: true,
        targetParameters: ['VTH', 'RDS(on)']
      };

      const result = await processor.processPDF(mockFile, options);

      expect(result.success).toBe(true);
      expect(result.parameters).toBeDefined();
      
      if (result.parameters) {
        const vthParam = result.parameters.find(p => p.name === 'VTH');
        const rdsParam = result.parameters.find(p => p.name === 'RDS(on)');
        
        expect(vthParam).toBeDefined();
        expect(rdsParam).toBeDefined();
        
        if (vthParam) {
          expect(vthParam.dataType).toBe('electrical');
          expect(vthParam.confidence).toBeGreaterThan(0.5);
        }
      }
    });

    it('should provide progress updates during processing', async () => {
      const mockFile = new File(['mock content'], 'test.pdf', {
        type: 'application/pdf'
      });

      const progressUpdates: any[] = [];
      
      const options: PDFProcessingOptions = {
        extractTables: true,
        extractParameters: true
      };

      await processor.processPDF(mockFile, options, (progress) => {
        progressUpdates.push(progress);
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Check that progress goes from 0 to 100
      const firstProgress = progressUpdates[0];
      const lastProgress = progressUpdates[progressUpdates.length - 1];
      
      expect(firstProgress.progress).toBeLessThanOrEqual(lastProgress.progress);
      expect(lastProgress.stage).toBe('complete');
      expect(lastProgress.progress).toBe(100);
    });
  });

  describe('table extraction', () => {
    it('should identify table headers correctly', () => {
      const processor = PDFProcessor.getInstance() as any;
      
      const validHeader = 'Parameter  Symbol  Min  Typ  Max  Unit';
      const invalidHeader = 'This is not a table header';
      
      expect(processor.isTableHeader(validHeader)).toBe(true);
      expect(processor.isTableHeader(invalidHeader)).toBe(false);
    });

    it('should calculate table confidence scores', () => {
      const processor = PDFProcessor.getInstance() as any;
      
      const semiconductorHeader = 'VTH  RDS(on)  IDSS  Min  Typ  Max  Unit';
      const columns = ['VTH', 'RDS(on)', 'IDSS', 'Min', 'Typ', 'Max', 'Unit'];
      
      const confidence = processor.calculateTableConfidence(semiconductorHeader, columns);
      
      expect(confidence).toBeGreaterThan(0.5);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('parameter extraction', () => {
    it('should extract parameters from text with correct data types', () => {
      const processor = PDFProcessor.getInstance() as any;
      
      const testText = `
        VTH = 2.0 V
        RDS(on) = 0.15 Ω
        IDSS = 10 A
        TJ = 150 °C
      `;
      
      const parameters = processor.extractParametersFromText(testText);
      
      expect(parameters.length).toBeGreaterThan(0);
      
      const vthParam = parameters.find(p => p.name === 'VTH');
      const rdsParam = parameters.find(p => p.name === 'RDS(on)');
      const tjParam = parameters.find(p => p.name === 'TJ');
      
      if (vthParam) {
        expect(vthParam.dataType).toBe('electrical');
        expect(vthParam.value).toBe('2.0');
        expect(vthParam.unit).toBe('V');
      }
      
      if (rdsParam) {
        expect(rdsParam.dataType).toBe('electrical');
        expect(rdsParam.value).toBe('0.15');
        expect(rdsParam.unit).toBe('Ω');
      }
      
      if (tjParam) {
        expect(tjParam.dataType).toBe('thermal');
        expect(tjParam.value).toBe('150');
        expect(tjParam.unit).toBe('°C');
      }
    });
  });
}); 