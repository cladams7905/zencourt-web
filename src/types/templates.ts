/**
 * Template Marketplace Types
 *
 * Type definitions for content templates, generated content, and related entities
 */

// ============================================================================
// Platform Types
// ============================================================================

/**
 * Supported social media and content platforms
 */
export type Platform =
  | "instagram-post"
  | "instagram-reel"
  | "instagram-story"
  | "tiktok"
  | "facebook-post"
  | "facebook-story"
  | "youtube-short"
  | "youtube"
  | "linkedin"
  | "print";

/**
 * Platform specification with dimensions and constraints
 */
export interface PlatformSpec {
  platform: Platform;
  width: number;
  height: number;
  aspectRatio: string; // "9:16", "1:1", "4:5", etc.
  maxDuration?: number; // For videos (seconds)
  maxFileSize?: number; // In bytes
}

// ============================================================================
// Content Types
// ============================================================================

/**
 * Type of content that can be generated
 */
export type ContentType = "video" | "post" | "flyer";

/**
 * Generation status
 */
export type GenerationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

// ============================================================================
// Template Entity
// ============================================================================

/**
 * Content template for marketplace
 */
export interface Template {
  id: string;
  title: string;
  description: string;
  contentType: ContentType;
  platforms: Platform[];
  previewImageUrl: string;
  previewVideoUrl: string | null;
  exampleOutputUrls: string[];
  isPremium: boolean;
  requiredCategories: string[]; // Room categories needed
  tags: string[]; // Style tags (modern, luxury, etc.)
  usageCount: number;
  usageCount30Days: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template for creating new template (insert)
 */
export interface NewTemplate {
  id: string;
  title: string;
  description: string;
  contentType: ContentType;
  platforms: Platform[];
  previewImageUrl: string;
  previewVideoUrl?: string | null;
  exampleOutputUrls?: string[];
  isPremium?: boolean;
  requiredCategories?: string[];
  tags?: string[];
  usageCount?: number;
  usageCount30Days?: number;
}

// ============================================================================
// Generated Content Entity
// ============================================================================

/**
 * Metadata for generated content
 */
export interface GeneratedContentMetadata {
  duration?: number; // For videos
  dimensions?: {
    width: number;
    height: number;
  };
  fileSize?: number;
  platform: Platform;
}

/**
 * Content generated from a template
 */
export interface GeneratedContent {
  id: string;
  projectId: string;
  templateId: string;
  contentType: ContentType;
  outputUrl: string;
  thumbnailUrl: string | null;
  status: GenerationStatus;
  metadata: GeneratedContentMetadata | null;
  generatedAt: Date;
  error: string | null;
}

/**
 * Generated content for creating (insert)
 */
export interface NewGeneratedContent {
  id: string;
  projectId: string;
  templateId: string;
  contentType: ContentType;
  outputUrl: string;
  thumbnailUrl?: string | null;
  status?: GenerationStatus;
  metadata?: GeneratedContentMetadata | null;
  error?: string | null;
}

// ============================================================================
// Subscription Types
// ============================================================================

/**
 * User subscription status from Stack Auth
 */
export interface SubscriptionStatus {
  isSubscribed: boolean;
  plan: "free" | "premium" | "enterprise";
  expiresAt?: Date;
  features: {
    premiumTemplates: boolean;
    maxProjects: number;
    maxVideosPerMonth: number;
  };
}

// ============================================================================
// Filter and Sort Types
// ============================================================================

/**
 * Template filters for marketplace
 */
export interface TemplateFilters {
  contentType: ContentType | null;
  platform: Platform | null;
  style: string | null;
  subscriptionStatus: "all" | "free" | "premium";
}

/**
 * Sort options for templates
 */
export type SortOption = "popular" | "new" | "alphabetical";

/**
 * Template query parameters
 */
export interface TemplateQuery {
  search?: string;
  contentType?: ContentType;
  platform?: Platform;
  style?: string;
  subscriptionStatus?: "all" | "free" | "premium";
  sortBy?: SortOption;
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

// ============================================================================
// Generation Request/Response Types
// ============================================================================

/**
 * Request to generate content from template
 */
export interface UseTemplateRequest {
  projectId: string;
  templateId: string;
  platform: Platform;
}

/**
 * Response from template usage
 */
export interface UseTemplateResponse {
  success: boolean;
  generatedContentId?: string;
  status?: GenerationStatus;
  estimatedCompletionTime?: number; // seconds
  error?: string;
}

/**
 * Generation status response
 */
export interface GenerationStatusResponse {
  success: boolean;
  status: GenerationStatus;
  progress?: number; // 0-100
  outputUrl?: string;
  error?: string;
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  valid: boolean;
  missingCategories: string[];
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for template operations
 */
export type TemplateErrorCode =
  | "MISSING_CATEGORIES"
  | "SUBSCRIPTION_REQUIRED"
  | "TEMPLATE_NOT_FOUND"
  | "PROJECT_NOT_FOUND"
  | "GENERATION_FAILED"
  | "INVALID_PLATFORM"
  | "UNAUTHORIZED";

/**
 * Template operation error
 */
export interface TemplateError {
  code: TemplateErrorCode;
  message: string;
  details?: {
    missingCategories?: string[];
    requiredPlan?: string;
    [key: string]: any;
  };
}
