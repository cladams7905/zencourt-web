"use client";

import { useState, useEffect } from "react";
import { useUser } from "@stackframe/stack";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { cn } from "@/components/ui/utils";
import { ProjectNameInput } from "@/components/workflow/ProjectNameInput";
import { WorkflowTimeline } from "@/components/workflow/WorkflowTimeline";
import { PlanStage } from "@/components/workflow/stages/PlanStage";
import { ReviewStage } from "@/components/workflow/stages/ReviewStage";
import { GenerateStage } from "@/components/workflow/stages/GenerateStage";
import { DragDropZone } from "@/components/DragDropZone";
import { ImageUploadGrid } from "@/components/shared/ImageUploadGrid";
import { ImagePreviewModal } from "@/components/modals/ImagePreviewModal";
import { CategorizedImageGrid } from "@/components/image-grid/CategorizedImageGrid";
import {
  createProject,
  updateProject,
  getNextDraftNumber
} from "@/db/actions/projects";
import { saveImages } from "@/db/actions/images";
import { uploadFiles, getProjectFolder } from "@/services/storage";
import { imageProcessorService } from "@/services/imageProcessor";
import { categorizeAndOrganizeImages } from "@/services/categorization";
import { Project } from "@/types/schema";
import type {
  ProcessedImage,
  ProcessingProgress,
  SerializableImageData
} from "@/types/images";
import type { CategorizedGroup } from "@/types/roomCategory";
import type {
  WorkflowStage,
  MediaSelection,
  GenerationProgress,
  GenerationStep
} from "@/types/workflow";
import { getCompletedStages } from "@/types/workflow";
import { Progress } from "@/components/ui/progress";
import { startGeneration, createProgressPoller } from "@/services/generationService";
import { canProceedToStage } from "@/services/workflowValidation";
import { useRef, useCallback } from "react";

interface ProjectWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (project: Project) => void;
}

export function ProjectWorkflowModal({
  isOpen,
  onClose,
  onProjectCreated
}: ProjectWorkflowModalProps) {
  const user = useUser();

  // Workflow state
  const [currentStage, setCurrentStage] = useState<WorkflowStage>("upload");
  const [projectName, setProjectName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Project and image state
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [categorizedGroups, setCategorizedGroups] = useState<CategorizedGroup[]>([]);

  // Media selection state
  const [selectedMedia, setSelectedMedia] = useState<MediaSelection[]>([]);

  // Upload stage state
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<ProcessedImage | null>(null);

  // Categorize stage state
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [previewImageFromGrid, setPreviewImageFromGrid] = useState<ProcessedImage | null>(null);
  const [previewIndexFromGrid, setPreviewIndexFromGrid] = useState<number>(0);

  // Review stage state
  const [isConfirming, setIsConfirming] = useState(false);

  // Generate stage state
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [generationJobIds, setGenerationJobIds] = useState<string[]>([]);
  const pollingCleanupRef = useRef<(() => void) | null>(null);

  // Internal modal state
  const [internalIsOpen, setInternalIsOpen] = useState(isOpen);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Sync external isOpen prop with internal state
  useEffect(() => {
    setInternalIsOpen(isOpen);
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Stop polling if active
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
        pollingCleanupRef.current = null;
      }

      // Only reset if we're actually closing (not just switching stages)
      const timeout = setTimeout(() => {
        setCurrentStage("upload");
        setProjectName("");
        setImages([]);
        setCategorizedGroups([]);
        setSelectedMedia([]);
        setCurrentProject(null);
        setGenerationProgress(null);
        setGenerationJobIds([]);
      }, 300); // Wait for modal close animation
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
      }
    };
  }, []);

  // Get completed stages based on current stage
  const completedStages = getCompletedStages(currentStage);

  // Check if there's work in progress
  const hasWorkInProgress = images.length > 0 || selectedMedia.length > 0 || currentStage !== "upload";

  // Handle modal close with confirmation
  const handleClose = () => {
    if (hasWorkInProgress && currentStage !== "generate") {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  // ============================================================================
  // Project Name Auto-Save
  // ============================================================================

  // Debounced project name save
  useEffect(() => {
    if (!currentProject || !projectName.trim()) return;

    setIsSavingName(true);
    const timeoutId = setTimeout(async () => {
      try {
        await updateProject(currentProject.id, { title: projectName.trim() });
        console.log("Project name saved:", projectName);
      } catch (error) {
        console.error("Failed to save project name:", error);
        toast.error("Failed to save project name", {
          description: "Your changes may not be saved. Please try again."
        });
      } finally {
        setIsSavingName(false);
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [projectName, currentProject]);

  // ============================================================================
  // Navigation Helpers
  // ============================================================================

  /**
   * Navigate to a stage with validation
   */
  const navigateToStage = (targetStage: WorkflowStage): boolean => {
    const workflowState: WorkflowState = {
      currentStage,
      projectName,
      currentProject,
      images,
      categorizedGroups,
      selectedMedia,
      isProcessing: isCategorizing || isUploading || isConfirming,
      generationProgress
    };

    const validation = canProceedToStage(currentStage, targetStage, workflowState);

    if (!validation.valid) {
      // Show first error as toast
      if (validation.errors.length > 0) {
        toast.error("Cannot proceed", {
          description: validation.errors[0]
        });
      }
      return false;
    }

    setCurrentStage(targetStage);
    return true;
  };

  // ============================================================================
  // Project and Upload Handlers (from UploadProjectModal)
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

  const handleFilesSelected = async (files: File[]) => {
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to upload images and create projects."
      });
      return;
    }

    setIsLoadingPreviews(true);
    try {
      const imageDataArray = await imageProcessorService.createImageDataArray(files);

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

  const handleImageClick = (imageId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (image) {
      setPreviewImage(image);
      setInternalIsOpen(false);
    }
  };

  const handlePreviewClose = () => {
    setPreviewImage(null);
    setInternalIsOpen(true);
  };

  // ============================================================================
  // Stage Navigation Handlers
  // ============================================================================

  const handleContinueFromUpload = async () => {
    if (!user || !currentProject) {
      toast.error("No project found", {
        description: "Please try uploading images again."
      });
      return;
    }

    const allReady = images.every(
      (img) =>
        img.status === "uploaded" ||
        img.status === "analyzed" ||
        img.status === "error"
    );
    if (!allReady) {
      toast.warning("Images still uploading", {
        description: "Please wait for all images to finish uploading."
      });
      return;
    }

    setIsCategorizing(true);
    setCurrentStage("categorize");
    setProcessingProgress(null);

    try {
      await updateProject(currentProject.id, { status: "analyzing" });

      const alreadyAnalyzed = images.filter(
        (img) =>
          img.classification &&
          (img.status === "uploaded" || img.status === "analyzed")
      );
      const needsAnalysis = images.filter(
        (img) => !img.classification && img.status === "uploaded" && !img.error
      );

      let finalImages: ProcessedImage[];

      if (needsAnalysis.length > 0) {
        const result = await imageProcessorService.processImages(
          needsAnalysis,
          currentProject.id,
          {
            onProgress: (progress) => {
              setProcessingProgress(progress);

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

        finalImages = [...alreadyAnalyzed, ...result.images];
      } else {
        finalImages = alreadyAnalyzed;
      }

      setImages(finalImages);

      const organized = categorizeAndOrganizeImages(finalImages);
      setCategorizedGroups(organized.groups);

      // Move to plan stage instead of staying on categorize
      setCurrentStage("plan");
    } catch (error) {
      console.error("Error processing images:", error);
      toast.error("Failed to process images", {
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during image processing. Please try again."
      });
      setCurrentStage("upload");
    } finally {
      setIsCategorizing(false);
      setProcessingProgress(null);
    }
  };

  const handleBackToCategorize = () => {
    setCurrentStage("categorize");
  };

  const handleBackToPlan = () => {
    setCurrentStage("review");
  };

  // ============================================================================
  // Media Selection Handlers
  // ============================================================================

  const handleMediaSelect = (selection: MediaSelection) => {
    setSelectedMedia((prev) => [...prev, selection]);
  };

  const handleMediaDeselect = (mediaType: string, templateId: string) => {
    setSelectedMedia((prev) =>
      prev.filter(
        (s) => !(s.mediaType === mediaType && s.templateId === templateId)
      )
    );
  };

  const handleContinueFromPlan = () => {
    if (selectedMedia.length === 0) {
      toast.error("No media selected", {
        description: "Please select at least one template to generate."
      });
      return;
    }
    setCurrentStage("review");
  };

  const handleConfirmAndGenerate = async () => {
    if (!currentProject) {
      toast.error("No project found", {
        description: "Please try again."
      });
      return;
    }

    setIsConfirming(true);

    try {
      // Start generation
      const result = await startGeneration({
        projectId: currentProject.id,
        selections: selectedMedia
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to start generation");
      }

      // Initialize generation progress
      const steps: GenerationStep[] = selectedMedia.map((media, index) => ({
        id: result.jobIds[index] || `job-${index}`,
        label: `Generating ${media.template.title}`,
        status: "waiting" as const
      }));

      setGenerationProgress({
        currentStep: steps[0]?.label || "Starting...",
        totalSteps: steps.length,
        currentStepIndex: 0,
        estimatedTimeRemaining: result.estimatedCompletionTime,
        overallProgress: 0,
        steps
      });

      setGenerationJobIds(result.jobIds);
      setCurrentStage("generate");

      // Start polling for progress
      const cleanup = createProgressPoller(
        result.jobIds,
        (progress) => {
          setGenerationProgress(progress);
        },
        () => {
          // Generation complete
          toast.success("Generation complete!", {
            description: "Your content has been successfully generated."
          });

          if (onProjectCreated && currentProject) {
            onProjectCreated(currentProject);
          }

          // Cleanup polling
          if (pollingCleanupRef.current) {
            pollingCleanupRef.current();
            pollingCleanupRef.current = null;
          }
        },
        (error) => {
          // Generation error
          toast.error("Generation failed", {
            description: error.message
          });

          // Cleanup polling
          if (pollingCleanupRef.current) {
            pollingCleanupRef.current();
            pollingCleanupRef.current = null;
          }
        }
      );

      pollingCleanupRef.current = cleanup;
    } catch (error) {
      console.error("Generation failed:", error);
      toast.error("Generation failed", {
        description:
          error instanceof Error ? error.message : "Please try again."
      });
      setCurrentStage("review");
    } finally {
      setIsConfirming(false);
    }
  };

  // Determine modal size based on current stage
  const getModalClassName = () => {
    if (currentStage === "generate") {
      return "max-w-3xl h-[90vh]";
    }
    return cn(
      "max-w-7xl h-[95vh]",
      "sm:max-w-7xl sm:h-[95vh]",
      "max-sm:w-screen max-sm:h-screen max-sm:rounded-none"
    );
  };

  // Available categories for plan stage
  const availableCategories = images
    .filter((img) => img.classification?.category)
    .map((img) => img.classification!.category)
    .filter((category, index, self) => self.indexOf(category) === index);

  // Check if we can continue from upload
  const canContinueFromUpload =
    images.length > 0 &&
    images.some(
      (img) => img.status === "uploaded" || img.status === "analyzed"
    );
  const allUploadedOrError =
    images.length > 0 &&
    images.every(
      (img) =>
        img.status === "uploaded" ||
        img.status === "analyzed" ||
        img.status === "error"
    );

  return (
    <>
      <Dialog open={internalIsOpen} onOpenChange={handleClose}>
        <DialogContent className={cn(getModalClassName(), "flex flex-col p-0 gap-0 overflow-hidden")}>
          {/* Modal Header - Fixed */}
          <DialogHeader className="flex-shrink-0 border-b">
            <ProjectNameInput
              value={projectName}
              onChange={setProjectName}
              placeholder="Untitled Project"
              isSaving={isSavingName}
            />
            <WorkflowTimeline
              currentStage={currentStage}
              completedStages={completedStages}
            />
          </DialogHeader>

          {/* Stage Content - Scrollable */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full">
              {/* Upload Stage */}
              {currentStage === "upload" && (
                <div className="h-full flex flex-col overflow-auto">
                  <div className="p-6 space-y-4">
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
                  </div>

                  {/* Continue Button - Sticky at bottom */}
                  {canContinueFromUpload && (
                    <>
                      <div className="sticky pointer-events-none bottom-12 z-20 left-0 right-0 h-12 bg-gradient-to-t from-white via-white to-transparent" />
                      <div className="sticky bottom-0 left-0 right-0 z-20 pt-0 pb-4 px-6 bg-white border-t">
                        <Button
                          onClick={handleContinueFromUpload}
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
                </div>
              )}

              {/* Categorize Stage */}
              {currentStage === "categorize" && (
                <div className="h-full flex flex-col items-center justify-center p-6">
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

              {/* Plan Stage */}
              {currentStage === "plan" && (
                <PlanStage
                  onMediaSelect={handleMediaSelect}
                  onMediaDeselect={handleMediaDeselect}
                  selectedMedia={selectedMedia}
                  availableCategories={availableCategories}
                  onContinue={handleContinueFromPlan}
                  onBack={handleBackToCategorize}
                />
              )}

              {/* Review Stage */}
              {currentStage === "review" && (
                <ReviewStage
                  images={images}
                  categorizedGroups={categorizedGroups}
                  selectedMedia={selectedMedia}
                  onConfirm={handleConfirmAndGenerate}
                  onBack={() => setCurrentStage("plan")}
                  isConfirming={isConfirming}
                />
              )}

              {/* Generate Stage */}
              {currentStage === "generate" && generationProgress && (
                <GenerateStage
                  progress={generationProgress}
                  selectedMedia={selectedMedia}
                  onCancel={() => {
                    setCurrentStage("review");
                    setGenerationProgress(null);
                  }}
                />
              )}
            </div>
          </div>
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

        {/* Image Preview Modal - Categorized Grid */}
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
                        g.images.some((img) => img.id === previewImageFromGrid.id)
                      )?.displayLabel || "Unknown",
                    color:
                      categorizedGroups.find((g) =>
                        g.images.some((img) => img.id === previewImageFromGrid.id)
                      )?.metadata.color || "#6b7280"
                  }
                : undefined
            }
            showMetadata={true}
          />
        )}
      </Dialog>

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Project Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved work in progress. Are you sure you want to close?
              Your progress will be saved, but you'll need to start the workflow again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Working</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              Yes, Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
