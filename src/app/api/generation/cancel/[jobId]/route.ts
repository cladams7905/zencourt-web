/**
 * API Route: Cancel Generation
 *
 * POST /api/generation/cancel/[jobId]
 * Cancels a running generation job
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/stack/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getGenerationJobStatus,
  updateGenerationJobProgress
} from "@/db/actions/generation";

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Authenticate user
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    const { jobId } = await params;

    // Get job status
    const job = await getGenerationJobStatus(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Not found", message: "Job not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    const projectResult = await db
      .select()
      .from(projects)
      .where(eq(projects.id, job.projectId))
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
        { error: "Forbidden", message: "You don't have access to this job" },
        { status: 403 }
      );
    }

    // Check if job can be cancelled
    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json(
        {
          error: "Invalid operation",
          message: `Cannot cancel a ${job.status} job`
        },
        { status: 400 }
      );
    }

    // Update job status to failed (cancelled)
    await updateGenerationJobProgress(jobId, {
      status: "failed",
      error: "Cancelled by user"
    });

    // TODO: In production, signal the background worker to stop processing

    return NextResponse.json({
      success: true,
      message: "Job cancelled successfully"
    });
  } catch (error) {
    console.error("Error cancelling job:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to cancel job. Please try again."
      },
      { status: 500 }
    );
  }
}
