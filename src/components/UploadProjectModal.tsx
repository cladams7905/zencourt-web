"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "./ui/dialog";
import { DragDropZone } from "./DragDropZone";
import { ImageUploadGrid } from "./shared/ImageUploadGrid";
import { ImageData, createImageDataArray } from "@/types/image";
import { uploadFiles, getProjectFolder } from "@/services/storage";

interface Project {
  id: number;
  title: string;
  thumbnail: string;
  duration: string;
  status: string;
  format: "vertical" | "landscape";
  platform: string;
  subtitles: boolean;
}

interface UploadProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (project: Project) => void;
}

export function UploadProjectModal({
  isOpen,
  onClose,
  onProjectCreated
}: UploadProjectModalProps) {
  const [step, setStep] = useState<
    "upload" | "categorizing" | "review" | "naming"
  >("upload");
  const [images, setImages] = useState<ImageData[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilesSelected = async (files: File[]) => {
    setIsLoadingPreviews(true);
    try {
      // Generate preview URLs and metadata for all files
      const imageDataArray = await createImageDataArray(files);

      // Filter out duplicates based on filename
      setImages((prev) => {
        const existingFilenames = new Set(prev.map(img => img.file.name));
        const newImages = imageDataArray.filter(
          img => !existingFilenames.has(img.file.name)
        );

        // Log if any duplicates were skipped
        const duplicateCount = imageDataArray.length - newImages.length;
        if (duplicateCount > 0) {
          console.log(`Skipped ${duplicateCount} duplicate image(s)`);
        }

        return [...prev, ...newImages];
      });

      console.log("Images loaded:", imageDataArray);

      // Only upload the non-duplicate images
      const existingFilenames = new Set(images.map(img => img.file.name));
      const newImagesToUpload = imageDataArray.filter(
        img => !existingFilenames.has(img.file.name)
      );

      if (newImagesToUpload.length > 0) {
        await handleUploadImages(newImagesToUpload);
      }
    } catch (error) {
      console.error("Error generating previews:", error);
    } finally {
      setIsLoadingPreviews(false);
    }
  };

  const handleUploadImages = async (imageDataArray: ImageData[]) => {
    setIsUploading(true);

    try {
      // Generate a temporary project ID for folder organization
      const projectId = `temp-${Date.now()}`;
      const folder = getProjectFolder(projectId);

      // Upload images one by one with status updates
      for (let i = 0; i < imageDataArray.length; i++) {
        const imageData = imageDataArray[i];

        // Update status to uploading
        setImages((prev) =>
          prev.map((img) =>
            img.id === imageData.id
              ? { ...img, uploadStatus: "uploading" as const }
              : img
          )
        );

        try {
          // Upload the file
          const uploadResult = await uploadFiles([imageData.file], folder);
          const result = uploadResult[0];

          if (result.status === "success") {
            // Update status to uploaded
            setImages((prev) =>
              prev.map((img) =>
                img.id === imageData.id
                  ? {
                      ...img,
                      uploadStatus: "uploaded" as const,
                      uploadUrl: result.url
                    }
                  : img
              )
            );
          } else {
            // Update status to error
            setImages((prev) =>
              prev.map((img) =>
                img.id === imageData.id
                  ? {
                      ...img,
                      uploadStatus: "error" as const,
                      error: result.error
                    }
                  : img
              )
            );
          }
        } catch (error) {
          // Update status to error
          setImages((prev) =>
            prev.map((img) =>
              img.id === imageData.id
                ? {
                    ...img,
                    uploadStatus: "error" as const,
                    error:
                      error instanceof Error ? error.message : "Upload failed"
                  }
                : img
            )
          );
        }
      }

      console.log("All uploads completed");
      // TODO: Trigger AI analysis in Phase 4
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetryUpload = async (imageId: string) => {
    const imageToRetry = images.find((img) => img.id === imageId);
    if (!imageToRetry) return;

    const projectId = `temp-${Date.now()}`;
    const folder = getProjectFolder(projectId);

    // Update status to uploading
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId
          ? { ...img, uploadStatus: "uploading" as const, error: undefined }
          : img
      )
    );

    try {
      const uploadResult = await uploadFiles([imageToRetry.file], folder);
      const result = uploadResult[0];

      if (result.status === "success") {
        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId
              ? {
                  ...img,
                  uploadStatus: "uploaded" as const,
                  uploadUrl: result.url
                }
              : img
          )
        );
      } else {
        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId
              ? { ...img, uploadStatus: "error" as const, error: result.error }
              : img
          )
        );
      }
    } catch (error) {
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? {
                ...img,
                uploadStatus: "error" as const,
                error: error instanceof Error ? error.message : "Upload failed"
              }
            : img
        )
      );
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Project</DialogTitle>
          <DialogDescription>
            Upload property images to create an AI-generated video walkthrough
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {step === "upload" && (
            <>
              <DragDropZone
                onFilesSelected={handleFilesSelected}
                maxFiles={50}
                maxFileSize={10 * 1024 * 1024} // 10MB
                acceptedFormats={[".jpg", ".jpeg", ".png", ".webp"]}
                isDisabled={isLoadingPreviews}
              />

              {isLoadingPreviews && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Generating previews...
                </div>
              )}

              <ImageUploadGrid
                images={images}
                onRemove={handleRemoveImage}
                onRetry={handleRetryUpload}
              />
            </>
          )}

          {step === "categorizing" && (
            <div className="flex items-center justify-center min-h-[300px]">
              <p className="text-muted-foreground">Categorizing images...</p>
            </div>
          )}

          {step === "review" && (
            <div className="flex items-center justify-center min-h-[300px]">
              <p className="text-muted-foreground">
                Review categorized images...
              </p>
            </div>
          )}

          {step === "naming" && (
            <div className="flex items-center justify-center min-h-[300px]">
              <p className="text-muted-foreground">Name your project...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
