import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { CorrelationResult, CorrelationSummary } from '../services/testCorrelationService';

interface CorrelationResultsProps {
  results: CorrelationResult[];
  summary: CorrelationSummary;
  onClose?: () => void;
}

const CorrelationResults: React.FC<CorrelationResultsProps> = ({ results, summary, onClose }) => {
  const getStatusIcon = (withinTolerance: boolean, errorPercentage: number) => {
    if (withinTolerance) {
      return <CheckCircle className="status-icon success" />;
    } else if (errorPercentage > 50) {
      return <XCircle className="status-icon error" />;
    } else {
      return <AlertTriangle className="status-icon warning" />;
    }
  };

  const getTrendIcon = (extractedValue: number, measuredValue: number) => {
    const diff = extractedValue - measuredValue;
    if (Math.abs(diff) < 0.01) return null;
    return diff > 0 ? <TrendingDown className="trend-icon down" /> : <TrendingUp className="trend-icon up" />;
  };

  const formatValue = (value: number, unit?: string) => {
    if (Math.abs(value) >= 1000 || (Math.abs(value) < 0.01 && value !== 0)) {
      return `${value.toExponential(2)}${unit ? ` ${unit}` : ''}`;
    }
    return `${value.toFixed(3)}${unit ? ` ${unit}` : ''}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  };

  return (
    <div className="correlation-results">
      <div className="results-header">
        <h3>Correlation Results</h3>
        {onClose && (
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      {/* Summary Card */}
      <div className="summary-card">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Total Parameters</span>
            <span className="stat-value">{summary.total_parameters}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Within Tolerance</span>
            <span className="stat-value success">
              {summary.parameters_within_tolerance} / {summary.total_parameters}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Average Correlation</span>
            <span className="stat-value">
              {(summary.average_correlation_score * 100).toFixed(1)}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Average Error</span>
            <span className="stat-value">
              {summary.average_error_percentage.toFixed(2)}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Overall Confidence</span>
            <span className={`stat-value confidence-${getConfidenceColor(summary.overall_confidence)}`}>
              {(summary.overall_confidence * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="tolerance-progress">
          <div className="progress-label">
            Parameters Within Tolerance
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${(summary.parameters_within_tolerance / summary.total_parameters) * 100}%` 
              }}
            />
          </div>
          <div className="progress-text">
            {summary.parameters_within_tolerance} of {summary.total_parameters} parameters
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="results-table-container">
        <h4>Parameter Details</h4>
        <div className="results-table">
          <div className="table-header">
            <div className="header-cell">Parameter</div>
            <div className="header-cell">Extracted</div>
            <div className="header-cell">Measured</div>
            <div className="header-cell">Error %</div>
            <div className="header-cell">Tolerance</div>
            <div className="header-cell">Status</div>
            <div className="header-cell">Confidence</div>
          </div>
          
          {results.map((result, index) => (
            <div key={index} className="table-row">
              <div className="cell parameter-name">
                {result.parameter_name}
              </div>
              <div className="cell extracted-value">
                {formatValue(result.extracted_value)}
                {getTrendIcon(result.extracted_value, result.measured_value)}
              </div>
              <div className="cell measured-value">
                {formatValue(result.measured_value)}
              </div>
              <div className="cell error-percentage">
                <span className={result.error_percentage > 10 ? 'error' : 'success'}>
                  {result.error_percentage.toFixed(2)}%
                </span>
              </div>
              <div className="cell tolerance">
                ±{result.tolerance.toFixed(2)}%
              </div>
              <div className="cell status">
                {getStatusIcon(result.within_tolerance, result.error_percentage)}
                <span className={result.within_tolerance ? 'success' : 'error'}>
                  {result.within_tolerance ? 'Pass' : 'Fail'}
                </span>
              </div>
              <div className="cell confidence">
                <span className={`confidence-${getConfidenceColor(result.confidence_level)}`}>
                  {(result.confidence_level * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="recommendations">
        <h4>Recommendations</h4>
        <div className="recommendation-list">
          {summary.average_error_percentage > 20 && (
            <div className="recommendation warning">
              <AlertTriangle className="recommendation-icon" />
              <span>High average error ({summary.average_error_percentage.toFixed(1)}%). Consider reviewing extraction parameters.</span>
            </div>
          )}
          
          {summary.parameters_within_tolerance / summary.total_parameters < 0.8 && (
            <div className="recommendation warning">
              <AlertTriangle className="recommendation-icon" />
              <span>Low tolerance compliance. Verify test conditions and parameter extraction accuracy.</span>
            </div>
          )}
          
          {summary.overall_confidence < 0.7 && (
            <div className="recommendation warning">
              <AlertTriangle className="recommendation-icon" />
              <span>Low confidence level. Consider additional validation or manual review.</span>
            </div>
          )}
          
          {summary.average_error_percentage <= 10 && summary.overall_confidence >= 0.8 && (
            <div className="recommendation success">
              <CheckCircle className="recommendation-icon" />
              <span>Excellent correlation results! Model parameters are well-aligned with test data.</span>
            </div>
          )}
        </div>
      </div>

      {/* Export Options */}
      <div className="export-section">
        <h4>Export Results</h4>
        <div className="export-buttons">
          <button className="export-button" onClick={() => {
            const csvContent = generateCSV(results, summary);
            downloadFile(csvContent, 'correlation_results.csv', 'text/csv');
          }}>
            Export CSV
          </button>
          <button className="export-button" onClick={() => {
            const jsonContent = JSON.stringify({ results, summary }, null, 2);
            downloadFile(jsonContent, 'correlation_results.json', 'application/json');
          }}>
            Export JSON
          </button>
          <button className="export-button" onClick={() => {
            const reportContent = generateReport(results, summary);
            downloadFile(reportContent, 'correlation_report.txt', 'text/plain');
          }}>
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const generateCSV = (results: CorrelationResult[], summary: CorrelationSummary): string => {
  const headers = ['Parameter', 'Extracted Value', 'Measured Value', 'Error %', 'Tolerance', 'Status', 'Confidence'];
  const rows = results.map(r => [
    r.parameter_name,
    r.extracted_value.toString(),
    r.measured_value.toString(),
    r.error_percentage.toString(),
    r.tolerance.toString(),
    r.within_tolerance ? 'Pass' : 'Fail',
    (r.confidence_level * 100).toFixed(1)
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

const generateReport = (results: CorrelationResult[], summary: CorrelationSummary): string => {
  return `
Correlation Report
==================

Summary:
- Total Parameters: ${summary.total_parameters}
- Parameters Within Tolerance: ${summary.parameters_within_tolerance}
- Average Correlation Score: ${(summary.average_correlation_score * 100).toFixed(1)}%
- Average Error: ${summary.average_error_percentage.toFixed(2)}%
- Overall Confidence: ${(summary.overall_confidence * 100).toFixed(1)}%

Parameter Details:
${results.map(r => 
  `${r.parameter_name}: Extracted=${r.extracted_value}, Measured=${r.measured_value}, Error=${r.error_percentage.toFixed(2)}%, Status=${r.within_tolerance ? 'PASS' : 'FAIL'}`
).join('\n')}

Generated: ${new Date().toISOString()}
`;
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default CorrelationResults; 