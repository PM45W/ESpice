import React, { useState } from 'react';
import { FileText, Table, Zap, Thermometer, Settings, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import type { PDFProcessingResult, ExtractedTable, ExtractedParameter } from '../types/pdf';

interface PDFProcessingResultsProps {
  result: PDFProcessingResult;
  onParameterSelect?: (parameter: ExtractedParameter) => void;
  onTableSelect?: (table: ExtractedTable) => void;
}

const PDFProcessingResults: React.FC<PDFProcessingResultsProps> = ({
  result,
  onParameterSelect,
  onTableSelect
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tables' | 'parameters'>('overview');
  const [selectedDataType, setSelectedDataType] = useState<string>('all');

  if (!result.success) {
    return (
      <div className="pdf-results error">
        <AlertTriangle size={24} />
        <h3>Processing Failed</h3>
        <p>{result.error?.message || 'Unknown error occurred'}</p>
      </div>
    );
  }

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case 'electrical':
        return <Zap size={16} />;
      case 'thermal':
        return <Thermometer size={16} />;
      case 'mechanical':
        return <Settings size={16} />;
      default:
        return <Info size={16} />;
    }
  };

  const getValidationIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'error':
        return <AlertTriangle size={16} className="text-red-500" />;
      default:
        return <Info size={16} className="text-gray-500" />;
    }
  };

  const filteredParameters = selectedDataType === 'all' 
    ? result.parameters || []
    : result.parameters?.filter(p => p.dataType === selectedDataType) || [];

  const dataTypes = ['all', 'electrical', 'thermal', 'mechanical', 'other'];
  const dataTypeLabels = {
    all: 'All Types',
    electrical: 'Electrical',
    thermal: 'Thermal',
    mechanical: 'Mechanical',
    other: 'Other'
  };

  return (
    <div className="pdf-processing-results">
      {/* Header with processing metrics */}
      <div className="results-header">
        <div className="metrics-grid">
          <div className="metric">
            <FileText size={20} />
            <div>
              <span className="metric-value">{result.pageCount}</span>
              <span className="metric-label">Pages</span>
            </div>
          </div>
          {result.tables && (
            <div className="metric">
              <Table size={20} />
              <div>
                <span className="metric-value">{result.tables.length}</span>
                <span className="metric-label">Tables</span>
              </div>
            </div>
          )}
          {result.parameters && (
            <div className="metric">
              <Zap size={20} />
              <div>
                <span className="metric-value">{result.parameters.length}</span>
                <span className="metric-label">Parameters</span>
              </div>
            </div>
          )}
          {result.processingTime && (
            <div className="metric">
              <Settings size={20} />
              <div>
                <span className="metric-value">{(result.processingTime / 1000).toFixed(1)}s</span>
                <span className="metric-label">Processing</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="results-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Info size={16} />
          Overview
        </button>
        {result.tables && result.tables.length > 0 && (
          <button
            className={`tab ${activeTab === 'tables' ? 'active' : ''}`}
            onClick={() => setActiveTab('tables')}
          >
            <Table size={16} />
            Tables ({result.tables.length})
          </button>
        )}
        {result.parameters && result.parameters.length > 0 && (
          <button
            className={`tab ${activeTab === 'parameters' ? 'active' : ''}`}
            onClick={() => setActiveTab('parameters')}
          >
            <Zap size={16} />
            Parameters ({result.parameters.length})
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {result.metadata && (
              <div className="metadata-section">
                <h3>Document Information</h3>
                <div className="metadata-grid">
                  {result.metadata.title && (
                    <div key="title" className="metadata-item">
                      <span className="label">Title:</span>
                      <span className="value">{result.metadata.title}</span>
                    </div>
                  )}
                  {result.metadata.author && (
                    <div key="author" className="metadata-item">
                      <span className="label">Author:</span>
                      <span className="value">{result.metadata.author}</span>
                    </div>
                  )}
                  <div key="filesize" className="metadata-item">
                    <span className="label">File Size:</span>
                    <span className="value">{(result.metadata.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div key="pages" className="metadata-item">
                    <span className="label">Pages:</span>
                    <span className="value">{result.metadata.pages}</span>
                  </div>
                </div>
              </div>
            )}

            {result.tables && result.tables.length > 0 && (
              <div className="summary-section">
                <h3>Extracted Tables</h3>
                <div className="table-summary">
                  {result.tables.slice(0, 3).map((table, index) => (
                    <div key={table.id} className="table-preview" onClick={() => onTableSelect?.(table)}>
                      <div className="table-header">
                        <span className="table-title">{table.title || `Table ${index + 1}`}</span>
                        <span className="table-confidence">{(table.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="table-stats">
                        <span>{table.headers.length} columns</span>
                        <span>{table.rows.length} rows</span>
                      </div>
                    </div>
                  ))}
                  {result.tables.length > 3 && (
                    <div className="more-tables">
                      +{result.tables.length - 3} more tables
                    </div>
                  )}
                </div>
              </div>
            )}

            {result.parameters && result.parameters.length > 0 && (
              <div className="summary-section">
                <h3>Extracted Parameters</h3>
                <div className="parameter-summary">
                  {result.parameters.slice(0, 5).map((param) => (
                    <div key={param.id} className="parameter-preview" onClick={() => onParameterSelect?.(param)}>
                      <div className="parameter-header">
                        {getDataTypeIcon(param.dataType)}
                        <span className="parameter-name">{param.name}</span>
                        {getValidationIcon(param.validationStatus)}
                      </div>
                      <div className="parameter-value">
                        {param.value} {param.unit}
                      </div>
                    </div>
                  ))}
                  {result.parameters.length > 5 && (
                    <div className="more-parameters">
                      +{result.parameters.length - 5} more parameters
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tables' && result.tables && (
          <div className="tables-tab">
            <div className="tables-list">
              {result.tables.map((table, index) => (
                <div key={table.id} className="table-item" onClick={() => onTableSelect?.(table)}>
                  <div className="table-header">
                    <h4>{table.title || `Table ${index + 1}`}</h4>
                    <div className="table-meta">
                      <span className="page">Page {table.pageNumber}</span>
                      <span className="confidence">{(table.confidence * 100).toFixed(0)}%</span>
                      {getValidationIcon(table.validationStatus)}
                    </div>
                  </div>
                  <div className="table-preview-content">
                    <div className="table-headers">
                      {table.headers.map((header, i) => (
                        <div key={i} className="header-cell">{header}</div>
                      ))}
                    </div>
                    <div className="table-rows">
                      {table.rows.slice(0, 3).map((row, i) => (
                        <div key={i} className="table-row">
                          {row.map((cell, j) => (
                            <div key={j} className="cell">{cell}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                    {table.rows.length > 3 && (
                      <div className="more-rows">+{table.rows.length - 3} more rows</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'parameters' && result.parameters && (
          <div className="parameters-tab">
            <div className="parameters-filters">
              <div className="filter-group">
                <label>Data Type:</label>
                <select 
                  value={selectedDataType} 
                  onChange={(e) => setSelectedDataType(e.target.value)}
                >
                  {dataTypes.map(type => (
                    <option key={type} value={type}>
                      {dataTypeLabels[type as keyof typeof dataTypeLabels]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="parameters-list">
              {filteredParameters.map((param) => (
                <div key={param.id} className="parameter-item" onClick={() => onParameterSelect?.(param)}>
                  <div className="parameter-header">
                    <div className="parameter-info">
                      {getDataTypeIcon(param.dataType)}
                      <span className="parameter-name">{param.name}</span>
                      {param.symbol && <span className="parameter-symbol">({param.symbol})</span>}
                    </div>
                    <div className="parameter-meta">
                      <span className="page">Page {param.pageNumber}</span>
                      <span className="confidence">{(param.confidence * 100).toFixed(0)}%</span>
                      {getValidationIcon(param.validationStatus)}
                    </div>
                  </div>
                  <div className="parameter-values">
                    <div className="value-display">
                      <span className="value">{param.value}</span>
                      {param.unit && <span className="unit">{param.unit}</span>}
                    </div>
                    {(param.min || param.typ || param.max) && (
                      <div className="value-range">
                        {param.min && <span className="min">Min: {param.min}</span>}
                        {param.typ && <span className="typ">Typ: {param.typ}</span>}
                        {param.max && <span className="max">Max: {param.max}</span>}
                      </div>
                    )}
                  </div>
                  {param.condition && (
                    <div className="parameter-condition">
                      <span className="label">Condition:</span>
                      <span className="condition">{param.condition}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFProcessingResults; 