import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardContent, CardTitle, Button, Badge, Alert, AlertDescription } from '@espice/ui';
import { 
  Upload, 
  FileText, 
  Image, 
  X, 
  CheckCircle, 
  AlertCircle, 
  BarChart3,
  Zap,
  Thermometer,
  Activity,
  Battery,
  ArrowUpDown
} from 'lucide-react';

export interface CharacteristicData {
  id: string;
  type: 'output' | 'transfer' | 'rds_vgs_temp' | 'rds_vgs_current' | 'reverse_drain_source' | 'capacitance';
  name: string;
  description: string;
  csvFile?: File;
  imageFile?: File;
  csvData?: any[];
  imageUrl?: string;
  uploaded: boolean;
  error?: string;
}

interface ProductDataUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onUploadComplete: (data: CharacteristicData[]) => void;
}

const CHARACTERISTIC_TYPES: Omit<CharacteristicData, 'id' | 'csvFile' | 'imageFile' | 'csvData' | 'imageUrl' | 'uploaded' | 'error'>[] = [
  {
    type: 'output',
    name: 'Output Characteristics',
    description: 'Drain current vs Drain-Source voltage at various gate voltages'
  },
  {
    type: 'transfer',
    name: 'Transfer Characteristics',
    description: 'Drain current vs Gate-Source voltage at various drain voltages'
  },
  {
    type: 'rds_vgs_temp',
    name: 'Rds(on) vs Vgs - Temperature',
    description: 'On-resistance vs Gate-Source voltage at various temperatures'
  },
  {
    type: 'rds_vgs_current',
    name: 'Rds(on) vs Vgs - Current',
    description: 'On-resistance vs Gate-Source voltage at various drain currents'
  },
  {
    type: 'reverse_drain_source',
    name: 'Reverse Drain-Source Characteristics',
    description: 'Reverse breakdown characteristics and leakage current'
  },
  {
    type: 'capacitance',
    name: 'Capacitance Characteristics',
    description: 'Gate and drain capacitance vs voltage (log scale)'
  }
];

const getCharacteristicIcon = (type: string) => {
  switch (type) {
    case 'output':
      return <BarChart3 className="w-4 h-4" />;
    case 'transfer':
      return <ArrowUpDown className="w-4 h-4" />;
    case 'rds_vgs_temp':
      return <Thermometer className="w-4 h-4" />;
    case 'rds_vgs_current':
      return <Activity className="w-4 h-4" />;
    case 'reverse_drain_source':
      return <Zap className="w-4 h-4" />;
    case 'capacitance':
      return <Battery className="w-4 h-4" />;
    default:
      return <BarChart3 className="w-4 h-4" />;
  }
};

export default function ProductDataUploadModal({ 
  isOpen, 
  onClose, 
  productId, 
  productName, 
  onUploadComplete 
}: ProductDataUploadModalProps) {
  const [characteristics, setCharacteristics] = useState<CharacteristicData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Initialize characteristics on modal open
  React.useEffect(() => {
    if (isOpen) {
      const initialCharacteristics = CHARACTERISTIC_TYPES.map((char, index) => ({
        ...char,
        id: `char-${index}`,
        uploaded: false
      }));
      setCharacteristics(initialCharacteristics);
      setUploadProgress({});
    }
  }, [isOpen]);

  const handleFileUpload = async (characteristicId: string, file: File, type: 'csv' | 'image') => {
    const characteristic = characteristics.find(c => c.id === characteristicId);
    if (!characteristic) return;

    const updatedCharacteristic = { ...characteristic };
    
    if (type === 'csv') {
      updatedCharacteristic.csvFile = file;
      // Parse CSV data
      try {
        const text = await file.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
        updatedCharacteristic.csvData = data;
        updatedCharacteristic.error = undefined;
      } catch (error) {
        updatedCharacteristic.error = 'Failed to parse CSV file';
      }
    } else {
      updatedCharacteristic.imageFile = file;
      updatedCharacteristic.imageUrl = URL.createObjectURL(file);
      updatedCharacteristic.error = undefined;
    }

    setCharacteristics(prev => 
      prev.map(c => c.id === characteristicId ? updatedCharacteristic : c)
    );
  };

  const handleUploadAll = async () => {
    setUploading(true);
    const progress: Record<string, number> = {};
    
    for (const characteristic of characteristics) {
      if (characteristic.csvFile || characteristic.imageFile) {
        progress[characteristic.id] = 0;
        
        // Simulate upload progress
        for (let i = 0; i <= 100; i += 20) {
          progress[characteristic.id] = i;
          setUploadProgress({ ...progress });
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Mark as uploaded
        setCharacteristics(prev => 
          prev.map(c => c.id === characteristic.id ? { ...c, uploaded: true } : c)
        );
      }
    }
    
    setUploading(false);
    onUploadComplete(characteristics.filter(c => c.uploaded));
  };

  const removeFile = (characteristicId: string, type: 'csv' | 'image') => {
    setCharacteristics(prev => 
      prev.map(c => {
        if (c.id === characteristicId) {
          const updated = { ...c };
          if (type === 'csv') {
            delete updated.csvFile;
            delete updated.csvData;
          } else {
            delete updated.imageFile;
            if (updated.imageUrl) {
              URL.revokeObjectURL(updated.imageUrl);
              delete updated.imageUrl;
            }
          }
          return updated;
        }
        return c;
      })
    );
  };

  const triggerFileInput = (characteristicId: string, type: 'csv' | 'image') => {
    const input = fileInputRefs.current[`${characteristicId}-${type}`];
    if (input) {
      input.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Characteristic Data
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Upload CSV data and images for {productName} characteristics
          </p>
        </CardHeader>
        
        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {characteristics.map((characteristic) => (
              <div key={characteristic.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getCharacteristicIcon(characteristic.type)}
                    <div>
                      <h3 className="font-semibold text-gray-900">{characteristic.name}</h3>
                      <p className="text-sm text-gray-600">{characteristic.description}</p>
                    </div>
                  </div>
                  {characteristic.uploaded && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CSV Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      CSV Data
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerFileInput(characteristic.id, 'csv')}
                        disabled={uploading}
                        className="flex-1"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {characteristic.csvFile ? 'Change CSV' : 'Upload CSV'}
                      </Button>
                      {characteristic.csvFile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(characteristic.id, 'csv')}
                          disabled={uploading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {characteristic.csvFile && (
                      <div className="text-xs text-gray-600">
                        {characteristic.csvFile.name} ({Math.round(characteristic.csvFile.size / 1024)}KB)
                        {characteristic.csvData && (
                          <span className="ml-2 text-green-600">
                            ✓ {characteristic.csvData.length} data points
                          </span>
                        )}
                      </div>
                    )}
                    <input
                      ref={el => fileInputRefs.current[`${characteristic.id}-csv`] = el}
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(characteristic.id, file, 'csv');
                      }}
                      className="hidden"
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Image
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerFileInput(characteristic.id, 'image')}
                        disabled={uploading}
                        className="flex-1"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {characteristic.imageFile ? 'Change Image' : 'Upload Image'}
                      </Button>
                      {characteristic.imageFile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(characteristic.id, 'image')}
                          disabled={uploading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {characteristic.imageFile && (
                      <div className="text-xs text-gray-600">
                        {characteristic.imageFile.name} ({Math.round(characteristic.imageFile.size / 1024)}KB)
                      </div>
                    )}
                    <input
                      ref={el => fileInputRefs.current[`${characteristic.id}-image`] = el}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(characteristic.id, file, 'image');
                      }}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Image Preview */}
                {characteristic.imageUrl && (
                  <div className="mt-4">
                    <img
                      src={characteristic.imageUrl}
                      alt={characteristic.name}
                      className="max-w-full h-32 object-contain border border-gray-200 rounded"
                    />
                  </div>
                )}

                {/* Error Display */}
                {characteristic.error && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{characteristic.error}</AlertDescription>
                  </Alert>
                )}

                {/* Upload Progress */}
                {uploadProgress[characteristic.id] !== undefined && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress[characteristic.id]}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Uploading... {uploadProgress[characteristic.id]}%
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUploadAll}
              disabled={uploading || characteristics.every(c => !c.csvFile && !c.imageFile)}
            >
              {uploading ? 'Uploading...' : 'Upload All Data'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 