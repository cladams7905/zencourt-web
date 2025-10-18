"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTemplates,
  getTemplateById,
  useTemplate as useTemplateAction,
  getGenerationStatus,
  getProjectGeneratedContent,
  type TemplateQuery,
  type TemplateQueryResponse
} from "@/db/actions/templates";
import type { Template, GeneratedContent } from "@/types/schema";
import type { Platform } from "@/types/templates";

/**
 * Hook to fetch templates with filtering, search, and pagination
 *
 * @param query - Template query parameters
 * @returns Query result with templates, loading, and error states
 */
export function useTemplates(query: TemplateQuery = {}) {
  return useQuery<TemplateQueryResponse, Error>({
    queryKey: ["templates", query],
    queryFn: () => getTemplates(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook to fetch a single template by ID
 *
 * @param id - Template ID
 * @param enabled - Whether to enable the query (default: true if id is provided)
 * @returns Query result with template, loading, and error states
 */
export function useTemplateById(id: string | null | undefined, enabled = true) {
  return useQuery<Template, Error>({
    queryKey: ["template", id],
    queryFn: () => {
      if (!id) throw new Error("Template ID is required");
      return getTemplateById(id);
    },
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000 // 30 minutes
  });
}

/**
 * Hook to initiate template usage and content generation
 *
 * @returns Mutation to use a template
 */
export function useUseTemplate() {
  const queryClient = useQueryClient();

  return useMutation<
    { generatedContentId: string; status: string },
    Error,
    { templateId: string; projectId: string; platform: Platform }
  >({
    mutationFn: ({ templateId, projectId, platform }) =>
      useTemplateAction(templateId, projectId, platform),
    onSuccess: (data, variables) => {
      // Invalidate templates to update usage counts
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({
        queryKey: ["template", variables.templateId]
      });

      // Invalidate project generated content
      queryClient.invalidateQueries({
        queryKey: ["generated-content", variables.projectId]
      });
    }
  });
}

/**
 * Hook to fetch generation status with polling
 *
 * @param id - Generated content ID
 * @param enabled - Whether to enable the query
 * @returns Query result with generation status
 */
export function useGenerationStatus(
  id: string | null | undefined,
  enabled = true
) {
  return useQuery<GeneratedContent, Error>({
    queryKey: ["generation-status", id],
    queryFn: () => {
      if (!id) throw new Error("Generated content ID is required");
      return getGenerationStatus(id);
    },
    enabled: enabled && !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 3 seconds if status is pending or processing
      if (
        data &&
        (data.status === "pending" || data.status === "processing")
      ) {
        return 3000;
      }
      // Stop polling if completed or failed
      return false;
    },
    staleTime: 0 // Always fetch fresh data
  });
}

/**
 * Hook to fetch all generated content for a project
 *
 * @param projectId - Project ID
 * @param enabled - Whether to enable the query
 * @returns Query result with generated content array
 */
export function useProjectGeneratedContent(
  projectId: string | null | undefined,
  enabled = true
) {
  return useQuery<GeneratedContent[], Error>({
    queryKey: ["generated-content", projectId],
    queryFn: () => {
      if (!projectId) throw new Error("Project ID is required");
      return getProjectGeneratedContent(projectId);
    },
    enabled: enabled && !!projectId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 5 seconds if any content is pending or processing
      if (
        data &&
        data.some((c) => c.status === "pending" || c.status === "processing")
      ) {
        return 5000;
      }
      return false;
    }
  });
}

/**
 * Hook to get error message from an error object
 *
 * @param error - Error object
 * @returns User-friendly error message
 */
export function useTemplateError(error: Error | null): string | null {
  if (!error) return null;

  const message = error.message;

  // Handle specific error codes
  if (message.includes("MISSING_CATEGORIES")) {
    const categories = message.split(": ")[1] || "required categories";
    return `This template requires ${categories}. Please add these categories to your project images.`;
  }

  if (message.includes("SUBSCRIPTION_REQUIRED")) {
    return "This is a premium template. Please upgrade your subscription to use it.";
  }

  if (message.includes("not found")) {
    return "Template not found. It may have been removed.";
  }

  if (message.includes("access denied")) {
    return "You don't have permission to access this content.";
  }

  // Generic error
  return "An error occurred. Please try again.";
}
