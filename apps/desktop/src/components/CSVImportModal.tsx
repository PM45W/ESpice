import React, { useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<{
    success: boolean;
    imported: number;
    failed: number;
    errors: string[];
  }>;
  title?: string;
  description?: string;
}

const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  title = 'Import CSV',
  description = 'Upload a CSV file to import product data.'
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await onImport(file);
      setImportResult(result);
      if (result.success) {
        // Auto-close after successful import
        setTimeout(() => {
          onClose();
          setFile(null);
          setImportResult(null);
        }, 2000);
      }
    } catch (error) {
      setImportResult({
        success: false,
        imported: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-muted-foreground mb-6">{description}</p>

          {!importResult && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-file-input"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium text-foreground">
                    {file ? file.name : 'Click to select CSV file'}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : 'or drag and drop'}
                  </span>
                </label>
              </div>

              {file && (
                <div className="flex items-center p-3 bg-muted/50 rounded-lg">
                  <FileText className="w-4 h-4 text-primary mr-2" />
                  <span className="text-sm text-foreground">{file.name}</span>
                </div>
              )}
            </div>
          )}

          {importResult && (
            <div className="space-y-4">
              <div className={`flex items-center p-4 rounded-lg ${
                importResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {importResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                )}
                <div>
                  <p className={`font-medium ${
                    importResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {importResult.success ? 'Import Successful' : 'Import Failed'}
                  </p>
                  <p className={`text-sm ${
                    importResult.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {importResult.imported} imported, {importResult.failed} failed
                  </p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto">
                  <p className="text-sm font-medium text-foreground mb-2">Errors:</p>
                  <ul className="text-xs text-red-600 space-y-1">
                    {importResult.errors.map((error, index) => (
                      <li key={index} className="bg-red-50 p-2 rounded">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground hover:bg-muted transition-colors"
              disabled={isImporting}
            >
              {importResult?.success ? 'Close' : 'Cancel'}
            </button>
            {!importResult && file && (
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isImporting ? 'Importing...' : 'Import'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal; 