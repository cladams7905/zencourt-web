"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Template } from "@/types/schema";
import type { Platform } from "@/types/templates";
import {
  ArrowLeft,
  Check,
  X,
  Users,
  Lock,
  Play,
  Pause,
  Video
} from "lucide-react";
import { PremiumUpgradePrompt } from "../template-marketplace/PremiumUpgradePrompt";
import { RequiredCategoriesValidator } from "../template-marketplace/RequiredCategoriesValidator";

/**
 * Template Detail Modal Props
 */
export interface TemplateDetailModalProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (templateId: string, platform: Platform) => void;
  availableCategories: string[];
  isLocked?: boolean;
  isLoading?: boolean;
}

/**
 * Platform specifications with dimensions
 */
const PLATFORM_SPECS: Record<
  string,
  { width: number; height: number; aspectRatio: string }
> = {
  "instagram-post": { width: 1080, height: 1080, aspectRatio: "1:1" },
  "instagram-reel": { width: 1080, height: 1920, aspectRatio: "9:16" },
  "instagram-story": { width: 1080, height: 1920, aspectRatio: "9:16" },
  tiktok: { width: 1080, height: 1920, aspectRatio: "9:16" },
  "facebook-post": { width: 1200, height: 630, aspectRatio: "1.91:1" },
  "facebook-story": { width: 1080, height: 1920, aspectRatio: "9:16" },
  "youtube-short": { width: 1080, height: 1920, aspectRatio: "9:16" },
  youtube: { width: 1920, height: 1080, aspectRatio: "16:9" },
  linkedin: { width: 1200, height: 627, aspectRatio: "1.91:1" },
  print: { width: 2550, height: 3300, aspectRatio: "8.5x11" }
};

/**
 * Template Detail Modal Component
 *
 * Shows detailed information about a template with preview and action buttons
 */
export function TemplateDetailModal({
  template,
  isOpen,
  onClose,
  onUseTemplate,
  availableCategories,
  isLocked = false,
  isLoading = false
}: TemplateDetailModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    null
  );
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  if (!template) return null;

  const {
    id,
    title,
    description,
    previewImageUrl,
    previewVideoUrl,
    platforms,
    contentType,
    isPremium,
    requiredCategories,
    usageCount30Days,
    exampleOutputUrls,
    tags
  } = template;

  // Set default platform
  const defaultPlatform = (platforms as string[])[0] as Platform;
  const activePlatform = selectedPlatform || defaultPlatform;

  // Check if categories are valid
  const missingCategories = (requiredCategories || []).filter(
    (cat) => !availableCategories.includes(cat)
  );
  const canUseTemplate = missingCategories.length === 0 && !isLocked;

  const handleUseTemplate = () => {
    if (canUseTemplate) {
      onUseTemplate(id, activePlatform);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-6">
            {/* Header */}
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <DialogTitle className="text-2xl mb-2">{title}</DialogTitle>
                  <DialogDescription className="text-base">
                    {description}
                  </DialogDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
            </DialogHeader>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: Preview */}
              <div className="space-y-4">
                {/* Preview Image/Video */}
                <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-gray-100">
                  {previewVideoUrl && isVideoPlaying ? (
                    <video
                      src={previewVideoUrl}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                    />
                  ) : (
                    <Image
                      src={previewImageUrl}
                      alt={title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  )}

                  {/* Video Play/Pause Button */}
                  {previewVideoUrl && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-4 right-4 gap-2"
                      onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                    >
                      {isVideoPlaying ? (
                        <>
                          <Pause className="h-4 w-4" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Preview
                        </>
                      )}
                    </Button>
                  )}

                  {/* Premium Overlay */}
                  {isLocked && (
                    <div className="absolute inset-0">
                      <PremiumUpgradePrompt onClose={onClose} />
                    </div>
                  )}
                </div>

                {/* Example Outputs */}
                {exampleOutputUrls && exampleOutputUrls.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Example Outputs</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {exampleOutputUrls.map((url, index) => (
                        <div
                          key={index}
                          className="relative aspect-video rounded-md overflow-hidden bg-gray-100"
                        >
                          <Image
                            src={url}
                            alt={`Example ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="200px"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Details */}
              <div className="space-y-6">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
                  </Badge>
                  {isPremium && (
                    <Badge className="bg-yellow-100 text-yellow-900 border-yellow-300">
                      <Lock className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                  {tags &&
                    (tags as string[]).slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                </div>

                {/* Usage Stats */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{usageCount30Days} uses this month</span>
                </div>

                {/* Platform Selection */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Select Platform</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(platforms as string[]).map((platform) => {
                      const spec = PLATFORM_SPECS[platform];
                      const isSelected = activePlatform === platform;
                      return (
                        <button
                          key={platform}
                          onClick={() =>
                            setSelectedPlatform(platform as Platform)
                          }
                          className={`p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? "border-black bg-gray-50 ring-2 ring-black"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="text-sm font-medium capitalize">
                            {platform.replace("-", " ")}
                          </div>
                          {spec && (
                            <div className="text-xs text-gray-500 mt-1">
                              {spec.width}×{spec.height} ({spec.aspectRatio})
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Required Categories */}
                {requiredCategories && requiredCategories.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">
                      Required Image Categories
                    </h4>
                    <RequiredCategoriesValidator
                      requiredCategories={requiredCategories as string[]}
                      availableCategories={availableCategories}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-4">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleUseTemplate}
                    disabled={!canUseTemplate || isLoading}
                  >
                    {isLoading ? (
                      "Generating..."
                    ) : isLocked ? (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Upgrade to Use
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4 mr-2" />
                        Use This Template
                      </>
                    )}
                  </Button>

                  {missingCategories.length > 0 && !isLocked && (
                    <p className="text-xs text-red-600 text-center">
                      Please add the missing categories to your project first
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
