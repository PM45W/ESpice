import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText } from 'lucide-react'
import { Button } from '../Button'
import { cn } from '../../utils/cn'

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
  acceptedTypes?: string[]
  maxSize?: number
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  maxFiles = 10,
  acceptedTypes = ['.pdf', '.txt', '.doc', '.docx'],
  maxSize = 50 * 1024 * 1024
}) => {
  const [files, setFiles] = useState<File[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.slice(0, maxFiles - files.length)
    setFiles(prev => [...prev, ...newFiles])
  }, [files.length, maxFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[type] = []
      return acc
    }, {} as { [key: string]: string[] }),
    maxSize,
    maxFiles: maxFiles - files.length
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = () => {
    if (files.length === 0) return
    onFilesSelected(files)
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer",
          isDragActive 
            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] bg-opacity-10"
            : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-4" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Selected Files ({files.length}/{maxFiles})</h3>
            <Button variant="outline" size="sm" onClick={() => setFiles([])}>
              Clear All
            </Button>
          </div>
          
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center space-x-4">
                <FileText className="h-4 w-4" />
                <span className="flex-1">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          
          <Button onClick={handleUpload} className="w-full">
            Upload {files.length} File{files.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  )
}

export default FileUpload 