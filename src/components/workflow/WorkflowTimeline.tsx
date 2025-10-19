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
    <div className="w-full px-6 py-4 bg-white">
      <nav aria-label="Project workflow progress" className="overflow-x-auto">
        <ol className="flex items-center justify-between min-w-max sm:min-w-0">
          {STAGES.map((stage, index) => {
            const status = getStageStatus(stage.id);
            const isLast = index === STAGES.length - 1;
            const isClickable = onStageClick && status !== "upcoming";

            return (
              <li
                key={stage.id}
                className={cn(
                  "flex items-center relative",
                  !isLast && "flex-1"
                )}
              >
                {/* Connecting line - behind circles, full width */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute left-5 w-full right-0 h-0.5 transition-colors duration-300 z-0",
                      status === "completed" && "bg-primary",
                      status === "active" &&
                        "bg-gradient-to-r from-primary to-muted",
                      status === "upcoming" && "bg-muted border-t border-dashed"
                    )}
                    style={{ top: "20px" }}
                    aria-hidden="true"
                  />
                )}

                {/* Stage indicator */}
                <div className="flex flex-col items-center relative z-10">
                  <button
                    onClick={() => isClickable && onStageClick(stage.id)}
                    disabled={!isClickable}
                    className={cn(
                      "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
                      status === "completed" &&
                        "bg-primary text-primary-foreground",
                      status === "active" &&
                        "bg-primary text-primary-foreground",
                      status === "upcoming" &&
                        "bg-muted text-muted-foreground border-1 border-border border-dashed",
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
                      <div className="w-3 h-3 bg-muted-foreground/10 rounded-full" />
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
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
