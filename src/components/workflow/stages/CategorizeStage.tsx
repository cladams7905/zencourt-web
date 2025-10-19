"use client";

import React, { useCallback, useState } from "react";
import { useUser } from "@stackframe/stack";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CategorizedImageGrid } from "@/components/image-grid/CategorizedImageGrid";
import { imageProcessorService } from "@/services/imageProcessor";
import { categorizeAndOrganizeImages } from "@/services/categorization";
import { updateProject } from "@/db/actions/projects";
import type { ProcessedImage, ProcessingProgress } from "@/types/images";
import type { CategorizedGroup } from "@/types/roomCategory";
import type { Project } from "@/types/schema";

interface CategorizeStageProps {
  images: ProcessedImage[];
  setImages: React.Dispatch<React.SetStateAction<ProcessedImage[]>>;
  currentProject: Project | null;
  categorizedGroups: CategorizedGroup[];
  setCategorizedGroups: React.Dispatch<
    React.SetStateAction<CategorizedGroup[]>
  >;
  onImageClick: (
    image: ProcessedImage,
    categoryIndex: number,
    imageIndex: number
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function CategorizeStage({
  images,
  setImages,
  currentProject,
  categorizedGroups,
  setCategorizedGroups,
  onImageClick,
  onContinue,
  onBack
}: CategorizeStageProps) {
  const user = useUser();
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [processingProgress, setProcessingProgress] =
    useState<ProcessingProgress | null>(null);

  // Check if we need to process images on mount
  const alreadyAnalyzed = images.filter(
    (img) =>
      img.classification &&
      (img.status === "uploaded" || img.status === "analyzed")
  );
  const needsAnalysis = images.filter(
    (img) => !img.classification && img.status === "uploaded" && !img.error
  );

  // If images need analysis and we haven't started processing, start automatically
  const shouldProcess =
    needsAnalysis.length > 0 &&
    !isCategorizing &&
    categorizedGroups.length === 0;

  const handleProcessImages = useCallback(async () => {
    if (!user || !currentProject) {
      toast.error("No project found", {
        description: "Please try uploading images again."
      });
      return;
    }

    setIsCategorizing(true);

    try {
      await updateProject(currentProject.id, { status: "analyzing" });

      let finalImages: ProcessedImage[];

      if (needsAnalysis.length > 0) {
        // Set initial progress state immediately - start with analyzing since images are already uploaded
        setProcessingProgress({
          phase: "analyzing",
          completed: 0,
          total: needsAnalysis.length,
          overallProgress: 0
        });

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
    } catch (error) {
      console.error("Error processing images:", error);
      toast.error("Failed to process images", {
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during image processing. Please try again."
      });
    } finally {
      setIsCategorizing(false);
      setProcessingProgress(null);
    }
  }, [
    alreadyAnalyzed,
    currentProject,
    needsAnalysis,
    setCategorizedGroups,
    setImages,
    user
  ]);

  // Auto-start processing when component mounts if needed
  React.useEffect(() => {
    if (shouldProcess) {
      handleProcessImages();
    }
  }, [shouldProcess, handleProcessImages]);

  const handleRecategorize = (
    imageId: string,
    fromCategoryIndex: number,
    toCategoryIndex: number
  ) => {
    // Find the image in the source category
    const fromGroup = categorizedGroups[fromCategoryIndex];
    const toGroup = categorizedGroups[toCategoryIndex];

    if (!fromGroup || !toGroup) return;

    const imageIndex = fromGroup.images.findIndex((img) => img.id === imageId);
    if (imageIndex === -1) return;

    const movedImage = fromGroup.images[imageIndex];

    // Update the image's classification to match new category
    const updatedImage: ProcessedImage = {
      ...movedImage,
      classification: {
        ...movedImage.classification!,
        category: toGroup.category
      }
    };

    // Create new groups array with updated images
    const newGroups = [...categorizedGroups];

    // Remove from source category
    newGroups[fromCategoryIndex] = {
      ...fromGroup,
      images: fromGroup.images.filter((img) => img.id !== imageId)
    };

    // Add to destination category
    newGroups[toCategoryIndex] = {
      ...toGroup,
      images: [...toGroup.images, updatedImage],
      avgConfidence:
        [...toGroup.images, updatedImage].reduce(
          (sum, img) => sum + (img.classification?.confidence || 0),
          0
        ) /
        (toGroup.images.length + 1)
    };

    // Filter out empty groups
    const filteredGroups = newGroups.filter((group) => group.images.length > 0);

    // Update categorized groups
    setCategorizedGroups(filteredGroups);

    // Also update the images array to reflect the classification change
    setImages((prev) =>
      prev.map((img) => (img.id === imageId ? updatedImage : img))
    );

    toast.success("Image recategorized", {
      description: `Moved to ${toGroup.displayLabel}`
    });
  };

  // Show processing UI
  if (isCategorizing) {
    return (
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
    );
  }

  // Show categorized grid
  return (
    <div className="h-full flex flex-col overflow-auto">
      <div className="p-6 space-y-4 flex-1 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Review Categorized Images</h3>
            <p className="text-sm text-muted-foreground">
              {categorizedGroups.length} categories found with{" "}
              {images.filter((img) => img.classification).length} images
            </p>
          </div>
        </div>

        <CategorizedImageGrid
          groups={categorizedGroups}
          enablePreview={false}
          enableDragDrop={true}
          showConfidence={true}
          showPreviewMetadata={true}
          onImageClick={onImageClick}
          onRecategorize={handleRecategorize}
        />
      </div>

      {/* Fade overlay and sticky footer */}
      <>
        <div className="sticky pointer-events-none bottom-12 z-20 left-0 right-0 h-12 bg-gradient-to-t from-white via-white to-transparent" />
        <div className="sticky bottom-0 left-0 right-0 z-20 pt-0 pb-4 px-6 bg-white border-t flex gap-3">
          <Button onClick={onBack} variant="outline" className="flex-1">
            Back to Upload
          </Button>
          <Button onClick={onContinue} className="flex-1">
            Continue to Planning
          </Button>
        </div>
      </>
    </div>
  );
}
