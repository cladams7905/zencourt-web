"use client";

import { ImageData } from "@/types/image";
import { Loader2, X, AlertCircle, RotateCw } from "lucide-react";

interface ImagePreviewGridProps {
  images: ImageData[];
  onRemove?: (imageId: string) => void;
  onRetry?: (imageId: string) => void;
}

export function ImagePreviewGrid({ images, onRemove, onRetry }: ImagePreviewGridProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Selected Images ({images.length})
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/20 group"
          >
            {/* Image Preview */}
            <img
              src={image.previewUrl}
              alt={image.file.name}
              className="w-full h-full object-cover"
            />

            {/* Loading Overlay */}
            {image.uploadStatus === "uploading" && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}

            {/* Error Overlay */}
            {image.uploadStatus === "error" && (
              <div className="absolute inset-0 bg-red-500/90 flex flex-col items-center justify-center p-2">
                <AlertCircle className="w-8 h-8 text-white mb-1" />
                <p className="text-xs text-white text-center mb-2">
                  {image.error || "Upload failed"}
                </p>
                {onRetry && (
                  <button
                    onClick={() => onRetry(image.id)}
                    className="px-3 py-1 bg-white text-red-600 rounded text-xs font-medium hover:bg-gray-100 flex items-center gap-1"
                  >
                    <RotateCw size={12} />
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* Remove Button */}
            {onRemove && image.uploadStatus !== "uploading" && (
              <button
                onClick={() => onRemove(image.id)}
                className="absolute top-2 right-2 w-6 h-6 bg-black/70 hover:bg-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <X size={14} className="text-white" />
              </button>
            )}

            {/* Success Badge */}
            {image.uploadStatus === "uploaded" && (
              <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                ✓
              </div>
            )}

            {/* File Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-xs text-white truncate">{image.file.name}</p>
              {image.metadata && (
                <p className="text-xs text-white/70">
                  {image.metadata.width} × {image.metadata.height}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-3 text-xs text-muted-foreground">
        {images.filter((img) => img.uploadStatus === "uploaded").length > 0 && (
          <span className="mr-3">
            ✓ {images.filter((img) => img.uploadStatus === "uploaded").length} uploaded
          </span>
        )}
        {images.filter((img) => img.uploadStatus === "uploading").length > 0 && (
          <span className="mr-3">
            ⟳ {images.filter((img) => img.uploadStatus === "uploading").length} uploading
          </span>
        )}
        {images.filter((img) => img.uploadStatus === "error").length > 0 && (
          <span className="text-red-600">
            ✕ {images.filter((img) => img.uploadStatus === "error").length} failed
          </span>
        )}
      </div>
    </div>
  );
}
