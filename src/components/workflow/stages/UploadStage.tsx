"use client";

import { useState } from "react";
import { useUser } from "@stackframe/stack";
import { toast } from "sonner";
import { DragDropZone } from "@/components/workflow/DragDropZone";
import { ImageUploadGrid } from "@/components/shared/ImageUploadGrid";
import { Button } from "@/components/ui/button";
import { imageProcessorService } from "@/services/imageProcessor";
import { uploadFiles, getProjectFolder } from "@/services/storage";
import { createProject } from "@/db/actions/projects";
import type { ProcessedImage } from "@/types/images";
import type { Project } from "@/types/schema";

interface UploadStageProps {
  images: ProcessedImage[];
  setImages: React.Dispatch<React.SetStateAction<ProcessedImage[]>>;
  currentProject: Project | null;
  setCurrentProject: React.Dispatch<React.SetStateAction<Project | null>>;
  selectedMediaCount?: number;
  onImageClick: (imageId: string) => void;
  onContinue: () => void;
}

export function UploadStage({
  images,
  setImages,
  currentProject,
  setCurrentProject,
  selectedMediaCount = 0,
  onImageClick,
  onContinue
}: UploadStageProps) {
  const user = useUser();
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Check if we can continue from upload
  const isUploadInitiated = images.length > 0;
  const canContinueFromUpload =
    isUploadInitiated &&
    images.some(
      (img) => img.status === "uploaded" || img.status === "analyzed"
    );
  const allUploadedOrError =
    isUploadInitiated &&
    images.every(
      (img) =>
        img.status === "uploaded" ||
        img.status === "analyzed" ||
        img.status === "error"
    );

  // ============================================================================
  // Upload Handlers
  // ============================================================================

  const createNewProject = async () => {
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to create a project."
      });
      return null;
    }

    try {
      const newProject = await createProject();
      setCurrentProject(newProject);
      console.log("Project created:", newProject);
      return newProject;
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred"
      });
      return null;
    }
  };

  const handleUploadImages = async (imageDataArray: ProcessedImage[]) => {
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to upload images."
      });
      return;
    }

    let project = currentProject;

    if (!project) {
      project = await createNewProject();
    }

    if (!project) {
      console.error("No project available");
      toast.error("Upload failed", {
        description: "Unable to create project. Please try again."
      });
      return;
    }

    setIsUploading(true);

    try {
      const folder = getProjectFolder(project.id, user.id);

      for (let i = 0; i < imageDataArray.length; i++) {
        const imageData = imageDataArray[i];

        setImages((prev) =>
          prev.map((img) =>
            img.id === imageData.id
              ? { ...img, status: "uploading" as const }
              : img
          )
        );

        try {
          const uploadResult = await uploadFiles([imageData.file], folder);
          const result = uploadResult[0];

          if (result.status === "success") {
            setImages((prev) =>
              prev.map((img) =>
                img.id === imageData.id
                  ? {
                      ...img,
                      status: "uploaded" as const,
                      uploadUrl: result.url
                    }
                  : img
              )
            );
          } else {
            setImages((prev) =>
              prev.map((img) =>
                img.id === imageData.id
                  ? {
                      ...img,
                      status: "error" as const,
                      error: result.error
                    }
                  : img
              )
            );
          }
        } catch (error) {
          setImages((prev) =>
            prev.map((img) =>
              img.id === imageData.id
                ? {
                    ...img,
                    status: "error" as const,
                    error:
                      error instanceof Error ? error.message : "Upload failed"
                  }
                : img
            )
          );
        }
      }

      console.log("All uploads completed");
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to upload images and create projects."
      });
      return;
    }

    setIsLoadingPreviews(true);
    try {
      const imageDataArray = await imageProcessorService.createImageDataArray(
        files
      );

      setImages((prev) => {
        const existingFilenames = new Set(prev.map((img) => img.file.name));
        const newImages = imageDataArray.filter(
          (img) => !existingFilenames.has(img.file.name)
        );

        const duplicateCount = imageDataArray.length - newImages.length;
        if (duplicateCount > 0) {
          toast.info(`Skipped ${duplicateCount} duplicate image(s)`);
        }

        return [...prev, ...newImages];
      });

      const existingFilenames = new Set(images.map((img) => img.file.name));
      const newImagesToUpload = imageDataArray.filter(
        (img) => !existingFilenames.has(img.file.name)
      );

      if (newImagesToUpload.length > 0) {
        await handleUploadImages(newImagesToUpload);
      }
    } catch (error) {
      console.error("Error generating previews:", error);
      toast.error("Failed to load images", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsLoadingPreviews(false);
    }
  };

  const handleRetryUpload = async (imageId: string) => {
    const imageToRetry = images.find((img) => img.id === imageId);
    if (!imageToRetry || !currentProject || !user) return;

    const folder = getProjectFolder(currentProject.id, user.id);

    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId
          ? { ...img, status: "uploading" as const, error: undefined }
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
                  status: "uploaded" as const,
                  uploadUrl: result.url
                }
              : img
          )
        );
      } else {
        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId
              ? { ...img, status: "error" as const, error: result.error }
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
                status: "error" as const,
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
    <>
      {/* Header */}
      <div className="sticky top-0 bg-white z-30 px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">Choose Images to Upload</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Click to upload or drag and drop images of your property listing to
          generate content from.
        </p>
        {selectedMediaCount > 0 && (
          <p className="text-sm text-primary font-medium mt-2">
            {selectedMediaCount} {selectedMediaCount === 1 ? "item" : "items"}{" "}
            selected
          </p>
        )}
      </div>

      <div className="flex flex-col">
        <div className="p-6 space-y-4">
          <DragDropZone
            onFilesSelected={handleFilesSelected}
            maxFiles={50}
            maxFileSize={10 * 1024 * 1024} // 10MB
            acceptedFormats={[".jpg", ".jpeg", ".png", ".webp"]}
            isDisabled={isLoadingPreviews || isUploading}
            isUploadInitiated={isUploadInitiated}
          />

          <ImageUploadGrid
            images={images}
            onRemove={handleRemoveImage}
            onRetry={handleRetryUpload}
            onImageClick={onImageClick}
          />
        </div>

        {/* Continue Button - Sticky at bottom */}
        {canContinueFromUpload && (
          <div className="sticky bottom-0 left-0 right-0 z-20 pt-4 pb-4 px-6 bg-white border-t">
            <Button
              onClick={onContinue}
              disabled={!allUploadedOrError}
              className="w-full"
              size="lg"
            >
              {!allUploadedOrError
                ? "Waiting for uploads to complete..."
                : `Continue with ${
                    images.filter(
                      (img) =>
                        img.status === "uploaded" || img.status === "analyzed"
                    ).length
                  } image(s)`}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
