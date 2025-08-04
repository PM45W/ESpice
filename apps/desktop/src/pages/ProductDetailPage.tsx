import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Zap, 
  Settings, 
  Database,
  Cpu,
  Layers,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Eye,
  Package,
  Gauge,
  Thermometer,
  Wrench,
  Edit,
  Save,
  X,
  Upload,
  Plus,
  Trash2,
  Copy,
  Search,
  Filter
} from 'lucide-react';
import productManagementService, { ProductWithParameters, ProductUpdateInput, ProductParameter } from '../services/productManagementService';
import datasheetService from '../services/datasheetService';
import PDFViewer from '../components/PDFViewer';
import { CharacteristicData } from '../services/productManagementService';

// CSS imports
import '../styles/buttons.css';
import '../styles/tables.css';

interface ProductDetailPageProps {
  // Add any props if needed
}

const ProductDetailPage: React.FC<ProductDetailPageProps> = () => {
  // Extract productId from URL path
  const productId = window.location.pathname.split('/').pop() || '';
  const [product, setProduct] = useState<ProductWithParameters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'specifications' | 'parameters' | 'datasheet' | 'curves'>('overview');
  const [editMode, setEditMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductUpdateInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingDatasheet, setUploadingDatasheet] = useState(false);
  const [datasheetViewer, setDatasheetViewer] = useState<{
    visible: boolean;
    file: File | string | null;
    loading: boolean;
  }>({
    visible: false,
    file: null,
    loading: false
  });

  const [imageViewer, setImageViewer] = useState<{ visible: boolean; characteristic: CharacteristicData | null }>({
    visible: false,
    characteristic: null
  });

  const [csvViewer, setCsvViewer] = useState<{ visible: boolean; characteristicType: string | null; csvData: any[] | null }>({
    visible: false,
    characteristicType: null,
    csvData: null
  });

  // EPC2040 Sample Data
  const epc2040SampleData = {
    name: "EPC2040",
    manufacturer: "Efficient Power Conversion",
    partNumber: "EPC2040",
    deviceType: "eGaN FET",
    package: "QFN 3x5mm",
    description: "100V, 12A eGaN FET with integrated gate driver",
    voltageRating: 100,
    currentRating: 12,
    powerRating: 120,
    specifications: {
      "Drain-Source Voltage (VDS)": "100V",
      "Drain Current (ID)": "12A",
      "Power Dissipation (PD)": "120W",
      "Gate-Source Voltage (VGS)": "±20V",
      "Threshold Voltage (VGS(th))": "1.4V",
      "On-Resistance (RDS(on))": "7.5mΩ",
      "Input Capacitance (CISS)": "1.2nF",
      "Output Capacitance (COSS)": "0.8nF",
      "Reverse Transfer Capacitance (CRSS)": "0.15nF",
      "Turn-On Delay Time (td(on))": "15ns",
      "Turn-Off Delay Time (td(off))": "25ns",
      "Rise Time (tr)": "8ns",
      "Fall Time (tf)": "6ns",
      "Thermal Resistance Junction-to-Case (RθJC)": "1.2°C/W",
      "Operating Temperature Range": "-40°C to +150°C"
    },
    parameters: [
      { id: "1", name: "Drain-Source Voltage", value: 100, unit: "V", category: "electrical", description: "Maximum drain-source voltage" },
      { id: "2", name: "Drain Current", value: 12, unit: "A", category: "electrical", description: "Maximum continuous drain current" },
      { id: "3", name: "Power Dissipation", value: 120, unit: "W", category: "thermal", description: "Maximum power dissipation" },
      { id: "4", name: "Gate-Source Voltage", value: 20, unit: "V", category: "electrical", description: "Maximum gate-source voltage" },
      { id: "5", name: "Threshold Voltage", value: 1.4, unit: "V", category: "electrical", description: "Gate threshold voltage" },
      { id: "6", name: "On-Resistance", value: 7.5, unit: "mΩ", category: "electrical", description: "Drain-source on-resistance" },
      { id: "7", name: "Input Capacitance", value: 1.2, unit: "nF", category: "electrical", description: "Input capacitance" },
      { id: "8", name: "Output Capacitance", value: 0.8, unit: "nF", category: "electrical", description: "Output capacitance" },
      { id: "9", name: "Reverse Transfer Capacitance", value: 0.15, unit: "nF", category: "electrical", description: "Reverse transfer capacitance" },
      { id: "10", name: "Turn-On Delay", value: 15, unit: "ns", category: "timing", description: "Turn-on delay time" },
      { id: "11", name: "Turn-Off Delay", value: 25, unit: "ns", category: "timing", description: "Turn-off delay time" },
      { id: "12", name: "Rise Time", value: 8, unit: "ns", category: "timing", description: "Rise time" },
      { id: "13", name: "Fall Time", value: 6, unit: "ns", category: "timing", description: "Fall time" },
      { id: "14", name: "Thermal Resistance", value: 1.2, unit: "°C/W", category: "thermal", description: "Junction-to-case thermal resistance" },
      { id: "15", name: "Operating Temperature", value: 150, unit: "°C", category: "thermal", description: "Maximum operating temperature" }
    ] as ProductParameter[]
  };

  useEffect(() => {
    if (productId) {
      loadProduct(productId);
    }
  }, [productId]);

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (product?.datasheetUrl && product.datasheetUrl.startsWith('blob:')) {
        datasheetService.revokeBlobUrl(product.datasheetUrl);
      }
    };
  }, [product?.datasheetUrl]);

  const loadProduct = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to load from service first
      let productData = await productManagementService.getProduct(id);
      
      // If no product found, use sample data for EPC2040
      if (!productData && (id === 'epc2040' || id.includes('EPC2040'))) {
        productData = {
          id: 'epc2040',
          name: epc2040SampleData.name,
          manufacturer: epc2040SampleData.manufacturer,
          partNumber: epc2040SampleData.partNumber,
          deviceType: epc2040SampleData.deviceType,
          package: epc2040SampleData.package,
          description: epc2040SampleData.description,
          voltageRating: epc2040SampleData.voltageRating,
          currentRating: epc2040SampleData.currentRating,
          powerRating: epc2040SampleData.powerRating,
          datasheetUrl: '/services/web-scraper/datasheets/epc/epc2040_datasheet.pdf',
          specifications: epc2040SampleData.specifications,
          parameters: epc2040SampleData.parameters,
          characteristics: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      if (productData) {
        setProduct(productData);
        setEditingProduct({
          id: productData.id,
          name: productData.name,
          manufacturer: productData.manufacturer,
          partNumber: productData.partNumber,
          deviceType: productData.deviceType,
          package: productData.package,
          description: productData.description,
          voltageRating: productData.voltageRating,
          currentRating: productData.currentRating,
          powerRating: productData.powerRating,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
    if (!editMode && product) {
      setEditingProduct({
        id: product.id,
        name: product.name,
        manufacturer: product.manufacturer,
        partNumber: product.partNumber,
        deviceType: product.deviceType,
        package: product.package,
        description: product.description,
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!editingProduct) return;
    
    try {
      setSaving(true);
      const updatedProduct = await productManagementService.updateProduct(editingProduct);
      if (updatedProduct) {
        setProduct(updatedProduct);
        setEditMode(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof ProductUpdateInput, value: any) => {
    if (editingProduct) {
      setEditingProduct({ ...editingProduct, [field]: value });
    }
  };

  const handleDatasheetUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !product) return;

    try {
      setUploadingDatasheet(true);
      const uploadedUrl = await datasheetService.uploadDatasheet(file, product.id);
      if (uploadedUrl) {
        setProduct({ ...product, datasheetUrl: uploadedUrl });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload datasheet');
    } finally {
      setUploadingDatasheet(false);
    }
  };

  const handleDownloadDatasheet = async () => {
    if (!product?.datasheetUrl) return;
    
    try {
      // For local files, create a download link
      if (product.datasheetUrl.startsWith('/')) {
        const response = await fetch(product.datasheetUrl);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${product.name}_datasheet.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          throw new Error('Failed to download datasheet file');
        }
      } else {
        // For external URLs, use the datasheet service
        await datasheetService.downloadDatasheet(product.datasheetUrl, product.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download datasheet');
    }
  };

  const handleDownloadSpiceModel = async () => {
    if (!product) return;
    
    try {
      await productManagementService.downloadSpiceModel(product.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download SPICE model');
    }
  };

  const handleViewDatasheet = async () => {
    if (!product?.datasheetUrl) return;
    
    try {
      setDatasheetViewer({ visible: true, file: product.datasheetUrl, loading: true });
      
      // For local files, try to fetch them directly
      if (product.datasheetUrl.startsWith('/')) {
        const response = await fetch(product.datasheetUrl);
        if (response.ok) {
          const blob = await response.blob();
          const file = new File([blob], 'datasheet.pdf', { type: 'application/pdf' });
          setDatasheetViewer({ visible: true, file, loading: false });
        } else {
          throw new Error('Failed to load datasheet file');
        }
      } else {
        // For external URLs, use the datasheet service
        const file = await datasheetService.getDatasheetFile(product.datasheetUrl);
        setDatasheetViewer({ visible: true, file, loading: false });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load datasheet');
      setDatasheetViewer({ visible: false, file: null, loading: false });
    }
  };

  const handleViewUploadedDatasheet = (file: File) => {
    setDatasheetViewer({ visible: true, file, loading: false });
  };

  const handleDownloadCSV = (characteristic: CharacteristicData) => {
    if (!characteristic.csvData) return;
    
    const csvContent = characteristic.csvData.map(row => 
      Object.values(row).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${characteristic.name}_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleViewImage = (characteristic: CharacteristicData) => {
    setImageViewer({ visible: true, characteristic });
  };

  const handleExtractFromImage = (characteristic: CharacteristicData) => {
    // Placeholder for image extraction functionality
    console.log('Extract from image:', characteristic);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, characteristicType: string, fileType: 'csv' | 'image') => {
    const file = event.target.files?.[0];
    if (!file || !product) return;

    try {
      if (fileType === 'csv') {
        const csvData = await productManagementService.uploadCSVData(file, product.id, characteristicType);
        if (csvData) {
          setProduct({
            ...product,
            characteristics: product.characteristics.map(c => 
              c.type === characteristicType ? { ...c, csvData } : c
            )
          });
        }
      } else if (fileType === 'image') {
        const imageUrl = await productManagementService.uploadImageData(file, product.id, characteristicType);
        if (imageUrl) {
          setProduct({
            ...product,
            characteristics: product.characteristics.map(c => 
              c.type === characteristicType ? { ...c, imageUrl } : c
            )
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to upload ${fileType} file`);
    }
  };

  const getCharacteristicName = (type: string): string => {
    const names: { [key: string]: string } = {
      'output_characteristics': 'Output Characteristics',
      'transfer_characteristics': 'Transfer Characteristics',
      'input_characteristics': 'Input Characteristics',
      'capacitance_characteristics': 'Capacitance Characteristics',
      'switching_characteristics': 'Switching Characteristics',
      'thermal_characteristics': 'Thermal Characteristics'
    };
    return names[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getCharacteristicDescription = (type: string): string => {
    const descriptions: { [key: string]: string } = {
      'output_characteristics': 'Shows the relationship between output current and voltage',
      'transfer_characteristics': 'Shows the relationship between input and output parameters',
      'input_characteristics': 'Shows the relationship between input current and voltage',
      'capacitance_characteristics': 'Shows capacitance vs voltage relationships',
      'switching_characteristics': 'Shows switching speed and timing parameters',
      'thermal_characteristics': 'Shows thermal resistance and junction temperature data'
    };
    return descriptions[type] || 'Characteristic data for this device parameter';
  };

  const getCharacteristicStatus = (type: string, fileType: 'csv' | 'image'): 'extracted' | 'not_uploaded' => {
    if (!product) return 'not_uploaded';
    const characteristic = product.characteristics.find(c => c.type === type);
    if (!characteristic) return 'not_uploaded';
    
    if (fileType === 'csv') {
      return characteristic.csvData && characteristic.csvData.length > 0 ? 'extracted' : 'not_uploaded';
    } else {
      return characteristic.imageUrl ? 'extracted' : 'not_uploaded';
    }
  };

  const getCharacteristicByType = (type: string): CharacteristicData | null => {
    if (!product) return null;
    return product.characteristics.find(c => c.type === type) || null;
  };

  const handleViewCSV = (characteristicType: string) => {
    const characteristic = getCharacteristicByType(characteristicType);
    if (characteristic?.csvData) {
      setCsvViewer({ visible: true, characteristicType, csvData: characteristic.csvData });
    }
  };

  const handleDownloadCSVByType = (characteristicType: string) => {
    const characteristic = getCharacteristicByType(characteristicType);
    if (characteristic) {
      handleDownloadCSV(characteristic);
    }
  };

  const handleViewImageByType = (characteristicType: string) => {
    const characteristic = getCharacteristicByType(characteristicType);
    if (characteristic) {
      handleViewImage(characteristic);
    }
  };

  const handleExtractFromImageByType = (characteristicType: string) => {
    const characteristic = getCharacteristicByType(characteristicType);
    if (characteristic) {
      handleExtractFromImage(characteristic);
    }
  };

  const createCSVGraph = (csvData: any[], characteristicType: string): string => {
    // Placeholder for graph generation
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PHRleHQgeD0iMjAwIiB5PSIxNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+R3JhcGggUGxhY2Vob2xkZXI8L3RleHQ+PC9zdmc+';
  };

  const getParameterIcon = (category: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      'electrical': <Zap className="w-4 h-4" />,
      'thermal': <Thermometer className="w-4 h-4" />,
      'physical': <Package className="w-4 h-4" />,
      'performance': <Gauge className="w-4 h-4" />,
      'timing': <Clock className="w-4 h-4" />
    };
    return icons[category] || <Settings className="w-4 h-4" />;
  };

  const getParameterColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'electrical': 'text-blue-600',
      'thermal': 'text-red-600',
      'physical': 'text-green-600',
      'performance': 'text-purple-600',
      'timing': 'text-orange-600'
    };
    return colors[category] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Product</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => loadProduct(productId)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Product Not Found</h2>
          <p className="text-muted-foreground">The requested product could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
            <p className="text-muted-foreground">{product.manufacturer} - {product.partNumber}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {editMode ? (
            <>
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
              <button
                onClick={handleEditToggle}
                className="flex items-center space-x-2 bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/80 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleEditToggle}
              className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {(['overview', 'specifications', 'parameters', 'datasheet', 'curves'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
              <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                {editMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                      <input
                        type="text"
                        value={editingProduct?.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Manufacturer</label>
                      <input
                        type="text"
                        value={editingProduct?.manufacturer || ''}
                        onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Part Number</label>
                      <input
                        type="text"
                        value={editingProduct?.partNumber || ''}
                        onChange={(e) => handleInputChange('partNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Device Type</label>
                      <input
                        type="text"
                        value={editingProduct?.deviceType || ''}
                        onChange={(e) => handleInputChange('deviceType', e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Package</label>
                      <input
                        type="text"
                        value={editingProduct?.package || ''}
                        onChange={(e) => handleInputChange('package', e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                      <textarea
                        value={editingProduct?.description || ''}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Voltage Rating (V)</label>
                      <input
                        type="number"
                        value={editingProduct?.voltageRating || ''}
                        onChange={(e) => handleInputChange('voltageRating', parseFloat(e.target.value) || undefined)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Current Rating (A)</label>
                      <input
                        type="number"
                        value={editingProduct?.currentRating || ''}
                        onChange={(e) => handleInputChange('currentRating', parseFloat(e.target.value) || undefined)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Power Rating (W)</label>
                      <input
                        type="number"
                        value={editingProduct?.powerRating || ''}
                        onChange={(e) => handleInputChange('powerRating', parseFloat(e.target.value) || undefined)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Package className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Device Type</p>
                        <p className="font-medium text-foreground">{product.deviceType}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Database className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Package</p>
                        <p className="font-medium text-foreground">{product.package}</p>
                      </div>
                    </div>
                    {product.voltageRating && (
                      <div className="flex items-center space-x-3">
                        <Zap className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Voltage Rating</p>
                          <p className="font-medium text-foreground">{product.voltageRating}V</p>
                        </div>
                      </div>
                    )}
                    {product.currentRating && (
                      <div className="flex items-center space-x-3">
                        <Gauge className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Current Rating</p>
                          <p className="font-medium text-foreground">{product.currentRating}A</p>
                        </div>
                      </div>
                    )}
                    {product.powerRating && (
                      <div className="flex items-center space-x-3">
                        <Thermometer className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Power Rating</p>
                          <p className="font-medium text-foreground">{product.powerRating}W</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Description</p>
                      <p className="text-foreground">{product.description}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Actions</h3>
              <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                <button
                  onClick={handleViewDatasheet}
                  disabled={!product.datasheetUrl}
                  className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Datasheet</span>
                </button>
                
                <button
                  onClick={handleDownloadDatasheet}
                  disabled={!product.datasheetUrl}
                  className="w-full flex items-center justify-center space-x-2 bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/80 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Datasheet</span>
                </button>
                
                <button
                  onClick={handleDownloadSpiceModel}
                  className="w-full flex items-center justify-center space-x-2 bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/80 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  <span>Download SPICE Model</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'specifications' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">Specifications</h3>
            <div className="bg-card rounded-lg border border-border p-6">
              {product.specifications && Object.keys(product.specifications).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium text-foreground">{key}</span>
                      <span className="text-sm text-muted-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No specifications available for this product.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'parameters' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Parameters</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search parameters..."
                  className="px-3 py-1 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <select className="px-3 py-1 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">All Categories</option>
                  <option value="electrical">Electrical</option>
                  <option value="thermal">Thermal</option>
                  <option value="mechanical">Mechanical</option>
                  <option value="timing">Timing</option>
                </select>
              </div>
            </div>
            <div className="bg-card rounded-lg border border-border p-6">
              {product.parameters && product.parameters.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 font-medium">Parameter</th>
                        <th className="text-left p-3 font-medium">Value</th>
                        <th className="text-left p-3 font-medium">Unit</th>
                        <th className="text-left p-3 font-medium">Category</th>
                        <th className="text-left p-3 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.parameters.map((param) => (
                        <tr key={param.id} className="border-b border-border hover:bg-muted/30">
                          <td className="p-3 font-medium">{param.name}</td>
                          <td className="p-3">{param.value}</td>
                          <td className="p-3 text-muted-foreground">{param.unit}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getParameterColor(param.category)}`}>
                              {getParameterIcon(param.category)}
                              <span className="ml-1">{param.category}</span>
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">{param.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground">No parameters available for this product.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'datasheet' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Datasheet</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleDatasheetUpload}
                  className="hidden"
                  id="datasheet-upload"
                />
                <label
                  htmlFor="datasheet-upload"
                  className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploadingDatasheet ? 'Uploading...' : 'Upload Datasheet'}</span>
                </label>
              </div>
            </div>
            
            {product.datasheetUrl ? (
              <div className="bg-card rounded-lg border border-border p-6">
                <p className="text-muted-foreground">Datasheet is available. Use the "View Datasheet" button in the Overview tab to view it.</p>
              </div>
            ) : (
              <div className="bg-card rounded-lg border border-border p-6 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No datasheet uploaded yet.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'curves' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">Characteristic Curves</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {['output_characteristics', 'transfer_characteristics', 'input_characteristics', 'capacitance_characteristics', 'switching_characteristics', 'thermal_characteristics'].map((type) => (
                <div key={type} className="bg-card rounded-lg border border-border p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">{getCharacteristicName(type)}</h4>
                    <div className="flex items-center space-x-2">
                      {getCharacteristicStatus(type, 'image') === 'extracted' && (
                        <button
                          onClick={() => handleViewImageByType(type)}
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {getCharacteristicStatus(type, 'csv') === 'extracted' && (
                        <button
                          onClick={() => handleViewCSV(type)}
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{getCharacteristicDescription(type)}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Image:</span>
                      <span className={getCharacteristicStatus(type, 'image') === 'extracted' ? 'text-green-600' : 'text-red-600'}>
                        {getCharacteristicStatus(type, 'image') === 'extracted' ? 'Uploaded' : 'Not uploaded'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Data:</span>
                      <span className={getCharacteristicStatus(type, 'csv') === 'extracted' ? 'text-green-600' : 'text-red-600'}>
                        {getCharacteristicStatus(type, 'csv') === 'extracted' ? 'Extracted' : 'Not extracted'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, type, 'image')}
                      className="hidden"
                      id={`image-upload-${type}`}
                    />
                    <label
                      htmlFor={`image-upload-${type}`}
                      className="flex-1 flex items-center justify-center space-x-2 bg-muted text-muted-foreground px-3 py-2 rounded-md hover:bg-muted/80 transition-colors cursor-pointer text-sm"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Image</span>
                    </label>
                    
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileUpload(e, type, 'csv')}
                      className="hidden"
                      id={`csv-upload-${type}`}
                    />
                    <label
                      htmlFor={`csv-upload-${type}`}
                      className="flex-1 flex items-center justify-center space-x-2 bg-muted text-muted-foreground px-3 py-2 rounded-md hover:bg-muted/80 transition-colors cursor-pointer text-sm"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload CSV</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Datasheet Viewer Modal */}
      {datasheetViewer.visible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-6xl h-5/6 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Datasheet Viewer</h3>
              <button
                onClick={() => setDatasheetViewer({ visible: false, file: null, loading: false })}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4">
              {datasheetViewer.loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading datasheet...</p>
                  </div>
                </div>
              ) : datasheetViewer.file ? (
                <PDFViewer 
                  file={datasheetViewer.file}
                  className="w-full h-full"
                  showToolbar={true}
                  showPageNavigation={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Datasheet not available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {imageViewer.visible && imageViewer.characteristic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-4xl h-5/6 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {imageViewer.characteristic.name}
              </h3>
              <button
                onClick={() => setImageViewer({ visible: false, characteristic: null })}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <div className="text-center">
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <h4 className="text-lg font-medium text-foreground mb-2">
                    {imageViewer.characteristic.name}
                  </h4>
                  <p className="text-muted-foreground mb-4">
                    {imageViewer.characteristic.description}
                  </p>
                  
                  {imageViewer.characteristic.imageUrl && (
                    <div className="flex justify-center mb-4">
                      <img 
                        src={imageViewer.characteristic.imageUrl} 
                        alt={imageViewer.characteristic.name}
                        className="max-w-full h-auto max-h-96 border border-border rounded-lg shadow-sm"
                      />
                    </div>
                  )}
                  
                  {!imageViewer.characteristic.imageUrl && (
                    <div className="w-16 h-16 text-muted-foreground mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                      </svg>
                    </div>
                  )}
                  
                  {imageViewer.characteristic.csvData && imageViewer.characteristic.csvData.length > 0 ? (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h5 className="font-medium text-foreground mb-2">Sample Data</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              {Object.keys(imageViewer.characteristic.csvData[0]).map(header => (
                                <th key={header} className="text-left p-2 font-medium">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {imageViewer.characteristic.csvData.slice(0, 5).map((row, index) => (
                              <tr key={index} className="border-b border-border">
                                {Object.values(row).map((value, cellIndex) => (
                                  <td key={cellIndex} className="p-2">
                                    {value}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {imageViewer.characteristic.csvData.length > 5 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Showing first 5 rows of {imageViewer.characteristic.csvData.length} total rows
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/50 rounded-lg p-6 text-center">
                      <div className="w-12 h-12 text-muted-foreground mx-auto mb-3 flex items-center justify-center">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                      <h5 className="font-medium text-foreground mb-2">Data Not Yet Extracted</h5>
                      <p className="text-sm text-muted-foreground mb-4">
                        CSV data has not been extracted from this image yet. Click the button below to extract the data.
                      </p>
                      <button
                        onClick={() => handleExtractFromImage(imageViewer.characteristic)}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm"
                      >
                        Extract Data from Image
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Viewer Modal */}
      {csvViewer.visible && csvViewer.csvData && csvViewer.characteristicType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-6xl h-5/6 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {getCharacteristicName(csvViewer.characteristicType)} - CSV Data
              </h3>
              <button
                onClick={() => setCsvViewer({ visible: false, characteristicType: null, csvData: null })}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Replotted Graph */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h5 className="font-medium text-foreground mb-4">Replotted Graph</h5>
                  <div className="flex justify-center">
                    <img 
                      src={createCSVGraph(csvViewer.csvData, csvViewer.characteristicType)} 
                      alt="CSV Graph" 
                      className="max-w-full h-auto border border-border rounded"
                    />
                  </div>
                </div>
                
                {/* CSV Data Table */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h5 className="font-medium text-foreground mb-4">CSV Data</h5>
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted">
                        <tr className="border-b border-border">
                          {Object.keys(csvViewer.csvData[0] || {}).map(header => (
                            <th key={header} className="text-left p-2 font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvViewer.csvData.map((row, index) => (
                          <tr key={index} className="border-b border-border hover:bg-muted/30">
                            {Object.values(row).map((value, cellIndex) => (
                              <td key={cellIndex} className="p-2">
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Total rows: {csvViewer.csvData.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;