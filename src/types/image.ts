/**
 * Image data types for upload and processing
 */

export type UploadStatus = "pending" | "uploading" | "uploaded" | "error";

export interface ImageData {
  id: string;
  file: File;
  previewUrl: string;
  uploadStatus: UploadStatus;
  uploadUrl?: string;
  category?: string;
  confidence?: number;
  error?: string;
  metadata?: ImageMetadata;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  lastModified: number;
}

/**
 * Generate a preview URL from a File object using FileReader
 * @param file - The image file
 * @returns Promise that resolves to the preview URL
 */
export async function generatePreviewUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error("Failed to read file"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Get image metadata (dimensions, format, size)
 * @param file - The image file
 * @param previewUrl - The preview URL (data URL or object URL)
 * @returns Promise that resolves to image metadata
 */
export async function getImageMetadata(
  file: File,
  previewUrl: string
): Promise<ImageMetadata> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        format: file.type,
        size: file.size,
        lastModified: file.lastModified,
      });
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = previewUrl;
  });
}

/**
 * Create ImageData object from a File
 * @param file - The image file
 * @returns Promise that resolves to ImageData
 */
export async function createImageData(file: File): Promise<ImageData> {
  const id = `${file.name}-${file.size}-${file.lastModified}`;
  const previewUrl = await generatePreviewUrl(file);
  const metadata = await getImageMetadata(file, previewUrl);

  return {
    id,
    file,
    previewUrl,
    uploadStatus: "pending",
    metadata,
  };
}

/**
 * Create multiple ImageData objects from an array of Files
 * @param files - Array of image files
 * @returns Promise that resolves to array of ImageData
 */
export async function createImageDataArray(files: File[]): Promise<ImageData[]> {
  const promises = files.map((file) => createImageData(file));
  return Promise.all(promises);
}
