/**
 * Generation Types
 *
 * Type definitions for image generation with Gemini API.
 *
 * API Reference: Gemini 3 Pro Image (gemini-3-pro-image-preview)
 * - Max 14 reference images, 7MB per image, 20MB total payload
 * - Character consistency: up to 5 characters
 * - Object composition: up to 6 objects
 * - thoughtSignature required for multi-turn editing
 */

// =============================================================================
// API CONSTANTS
// =============================================================================

/**
 * Model ID for Gemini 3 Pro Image
 */
export const GEMINI_MODEL_ID = 'gemini-3-pro-image-preview' as const;

/**
 * API rate limits and constraints
 */
export const API_LIMITS = {
  /** Maximum reference images per request */
  MAX_REFERENCE_IMAGES: 14,
  /** Maximum single image file size in bytes (7MB) */
  MAX_IMAGE_SIZE_BYTES: 7 * 1024 * 1024,
  /** Maximum request payload size in bytes (20MB) */
  MAX_PAYLOAD_SIZE_BYTES: 20 * 1024 * 1024,
  /** Maximum characters for consistency */
  MAX_CHARACTERS: 5,
  /** Maximum objects for composition */
  MAX_OBJECTS: 6,
  /** Free tier: requests per minute */
  FREE_RPM: 15,
  /** Free tier: requests per day */
  FREE_RPD: 1500,
  /** Paid tier: requests per minute */
  PAID_RPM: 1000,
  /** Paid tier: requests per day */
  PAID_RPD: 30000,
  /** Input token limit */
  INPUT_TOKEN_LIMIT: 65536,
  /** Output token limit */
  OUTPUT_TOKEN_LIMIT: 32768,
} as const;

// =============================================================================
// API STRING LITERAL TYPES (Must match API exactly - case sensitive)
// =============================================================================

/**
 * Output image size (MUST be uppercase)
 */
export type ImageSize = '1K' | '2K' | '4K';

/**
 * All valid image sizes
 */
export const IMAGE_SIZES: ImageSize[] = ['1K', '2K', '4K'];

/**
 * Output aspect ratio options
 */
export type AspectRatio =
  | '1:1'
  | '9:16'
  | '16:9'
  | '3:4'
  | '4:3'
  | '3:2'
  | '2:3'
  | '5:4'
  | '4:5'
  | '21:9';

/**
 * All valid aspect ratios
 */
export const ASPECT_RATIOS: AspectRatio[] = [
  '1:1',
  '9:16',
  '16:9',
  '3:4',
  '4:3',
  '3:2',
  '2:3',
  '5:4',
  '4:5',
  '21:9',
];

/**
 * Person generation setting
 * - ALLOW_ADULT: Only adult faces (default)
 * - ALLOW_ALL: All people including children
 * - DONT_ALLOW: Hard block on generating people
 */
export type PersonGeneration = 'ALLOW_ADULT' | 'ALLOW_ALL' | 'DONT_ALLOW';

/**
 * All person generation options
 */
export const PERSON_GENERATION_OPTIONS: PersonGeneration[] = [
  'ALLOW_ADULT',
  'ALLOW_ALL',
  'DONT_ALLOW',
];

/**
 * Number of images to generate (1-4)
 */
export type NumberOfImages = 1 | 2 | 3 | 4;

/**
 * Supported input MIME types
 */
export type SupportedMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/heic'
  | 'image/heif';

// =============================================================================
// IMAGE DATA
// =============================================================================

/**
 * Image data with base64 encoding
 */
export interface ImageData {
  /** Base64-encoded image data */
  data: string;
  /** MIME type (e.g., 'image/png', 'image/jpeg') */
  mimeType: SupportedMimeType | string;
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

// =============================================================================
// GENERATION CONFIGURATION
// =============================================================================

/**
 * Generation configuration options with proper type safety
 */
export interface GenerationConfig {
  /** Output aspect ratio */
  aspectRatio?: AspectRatio;
  /** Output image size (1K, 2K, 4K - MUST be uppercase) */
  imageSize?: ImageSize;
  /** Number of images to generate (1-4) */
  numberOfImages?: NumberOfImages;
  /** Person generation setting */
  personGeneration?: PersonGeneration;
  /** Negative prompt (what to avoid) */
  negativePrompt?: string;
  /** Whether to add SynthID watermark (default: true) */
  addWatermark?: boolean;
  /** Whether to use Google Search grounding */
  useGoogleSearch?: boolean;
}

/**
 * Default generation configuration
 */
export const DEFAULT_GENERATION_CONFIG: Required<GenerationConfig> = {
  aspectRatio: '1:1',
  imageSize: '2K',
  numberOfImages: 4,
  personGeneration: 'ALLOW_ADULT',
  negativePrompt: '',
  addWatermark: false,
  useGoogleSearch: false,
};

// =============================================================================
// MULTI-TURN EDITING STATE
// =============================================================================

/**
 * ThoughtSignature for multi-turn editing continuity
 * Must be captured from API response and re-submitted for follow-up edits
 */
export interface ThoughtSignature {
  /** The signature string from API response */
  signature: string;
  /** Timestamp when signature was captured */
  capturedAt: number;
  /** Node ID this signature is associated with */
  nodeId: string;
}

/**
 * Editing session state for multi-turn editing
 */
export interface EditingSession {
  /** Active editing session ID */
  sessionId: string;
  /** Source node being edited */
  sourceNodeId: string;
  /** ThoughtSignature for continuity */
  thoughtSignature: ThoughtSignature | null;
  /** History of edits in this session */
  editHistory: string[];
  /** Whether this is an active session */
  isActive: boolean;
}

// =============================================================================
// CONVERSATION TYPES
// =============================================================================

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

// =============================================================================
// GENERATION RESULTS
// =============================================================================

/**
 * Result from image generation
 */
export interface GenerationResult {
  /** Generated image data URLs */
  images: string[];
  /** Model response for conversation history */
  modelResponse?: ConversationTurn | undefined;
  /** ThoughtSignature for multi-turn editing (if returned) */
  thoughtSignature?: string | undefined;
  /** Generation metadata */
  metadata?: GenerationMetadata | undefined;
}

/**
 * Generation metadata
 */
export interface GenerationMetadata {
  /** Request ID for tracking */
  requestId: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Configuration used */
  config: GenerationConfig;
  /** Prompt used */
  prompt: string;
  /** Number of reference images used */
  referenceCount: number;
}

// =============================================================================
// GENERATION QUEUE
// =============================================================================

/**
 * Generation request status
 */
export type GenerationStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Generation queue item
 */
export interface GenerationQueueItem {
  /** Unique request ID */
  requestId: string;
  /** Prompt text */
  prompt: string;
  /** Reference images */
  references: ImageData[];
  /** Generation configuration */
  config: GenerationConfig;
  /** Target node ID (for edits) or null for new generation */
  targetNodeId: string | null;
  /** ThoughtSignature for multi-turn editing */
  thoughtSignature: string | null;
  /** Current status */
  status: GenerationStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Error message if failed */
  error: string | null;
  /** Timestamp when queued */
  queuedAt: number;
  /** Timestamp when started processing */
  startedAt: number | null;
  /** Timestamp when completed/failed */
  completedAt: number | null;
  /** Result if completed */
  result: GenerationResult | null;
  /** Retry count */
  retryCount: number;
}

// =============================================================================
// API ERROR HANDLING
// =============================================================================

/**
 * API error codes with their meanings
 */
export type ApiErrorCode =
  | 400 // INVALID_ARGUMENT - Malformed request
  | 403 // PERMISSION_DENIED - API key issue
  | 404 // NOT_FOUND - Wrong model ID
  | 413 // PAYLOAD_TOO_LARGE - Use File API
  | 429 // RESOURCE_EXHAUSTED - Rate limit
  | 500 // INTERNAL - Service error
  | 503; // UNAVAILABLE - Service overload

/**
 * API error with retry information
 */
export interface ApiError {
  /** HTTP status code */
  code: ApiErrorCode | number;
  /** Error message */
  message: string;
  /** Whether this error is retryable */
  retryable: boolean;
  /** Suggested retry delay in ms (for rate limits) */
  retryAfterMs?: number;
  /** Original error details */
  details?: unknown;
}

// =============================================================================
// GEMINI API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Content part for API request
 */
export type GeminiRequestPart = ConversationPart;

/**
 * Content turn for API request
 */
export interface GeminiRequestContent {
  role: 'user' | 'model';
  parts: GeminiRequestPart[];
}

/**
 * Image generation config for API request
 */
export interface GeminiImageGenerationConfig {
  aspectRatio?: AspectRatio | undefined;
  imageSize?: ImageSize | undefined;
  numberOfImages?: NumberOfImages | undefined;
  personGeneration?: PersonGeneration | undefined;
  addWatermark?: boolean | undefined;
  negativePrompt?: string | undefined;
}

/**
 * Generation config for API request
 */
export interface GeminiGenerationConfig {
  responseModalities: string[];
}

/**
 * Full API request body
 */
export interface GeminiRequestBody {
  contents: GeminiRequestContent[];
  generationConfig: GeminiGenerationConfig;
  safetySettings: {
    category: string;
    threshold: string;
  }[];
  systemInstruction?: {
    parts: { text: string }[];
  };
  tools?: { googleSearch: Record<string, never> }[];
  imageGenerationConfig?: GeminiImageGenerationConfig;
}

// =============================================================================
// REFERENCE IMAGE MANAGEMENT
// =============================================================================

/**
 * Reference image with metadata
 */
export interface ReferenceImage {
  /** Unique identifier */
  id: string;
  /** Image data */
  imageData: ImageData;
  /** Display name */
  name: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Purpose: style, character, object */
  purpose: 'style' | 'character' | 'object' | 'general';
  /** Character name (if purpose is 'character') */
  characterName?: string;
  /** Whether this reference is active */
  isActive: boolean;
  /** Order in reference list */
  order: number;
}

/**
 * Character reference for consistency
 */
export interface CharacterReference {
  /** Character identifier (max 5 characters) */
  id: string;
  /** Character name */
  name: string;
  /** Reference images for this character */
  images: ReferenceImage[];
  /** Description of the character */
  description?: string;
}

/**
 * Object reference for composition
 */
export interface ObjectReference {
  /** Object identifier (max 6 objects) */
  id: string;
  /** Object name */
  name: string;
  /** Reference image */
  image: ReferenceImage;
  /** Description of the object */
  description?: string;
}
