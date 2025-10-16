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

import { uploadFiles, getProjectFolder, type UploadResult } from './storage';
import {
  classifyRoomBatch,
  getBatchStatistics,
  type RoomClassification,
  type BatchClassificationResult,
} from './aiVision';
import type { ImageData } from '@/types/image';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Processing phase for tracking progress
 */
export type ProcessingPhase = 'uploading' | 'analyzing' | 'categorizing' | 'complete' | 'error';

/**
 * Status for individual image processing
 */
export type ImageProcessingStatus = 'pending' | 'uploading' | 'uploaded' | 'analyzing' | 'analyzed' | 'error';

/**
 * Processed image with all data
 */
export interface ProcessedImage {
  /** Unique identifier */
  id: string;
  /** Original file */
  file: File;
  /** Preview URL (data URL or object URL) */
  previewUrl: string;
  /** Uploaded file URL */
  uploadUrl?: string;
  /** AI classification result */
  classification?: RoomClassification;
  /** Processing status */
  status: ImageProcessingStatus;
  /** Error message if failed */
  error?: string;
}

/**
 * Progress update callback
 */
export interface ProcessingProgress {
  /** Current processing phase */
  phase: ProcessingPhase;
  /** Number of completed items in current phase */
  completed: number;
  /** Total items in current phase */
  total: number;
  /** Overall progress percentage (0-100) */
  overallProgress: number;
  /** Current image being processed (optional) */
  currentImage?: ProcessedImage;
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: ProcessingProgress) => void;

/**
 * Final processing result
 */
export interface ProcessingResult {
  /** All processed images */
  images: ProcessedImage[];
  /** Processing statistics */
  stats: {
    total: number;
    uploaded: number;
    analyzed: number;
    failed: number;
    successRate: number;
    avgConfidence: number;
    totalDuration: number;
  };
  /** Categorized images by room type */
  categorized: CategorizedImages;
}

/**
 * Images grouped by category
 */
export interface CategorizedImages {
  [category: string]: ProcessedImage[];
}

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
    this.name = 'ImageProcessingError';
  }
}

// ============================================================================
// Main Processing Functions
// ============================================================================

/**
 * Process images through complete workflow: upload → analyze → categorize
 *
 * @param imageDataList - Array of ImageData objects to process
 * @param projectId - Project identifier for storage organization
 * @param options - Processing options
 * @returns Promise<ProcessingResult> - Complete processing results
 */
export async function processImages(
  imageDataList: ImageData[],
  projectId: string,
  options: {
    /** Progress callback for UI updates */
    onProgress?: ProgressCallback;
    /** AI analysis concurrency (default: 10) */
    aiConcurrency?: number;
    /** Skip AI analysis (upload only) */
    skipAnalysis?: boolean;
  } = {}
): Promise<ProcessingResult> {
  const { onProgress, aiConcurrency = 10, skipAnalysis = false } = options;
  const startTime = Date.now();

  // Initialize processed images array
  const processedImages: ProcessedImage[] = imageDataList.map((img) => ({
    id: img.id,
    file: img.file,
    previewUrl: img.previewUrl,
    status: 'pending' as const,
  }));

  try {
    // Phase 1: Upload images
    const uploadedImages = await uploadImages(processedImages, projectId, (completed, total) => {
      if (onProgress) {
        onProgress({
          phase: 'uploading',
          completed,
          total,
          overallProgress: skipAnalysis ? (completed / total) * 100 : (completed / total) * 50,
        });
      }
    });

    // If skipping analysis, return early
    if (skipAnalysis) {
      const duration = Date.now() - startTime;
      const stats = calculateStats(uploadedImages, duration);
      const categorized = categorizeImages(uploadedImages);

      if (onProgress) {
        onProgress({
          phase: 'complete',
          completed: uploadedImages.length,
          total: uploadedImages.length,
          overallProgress: 100,
        });
      }

      return {
        images: uploadedImages,
        stats,
        categorized,
      };
    }

    // Phase 2: Analyze images with AI
    const analyzedImages = await analyzeImages(uploadedImages, aiConcurrency, (completed, total, result) => {
      if (onProgress) {
        onProgress({
          phase: 'analyzing',
          completed,
          total,
          overallProgress: 50 + (completed / total) * 45,
          currentImage: result,
        });
      }
    });

    // Phase 3: Categorize results
    if (onProgress) {
      onProgress({
        phase: 'categorizing',
        completed: 0,
        total: 1,
        overallProgress: 95,
      });
    }

    const categorized = categorizeImages(analyzedImages);
    const duration = Date.now() - startTime;
    const stats = calculateStats(analyzedImages, duration);

    // Complete
    if (onProgress) {
      onProgress({
        phase: 'complete',
        completed: analyzedImages.length,
        total: analyzedImages.length,
        overallProgress: 100,
      });
    }

    return {
      images: analyzedImages,
      stats,
      categorized,
    };
  } catch (error) {
    if (onProgress) {
      onProgress({
        phase: 'error',
        completed: 0,
        total: imageDataList.length,
        overallProgress: 0,
      });
    }

    throw new ImageProcessingError(
      `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'error',
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
  onProgress?: (completed: number, total: number) => void
): Promise<ProcessedImage[]> {
  const folder = getProjectFolder(projectId);
  const files = images.map((img) => img.file);

  // Update all to uploading status
  images.forEach((img) => {
    img.status = 'uploading';
  });

  // Upload files
  const uploadResults = await uploadFiles(files, folder);

  // Update images with upload results
  const updatedImages = images.map((img, index) => {
    const result = uploadResults[index];

    if (result.status === 'success') {
      return {
        ...img,
        uploadUrl: result.url,
        status: 'uploaded' as const,
      };
    } else {
      return {
        ...img,
        status: 'error' as const,
        error: result.error || 'Upload failed',
      };
    }
  });

  // Report progress
  const successCount = updatedImages.filter((img) => img.status === 'uploaded').length;
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
  onProgress?: (completed: number, total: number, result: ProcessedImage) => void
): Promise<ProcessedImage[]> {
  // Filter only successfully uploaded images
  const uploadedImages = images.filter((img) => img.status === 'uploaded' && img.uploadUrl);

  if (uploadedImages.length === 0) {
    throw new ImageProcessingError('No images successfully uploaded for analysis', 'analyzing');
  }

  // Update status to analyzing
  uploadedImages.forEach((img) => {
    img.status = 'analyzing';
  });

  // Extract URLs for batch processing
  const imageUrls = uploadedImages.map((img) => img.uploadUrl!);

  // Classify in batch
  const batchResults = await classifyRoomBatch(imageUrls, {
    concurrency,
    onProgress: (completed, total, batchResult) => {
      // Find corresponding image
      const imageIndex = uploadedImages.findIndex((img) => img.uploadUrl === batchResult.imageUrl);
      if (imageIndex !== -1) {
        const image = uploadedImages[imageIndex];

        if (batchResult.success && batchResult.classification) {
          image.classification = batchResult.classification;
          image.status = 'analyzed';
        } else {
          image.status = 'error';
          image.error = batchResult.error || 'Analysis failed';
        }

        if (onProgress) {
          onProgress(completed, total, image);
        }
      }
    },
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
    } else if (image.status === 'error') {
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
  const failed = images.filter((img) => img.status === 'error').length;

  const confidences = images
    .filter((img) => img.classification)
    .map((img) => img.classification!.confidence);

  const avgConfidence = confidences.length > 0 ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0;

  const successRate = images.length > 0 ? (analyzed / images.length) * 100 : 0;

  return {
    total: images.length,
    uploaded,
    analyzed,
    failed,
    successRate,
    avgConfidence,
    totalDuration: duration,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate image files before processing
 */
export function validateImageFiles(files: File[]): {
  valid: File[];
  invalid: Array<{ file: File; reason: string }>;
} {
  const valid: File[] = [];
  const invalid: Array<{ file: File; reason: string }> = [];

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  files.forEach((file) => {
    // Check file type
    if (!validTypes.includes(file.type)) {
      invalid.push({
        file,
        reason: `Invalid file type: ${file.type}. Accepted: jpg, jpeg, png, webp`,
      });
      return;
    }

    // Check file size
    if (file.size > maxSize) {
      invalid.push({
        file,
        reason: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 10MB`,
      });
      return;
    }

    // Check file name
    if (!file.name || file.name.length === 0) {
      invalid.push({
        file,
        reason: 'Invalid file name',
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
export function estimateProcessingTime(imageCount: number, concurrency: number = 10): number {
  // Rough estimates:
  // - Upload: 500ms per image (parallel, so faster)
  // - AI analysis: 3000ms per image (batched by concurrency)

  const uploadTime = 500; // Max time for parallel uploads
  const analysisTimePerBatch = 3000;
  const batches = Math.ceil(imageCount / concurrency);
  const totalAnalysisTime = batches * analysisTimePerBatch;

  return uploadTime + totalAnalysisTime;
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
};

// ============================================================================
// Exports
// ============================================================================

export default imageProcessorService;
