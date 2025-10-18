"use client";

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Search Bar Props
 */
export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultsCount?: number;
  className?: string;
}

/**
 * Search Bar Component
 *
 * Input field for searching templates with keyboard shortcuts and clear button
 */
export function SearchBar({
  value,
  onChange,
  placeholder = "Search templates...",
  resultsCount,
  className = ""
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className={className}>
      <div className="relative">
        {/* Search Icon */}
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />

        {/* Input Field */}
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10"
          aria-label="Search templates"
        />

        {/* Clear Button */}
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Keyboard Hint */}
        {!value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-gray-400 pointer-events-none">
            <kbd className="px-1.5 py-0.5 rounded border bg-gray-50 text-gray-600">
              {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded border bg-gray-50 text-gray-600">
              K
            </kbd>
          </div>
        )}
      </div>

      {/* Results Count */}
      {resultsCount !== undefined && (
        <p className="mt-2 text-sm text-gray-500">
          {resultsCount === 0
            ? "No results found"
            : `${resultsCount} ${resultsCount === 1 ? "result" : "results"}`}
        </p>
      )}
    </div>
  );
}
