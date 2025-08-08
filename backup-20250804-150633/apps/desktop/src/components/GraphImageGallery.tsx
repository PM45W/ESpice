import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Trash2, 
  Edit, 
  Eye, 
  Download, 
  MoreVertical,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Play
} from 'lucide-react';
import GraphImageService, { GraphImage } from '../services/graphImageService';

interface GraphImageGalleryProps {
  productId: string;
  onImageSelect?: (image: GraphImage) => void;
  onImageDelete?: (imageId: string) => void;
  onImageUpdate?: (image: GraphImage) => void;
  showActions?: boolean;
  maxImages?: number;
}

const GraphImageGallery: React.FC<GraphImageGalleryProps> = ({
  productId,
  onImageSelect,
  onImageDelete,
  onImageUpdate,
  showActions = true,
  maxImages = 10
}) => {
  const [images, setImages] = useState<GraphImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GraphImage | null>(null);
  const [editingImage, setEditingImage] = useState<GraphImage | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const graphImageService = GraphImageService.getInstance();

  useEffect(() => {
    loadImages();
  }, [productId]);

  const loadImages = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedImages = await graphImageService.getImagesByProduct(productId);
      setImages(loadedImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (image: GraphImage) => {
    setSelectedImage(image);
    onImageSelect?.(image);
  };

  const handleImageDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await graphImageService.deleteImage(imageId);
      setImages(prev => prev.filter(img => img.id !== imageId));
      onImageDelete?.(imageId);
    } catch (err) {
      console.error('Failed to delete image:', err);
      alert('Failed to delete image');
    }
  };

  const handleImageUpdate = async (image: GraphImage) => {
    try {
      const updatedImage = await graphImageService.updateImage(image.id, {
        filename: image.filename,
        description: image.description
      });
      setImages(prev => prev.map(img => img.id === image.id ? updatedImage : img));
      setEditingImage(null);
      onImageUpdate?.(updatedImage);
    } catch (err) {
      console.error('Failed to update image:', err);
      alert('Failed to update image');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Play className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <ImageIcon className="w-12 h-12 mb-4" />
        <p className="text-lg font-medium mb-2">No graph images</p>
        <p className="text-sm text-center">
          Upload graph images to start extraction processing
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Graph Images ({images.length})
        </h3>
        {showActions && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Click image to view details</span>
          </div>
        )}
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="group relative border border-border rounded-lg overflow-hidden bg-card hover:shadow-md transition-all duration-200"
          >
            {/* Image Preview */}
            <div 
              className="relative aspect-video bg-muted cursor-pointer"
              onClick={() => handleImageClick(image)}
            >
              {image.filePath ? (
                <img
                  src={`file://${image.filePath}`}
                  alt={image.filename}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className="hidden absolute inset-0 flex items-center justify-center bg-muted">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>

              {/* Status Badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/50 text-white text-xs rounded">
                {getStatusIcon(image.status)}
                {getStatusText(image.status)}
              </div>

              {/* Actions Overlay */}
              {showActions && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(image);
                        setShowImageModal(true);
                      }}
                      className="w-6 h-6 bg-black/50 text-white rounded flex items-center justify-center hover:bg-black/70 transition-colors"
                      title="View full size"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingImage(image);
                      }}
                      className="w-6 h-6 bg-black/50 text-white rounded flex items-center justify-center hover:bg-black/70 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageDelete(image.id);
                      }}
                      className="w-6 h-6 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Image Info */}
            <div className="p-3">
              {editingImage?.id === image.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingImage.filename}
                    onChange={(e) => setEditingImage({
                      ...editingImage,
                      filename: e.target.value
                    })}
                    className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                  />
                  <textarea
                    value={editingImage.description || ''}
                    onChange={(e) => setEditingImage({
                      ...editingImage,
                      description: e.target.value
                    })}
                    placeholder="Description..."
                    className="w-full px-2 py-1 text-sm border border-border rounded bg-background resize-none"
                    rows={2}
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleImageUpdate(editingImage)}
                      className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingImage(null)}
                      className="px-2 py-1 text-xs bg-muted text-foreground rounded hover:bg-muted/80"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-foreground truncate" title={image.filename}>
                    {image.filename}
                  </h4>
                  {image.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2" title={image.description}>
                      {image.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {formatFileSize(image.fileSize)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(image.uploadDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl border border-border max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">{selectedImage.filename}</h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <img
                    src={`file://${selectedImage.filePath}`}
                    alt={selectedImage.filename}
                    className="w-full h-auto max-h-96 object-contain border border-border rounded"
                  />
                </div>
                <div className="lg:w-80 space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Image Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Filename:</span>
                        <span className="text-foreground">{selectedImage.filename}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="text-foreground">{formatFileSize(selectedImage.fileSize)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="text-foreground">{selectedImage.mimeType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Upload Date:</span>
                        <span className="text-foreground">
                          {new Date(selectedImage.uploadDate).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="text-foreground flex items-center gap-1">
                          {getStatusIcon(selectedImage.status)}
                          {getStatusText(selectedImage.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {selectedImage.description && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{selectedImage.description}</p>
                    </div>
                  )}
                  {selectedImage.dimensions && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Dimensions</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedImage.dimensions.width} × {selectedImage.dimensions.height} pixels
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphImageGallery; 