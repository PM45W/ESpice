# SPICE Model Extraction and Product Management System

## Overview

The ESpice system now includes a comprehensive, modular SPICE model extraction and product management system that supports both empirical models (like EPC library files) and physical models (ASM/MVSG). This system provides users with complete control over the extraction workflow and model conversion processes.

## System Architecture

### Core Components

1. **Product Management Service** (`productManagementService.ts`)
   - Handles CRUD operations for semiconductor products
   - Manages product parameters with unified CSV format
   - Provides import/export functionality
   - Tracks product statistics and metadata

2. **Modular SPICE Extraction Service** (`modularSpiceExtractionService.ts`)
   - Supports multiple model types (empirical, physical, hybrid)
   - Template-based extraction system
   - Model conversion capabilities
   - Job management and progress tracking

3. **Database Schema** (Enhanced Prisma models)
   - Product and parameter management
   - SPICE model storage and versioning
   - Extraction job tracking
   - Template management

4. **User Interface** (`ProductManagementPage.tsx`)
   - Comprehensive product management interface
   - SPICE model extraction controls
   - Real-time job monitoring
   - Model conversion tools

## Key Features

### 1. Unified Product Management

#### Product Data Structure
```typescript
interface Product {
  id: string;
  name: string;
  manufacturer: string;
  partNumber: string;
  deviceType: string; // GaN-HEMT, SiC-MOSFET, etc.
  package?: string;
  description?: string;
  parameters: ProductParameter[];
  spiceModels: SPICEModel[];
}
```

#### Parameter Management
- **Categorized Parameters**: Electrical, Thermal, Package, AC, DC, Switching
- **Value Ranges**: Min, Max, Typical values
- **Source Tracking**: Datasheet, Extraction, Manual, Imported
- **Confidence Scoring**: Quality assessment of extracted data

### 2. Modular SPICE Model Extraction

#### Supported Model Types

**Empirical Models**
- EPC GaN library models
- Manufacturer-provided .lib files
- Curve-fitted models
- Fast simulation, moderate accuracy

**Physical Models**
- ASM (Advanced SPICE Model)
- MVSG (Multi-Voltage Multi-Segment)
- Physics-based parameters
- High accuracy, slower simulation

**Hybrid Models**
- Combination of empirical and physical approaches
- Balanced performance and accuracy

#### Template System

The system uses configurable templates for different device types and model formats:

```typescript
interface SPICEModelTemplate {
  id: string;
  name: string;
  deviceType: string;
  modelFormat: string;
  modelType: 'empirical' | 'physical' | 'hybrid';
  template: {
    parameters: SPICEParameterMapping[];
    subcircuit?: string;
    modelDefinition?: string;
  };
}
```

#### Parameter Mapping
- **Datasheet to SPICE**: Automatic mapping of datasheet parameters to SPICE model parameters
- **Calculated Parameters**: Formula-based derivation of complex parameters
- **Default Values**: Fallback values for missing parameters
- **Validation**: Parameter range checking and validation

### 3. User Flow Control

#### Model Selection Workflow

1. **Product Selection**: Choose from existing products or create new ones
2. **Model Type Selection**: Empirical, Physical, or Hybrid
3. **Format Selection**: EPC, ASM, MVSG, BSIM, etc.
4. **Template Selection**: Use default or custom templates
5. **Parameter Review**: Review and adjust extracted parameters
6. **Model Generation**: Generate SPICE model with validation

#### Conversion Workflow

1. **Import Empirical Model**: Load existing .lib files (e.g., EPC library)
2. **Parameter Analysis**: Extract and analyze model parameters
3. **Conversion Selection**: Choose target physical model format
4. **Parameter Mapping**: Map empirical to physical parameters
5. **Validation**: Validate converted model accuracy
6. **Export**: Generate physical model file

### 4. Unified CSV Format

The system uses a standardized CSV format for product data exchange:

```csv
partNumber,manufacturer,deviceType,package,description,parameterName,parameterValue,parameterUnit,parameterMin,parameterMax,parameterTyp,parameterCategory,parameterSource,parameterConfidence
EPC2014,EPC,GaN-HEMT,LGA,100V 14A Enhancement Mode GaN Transistor,VDS,100,V,,,100,Electrical,Datasheet,1.0
EPC2014,EPC,GaN-HEMT,LGA,100V 14A Enhancement Mode GaN Transistor,RDS(on),7.5,mΩ,6.5,8.5,7.5,Electrical,Datasheet,1.0
```

#### CSV Format Benefits
- **Standardized**: Consistent format across all manufacturers
- **Comprehensive**: Includes all product and parameter data
- **Importable**: Easy import into other systems
- **Exportable**: Simple export for data sharing
- **Versionable**: Track changes over time

## Implementation Details

### Database Schema

#### Enhanced Models

```prisma
model Product {
  id              String   @id @default(uuid())
  name            String
  manufacturer    String
  partNumber      String   @unique
  deviceType      String
  package         String?
  description     String?
  datasheets      Datasheet[]
  spiceModels     SPICEModel[]
  parameters      ProductParameter[]
  extractionJobs  ExtractionJob[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model SPICEModel {
  id              String   @id @default(uuid())
  productId       String
  name            String
  modelType       String   // empirical, physical, hybrid
  modelFormat     String   // EPC, ASM, MVSG, BSIM, etc.
  version         String   @default("1.0")
  status          String   @default("draft")
  sourceFile      String?
  generatedFile   String?
  parameters      SPICEModelParameter[]
  validationResults ValidationResult[]
  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Service Architecture

#### Product Management Service

```typescript
class ProductManagementService {
  // CRUD operations
  static async createProduct(productData, parameters): Promise<Product>
  static async getProductById(id): Promise<Product>
  static async getAllProducts(filters): Promise<Product[]>
  static async updateProduct(id, data): Promise<Product>
  static async deleteProduct(id): Promise<void>
  
  // Import/Export
  static async exportProductsToCSV(products): Promise<string>
  static async importProductsFromCSV(csvData): Promise<{success, errors}>
  
  // Statistics
  static async getProductStatistics(): Promise<Statistics>
}
```

#### Modular SPICE Extraction Service

```typescript
class ModularSpiceExtractionService {
  // Template management
  static async getTemplates(deviceType?, modelType?): Promise<SPICEModelTemplate[]>
  
  // Extraction workflow
  static async createExtractionJob(productId, modelType, modelFormat): Promise<ExtractionJob>
  static async executeExtraction(jobId, modelType, modelFormat): Promise<ExtractionResult>
  
  // Model conversion
  static async convertToPhysicalModel(modelId, targetFormat): Promise<ExtractionResult>
  
  // Import/Export
  static async importEmpiricalModel(productId, libFilePath, modelName): Promise<ExtractionResult>
}
```

### User Interface Components

#### Product Management Page

- **Product List**: Searchable, filterable product table
- **Product Details**: Comprehensive product information display
- **Parameter Management**: Visual parameter editing and validation
- **SPICE Model Management**: Model list with conversion options
- **Extraction Controls**: Model extraction workflow interface

#### Key UI Features

1. **Real-time Statistics**: Product and model counts by type
2. **Advanced Filtering**: By manufacturer, device type, model type
3. **Bulk Operations**: Import/export multiple products
4. **Progress Tracking**: Real-time extraction job monitoring
5. **Model Conversion**: One-click conversion between model types

## Usage Examples

### 1. Creating a New Product

```typescript
// Create product with parameters
const product = await ProductManagementService.createProduct({
  name: 'EPC2014',
  manufacturer: 'EPC',
  partNumber: 'EPC2014',
  deviceType: 'GaN-HEMT',
  package: 'LGA',
  description: '100V 14A Enhancement Mode GaN Transistor'
}, [
  {
    name: 'VDS',
    value: '100',
    unit: 'V',
    category: 'Electrical',
    source: 'Datasheet'
  },
  {
    name: 'RDS(on)',
    value: '7.5',
    unit: 'mΩ',
    category: 'Electrical',
    source: 'Datasheet'
  }
]);
```

### 2. Extracting SPICE Model

```typescript
// Create extraction job
const job = await ModularSpiceExtractionService.createExtractionJob(
  productId,
  'empirical',
  'EPC'
);

// Execute extraction
const result = await ModularSpiceExtractionService.executeExtraction(
  job.id,
  'empirical',
  'EPC'
);
```

### 3. Converting to Physical Model

```typescript
// Convert empirical model to ASM physical model
const result = await ModularSpiceExtractionService.convertToPhysicalModel(
  empiricalModelId,
  'ASM'
);
```

### 4. Importing EPC Library

```typescript
// Import empirical model from .lib file
const result = await ModularSpiceExtractionService.importEmpiricalModel(
  productId,
  '/path/to/EPCGaNLibrary.lib',
  'EPC2014'
);
```

## Integration with Existing Systems

### 1. Web Scraping Integration

The product management system integrates with the existing web scraping service:

- **Automatic Product Creation**: Products created from scraped data
- **Parameter Extraction**: Automatic parameter extraction from datasheets
- **Model Generation**: SPICE model generation from extracted data

### 2. Curve Extraction Integration

- **Graph Data**: Extracted curve data used for model validation
- **Parameter Verification**: Curve data validates extracted parameters
- **Model Accuracy**: Curve fitting improves model accuracy

### 3. Database Integration

- **Unified Schema**: All data stored in consistent format
- **Relationship Management**: Proper relationships between products, parameters, and models
- **Version Control**: Track changes and model versions

## Benefits

### 1. User Control

- **Flexible Workflows**: Users choose extraction approach
- **Model Selection**: Choose between empirical and physical models
- **Parameter Control**: Review and adjust all parameters
- **Conversion Options**: Convert between model types

### 2. Modularity

- **Template System**: Configurable templates for different devices
- **Service Architecture**: Independent, testable services
- **Extensible**: Easy to add new model types and formats
- **Maintainable**: Clear separation of concerns

### 3. Data Quality

- **Validation**: Comprehensive parameter validation
- **Source Tracking**: Track data sources and confidence
- **Version Control**: Track model versions and changes
- **Error Handling**: Robust error handling and recovery

### 4. Performance

- **Efficient Storage**: Optimized database schema
- **Fast Queries**: Indexed for quick product searches
- **Batch Operations**: Support for bulk import/export
- **Caching**: Intelligent caching of frequently accessed data

## Future Enhancements

### 1. Advanced Model Types

- **BSIM Models**: Support for BSIM3/BSIM4 models
- **Custom Models**: User-defined model templates
- **Machine Learning**: ML-based parameter extraction
- **Hybrid Models**: Advanced hybrid modeling approaches

### 2. Validation and Testing

- **Model Validation**: Automated model accuracy testing
- **Benchmarking**: Performance benchmarking tools
- **Regression Testing**: Automated regression testing
- **Quality Metrics**: Model quality assessment

### 3. Collaboration Features

- **User Permissions**: Role-based access control
- **Sharing**: Model sharing between users
- **Comments**: Collaborative model review
- **Version History**: Detailed change tracking

### 4. Integration Enhancements

- **EDA Tool Integration**: Direct integration with EDA tools
- **API Access**: RESTful API for external access
- **Cloud Storage**: Cloud-based model storage
- **Real-time Sync**: Real-time synchronization

## Conclusion

The new SPICE model extraction and product management system provides a comprehensive, modular solution for semiconductor device modeling. With support for both empirical and physical models, flexible user workflows, and robust data management, the system enables users to efficiently create, manage, and convert SPICE models while maintaining data quality and traceability.

The unified CSV format and template system ensure consistency across different manufacturers and device types, while the modular architecture allows for easy extension and customization. The integration with existing web scraping and curve extraction services creates a complete workflow from datasheet to validated SPICE model. 