export interface Manufacturer {
  name: string
  display_name: string
  base_url: string
  supported: boolean
}

export interface ProductCategory {
  name: string
  display_name: string
}

export interface ScrapingJob {
  job_id: string
  manufacturer: string
  category?: string
  keywords?: string[]
  max_products: number
  include_datasheets: boolean
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  created_at: string
  started_at?: string
  completed_at?: string
  total_products: number
  scraped_products: number
  downloaded_datasheets: number
  errors: string[]
}

export interface GaNProduct {
  product_id: string
  manufacturer: string
  part_number: string
  category: string
  name: string
  description: string
  specifications: Record<string, any>
  datasheet_url?: string
  datasheet_path?: string
  spice_model_url?: string
  spice_model_path?: string
  application_note_url?: string
  application_note_path?: string
  product_url?: string
  image_url?: string
  voltage_rating?: number
  current_rating?: number
  power_rating?: number
  created_at: string
}

export interface ScrapingConfig {
  manufacturer: string
  category?: string
  keywords?: string[]
  max_products: number
  include_datasheets: boolean
  include_spice_models?: boolean
  include_application_notes?: boolean
  delay_between_requests?: number
  max_retries?: number
  timeout?: number
  follow_redirects?: boolean
  respect_robots_txt?: boolean
}

export interface SearchResponse {
  products: GaNProduct[]
  total: number
  query?: string
}

export interface JobResponse {
  job_id: string
  status: string
  message: string
}

export interface PrescrapPreview {
  url: string;
  part_number: string;
  name: string;
  description: string;
}

export interface BraveResult {
  url: string;
  title: string;
  description: string;
}

export interface PrescrapResponse {
  preview: PrescrapPreview[];
  brave: BraveResult[];
  errors: string[];
}

class WebScrapingService {
  private baseUrl = 'http://localhost:8011' // Web scraper service port

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      return response.ok
    } catch (error) {
      console.error('Web scraper service health check failed:', error)
      return false
    }
  }

  async getManufacturers(): Promise<Manufacturer[]> {
    try {
      const response = await fetch(`${this.baseUrl}/manufacturers`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.manufacturers.map((mfr: any) => ({
        ...mfr,
        supported: mfr.supported !== false // Default to true unless explicitly false
      }))
    } catch (error) {
      console.error('Failed to fetch manufacturers:', error)
      // Return mock data if service is unavailable
      return [
        { name: 'infineon', display_name: 'Infineon', base_url: 'https://www.infineon.com', supported: true },
        { name: 'wolfspeed', display_name: 'Wolfspeed', base_url: 'https://www.wolfspeed.com', supported: true },
        { name: 'qorvo', display_name: 'Qorvo', base_url: 'https://www.qorvo.com', supported: true },
        { name: 'nxp', display_name: 'NXP', base_url: 'https://www.nxp.com', supported: false },
        { name: 'ti', display_name: 'Texas Instruments', base_url: 'https://www.ti.com', supported: false },
        { name: 'stmicro', display_name: 'STMicroelectronics', base_url: 'https://www.st.com', supported: false },
      ]
    }
  }

  async getCategories(): Promise<ProductCategory[]> {
    try {
      const response = await fetch(`${this.baseUrl}/categories`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.categories
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      // Return mock data if service is unavailable
      return [
        { name: 'gan_power', display_name: 'GaN Power Devices' },
        { name: 'gan_rf', display_name: 'GaN RF Devices' },
        { name: 'gan_driver', display_name: 'GaN Drivers' },
        { name: 'gan_module', display_name: 'GaN Modules' },
        { name: 'gan_discrete', display_name: 'GaN Discrete' },
        { name: 'gan_ic', display_name: 'GaN ICs' },
      ]
    }
  }

  async searchProducts(
    query?: string,
    manufacturer?: string,
    category?: string,
    limit: number = 100
  ): Promise<SearchResponse> {
    try {
      const params = new URLSearchParams()
      if (query) params.append('query', query)
      if (manufacturer) params.append('manufacturer', manufacturer)
      if (category) params.append('category', category)
      params.append('limit', limit.toString())

      const response = await fetch(`${this.baseUrl}/search?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to search products:', error)
      // Return mock data if service is unavailable
      return {
        products: [
          {
            product_id: 'prod-001',
            manufacturer: 'infineon',
            part_number: 'IGT60R190D1',
            category: 'gan_power',
            name: 'CoolGaN™ 600V Enhancement Mode HEMT',
            description: 'High-performance GaN power transistor for efficient power conversion',
            specifications: {
              'V_DS': '600V',
              'I_D': '190A',
              'R_DS(on)': '190mΩ',
              'Package': 'TO-247-3'
            },
            datasheet_url: 'https://www.infineon.com/dgdl/Infineon-IGT60R190D1-DataSheet-v01_00-EN.pdf',
            product_url: 'https://www.infineon.com/cms/en/product/power/gallium-nitride-gan/igt60r190d1/',
            voltage_rating: 600,
            current_rating: 190,
            power_rating: 1140,
            created_at: new Date().toISOString()
          },
          {
            product_id: 'prod-002',
            manufacturer: 'wolfspeed',
            part_number: 'C3M0065090D',
            category: 'gan_power',
            name: '650V SiC MOSFET',
            description: 'High-performance SiC MOSFET for power electronics applications',
            specifications: {
              'V_DS': '650V',
              'I_D': '90A',
              'R_DS(on)': '65mΩ',
              'Package': 'TO-247-3'
            },
            datasheet_url: 'https://www.wolfspeed.com/downloads/dl/file/id/1627/product/0/c3m0065090d.pdf',
            product_url: 'https://www.wolfspeed.com/products/power-devices/sic-transistors/c3m0065090d',
            voltage_rating: 650,
            current_rating: 90,
            power_rating: 585,
            created_at: new Date().toISOString()
          }
        ],
        total: 2,
        query
      }
    }
  }

  async startScrapingJob(config: ScrapingConfig): Promise<JobResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: `job-${Date.now()}`,
          manufacturer: config.manufacturer,
          category: config.category,
          keywords: config.keywords,
          max_products: config.max_products,
          include_datasheets: config.include_datasheets,
          created_at: new Date().toISOString()
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to start scraping job:', error)
      throw error
    }
  }

  async getJobStatus(jobId: string): Promise<ScrapingJob | null> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`)
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to get job status:', error)
      return null
    }
  }

  async listJobs(): Promise<ScrapingJob[]> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.jobs || []
    } catch (error) {
      console.error('Failed to list jobs:', error)
      return []
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
        method: 'DELETE',
      })
      return response.ok
    } catch (error) {
      console.error('Failed to cancel job:', error)
      return false
    }
  }

  async getProducts(
    manufacturer?: string,
    category?: string,
    limit: number = 100
  ): Promise<GaNProduct[]> {
    try {
      const params = new URLSearchParams()
      if (manufacturer) params.append('manufacturer', manufacturer)
      if (category) params.append('category', category)
      params.append('limit', limit.toString())

      const response = await fetch(`${this.baseUrl}/products?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.products || []
    } catch (error) {
      console.error('Failed to get products:', error)
      return []
    }
  }

  async downloadDatasheet(productId: string): Promise<boolean> {
    try {
      // This would integrate with the existing PDF processing pipeline
      // For now, we'll simulate the download
      console.log(`Downloading datasheet for product ${productId}`)
      
      // In a real implementation, this would:
      // 1. Get the product details from the web scraper service
      // 2. Download the datasheet file
      // 3. Process it through the PDF service
      // 4. Extract parameters and generate SPICE models
      
      return true
    } catch (error) {
      console.error('Failed to download datasheet:', error)
      return false
    }
  }

  async downloadSpiceModel(productId: string): Promise<boolean> {
    try {
      console.log(`Downloading SPICE model for product ${productId}`)
      
      // In a real implementation, this would:
      // 1. Get the product details from the web scraper service
      // 2. Download the SPICE model file
      // 3. Validate the model format
      // 4. Store it in the appropriate location
      
      return true
    } catch (error) {
      console.error('Failed to download SPICE model:', error)
      return false
    }
  }

  async downloadApplicationNote(productId: string): Promise<boolean> {
    try {
      console.log(`Downloading application note for product ${productId}`)
      
      // In a real implementation, this would:
      // 1. Get the product details from the web scraper service
      // 2. Download the application note file
      // 3. Process it through the PDF service if needed
      // 4. Store it in the appropriate location
      
      return true
    } catch (error) {
      console.error('Failed to download application note:', error)
      return false
    }
  }

  async downloadSelectiveFiles(
    productId: string, 
    fileTypes: { datasheet?: boolean; spiceModel?: boolean; applicationNote?: boolean }
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] }
    
    try {
      if (fileTypes.datasheet) {
        const success = await this.downloadDatasheet(productId)
        if (success) {
          results.success.push('datasheet')
        } else {
          results.failed.push('datasheet')
        }
      }
      
      if (fileTypes.spiceModel) {
        const success = await this.downloadSpiceModel(productId)
        if (success) {
          results.success.push('spiceModel')
        } else {
          results.failed.push('spiceModel')
        }
      }
      
      if (fileTypes.applicationNote) {
        const success = await this.downloadApplicationNote(productId)
        if (success) {
          results.success.push('applicationNote')
        } else {
          results.failed.push('applicationNote')
        }
      }
      
      return results
    } catch (error) {
      console.error('Failed to download selective files:', error)
      throw error
    }
  }

  async downloadMultipleDatasheets(productIds: string[]): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] }
    
    for (const productId of productIds) {
      try {
        const success = await this.downloadDatasheet(productId)
        if (success) {
          results.success.push(productId)
        } else {
          results.failed.push(productId)
        }
      } catch (error) {
        results.failed.push(productId)
      }
    }
    
    return results
  }

  // Integration with existing ESpice services
  async processDownloadedDatasheet(datasheetPath: string): Promise<boolean> {
    try {
      // This would integrate with the existing PDF processing pipeline
      // Call the PDF service to extract text and tables
      // Call the image service to extract curves
      // Call the SPICE service to generate models
      
      console.log(`Processing datasheet: ${datasheetPath}`)
      return true
    } catch (error) {
      console.error('Failed to process datasheet:', error)
      return false
    }
  }

  async prescrap(
    manufacturer: string,
    category?: string,
    keywords?: string[],
    limit: number = 20
  ): Promise<BraveResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/prescrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer,
          category,
          keywords,
          use_brave: true,
          limit
        })
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json();
      return data.brave || [];
    } catch (error) {
      console.error('Failed to prescrap:', error)
      return [];
    }
  }

  // EPC-Co.com specific methods
  async scrapeEPCProductMock(
    modelNumber: string, 
    includeDatasheet: boolean = true, 
    includeSpice: boolean = true
  ): Promise<{ product: GaNProduct; downloaded_files: { datasheet?: string; spice_model?: string } }> {
    try {
      const params = new URLSearchParams({
        model_number: modelNumber,
        include_datasheet: includeDatasheet.toString(),
        include_spice: includeSpice.toString()
      });

      const response = await fetch(`${this.baseUrl}/epc/scrape-product-mock?${params}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to scrape EPC product (mock):', error);
      throw error;
    }
  }

  async scrapeEPCProduct(
    modelNumber: string, 
    includeDatasheet: boolean = true, 
    includeSpice: boolean = true
  ): Promise<{ product: GaNProduct; downloaded_files: { datasheet?: string; spice_model?: string } }> {
    try {
      const params = new URLSearchParams({
        model_number: modelNumber,
        include_datasheet: includeDatasheet.toString(),
        include_spice: includeSpice.toString()
      });

      const response = await fetch(`${this.baseUrl}/epc/scrape-product?${params}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to scrape EPC product:', error);
      throw error;
    }
  }

  async downloadEPCFiles(
    modelNumber: string, 
    includeDatasheet: boolean = true, 
    includeSpice: boolean = true
  ): Promise<{ model_number: string; downloaded_files: { datasheet?: string; spice_model?: string } }> {
    try {
      const params = new URLSearchParams({
        model_number: modelNumber,
        include_datasheet: includeDatasheet.toString(),
        include_spice: includeSpice.toString()
      });

      const response = await fetch(`${this.baseUrl}/epc/download-files?${params}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to download EPC files:', error);
      throw error;
    }
  }

  async searchEPCProducts(query: string = '', limit: number = 50): Promise<SearchResponse> {
    try {
      const params = new URLSearchParams({
        query,
        limit: limit.toString()
      });

      const response = await fetch(`${this.baseUrl}/epc/search-products?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to search EPC products:', error);
      return { products: [], total: 0, query };
    }
  }

  async getEPCProduct(modelNumber: string): Promise<GaNProduct> {
    try {
      const response = await fetch(`${this.baseUrl}/epc/product/${modelNumber}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.product;
    } catch (error) {
      console.error('Failed to get EPC product:', error);
      throw error;
    }
  }

  async batchScrapeEPCProducts(
    modelNumbers: string[], 
    includeDatasheets: boolean = true, 
    includeSpice: boolean = true
  ): Promise<{
    results: Array<{
      model_number: string;
      success: boolean;
      product: GaNProduct;
      downloaded_files: { datasheet?: string; spice_model?: string };
    }>;
    errors: string[];
    total_processed: number;
    successful: number;
    failed: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/epc/batch-scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_numbers: modelNumbers,
          include_datasheets: includeDatasheets,
          include_spice: includeSpice
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to batch scrape EPC products:', error);
      throw error;
    }
  }
}

export const webScrapingService = new WebScrapingService()
export default webScrapingService 