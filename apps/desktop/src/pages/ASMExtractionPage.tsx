import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Tabs, TabsContent, TabsList, TabsTrigger, Badge, Alert, AlertDescription } from '@espice/ui';
import { 
  FileText, 
  BarChart3, 
  Download, 
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { ASMSpiceExtractionPanel } from '../components/ASMSpiceExtractionPanel';
import { ASMDataInputForm } from '../components/ASMDataInputForm';
import { ASMExtractionData, ASMExtractionResult } from '../services/asmSpiceExtractionService';
import type { Product } from '../types/index';

// Example product for demonstration
const exampleProduct: Product = {
  id: 'example-gan-hemt',
  name: 'EPC2040 GaN HEMT',
  manufacturer: 'Efficient Power Conversion',
  partNumber: 'EPC2040',
  deviceType: 'GaN-HEMT',
  description: '100V, 12A GaN HEMT for power applications',
  datasheetUrl: '',
  createdAt: new Date(),
  updatedAt: new Date()
};

// Example extraction data
const exampleExtractionData: ASMExtractionData = {
  outputCharacteristics: {
    vds: [0.1, 0.2, 0.5, 1.0, 2.0, 0.1, 0.2, 0.5, 1.0, 2.0, 0.1, 0.2, 0.5, 1.0, 2.0],
    id: [0.001, 0.002, 0.005, 0.008, 0.010, 0.002, 0.004, 0.010, 0.016, 0.020, 0.005, 0.010, 0.025, 0.040, 0.050],
    vgs: [1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0, 3.0, 3.0]
  },
  rdsVgsTemp: {
    vgs: [1.0, 2.0, 3.0, 4.0, 5.0, 1.0, 2.0, 3.0, 4.0, 5.0],
    rds: [0.15, 0.12, 0.10, 0.09, 0.08, 0.18, 0.15, 0.13, 0.12, 0.11],
    temp: [25, 25, 25, 25, 25, 125, 125, 125, 125, 125]
  },
  capacitance: [
    {
      vds: [0.1, 0.5, 1.0, 2.0, 5.0],
      c: [1000, 800, 600, 400, 200],
      type: 'ciss' as const
    },
    {
      vds: [0.1, 0.5, 1.0, 2.0, 5.0],
      c: [500, 300, 200, 100, 50],
      type: 'coss' as const
    },
    {
      vds: [0.1, 0.5, 1.0, 2.0, 5.0],
      c: [50, 30, 20, 10, 5],
      type: 'crss' as const
    }
  ]
};

export const ASMExtractionPage: React.FC = () => {
  const [extractionData, setExtractionData] = useState<ASMExtractionData>({});
  const [extractionResult, setExtractionResult] = useState<ASMExtractionResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleExtractionComplete = (result: ASMExtractionResult) => {
    setExtractionResult(result);
  };

  const handleLoadExampleData = () => {
    setExtractionData(exampleExtractionData);
  };

  const handleClearData = () => {
    setExtractionData({});
    setExtractionResult(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ASM-HEMT Parameter Extraction</h1>
          <p className="text-muted-foreground mt-2">
            Extract SPICE model parameters for GaN HEMT devices from measurement data
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleLoadExampleData} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Load Example
          </Button>
          <Button onClick={handleClearData} variant="outline">
            Clear Data
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="extraction">Extraction</TabsTrigger>
          <TabsTrigger value="manual">Manual Input</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  What is ASM-HEMT?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  ASM-HEMT (Advanced SPICE Model for High Electron Mobility Transistors) is a comprehensive 
                  SPICE model specifically designed for GaN devices. It provides accurate modeling of:
                </p>
                <ul className="text-sm space-y-1">
                  <li>• DC characteristics (I-V curves)</li>
                  <li>• AC characteristics (capacitance)</li>
                  <li>• Temperature dependence</li>
                  <li>• Self-heating effects</li>
                  <li>• Trapping effects</li>
                  <li>• Access region resistance</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Required Data Types
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Output Characteristics</span>
                    <Badge variant="secondary">vds, id, vgs</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">RDS vs VGS Temp</span>
                    <Badge variant="secondary">vgs, rds, temp</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Capacitance Data</span>
                    <Badge variant="secondary">vds, c, type</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Transfer Characteristics</span>
                    <Badge variant="secondary">vgs, id, temp</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Thermal Resistance</span>
                    <Badge variant="secondary">temp, rds</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Start Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs flex items-center justify-center">1</div>
                    <span className="font-medium">Prepare Data</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Collect measurement data and format as CSV with required columns
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs flex items-center justify-center">2</div>
                    <span className="font-medium">Upload Data</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload CSV files or input data manually through the interface
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs flex items-center justify-center">3</div>
                    <span className="font-medium">Extract Parameters</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Run extraction to generate SPICE model parameters
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Tip:</strong> Click "Load Example" to see the extraction system in action with sample data for the EPC2040 GaN HEMT device.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="extraction" className="space-y-6">
          <ASMSpiceExtractionPanel
            product={exampleProduct}
            onExtractionComplete={handleExtractionComplete}
          />
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <ASMDataInputForm
            onDataChange={setExtractionData}
            initialData={extractionData}
          />
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {extractionResult ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {extractionResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    Extraction Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium mb-2">Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Success:</span>
                          <Badge variant={extractionResult.success ? "default" : "destructive"}>
                            {extractionResult.success ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Confidence:</span>
                          <Badge variant="outline">
                            {Math.round(extractionResult.confidence * 100)}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Parameters:</span>
                          <Badge variant="outline">
                            {Object.keys(extractionResult.parameters).length}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Issues</h4>
                      <div className="space-y-2">
                        {extractionResult.errors.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-red-600">Errors:</span>
                            <ul className="text-sm text-red-600 mt-1">
                              {extractionResult.errors.map((error, i) => (
                                <li key={i}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {extractionResult.warnings.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-yellow-600">Warnings:</span>
                            <ul className="text-sm text-yellow-600 mt-1">
                              {extractionResult.warnings.map((warning, i) => (
                                <li key={i}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {extractionResult.success && (
                <Card>
                  <CardHeader>
                    <CardTitle>Extracted Parameters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      {Object.entries(extractionResult.parameters).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center p-2 border rounded">
                          <span className="text-sm font-medium">{key}:</span>
                          <span className="text-sm text-muted-foreground">
                            {typeof value === 'number' ? value.toExponential(4) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload data and run extraction to see results here.
                </p>
                <Button onClick={() => setActiveTab('extraction')}>
                  Go to Extraction
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}; 