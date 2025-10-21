/**
 * API Route: Generation Progress
 *
 * POST /api/generation/progress
 * Polls the progress of multiple generation jobs
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/stack/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getGenerationJobStatus } from "@/db/actions/generation";

// ============================================================================
// Types
// ============================================================================

interface ProgressRequest {
  jobIds: string[];
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: ProgressRequest = await request.json();
    const { jobIds } = body;

    // Validate request
    if (!jobIds || jobIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request", message: "At least one job ID is required" },
        { status: 400 }
      );
    }

    // Fetch job statuses
    const jobs = await Promise.all(
      jobIds.map((jobId) => getGenerationJobStatus(jobId))
    );

    // Filter out null results
    const validJobs = jobs.filter((job) => job !== null);

    if (validJobs.length === 0) {
      return NextResponse.json(
        { error: "Not found", message: "No jobs found" },
        { status: 404 }
      );
    }

    // Verify ownership (check first job's project)
    const firstJob = validJobs[0];
    if (firstJob) {
      const projectResult = await db
        .select()
        .from(projects)
        .where(eq(projects.id, firstJob.projectId))
        .limit(1);

      if (projectResult.length > 0) {
        const project = projectResult[0];
        if (project.userId !== user.id) {
          return NextResponse.json(
            {
              error: "Forbidden",
              message: "You don't have access to these jobs"
            },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      jobs: validJobs
    });
  } catch (error) {
    console.error("Error fetching generation progress:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch progress. Please try again."
      },
      { status: 500 }
    );
  }
}
