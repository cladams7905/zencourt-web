/**
 * Generation Service
 *
 * Handles content generation orchestration, progress polling, and time estimation
 */

import type {
  GenerationProgress,
  GenerationStep,
  GenerationStepStatus
} from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

interface GenerationJob {
  id: string;
  projectId: string;
  templateId: string;
  platform: string;
  status: GenerationStepStatus;
  progress?: number;
  outputUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VideoSettings {
  orientation: "landscape" | "vertical";
  roomOrder: Array<{ id: string; name: string; imageCount: number }>;
  logoFile?: File | null;
  logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  scriptText: string;
  enableSubtitles: boolean;
  subtitleFont: string;
  aiDirections: string;
}

interface StartGenerationParams {
  projectId: string;
  videoSettings: VideoSettings;
}

interface StartGenerationResponse {
  success: boolean;
  jobIds: string[];
  estimatedCompletionTime: number; // in seconds
  error?: string;
}

interface PollProgressParams {
  jobIds: string[];
}

interface PollProgressResponse {
  progress: GenerationProgress;
  isComplete: boolean;
  hasFailed: boolean;
}

// ============================================================================
// Generation Service
// ============================================================================

/**
 * Start generation process for video with settings
 */
export async function startGeneration(
  params: StartGenerationParams
): Promise<StartGenerationResponse> {
  try {
    const response = await fetch("/api/generation/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        projectId: params.projectId,
        videoSettings: params.videoSettings
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to start generation");
    }

    const data = await response.json();

    return {
      success: true,
      jobIds: data.jobIds,
      estimatedCompletionTime: data.estimatedCompletionTime || 120 // 2 minutes default
    };
  } catch (error) {
    console.error("Error starting generation:", error);
    return {
      success: false,
      jobIds: [],
      estimatedCompletionTime: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Poll generation progress for multiple jobs
 */
export async function pollGenerationProgress(
  params: PollProgressParams
): Promise<PollProgressResponse> {
  try {
    const response = await fetch("/api/generation/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jobIds: params.jobIds
      })
    });

    if (!response.ok) {
      throw new Error("Failed to fetch generation progress");
    }

    const data = await response.json();
    const jobs: GenerationJob[] = data.jobs;

    // Build generation steps from jobs
    const steps: GenerationStep[] = jobs.map((job, index) => ({
      id: job.id,
      label: `Generating content ${index + 1}`,
      status: job.status,
      progress: job.progress,
      error: job.error
    }));

    // Calculate overall progress
    const completedSteps = steps.filter((s) => s.status === "completed").length;
    const inProgressSteps = steps.filter((s) => s.status === "in-progress");
    const totalProgress = inProgressSteps.reduce(
      (sum, s) => sum + (s.progress || 0),
      0
    );
    const overallProgress =
      (completedSteps * 100 + totalProgress) / steps.length;

    // Find current step
    const currentStepIndex = steps.findIndex((s) => s.status === "in-progress");
    const currentStep =
      currentStepIndex >= 0 ? steps[currentStepIndex] : steps[steps.length - 1];

    // Calculate time remaining (rough estimate)
    const remainingSteps = steps.filter(
      (s) => s.status === "waiting" || s.status === "in-progress"
    ).length;
    const estimatedTimeRemaining = remainingSteps * 60; // Rough estimate

    const isComplete = steps.every((s) => s.status === "completed");
    const hasFailed = steps.some((s) => s.status === "failed");

    return {
      progress: {
        currentStep: currentStep.label,
        totalSteps: steps.length,
        currentStepIndex:
          currentStepIndex >= 0 ? currentStepIndex : steps.length - 1,
        estimatedTimeRemaining,
        overallProgress,
        steps
      },
      isComplete,
      hasFailed
    };
  } catch (error) {
    console.error("Error polling generation progress:", error);
    throw error;
  }
}

/**
 * Cancel a generation job
 */
export async function cancelGeneration(jobId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/generation/cancel/${jobId}`, {
      method: "POST"
    });

    if (!response.ok) {
      throw new Error("Failed to cancel generation");
    }

    return true;
  } catch (error) {
    console.error("Error canceling generation:", error);
    return false;
  }
}

/**
 * Get generation job status
 */
export async function getGenerationStatus(
  jobId: string
): Promise<GenerationJob | null> {
  try {
    const response = await fetch(`/api/generation/status/${jobId}`);

    if (!response.ok) {
      throw new Error("Failed to get generation status");
    }

    const data = await response.json();
    return data.job;
  } catch (error) {
    console.error("Error getting generation status:", error);
    return null;
  }
}

// ============================================================================
// Polling Utilities
// ============================================================================

/**
 * Create a polling function that calls a callback with progress updates
 */
export function createProgressPoller(
  jobIds: string[],
  onProgress: (progress: GenerationProgress) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): () => void {
  let intervalId: NodeJS.Timeout | null = null;
  let isPolling = false;

  const poll = async () => {
    if (isPolling) return;
    isPolling = true;

    try {
      const result = await pollGenerationProgress({ jobIds });

      onProgress(result.progress);

      if (result.isComplete || result.hasFailed) {
        stopPolling();
        onComplete();
      }
    } catch (error) {
      console.error("Polling error:", error);
      onError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      isPolling = false;
    }
  };

  const startPolling = () => {
    // Initial poll
    poll();

    // Poll every 2 seconds
    intervalId = setInterval(poll, 2000);
  };

  const stopPolling = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  // Start polling immediately
  startPolling();

  // Return cleanup function
  return stopPolling;
}

/**
 * Exponential backoff for retrying failed operations
 */
export function exponentialBackoff(
  attempt: number,
  maxAttempts: number = 5,
  baseDelay: number = 1000
): number {
  if (attempt >= maxAttempts) {
    throw new Error("Max retry attempts reached");
  }
  return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
}
