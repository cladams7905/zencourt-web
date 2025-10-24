/**
 * Generation Job Database Actions
 *
 * CRUD operations for managing generation jobs in project metadata
 * Note: This stores jobs temporarily in project metadata. For video-specific
 * data, use the videos table via /db/actions/videos.ts
 */

"use server";

import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { GenerationStepStatus } from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

export interface GenerationJob {
  id: string;
  projectId: string;
  templateId: string;
  platform: string;
  status: GenerationStepStatus;
  progress?: number;
  outputUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGenerationJobParams {
  projectId: string;
  templateId: string;
  platform: string;
}

// ============================================================================
// Database Actions
// ============================================================================

/**
 * Create multiple generation jobs
 */
export async function createGenerationJobs(
  params: CreateGenerationJobParams[]
): Promise<GenerationJob[]> {
  try {
    const jobs: GenerationJob[] = params.map((param, index) => ({
      id: `gen-${param.projectId}-${Date.now()}-${index}`,
      projectId: param.projectId,
      templateId: param.templateId,
      platform: param.platform,
      status: "waiting" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Store jobs in project metadata (temporary solution)
    // In production, you'd have a separate generation_jobs table
    const projectId = params[0]?.projectId;
    if (projectId) {
      const result = await db
        .select({
          metadata: projects.metadata
        })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      const currentMetadata = result[0]?.metadata || {};

      await db
        .update(projects)
        .set({
          metadata: {
            ...currentMetadata,
            generationJobs: jobs
          },
          updatedAt: new Date()
        })
        .where(eq(projects.id, projectId));
    }

    console.log(`Created ${jobs.length} generation jobs`);
    return jobs;
  } catch (error) {
    console.error("Error creating generation jobs:", error);
    throw new Error("Failed to create generation jobs");
  }
}

/**
 * Get generation job status
 */
export async function getGenerationJobStatus(
  jobId: string
): Promise<GenerationJob | null> {
  try {
    // Extract project ID from job ID (format: gen-{projectId}-{timestamp}-{index})
    const projectId = jobId.split("-")[1];
    if (!projectId) {
      return null;
    }

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

    const metadata = result[0].metadata;
    const jobs: GenerationJob[] = metadata?.generationJobs || [];

    const job = jobs.find((j) => j.id === jobId);
    return job || null;
  } catch (error) {
    console.error("Error getting generation job status:", error);
    throw new Error("Failed to get generation job status");
  }
}

/**
 * Get all generation jobs for a project
 */
export async function getGenerationJobs(
  projectId: string
): Promise<GenerationJob[]> {
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

    const metadata = result[0].metadata;
    return metadata?.generationJobs || [];
  } catch (error) {
    console.error("Error getting generation jobs:", error);
    throw new Error("Failed to get generation jobs");
  }
}

/**
 * Update generation job progress
 */
export async function updateGenerationJobProgress(
  jobId: string,
  updates: {
    status?: GenerationStepStatus;
    progress?: number;
    outputUrl?: string;
    thumbnailUrl?: string;
    error?: string;
  }
): Promise<void> {
  try {
    // Extract project ID from job ID
    const projectId = jobId.split("-")[1];
    if (!projectId) {
      throw new Error("Invalid job ID");
    }

    const result = await db
      .select({
        metadata: projects.metadata
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (result.length === 0) {
      throw new Error("Project not found");
    }

    const metadata = result[0].metadata;
    const jobs: GenerationJob[] = metadata?.generationJobs || [];

    // Update the specific job
    const updatedJobs = jobs.map((job) => {
      if (job.id === jobId) {
        return {
          ...job,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return job;
    });

    await db
      .update(projects)
      .set({
        metadata: {
          ...metadata,
          generationJobs: updatedJobs
        },
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));

    console.log(`Updated generation job ${jobId}`);
  } catch (error) {
    console.error("Error updating generation job progress:", error);
    throw new Error("Failed to update generation job progress");
  }
}

/**
 * Delete generation jobs for a project
 */
export async function deleteGenerationJobs(projectId: string): Promise<void> {
  try {
    const result = await db
      .select({
        metadata: projects.metadata
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (result.length === 0) {
      return;
    }

    const metadata = result[0].metadata;

    await db
      .update(projects)
      .set({
        metadata: {
          ...metadata,
          generationJobs: []
        },
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));

    console.log(`Deleted generation jobs for project ${projectId}`);
  } catch (error) {
    console.error("Error deleting generation jobs:", error);
    throw new Error("Failed to delete generation jobs");
  }
}
