"use client";

import { cn } from "@/components/ui/utils";
import { Lock, Check, Loader2 } from "lucide-react";
import type { Template, Platform } from "@/types/templates";
import Image from "next/image";

interface TemplateGridProps {
  templates: Template[];
  selectedTemplateIds: string[];
  onTemplateSelect: (template: Template, platform: Platform) => void;
  onTemplateDeselect: (templateId: string) => void;
  isTemplateLocked: (template: Template) => boolean;
  isLoading?: boolean;
  availablePlatforms?: Platform[];
}

export function TemplateGrid({
  templates,
  selectedTemplateIds,
  onTemplateSelect,
  onTemplateDeselect,
  isTemplateLocked,
  isLoading = false,
  availablePlatforms
}: TemplateGridProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (templates.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No templates available</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your filters or categories
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {templates.map((template) => {
        const isLocked = isTemplateLocked(template);
        const isSelected = selectedTemplateIds.includes(template.id);

        // Filter platforms if availablePlatforms is provided
        const displayPlatforms = availablePlatforms
          ? template.platforms.filter((p) => availablePlatforms.includes(p))
          : template.platforms;

        const handleClick = () => {
          if (isLocked) return;

          if (isSelected) {
            onTemplateDeselect(template.id);
          } else {
            // For templates with multiple platforms, use the first one by default
            // In a full implementation, you'd show a platform selector
            const platform = displayPlatforms[0];
            if (platform) {
              onTemplateSelect(template, platform);
            }
          }
        };

        return (
          <div
            key={template.id}
            className={cn(
              "relative group rounded-lg border overflow-hidden transition-all cursor-pointer",
              isSelected &&
                "border-primary ring-2 ring-primary/20 shadow-md",
              !isSelected && "border-border hover:border-primary/50 hover:shadow-sm",
              isLocked && "opacity-60 cursor-not-allowed"
            )}
            onClick={handleClick}
          >
            {/* Preview Image */}
            <div className="relative aspect-video bg-muted">
              <Image
                src={template.previewImageUrl}
                alt={template.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />

              {/* Locked overlay */}
              {isLocked && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Lock className="w-6 h-6" />
                    <span className="text-xs font-medium">Premium</span>
                  </div>
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && !isLocked && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
              )}

              {/* Premium badge */}
              {template.isPremium && !isLocked && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-md">
                  Premium
                </div>
              )}
            </div>

            {/* Template info */}
            <div className="p-3">
              <h4 className="font-semibold text-sm line-clamp-1">
                {template.title}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {template.description}
              </p>

              {/* Platforms */}
              {displayPlatforms.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {displayPlatforms.slice(0, 3).map((platform) => (
                    <span
                      key={platform}
                      className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md"
                    >
                      {formatPlatform(platform)}
                    </span>
                  ))}
                  {displayPlatforms.length > 3 && (
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md">
                      +{displayPlatforms.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Usage count */}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>{template.usageCount.toLocaleString()} uses</span>
              </div>
            </div>

            {/* Hover overlay */}
            {!isLocked && !isSelected && (
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Format platform name for display
 */
function formatPlatform(platform: Platform): string {
  const platformLabels: Record<Platform, string> = {
    "instagram-post": "IG Post",
    "instagram-reel": "IG Reel",
    "instagram-story": "IG Story",
    tiktok: "TikTok",
    "facebook-post": "FB Post",
    "facebook-story": "FB Story",
    "youtube-short": "YT Short",
    youtube: "YouTube",
    linkedin: "LinkedIn",
    print: "Print"
  };
  return platformLabels[platform] || platform;
}
