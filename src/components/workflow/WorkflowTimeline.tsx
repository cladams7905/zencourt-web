"use client";

import { cn } from "@/components/ui/utils";
import type { WorkflowStage } from "@/types/workflow";

interface WorkflowTimelineProps {
  currentStage: WorkflowStage;
  completedStages: WorkflowStage[];
  onStageClick?: (stage: WorkflowStage) => void;
}

interface StageConfig {
  id: WorkflowStage;
  label: string;
  shortLabel: string; // For mobile
}

const STAGES: StageConfig[] = [
  { id: "upload", label: "Upload", shortLabel: "Upload" },
  { id: "categorize", label: "Categorize", shortLabel: "Categorize" },
  { id: "plan", label: "Plan", shortLabel: "Plan" },
  { id: "review", label: "Review", shortLabel: "Review" },
  { id: "generate", label: "Generate", shortLabel: "Generate" }
];

export function WorkflowTimeline({
  currentStage,
  completedStages,
  onStageClick
}: WorkflowTimelineProps) {
  const getStageStatus = (
    stage: WorkflowStage
  ): "completed" | "active" | "upcoming" => {
    if (stage === currentStage) return "active";
    if (completedStages.includes(stage)) return "completed";
    return "upcoming";
  };

  return (
    <div className="w-full px-6 py-4 border-b bg-white">
      <nav aria-label="Project workflow progress" className="overflow-x-auto">
        <ol className="flex items-center justify-between min-w-max sm:min-w-0">
          {STAGES.map((stage, index) => {
            const status = getStageStatus(stage.id);
            const isLast = index === STAGES.length - 1;
            const isClickable = onStageClick && status !== "upcoming";

            return (
              <li
                key={stage.id}
                className={cn("flex items-center", !isLast && "flex-1")}
              >
                {/* Stage indicator */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => isClickable && onStageClick(stage.id)}
                    disabled={!isClickable}
                    className={cn(
                      "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
                      status === "completed" &&
                        "bg-primary text-primary-foreground",
                      status === "active" &&
                        "bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse",
                      status === "upcoming" &&
                        "bg-muted text-muted-foreground border-2 border-border",
                      isClickable && "cursor-pointer hover:scale-110",
                      !isClickable && "cursor-default"
                    )}
                    aria-current={status === "active" ? "step" : undefined}
                  >
                    {status === "completed" && (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    {status === "active" && (
                      <div className="w-3 h-3 bg-primary-foreground rounded-full" />
                    )}
                    {status === "upcoming" && (
                      <div className="w-3 h-3 bg-muted-foreground/30 rounded-full" />
                    )}
                  </button>

                  {/* Stage label */}
                  <span
                    className={cn(
                      "mt-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors",
                      status === "completed" && "text-foreground",
                      status === "active" && "text-primary font-semibold",
                      status === "upcoming" && "text-muted-foreground"
                    )}
                  >
                    <span className="hidden sm:inline">{stage.label}</span>
                    <span className="sm:hidden">{stage.shortLabel}</span>
                  </span>
                </div>

                {/* Connecting line */}
                {!isLast && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2 sm:mx-4 transition-colors duration-300",
                      status === "completed" && "bg-primary",
                      status === "active" && "bg-gradient-to-r from-primary to-muted",
                      status === "upcoming" && "bg-muted border-t border-dashed"
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
