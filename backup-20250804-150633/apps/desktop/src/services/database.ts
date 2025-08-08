import Dexie, { Table } from 'dexie';
import type { Product, Parameter, SPICEModel } from '../types';
import type { ModelVersion, ModelChange, BranchInfo } from './versionControlService';

// Note: Prisma is server-side only, not available in browser environment
// For browser/desktop app, we use Dexie (IndexedDB) for local storage

// Define database schema using Dexie
class ESPICEDatabase extends Dexie {
  products!: Table<Product>;
  parameters!: Table<Parameter>;
  spiceModels!: Table<SPICEModel>;
  modelVersions!: Table<ModelVersion>;
  branches!: Table<BranchInfo>;

  constructor() {
    super('ESpiceDatabase');
    this.version(2).stores({
      products: '++id, name, manufacturer, type, datasheetPath, createdAt, updatedAt',
      parameters: '++id, productId, name, value, unit, category, extractedFrom, confidence, createdAt',
      spiceModels: '++id, productId, modelText, parameters, version, createdAt, validatedAt',
      modelVersions: '++id, modelId, version, timestamp, isLatest',
      branches: '++id, modelId, name, headVersionId, createdAt, lastModified'
    });
  }
}

// Create database instance
const db = new ESPICEDatabase();
export { db };

// Generate unique IDs
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
};

// Initialize database connection
export const initializeDatabase = async () => {
  try {
    console.log('Initializing database (Dexie/IndexedDB mode)');
    
    // Test database connection
    await db.open();
    console.log('Database connection established successfully');
    
    // Database is ready
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

// Close database connection
export const closeDatabase = async () => {
  try {
    db.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }
};

// Product service
export const productService = {
  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    try {
      const now = new Date();
      const newProduct: Product = {
        id: generateId(),
        name: product.name,
        manufacturer: product.manufacturer,
        type: product.type,
        ...(product.datasheetPath && { datasheetPath: product.datasheetPath }),
        createdAt: now,
        updatedAt: now,
      };
      
      await db.products.add(newProduct);
      return newProduct;
    } catch (error) {
      console.error('Failed to create product:', error);
      throw new Error('Failed to create product');
    }
  },

  async findAll(): Promise<Product[]> {
    try {
      const products = await db.products.orderBy('createdAt').reverse().toArray();
      return products;
    } catch (error) {
      console.error('Failed to fetch products:', error);
      throw new Error('Failed to fetch products');
    }
  },

  async findById(id: string): Promise<Product | null> {
    try {
      const product = await db.products.get(id);
      return product || null;
    } catch (error) {
      console.error('Failed to fetch product:', error);
      throw new Error('Failed to fetch product');
    }
  },

  async update(id: string, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Product | null> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date()
      };
      
      await db.products.update(id, updateData);
      const updatedProduct = await db.products.get(id);
      return updatedProduct || null;
    } catch (error) {
      console.error('Failed to update product:', error);
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      // Delete product and related data in transaction
      await db.transaction('rw', db.products, db.parameters, db.spiceModels, async () => {
        await db.products.delete(id);
        await db.parameters.where('productId').equals(id).delete();
        await db.spiceModels.where('productId').equals(id).delete();
      });
      return true;
    } catch (error) {
      console.error('Failed to delete product:', error);
      return false;
    }
  },

  async findWithParameters(id: string): Promise<(Product & { parameters: Parameter[] }) | null> {
    try {
      const product = await db.products.get(id);
      if (!product) return null;
      
      const parameters = await db.parameters
        .where('productId')
        .equals(id)
        .reverse()
        .sortBy('createdAt');
      
      return { ...product, parameters };
    } catch (error) {
      console.error('Failed to fetch product with parameters:', error);
      throw new Error('Failed to fetch product with parameters');
    }
  },
};

// Parameter service
export const parameterService = {
  async create(parameter: Omit<Parameter, 'id' | 'createdAt'>): Promise<Parameter> {
    try {
      const newParameter: Parameter = {
        id: generateId(),
        productId: parameter.productId,
        name: parameter.name,
        value: parameter.value,
        unit: parameter.unit,
        category: parameter.category,
        ...(parameter.extractedFrom && { extractedFrom: parameter.extractedFrom }),
        ...(parameter.confidence !== undefined && { confidence: parameter.confidence }),
        createdAt: new Date(),
      };
      
      await db.parameters.add(newParameter);
      return newParameter;
    } catch (error) {
      console.error('Failed to create parameter:', error);
      throw new Error('Failed to create parameter');
    }
  },

  async findByProductId(productId: string): Promise<Parameter[]> {
    try {
      const parameters = await db.parameters
        .where('productId')
        .equals(productId)
        .reverse()
        .sortBy('createdAt');
      return parameters;
    } catch (error) {
      console.error('Failed to fetch parameters:', error);
      throw new Error('Failed to fetch parameters');
    }
  },

  async update(id: string, data: Partial<Omit<Parameter, 'id' | 'createdAt' | 'productId'>>): Promise<Parameter | null> {
    try {
      await db.parameters.update(id, data);
      const updatedParameter = await db.parameters.get(id);
      return updatedParameter || null;
    } catch (error) {
      console.error('Failed to update parameter:', error);
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await db.parameters.delete(id);
      return true;
    } catch (error) {
      console.error('Failed to delete parameter:', error);
      return false;
    }
  },

  async bulkCreate(parameters: Omit<Parameter, 'id' | 'createdAt'>[]): Promise<Parameter[]> {
    try {
      const newParameters: Parameter[] = parameters.map(param => ({
        id: generateId(),
        productId: param.productId,
        name: param.name,
        value: param.value,
        unit: param.unit,
        category: param.category,
        ...(param.extractedFrom && { extractedFrom: param.extractedFrom }),
        ...(param.confidence !== undefined && { confidence: param.confidence }),
        createdAt: new Date(),
      }));
      
      await db.parameters.bulkAdd(newParameters);
      return newParameters;
    } catch (error) {
      console.error('Failed to bulk create parameters:', error);
      throw new Error('Failed to bulk create parameters');
    }
  },
};

// SPICE Model service
export const spiceModelService = {
  async create(model: Omit<SPICEModel, 'id' | 'createdAt'>): Promise<SPICEModel> {
    try {
      const newModel: SPICEModel = {
        id: generateId(),
        productId: model.productId,
        modelText: model.modelText,
        parameters: model.parameters,
        version: model.version,
        createdAt: new Date(),
        ...(model.validatedAt && { validatedAt: model.validatedAt }),
      };
      
      await db.spiceModels.add(newModel);
      return newModel;
    } catch (error) {
      console.error('Failed to create SPICE model:', error);
      throw new Error('Failed to create SPICE model');
    }
  },

  async findByProductId(productId: string): Promise<SPICEModel[]> {
    try {
      const models = await db.spiceModels
        .where('productId')
        .equals(productId)
        .reverse()
        .sortBy('createdAt');
      return models;
    } catch (error) {
      console.error('Failed to fetch SPICE models:', error);
      throw new Error('Failed to fetch SPICE models');
    }
  },

  async update(id: string, data: Partial<Omit<SPICEModel, 'id' | 'createdAt' | 'productId'>>): Promise<SPICEModel | null> {
    try {
      await db.spiceModels.update(id, data);
      const updatedModel = await db.spiceModels.get(id);
      return updatedModel || null;
    } catch (error) {
      console.error('Failed to update SPICE model:', error);
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await db.spiceModels.delete(id);
      return true;
    } catch (error) {
      console.error('Failed to delete SPICE model:', error);
      return false;
    }
  },

  async findById(id: string): Promise<SPICEModel | null> {
    try {
      const model = await db.spiceModels.get(id);
      return model || null;
    } catch (error) {
      console.error('Failed to fetch SPICE model:', error);
      return null;
    }
  },
};

// Version Control service
export const versionControlService = {
  async createVersion(version: ModelVersion): Promise<ModelVersion> {
    try {
      await db.modelVersions.add(version);
      return version;
    } catch (error) {
      console.error('Failed to create version:', error);
      throw new Error('Failed to create version');
    }
  },

  async getVersionsForModel(modelId: string): Promise<ModelVersion[]> {
    try {
      const versions = await db.modelVersions
        .where('modelId')
        .equals(modelId)
        .reverse()
        .sortBy('timestamp');
      return versions;
    } catch (error) {
      console.error('Failed to fetch versions:', error);
      throw new Error('Failed to fetch versions');
    }
  },

  async getVersionById(versionId: string): Promise<ModelVersion | null> {
    try {
      const version = await db.modelVersions.get(versionId);
      return version || null;
    } catch (error) {
      console.error('Failed to fetch version:', error);
      return null;
    }
  },

  async getLatestVersion(modelId: string): Promise<ModelVersion | null> {
    try {
      const version = await db.modelVersions
        .where('modelId')
        .equals(modelId)
        .and(version => version.isLatest)
        .first();
      return version || null;
    } catch (error) {
      console.error('Failed to fetch latest version:', error);
      return null;
    }
  },

  async updateVersionIsLatest(versionId: string, isLatest: boolean): Promise<void> {
    try {
      await db.modelVersions.update(versionId, { isLatest });
    } catch (error) {
      console.error('Failed to update version isLatest:', error);
      throw new Error('Failed to update version isLatest');
    }
  },

  async updateVersion(versionId: string, updates: Partial<ModelVersion>): Promise<void> {
    try {
      await db.modelVersions.update(versionId, updates);
    } catch (error) {
      console.error('Failed to update version:', error);
      throw new Error('Failed to update version');
    }
  },

  async deleteVersion(versionId: string): Promise<boolean> {
    try {
      await db.modelVersions.delete(versionId);
      return true;
    } catch (error) {
      console.error('Failed to delete version:', error);
      return false;
    }
  },

  async getBranchesForModel(modelId: string): Promise<BranchInfo[]> {
    try {
      const branches = await db.branches
        .where('modelId')
        .equals(modelId)
        .reverse()
        .sortBy('lastModified');
      return branches;
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      throw new Error('Failed to fetch branches');
    }
  },

  async createBranch(branch: BranchInfo): Promise<BranchInfo> {
    try {
      await db.branches.add(branch);
      return branch;
    } catch (error) {
      console.error('Failed to create branch:', error);
      throw new Error('Failed to create branch');
    }
  },

  async updateBranch(branchId: string, updates: Partial<BranchInfo>): Promise<void> {
    try {
      await db.branches.update(branchId, updates);
    } catch (error) {
      console.error('Failed to update branch:', error);
      throw new Error('Failed to update branch');
    }
  },

  async deleteBranch(branchId: string): Promise<boolean> {
    try {
      await db.branches.delete(branchId);
      return true;
    } catch (error) {
      console.error('Failed to delete branch:', error);
      return false;
    }
  },
};

// Export types for use in components
export type { Product, Parameter, SPICEModel } from '../types';
export type { ModelVersion, ModelChange, BranchInfo } from './versionControlService'; 