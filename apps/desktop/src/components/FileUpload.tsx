import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { Button, Progress } from '@espice/ui'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
  acceptedTypes?: string[]
  maxSize?: number // in bytes
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  maxFiles = 10,
  acceptedTypes = ['.pdf', '.txt', '.doc', '.docx'],
  maxSize = 50 * 1024 * 1024 // 50MB
}) => {
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [uploadStatus, setUploadStatus] = useState<{ [key: string]: 'pending' | 'uploading' | 'success' | 'error' }>({})

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle accepted files
    const newFiles = acceptedFiles.slice(0, maxFiles - files.length)
    setFiles(prev => [...prev, ...newFiles])
    
    // Initialize status for new files
    const newStatus: { [key: string]: 'pending' | 'uploading' | 'success' | 'error' } = {}
    newFiles.forEach(file => {
      newStatus[file.name] = 'pending'
    })
    setUploadStatus(prev => ({ ...prev, ...newStatus }))
    
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      console.warn('Rejected files:', rejectedFiles)
    }
  }, [files.length, maxFiles])

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[type] = []
      return acc
    }, {} as { [key: string]: string[] }),
    maxSize,
    maxFiles: maxFiles - files.length
  })

  const removeFile = (index: number) => {
    const fileToRemove = files[index]
    setFiles(prev => prev.filter((_, i) => i !== index))
    
    // Clean up status
    setUploadStatus(prev => {
      const newStatus = { ...prev }
      delete newStatus[fileToRemove.name]
      return newStatus
    })
    
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[fileToRemove.name]
      return newProgress
    })
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    // Simulate upload for each file
    for (const file of files) {
      setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }))
      
      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(prev => ({ ...prev, [file.name]: i }))
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      setUploadStatus(prev => ({ ...prev, [file.name]: 'success' }))
    }
    
    // Call the callback with uploaded files
    onFilesSelected(files)
  }

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return <FileText className="h-4 w-4" />
    if (file.type.includes('text')) return <FileText className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-[hsl(var(--success-600))]" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-[hsl(var(--error-600))]" />
      case 'uploading':
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-[hsl(var(--info-600))] border-t-transparent" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer",
          isDragActive 
            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] bg-opacity-10 scale-[1.02]"
            : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))]"
          ,
          isDragReject && "border-[hsl(var(--error-600))] bg-[hsl(var(--error-50))]"
        )}
      >
        <input {...getInputProps()} />
        
        <div className={cn(
          "mx-auto mb-4 rounded-full p-3 w-16 h-16 flex items-center justify-center",
          isDragActive ? "bg-[hsl(var(--primary))] bg-opacity-20" : "bg-[hsl(var(--muted))]"
        )}>
          <Upload className={cn(
            "h-8 w-8",
            isDragActive ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]"
          )} />
        </div>
        
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {isDragActive 
            ? 'Drop the files here...' 
            : 'Drag & drop files here, or click to select files'
          }
        </p>
        
        <div className="text-xs text-[hsl(var(--muted-foreground))] space-y-1">
          <p>Accepted types: {acceptedTypes.join(', ')}</p>
          <p>Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB</p>
          <p>Max files: {maxFiles}</p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-[hsl(var(--foreground))]">
              Selected Files ({files.length}/{maxFiles})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiles([])}
            >
              Clear All
            </Button>
          </div>
          
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center space-x-4 text-xs text-[hsl(var(--muted-foreground))]">
                <div className="flex items-center space-x-2 flex-1">
                  {getFileIcon(file)}
                  <span className="text-[hsl(var(--foreground))]">{file.name}</span>
                  <span>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {uploadStatus[file.name] && (
                    <>
                      {getStatusIcon(uploadStatus[file.name])}
                      {uploadStatus[file.name] === 'uploading' && (
                        <span>{uploadProgress[file.name]}%</span>
                      )}
                    </>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="h-8 w-8 p-0 hover:text-[hsl(var(--error-600))]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Progress Bars */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                uploadProgress[file.name] !== undefined && (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
                      <span>{file.name}</span>
                      <span>{uploadProgress[file.name]}%</span>
                    </div>
                    <Progress value={uploadProgress[file.name]} className="h-2" />
                  </div>
                )
              ))}
            </div>
          )}
          
          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={files.length === 0}
            className="w-full"
          >
            Upload {files.length} File{files.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  )
}

export default FileUpload 