"use client";

import { useState, useEffect } from "react";
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
import { UploadStage } from "@/components/workflow/stages/UploadStage";
import { CategorizeStage } from "@/components/workflow/stages/CategorizeStage";
import { PlanStage } from "@/components/workflow/stages/PlanStage";
import { ReviewStage } from "@/components/workflow/stages/ReviewStage";
import { GenerateStage } from "@/components/workflow/stages/GenerateStage";
import { ImagePreviewModal } from "@/components/modals/ImagePreviewModal";
import { Project } from "@/types/schema";
import type { ProcessedImage } from "@/types/images";
import type { CategorizedGroup } from "@/types/roomCategory";
import type {
  WorkflowStage,
  GenerationProgress,
  GenerationStep
} from "@/types/workflow";
import {
  startGeneration,
  createProgressPoller
} from "@/services/generationService";
import { useRef } from "react";
import { updateProject } from "@/db/actions/projects";

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
  // Workflow state
  const [currentStage, setCurrentStage] = useState<WorkflowStage>("upload");
  const [projectName, setProjectName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Project and image state
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [categorizedGroups, setCategorizedGroups] = useState<
    CategorizedGroup[]
  >([]);

  // Video settings state
  const [videoSettings, setVideoSettings] = useState<{
    orientation: "landscape" | "vertical";
    roomOrder: Array<{ id: string; name: string; imageCount: number }>;
    logoFile: File | null;
    logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    scriptText: string;
    enableSubtitles: boolean;
    subtitleFont: string;
    aiDirections: string;
  } | null>(null);

  // Upload stage state
  const [previewImage, setPreviewImage] = useState<ProcessedImage | null>(null);

  // Categorize stage state
  const [previewImageFromGrid, setPreviewImageFromGrid] =
    useState<ProcessedImage | null>(null);
  const [previewIndexFromGrid, setPreviewIndexFromGrid] = useState<number>(0);

  // Review stage state
  const [isConfirming, setIsConfirming] = useState(false);

  // Generate stage state
  const [generationProgress, setGenerationProgress] =
    useState<GenerationProgress | null>(null);
  const [_generationJobIds, setGenerationJobIds] = useState<string[]>([]);
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
        setVideoSettings(null);
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

  // Check if there's work in progress
  const hasWorkInProgress = images.length > 0 || currentStage !== "upload";

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
  // Upload Stage Handlers
  // ============================================================================

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

  const handleContinueFromUpload = () => {
    setCurrentStage("categorize");
  };

  const handleContinueFromCategorize = () => {
    setCurrentStage("plan");
  };

  const handleBackToCategorize = () => {
    setCurrentStage("categorize");
  };

  // ============================================================================
  // Plan Stage Handlers
  // ============================================================================

  const handleContinueFromPlan = (settings: {
    orientation: "landscape" | "vertical";
    roomOrder: Array<{ id: string; name: string; imageCount: number }>;
    logoFile: File | null;
    logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    scriptText: string;
    enableSubtitles: boolean;
    subtitleFont: string;
    aiDirections: string;
  }) => {
    setVideoSettings(settings);
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
      // Validate video settings
      if (!videoSettings) {
        throw new Error("Video settings are required");
      }

      // Start generation
      const result = await startGeneration({
        projectId: currentProject.id,
        videoSettings: videoSettings
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to start generation");
      }

      // Initialize generation progress with single video generation step
      const steps: GenerationStep[] = [
        {
          id: result.jobIds[0] || "job-0",
          label: `Generating ${videoSettings.orientation} video`,
          status: "waiting" as const
        }
      ];

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
      return "max-w-5xl h-[92vh]";
    }
    return cn(
      "max-w-4xl h-[92vh]",
      "sm:max-w-4xl sm:h-[92vh]",
      "max-sm:w-screen max-sm:h-screen max-sm:rounded-none"
    );
  };

  // Available categories for plan stage
  const availableCategories = images
    .filter((img) => img.classification?.category)
    .map((img) => img.classification!.category)
    .filter((category, index, self) => self.indexOf(category) === index);

  return (
    <>
      <Dialog open={internalIsOpen} onOpenChange={handleClose}>
        <DialogContent
          className={cn(
            getModalClassName(),
            "flex flex-col p-0 gap-0 overflow-hidden"
          )}
        >
          {/* Modal Header - Fixed */}
          <DialogHeader className="border-b">
            <ProjectNameInput
              value={projectName}
              onChange={setProjectName}
              placeholder="Untitled Project"
              isSaving={isSavingName}
            />
            {/* Header */}
            <div className="sticky top-0 bg-white z-30 px-6 py-4 border-t">
              {currentStage === "upload" && (
                <>
                  <h2 className="text-xl font-semibold">
                    Choose Images to Upload
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click to upload or drag and drop images of your property
                    listing to generate content from.
                  </p>
                </>
              )}
              {currentStage === "categorize" &&
                categorizedGroups.length > 0 && (
                  <>
                    <h2 className="text-xl font-semibold">
                      Review Categorized Images
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {categorizedGroups.length} categories found with{" "}
                      {images.filter((img) => img.classification).length} images
                    </p>
                  </>
                )}
              {currentStage === "plan" && (
                <>
                  <h2 className="text-xl font-semibold">
                    Configure Your Video
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customize your property walkthrough video settings
                  </p>
                </>
              )}
              {currentStage === "review" && (
                <>
                  <h2 className="text-xl font-semibold">Review Your Project</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Confirm your images and selected media before generating
                  </p>
                </>
              )}
            </div>
            <DialogTitle className="hidden">Project Workflow</DialogTitle>
          </DialogHeader>

          {/* Stage Content - Scrollable */}
          <div className="relative flex-1 overflow-auto">
            {/* Upload Stage */}
            {currentStage === "upload" && (
              <UploadStage
                images={images}
                setImages={setImages}
                currentProject={currentProject}
                setCurrentProject={setCurrentProject}
                onImageClick={handleImageClick}
                onContinue={handleContinueFromUpload}
              />
            )}

            {/* Categorize Stage */}
            {currentStage === "categorize" && (
              <CategorizeStage
                images={images}
                setImages={setImages}
                currentProject={currentProject}
                categorizedGroups={categorizedGroups}
                setCategorizedGroups={setCategorizedGroups}
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
                onContinue={handleContinueFromCategorize}
                onBack={() => setCurrentStage("upload")}
              />
            )}

            {/* Plan Stage */}
            {currentStage === "plan" && (
              <PlanStage
                categorizedGroups={categorizedGroups}
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
                videoSettings={videoSettings || undefined}
                onConfirm={handleConfirmAndGenerate}
                onBack={() => setCurrentStage("plan")}
                isConfirming={isConfirming}
              />
            )}

            {/* Generate Stage */}
            {currentStage === "generate" && generationProgress && (
              <GenerateStage
                progress={generationProgress}
                onCancel={() => {
                  setCurrentStage("review");
                  setGenerationProgress(null);
                }}
              />
            )}
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

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Project Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved work in progress. Are you sure you want to close?
              Your progress will be saved, but you&apos;ll need to start the
              workflow again.
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
