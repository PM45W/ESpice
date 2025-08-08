import PDKCompatibilityService, { type FoundryType, type ProcessNode } from '../pdkCompatibilityService';

describe('PDKCompatibilityService', () => {
  let service: PDKCompatibilityService;

  beforeEach(() => {
    service = PDKCompatibilityService.getInstance();
  });

  describe('getSupportedFoundries', () => {
    it('should return supported foundries and process nodes', () => {
      const foundries = service.getSupportedFoundries();
      
      expect(foundries).toHaveProperty('TSMC');
      expect(foundries).toHaveProperty('GlobalFoundries');
      expect(foundries).toHaveProperty('Samsung');
      expect(foundries).toHaveProperty('UMC');
      expect(foundries).toHaveProperty('SMIC');
      
      expect(foundries.TSMC).toContain('28nm');
      expect(foundries.TSMC).toContain('16nm');
      expect(foundries.GlobalFoundries).toContain('28nm');
    });
  });

  describe('validatePDKCompatibility', () => {
    const mockModel = {
      id: 'test-model',
      productId: 'test-product',
      modelText: `
        .MODEL NMOS NMOS
        + VTH0=0.5
        + K1=0.8
        + K2=0.05
        + K3=10
        + DVT0=1.0
        + DVT1=0.5
        + DVT2=0.1
      `,
      parameters: {},
      version: '1.0',
      createdAt: new Date(),
      validatedAt: null
    };

    it('should validate TSMC 28nm model successfully', () => {
      const result = service.validatePDKCompatibility(mockModel, 'TSMC', '28nm');
      
      expect(result.foundry).toBe('TSMC');
      expect(result.processNode).toBe('28nm');
      expect(result.isValid).toBe(true);
      expect(result.complianceScore).toBeGreaterThan(80);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required parameters', () => {
      const incompleteModel = {
        ...mockModel,
        modelText: `
          .MODEL NMOS NMOS
          + VTH0=0.5
          + K1=0.8
        `
      };

      const result = service.validatePDKCompatibility(incompleteModel, 'TSMC', '28nm');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.complianceScore).toBeLessThan(80);
    });

    it('should reject unsupported process node', () => {
      const result = service.validatePDKCompatibility(mockModel, 'TSMC', '1nm' as ProcessNode);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Process node 1nm is not supported for TSMC');
    });
  });

  describe('exportForEDATool', () => {
    const mockModel = {
      id: 'test-model',
      productId: 'test-product',
      modelText: '.MODEL NMOS NMOS + VTH0=0.5 + K1=0.8',
      parameters: {},
      version: '1.0',
      createdAt: new Date(),
      validatedAt: null
    };

    it('should export for Cadence Spectre', () => {
      const exported = service.exportForEDATool(mockModel, {
        tool: 'Cadence',
        format: 'scs',
        includeProcessCorners: true,
        includeTemperatureRange: true,
        includeMonteCarlo: false
      });

      expect(exported).toContain('Cadence Spectre Model');
      expect(exported).toContain('Process Corner: TT');
      expect(exported).toContain('Temperature Range: -40°C to 125°C');
    });

    it('should export for Synopsys HSPICE', () => {
      const exported = service.exportForEDATool(mockModel, {
        tool: 'Synopsys',
        format: 'sp',
        includeProcessCorners: false,
        includeTemperatureRange: false,
        includeMonteCarlo: true
      });

      expect(exported).toContain('Synopsys HSPICE Model');
      expect(exported).toContain('Monte Carlo Parameters');
    });
  });
}); 