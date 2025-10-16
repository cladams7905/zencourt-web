/**
 * AI Vision Service for Room Classification
 *
 * This service integrates with OpenAI's GPT-4 Vision API to automatically
 * classify property images by room type for real estate marketing.
 */

import OpenAI from 'openai';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Supported room categories for property image classification
 */
export type RoomCategory =
  | 'exterior-front'
  | 'exterior-backyard'
  | 'living-room'
  | 'kitchen'
  | 'dining-room'
  | 'bedroom'
  | 'bathroom'
  | 'garage'
  | 'office'
  | 'laundry-room'
  | 'basement'
  | 'other';

/**
 * Room classification result from AI analysis
 */
export interface RoomClassification {
  /** Detected room category */
  category: RoomCategory;
  /** Confidence score (0-1) */
  confidence: number;
  /** Brief explanation of the classification decision */
  reasoning?: string;
  /** Key features detected in the image */
  features?: string[];
}

/**
 * Error types that can occur during AI vision processing
 */
export class AIVisionError extends Error {
  constructor(
    message: string,
    public code: 'API_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'RATE_LIMIT',
    public details?: unknown
  ) {
    super(message);
    this.name = 'AIVisionError';
  }
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get OpenAI API client instance
 * Expects OPENAI_API_KEY environment variable to be set
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new AIVisionError(
      'OpenAI API key not found. Please set OPENAI_API_KEY environment variable.',
      'API_ERROR'
    );
  }

  return new OpenAI({
    apiKey,
    // Use dangerouslyAllowBrowser only for client-side usage
    // In production, API calls should go through server-side routes
    dangerouslyAllowBrowser: typeof window !== 'undefined',
  });
}

/**
 * Room classification prompt template
 * This prompt guides the AI to accurately classify property images
 */
const CLASSIFICATION_PROMPT = `You are an expert real estate image classifier. Analyze this property image and classify the room type.

IMPORTANT CLASSIFICATION RULES:
1. Choose the MOST SPECIFIC category that fits the image
2. Only use "other" if the image truly doesn't fit any category
3. Consider the primary purpose of the space shown
4. Look for distinctive features (appliances, furniture, fixtures)

AVAILABLE CATEGORIES:
- exterior-front: Front view of house/building exterior, curb appeal shots
- exterior-backyard: Backyard, patio, deck, pool, or rear exterior views
- living-room: Living room, family room, den, or great room
- kitchen: Kitchen or kitchenette with cooking appliances
- dining-room: Formal or casual dining room, breakfast nook
- bedroom: Any bedroom (master, guest, children's room)
- bathroom: Bathroom, powder room, or ensuite
- garage: Garage, carport, or parking area
- office: Home office, study, library, or workspace
- laundry-room: Laundry room, utility room, or mudroom
- basement: Basement, cellar, or below-grade space
- other: Hallways, closets, storage, or unclear spaces

RESPONSE FORMAT:
You must respond with ONLY a valid JSON object, no additional text. Use this exact structure:
{
  "category": "<one of the categories above>",
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief 1-2 sentence explanation>",
  "features": ["<feature1>", "<feature2>", "<feature3>"]
}

EXAMPLES:
{
  "category": "kitchen",
  "confidence": 0.95,
  "reasoning": "Clear view of modern kitchen with stainless steel appliances, granite countertops, and island.",
  "features": ["refrigerator", "stove", "granite countertops", "pendant lights", "kitchen island"]
}

{
  "category": "bedroom",
  "confidence": 0.88,
  "reasoning": "Room with bed as the central feature, nightstands, and closet visible.",
  "features": ["queen bed", "nightstands", "ceiling fan", "carpet flooring"]
}

Now analyze the provided image and respond with the classification JSON:`;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Classify a single room image using OpenAI Vision API
 *
 * @param imageUrl - Public URL of the image to classify
 * @param options - Optional configuration
 * @returns Promise<RoomClassification> - Classification result
 * @throws AIVisionError - If classification fails
 */
export async function classifyRoom(
  imageUrl: string,
  options: {
    timeout?: number;
    maxRetries?: number;
  } = {}
): Promise<RoomClassification> {
  const { timeout = 30000, maxRetries = 2 } = options;

  let lastError: Error | null = null;

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const client = getOpenAIClient();

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new AIVisionError(
            `AI vision request timed out after ${timeout}ms`,
            'TIMEOUT'
          ));
        }, timeout);
      });

      // Create API request promise
      const apiPromise = client.chat.completions.create({
        model: 'gpt-4o', // Using gpt-4o which supports vision
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: CLASSIFICATION_PROMPT,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high', // Use high detail for better classification
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for more consistent classifications
      });

      // Race between API call and timeout
      const response = await Promise.race([apiPromise, timeoutPromise]);

      // Extract and parse response
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new AIVisionError(
          'No content in API response',
          'INVALID_RESPONSE',
          response
        );
      }

      // Parse JSON response
      const classification = parseClassificationResponse(content);

      // Validate the classification
      validateClassification(classification);

      return classification;

    } catch (error) {
      lastError = error as Error;

      // Check if it's a rate limit error
      if (error instanceof Error && error.message.includes('rate_limit')) {
        throw new AIVisionError(
          'OpenAI API rate limit exceeded. Please try again later.',
          'RATE_LIMIT',
          error
        );
      }

      // If this is the last retry, throw the error
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // All retries failed, throw the last error
  throw new AIVisionError(
    `Failed to classify room after ${maxRetries + 1} attempts: ${lastError?.message}`,
    'API_ERROR',
    lastError
  );
}

/**
 * Parse the AI response content into a RoomClassification object
 */
function parseClassificationResponse(content: string): RoomClassification {
  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonContent = content.trim();

    // Remove markdown code blocks if present
    const codeBlockMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1];
    }

    // Parse JSON
    const parsed = JSON.parse(jsonContent);

    // Return structured classification
    return {
      category: parsed.category as RoomCategory,
      confidence: parseFloat(parsed.confidence),
      reasoning: parsed.reasoning,
      features: parsed.features || [],
    };
  } catch (error) {
    throw new AIVisionError(
      'Failed to parse AI response as JSON',
      'INVALID_RESPONSE',
      { content, error }
    );
  }
}

/**
 * Validate that the classification response has valid values
 */
function validateClassification(classification: RoomClassification): void {
  const validCategories: RoomCategory[] = [
    'exterior-front',
    'exterior-backyard',
    'living-room',
    'kitchen',
    'dining-room',
    'bedroom',
    'bathroom',
    'garage',
    'office',
    'laundry-room',
    'basement',
    'other',
  ];

  // Check category is valid
  if (!validCategories.includes(classification.category)) {
    throw new AIVisionError(
      `Invalid room category: ${classification.category}`,
      'INVALID_RESPONSE',
      classification
    );
  }

  // Check confidence is in valid range
  if (
    typeof classification.confidence !== 'number' ||
    classification.confidence < 0 ||
    classification.confidence > 1
  ) {
    throw new AIVisionError(
      `Invalid confidence value: ${classification.confidence}`,
      'INVALID_RESPONSE',
      classification
    );
  }
}

// ============================================================================
// Batch Processing Functions
// ============================================================================

/**
 * Result of a batch classification request
 */
export interface BatchClassificationResult {
  /** The image URL that was classified */
  imageUrl: string;
  /** Whether the classification was successful */
  success: boolean;
  /** Classification result (if successful) */
  classification: RoomClassification | null;
  /** Error message (if failed) */
  error: string | null;
  /** Processing duration in milliseconds */
  duration: number;
}

/**
 * Progress callback for batch operations
 */
export type BatchProgressCallback = (completed: number, total: number, result: BatchClassificationResult) => void;

/**
 * Helper function to process items in batches with concurrency control
 */
async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    concurrency: number;
    onProgress?: (completed: number, total: number, result: R) => void;
  }
): Promise<R[]> {
  const { concurrency, onProgress } = options;
  const results: R[] = [];
  let completed = 0;

  // Process items in chunks
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map(item => processor(item))
    );

    // Process results
    for (const result of chunkResults) {
      const processedResult = result.status === 'fulfilled'
        ? result.value
        : result.reason;

      results.push(processedResult);
      completed++;

      if (onProgress) {
        onProgress(completed, items.length, processedResult);
      }
    }
  }

  return results;
}

/**
 * Classify multiple room images in batch with rate limiting
 *
 * This function processes multiple images concurrently while respecting
 * API rate limits. It handles partial failures gracefully, allowing some
 * images to fail while others succeed.
 *
 * @param imageUrls - Array of public image URLs to classify
 * @param options - Batch processing options
 * @returns Promise<BatchClassificationResult[]> - Array of results for each image
 */
export async function classifyRoomBatch(
  imageUrls: string[],
  options: {
    /** Maximum concurrent requests (default: 10) */
    concurrency?: number;
    /** Timeout per image in milliseconds (default: 30000) */
    timeout?: number;
    /** Max retries per image (default: 2) */
    maxRetries?: number;
    /** Progress callback function */
    onProgress?: BatchProgressCallback;
  } = {}
): Promise<BatchClassificationResult[]> {
  const {
    concurrency = 10,
    timeout = 30000,
    maxRetries = 2,
    onProgress,
  } = options;

  // Validate input
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    throw new AIVisionError(
      'imageUrls must be a non-empty array',
      'API_ERROR'
    );
  }

  // Process each image URL
  const processor = async (imageUrl: string): Promise<BatchClassificationResult> => {
    const startTime = Date.now();

    try {
      const classification = await classifyRoom(imageUrl, {
        timeout,
        maxRetries,
      });

      const duration = Date.now() - startTime;

      return {
        imageUrl,
        success: true,
        classification,
        error: null,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        imageUrl,
        success: false,
        classification: null,
        error: errorMessage,
        duration,
      };
    }
  };

  // Process in batches with concurrency control
  const results = await processBatch(imageUrls, processor, {
    concurrency,
    onProgress,
  });

  return results;
}

/**
 * Get statistics from batch classification results
 */
export function getBatchStatistics(results: BatchClassificationResult[]) {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = results.length > 0 ? totalDuration / results.length : 0;

  // Count by category
  const categoryCount: Record<string, number> = {};
  results.forEach(result => {
    if (result.success && result.classification) {
      const category = result.classification.category;
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    }
  });

  // Average confidence
  const confidences = results
    .filter(r => r.success && r.classification)
    .map(r => r.classification!.confidence);
  const avgConfidence = confidences.length > 0
    ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    : 0;

  return {
    total: results.length,
    successful,
    failed,
    successRate: results.length > 0 ? (successful / results.length) * 100 : 0,
    totalDuration,
    avgDuration,
    avgConfidence,
    categoryCount,
  };
}

// ============================================================================
// AI Vision Service Interface
// ============================================================================

/**
 * AI Vision Service for room classification
 */
export const aiVisionService = {
  /**
   * Classify a single room image
   */
  classifyRoom,

  /**
   * Classify multiple room images in batch
   */
  classifyRoomBatch,

  /**
   * Get statistics from batch results
   */
  getBatchStatistics,

  /**
   * Check if the service is properly configured
   */
  isConfigured: (): boolean => {
    return !!(process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY);
  },

  /**
   * Get service configuration status
   */
  getStatus: (): { configured: boolean; message: string } => {
    const configured = aiVisionService.isConfigured();
    return {
      configured,
      message: configured
        ? 'AI Vision service is ready'
        : 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.',
    };
  },
};

// ============================================================================
// Exports
// ============================================================================

export default aiVisionService;
