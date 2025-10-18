/**
 * API Route: Get Generation Status
 *
 * GET /api/generation/status/[jobId]
 * Gets the status of a specific generation job
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@stackframe/stack";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getGenerationJobStatus } from "@/db/actions/generation";

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    const { jobId } = params;

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

    return NextResponse.json({
      success: true,
      job
    });
  } catch (error) {
    console.error("Error fetching job status:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch status. Please try again."
      },
      { status: 500 }
    );
  }
}
