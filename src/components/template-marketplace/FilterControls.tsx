"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { ChevronDown, Filter, X } from "lucide-react";
import type { Platform, ContentType } from "@/types/templates";

/**
 * Filter Controls Props
 */
export interface FilterControlsProps {
  contentType: ContentType | null;
  platform: Platform | null;
  style: string | null;
  subscriptionStatus: "all" | "free" | "premium";
  sortBy: "popular" | "new" | "alphabetical";
  onContentTypeChange: (value: ContentType | null) => void;
  onPlatformChange: (value: Platform | null) => void;
  onStyleChange: (value: string | null) => void;
  onSubscriptionStatusChange: (value: "all" | "free" | "premium") => void;
  onSortByChange: (value: "popular" | "new" | "alphabetical") => void;
  onClearFilters: () => void;
  className?: string;
}

/**
 * Content types for filtering
 */
const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "video", label: "Videos" },
  { value: "post", label: "Posts" },
  { value: "flyer", label: "Flyers" }
];

/**
 * Platforms for filtering
 */
const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "instagram-post", label: "Instagram Post" },
  { value: "instagram-reel", label: "Instagram Reel" },
  { value: "instagram-story", label: "Instagram Story" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook-post", label: "Facebook Post" },
  { value: "facebook-story", label: "Facebook Story" },
  { value: "youtube", label: "YouTube" },
  { value: "youtube-short", label: "YouTube Short" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "print", label: "Print" }
];

/**
 * Styles for filtering
 */
const STYLES = [
  { value: "modern", label: "Modern" },
  { value: "luxury", label: "Luxury" },
  { value: "minimal", label: "Minimal" },
  { value: "elegant", label: "Elegant" },
  { value: "professional", label: "Professional" },
  { value: "clean", label: "Clean" },
  { value: "cinematic", label: "Cinematic" }
];

/**
 * Filter Controls Component
 *
 * Dropdowns and buttons for filtering and sorting templates
 */
export function FilterControls({
  contentType,
  platform,
  style,
  subscriptionStatus,
  sortBy,
  onContentTypeChange,
  onPlatformChange,
  onStyleChange,
  onSubscriptionStatusChange,
  onSortByChange,
  onClearFilters,
  className = ""
}: FilterControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Count active filters
  const activeFiltersCount = [
    contentType,
    platform,
    style,
    subscriptionStatus !== "all" ? subscriptionStatus : null
  ].filter(Boolean).length;

  return (
    <div className={className}>
      {/* Mobile: Collapsible */}
      <div className="lg:hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFiltersCount}
                  </Badge>
                )}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <FilterInputs
              contentType={contentType}
              platform={platform}
              style={style}
              subscriptionStatus={subscriptionStatus}
              sortBy={sortBy}
              onContentTypeChange={onContentTypeChange}
              onPlatformChange={onPlatformChange}
              onStyleChange={onStyleChange}
              onSubscriptionStatusChange={onSubscriptionStatusChange}
              onSortByChange={onSortByChange}
              onClearFilters={onClearFilters}
              activeFiltersCount={activeFiltersCount}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Desktop: Always Visible */}
      <div className="hidden lg:block">
        <FilterInputs
          contentType={contentType}
          platform={platform}
          style={style}
          subscriptionStatus={subscriptionStatus}
          sortBy={sortBy}
          onContentTypeChange={onContentTypeChange}
          onPlatformChange={onPlatformChange}
          onStyleChange={onStyleChange}
          onSubscriptionStatusChange={onSubscriptionStatusChange}
          onSortByChange={onSortByChange}
          onClearFilters={onClearFilters}
          activeFiltersCount={activeFiltersCount}
        />
      </div>
    </div>
  );
}

/**
 * Filter Inputs Component (shared between mobile and desktop)
 */
function FilterInputs({
  contentType,
  platform,
  style,
  subscriptionStatus,
  sortBy,
  onContentTypeChange,
  onPlatformChange,
  onStyleChange,
  onSubscriptionStatusChange,
  onSortByChange,
  onClearFilters,
  activeFiltersCount
}: FilterControlsProps & { activeFiltersCount: number }) {
  return (
    <div className="space-y-4">
      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Content Type */}
        <Select
          value={contentType || "all"}
          onValueChange={(value) =>
            onContentTypeChange(value === "all" ? null : (value as ContentType))
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CONTENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Platform */}
        <Select
          value={platform || "all"}
          onValueChange={(value) =>
            onPlatformChange(value === "all" ? null : (value as Platform))
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Style */}
        <Select
          value={style || "all"}
          onValueChange={(value) =>
            onStyleChange(value === "all" ? null : value)
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Styles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Styles</SelectItem>
            {STYLES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Subscription Status */}
        <Select
          value={subscriptionStatus}
          onValueChange={(value) =>
            onSubscriptionStatusChange(value as "all" | "free" | "premium")
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Templates</SelectItem>
            <SelectItem value="free">Free Only</SelectItem>
            <SelectItem value="premium">Premium Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort & Clear Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Sort By */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <Select
            value={sortBy}
            onValueChange={(value) =>
              onSortByChange(value as "popular" | "new" | "alphabetical")
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="new">Newest</SelectItem>
              <SelectItem value="alphabetical">A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear Filters
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          </Button>
        )}
      </div>
    </div>
  );
}
