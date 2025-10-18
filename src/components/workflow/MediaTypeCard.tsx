"use client";

import { useState } from "react";
import { cn } from "@/components/ui/utils";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { MediaTypeConfig } from "@/types/workflow";

interface MediaTypeCardProps {
  config: MediaTypeConfig;
  isSelected: boolean;
  templateCount: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function MediaTypeCard({
  config,
  isSelected,
  templateCount,
  children,
  defaultExpanded = false
}: MediaTypeCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Get the icon component from lucide-react
  const IconComponent = (LucideIcons as any)[config.icon] || LucideIcons.HelpCircle;

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden transition-all",
        isSelected && "border-primary ring-2 ring-primary/20",
        !isSelected && "border-border"
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-4 transition-colors",
          "hover:bg-muted/50 focus:outline-none focus:bg-muted/50",
          isExpanded && "bg-muted/30"
        )}
        aria-expanded={isExpanded}
        aria-controls={`media-type-${config.type}`}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg",
              isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            <IconComponent className="w-5 h-5" />
          </div>

          {/* Label and description */}
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">{config.label}</h3>
              {isSelected && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  <Check className="w-3 h-3" />
                  <span>Selected</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-left">
              {config.description}
            </p>
          </div>
        </div>

        {/* Expand/collapse button */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {templateCount} {templateCount === 1 ? "template" : "templates"}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div
          id={`media-type-${config.type}`}
          className="p-4 pt-0 border-t bg-muted/10"
        >
          {children}
        </div>
      )}
    </div>
  );
}
