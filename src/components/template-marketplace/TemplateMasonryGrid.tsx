"use client";

import { useRef, useEffect } from "react";
import { TemplateCard } from "./TemplateCard";
import type { Template } from "@/types/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSearch } from "lucide-react";

/**
 * Template Masonry Grid Props
 */
export interface TemplateMasonryGridProps {
  templates: Template[];
  onTemplateClick: (template: Template) => void;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLockedTemplate?: (template: Template) => boolean;
  className?: string;
}

/**
 * Skeleton Card for loading state
 */
function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * Empty State Component
 */
function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
      <FileSearch className="h-16 w-16 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No templates found
      </h3>
      <p className="text-gray-500 max-w-sm">
        Try adjusting your filters or search terms to find what you're looking for.
      </p>
    </div>
  );
}

/**
 * Template Masonry Grid Component
 *
 * Displays templates in a responsive masonry grid layout with infinite scroll
 */
export function TemplateMasonryGrid({
  templates,
  onTemplateClick,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  isLockedTemplate = () => false,
  className = ""
}: TemplateMasonryGridProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [onLoadMore, hasMore, isLoading]);

  // Show skeleton loading state
  if (isLoading && templates.length === 0) {
    return (
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Show empty state
  if (!isLoading && templates.length === 0) {
    return (
      <div className={className}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Masonry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={() => onTemplateClick(template)}
            isLocked={isLockedTemplate(template)}
          />
        ))}

        {/* Loading skeletons while fetching more */}
        {isLoading &&
          templates.length > 0 &&
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`loading-${i}`} />)}
      </div>

      {/* Infinite Scroll Trigger */}
      {hasMore && !isLoading && (
        <div
          ref={loadMoreRef}
          className="h-20 flex items-center justify-center mt-4"
        >
          <p className="text-sm text-gray-500">Loading more templates...</p>
        </div>
      )}

      {/* No More Results */}
      {!hasMore && templates.length > 0 && (
        <div className="text-center mt-8 text-gray-500 text-sm">
          You've reached the end of the results
        </div>
      )}
    </div>
  );
}
