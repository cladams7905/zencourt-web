"use client";

import { useState, useEffect } from "react";
import { useUser } from "@stackframe/stack";
import { toast } from "sonner";
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
import { CategorizedImageGrid } from "./image-grid/CategorizedImageGrid";
import { createProject } from "@/db/actions/projects";
import { uploadFiles, getProjectFolder } from "@/services/storage";
import { imageProcessorService } from "@/services/imageProcessor";
import { categorizeAndOrganizeImages } from "@/services/categorization";
import { Project } from "@/types/schema";
import type { ProcessedImage, ProcessingProgress } from "@/types/images";
import type { CategorizedGroup } from "@/types/roomCategory";
import { Progress } from "./ui/progress";

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
  const user = useUser();
  const [step, setStep] = useState<
    "upload" | "categorizing" | "review" | "naming"
  >("upload");
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<ProcessedImage | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [internalIsOpen, setInternalIsOpen] = useState(isOpen);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [processingProgress, setProcessingProgress] =
    useState<ProcessingProgress | null>(null);
  const [categorizedGroups, setCategorizedGroups] = useState<
    CategorizedGroup[]
  >([]);
  const [previewImageFromGrid, setPreviewImageFromGrid] =
    useState<ProcessedImage | null>(null);
  const [previewIndexFromGrid, setPreviewIndexFromGrid] = useState<number>(0);

  // Sync external isOpen prop with internal state
  useEffect(() => {
    setInternalIsOpen(isOpen);
  }, [isOpen]);

  const handleFilesSelected = async (files: File[]) => {
    // Check if user is authenticated before allowing file selection
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to upload images and create projects."
      });
      return;
    }

    setIsLoadingPreviews(true);
    try {
      // Generate preview URLs and metadata for all files
      const imageDataArray = await imageProcessorService.createImageDataArray(
        files
      );

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
          toast.info(`Skipped ${duplicateCount} duplicate image(s)`);
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
      toast.error("Failed to load images", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsLoadingPreviews(false);
    }
  };

  const createNewProject = async () => {
    // Check user authentication before creating project
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
    // Check user authentication before uploading
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
      // Use the project ID and user ID for folder structure
      const folder = getProjectFolder(project.id, user.id);

      // Upload images one by one with status updates
      for (let i = 0; i < imageDataArray.length; i++) {
        const imageData = imageDataArray[i];

        // Update status to uploading
        setImages((prev) =>
          prev.map((img) =>
            img.id === imageData.id
              ? { ...img, status: "uploading" as const }
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
                      status: "uploaded" as const,
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
                      status: "error" as const,
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
      // TODO: Trigger AI analysis in Phase 4
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetryUpload = async (imageId: string) => {
    const imageToRetry = images.find((img) => img.id === imageId);
    if (!imageToRetry || !currentProject || !user) return;

    const folder = getProjectFolder(currentProject.id, user.id);

    // Update status to uploading
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
    // Check user authentication
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to continue processing images."
      });
      return;
    }

    if (!currentProject) {
      console.error("No project available");
      toast.error("No project found", {
        description: "Please try uploading images again."
      });
      return;
    }

    // Check if all images are uploaded/analyzed successfully (ready for processing)
    const allReady = images.every(
      (img) =>
        img.status === "uploaded" ||
        img.status === "analyzed" ||
        img.status === "error"
    );
    if (!allReady) {
      console.warn("Not all images are ready yet");
      toast.warning("Images still uploading", {
        description: "Please wait for all images to finish uploading."
      });
      return;
    }

    setIsCategorizing(true);
    setStep("categorizing");
    setProcessingProgress(null);

    try {
      // Separate already-analyzed images from new images that need processing
      const alreadyAnalyzed = images.filter(
        (img) =>
          img.classification &&
          (img.status === "uploaded" || img.status === "analyzed")
      );
      const needsAnalysis = images.filter(
        (img) =>
          !img.classification &&
          img.status === "uploaded" &&
          !img.error
      );

      console.log(
        `Already analyzed: ${alreadyAnalyzed.length}, Needs analysis: ${needsAnalysis.length}`
      );

      let finalImages: ProcessedImage[];

      if (needsAnalysis.length > 0) {
        // Process only new images with AI categorization
        const result = await imageProcessorService.processImages(
          needsAnalysis,
          currentProject.id,
          {
            onProgress: (progress) => {
              console.log(
                `Processing: ${progress.phase} - ${progress.overallProgress}% (${progress.completed}/${progress.total})`
              );
              setProcessingProgress(progress);

              // Update images state with current processing status
              if (progress.currentImage) {
                setImages((prev) =>
                  prev.map((img) =>
                    img.id === progress.currentImage?.id
                      ? progress.currentImage
                      : img
                  )
                );
              }
            }
          }
        );

        console.log("Processing complete:", result);

        // Combine already-analyzed images with newly processed ones
        finalImages = [...alreadyAnalyzed, ...result.images];
      } else {
        // All images already analyzed, no need to process
        finalImages = alreadyAnalyzed;
      }

      // Update images with final results
      setImages(finalImages);

      // Organize images into categorized groups
      const organized = categorizeAndOrganizeImages(finalImages);
      setCategorizedGroups(organized.groups);

      setStep("review");
    } catch (error) {
      console.error("Error processing images:", error);
      toast.error("Failed to process images", {
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during image processing. Please try again."
      });
      setStep("upload");
    } finally {
      setIsCategorizing(false);
      setProcessingProgress(null);
    }
  };

  // Check if we can continue (at least one uploaded image)
  const canContinue =
    images.length > 0 && images.some((img) => img.status === "uploaded" || img.status === "analyzed");
  const allUploadedOrError =
    images.length > 0 &&
    images.every(
      (img) =>
        img.status === "uploaded" ||
        img.status === "analyzed" ||
        img.status === "error"
    );

  return (
    <Dialog open={internalIsOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto pb-0`}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Project</DialogTitle>
          <DialogDescription>
            Upload property images to create an AI-generated video walkthrough
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <>
            <DragDropZone
              onFilesSelected={handleFilesSelected}
              maxFiles={50}
              maxFileSize={10 * 1024 * 1024} // 10MB
              acceptedFormats={[".jpg", ".jpeg", ".png", ".webp"]}
              isDisabled={isLoadingPreviews}
            />

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
                            (img) =>
                              img.status === "uploaded" ||
                              img.status === "analyzed"
                          ).length
                        } image(s)`}
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {step === "categorizing" && (
          <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6">
            <div className="w-full max-w-md space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  {processingProgress?.phase === "uploading" &&
                    "Uploading images..."}
                  {processingProgress?.phase === "analyzing" &&
                    "Analyzing with AI..."}
                  {processingProgress?.phase === "categorizing" &&
                    "Organizing categories..."}
                  {processingProgress?.phase === "complete" &&
                    "Processing complete!"}
                  {!processingProgress && "Starting..."}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {processingProgress
                    ? `${processingProgress.completed} of ${processingProgress.total} images`
                    : "Please wait..."}
                </p>
              </div>

              <div className="space-y-2">
                <Progress
                  value={processingProgress?.overallProgress || 0}
                  className="h-3"
                />
                <p className="text-xs text-center text-muted-foreground">
                  {processingProgress?.overallProgress
                    ? `${Math.round(processingProgress.overallProgress)}%`
                    : "0%"}
                </p>
              </div>

              {processingProgress?.currentImage && (
                <div className="text-xs text-center text-muted-foreground">
                  Processing: {processingProgress.currentImage.file.name}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Review Categorized Images
                </h3>
                <p className="text-sm text-muted-foreground">
                  {categorizedGroups.length} categories found with{" "}
                  {images.filter((img) => img.classification).length} images
                </p>
              </div>
            </div>

            <CategorizedImageGrid
              groups={categorizedGroups}
              enablePreview={false}
              showConfidence={true}
              showPreviewMetadata={true}
              onImageClick={(image, categoryIndex, imageIndex) => {
                // Find the global index of the image in all images
                let globalIndex = 0;
                for (let i = 0; i < categoryIndex; i++) {
                  globalIndex += categorizedGroups[i].images.length;
                }
                globalIndex += imageIndex;

                setPreviewImageFromGrid(image);
                setPreviewIndexFromGrid(globalIndex);
                setInternalIsOpen(false);
              }}
            />

            {/* Fade overlay sitting ABOVE the sticky footer */}
            <div className="sticky pointer-events-none bottom-12 z-20 left-0 right-0 h-10 bg-gradient-to-t from-white via-white to-transparent" />

            {/* Sticky footer */}
            <div className="sticky bottom-0 left-0 right-0 z-20 pt-0 pb-4 bg-white flex gap-3">
              <Button
                onClick={() => setStep("upload")}
                variant="outline"
                className="flex-1"
              >
                Back to Upload
              </Button>
              <Button onClick={() => setStep("naming")} className="flex-1">
                Continue to Name Project
              </Button>
            </div>
          </div>
        )}

        {step === "naming" && (
          <div className="flex items-center justify-center min-h-[300px]">
            <p className="text-muted-foreground">Name your project...</p>
          </div>
        )}
      </DialogContent>

      {/* Image Preview Modal - Upload Step */}
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

      {/* Image Preview Modal - Review Step (Categorized Grid) */}
      {previewImageFromGrid && (
        <ImagePreviewModal
          isOpen={!!previewImageFromGrid}
          onClose={() => {
            setPreviewImageFromGrid(null);
            setInternalIsOpen(true);
          }}
          currentImage={previewImageFromGrid}
          allImages={images}
          currentIndex={previewIndexFromGrid}
          onNavigate={(index) => {
            const newImage = images[index];
            if (newImage) {
              setPreviewImageFromGrid(newImage);
              setPreviewIndexFromGrid(index);
            }
          }}
          categoryInfo={
            previewImageFromGrid.classification
              ? {
                  displayLabel:
                    categorizedGroups.find((g) =>
                      g.images.some(
                        (img) => img.id === previewImageFromGrid.id
                      )
                    )?.displayLabel || "Unknown",
                  color:
                    categorizedGroups.find((g) =>
                      g.images.some(
                        (img) => img.id === previewImageFromGrid.id
                      )
                    )?.metadata.color || "#6b7280"
                }
              : undefined
          }
          showMetadata={true}
        />
      )}
    </Dialog>
  );
}
