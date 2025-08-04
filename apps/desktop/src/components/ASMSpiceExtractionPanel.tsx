import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { 
  Upload, 
  Download, 
  FileText, 
  BarChart3, 
  Settings,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { 
  ASMSpiceExtractionService, 
  ASMExtractionData, 
  ASMExtractionResult,
  ASMExtractedParameters 
} from '../services/asmSpiceExtractionService';
import type { Product } from '../types/index';

interface ASMSpiceExtractionPanelProps {
  product?: Product;
  onExtractionComplete?: (result: ASMExtractionResult) => void;
}

export const ASMSpiceExtractionPanel: React.FC<ASMSpiceExtractionPanelProps> = ({
  product,
  onExtractionComplete
}) => {
  const [extractionData, setExtractionData] = useState<ASMExtractionData>({});
  const [extractionResult, setExtractionResult] = useState<ASMExtractionResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [csvData, setCsvData] = useState<Record<string, string>>({});

  const extractionService = new ASMSpiceExtractionService();

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>, dataType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const data = parseCSV(text);
        setCsvData(prev => ({ ...prev, [dataType]: text }));
        
        // Convert CSV data to extraction format
        const convertedData = convertCSVToExtractionData(data, dataType);
        setExtractionData(prev => ({ ...prev, ...convertedData }));
      } catch (error) {
        console.error('Error parsing CSV:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleManualInput = useCallback((dataType: string, data: any) => {
    setExtractionData(prev => ({ ...prev, [dataType]: data }));
  }, []);

  const handleExtractParameters = useCallback(async () => {
    if (!product) {
      alert('Please select a product first');
      return;
    }

    setIsExtracting(true);
    try {
      const result = await extractionService.extractASMParameters(extractionData, product);
      setExtractionResult(result);
      onExtractionComplete?.(result);
    } catch (error) {
      console.error('Extraction failed:', error);
      setExtractionResult({
        success: false,
        parameters: {},
        confidence: 0,
        warnings: [],
        errors: ['Extraction failed: ' + (error instanceof Error ? error.message : 'Unknown error')]
      });
    } finally {
      setIsExtracting(false);
    }
  }, [extractionData, product, onExtractionComplete]);

  const handleExportSPICE = useCallback(() => {
    if (!extractionResult?.success) return;

    const spiceParams = extractionService.convertToSPICEParameters(extractionResult.parameters);
    const spiceText = generateSPICEText(spiceParams, product?.name || 'Device');
    
    // Create and download file
    const blob = new Blob([spiceText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product?.name || 'device'}_asm_model.sp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [extractionResult, product]);

  const requiredDataTypes = extractionService.getRequiredDataTypes();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            ASM-HEMT Parameter Extraction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">Data Upload</TabsTrigger>
              <TabsTrigger value="manual">Manual Input</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="grid gap-4">
                {requiredDataTypes.map((dataType) => (
                  <Card key={dataType.type}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">
                        {dataType.description}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={(e) => handleFileUpload(e, dataType.type)}
                          className="flex-1"
                        />
                        <Badge variant={extractionData[dataType.type as keyof ASMExtractionData] ? "default" : "secondary"}>
                          {extractionData[dataType.type as keyof ASMExtractionData] ? "Loaded" : "Required"}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Required columns: {dataType.columns.join(', ')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="grid gap-4">
                {requiredDataTypes.map((dataType) => (
                  <Card key={dataType.type}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">
                        {dataType.description}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder={`Paste CSV data with columns: ${dataType.columns.join(', ')}`}
                        rows={4}
                        value={csvData[dataType.type] || ''}
                        onChange={(e) => {
                          setCsvData(prev => ({ ...prev, [dataType.type]: e.target.value }));
                          try {
                            const data = parseCSV(e.target.value);
                            const convertedData = convertCSVToExtractionData(data, dataType.type);
                            handleManualInput(dataType.type, convertedData);
                          } catch (error) {
                            // Ignore parsing errors for manual input
                          }
                        }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              {extractionResult ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {extractionResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">
                        {extractionResult.success ? 'Extraction Successful' : 'Extraction Failed'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        Confidence: {Math.round(extractionResult.confidence * 100)}%
                      </Badge>
                      {extractionResult.success && (
                        <Button onClick={handleExportSPICE} size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export SPICE
                        </Button>
                      )}
                    </div>
                  </div>

                  {extractionResult.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {extractionResult.errors.map((error, i) => (
                          <div key={i}>{error}</div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  )}

                  {extractionResult.warnings.length > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        {extractionResult.warnings.map((warning, i) => (
                          <div key={i}>{warning}</div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  )}

                  {extractionResult.success && (
                    <div className="grid gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Extracted Parameters</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(extractionResult.parameters).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-sm font-medium">{key}:</span>
                                <span className="text-sm text-muted-foreground">
                                  {typeof value === 'number' ? value.toExponential(4) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No extraction results yet. Upload data and run extraction to see results.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {Object.keys(extractionData).length} data types loaded
            </div>
            <Button 
              onClick={handleExtractParameters}
              disabled={isExtracting || Object.keys(extractionData).length === 0}
              className="min-w-[120px]"
            >
              {isExtracting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Extracting...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Extract Parameters
                </>
              )}
            </Button>
          </div>

          {isExtracting && (
            <div className="mt-4">
              <Progress value={50} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">
                Analyzing data and extracting ASM-HEMT parameters...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions
function parseCSV(text: string): any[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};
    headers.forEach((header, index) => {
      const value = values[index];
      row[header] = isNaN(Number(value)) ? value : Number(value);
    });
    data.push(row);
  }
  
  return data;
}

function convertCSVToExtractionData(data: any[], dataType: string): Partial<ASMExtractionData> {
  switch (dataType) {
    case 'outputCharacteristics':
      return {
        outputCharacteristics: {
          vds: data.map(row => row.vds || row.VDS || row.Vds),
          id: data.map(row => row.id || row.ID || row.Id),
          vgs: data.map(row => row.vgs || row.VGS || row.Vgs)
        }
      };
    
    case 'rdsVgsTemp':
      return {
        rdsVgsTemp: {
          vgs: data.map(row => row.vgs || row.VGS || row.Vgs),
          rds: data.map(row => row.rds || row.RDS || row.Rds),
          temp: data.map(row => row.temp || row.TEMP || row.Temp)
        }
      };
    
    case 'rdsVgsId':
      return {
        rdsVgsId: {
          vgs: data.map(row => row.vgs || row.VGS || row.Vgs),
          rds: data.map(row => row.rds || row.RDS || row.Rds),
          id: data[0]?.id || data[0]?.ID || data[0]?.Id || 1.5
        }
      };
    
    case 'capacitance':
      const capData = data.map(row => ({
        vds: row.vds || row.VDS || row.Vds,
        c: row.c || row.C || row.cap,
        type: (row.type || row.TYPE || 'ciss').toLowerCase() as 'ciss' | 'coss' | 'crss'
      }));
      return { capacitance: capData };
    
    case 'transferCharacteristics':
      return {
        transferCharacteristics: {
          vgs: data.map(row => row.vgs || row.VGS || row.Vgs),
          id: data.map(row => row.id || row.ID || row.Id),
          temp: data.map(row => row.temp || row.TEMP || row.Temp)
        }
      };
    
    case 'thermalResistance':
      return {
        thermalResistance: {
          temp: data.map(row => row.temp || row.TEMP || row.Temp),
          rds: data.map(row => row.rds || row.RDS || row.Rds),
          id: data[0]?.id || data[0]?.ID || data[0]?.Id || 1.5
        }
      };
    
    case 'vthTemp':
      return {
        vthTemp: {
          temp: data.map(row => row.temp || row.TEMP || row.Temp),
          vth: data.map(row => row.vth || row.VTH || row.Vth)
        }
      };
    
    default:
      return {};
  }
}

function generateSPICEText(params: Record<string, string | number>, deviceName: string): string {
  const paramLines = Object.entries(params)
    .map(([key, value]) => `.PARAM ${key} = ${value}`)
    .join('\n');

  return `* ASM-HEMT Model for ${deviceName}
* Generated by ESpice ASM Parameter Extraction
* 
${paramLines}
*
* Model definition
.MODEL ${deviceName.replace(/\s+/g, '_')} ASMHEMT
+ VOFF=${params.VOFF || -2.72}
+ VSE=${params.VSE || 2.0}
+ KP=${params.KP || 1.0}
+ UTE=${params.UTE || -0.5}
+ RDS=${params.RDS || 0.1}
+ CGSO=${params.CGSO || 1e-12}
+ CGDO=${params.CGDO || 1e-12}
+ CDSO=${params.CDSO || 1e-12}
+ RTH0=${params.RTH0 || 5.0}
+ KRSC=${params.KRSC || 0.005}
+ KRDC=${params.KRDC || 0.005}
+ VOFF0=${params.VOFF0 || -2.72}
+ KVTO=${params.KVTO || -2e-3}
*
* End of model
`;
} 