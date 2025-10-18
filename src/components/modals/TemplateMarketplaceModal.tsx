"use client";

import { useState, useMemo, useTransition } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchBar } from "@/components/template-marketplace/SearchBar";
import { FilterControls } from "@/components/template-marketplace/FilterControls";
import { TemplateMasonryGrid } from "@/components/template-marketplace/TemplateMasonryGrid";
import { TemplateDetailModal } from "@/components/modals/TemplateDetailModal";
import { useTemplates } from "@/hooks/useTemplates";
import { useSubscription } from "@/hooks/useSubscription";
import { useUseTemplate } from "@/hooks/useTemplates";
import type {
  Template,
  TemplateFilters,
  SortOption,
  Platform
} from "@/types/templates";

/**
 * Template Marketplace Modal Props
 */
export interface TemplateMarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  availableCategories: string[];
  onTemplateSelected?: (generatedContentId: string) => void;
}

/**
 * Template Marketplace Modal Component
 *
 * Full-screen modal for browsing, filtering, and selecting content templates
 */
export function TemplateMarketplaceModal({
  isOpen,
  onClose,
  projectId,
  availableCategories,
  onTemplateSelected
}: TemplateMarketplaceModalProps) {
  // ============================================================================
  // State Management (Task 19)
  // ============================================================================

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<TemplateFilters>({
    contentType: null,
    platform: null,
    style: null,
    subscriptionStatus: "all"
  });
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    null
  );

  // Fetch templates with React Query
  const {
    data: templatesData,
    isLoading: isLoadingTemplates,
    error: templatesError,
    refetch: refetchTemplates
  } = useTemplates({
    search: searchQuery || undefined,
    contentType: filters.contentType || undefined,
    platform: filters.platform || undefined,
    style: filters.style || undefined,
    subscriptionStatus: filters.subscriptionStatus,
    sortBy,
    limit: 50
  });

  // Fetch subscription status
  const { data: subscription, isLoading: isLoadingSubscription } =
    useSubscription();

  // Template usage mutation
  const useTemplateMutation = useUseTemplate();

  // Transition state for optimistic UI updates
  const [isPending, startTransition] = useTransition();

  // Extract templates and total count
  const templates = templatesData?.templates || [];
  const totalCount = templatesData?.total || 0;

  // ============================================================================
  // Filtering and Search Logic (Task 20)
  // ============================================================================

  // Filter templates based on subscription status
  const filteredTemplates = useMemo(() => {
    let result = [...templates];

    // Additional client-side filtering if needed
    // (Most filtering is done server-side via useTemplates query)

    return result;
  }, [templates]);

  // Calculate results count
  const resultsCount = filteredTemplates.length;

  // Handler for search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  // Handler for filter changes
  const handleFilterChange = (newFilters: Partial<TemplateFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // Handler for sort changes
  const handleSortChange = (newSortBy: SortOption) => {
    setSortBy(newSortBy);
  };

  // Handler to clear all filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setFilters({
      contentType: null,
      platform: null,
      style: null,
      subscriptionStatus: "all"
    });
    setSortBy("popular");
  };

  // ============================================================================
  // Template Selection and Validation (Task 21)
  // ============================================================================

  // Check if template is locked (premium without subscription)
  const isTemplateLocked = (template: Template): boolean => {
    if (!template.isPremium) return false;
    return !subscription?.features.premiumTemplates;
  };

  // Handler for template card click
  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    setSelectedPlatform(null); // Reset platform selection
  };

  // Handler for "Use Template" button
  const handleUseTemplate = async (template: Template, platform: Platform) => {
    // Check if template is locked
    if (isTemplateLocked(template)) {
      toast.error("Premium subscription required", {
        description: "This template requires a premium subscription."
      });
      return;
    }

    // Check for missing categories
    const missingCategories = (template.requiredCategories || []).filter(
      (cat) => !availableCategories.includes(cat)
    );

    if (missingCategories.length > 0) {
      toast.error("Missing required categories", {
        description: `Please add the following categories to your project: ${missingCategories.join(
          ", "
        )}`
      });
      return;
    }

    // Initiate template usage
    startTransition(() => {
      useTemplateMutation.mutate(
        {
          templateId: template.id,
          projectId,
          platform
        },
        {
          onSuccess: (data) => {
            toast.success("Template applied!", {
              description: "Your content is being generated."
            });

            // Close modals
            setSelectedTemplate(null);
            onClose();

            // Notify parent
            if (onTemplateSelected && data.id) {
              onTemplateSelected(data.id);
            }
          },
          onError: (error: any) => {
            // Handle specific error codes
            if (error.message?.includes("MISSING_CATEGORIES")) {
              toast.error("Missing required categories", {
                description:
                  "Please re-categorize your images or choose a different template."
              });
            } else if (error.message?.includes("SUBSCRIPTION_REQUIRED")) {
              toast.error("Premium subscription required", {
                description: "Upgrade to access this template."
              });
            } else {
              toast.error("Failed to apply template", {
                description: error.message || "Please try again."
              });
            }
          }
        }
      );
    });
  };

  // Handler for closing detail modal
  const handleCloseDetailModal = () => {
    setSelectedTemplate(null);
    setSelectedPlatform(null);
  };

  // ============================================================================
  // Render and Layout (Task 22)
  // ============================================================================

  // Loading state
  const isLoading = isLoadingTemplates || isLoadingSubscription;

  // Error state
  const hasError = !!templatesError;

  // Empty state
  const isEmpty = !isLoading && filteredTemplates.length === 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="h-[90vh] p-0 gap-0">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b space-y-0 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">
                Template Marketplace
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          {/* Search and Filters */}
          <div className="px-6 py-4 border-b space-y-4 flex-shrink-0">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search templates..."
              resultsCount={resultsCount}
            />
            <FilterControls
              filters={filters}
              sortBy={sortBy}
              onFilterChange={handleFilterChange}
              onSortChange={handleSortChange}
              onClearFilters={handleClearFilters}
            />
          </div>

          {/* Content Area */}
          <ScrollArea className="flex-1">
            <div className="px-6 py-6">
              {/* Loading State */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-12 w-12 animate-spin text-gray-400 mb-4" />
                  <p className="text-gray-500">Loading templates...</p>
                </div>
              )}

              {/* Error State */}
              {hasError && (
                <div className="flex flex-col items-center justify-center py-20">
                  <p className="text-red-600 mb-4">Failed to load templates</p>
                  <Button onClick={() => refetchTemplates()}>Retry</Button>
                </div>
              )}

              {/* Empty State */}
              {isEmpty && (
                <div className="flex flex-col items-center justify-center py-20">
                  <p className="text-gray-500 mb-4">No templates found</p>
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                </div>
              )}

              {/* Templates Grid */}
              {!isLoading && !hasError && !isEmpty && (
                <TemplateMasonryGrid
                  templates={filteredTemplates}
                  onTemplateClick={handleTemplateClick}
                  isLockedTemplate={isTemplateLocked}
                  isLoading={false}
                />
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetailModal
          template={selectedTemplate}
          isOpen={!!selectedTemplate}
          onClose={handleCloseDetailModal}
          onUseTemplate={handleUseTemplate}
          availableCategories={availableCategories}
          isLocked={isTemplateLocked(selectedTemplate)}
          isLoading={isPending || useTemplateMutation.isPending}
        />
      )}
    </>
  );
}
