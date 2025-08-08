import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, FileText, Calendar, Info } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface UploadImage {
  id: string;
  file: File;
  preview: string;
  filename: string;
  description: string;
  uploadDate: Date;
  fileSize: number;
  mimeType: string;
  dimensions?: { width: number; height: number };
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

interface MultiImageUploadProps {
  onImagesUploaded: (images: UploadImage[]) => void;
  onCancel: () => void;
  maxImages?: number;
  acceptedFileTypes?: string[];
  title?: string;
  description?: string;
  className?: string;
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  onImagesUploaded,
  onCancel,
  maxImages = 10,
  acceptedFileTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/tiff'],
  title = 'Upload Images',
  description = 'Drag and drop images or click to select files',
  className = ''
}) => {
  const [images, setImages] = useState<UploadImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages: UploadImage[] = acceptedFiles.map(file => {
      const id = `temp-${Date.now()}-${Math.random()}`;
      const preview = URL.createObjectURL(file);
      
      return {
        id,
        file,
        preview,
        filename: file.name,
        description: '',
        uploadDate: new Date(),
        fileSize: file.size,
        mimeType: file.type,
        status: 'pending'
      };
    });

    setImages(prev => {
      const combined = [...prev, ...newImages];
      return combined.slice(0, maxImages);
    });
  }, [maxImages]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    multiple: true,
    maxFiles: maxImages
  });

  const removeImage = (id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const updateImageMetadata = (id: string, field: keyof UploadImage, value: any) => {
    setImages(prev => 
      prev.map(img => 
        img.id === id ? { ...img, [field]: value } : img
      )
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (images.length === 0) return;

    setUploading(true);
    
    try {
      // Simulate upload process
      const uploadedImages = await Promise.all(
        images.map(async (image) => {
          // Simulate upload delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          return {
            ...image,
            status: 'completed' as const
          };
        })
      );

      onImagesUploaded(uploadedImages);
    } catch (error) {
      console.error('Upload failed:', error);
      // Handle error state
      setImages(prev => 
        prev.map(img => ({
          ...img,
          status: 'failed' as const,
          error: 'Upload failed'
        }))
      );
    } finally {
      setUploading(false);
    }
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    setImages(prev => {
      const newImages = [...prev];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      return newImages;
    });
  };

  return (
    <div className={`multi-image-upload ${className}`}>
      <div className="upload-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'drag-active' : ''} ${images.length >= maxImages ? 'disabled' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="dropzone-content">
          <Upload className="upload-icon" />
          <p>Drag & drop images here, or click to select files</p>
          <p className="file-info">
            Accepted: {acceptedFileTypes.join(', ')} | Max: {maxImages} files
          </p>
        </div>
      </div>

      {images.length > 0 && (
        <div className="image-preview-section">
          <div className="preview-header">
            <h3>Selected Images ({images.length}/{maxImages})</h3>
            <button 
              onClick={handleUpload} 
              disabled={uploading}
              className="upload-button"
            >
              {uploading ? 'Uploading...' : 'Upload All'}
            </button>
          </div>

          <div className="image-grid">
            {images.map((image, index) => (
              <div key={image.id} className="image-item">
                <div className="image-preview">
                  <img src={image.preview} alt={image.filename} />
                  <button 
                    onClick={() => removeImage(image.id)}
                    className="remove-button"
                  >
                    <X />
                  </button>
                </div>
                
                <div className="image-info">
                  <div className="filename">{image.filename}</div>
                  <div className="file-size">{formatFileSize(image.fileSize)}</div>
                  
                  <input
                    type="text"
                    placeholder="Add description..."
                    value={image.description}
                    onChange={(e) => updateImageMetadata(image.id, 'description', e.target.value)}
                    className="description-input"
                  />
                  
                  <div className="status-badge">
                    {image.status === 'pending' && <span className="pending">Pending</span>}
                    {image.status === 'uploading' && <span className="uploading">Uploading...</span>}
                    {image.status === 'completed' && <span className="completed">Completed</span>}
                    {image.status === 'failed' && <span className="failed">Failed</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="upload-actions">
        <button onClick={onCancel} className="cancel-button">
          Cancel
        </button>
      </div>

      <style jsx>{`
        .multi-image-upload {
          padding: 1rem;
          border-radius: 8px;
          background: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .upload-header {
          margin-bottom: 1rem;
        }

        .upload-header h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .upload-header p {
          margin: 0;
          color: #666;
        }

        .dropzone {
          border: 2px dashed #ddd;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dropzone:hover {
          border-color: #007bff;
          background-color: #f8f9fa;
        }

        .dropzone.drag-active {
          border-color: #007bff;
          background-color: #e3f2fd;
        }

        .dropzone.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dropzone-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .upload-icon {
          width: 48px;
          height: 48px;
          color: #007bff;
        }

        .file-info {
          font-size: 0.875rem;
          color: #666;
        }

        .image-preview-section {
          margin-top: 1rem;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .preview-header h3 {
          margin: 0;
          font-size: 1.125rem;
        }

        .upload-button {
          background: #007bff;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .upload-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .image-item {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
        }

        .image-preview {
          position: relative;
          height: 150px;
          background: #f8f9fa;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-button {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-info {
          padding: 0.75rem;
        }

        .filename {
          font-weight: 500;
          margin-bottom: 0.25rem;
          word-break: break-word;
        }

        .file-size {
          font-size: 0.875rem;
          color: #666;
          margin-bottom: 0.5rem;
        }

        .description-input {
          width: 100%;
          padding: 0.25rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        .status-badge {
          display: flex;
          gap: 0.25rem;
        }

        .status-badge span {
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .pending {
          background: #fff3cd;
          color: #856404;
        }

        .uploading {
          background: #cce5ff;
          color: #004085;
        }

        .completed {
          background: #d4edda;
          color: #155724;
        }

        .failed {
          background: #f8d7da;
          color: #721c24;
        }

        .upload-actions {
          margin-top: 1rem;
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .cancel-button {
          background: #6c757d;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default MultiImageUpload; 