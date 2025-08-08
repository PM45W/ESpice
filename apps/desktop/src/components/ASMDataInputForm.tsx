import React, { useState, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Button, 
  Input, 
  Label, 
  Textarea, 
  Alert, 
  AlertDescription, 
  Badge, 
  Separator 
} from '@espice/ui';
import { 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { ASMExtractionData } from '../services/asmSpiceExtractionService';

interface ASMDataInputFormProps {
  onDataChange: (data: ASMExtractionData) => void;
  initialData?: ASMExtractionData;
}

interface DataPoint {
  id: string;
  values: Record<string, number>;
}

export const ASMDataInputForm: React.FC<ASMDataInputFormProps> = ({
  onDataChange,
  initialData
}) => {
  const [dataType, setDataType] = useState<string>('outputCharacteristics');
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const dataTypeConfigs = {
    outputCharacteristics: {
      name: 'Output Characteristics',
      description: 'I-V curves for different VGS values',
      requiredColumns: ['vds', 'id', 'vgs'],
      example: `vds,id,vgs
0.1,0.001,1.0
0.2,0.002,1.0
0.5,0.005,1.0
0.1,0.002,2.0
0.2,0.004,2.0
0.5,0.010,2.0`
    },
    rdsVgsTemp: {
      name: 'RDS vs VGS Temperature',
      description: 'RDS vs VGS data at different temperatures',
      requiredColumns: ['vgs', 'rds', 'temp'],
      example: `vgs,rds,temp
1.0,0.15,25
2.0,0.12,25
3.0,0.10,25
1.0,0.18,125
2.0,0.15,125
3.0,0.13,125`
    },
    rdsVgsId: {
      name: 'RDS vs VGS at Constant ID',
      description: 'RDS vs VGS at constant drain current',
      requiredColumns: ['vgs', 'rds'],
      example: `vgs,rds
1.0,0.15
2.0,0.12
3.0,0.10
4.0,0.09
5.0,0.08`
    },
    capacitance: {
      name: 'Capacitance Data',
      description: 'Capacitance vs VDS for CISS, COSS, CRSS',
      requiredColumns: ['vds', 'c', 'type'],
      example: `vds,c,type
0.1,1000,ciss
0.5,800,ciss
1.0,600,ciss
0.1,500,coss
0.5,300,coss
1.0,200,coss`
    },
    transferCharacteristics: {
      name: 'Transfer Characteristics',
      description: 'Transfer characteristics at different temperatures',
      requiredColumns: ['vgs', 'id', 'temp'],
      example: `vgs,id,temp
1.0,0.001,25
2.0,0.010,25
3.0,0.050,25
1.0,0.002,125
2.0,0.020,125
3.0,0.100,125`
    },
    thermalResistance: {
      name: 'Thermal Resistance',
      description: 'Thermal resistance data (temperature vs RDS)',
      requiredColumns: ['temp', 'rds'],
      example: `temp,rds
25,0.10
50,0.12
75,0.14
100,0.16
125,0.18`
    },
    vthTemp: {
      name: 'VTH vs Temperature',
      description: 'Threshold voltage vs temperature',
      requiredColumns: ['temp', 'vth'],
      example: `temp,vth
25,-2.72
50,-2.75
75,-2.78
100,-2.81
125,-2.84`
    }
  };

  const addDataPoint = useCallback(() => {
    const newPoint: DataPoint = {
      id: Date.now().toString(),
      values: {}
    };
    setDataPoints(prev => [...prev, newPoint]);
  }, []);

  const removeDataPoint = useCallback((id: string) => {
    setDataPoints(prev => prev.filter(point => point.id !== id));
  }, []);

  const updateDataPoint = useCallback((id: string, column: string, value: number) => {
    setDataPoints(prev => prev.map(point => 
      point.id === id 
        ? { ...point, values: { ...point.values, [column]: value } }
        : point
    ));
  }, []);

  const updateHeaders = useCallback((newHeaders: string[]) => {
    setHeaders(newHeaders);
    // Clear data points when headers change
    setDataPoints([]);
  }, []);

  const validateData = useCallback(() => {
    const config = dataTypeConfigs[dataType as keyof typeof dataTypeConfigs];
    if (!config) return false;

    const missingColumns = config.requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      setErrors([`Missing required columns: ${missingColumns.join(', ')}`]);
      return false;
    }

    if (dataPoints.length === 0) {
      setErrors(['No data points entered']);
      return false;
    }

    // Check for missing values
    const missingValues = dataPoints.some(point => 
      config.requiredColumns.some(col => point.values[col] === undefined)
    );
    if (missingValues) {
      setErrors(['Some data points have missing values']);
      return false;
    }

    setErrors([]);
    return true;
  }, [dataType, headers, dataPoints]);

  const convertToExtractionData = useCallback(() => {
    if (!validateData()) return null;

    const config = dataTypeConfigs[dataType as keyof typeof dataTypeConfigs];
    if (!config) return null;

    const columnData: Record<string, number[]> = {};
    config.requiredColumns.forEach(col => {
      columnData[col] = dataPoints.map(point => point.values[col] || 0);
    });

    switch (dataType) {
      case 'outputCharacteristics':
        return {
          outputCharacteristics: {
            vds: columnData.vds,
            id: columnData.id,
            vgs: columnData.vgs
          }
        };
      
      case 'rdsVgsTemp':
        return {
          rdsVgsTemp: {
            vgs: columnData.vgs,
            rds: columnData.rds,
            temp: columnData.temp
          }
        };
      
      case 'rdsVgsId':
        return {
          rdsVgsId: {
            vgs: columnData.vgs,
            rds: columnData.rds,
            id: 1.5 // Default ID value
          }
        };
      
      case 'capacitance':
        return {
          capacitance: dataPoints.map(point => ({
            vds: point.values.vds,
            c: point.values.c,
            type: (point.values.type || 'ciss') as 'ciss' | 'coss' | 'crss'
          }))
        };
      
      case 'transferCharacteristics':
        return {
          transferCharacteristics: {
            vgs: columnData.vgs,
            id: columnData.id,
            temp: columnData.temp
          }
        };
      
      case 'thermalResistance':
        return {
          thermalResistance: {
            temp: columnData.temp,
            rds: columnData.rds,
            id: 1.5 // Default ID value
          }
        };
      
      case 'vthTemp':
        return {
          vthTemp: {
            temp: columnData.temp,
            vth: columnData.vth
          }
        };
      
      default:
        return null;
    }
  }, [dataType, dataPoints, validateData]);

  const handleDataTypeChange = useCallback((newDataType: string) => {
    setDataType(newDataType);
    setHeaders([]);
    setDataPoints([]);
    setErrors([]);
  }, []);

  const handleCSVImport = useCallback((csvText: string) => {
    try {
      const lines = csvText.trim().split('\n');
      const csvHeaders = lines[0].split(',').map(h => h.trim());
      setHeaders(csvHeaders);

      const newDataPoints: DataPoint[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const point: DataPoint = {
          id: Date.now().toString() + i,
          values: {}
        };
        csvHeaders.forEach((header, index) => {
          const value = values[index];
          if (value && !isNaN(Number(value))) {
            point.values[header] = Number(value);
          }
        });
        newDataPoints.push(point);
      }
      setDataPoints(newDataPoints);
    } catch (error) {
      setErrors(['Invalid CSV format']);
    }
  }, []);

  // Update parent component when data changes
  React.useEffect(() => {
    const extractionData = convertToExtractionData();
    if (extractionData) {
      onDataChange(extractionData);
    }
  }, [dataPoints, headers, dataType, convertToExtractionData, onDataChange]);

  const config = dataTypeConfigs[dataType as keyof typeof dataTypeConfigs];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ASM Data Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Data Type Selection */}
          <div className="space-y-2">
            <Label>Data Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(dataTypeConfigs).map(([key, config]) => (
                <Button
                  key={key}
                  variant={dataType === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDataTypeChange(key)}
                  className="justify-start"
                >
                  {config.name}
                </Button>
              ))}
            </div>
          </div>

          {config && (
            <>
              <Separator />
              
              {/* Data Type Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{config.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">{config.description}</p>
                <div className="flex gap-2">
                  {config.requiredColumns.map(col => (
                    <Badge key={col} variant="secondary">{col}</Badge>
                  ))}
                </div>
              </div>

              {/* CSV Import */}
              <div className="space-y-2">
                <Label>Import CSV Data</Label>
                <Textarea
                  placeholder="Paste CSV data here..."
                  rows={6}
                  onChange={(e) => handleCSVImport(e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  <p>Example format:</p>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {config.example}
                  </pre>
                </div>
              </div>

              {/* Manual Data Entry */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Data Points</Label>
                  <Button onClick={addDataPoint} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Point
                  </Button>
                </div>

                {headers.length > 0 && (
                  <div className="space-y-2">
                    {/* Header Row */}
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${headers.length + 1}, 1fr)` }}>
                      {headers.map(header => (
                        <div key={header} className="text-sm font-medium text-center">
                          {header}
                        </div>
                      ))}
                      <div className="text-sm font-medium text-center">Actions</div>
                    </div>

                    {/* Data Points */}
                    {dataPoints.map((point, index) => (
                      <div key={point.id} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${headers.length + 1}, 1fr)` }}>
                        {headers.map(header => (
                          <Input
                            key={header}
                            type="number"
                            step="any"
                            value={point.values[header] || ''}
                            onChange={(e) => updateDataPoint(point.id, header, parseFloat(e.target.value) || 0)}
                            className="text-center"
                          />
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeDataPoint(point.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Validation */}
              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {errors.map((error, i) => (
                      <div key={i}>{error}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              {dataPoints.length > 0 && errors.length === 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Data validation passed. {dataPoints.length} data points ready for extraction.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 