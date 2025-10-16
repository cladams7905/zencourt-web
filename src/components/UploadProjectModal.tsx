"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "./ui/dialog";
import { Button } from "./ui/button";
import { DragDropZone } from "./DragDropZone";
import { ImageUploadGrid } from "./shared/ImageUploadGrid";
import { ImagePreviewModal } from "./modals/ImagePreviewModal";
import { ImageData, createImageDataArray } from "@/types/image";
import { uploadFiles, getProjectFolder } from "@/services/storage";
import { processImages } from "@/services/imageProcessor";
import type { ProcessedImage } from "@/services/imageProcessor";

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
  const [previewImage, setPreviewImage] = useState<ImageData | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [internalIsOpen, setInternalIsOpen] = useState(isOpen);

  // Sync external isOpen prop with internal state
  useEffect(() => {
    setInternalIsOpen(isOpen);
  }, [isOpen]);

  const handleFilesSelected = async (files: File[]) => {
    setIsLoadingPreviews(true);
    try {
      // Generate preview URLs and metadata for all files
      const imageDataArray = await createImageDataArray(files);

      // Filter out duplicates based on filename
      setImages((prev) => {
        const existingFilenames = new Set(prev.map((img) => img.file.name));
        const newImages = imageDataArray.filter(
          (img) => !existingFilenames.has(img.file.name)
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
      const existingFilenames = new Set(images.map((img) => img.file.name));
      const newImagesToUpload = imageDataArray.filter(
        (img) => !existingFilenames.has(img.file.name)
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

  const handleImageClick = (imageId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (image) {
      setPreviewImage(image);
      // Close the upload modal when opening preview
      setInternalIsOpen(false);
    }
  };

  const handlePreviewClose = () => {
    setPreviewImage(null);
    // Reopen the upload modal when preview closes
    setInternalIsOpen(true);
  };

  const handleContinue = async () => {
    // Check if all images are uploaded successfully
    const allUploaded = images.every((img) => img.uploadStatus === "uploaded");
    if (!allUploaded) {
      console.warn("Not all images are uploaded yet");
      return;
    }

    setIsCategorizing(true);
    setStep("categorizing");

    try {
      const projectId = `temp-${Date.now()}`;

      // Process images with AI categorization using the full ImageData objects
      const result = await processImages(images, projectId, {
        onProgress: (progress) => {
          console.log(
            `Processing: ${progress.phase} - ${progress.overallProgress}%`
          );
        }
      });

      console.log("Processing complete:", result);
      setStep("review");
      // TODO: Display categorized results in the review step
    } catch (error) {
      console.error("Error processing images:", error);
      setStep("upload");
    } finally {
      setIsCategorizing(false);
    }
  };

  // Check if we can continue (at least one uploaded image)
  const canContinue =
    images.length > 0 && images.some((img) => img.uploadStatus === "uploaded");
  const allUploadedOrError =
    images.length > 0 &&
    images.every(
      (img) => img.uploadStatus === "uploaded" || img.uploadStatus === "error"
    );

  return (
    <Dialog open={internalIsOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-4xl max-h-[90vh] overflow-y-auto ${
          (allUploadedOrError || isUploading) && "pb-0"
        }`}
      >
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
                onImageClick={handleImageClick}
              />

              {/* Continue Button - Sticky at bottom */}
              {canContinue && (
                <>
                  {/* Fade overlay sitting ABOVE the sticky footer */}
                  <div className="sticky pointer-events-none bottom-12 z-20 left-0 right-0 h-12 bg-gradient-to-t from-white via-white to-transparent" />

                  {/* Sticky footer */}
                  <div className="sticky bottom-0 left-0 right-0 z-20 pt-0 pb-4 bg-white">
                    <Button
                      onClick={handleContinue}
                      disabled={!allUploadedOrError || isCategorizing}
                      className="w-full"
                      size="lg"
                    >
                      {isCategorizing
                        ? "Processing..."
                        : !allUploadedOrError
                        ? "Waiting for uploads to complete..."
                        : `Continue with ${
                            images.filter(
                              (img) => img.uploadStatus === "uploaded"
                            ).length
                          } image(s)`}
                    </Button>
                  </div>
                </>
              )}
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

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={!!previewImage}
          onClose={handlePreviewClose}
          currentImage={{
            id: previewImage.id,
            file: previewImage.file,
            previewUrl: previewImage.previewUrl,
            uploadUrl: previewImage.uploadUrl,
            status: "uploaded"
          }}
          allImages={images.map((img) => ({
            id: img.id,
            file: img.file,
            previewUrl: img.previewUrl,
            uploadUrl: img.uploadUrl,
            status: "uploaded"
          }))}
          currentIndex={images.findIndex((img) => img.id === previewImage.id)}
          onNavigate={(index) => {
            const newImage = images[index];
            if (newImage) {
              setPreviewImage(newImage);
            }
          }}
          categoryInfo={{
            displayLabel: "Upload",
            color: "#6b7280"
          }}
          showMetadata={false}
        />
      )}
    </Dialog>
  );
}
