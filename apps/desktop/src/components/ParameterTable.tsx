import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, Edit3, Trash2, Plus, Save, X } from 'lucide-react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Input, 
  Badge, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  Label 
} from '@espice/ui';

export interface Parameter {
  id: string;
  name: string;
  value: string;
  unit: string;
  type: 'voltage' | 'current' | 'power' | 'temperature' | 'frequency' | 'resistance' | 'capacitance' | 'other';
  source: string;
  confidence: number;
  page?: number;
  table?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ParameterTableProps {
  parameters: Parameter[];
  onParameterUpdate?: (parameter: Parameter) => void;
  onParameterDelete?: (parameterId: string) => void;
  onParameterAdd?: (parameter: Omit<Parameter, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onExport?: (format: 'csv' | 'json' | 'spice') => void;
  className?: string;
}

const ParameterTable: React.FC<ParameterTableProps> = ({
  parameters,
  onParameterUpdate,
  onParameterDelete,
  onParameterAdd,
  onExport,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingParameter, setEditingParameter] = useState<Parameter | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newParameter, setNewParameter] = useState<Omit<Parameter, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    value: '',
    unit: '',
    type: 'other',
    source: '',
    confidence: 1,
    notes: ''
  });

  // Filter and search parameters
  const filteredParameters = useMemo(() => {
    return parameters.filter(param => {
      const matchesSearch = param.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           param.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           param.unit.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || param.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [parameters, searchTerm, filterType]);

  // Parameter types for filter
  const parameterTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'voltage', label: 'Voltage' },
    { value: 'current', label: 'Current' },
    { value: 'power', label: 'Power' },
    { value: 'temperature', label: 'Temperature' },
    { value: 'frequency', label: 'Frequency' },
    { value: 'resistance', label: 'Resistance' },
    { value: 'capacitance', label: 'Capacitance' },
    { value: 'other', label: 'Other' }
  ];

  const getTypeColor = (type: Parameter['type']) => {
    const colors = {
      voltage: 'bg-blue-100 text-blue-800',
      current: 'bg-green-100 text-green-800',
      power: 'bg-purple-100 text-purple-800',
      temperature: 'bg-orange-100 text-orange-800',
      frequency: 'bg-pink-100 text-pink-800',
      resistance: 'bg-yellow-100 text-yellow-800',
      capacitance: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.other;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleEdit = (parameter: Parameter) => {
    setEditingId(parameter.id);
    setEditingParameter({ ...parameter });
  };

  const handleSave = () => {
    if (editingParameter && onParameterUpdate) {
      onParameterUpdate({
        ...editingParameter,
        updatedAt: new Date()
      });
    }
    setEditingId(null);
    setEditingParameter(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingParameter(null);
  };

  const handleAdd = () => {
    if (onParameterAdd) {
      onParameterAdd(newParameter);
      setNewParameter({
        name: '',
        value: '',
        unit: '',
        type: 'other',
        source: '',
        confidence: 1,
        notes: ''
      });
      setIsAddDialogOpen(false);
    }
  };

  const handleDelete = (parameterId: string) => {
    if (onParameterDelete && confirm('Are you sure you want to delete this parameter?')) {
      onParameterDelete(parameterId);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Parameters
            <Badge variant="secondary">{filteredParameters.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {onExport && (
              <Select onValueChange={(value) => onExport(value as 'csv' | 'json' | 'spice')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="spice">SPICE</SelectItem>
                </SelectContent>
              </Select>
            )}
            {onParameterAdd && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Parameter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Parameter</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={newParameter.name}
                          onChange={(e) => setNewParameter(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="value">Value</Label>
                        <Input
                          id="value"
                          value={newParameter.value}
                          onChange={(e) => setNewParameter(prev => ({ ...prev, value: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="unit">Unit</Label>
                        <Input
                          id="unit"
                          value={newParameter.unit}
                          onChange={(e) => setNewParameter(prev => ({ ...prev, unit: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select value={newParameter.type} onValueChange={(value) => setNewParameter(prev => ({ ...prev, type: value as Parameter['type'] }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {parameterTypes.slice(1).map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="source">Source</Label>
                      <Input
                        id="source"
                        value={newParameter.source}
                        onChange={(e) => setNewParameter(prev => ({ ...prev, source: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAdd} disabled={!newParameter.name || !newParameter.value}>
                        Add Parameter
                      </Button>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parameters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {parameterTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredParameters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No parameters found</p>
            {searchTerm && <p className="text-sm">Try adjusting your search terms</p>}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParameters.map((parameter) => (
                  <TableRow key={parameter.id}>
                    <TableCell>
                      {editingId === parameter.id ? (
                        <Input
                          value={editingParameter?.name || ''}
                          onChange={(e) => setEditingParameter(prev => prev ? { ...prev, name: e.target.value } : null)}
                        />
                      ) : (
                        <span className="font-medium">{parameter.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === parameter.id ? (
                        <Input
                          value={editingParameter?.value || ''}
                          onChange={(e) => setEditingParameter(prev => prev ? { ...prev, value: e.target.value } : null)}
                        />
                      ) : (
                        <span>{parameter.value}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === parameter.id ? (
                        <Input
                          value={editingParameter?.unit || ''}
                          onChange={(e) => setEditingParameter(prev => prev ? { ...prev, unit: e.target.value } : null)}
                        />
                      ) : (
                        <span>{parameter.unit}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === parameter.id ? (
                        <Select value={editingParameter?.type || 'other'} onValueChange={(value) => setEditingParameter(prev => prev ? { ...prev, type: value as Parameter['type'] } : null)}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {parameterTypes.slice(1).map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={getTypeColor(parameter.type)}>
                          {parameter.type}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === parameter.id ? (
                        <Input
                          value={editingParameter?.source || ''}
                          onChange={(e) => setEditingParameter(prev => prev ? { ...prev, source: e.target.value } : null)}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{parameter.source}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${getConfidenceColor(parameter.confidence)}`}>
                        {(parameter.confidence * 100).toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {editingId === parameter.id ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" onClick={handleSave}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(parameter)}>
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          {onParameterDelete && (
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(parameter.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ParameterTable; 