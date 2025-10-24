/**
 * API Route: Retry Failed Rooms
 *
 * POST /api/generation/retry
 * Retries video generation for specific failed rooms
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/stack/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  retryFailedRoomVideos,
  type VideoSettings
} from "@/services/videoGenerationOrchestrator";

// Allow longer execution time for retries
export const maxDuration = 300; // 5 minutes

// ============================================================================
// Types
// ============================================================================

interface RetryRequest {
  projectId: string;
  roomIds: string[];
  videoSettings: VideoSettings;
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
    const body: RetryRequest = await request.json();
    const { projectId, roomIds, videoSettings } = body;

    // Validate request
    if (!projectId) {
      return NextResponse.json(
        { error: "Invalid request", message: "Project ID is required" },
        { status: 400 }
      );
    }

    if (!roomIds || roomIds.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "At least one room ID is required"
        },
        { status: 400 }
      );
    }

    if (!videoSettings) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Video settings are required"
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

    console.log(
      `[API] Retrying ${roomIds.length} failed rooms for project ${projectId}`
    );

    // Retry failed rooms in background
    retryFailedRoomVideos(projectId, user.id, roomIds, videoSettings).catch(
      (error) => {
        console.error(`[API] Retry failed for project ${projectId}:`, error);
      }
    );

    return NextResponse.json({
      success: true,
      message: `Retrying ${roomIds.length} room(s)`
    });
  } catch (error) {
    console.error("[API] Error retrying generation:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to retry generation"
      },
      { status: 500 }
    );
  }
}
