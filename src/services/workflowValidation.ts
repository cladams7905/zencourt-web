/**
 * Workflow Validation Service
 *
 * Provides validation functions for workflow stage transitions
 */

import type { WorkflowStage, WorkflowState, ValidationResult } from "@/types/workflow";

// ============================================================================
// Stage Validators
// ============================================================================

/**
 * Validate upload stage - at least one uploaded image
 */
export function validateUploadStage(state: WorkflowState): ValidationResult {
  const errors: string[] = [];

  if (state.images.length === 0) {
    errors.push("At least one image must be uploaded");
  }

  const uploadedImages = state.images.filter(
    (img) => img.status === "uploaded" || img.status === "analyzed"
  );

  if (uploadedImages.length === 0) {
    errors.push("At least one image must be successfully uploaded");
  }

  const hasUploadingImages = state.images.some(
    (img) => img.status === "uploading" || img.status === "pending"
  );

  if (hasUploadingImages) {
    errors.push("Please wait for all images to finish uploading");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate categorize stage - all images categorized
 */
export function validateCategorizeStage(state: WorkflowState): ValidationResult {
  const errors: string[] = [];

  if (state.images.length === 0) {
    errors.push("No images to categorize");
  }

  const uncategorizedImages = state.images.filter(
    (img) =>
      !img.classification && (img.status === "uploaded" || img.status === "analyzed")
  );

  if (uncategorizedImages.length > 0) {
    errors.push(
      `${uncategorizedImages.length} image(s) have not been categorized`
    );
  }

  if (state.categorizedGroups.length === 0) {
    errors.push("Images must be organized into categories");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate plan stage - at least one media selection
 */
export function validatePlanStage(state: WorkflowState): ValidationResult {
  const errors: string[] = [];

  if (state.selectedMedia.length === 0) {
    errors.push("At least one template must be selected");
  }

  // Validate that selected templates are valid
  const invalidSelections = state.selectedMedia.filter(
    (selection) => !selection.template || !selection.templateId
  );

  if (invalidSelections.length > 0) {
    errors.push("Some selected templates are invalid");
  }

  // Check for required categories
  for (const selection of state.selectedMedia) {
    if (
      selection.template.requiredCategories &&
      selection.template.requiredCategories.length > 0
    ) {
      const availableCategories = state.images
        .filter((img) => img.classification?.category)
        .map((img) => img.classification!.category)
        .filter((category, index, self) => self.indexOf(category) === index);

      const missingCategories = selection.template.requiredCategories.filter(
        (cat) => !availableCategories.includes(cat)
      );

      if (missingCategories.length > 0) {
        errors.push(
          `Template "${selection.template.title}" requires categories: ${missingCategories.join(
            ", "
          )}`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate review stage - no validation errors
 */
export function validateReviewStage(state: WorkflowState): ValidationResult {
  const errors: string[] = [];

  // Re-validate previous stages
  const uploadValidation = validateUploadStage(state);
  const categorizeValidation = validateCategorizeStage(state);
  const planValidation = validatePlanStage(state);

  if (!uploadValidation.valid) {
    errors.push(...uploadValidation.errors);
  }

  if (!categorizeValidation.valid) {
    errors.push(...categorizeValidation.errors);
  }

  if (!planValidation.valid) {
    errors.push(...planValidation.errors);
  }

  // Additional review-specific validation
  if (!state.currentProject) {
    errors.push("No project found");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate generate stage - ready to generate
 */
export function validateGenerateStage(state: WorkflowState): ValidationResult {
  const errors: string[] = [];

  // Re-validate all previous stages
  const reviewValidation = validateReviewStage(state);

  if (!reviewValidation.valid) {
    errors.push(...reviewValidation.errors);
  }

  // Additional generation-specific validation
  if (state.isProcessing) {
    errors.push("Cannot start generation while processing is ongoing");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// Stage Transition Validation
// ============================================================================

/**
 * Check if transition from one stage to another is allowed
 */
export function canProceedToStage(
  fromStage: WorkflowStage,
  toStage: WorkflowStage,
  state: WorkflowState
): ValidationResult {
  // Define the order of stages
  const stageOrder: WorkflowStage[] = [
    "upload",
    "categorize",
    "plan",
    "review",
    "generate"
  ];

  const fromIndex = stageOrder.indexOf(fromStage);
  const toIndex = stageOrder.indexOf(toStage);

  // Allow going back to any previous stage
  if (toIndex < fromIndex) {
    return { valid: true, errors: [] };
  }

  // Validate the target stage
  let validation: ValidationResult;

  switch (toStage) {
    case "upload":
      validation = { valid: true, errors: [] };
      break;
    case "categorize":
      validation = validateUploadStage(state);
      break;
    case "plan":
      validation = validateCategorizeStage(state);
      break;
    case "review":
      validation = validatePlanStage(state);
      break;
    case "generate":
      validation = validateReviewStage(state);
      break;
    default:
      validation = { valid: false, errors: ["Invalid stage"] };
  }

  return validation;
}

/**
 * Get the next allowed stage from current stage
 */
export function getNextAllowedStage(
  currentStage: WorkflowStage,
  state: WorkflowState
): WorkflowStage | null {
  const stageOrder: WorkflowStage[] = [
    "upload",
    "categorize",
    "plan",
    "review",
    "generate"
  ];

  const currentIndex = stageOrder.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === stageOrder.length - 1) {
    return null;
  }

  const nextStage = stageOrder[currentIndex + 1];
  const validation = canProceedToStage(currentStage, nextStage, state);

  return validation.valid ? nextStage : null;
}

/**
 * Validate entire workflow state
 */
export function validateWorkflowState(state: WorkflowState): ValidationResult {
  const errors: string[] = [];

  // Validate current stage
  let stageValidation: ValidationResult;

  switch (state.currentStage) {
    case "upload":
      stageValidation = validateUploadStage(state);
      break;
    case "categorize":
      stageValidation = validateCategorizeStage(state);
      break;
    case "plan":
      stageValidation = validatePlanStage(state);
      break;
    case "review":
      stageValidation = validateReviewStage(state);
      break;
    case "generate":
      stageValidation = validateGenerateStage(state);
      break;
    default:
      stageValidation = { valid: false, errors: ["Invalid stage"] };
  }

  if (!stageValidation.valid) {
    errors.push(...stageValidation.errors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get validation errors for current state
 */
export function getValidationErrors(state: WorkflowState): string[] {
  const validation = validateWorkflowState(state);
  return validation.errors;
}

/**
 * Check if workflow can be completed (generate stage is valid)
 */
export function canCompleteWorkflow(state: WorkflowState): boolean {
  const validation = validateGenerateStage(state);
  return validation.valid;
}
