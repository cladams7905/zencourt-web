"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { Template } from "@/types/schema";
import {
  Lock,
  Video,
  FileText,
  Printer,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Template Card Props
 */
export interface TemplateCardProps {
  template: Template;
  onClick: () => void;
  isLocked?: boolean;
  className?: string;
}

/**
 * Get icon for platform
 */
function getPlatformIcon(platform: string) {
  switch (platform) {
    case "instagram-post":
    case "instagram-reel":
    case "instagram-story":
      return <Instagram className="h-3 w-3" />;
    case "facebook-post":
    case "facebook-story":
      return <Facebook className="h-3 w-3" />;
    case "linkedin":
      return <Linkedin className="h-3 w-3" />;
    case "youtube":
    case "youtube-short":
      return <Youtube className="h-3 w-3" />;
    case "tiktok":
      return (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      );
    case "print":
      return <Printer className="h-3 w-3" />;
    default:
      return null;
  }
}

/**
 * Get icon for content type
 */
function getContentTypeIcon(contentType: string) {
  switch (contentType) {
    case "video":
      return <Video className="h-3 w-3" />;
    case "post":
      return <FileText className="h-3 w-3" />;
    case "flyer":
      return <Printer className="h-3 w-3" />;
    default:
      return null;
  }
}

/**
 * Get display name for content type
 */
function getContentTypeLabel(contentType: string) {
  switch (contentType) {
    case "video":
      return "Video";
    case "post":
      return "Post";
    case "flyer":
      return "Flyer";
    default:
      return contentType;
  }
}

/**
 * Check if template is new (created within last 30 days)
 */
function isNew(createdAt: Date): boolean {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return new Date(createdAt) > thirtyDaysAgo;
}

/**
 * Template Card Component
 *
 * Displays a template in a card format with preview image, badges, and metadata
 */
export function TemplateCard({
  template,
  onClick,
  isLocked = false,
  className
}: TemplateCardProps) {
  const {
    title,
    previewImageUrl,
    contentType,
    platforms,
    isPremium,
    usageCount30Days,
    createdAt
  } = template;

  // Determine if template is popular (top 20% usage)
  // This is a simplified check - in production, you'd compare against all templates
  const isPopular = usageCount30Days > 50;
  const isNewTemplate = isNew(createdAt);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer",
        "focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-black",
        className
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View ${title} template`}
    >
      {/* Preview Image */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-100">
        <Image
          src={previewImageUrl}
          alt={title}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Lock Overlay for Premium Templates */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="text-white text-center">
              <Lock className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Premium</p>
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {/* Premium Badge */}
          {isPremium && (
            <Badge
              variant="secondary"
              className="bg-yellow-100 text-yellow-900 border-yellow-300 flex items-center gap-1"
            >
              <Lock className="h-3 w-3" />
              Premium
            </Badge>
          )}

          {/* New Badge */}
          {isNewTemplate && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-900 border-blue-300 flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" />
              New
            </Badge>
          )}

          {/* Popular Badge */}
          {isPopular && (
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-900 border-green-300 flex items-center gap-1"
            >
              <TrendingUp className="h-3 w-3" />
              Popular
            </Badge>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
          {title}
        </h3>

        {/* Content Type Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            {getContentTypeIcon(contentType)}
            {getContentTypeLabel(contentType)}
          </Badge>
        </div>

        {/* Platform Badges */}
        <div className="flex flex-wrap gap-1">
          {(platforms as string[]).slice(0, 3).map((platform) => (
            <Badge
              key={platform}
              variant="outline"
              className="flex items-center gap-1 text-xs"
            >
              {getPlatformIcon(platform)}
              <span className="hidden sm:inline">
                {platform.split("-")[0]}
              </span>
            </Badge>
          ))}
          {platforms.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{platforms.length - 3}
            </Badge>
          )}
        </div>

        {/* Usage Count */}
        <div className="text-xs text-gray-500">
          {usageCount30Days} uses this month
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 ring-2 ring-black opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
    </div>
  );
}
