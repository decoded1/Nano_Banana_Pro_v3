/**
 * Generation Types
 *
 * Type definitions for image generation with Gemini API.
 * These were extracted from geminiService.ts for proper separation.
 */

/**
 * Image data with base64 encoding
 */
export interface ImageData {
  /** Base64-encoded image data */
  data: string;
  /** MIME type (e.g., 'image/png', 'image/jpeg') */
  mimeType: string;
  /** Whether this reference is active */
  active?: boolean;
}

/**
 * Pinned rule for generation
 */
export interface PinnedRule {
  /** Unique identifier */
  id: string;
  /** Rule text */
  text: string;
  /** Whether this rule is active */
  active: boolean;
}

/**
 * Generation configuration options
 */
export interface GenerationConfig {
  /** Output aspect ratio */
  aspectRatio?: string;
  /** Output image size (1K, 2K, 4K) */
  imageSize?: string;
  /** Number of images to generate (1-4) */
  numberOfImages?: number;
  /** Person generation setting */
  personGeneration?: string;
  /** Negative prompt (what to avoid) */
  negativePrompt?: string;
  /** Whether to add SynthID watermark */
  addWatermark?: boolean;
  /** Whether to use Google Search grounding */
  useGoogleSearch?: boolean;
}

/**
 * Part of a conversation turn
 */
export interface ConversationPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

/**
 * A turn in the conversation history
 */
export interface ConversationTurn {
  /** Role: 'user' or 'model' */
  role: 'user' | 'model';
  /** Parts of this turn */
  parts: ConversationPart[];
  /** Timestamp */
  timestamp?: number;
}

/**
 * Result from image generation
 */
export interface GenerationResult {
  /** Generated image data URLs */
  images: string[];
  /** Model response for conversation history */
  modelResponse?: ConversationTurn | undefined;
}
