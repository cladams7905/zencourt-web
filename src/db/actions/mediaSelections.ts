/**
 * Media Selection Database Actions
 *
 * CRUD operations for saving and loading media selections
 */

"use server";

import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { MediaSelection } from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

/**
 * Serializable media selection for database storage
 */
export interface SerializableMediaSelection {
  id: string;
  mediaType: string;
  templateId: string;
  platform: string;
  estimatedGenerationTime: number;
}

/**
 * Convert MediaSelection to serializable format
 */
function serializeMediaSelection(
  selection: MediaSelection
): SerializableMediaSelection {
  return {
    id: selection.id,
    mediaType: selection.mediaType,
    templateId: selection.templateId,
    platform: selection.platform,
    estimatedGenerationTime: selection.estimatedGenerationTime
  };
}

// ============================================================================
// Database Actions
// ============================================================================

/**
 * Save media selections to project
 */
export async function saveMediaSelections(
  projectId: string,
  selections: MediaSelection[]
): Promise<void> {
  try {
    const serializedSelections = selections.map(serializeMediaSelection);

    await db
      .update(projects)
      .set({
        metadata: {
          selectedMedia: serializedSelections
        },
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));

    console.log(
      `Saved ${selections.length} media selections for project ${projectId}`
    );
  } catch (error) {
    console.error("Error saving media selections:", error);
    throw new Error("Failed to save media selections");
  }
}

/**
 * Get media selections for a project
 */
export async function getMediaSelections(
  projectId: string
): Promise<SerializableMediaSelection[]> {
  try {
    const result = await db
      .select({
        metadata: projects.metadata
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (result.length === 0) {
      return [];
    }

    const metadata = result[0].metadata as any;
    const selectedMedia = metadata?.selectedMedia || [];

    return selectedMedia;
  } catch (error) {
    console.error("Error getting media selections:", error);
    throw new Error("Failed to get media selections");
  }
}

/**
 * Delete specific media selection from project
 */
export async function deleteMediaSelection(
  projectId: string,
  selectionId: string
): Promise<void> {
  try {
    // Get current selections
    const currentSelections = await getMediaSelections(projectId);

    // Filter out the selection to delete
    const updatedSelections = currentSelections.filter(
      (s) => s.id !== selectionId
    );

    // Update project metadata
    await db
      .update(projects)
      .set({
        metadata: {
          selectedMedia: updatedSelections
        },
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));

    console.log(
      `Deleted media selection ${selectionId} from project ${projectId}`
    );
  } catch (error) {
    console.error("Error deleting media selection:", error);
    throw new Error("Failed to delete media selection");
  }
}

/**
 * Clear all media selections for a project
 */
export async function clearMediaSelections(projectId: string): Promise<void> {
  try {
    await db
      .update(projects)
      .set({
        metadata: {
          selectedMedia: []
        },
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));

    console.log(`Cleared all media selections for project ${projectId}`);
  } catch (error) {
    console.error("Error clearing media selections:", error);
    throw new Error("Failed to clear media selections");
  }
}

/**
 * Update workflow stage in project metadata
 */
export async function updateWorkflowStage(
  projectId: string,
  stage: string
): Promise<void> {
  try {
    // Get current metadata
    const result = await db
      .select({
        metadata: projects.metadata
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const currentMetadata = (result[0]?.metadata as any) || {};

    await db
      .update(projects)
      .set({
        metadata: {
          ...currentMetadata,
          workflowStage: stage
        },
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));

    console.log(`Updated workflow stage to ${stage} for project ${projectId}`);
  } catch (error) {
    console.error("Error updating workflow stage:", error);
    throw new Error("Failed to update workflow stage");
  }
}

/**
 * Get workflow stage for a project
 */
export async function getWorkflowStage(
  projectId: string
): Promise<string | null> {
  try {
    const result = await db
      .select({
        metadata: projects.metadata
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const metadata = result[0].metadata as any;
    return metadata?.workflowStage || null;
  } catch (error) {
    console.error("Error getting workflow stage:", error);
    throw new Error("Failed to get workflow stage");
  }
}
