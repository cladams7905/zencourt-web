/**
 * API Route: Get Final Video
 *
 * GET /api/generation/video/[projectId]
 * Retrieves the final generated video for a project
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/stack/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getFinalVideo } from "@/db/actions/videos";

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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

    const { projectId } = await params;

    // Validate request
    if (!projectId) {
      return NextResponse.json(
        { error: "Invalid request", message: "Project ID is required" },
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

    // Get final video
    const finalVideo = await getFinalVideo(projectId);

    if (!finalVideo) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Final video not found. Generation may still be in progress."
        },
        { status: 404 }
      );
    }

    // Generate filename
    const projectName = project.title || "video";
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${timestamp}.mp4`;

    return NextResponse.json({
      success: true,
      video: {
        videoUrl: finalVideo.videoUrl,
        thumbnailUrl: finalVideo.thumbnailUrl,
        duration: finalVideo.duration,
        filename
      }
    });
  } catch (error) {
    console.error("[API] Error getting final video:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Failed to get final video"
      },
      { status: 500 }
    );
  }
}
