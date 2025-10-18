/**
 * Project Workflow Types
 *
 * Type definitions for the multi-stage project creation workflow
 */

import type { ContentType, Platform, Template } from "./templates";
import type { ProcessedImage } from "./images";
import type { CategorizedGroup } from "./roomCategory";
import type { Project } from "./schema";

// ============================================================================
// Workflow Stage Types
// ============================================================================

/**
 * The five stages of the project creation workflow
 */
export type WorkflowStage = "upload" | "categorize" | "plan" | "review" | "generate";

// ============================================================================
// Media Selection Types
// ============================================================================

/**
 * Media types available for generation
 */
export type MediaType = "vertical-video" | "landscape-video" | "social-post" | "physical-handout";

/**
 * Configuration for each media type
 */
export interface MediaTypeConfig {
  type: MediaType;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  templateContentType: ContentType;
  availablePlatforms?: Platform[];
}

/**
 * User's selection of a template for a specific media type and platform
 */
export interface MediaSelection {
  id: string; // unique identifier for this selection
  mediaType: MediaType;
  templateId: string;
  template: Template; // Full template object
  platform: Platform;
  estimatedGenerationTime: number; // in seconds
}

/**
 * Constant array of all available media types with their configurations
 */
export const MEDIA_TYPES: MediaTypeConfig[] = [
  {
    type: "vertical-video",
    label: "Vertical Video",
    description: "Short-form vertical videos for social media",
    icon: "Smartphone",
    templateContentType: "video",
    availablePlatforms: ["instagram-reel", "tiktok", "youtube-short"]
  },
  {
    type: "landscape-video",
    label: "Landscape Video",
    description: "Full-length property walkthroughs",
    icon: "Video",
    templateContentType: "video",
    availablePlatforms: ["youtube", "facebook-post"]
  },
  {
    type: "social-post",
    label: "Social Media Posts",
    description: "Image-based posts for social platforms",
    icon: "Image",
    templateContentType: "post",
    availablePlatforms: ["instagram-post", "facebook-post", "linkedin"]
  },
  {
    type: "physical-handout",
    label: "Physical Handouts",
    description: "Printable flyers and brochures",
    icon: "Printer",
    templateContentType: "flyer",
    availablePlatforms: ["print"]
  }
];

// ============================================================================
// Generation Progress Types
// ============================================================================

/**
 * Status of a generation step
 */
export type GenerationStepStatus = "completed" | "in-progress" | "waiting" | "failed";

/**
 * Individual step in the generation process
 */
export interface GenerationStep {
  id: string;
  label: string;
  status: GenerationStepStatus;
  progress?: number; // 0-100, only for in-progress
  duration?: number; // actual duration in seconds (for completed)
  error?: string; // error message (for failed)
}

/**
 * Overall generation progress tracking
 */
export interface GenerationProgress {
  currentStep: string; // Human-readable step name
  totalSteps: number;
  currentStepIndex: number; // 0-based index
  estimatedTimeRemaining: number; // in seconds
  overallProgress: number; // 0-100
  steps: GenerationStep[];
}

// ============================================================================
// Workflow State Types
// ============================================================================

/**
 * Complete state for the project workflow modal
 */
export interface WorkflowState {
  // Current stage
  currentStage: WorkflowStage;

  // Project information
  projectName: string;
  currentProject: Project | null;

  // Image data
  images: ProcessedImage[];
  categorizedGroups: CategorizedGroup[];

  // Media selections
  selectedMedia: MediaSelection[];

  // Progress tracking
  isProcessing: boolean;
  generationProgress: GenerationProgress | null;
}

// ============================================================================
// Extended Project Type
// ============================================================================

/**
 * Project with workflow-specific fields
 */
export interface ProjectWithWorkflow extends Project {
  workflowStage?: WorkflowStage;
  selectedMedia?: MediaSelection[];
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of stage validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validation function type for stage transitions
 */
export type StageValidator = (state: WorkflowState) => ValidationResult;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get media type configuration by type
 */
export function getMediaTypeConfig(type: MediaType): MediaTypeConfig | undefined {
  return MEDIA_TYPES.find((mt) => mt.type === type);
}

/**
 * Get label for a media type
 */
export function getMediaTypeLabel(type: MediaType): string {
  return getMediaTypeConfig(type)?.label || type;
}

/**
 * Check if a workflow stage is before another stage
 */
export function isStageBefore(stage: WorkflowStage, compareStage: WorkflowStage): boolean {
  const stages: WorkflowStage[] = ["upload", "categorize", "plan", "review", "generate"];
  return stages.indexOf(stage) < stages.indexOf(compareStage);
}

/**
 * Check if a workflow stage is after another stage
 */
export function isStageAfter(stage: WorkflowStage, compareStage: WorkflowStage): boolean {
  const stages: WorkflowStage[] = ["upload", "categorize", "plan", "review", "generate"];
  return stages.indexOf(stage) > stages.indexOf(compareStage);
}

/**
 * Get all stages up to and including the specified stage
 */
export function getCompletedStages(currentStage: WorkflowStage): WorkflowStage[] {
  const stages: WorkflowStage[] = ["upload", "categorize", "plan", "review", "generate"];
  const currentIndex = stages.indexOf(currentStage);
  return stages.slice(0, currentIndex);
}

/**
 * Get the next stage in the workflow
 */
export function getNextStage(currentStage: WorkflowStage): WorkflowStage | null {
  const stages: WorkflowStage[] = ["upload", "categorize", "plan", "review", "generate"];
  const currentIndex = stages.indexOf(currentStage);
  return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
}

/**
 * Get the previous stage in the workflow
 */
export function getPreviousStage(currentStage: WorkflowStage): WorkflowStage | null {
  const stages: WorkflowStage[] = ["upload", "categorize", "plan", "review", "generate"];
  const currentIndex = stages.indexOf(currentStage);
  return currentIndex > 0 ? stages[currentIndex - 1] : null;
}
