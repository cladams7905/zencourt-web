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
  duration?: "5" | "10";
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
        videoSettings: {
          ...params.videoSettings,
          duration: params.videoSettings.duration || "5"
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to start generation");
    }

    const data = await response.json();

    return {
      success: true,
      jobIds: [params.projectId], // Use projectId as the single "jobId" for polling
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
 * Poll generation progress using project ID
 */
export async function pollGenerationProgress(
  params: PollProgressParams
): Promise<PollProgressResponse> {
  try {
    // Extract projectId from jobIds array (first element is projectId now)
    const projectId = params.jobIds[0];

    const response = await fetch(`/api/generation/progress?projectId=${projectId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch generation progress");
    }

    const data = await response.json();

    // The API returns { success, progress, isComplete, hasFailed }
    // where progress is VideoGenerationProgress
    const progress: GenerationProgress = {
      currentStep: data.progress.currentStep,
      totalSteps: data.progress.totalSteps,
      currentStepIndex: data.progress.completedSteps,
      estimatedTimeRemaining: data.progress.estimatedTimeRemaining,
      overallProgress: data.progress.overallProgress,
      steps: data.progress.steps
    };

    const isComplete = data.isComplete;
    const hasFailed = data.hasFailed;

    return {
      progress,
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
 * Waits 60 seconds before starting to poll, then polls every 15 seconds
 */
export function createProgressPoller(
  jobIds: string[],
  onProgress: (progress: GenerationProgress) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): () => void {
  let intervalId: NodeJS.Timeout | null = null;
  let initialTimeoutId: NodeJS.Timeout | null = null;
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
    // Poll every 15 seconds
    intervalId = setInterval(poll, 15000);

    // Do an immediate poll when starting
    poll();
  };

  const stopPolling = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (initialTimeoutId) {
      clearTimeout(initialTimeoutId);
      initialTimeoutId = null;
    }
  };

  // Wait 60 seconds before starting to poll
  console.log("[Generation Polling] Waiting 60 seconds before starting to poll progress...");
  initialTimeoutId = setTimeout(() => {
    console.log("[Generation Polling] Starting to poll progress every 15 seconds");
    startPolling();
  }, 60000);

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
