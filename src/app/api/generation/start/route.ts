/**
 * API Route: Start Generation
 *
 * POST /api/generation/start
 * Starts the content generation process for selected templates
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@stackframe/stack";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createGenerationJobs,
  simulateGenerationProgress,
  type CreateGenerationJobParams
} from "@/db/actions/generation";

// ============================================================================
// Types
// ============================================================================

interface StartGenerationRequest {
  projectId: string;
  selections: {
    templateId: string;
    platform: string;
    mediaType: string;
  }[];
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: StartGenerationRequest = await request.json();
    const { projectId, selections } = body;

    // Validate request
    if (!projectId) {
      return NextResponse.json(
        { error: "Invalid request", message: "Project ID is required" },
        { status: 400 }
      );
    }

    if (!selections || selections.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "At least one template selection is required"
        },
        { status: 400 }
      );
    }

    // Verify project ownership
    const projectResult = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (projectResult.length === 0) {
      return NextResponse.json(
        { error: "Not found", message: "Project not found" },
        { status: 404 }
      );
    }

    const project = projectResult[0];
    if (project.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden", message: "You don't have access to this project" },
        { status: 403 }
      );
    }

    // TODO: Check subscription status for premium templates
    // const subscription = await getSubscription(user.id);
    // const premiumTemplates = selections.filter(s => s.template.isPremium);
    // if (premiumTemplates.length > 0 && !subscription?.features.premiumTemplates) {
    //   return NextResponse.json(
    //     { error: "Subscription required", message: "Premium subscription required for selected templates" },
    //     { status: 403 }
    //   );
    // }

    // TODO: Check for missing required categories
    // This would require fetching template data and comparing with project images
    // const missingCategories = validateRequiredCategories(selections, project);
    // if (missingCategories.length > 0) {
    //   return NextResponse.json(
    //     {
    //       error: "Missing categories",
    //       message: `Missing required categories: ${missingCategories.join(", ")}`
    //     },
    //     { status: 400 }
    //   );
    // }

    // Create generation jobs
    const jobParams: CreateGenerationJobParams[] = selections.map((s) => ({
      projectId,
      templateId: s.templateId,
      platform: s.platform
    }));

    const jobs = await createGenerationJobs(jobParams);

    // Update project status to generating
    await db
      .update(projects)
      .set({
        status: "draft", // Will be "generating" when we have that status
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));

    // Start background generation (simulation for now)
    // In production, this would trigger a background worker or queue
    for (const job of jobs) {
      // Don't await - run in background
      simulateGenerationProgress(job.id).catch((error) => {
        console.error(`Background generation failed for job ${job.id}:`, error);
      });
    }

    // Calculate estimated completion time (rough estimate)
    const estimatedTime = selections.length * 60; // 60 seconds per item

    return NextResponse.json({
      success: true,
      jobIds: jobs.map((j) => j.id),
      estimatedCompletionTime: estimatedTime,
      message: "Generation started successfully"
    });
  } catch (error) {
    console.error("Error starting generation:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to start generation. Please try again."
      },
      { status: 500 }
    );
  }
}
