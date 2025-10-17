/**
 * Storage Service
 *
 * Handles file uploads via API routes to Vercel Blob Storage.
 */

import { UploadResult } from "@/types/images";

export interface StorageService {
  uploadFile(file: File, folder: string): Promise<string>;
  uploadFiles(files: File[], folder: string): Promise<UploadResult[]>;
  deleteFile?(url: string): Promise<void>;
}

/**
 * Upload a single file to storage via API route
 * @param file - File to upload
 * @param folder - Folder path for organization (e.g., "projects/abc123")
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const response = await fetch("/api/blob", {
      method: "PUT",
      body: formData
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Upload failed");
    }

    return data.url;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error(
      `Failed to upload ${file.name}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Upload multiple files to storage with individual error handling
 * @param files - Array of files to upload
 * @param folder - Folder path for organization
 * @returns Array of upload results with status for each file
 */
export async function uploadFiles(
  files: File[],
  folder: string
): Promise<UploadResult[]> {
  const uploadPromises = files.map(async (file) => {
    try {
      const url = await uploadFile(file, folder);
      return {
        id: generateFileId(file),
        url,
        status: "success" as const
      };
    } catch (error) {
      return {
        id: generateFileId(file),
        url: "",
        status: "error" as const,
        error: error instanceof Error ? error.message : "Upload failed"
      };
    }
  });

  return Promise.all(uploadPromises);
}

/**
 * Delete a file from storage via API route
 * @param url - URL of the file to delete
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    const response = await fetch("/api/blob", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Delete failed");
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error(
      `Failed to delete file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generate a unique ID for a file based on its properties
 */
function generateFileId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * Get the folder path for a project
 * @param projectId - Project ID (can be temp-{timestamp} or final project name)
 * @param userId - Optional user ID for user-scoped folders
 */
export function getProjectFolder(projectId: string, userId?: string): string {
  if (userId) {
    return `${userId}/projects/${projectId}`;
  }
  return `projects/${projectId}`;
}

/**
 * Generate a temporary project ID
 */
export function generateTempProjectId(): string {
  return `temp-${Date.now()}`;
}

export const storageService: StorageService = {
  uploadFile,
  uploadFiles,
  deleteFile
};
