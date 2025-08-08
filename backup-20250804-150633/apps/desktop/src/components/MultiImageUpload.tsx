import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, FileText, Calendar, Info } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { GraphImage } from '../services/graphImageService';

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
  productId: string;
  onImagesUploaded: (images: UploadImage[]) => void;
  onCancel: () => void;
  maxImages?: number;
  acceptedFileTypes?: string[];
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  productId,
  onImagesUploaded,
  onCancel,
  maxImages = 10,
  acceptedFileTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/tiff']
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
      // Simulate upload process - in real implementation, this would call the API
      const uploadedImages = await Promise.all(
        images.map(async (image) => {
          // Simulate API call to upload image
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
          
          return {
            ...image,
            id: `uploaded-${Date.now()}-${Math.random()}`,
            status: 'completed' as const
          };
        })
      );

      onImagesUploaded(uploadedImages);
    } catch (error) {
      console.error('Upload failed:', error);
      setImages(prev => 
        prev.map(img => ({ ...img, status: 'failed', error: 'Upload failed' }))
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Upload Graph Images</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload multiple graph images for product {productId}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Drop Zone */}
          {images.length < maxImages && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground mb-2">
                {isDragActive ? 'Drop images here' : 'Drag & drop graph images here'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to select files
              </p>
              <p className="text-xs text-muted-foreground">
                Supported formats: PNG, JPEG, GIF, BMP, TIFF (Max {maxImages} images)
              </p>
            </div>
          )}

          {/* Image List */}
          {images.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Images ({images.length}/{maxImages})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className="border border-border rounded-lg p-4 bg-muted/30"
                  >
                    {/* Image Preview */}
                    <div className="relative mb-3">
                      <img
                        src={image.preview}
                        alt={image.filename}
                        className="w-full h-32 object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {image.status === 'uploading' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                          <div className="text-white text-sm">Uploading...</div>
                        </div>
                      )}
                      {image.status === 'failed' && (
                        <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center rounded-lg">
                          <div className="text-white text-sm">Failed</div>
                        </div>
                      )}
                    </div>

                    {/* Image Metadata */}
                    <div className="space-y-3">
                      {/* Filename */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Filename
                        </label>
                        <input
                          type="text"
                          value={image.filename}
                          onChange={(e) => updateImageMetadata(image.id, 'filename', e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Description
                        </label>
                        <textarea
                          value={image.description}
                          onChange={(e) => updateImageMetadata(image.id, 'description', e.target.value)}
                          placeholder="Describe this graph image..."
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm resize-none"
                          rows={2}
                        />
                      </div>

                      {/* File Info */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {formatFileSize(image.fileSize)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {image.uploadDate.toLocaleDateString()}
                        </div>
                      </div>

                      {/* Error Message */}
                      {image.error && (
                        <div className="text-red-500 text-xs flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          {image.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {images.length} image{images.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-foreground hover:bg-muted rounded-md transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={images.length === 0 || uploading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : `Upload ${images.length} Image${images.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiImageUpload; 