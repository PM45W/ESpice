import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  Palette,
  Settings,
  Check,
  AlertCircle
} from 'lucide-react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent, CardHeader, CardTitle, Badge } from '@espice/ui';

interface CustomGraphType {
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

interface CustomGraphTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (graphType: CustomGraphType) => void;
  onDelete: (id: string) => void;
  existingTypes: CustomGraphType[];
}

const CustomGraphTypeModal: React.FC<CustomGraphTypeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  existingTypes
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingGraphType, setPendingGraphType] = useState<CustomGraphType | null>(null);
  const [formData, setFormData] = useState<Partial<CustomGraphType>>({
    name: '',
    x_axis: '',
    y_axis: '',
    third_col: '',
    x_min: 0,
    x_max: 10,
    y_min: 0,
    y_max: 10,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'linear',
    color_reps: {},
    output_filename: ''
  });
  const [newColorKey, setNewColorKey] = useState('');
  const [newColorValue, setNewColorValue] = useState('');

  const colorOptions = [
    { value: 'red', label: 'Red', color: '#ef4444' },
    { value: 'blue', label: 'Blue', color: '#3b82f6' },
    { value: 'green', label: 'Green', color: '#22c55e' },
    { value: 'yellow', label: 'Yellow', color: '#eab308' },
    { value: 'purple', label: 'Purple', color: '#a855f7' },
    { value: 'orange', label: 'Orange', color: '#f97316' },
    { value: 'pink', label: 'Pink', color: '#ec4899' },
    { value: 'cyan', label: 'Cyan', color: '#06b6d4' },
    { value: 'lime', label: 'Lime', color: '#84cc16' },
    { value: 'indigo', label: 'Indigo', color: '#6366f1' }
  ];

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      x_axis: '',
      y_axis: '',
      third_col: '',
      x_min: 0,
      x_max: 10,
      y_min: 0,
      y_max: 10,
      x_scale: 1,
      y_scale: 1,
      x_scale_type: 'linear',
      y_scale_type: 'linear',
      color_reps: {},
      output_filename: ''
    });
    setIsEditing(false);
    setEditingId(null);
    setNewColorKey('');
    setNewColorValue('');
    setShowConfirmation(false);
    setPendingGraphType(null);
  };

  const handleEdit = (graphType: CustomGraphType) => {
    setFormData(graphType);
    setIsEditing(true);
    setEditingId(graphType.id);
  };

  const handleSave = () => {
    if (!formData.name || !formData.x_axis || !formData.y_axis) {
      alert('Please fill in all required fields (Name, X-axis, Y-axis)');
      return;
    }

    const graphType: CustomGraphType = {
      id: editingId || `custom_${Date.now()}`,
      name: formData.name!,
      x_axis: formData.x_axis!,
      y_axis: formData.y_axis!,
      third_col: formData.third_col || '',
      x_min: formData.x_min || 0,
      x_max: formData.x_max || 10,
      y_min: formData.y_min || 0,
      y_max: formData.y_max || 10,
      x_scale: formData.x_scale || 1,
      y_scale: formData.y_scale || 1,
      x_scale_type: formData.x_scale_type || 'linear',
      y_scale_type: formData.y_scale_type || 'linear',
      color_reps: formData.color_reps || {},
      output_filename: formData.output_filename || formData.name!.toLowerCase().replace(/\s+/g, '_'),
      created_at: editingId ? existingTypes.find(t => t.id === editingId)?.created_at || new Date().toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Show confirmation dialog instead of saving directly
    setPendingGraphType(graphType);
    setShowConfirmation(true);
  };

  const handleConfirmSave = () => {
    if (pendingGraphType) {
      onSave(pendingGraphType);
      resetForm();
    }
  };

  const handleCancelSave = () => {
    setShowConfirmation(false);
    setPendingGraphType(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this custom graph type?')) {
      onDelete(id);
    }
  };

  const addColor = () => {
    if (newColorKey && newColorValue) {
      setFormData(prev => ({
        ...prev,
        color_reps: {
          ...prev.color_reps,
          [newColorKey]: newColorValue
        }
      }));
      setNewColorKey('');
      setNewColorValue('');
    }
  };

  const removeColor = (colorKey: string) => {
    setFormData(prev => {
      const newColorReps = { ...prev.color_reps };
      delete newColorReps[colorKey];
      return {
        ...prev,
        color_reps: newColorReps
      };
    });
  };

  const getColorDisplay = (colorKey: string) => {
    const colorOption = colorOptions.find(opt => opt.value === colorKey);
    return colorOption ? colorOption.color : '#6b7280';
  };

  if (!isOpen) return null;

  // Confirmation Dialog
  if (showConfirmation && pendingGraphType) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-2xl">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Check className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Confirm Custom Graph Type</h2>
                <p className="text-sm text-muted-foreground">
                  Please review your custom graph type before saving
                </p>
              </div>
            </div>
            <button
              onClick={handleCancelSave}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Graph Type Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="text-foreground font-medium">{pendingGraphType.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Output Filename</Label>
                  <p className="text-foreground font-medium">{pendingGraphType.output_filename}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">X-Axis</Label>
                  <p className="text-foreground font-medium">{pendingGraphType.x_axis}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Y-Axis</Label>
                  <p className="text-foreground font-medium">{pendingGraphType.y_axis}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Third Column</Label>
                  <p className="text-foreground font-medium">{pendingGraphType.third_col || 'None'}</p>
                </div>
              </div>
            </div>

            {/* Axis Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Axis Configuration</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">X-Axis</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Range</Label>
                      <p className="text-foreground">{pendingGraphType.x_min} - {pendingGraphType.x_max}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Scale Type</Label>
                      <p className="text-foreground capitalize">{pendingGraphType.x_scale_type}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Y-Axis</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Range</Label>
                      <p className="text-foreground">{pendingGraphType.y_min} - {pendingGraphType.y_max}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Scale Type</Label>
                      <p className="text-foreground capitalize">{pendingGraphType.y_scale_type}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Color Meanings */}
            {Object.keys(pendingGraphType.color_reps).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Color Meanings
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(pendingGraphType.color_reps).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: getColorDisplay(key) }}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground capitalize">{key}</p>
                        <p className="text-xs text-muted-foreground">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warning for log scale */}
            {(pendingGraphType.x_scale_type === 'log' || pendingGraphType.y_scale_type === 'log') && (
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Logarithmic Scale Warning</p>
                  <p className="text-sm text-yellow-700">
                    Logarithmic scales require minimum values greater than 0. Please ensure your data follows this requirement.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <Button variant="outline" onClick={handleCancelSave}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave} className="bg-blue-600 hover:bg-blue-700">
              <Check className="w-4 h-4 mr-2" />
              {isEditing ? 'Update' : 'Create'} Graph Type
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {isEditing ? 'Edit Custom Graph Type' : 'Create Custom Graph Type'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Define your own graph type with custom parameters and color meanings
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Form */}
          <div className="w-2/3 p-6 border-r border-border overflow-y-auto">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Graph Type Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., My Custom Characteristics"
                    />
                  </div>
                  <div>
                    <Label htmlFor="output_filename">Output Filename</Label>
                    <Input
                      id="output_filename"
                      value={formData.output_filename}
                      onChange={(e) => setFormData(prev => ({ ...prev, output_filename: e.target.value }))}
                      placeholder="auto-generated if empty"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="x_axis">X-Axis Label *</Label>
                    <Input
                      id="x_axis"
                      value={formData.x_axis}
                      onChange={(e) => setFormData(prev => ({ ...prev, x_axis: e.target.value }))}
                      placeholder="e.g., VDS"
                    />
                  </div>
                  <div>
                    <Label htmlFor="y_axis">Y-Axis Label *</Label>
                    <Input
                      id="y_axis"
                      value={formData.y_axis}
                      onChange={(e) => setFormData(prev => ({ ...prev, y_axis: e.target.value }))}
                      placeholder="e.g., ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="third_col">Third Column</Label>
                    <Input
                      id="third_col"
                      value={formData.third_col}
                      onChange={(e) => setFormData(prev => ({ ...prev, third_col: e.target.value }))}
                      placeholder="e.g., VGS"
                    />
                  </div>
                </div>
              </div>

              {/* Axis Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Axis Configuration</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">X-Axis</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="x_min">Min Value</Label>
                        <Input
                          id="x_min"
                          type="number"
                          step="0.1"
                          value={formData.x_min}
                          onChange={(e) => setFormData(prev => ({ ...prev, x_min: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="x_max">Max Value</Label>
                        <Input
                          id="x_max"
                          type="number"
                          step="0.1"
                          value={formData.x_max}
                          onChange={(e) => setFormData(prev => ({ ...prev, x_max: parseFloat(e.target.value) || 10 }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="x_scale_type">Scale Type</Label>
                      <Select
                        value={formData.x_scale_type}
                        onValueChange={(value: 'linear' | 'log') => 
                          setFormData(prev => ({ ...prev, x_scale_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="linear">Linear</SelectItem>
                          <SelectItem value="log">Logarithmic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Y-Axis</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="y_min">Min Value</Label>
                        <Input
                          id="y_min"
                          type="number"
                          step="0.1"
                          value={formData.y_min}
                          onChange={(e) => setFormData(prev => ({ ...prev, y_min: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="y_max">Max Value</Label>
                        <Input
                          id="y_max"
                          type="number"
                          step="0.1"
                          value={formData.y_max}
                          onChange={(e) => setFormData(prev => ({ ...prev, y_max: parseFloat(e.target.value) || 10 }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="y_scale_type">Scale Type</Label>
                      <Select
                        value={formData.y_scale_type}
                        onValueChange={(value: 'linear' | 'log') => 
                          setFormData(prev => ({ ...prev, y_scale_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="linear">Linear</SelectItem>
                          <SelectItem value="log">Logarithmic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Meanings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Color Meanings
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="color_key">Color</Label>
                    <Select
                      value={newColorKey}
                      onValueChange={setNewColorKey}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        {colorOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: option.color }}
                              />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="color_value">Meaning</Label>
                    <Input
                      id="color_value"
                      value={newColorValue}
                      onChange={(e) => setNewColorValue(e.target.value)}
                      placeholder="e.g., VGS = 5V"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addColor} disabled={!newColorKey || !newColorValue}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Existing Colors */}
                {Object.keys(formData.color_reps || {}).length > 0 && (
                  <div className="space-y-2">
                    <Label>Current Color Meanings</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(formData.color_reps || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: getColorDisplay(key) }}
                            />
                            <span className="text-sm font-medium">{key}</span>
                            <span className="text-sm text-muted-foreground">→</span>
                            <span className="text-sm">{value}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeColor(key)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Existing Types */}
          <div className="w-1/3 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Custom Graph Types</h3>
              <Button
                onClick={() => {
                  resetForm();
                  setIsEditing(false);
                }}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>
            </div>

            <div className="space-y-3">
              {existingTypes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No custom graph types yet</p>
                  <p className="text-sm">Create your first custom graph type</p>
                </div>
              ) : (
                existingTypes.map((graphType) => (
                  <Card key={graphType.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground mb-1">{graphType.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {graphType.x_axis} vs {graphType.y_axis}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(graphType.color_reps).slice(0, 3).map(([key, value]) => (
                              <Badge key={key} variant="secondary" className="text-xs">
                                <div 
                                  className="w-2 h-2 rounded-full mr-1"
                                  style={{ backgroundColor: getColorDisplay(key) }}
                                />
                                {value}
                              </Badge>
                            ))}
                            {Object.keys(graphType.color_reps).length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{Object.keys(graphType.color_reps).length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(graphType)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(graphType.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Update' : 'Create'} Graph Type
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomGraphTypeModal;
