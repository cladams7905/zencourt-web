"use client";

import { Download, Share2, Loader2, AlertCircle, Sparkles } from "lucide-react";
import Image from "next/image";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import type { GeneratedContent } from "@/types/templates";

interface GeneratedContentCardProps {
  content: GeneratedContent;
  onRegenerate?: () => void;
}

export function GeneratedContentCard({
  content,
  onRegenerate
}: GeneratedContentCardProps) {
  const isPending = content.status === "pending" || content.status === "processing";
  const isCompleted = content.status === "completed";
  const isFailed = content.status === "failed";

  // Calculate progress (mock for now - would come from metadata)
  const progress = content.metadata?.duration ? 75 : isPending ? 45 : 100;

  const handleDownload = () => {
    if (content.outputUrl) {
      window.open(content.outputUrl, "_blank");
    }
  };

  const handleShare = async () => {
    if (!content.outputUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Generated Content",
          text: "Check out my generated content!",
          url: content.outputUrl
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(content.outputUrl);
      // Could show a toast here
    }
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-border hover:shadow-lg transition-shadow">
      {/* Thumbnail/Preview */}
      <div className="relative aspect-video bg-gradient-to-br from-purple-100 to-blue-100">
        {isCompleted && content.thumbnailUrl && (
          <Image
            src={content.thumbnailUrl}
            alt="Generated content"
            fill
            className="object-cover"
          />
        )}

        {isPending && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
            <div className="w-3/4 space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-gray-600">
                {content.status === "pending" ? "Queued..." : "Generating..."}
              </p>
            </div>
          </div>
        )}

        {isFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="text-sm text-red-600">Generation failed</p>
            {content.error && (
              <p className="text-xs text-gray-500 px-4 text-center">
                {content.error}
              </p>
            )}
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          {isPending && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              Processing
            </Badge>
          )}
          {isCompleted && (
            <Badge className="bg-green-100 text-green-700">Completed</Badge>
          )}
          {isFailed && (
            <Badge variant="destructive">Failed</Badge>
          )}
        </div>

        {/* Content Type Badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="outline" className="bg-white/90">
            {content.contentType.charAt(0).toUpperCase() +
              content.contentType.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3">
        {/* Metadata */}
        <div className="text-xs text-gray-500">
          Generated {new Date(content.generatedAt).toLocaleDateString()}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isCompleted && (
            <>
              <Button
                size="sm"
                onClick={handleDownload}
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleShare}
                className="flex-1 gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </>
          )}

          {(isFailed || isCompleted) && onRegenerate && (
            <Button
              size="sm"
              variant={isFailed ? "default" : "outline"}
              onClick={onRegenerate}
              className="flex-1 gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isFailed ? "Retry" : "Regenerate"}
            </Button>
          )}

          {isPending && (
            <Button size="sm" disabled className="flex-1">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating...
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
