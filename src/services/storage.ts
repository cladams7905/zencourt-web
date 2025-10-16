/**
 * Storage Service
 *
 * Handles file uploads to cloud storage.
 * Currently using mock implementation with local object URLs.
 *
 * TODO: Replace with Vercel Blob Storage when ready:
 * 1. Install: npm install @vercel/blob
 * 2. Add BLOB_READ_WRITE_TOKEN to .env.local
 * 3. Uncomment the Vercel Blob implementation below
 */

// import { put } from '@vercel/blob';

export interface UploadResult {
  id: string;
  url: string;
  status: "success" | "error";
  error?: string;
}

export interface StorageService {
  uploadFile(file: File, folder: string): Promise<string>;
  uploadFiles(files: File[], folder: string): Promise<UploadResult[]>;
  deleteFile?(url: string): Promise<void>;
}

/**
 * Upload a single file to storage
 * @param file - File to upload
 * @param folder - Folder path for organization (e.g., "projects/abc123")
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
  try {
    // MOCK IMPLEMENTATION - Replace with real storage
    // Simulates upload delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Create a temporary object URL for preview purposes
    const objectUrl = URL.createObjectURL(file);

    // TODO: Replace with Vercel Blob Storage
    /*
    const blob = await put(`${folder}/${file.name}`, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
    */

    return objectUrl;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error(`Failed to upload ${file.name}`);
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
        status: "success" as const,
      };
    } catch (error) {
      return {
        id: generateFileId(file),
        url: "",
        status: "error" as const,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  });

  return Promise.all(uploadPromises);
}

/**
 * Delete a file from storage
 * @param url - URL of the file to delete
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    // MOCK IMPLEMENTATION - Replace with real storage
    // For object URLs, we can revoke them
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }

    // TODO: Replace with Vercel Blob Storage
    /*
    import { del } from '@vercel/blob';
    await del(url, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    */
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
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
 */
export function getProjectFolder(projectId: string): string {
  return `projects/${projectId}`;
}

export const storageService: StorageService = {
  uploadFile,
  uploadFiles,
  deleteFile,
};
