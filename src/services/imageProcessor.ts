/**
 * Image Processor Service
 *
 * Orchestrates the complete image processing workflow:
 * 1. Upload images to cloud storage
 * 2. Analyze images with AI vision
 * 3. Categorize results
 * 4. Provide progress updates
 *
 * This service coordinates between storage and AI services to provide
 * a unified interface for processing property images.
 */

import { uploadFiles, getProjectFolder } from "./storage";
import { classifyRoomBatch } from "./aiVision";
import type {
  ProcessedImage,
  ProcessingPhase,
  ProgressCallback,
  ProcessingResult,
  CategorizedImages,
  ImageMetadata
} from "@/types/images";

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error during processing
 */
export class ImageProcessingError extends Error {
  constructor(
    message: string,
    public phase: ProcessingPhase,
    public details?: unknown
  ) {
    super(message);
    this.name = "ImageProcessingError";
  }
}

// ============================================================================
// Main Processing Functions
// ============================================================================

/**
 * Process images through complete workflow: upload → analyze → categorize
 *
 * @param imageDataList - Array of ProcessedImage objects to process
 * @param projectId - Project identifier for storage organization
 * @param options - Processing options
 * @returns Promise<ProcessingResult> - Complete processing results
 */
async function processImages(
  imageDataList: ProcessedImage[],
  projectId: string,
  options: {
    /** Progress callback for UI updates */
    onProgress?: ProgressCallback;
    /** AI analysis concurrency (default: 10) */
    aiConcurrency?: number;
    /** Skip AI analysis (upload only) */
    skipAnalysis?: boolean;
    /** User ID for upload folder structure (required if images need uploading) */
    userId?: string;
  } = {}
): Promise<ProcessingResult> {
  const {
    onProgress,
    aiConcurrency = 10,
    skipAnalysis = false,
    userId
  } = options;
  const startTime = Date.now();

  // Check if images are already uploaded
  const alreadyUploaded = imageDataList.every(
    (img) => img.status === "uploaded" && img.uploadUrl
  );

  let uploadedImages: ProcessedImage[];

  if (alreadyUploaded) {
    // Skip upload phase - images are already uploaded
    uploadedImages = imageDataList;
    console.log("Images already uploaded, skipping upload phase");
  } else {
    // Initialize processed images array for upload
    const processedImages: ProcessedImage[] = imageDataList.map((img) => ({
      id: img.id,
      file: img.file,
      previewUrl: img.previewUrl,
      status: "pending" as const
    }));

    // Phase 1: Upload images
    uploadedImages = await uploadImages(
      processedImages,
      projectId,
      userId,
      (completed, total) => {
        if (onProgress) {
          onProgress({
            phase: "uploading",
            completed,
            total,
            overallProgress: skipAnalysis
              ? (completed / total) * 100
              : (completed / total) * 50
          });
        }
      }
    );
  }

  try {
    // If skipping analysis, return early
    if (skipAnalysis) {
      const duration = Date.now() - startTime;
      const stats = calculateStats(uploadedImages, duration);
      const categorized = categorizeImages(uploadedImages);

      if (onProgress) {
        onProgress({
          phase: "complete",
          completed: uploadedImages.length,
          total: uploadedImages.length,
          overallProgress: 100
        });
      }

      return {
        images: uploadedImages,
        stats,
        categorized
      };
    }

    // Phase 2: Analyze images with AI
    const analyzedImages = await analyzeImages(
      uploadedImages,
      aiConcurrency,
      (completed, total, result) => {
        if (onProgress) {
          onProgress({
            phase: "analyzing",
            completed,
            total,
            overallProgress: 50 + (completed / total) * 45,
            currentImage: result
          });
        }
      }
    );

    // Phase 3: Categorize results
    if (onProgress) {
      onProgress({
        phase: "categorizing",
        completed: 0,
        total: 1,
        overallProgress: 95
      });
    }

    const categorized = categorizeImages(analyzedImages);
    const duration = Date.now() - startTime;
    const stats = calculateStats(analyzedImages, duration);

    // Complete
    if (onProgress) {
      onProgress({
        phase: "complete",
        completed: analyzedImages.length,
        total: analyzedImages.length,
        overallProgress: 100
      });
    }

    return {
      images: analyzedImages,
      stats,
      categorized
    };
  } catch (error) {
    if (onProgress) {
      onProgress({
        phase: "error",
        completed: 0,
        total: imageDataList.length,
        overallProgress: 0
      });
    }

    throw new ImageProcessingError(
      `Image processing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      "error",
      error
    );
  }
}

/**
 * Upload images to storage
 */
async function uploadImages(
  images: ProcessedImage[],
  projectId: string,
  userId: string | undefined,
  onProgress?: (completed: number, total: number) => void
): Promise<ProcessedImage[]> {
  if (!userId) {
    throw new Error("User ID is required for uploading images");
  }
  const folder = getProjectFolder(projectId, userId);
  const files = images.map((img) => img.file);

  // Update all to uploading status
  images.forEach((img) => {
    img.status = "uploading";
  });

  // Upload files
  const uploadResults = await uploadFiles(files, folder);

  // Update images with upload results
  const updatedImages = images.map((img, index) => {
    const result = uploadResults[index];

    if (result.status === "success") {
      return {
        ...img,
        uploadUrl: result.url,
        status: "uploaded" as const
      };
    } else {
      return {
        ...img,
        status: "error" as const,
        error: result.error || "Upload failed"
      };
    }
  });

  // Report progress
  const successCount = updatedImages.filter(
    (img) => img.status === "uploaded"
  ).length;
  if (onProgress) {
    onProgress(successCount, updatedImages.length);
  }

  return updatedImages;
}

/**
 * Analyze images with AI vision service
 */
async function analyzeImages(
  images: ProcessedImage[],
  concurrency: number,
  onProgress?: (
    completed: number,
    total: number,
    result: ProcessedImage
  ) => void
): Promise<ProcessedImage[]> {
  // Filter only successfully uploaded images
  const uploadedImages = images.filter(
    (img) => img.status === "uploaded" && img.uploadUrl
  );

  if (uploadedImages.length === 0) {
    throw new ImageProcessingError(
      "No images successfully uploaded for analysis",
      "analyzing"
    );
  }

  // Update status to analyzing
  uploadedImages.forEach((img) => {
    img.status = "analyzing";
  });

  // Extract URLs for batch processing
  const imageUrls = uploadedImages.map((img) => img.uploadUrl!);

  // Classify in batch
  await classifyRoomBatch(imageUrls, {
    concurrency,
    onProgress: (completed, total, batchResult) => {
      // Find corresponding image
      const imageIndex = uploadedImages.findIndex(
        (img) => img.uploadUrl === batchResult.imageUrl
      );
      if (imageIndex !== -1) {
        const image = uploadedImages[imageIndex];

        if (batchResult.success && batchResult.classification) {
          image.classification = batchResult.classification;
          image.status = "analyzed";
        } else {
          image.status = "error";
          image.error = batchResult.error || "Analysis failed";
        }

        // Call progress callback with updated image
        if (onProgress) {
          onProgress(completed, total, { ...image });
        }
      }
    }
  });

  return images;
}

/**
 * Categorize images by room type
 */
function categorizeImages(images: ProcessedImage[]): CategorizedImages {
  const categorized: CategorizedImages = {};

  // Group images by category
  images.forEach((image) => {
    if (image.classification) {
      const category = image.classification.category;
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(image);
    } else if (image.status === "error") {
      // Put failed images in an "errors" category
      if (!categorized.errors) {
        categorized.errors = [];
      }
      categorized.errors.push(image);
    } else {
      // Put uncategorized images in "other"
      if (!categorized.other) {
        categorized.other = [];
      }
      categorized.other.push(image);
    }
  });

  return categorized;
}

/**
 * Calculate processing statistics
 */
function calculateStats(images: ProcessedImage[], duration: number) {
  const uploaded = images.filter((img) => img.uploadUrl).length;
  const analyzed = images.filter((img) => img.classification).length;
  const failed = images.filter((img) => img.status === "error").length;

  const confidences = images
    .filter((img) => img.classification)
    .map((img) => img.classification!.confidence);

  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : 0;

  const successRate = images.length > 0 ? (analyzed / images.length) * 100 : 0;

  return {
    total: images.length,
    uploaded,
    analyzed,
    failed,
    successRate,
    avgConfidence,
    totalDuration: duration
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate image files before processing
 */
function validateImageFiles(files: File[]): {
  valid: File[];
  invalid: Array<{ file: File; reason: string }>;
} {
  const valid: File[] = [];
  const invalid: Array<{ file: File; reason: string }> = [];

  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSize = 10 * 1024 * 1024; // 10MB

  files.forEach((file) => {
    // Check file type
    if (!validTypes.includes(file.type)) {
      invalid.push({
        file,
        reason: `Invalid file type: ${file.type}. Accepted: jpg, jpeg, png, webp`
      });
      return;
    }

    // Check file size
    if (file.size > maxSize) {
      invalid.push({
        file,
        reason: `File too large: ${(file.size / 1024 / 1024).toFixed(
          1
        )}MB. Max: 10MB`
      });
      return;
    }

    // Check file name
    if (!file.name || file.name.length === 0) {
      invalid.push({
        file,
        reason: "Invalid file name"
      });
      return;
    }

    valid.push(file);
  });

  return { valid, invalid };
}

/**
 * Estimate processing time based on image count
 */
function estimateProcessingTime(
  imageCount: number,
  concurrency: number = 10
): number {
  // Rough estimates:
  // - Upload: 500ms per image (parallel, so faster)
  // - AI analysis: 3000ms per image (batched by concurrency)

  const uploadTime = 500; // Max time for parallel uploads
  const analysisTimePerBatch = 3000;
  const batches = Math.ceil(imageCount / concurrency);
  const totalAnalysisTime = batches * analysisTimePerBatch;

  return uploadTime + totalAnalysisTime;
}

/**
 * Generate a preview URL from a File object using FileReader
 * @param file - The image file
 * @returns Promise that resolves to the preview URL
 */
async function generatePreviewUrl(file: File): Promise<string> {
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
async function getImageMetadata(
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
        lastModified: file.lastModified
      });
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = previewUrl;
  });
}

/**
 * Create ProcessedImage object from a File
 * @param file - The image file
 * @returns Promise that resolves to ProcessedImage
 */
async function createImageData(file: File): Promise<ProcessedImage> {
  // Generate a unique ID using crypto.randomUUID() to avoid collisions
  // when the same file is uploaded to different projects
  const id = `${crypto.randomUUID()}-${file.name}-${file.size}-${file.lastModified}`;
  const previewUrl = await generatePreviewUrl(file);
  const metadata = await getImageMetadata(file, previewUrl);

  return {
    id,
    file,
    previewUrl,
    status: "pending",
    metadata
  };
}

/**
 * Create multiple ProcessedImage objects from an array of Files
 * @param files - Array of image files
 * @returns Promise that resolves to array of ProcessedImage
 */
async function createImageDataArray(files: File[]): Promise<ProcessedImage[]> {
  const promises = files.map((file) => createImageData(file));
  return Promise.all(promises);
}

// ============================================================================
// Image Processor Service Interface
// ============================================================================

/**
 * Image Processor Service
 */
export const imageProcessorService = {
  /**
   * Process images through complete workflow
   */
  processImages,

  /**
   * Validate image files
   */
  validateImageFiles,

  /**
   * Estimate processing time
   */
  estimateProcessingTime,

  /**
   * Categorize already processed images
   */
  categorizeImages,

  /**
   * Create multiple ProcessedImage objects from an array of Files
   */
  createImageDataArray
};

// ============================================================================
// Exports
// ============================================================================

export default imageProcessorService;
