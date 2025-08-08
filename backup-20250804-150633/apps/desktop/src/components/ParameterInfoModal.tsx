import React from 'react';
import { X, Info, FileText, BarChart3, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { ASMHEMTParameter, MEASUREMENT_DATA_TYPES } from '../services/asmHemtParameters';
import { getMeasurementDataByType, measurementDataToCSV } from '../data/mockMeasurementData';

interface ParameterInfoModalProps {
  parameter: ASMHEMTParameter | null;
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
}

const ParameterInfoModal: React.FC<ParameterInfoModalProps> = ({
  parameter,
  isOpen,
  onClose,
  productId
}) => {
  if (!isOpen || !parameter) return null;

  const getMeasurementDataStatus = (dataType: keyof typeof MEASUREMENT_DATA_TYPES) => {
    if (!parameter.measurementData[dataType]) {
      return { available: false, status: 'Not Required' };
    }
    
    // Mock check - in real implementation, this would check the database
    const availableDataTypes = ['outputCharacteristics', 'transferCharacteristics', 'cvCharacteristics'];
    const dataTypeKey = Object.keys(MEASUREMENT_DATA_TYPES).find(key => 
      MEASUREMENT_DATA_TYPES[key as keyof typeof MEASUREMENT_DATA_TYPES] === MEASUREMENT_DATA_TYPES[dataType]
    );
    
    const available = availableDataTypes.includes(dataTypeKey || '');
    return {
      available,
      status: available ? 'Available' : 'Missing'
    };
  };

  const handleDownloadCSV = (dataType: string) => {
    const dataset = getMeasurementDataByType(dataType);
    if (dataset) {
      const csv = measurementDataToCSV(dataset);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataType}_${parameter.name}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      basic: 'bg-blue-100 text-blue-800',
      mobility: 'bg-green-100 text-green-800',
      velocity: 'bg-purple-100 text-purple-800',
      access: 'bg-orange-100 text-orange-800',
      gate: 'bg-red-100 text-red-800',
      trap: 'bg-yellow-100 text-yellow-800',
      thermal: 'bg-pink-100 text-pink-800',
      capacitance: 'bg-indigo-100 text-indigo-800',
      noise: 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Info className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{parameter.name}</h2>
              <p className="text-sm text-gray-500">{parameter.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Parameter Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(parameter.category)}`}>
                      {parameter.category}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unit:</span>
                    <span className="font-medium">{parameter.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Default Value:</span>
                    <span className="font-medium">{parameter.defaultValue.toExponential(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Required:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      parameter.required ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {parameter.required ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {parameter.minValue !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Min Value:</span>
                      <span className="font-medium">{parameter.minValue.toExponential(3)}</span>
                    </div>
                  )}
                  {parameter.maxValue !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Value:</span>
                      <span className="font-medium">{parameter.maxValue.toExponential(3)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Extraction Method</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">{parameter.extractionMethod}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Datasheet Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Section:</span>
                    <span className="font-medium">{parameter.datasheetSection}</span>
                  </div>
                  {parameter.graphType && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Graph Type:</span>
                      <span className="font-medium">{parameter.graphType}</span>
                    </div>
                  )}
                  {parameter.tableType && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Table Type:</span>
                      <span className="font-medium">{parameter.tableType}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">{parameter.notes}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Measurement Data Requirements */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Measurement Data Requirements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(MEASUREMENT_DATA_TYPES).map(([key, label]) => {
                const status = getMeasurementDataStatus(key as keyof typeof MEASUREMENT_DATA_TYPES);
                return (
                  <div key={key} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">{label}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {status.available ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : parameter.measurementData[key as keyof typeof MEASUREMENT_DATA_TYPES] ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          status.available 
                            ? 'bg-green-100 text-green-800' 
                            : parameter.measurementData[key as keyof typeof MEASUREMENT_DATA_TYPES]
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {status.status}
                        </span>
                      </div>
                    </div>
                    {status.available && (
                      <button
                        onClick={() => handleDownloadCSV(key)}
                        className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download CSV</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Related Parameters */}
          {parameter.relatedParameters.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Related Parameters</h3>
              <div className="flex flex-wrap gap-2">
                {parameter.relatedParameters.map((relatedParam) => (
                  <span
                    key={relatedParam}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    {relatedParam}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Validation */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Parameter Validation</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Value within acceptable range</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Unit consistency verified</span>
                </div>
                {parameter.required && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-700">Required parameter provided</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t border-border">
          <div className="text-sm text-gray-500">
            Click on related parameters to view their details
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                // In real implementation, this would open the datasheet
                console.log('Open datasheet for parameter:', parameter.name);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>View Datasheet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParameterInfoModal; 