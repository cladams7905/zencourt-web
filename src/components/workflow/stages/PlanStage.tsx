"use client";

import { useState } from "react";
import { MediaTypeCard } from "../MediaTypeCard";
import { TemplateGrid } from "../TemplateGrid";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTemplates } from "@/hooks/useTemplates";
import { useSubscription } from "@/hooks/useSubscription";
import { MEDIA_TYPES, type MediaSelection, type MediaType } from "@/types/workflow";
import type { Template, Platform } from "@/types/templates";

interface PlanStageProps {
  onMediaSelect: (selection: MediaSelection) => void;
  onMediaDeselect: (mediaType: MediaType, templateId: string) => void;
  selectedMedia: MediaSelection[];
  availableCategories: string[];
  onContinue: () => void;
  onBack: () => void;
}

export function PlanStage({
  onMediaSelect,
  onMediaDeselect,
  selectedMedia,
  availableCategories,
  onContinue,
  onBack
}: PlanStageProps) {
  // Track which media type sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<MediaType>>(
    new Set(["vertical-video"]) // First section expanded by default
  );

  // Fetch subscription status
  const { data: subscription } = useSubscription();

  // Check if template is locked (premium without subscription)
  const isTemplateLocked = (template: Template): boolean => {
    if (!template.isPremium) return false;
    return !subscription?.features.premiumTemplates;
  };

  // Check if a template is selected
  const isTemplateSelected = (templateId: string): boolean => {
    return selectedMedia.some((s) => s.templateId === templateId);
  };

  // Get selected template IDs for a media type
  const getSelectedTemplateIds = (mediaType: MediaType): string[] => {
    return selectedMedia
      .filter((s) => s.mediaType === mediaType)
      .map((s) => s.templateId);
  };

  // Toggle section expansion
  const toggleSection = (mediaType: MediaType) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mediaType)) {
        newSet.delete(mediaType);
      } else {
        newSet.add(mediaType);
      }
      return newSet;
    });
  };

  // Can continue if at least one media is selected
  const canContinue = selectedMedia.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">Select Media to Generate</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the types of content you want to create from your images
        </p>
        {selectedMedia.length > 0 && (
          <p className="text-sm text-primary font-medium mt-2">
            {selectedMedia.length} {selectedMedia.length === 1 ? "item" : "items"}{" "}
            selected
          </p>
        )}
      </div>

      {/* Media Type Sections */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-6 space-y-4">
          {MEDIA_TYPES.map((mediaTypeConfig) => {
            const selectedForType = getSelectedTemplateIds(mediaTypeConfig.type);
            const isExpanded = expandedSections.has(mediaTypeConfig.type);

            return (
              <MediaTypeSection
                key={mediaTypeConfig.type}
                config={mediaTypeConfig}
                isExpanded={isExpanded}
                onToggle={() => toggleSection(mediaTypeConfig.type)}
                selectedTemplateIds={selectedForType}
                onMediaSelect={onMediaSelect}
                onMediaDeselect={onMediaDeselect}
                availableCategories={availableCategories}
                isTemplateLocked={isTemplateLocked}
              />
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer with navigation buttons */}
      <div className="px-6 py-4 border-t bg-white flex gap-3">
        <Button onClick={onBack} variant="outline" className="flex-1">
          Back to Categorize
        </Button>
        <Button
          onClick={onContinue}
          disabled={!canContinue}
          className="flex-1"
        >
          {canContinue
            ? `Continue with ${selectedMedia.length} ${
                selectedMedia.length === 1 ? "item" : "items"
              }`
            : "Select at least one template"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Individual media type section with template grid
 */
interface MediaTypeSectionProps {
  config: ReturnType<typeof MEDIA_TYPES[number]>;
  isExpanded: boolean;
  onToggle: () => void;
  selectedTemplateIds: string[];
  onMediaSelect: (selection: MediaSelection) => void;
  onMediaDeselect: (mediaType: MediaType, templateId: string) => void;
  availableCategories: string[];
  isTemplateLocked: (template: Template) => boolean;
}

function MediaTypeSection({
  config,
  isExpanded,
  onToggle,
  selectedTemplateIds,
  onMediaSelect,
  onMediaDeselect,
  availableCategories,
  isTemplateLocked
}: MediaTypeSectionProps) {
  // Fetch templates for this media type
  const {
    data: templatesData,
    isLoading,
    error
  } = useTemplates({
    contentType: config.templateContentType,
    limit: 20
  });

  const templates = templatesData?.templates || [];

  // Filter templates based on available categories
  const filteredTemplates = templates.filter((template) => {
    // If template has no required categories, it's available
    if (!template.requiredCategories || template.requiredCategories.length === 0) {
      return true;
    }
    // Check if all required categories are available
    return template.requiredCategories.every((cat) =>
      availableCategories.includes(cat)
    );
  });

  const handleTemplateSelect = (template: Template, platform: Platform) => {
    const selection: MediaSelection = {
      id: `${config.type}-${template.id}-${platform}`,
      mediaType: config.type,
      templateId: template.id,
      template,
      platform,
      estimatedGenerationTime: estimateGenerationTime(config.templateContentType)
    };
    onMediaSelect(selection);
  };

  const handleTemplateDeselect = (templateId: string) => {
    onMediaDeselect(config.type, templateId);
  };

  const isSelected = selectedTemplateIds.length > 0;

  return (
    <MediaTypeCard
      config={config}
      isSelected={isSelected}
      templateCount={filteredTemplates.length}
      defaultExpanded={isExpanded}
    >
      {error ? (
        <div className="text-center py-8 space-y-4">
          <div>
            <p className="text-sm text-destructive font-medium">Failed to load templates</p>
            <p className="text-xs text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "An error occurred while fetching templates"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Force refetch by toggling the section
              onToggle();
              setTimeout(() => onToggle(), 100);
            }}
          >
            Retry
          </Button>
        </div>
      ) : filteredTemplates.length === 0 && !isLoading ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No templates available for your current categories
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adding more image categories or choose a different media type
          </p>
        </div>
      ) : (
        <TemplateGrid
          templates={filteredTemplates}
          selectedTemplateIds={selectedTemplateIds}
          onTemplateSelect={handleTemplateSelect}
          onTemplateDeselect={handleTemplateDeselect}
          isTemplateLocked={isTemplateLocked}
          isLoading={isLoading}
          availablePlatforms={config.availablePlatforms}
        />
      )}
    </MediaTypeCard>
  );
}

/**
 * Estimate generation time based on content type
 */
function estimateGenerationTime(contentType: string): number {
  const estimates: Record<string, number> = {
    video: 120, // 2 minutes
    post: 30, // 30 seconds
    flyer: 45 // 45 seconds
  };
  return estimates[contentType] || 60;
}
