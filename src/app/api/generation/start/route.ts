/**
 * API Route: Start Generation
 *
 * POST /api/generation/start
 * Starts the content generation process for selected templates
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/stack/server";
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

interface VideoSettings {
  orientation: "landscape" | "vertical";
  roomOrder: Array<{ id: string; name: string; imageCount: number }>;
  logoFile?: File | null;
  logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  scriptText: string;
  enableSubtitles: boolean;
  subtitleFont: string;
  aiDirections: string;
}

interface StartGenerationRequest {
  projectId: string;
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
    const body: StartGenerationRequest = await request.json();
    const { projectId, videoSettings } = body;

    // Validate request
    if (!projectId) {
      return NextResponse.json(
        { error: "Invalid request", message: "Project ID is required" },
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

    // Create a single generation job for the video
    const jobParams: CreateGenerationJobParams = {
      projectId,
      templateId: "video-generation", // Static ID for video generation
      platform: videoSettings.orientation === "landscape" ? "youtube" : "tiktok"
    };

    const jobs = await createGenerationJobs([jobParams]);
    const job = jobs[0];

    // Update project status to generating
    await db
      .update(projects)
      .set({
        status: "draft", // Will be "generating" when we have that status
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));

    // TODO: Here you would call the Sora API with the video settings
    // For now, we'll simulate the generation progress
    // In production, this would:
    // 1. Upload images to cloud storage
    // 2. Call Sora API with video settings and image URLs
    // 3. Poll for completion
    // 4. Download and store the generated video

    // Start background generation (simulation for now)
    simulateGenerationProgress(job.id).catch((error) => {
      console.error(`Background generation failed for job ${job.id}:`, error);
    });

    // Calculate estimated completion time (2 minutes for video generation)
    const estimatedTime = 120; // 2 minutes

    return NextResponse.json({
      success: true,
      jobIds: [job.id],
      estimatedCompletionTime: estimatedTime,
      message: "Video generation started successfully"
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
