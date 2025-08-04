import React, { useState, useCallback, useMemo, useRef } from 'react'
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Cpu, 
  Database, 
  HardDrive, 
  Settings, 
  Zap,
  Cloud,
  Download,
  Trash2,
  Eye,
  BarChart3,
  Clock,
  Info
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { useSystemMonitor } from '../hooks/useSystemMonitor'
import { EnhancedPDFProcessor } from '../services/enhancedPDFProcessor';
import { ParameterValidationService } from '../services/parameterValidationService';
import { cacheService } from '../services/cacheService';
import type { PDFProcessingResult, ProcessingProgress } from '../types/pdf'
import type { Product, Parameter } from '../types'
import { RealTimeExtractionViewer } from '../components/RealTimeExtractionViewer';

// File Upload Status
interface FileUploadStatus {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  error?: string
  result?: PDFProcessingResult
  extractedParams?: Parameter[]
  product?: Product
}

// Upload Statistics
interface UploadStats {
  totalFiles: number
  processedFiles: number
  successCount: number
  errorCount: number
  totalParameters: number
  processingTime: number
}

const UploadPage: React.FC = () => {
  const [files, setFiles] = useState<FileUploadStatus[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadStats, setUploadStats] = useState<UploadStats>({
    totalFiles: 0,
    processedFiles: 0,
    successCount: 0,
    errorCount: 0,
    totalParameters: 0,
    processingTime: 0
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [showExtractionViewer, setShowExtractionViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { metrics } = useSystemMonitor(5000)
  const enhancedPdfProcessor = EnhancedPDFProcessor.getInstance();
  const parameterValidator = ParameterValidationService.getInstance();

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf')
    
    const newFileStatuses: FileUploadStatus[] = pdfFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0
    }))
    
    setFiles(prev => [...prev, ...newFileStatuses])
    setUploadStats(prev => ({ ...prev, totalFiles: prev.totalFiles + pdfFiles.length }))
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf')
    
    const newFileStatuses: FileUploadStatus[] = pdfFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0
    }))
    
    setFiles(prev => [...prev, ...newFileStatuses])
    setUploadStats(prev => ({ ...prev, totalFiles: prev.totalFiles + pdfFiles.length }))
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
    setUploadStats(prev => ({ ...prev, totalFiles: prev.totalFiles - 1 }))
    // Check if the removed file is currently being viewed
    const removedFile = files.find(f => f.id === id);
    if (removedFile && selectedFile && removedFile.file.name === selectedFile.name) {
      setSelectedFile(null)
      setShowExtractionViewer(false)
    }
  }, [selectedFile, files])

  const clearAllFiles = useCallback(() => {
    setFiles([])
    setSelectedFile(null)
    setUploadStats({
      totalFiles: 0,
      processedFiles: 0,
      successCount: 0,
      errorCount: 0,
      totalParameters: 0,
      processingTime: 0
    })
  }, [])

  // Process PDF files
  const processFiles = useCallback(async () => {
    if (files.length === 0) return

    setIsProcessing(true)
    const startTime = Date.now()
    let successCount = 0
    let errorCount = 0
    let totalParameters = 0

    for (const fileStatus of files) {
      if (fileStatus.status === 'pending') {
        // Update status to processing
        setFiles(prev => prev.map(f => 
          f.id === fileStatus.id ? { ...f, status: 'processing', progress: 10 } : f
        ))

        try {
          // Process PDF
          const result = await enhancedPdfProcessor.processPDF(
            fileStatus.file,
            { extractTables: true },
            (progress: ProcessingProgress) => {
              setFiles(prev => prev.map(f => 
                f.id === fileStatus.id ? { ...f, progress: progress.progress } : f
              ))
            }
          )

          if (result.success) {
            // Validate parameters with domain knowledge
            let validatedParameters = result.parameters || [];
            if (validatedParameters.length > 0) {
              const validationResults = parameterValidator.validateParameters(validatedParameters);
              validatedParameters = validationResults.map(vr => vr.enhancedParameter);
              
              // Log validation statistics
              const stats = parameterValidator.getValidationStats(validationResults);
              console.log('Parameter validation stats:', stats);
            }

            // Convert ExtractedParameter to Parameter for compatibility
            const convertedParameters: Parameter[] = validatedParameters.map(param => ({
              id: param.id,
              productId: '',
              name: param.name,
              value: param.value,
              unit: param.unit || '',
              category: param.dataType,
              extractedFrom: 'text',
              confidence: param.confidence,
              createdAt: new Date()
            }));

            // Update file status with enhanced results
            setFiles(prev => prev.map(f => 
              f.id === fileStatus.id ? {
                ...f,
                status: 'success',
                progress: 100,
                result: {
                  ...result,
                  parameters: validatedParameters
                },
                extractedParams: convertedParameters
              } : f
            ));

            // Update upload statistics
            setUploadStats(prev => ({
              ...prev,
              processedFiles: prev.processedFiles + 1,
              successCount: prev.successCount + 1,
              totalParameters: prev.totalParameters + validatedParameters.length,
              processingTime: prev.processingTime + (result.processingTime || 0)
            }));

            console.log('Enhanced PDF processing completed:', {
              file: fileStatus.file.name,
              tables: result.tables?.length || 0,
              parameters: validatedParameters.length,
              ocrResults: result.ocrResults?.length || 0,
              processingTime: result.processingTime,
              cacheKey: result.cacheKey
            });

          } else {
            throw new Error(result.error?.message || 'PDF processing failed');
          }

        } catch (error) {
          console.error('File processing error:', error);
          
          setFiles(prev => prev.map(f => 
            f.id === fileStatus.id ? {
              ...f,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            } : f
          ));

          setUploadStats(prev => ({
            ...prev,
            processedFiles: prev.processedFiles + 1,
            errorCount: prev.errorCount + 1
          }));
        }
      }
    }

    const processingTime = Date.now() - startTime
    setUploadStats(prev => ({
      ...prev,
      processedFiles: prev.processedFiles + files.length,
      successCount: prev.successCount + successCount,
      errorCount: prev.errorCount + errorCount,
      totalParameters: prev.totalParameters + totalParameters,
      processingTime: prev.processingTime + processingTime
    }))

    setIsProcessing(false)
  }, [files, enhancedPdfProcessor, parameterValidator])

  // Extract parameters from text
  const extractParametersFromText = async (text: string, fileName: string): Promise<Parameter[]> => {
    const parameters: Parameter[] = []
    
    // Common parameter patterns
    const patterns = [
      { regex: /V\s*[Dd][Ss]\s*[Oo][Nn]\s*[=:]\s*([0-9.]+)\s*V/gi, name: 'VDS_ON', unit: 'V' },
      { regex: /I\s*[Dd]\s*[=:]\s*([0-9.]+)\s*A/gi, name: 'ID', unit: 'A' },
      { regex: /R\s*[Dd][Ss]\s*[Oo][Nn]\s*[=:]\s*([0-9.]+)\s*Ω/gi, name: 'RDS_ON', unit: 'Ω' },
      { regex: /V\s*[Gg][Ss]\s*[=:]\s*([0-9.]+)\s*V/gi, name: 'VGS', unit: 'V' },
      { regex: /C\s*[Ii][Ss][Ss]\s*[=:]\s*([0-9.]+)\s*pF/gi, name: 'CISS', unit: 'pF' },
      { regex: /C\s*[Oo][Ss][Ss]\s*[=:]\s*([0-9.]+)\s*pF/gi, name: 'COSS', unit: 'pF' },
      { regex: /C\s*[Rr][Ss][Ss]\s*[=:]\s*([0-9.]+)\s*pF/gi, name: 'CRSS', unit: 'pF' },
      { regex: /t\s*[Dd]\s*[=:]\s*([0-9.]+)\s*ns/gi, name: 'tD', unit: 'ns' },
      { regex: /t\s*[Rr]\s*[=:]\s*([0-9.]+)\s*ns/gi, name: 'tR', unit: 'ns' },
      { regex: /t\s*[Ff]\s*[=:]\s*([0-9.]+)\s*ns/gi, name: 'tF', unit: 'ns' }
    ]

    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern.regex)
      for (const match of matches) {
        const value = parseFloat(match[1])
        if (!isNaN(value)) {
          parameters.push({
            id: `${Date.now()}-${Math.random()}`,
            productId: '',
            name: pattern.name,
            value: value.toString(),
            unit: pattern.unit,
            category: 'electrical',
            extractedFrom: 'text',
            confidence: 0.8,
            createdAt: new Date()
          })
        }
      }
    })

    return parameters
  }

  // Get status color
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'processing': return 'text-blue-600'
      case 'uploading': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }, [])

  // Get status icon
  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />
      case 'error': return <AlertCircle className="h-4 w-4" />
      case 'processing': return <Cpu className="h-4 w-4 animate-spin" />
      case 'uploading': return <Upload className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }, [])

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  // Format processing time
  const formatProcessingTime = useCallback((ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }, [])

  // Add cache management functions
  const clearCache = () => {
    cacheService.clear();
    console.log('Cache cleared');
  };

  const getCacheStats = () => {
    const stats = cacheService.getStats();
    console.log('Cache statistics:', stats);
    return stats;
  };

  // Handle extraction viewer
  const openExtractionViewer = (file: File) => {
    setSelectedFile(file);
    setShowExtractionViewer(true);
  };

  const closeExtractionViewer = () => {
    setShowExtractionViewer(false);
    setSelectedFile(null);
  };

  return (
    <div className="page-container">
      {/* Extraction Viewer Modal */}
      {showExtractionViewer && selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl w-full h-full max-w-7xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Real-time Extraction Viewer</h2>
              <Button variant="outline" size="sm" onClick={closeExtractionViewer}>
                Close
              </Button>
            </div>
            <div className="flex-1">
              <RealTimeExtractionViewer
                file={selectedFile}
                onExtractionComplete={(result) => {
                  console.log('Extraction completed:', result);
                }}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">PDF UPLOAD & PROCESSING</h1>
        <p className="page-description">
          Upload semiconductor datasheets for automatic parameter extraction and SPICE model generation
        </p>
      </div>

      {/* System Status */}
      <div className="responsive-grid-4">
        <div className="metric-card">
          <div className="unified-panel-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">TOTAL FILES</p>
                <p className="metric-value">{uploadStats.totalFiles}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="unified-panel-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">SUCCESSFUL</p>
                <p className="metric-value text-green-600">{uploadStats.successCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="unified-panel-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">PARAMETERS</p>
                <p className="metric-value text-blue-600">{uploadStats.totalParameters}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="unified-panel-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">PROCESSING TIME</p>
                <p className="metric-value text-purple-600">{formatProcessingTime(uploadStats.processingTime)}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="responsive-grid-2">
        {/* Upload Area */}
        <div className="unified-panel">
          <div className="unified-panel-header">
            <h3>UPLOAD FILES</h3>
          </div>
          <div className="unified-panel-content">
            {/* Drag & Drop Area */}
            <div
              className={`file-upload-area ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold font-mono text-[hsl(var(--foreground))]">
                    Drop PDF files here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground font-mono">
                    Supports semiconductor datasheets and technical documents
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                onClick={processFiles}
                disabled={files.length === 0 || isProcessing}
                className="action-button-primary"
              >
                {isProcessing ? (
                  <>
                    <Cpu className="h-4 w-4 mr-2 animate-spin" />
                    PROCESSING...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    PROCESS FILES
                  </>
                )}
              </Button>
              
              <Button
                onClick={clearAllFiles}
                disabled={files.length === 0}
                variant="outline"
                className="action-button-ghost"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                CLEAR ALL
              </Button>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-semibold font-mono text-[hsl(var(--foreground))]">UPLOADED FILES</h4>
                {files.map((fileStatus) => (
                  <div key={fileStatus.id} className="unified-panel">
                    <div className="unified-panel-content">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium font-mono text-[hsl(var(--foreground))] truncate">
                              {fileStatus.file.name}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {formatFileSize(fileStatus.file.size)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {fileStatus.status === 'processing' && (
                            <Progress value={fileStatus.progress} className="w-20" />
                          )}
                          
                          <div className={`flex items-center space-x-1 ${getStatusColor(fileStatus.status)}`}>
                            {getStatusIcon(fileStatus.status)}
                            <span className="text-xs font-mono uppercase">
                              {fileStatus.status}
                            </span>
                          </div>
                          
                          {fileStatus.status === 'success' && (
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {fileStatus.extractedParams?.length || 0} params
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openExtractionViewer(fileStatus.file)}
                              >
                                View Extraction
                              </Button>
                            </div>
                          )}
                          
                          {fileStatus.status !== 'success' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openExtractionViewer(fileStatus.file)}
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(fileStatus.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {fileStatus.error && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                          <p className="text-xs text-red-700 dark:text-red-400 font-mono">
                            Error: {fileStatus.error}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Processing Results */}
        <div className="unified-panel">
          <div className="unified-panel-header">
            <h3>PROCESSING RESULTS</h3>
          </div>
          <div className="unified-panel-content">
            {selectedFile ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold font-mono text-[hsl(var(--foreground))] mb-2">
                    {selectedFile.name}
                  </h4>
                  
                  {/* This section is now handled by the RealTimeExtractionViewer */}
                  {/* {selectedFile.result && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-mono">Pages:</span>
                        <span className="font-mono">{selectedFile.result.pageCount}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-mono">Processing Time:</span>
                        <span className="font-mono">{selectedFile.result.processingTime}ms</span>
                      </div>
                      
                      {selectedFile.extractedParams && (
                        <div>
                          <p className="text-sm font-semibold font-mono text-[hsl(var(--foreground))] mb-2">
                            EXTRACTED PARAMETERS ({selectedFile.extractedParams.length})
                          </p>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {selectedFile.extractedParams.map((param, index) => (
                              <div key={index} className="flex justify-between text-xs p-2 bg-muted/50 rounded">
                                <span className="font-mono">{param.name}</span>
                                <span className="font-mono">{param.value} {param.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )} */}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <Info className="empty-state-icon" />
                <p className="empty-state-title">No file selected</p>
                <p className="empty-state-description">
                  Click the eye icon next to a file to view its processing results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div className="unified-panel">
        <div className="unified-panel-header">
          <h3>SYSTEM RESOURCES</h3>
        </div>
        <div className="unified-panel-content">
          <div className="responsive-grid-4">
            <div className="flex items-center space-x-3">
              <Cpu className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-mono">CPU</p>
                <p className="text-xs text-muted-foreground font-mono">{metrics.cpu.usage}% / 100%</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Database className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-mono">MEMORY</p>
                <p className="text-xs text-muted-foreground font-mono">{metrics.memory.usage}% / 100%</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <HardDrive className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-mono">DISK</p>
                <p className="text-xs text-muted-foreground font-mono">{metrics.disk.usage}% / 100%</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Cloud className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-mono">NETWORK</p>
                <p className="text-xs text-muted-foreground font-mono">{metrics.network.status.toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadPage
