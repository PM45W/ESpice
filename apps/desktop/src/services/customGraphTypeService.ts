export interface CustomGraphType {
  id: string;
  name: string;
  x_axis: string;
  y_axis: string;
  third_col: string;
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  x_scale: number;
  y_scale: number;
  x_scale_type: 'linear' | 'log';
  y_scale_type: 'linear' | 'log';
  color_reps: { [key: string]: string };
  output_filename: string;
  created_at: string;
  updated_at: string;
}

class CustomGraphTypeService {
  private dbName = 'ESpiceCustomGraphTypes';
  private dbVersion = 1;
  private storeName = 'customGraphTypes';
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }

  async getAllCustomGraphTypes(): Promise<CustomGraphType[]> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error('Failed to fetch custom graph types'));
      };

      request.onsuccess = () => {
        const graphTypes = request.result as CustomGraphType[];
        // Sort by creation date (newest first)
        graphTypes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        resolve(graphTypes);
      };
    });
  }

  async saveCustomGraphType(graphType: CustomGraphType): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(graphType);

      request.onerror = () => {
        reject(new Error('Failed to save custom graph type'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async deleteCustomGraphType(id: string): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error('Failed to delete custom graph type'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async getCustomGraphType(id: string): Promise<CustomGraphType | null> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onerror = () => {
        reject(new Error('Failed to fetch custom graph type'));
      };

      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  async searchCustomGraphTypes(query: string): Promise<CustomGraphType[]> {
    const allTypes = await this.getAllCustomGraphTypes();
    const lowerQuery = query.toLowerCase();
    
    return allTypes.filter(type => 
      type.name.toLowerCase().includes(lowerQuery) ||
      type.x_axis.toLowerCase().includes(lowerQuery) ||
      type.y_axis.toLowerCase().includes(lowerQuery)
    );
  }

  async exportCustomGraphTypes(): Promise<string> {
    const graphTypes = await this.getAllCustomGraphTypes();
    return JSON.stringify(graphTypes, null, 2);
  }

  async importCustomGraphTypes(jsonData: string): Promise<void> {
    try {
      const graphTypes: CustomGraphType[] = JSON.parse(jsonData);
      
      for (const graphType of graphTypes) {
        // Validate the graph type structure
        if (!graphType.id || !graphType.name || !graphType.x_axis || !graphType.y_axis) {
          throw new Error('Invalid graph type structure');
        }
        
        // Update timestamps
        graphType.updated_at = new Date().toISOString();
        if (!graphType.created_at) {
          graphType.created_at = new Date().toISOString();
        }
        
        await this.saveCustomGraphType(graphType);
      }
    } catch (error) {
      throw new Error(`Failed to import custom graph types: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clearAllCustomGraphTypes(): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error('Failed to clear custom graph types'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  // Convert custom graph type to the format expected by the graph extraction system
  convertToGraphPreset(customType: CustomGraphType): any {
    return {
      graph_type: customType.id,
      name: customType.name,
      x_axis: customType.x_axis,
      y_axis: customType.y_axis,
      third_col: customType.third_col,
      x_min: customType.x_min,
      x_max: customType.x_max,
      y_min: customType.y_min,
      y_max: customType.y_max,
      x_scale: customType.x_scale,
      y_scale: customType.y_scale,
      x_scale_type: customType.x_scale_type,
      y_scale_type: customType.y_scale_type,
      color_reps: customType.color_reps,
      output_filename: customType.output_filename
    };
  }

  // Validate custom graph type
  validateCustomGraphType(graphType: Partial<CustomGraphType>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!graphType.name || graphType.name.trim() === '') {
      errors.push('Graph type name is required');
    }

    if (!graphType.x_axis || graphType.x_axis.trim() === '') {
      errors.push('X-axis label is required');
    }

    if (!graphType.y_axis || graphType.y_axis.trim() === '') {
      errors.push('Y-axis label is required');
    }

    if (graphType.x_min !== undefined && graphType.x_max !== undefined && graphType.x_min >= graphType.x_max) {
      errors.push('X-axis min value must be less than max value');
    }

    if (graphType.y_min !== undefined && graphType.y_max !== undefined && graphType.y_min >= graphType.y_max) {
      errors.push('Y-axis min value must be less than max value');
    }

    if (graphType.x_scale_type === 'log' && graphType.x_min !== undefined && graphType.x_min <= 0) {
      errors.push('X-axis min value must be greater than 0 for logarithmic scale');
    }

    if (graphType.y_scale_type === 'log' && graphType.y_min !== undefined && graphType.y_min <= 0) {
      errors.push('Y-axis min value must be greater than 0 for logarithmic scale');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Create a singleton instance
const customGraphTypeService = new CustomGraphTypeService();

export default customGraphTypeService;
