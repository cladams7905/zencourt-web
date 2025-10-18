"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/components/ui/utils";
import { Check, ChevronRight } from "lucide-react";
import Image from "next/image";
import type { ProcessedImage } from "@/types/images";
import type { CategorizedGroup } from "@/types/roomCategory";
import type { MediaSelection } from "@/types/workflow";
import { getMediaTypeLabel } from "@/types/workflow";

interface ReviewStageProps {
  images: ProcessedImage[];
  categorizedGroups: CategorizedGroup[];
  selectedMedia: MediaSelection[];
  onConfirm: () => void;
  onBack: () => void;
  isConfirming?: boolean;
}

export function ReviewStage({
  images,
  categorizedGroups,
  selectedMedia,
  onConfirm,
  onBack,
  isConfirming = false
}: ReviewStageProps) {
  const totalImages = images.filter(
    (img) => img.status === "uploaded" || img.status === "analyzed"
  ).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">Review Your Project</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Confirm your images and selected media before generating
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-6 space-y-8">
          {/* Input Images Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Input Images</h3>
                <p className="text-sm text-muted-foreground">
                  {totalImages} {totalImages === 1 ? "image" : "images"} organized
                  into {categorizedGroups.length}{" "}
                  {categorizedGroups.length === 1 ? "category" : "categories"}
                </p>
              </div>
            </div>

            {/* Categorized Groups */}
            <div className="space-y-4">
              {categorizedGroups.map((group, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 bg-muted/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: group.metadata.color }}
                    />
                    <h4 className="font-semibold text-sm">
                      {group.displayLabel}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      ({group.images.length}{" "}
                      {group.images.length === 1 ? "image" : "images"})
                    </span>
                  </div>

                  {/* Image Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {group.images.slice(0, 12).map((image) => (
                      <div
                        key={image.id}
                        className="relative aspect-square rounded-md overflow-hidden bg-muted border"
                      >
                        <Image
                          src={image.previewUrl}
                          alt={image.file.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 25vw, (max-width: 768px) 16vw, 12vw"
                        />
                      </div>
                    ))}
                    {group.images.length > 12 && (
                      <div className="aspect-square rounded-md border bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground font-medium">
                          +{group.images.length - 12}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Media to Generate Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Media to Generate</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedMedia.length}{" "}
                  {selectedMedia.length === 1 ? "item" : "items"} selected for
                  generation
                </p>
              </div>
            </div>

            {/* Selected Media List */}
            <div className="space-y-3">
              {selectedMedia.map((selection) => (
                <div
                  key={selection.id}
                  className="flex items-start gap-4 p-4 border rounded-lg bg-white hover:bg-muted/20 transition-colors"
                >
                  {/* Preview Image */}
                  <div className="relative w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0 border">
                    <Image
                      src={selection.template.previewImageUrl}
                      alt={selection.template.title}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm line-clamp-1">
                          {selection.template.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getMediaTypeLabel(selection.mediaType)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-primary">
                        <Check className="w-4 h-4" />
                        <span className="text-xs font-medium">Selected</span>
                      </div>
                    </div>

                    {/* Platform */}
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md">
                        {formatPlatform(selection.platform)}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {selection.template.description}
                    </p>

                    {/* Estimated time */}
                    <p className="text-xs text-muted-foreground mt-2">
                      Est. generation time: ~
                      {formatDuration(selection.estimatedGenerationTime)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total estimated time */}
            {selectedMedia.length > 0 && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Total Estimated Time:
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    ~
                    {formatDuration(
                      selectedMedia.reduce(
                        (sum, s) => sum + s.estimatedGenerationTime,
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      </ScrollArea>

      {/* Footer with navigation buttons */}
      <div className="px-6 py-4 border-t bg-white flex gap-3">
        <Button onClick={onBack} variant="outline" className="flex-1">
          Back to Plan
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isConfirming || selectedMedia.length === 0}
          className="flex-1"
        >
          {isConfirming ? (
            <>Confirming...</>
          ) : (
            <>
              Confirm & Generate
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Format platform name for display
 */
function formatPlatform(platform: string): string {
  const platformLabels: Record<string, string> = {
    "instagram-post": "Instagram Post",
    "instagram-reel": "Instagram Reel",
    "instagram-story": "Instagram Story",
    tiktok: "TikTok",
    "facebook-post": "Facebook Post",
    "facebook-story": "Facebook Story",
    "youtube-short": "YouTube Shorts",
    youtube: "YouTube",
    linkedin: "LinkedIn",
    print: "Print"
  };
  return platformLabels[platform] || platform;
}

/**
 * Format duration in seconds to human-readable format
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}
