"use server";

import { db } from "@/db";
import { templates, generatedContent, projects } from "@/db/schema";
import { eq, and, or, ilike, desc, asc, sql } from "drizzle-orm";
import type { Template, GeneratedContent } from "@/types/schema";
import type { Platform } from "@/types/templates";
import { getUser } from "./users";

/**
 * Template query parameters
 */
export interface TemplateQuery {
  search?: string;
  contentType?: string;
  platform?: Platform;
  style?: string;
  subscriptionStatus?: "all" | "free" | "premium";
  sortBy?: "popular" | "new" | "alphabetical";
  limit?: number;
  offset?: number;
}

/**
 * Template query response
 */
export interface TemplateQueryResponse {
  templates: Template[];
  total: number;
  hasMore: boolean;
}

/**
 * Get templates with filtering, searching, and sorting
 * Server action that fetches templates from the database
 *
 * @param query - Query parameters for filtering and pagination
 * @returns Promise<TemplateQueryResponse> - Templates with pagination info
 * @throws Error if query fails
 */
export async function getTemplates(
  query: TemplateQuery = {}
): Promise<TemplateQueryResponse> {
  try {
    const {
      search,
      contentType,
      platform,
      style,
      subscriptionStatus = "all",
      sortBy = "popular",
      limit = 30,
      offset = 0
    } = query;

    // Build filter conditions
    const conditions = [];

    // Content type filter
    if (contentType) {
      conditions.push(eq(templates.contentType, contentType));
    }

    // Platform filter - check if platform exists in JSONB array
    if (platform) {
      conditions.push(
        sql`${templates.platforms} @> ${JSON.stringify([platform])}`
      );
    }

    // Style/tag filter - check if style exists in tags JSONB array
    if (style) {
      conditions.push(sql`${templates.tags} @> ${JSON.stringify([style])}`);
    }

    // Subscription status filter
    if (subscriptionStatus === "free") {
      conditions.push(eq(templates.isPremium, false));
    } else if (subscriptionStatus === "premium") {
      conditions.push(eq(templates.isPremium, true));
    }

    // Search filter - search in title, description, and tags
    if (search && search.trim().length > 0) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(templates.title, searchTerm),
          ilike(templates.description, searchTerm)
        )
      );
    }

    // Combine all conditions
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort order
    let orderByClause;
    switch (sortBy) {
      case "popular":
        orderByClause = [desc(templates.usageCount30Days), desc(templates.usageCount)];
        break;
      case "new":
        orderByClause = [desc(templates.createdAt)];
        break;
      case "alphabetical":
        orderByClause = [asc(templates.title)];
        break;
      default:
        orderByClause = [desc(templates.usageCount30Days)];
    }

    // Execute query with pagination
    const templateResults = await db
      .select()
      .from(templates)
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(limit + 1) // Fetch one extra to determine if there are more
      .offset(offset);

    // Get total count for the query
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(templates)
      .where(whereClause);

    const total = Number(totalResult[0]?.count || 0);

    // Determine if there are more results
    const hasMore = templateResults.length > limit;

    // Return only the requested limit
    const resultTemplates = hasMore
      ? templateResults.slice(0, limit)
      : templateResults;

    return {
      templates: resultTemplates as Template[],
      total,
      hasMore
    };
  } catch (error) {
    console.error("Error fetching templates:", error);
    throw new Error("Failed to fetch templates");
  }
}

/**
 * Get a single template by ID
 * Server action that fetches a template with full details
 *
 * @param id - Template ID
 * @returns Promise<Template> - The template
 * @throws Error if template not found or query fails
 */
export async function getTemplateById(id: string): Promise<Template> {
  try {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);

    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    return template as Template;
  } catch (error) {
    console.error("Error fetching template:", error);
    throw error instanceof Error ? error : new Error("Failed to fetch template");
  }
}

/**
 * Use a template to generate content
 * Server action that initiates content generation from a template
 *
 * @param templateId - Template ID
 * @param projectId - Project ID
 * @param platform - Target platform for generation
 * @returns Promise<{ generatedContentId: string; status: string }> - Generated content info
 * @throws Error if validation fails or generation cannot be initiated
 */
export async function useTemplate(
  templateId: string,
  projectId: string,
  platform: Platform
): Promise<{ generatedContentId: string; status: string }> {
  try {
    // Get authenticated user
    const user = await getUser();

    // Validate project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
      .limit(1);

    if (!project) {
      throw new Error("Project not found or access denied");
    }

    // Fetch template
    const template = await getTemplateById(templateId);

    // Check if template is premium and validate subscription
    if (template.isPremium) {
      // TODO: Implement subscription check with Stack Auth
      // For now, we'll allow all templates
      // const subscription = await getSubscriptionStatus();
      // if (!subscription.isSubscribed) {
      //   throw new Error("SUBSCRIPTION_REQUIRED");
      // }
    }

    // Fetch project images to validate categories
    const { images } = await import("@/db/schema");
    const projectImages = await db
      .select()
      .from(images)
      .where(eq(images.projectId, projectId));

    // Extract available categories from project images
    const availableCategories = [
      ...new Set(projectImages.map((img) => img.category).filter(Boolean))
    ] as string[];

    // Validate required categories
    const requiredCategories = (template.requiredCategories || []) as string[];
    const missingCategories = requiredCategories.filter(
      (cat) => !availableCategories.includes(cat)
    );

    if (missingCategories.length > 0) {
      throw new Error(
        `MISSING_CATEGORIES: ${missingCategories.join(", ")}`
      );
    }

    // Create generated content record
    const generatedContentId = `gc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.insert(generatedContent).values({
      id: generatedContentId,
      projectId,
      templateId,
      contentType: template.contentType,
      outputUrl: "", // Will be populated when generation completes
      status: "pending",
      metadata: {
        platform
      }
    });

    // TODO: Trigger actual content generation (Task 29)
    // For now, we just create the record with pending status

    // Increment template usage count
    await db
      .update(templates)
      .set({
        usageCount: sql`${templates.usageCount} + 1`,
        usageCount30Days: sql`${templates.usageCount30Days} + 1`,
        updatedAt: new Date()
      })
      .where(eq(templates.id, templateId));

    return {
      generatedContentId,
      status: "pending"
    };
  } catch (error) {
    console.error("Error using template:", error);
    throw error instanceof Error ? error : new Error("Failed to use template");
  }
}

/**
 * Get generation status for generated content
 * Server action that fetches the status of content generation
 *
 * @param id - Generated content ID
 * @returns Promise<GeneratedContent> - Generated content with status
 * @throws Error if not found or access denied
 */
export async function getGenerationStatus(
  id: string
): Promise<GeneratedContent> {
  try {
    // Get authenticated user
    const user = await getUser();

    // Fetch generated content with project ownership validation
    const [content] = await db
      .select()
      .from(generatedContent)
      .innerJoin(projects, eq(generatedContent.projectId, projects.id))
      .where(
        and(
          eq(generatedContent.id, id),
          eq(projects.userId, user.id)
        )
      )
      .limit(1);

    if (!content) {
      throw new Error("Generated content not found or access denied");
    }

    return content.generated_content as GeneratedContent;
  } catch (error) {
    console.error("Error fetching generation status:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to fetch generation status");
  }
}

/**
 * Get all generated content for a project
 * Server action that fetches all generated content for a project
 *
 * @param projectId - Project ID
 * @returns Promise<GeneratedContent[]> - Array of generated content
 * @throws Error if project not found or access denied
 */
export async function getProjectGeneratedContent(
  projectId: string
): Promise<GeneratedContent[]> {
  try {
    // Get authenticated user
    const user = await getUser();

    // Validate project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
      .limit(1);

    if (!project) {
      throw new Error("Project not found or access denied");
    }

    // Fetch all generated content for the project
    const content = await db
      .select()
      .from(generatedContent)
      .where(eq(generatedContent.projectId, projectId))
      .orderBy(desc(generatedContent.generatedAt));

    return content as GeneratedContent[];
  } catch (error) {
    console.error("Error fetching project generated content:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to fetch generated content");
  }
}
