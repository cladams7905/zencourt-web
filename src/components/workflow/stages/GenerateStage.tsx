"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VerticalTimeline } from "../VerticalTimeline";
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
import type { GenerationProgress, MediaSelection } from "@/types/workflow";
import { Clock, Loader2 } from "lucide-react";

interface GenerateStageProps {
  progress: GenerationProgress;
  selectedMedia: MediaSelection[];
  onCancel?: () => void;
  onRetry?: () => void;
}

export function GenerateStage({
  progress,
  selectedMedia,
  onCancel,
  onRetry
}: GenerateStageProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const isGenerating =
    progress.steps.some((s) => s.status === "in-progress") ||
    progress.steps.some((s) => s.status === "waiting");

  const isComplete = progress.steps.every((s) => s.status === "completed");

  const hasFailed = progress.steps.some((s) => s.status === "failed");

  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelDialog(false);
    onCancel?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">
          {isComplete
            ? "Generation Complete!"
            : hasFailed
            ? "Generation Failed"
            : "Generating Your Content"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isComplete
            ? "Your content has been successfully generated"
            : hasFailed
            ? "Some steps encountered errors"
            : `Creating ${selectedMedia.length} ${
                selectedMedia.length === 1 ? "item" : "items"
              } from your images`}
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-6">
          {/* Time Estimate */}
          {isGenerating && progress.estimatedTimeRemaining > 0 && (
            <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Clock className="w-5 h-5" />
                <div className="text-center">
                  <p className="text-sm font-medium">Estimated Time Remaining</p>
                  <p className="text-2xl font-bold">
                    {formatTimeRemaining(progress.estimatedTimeRemaining)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Overall Progress */}
          {isGenerating && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-semibold">
                  {Math.round(progress.overallProgress)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progress.overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Generation Steps Timeline */}
          <div className="max-w-2xl mx-auto">
            <VerticalTimeline steps={progress.steps} />
          </div>

          {/* Success Message */}
          {isComplete && (
            <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-500 text-white rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                All Content Generated!
              </h3>
              <p className="text-sm text-green-700">
                Your {selectedMedia.length}{" "}
                {selectedMedia.length === 1 ? "item has" : "items have"} been
                successfully created and are ready to download.
              </p>
            </div>
          )}

          {/* Error Message */}
          {hasFailed && !isGenerating && (
            <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-lg text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-500 text-white rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Generation Failed
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  Some items could not be generated. Please check the errors above
                  and try again.
                </p>
              </div>
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Retry Failed Items
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {isGenerating && onCancel && (
        <div className="px-6 py-4 border-t bg-white">
          <Button
            onClick={handleCancelClick}
            variant="outline"
            className="w-full"
          >
            Cancel Generation
          </Button>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Generation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the generation process? Any
              progress will be lost and you'll need to start over.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Generating</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Format time remaining in seconds to human-readable format
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds === 0
      ? `${minutes}m`
      : `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}
