/**
 * Gemini Service
 *
 * Handles all communication with the Google Gemini API for image generation.
 * Supports multi-turn editing, reference images, and all generation options.
 */

import type {
  ImageData,
  PinnedRule,
  GenerationConfig,
  ConversationTurn,
  GenerationResult,
  GeminiRequestPart,
  GeminiRequestContent,
  GeminiImageGenerationConfig,
  GeminiRequestBody,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface GenerationOptions {
  /** Text prompt for generation */
  prompt: string;
  /** Target image for editing */
  targetImage?: ImageData | null;
  /** Reference images for style guidance */
  referenceImages?: ImageData[];
  /** Active rules to apply */
  rules?: PinnedRule[];
  /** Generation configuration */
  config: GenerationConfig;
  /** Conversation history for multi-turn editing */
  conversationHistory?: ConversationTurn[];
  /** Whether this is an edit (continuation) or new generation */
  isEditMode?: boolean;
}

// API Response types
interface GeminiImagePart {
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiTextPart {
  text?: string;
}

type GeminiPart = GeminiImagePart | GeminiTextPart;

interface GeminiCandidate {
  content: {
    parts: GeminiPart[];
    role: string;
  };
  finishReason: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: {
    message: string;
    code: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Gemini 3 Pro Image (Nano Banana Pro) - Google's most advanced image generation model
const MODEL_ID = 'gemini-3-pro-image-preview';

// Map aspect ratios to API format
const ASPECT_RATIO_MAP: Record<string, string> = {
  '1:1': '1:1',
  '9:16': '9:16',
  '16:9': '16:9',
  '3:4': '3:4',
  '4:3': '4:3',
  '3:2': '3:2',
  '2:3': '2:3',
  '5:4': '5:4',
  '4:5': '4:5',
  '21:9': '21:9',
};

// Map image sizes to output dimensions
export const SIZE_MAP: Record<string, { width: number; height: number }> = {
  '1K': { width: 1024, height: 1024 },
  '2K': { width: 2048, height: 2048 },
  '4K': { width: 4096, height: 4096 },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get API key from environment
 */
const getApiKey = (): string => {
  // Try various environment variable names
  const key =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    '';

  if (!key) {
    throw new Error(
      'Gemini API key not found. Please set VITE_GEMINI_API_KEY in your .env.local file.',
    );
  }

  return key;
};

/**
 * Build the system prompt with rules
 */
const buildSystemPrompt = (rules?: PinnedRule[]): string => {
  const activeRules = rules?.filter((r) => r.active) || [];

  if (activeRules.length === 0) {
    return "You are an expert image generator. Create high-quality images based on the user's instructions.";
  }

  const rulesText = activeRules.map((r, i) => `${i + 1}. ${r.text}`).join('\n');

  return `You are an expert image generator. Create high-quality images based on the user's instructions.

IMPORTANT RULES TO FOLLOW:
${rulesText}

Always apply these rules to every image you generate.`;
};

/**
 * Build the prompt text including references to images
 */
const buildPromptText = (
  prompt: string,
  hasTarget: boolean,
  refCount: number,
  negativePrompt?: string,
): string => {
  let fullPrompt = prompt;

  // Add context about images
  if (hasTarget && refCount > 0) {
    fullPrompt = `Using the target image and ${refCount} reference image(s) for style guidance: ${prompt}`;
  } else if (hasTarget) {
    fullPrompt = `Edit the provided image: ${prompt}`;
  } else if (refCount > 0) {
    fullPrompt = `Using the ${refCount} reference image(s) for style guidance: ${prompt}`;
  }

  // Add negative prompt if provided
  if (negativePrompt?.trim()) {
    fullPrompt += `\n\nAVOID: ${negativePrompt}`;
  }

  return fullPrompt;
};

/**
 * Build request contents with images
 */
const buildContents = (
  prompt: string,
  targetImage?: ImageData | null,
  referenceImages?: ImageData[],
  conversationHistory?: ConversationTurn[],
  isEditMode?: boolean,
): GeminiRequestContent[] => {
  // If edit mode with conversation history, use the history
  if (isEditMode && conversationHistory && conversationHistory.length > 0) {
    // Add new user turn
    const userParts: GeminiRequestPart[] = [];

    // Add target image if present
    if (targetImage) {
      userParts.push({
        inlineData: {
          mimeType: targetImage.mimeType,
          data: targetImage.data,
        },
      });
    }

    // Add text prompt
    userParts.push({ text: prompt });

    return [
      ...conversationHistory.map((turn) => ({
        role: turn.role,
        parts: turn.parts,
      })),
      {
        role: 'user',
        parts: userParts,
      },
    ];
  }

  // Build new conversation
  const parts: GeminiRequestPart[] = [];

  // Add target image first
  if (targetImage) {
    parts.push({
      inlineData: {
        mimeType: targetImage.mimeType,
        data: targetImage.data,
      },
    });
  }

  // Add reference images
  const activeRefs = referenceImages?.filter((r) => r.active) || [];
  for (const ref of activeRefs) {
    parts.push({
      inlineData: {
        mimeType: ref.mimeType,
        data: ref.data,
      },
    });
  }

  // Add text prompt
  parts.push({ text: prompt });

  return [
    {
      role: 'user',
      parts,
    },
  ];
};

/**
 * Extract images from Gemini response
 */
const extractImages = (response: GeminiResponse): string[] => {
  const images: string[] = [];

  if (!response.candidates) {
    return images;
  }

  for (const candidate of response.candidates) {
    if (!candidate.content?.parts) continue;

    for (const part of candidate.content.parts) {
      if ('inlineData' in part && part.inlineData) {
        const { mimeType, data } = part.inlineData;
        const dataUrl = `data:${mimeType};base64,${data}`;
        images.push(dataUrl);
      }
    }
  }

  return images;
};

/**
 * Extract model response turn for conversation history
 */
const extractModelResponse = (response: GeminiResponse): ConversationTurn | undefined => {
  if (!response.candidates?.[0]?.content) {
    return undefined;
  }

  const content = response.candidates[0].content;

  return {
    role: 'model',
    parts: content.parts.map((part) => {
      if ('text' in part && part.text) {
        return { text: part.text };
      }
      if ('inlineData' in part && part.inlineData) {
        return {
          inlineData: {
            mimeType: part.inlineData.mimeType,
            data: part.inlineData.data,
          },
        };
      }
      return {};
    }),
    timestamp: Date.now(),
  };
};

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

/**
 * Generate images using Gemini API
 */
export async function generateImages(options: GenerationOptions): Promise<GenerationResult> {
  const { prompt, targetImage, referenceImages, rules, config, conversationHistory, isEditMode } =
    options;

  const apiKey = getApiKey();
  const url = `${API_BASE_URL}/${MODEL_ID}:generateContent?key=${apiKey}`;

  // Build the full prompt
  const activeRefs = referenceImages?.filter((r) => r.active) || [];
  const fullPrompt = buildPromptText(
    prompt,
    !!targetImage,
    activeRefs.length,
    config.negativePrompt,
  );

  // Build request body
  const requestBody: GeminiRequestBody = {
    contents: buildContents(
      fullPrompt,
      targetImage,
      referenceImages,
      conversationHistory,
      isEditMode,
    ),
    generationConfig: {
      // Must include TEXT with IMAGE for Gemini image generation
      responseModalities: ['TEXT', 'IMAGE'],
    },
    // Safety settings
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  };

  // Add system instruction with rules
  const systemPrompt = buildSystemPrompt(rules);
  requestBody.systemInstruction = {
    parts: [{ text: systemPrompt }],
  };

  // Build imageGenerationConfig for Gemini 3 Pro Image API
  const imageGenerationConfig: GeminiImageGenerationConfig = {};

  // Aspect ratio - supported: "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"
  if (config.aspectRatio && ASPECT_RATIO_MAP[config.aspectRatio]) {
    imageGenerationConfig.aspectRatio = ASPECT_RATIO_MAP[config.aspectRatio];
  }

  // Image size - supported: "1K", "2K", "4K"
  if (config.imageSize && SIZE_MAP[config.imageSize]) {
    imageGenerationConfig.imageSize = config.imageSize;
  }

  // Number of images to generate (1-4)
  if (config.numberOfImages && config.numberOfImages >= 1 && config.numberOfImages <= 4) {
    imageGenerationConfig.numberOfImages = config.numberOfImages;
  }

  // Person generation - values: "DONT_ALLOW", "ALLOW_ADULT", "ALLOW_ALL"
  if (config.personGeneration) {
    // Convert to API format (uppercase with underscore)
    const personGenMap: Record<string, string> = {
      dont_allow: 'DONT_ALLOW',
      allow_adult: 'ALLOW_ADULT',
      allow_all: 'ALLOW_ALL',
      DONT_ALLOW: 'DONT_ALLOW',
      ALLOW_ADULT: 'ALLOW_ADULT',
      ALLOW_ALL: 'ALLOW_ALL',
    };
    imageGenerationConfig.personGeneration = personGenMap[config.personGeneration] || 'ALLOW_ADULT';
  }

  // SynthID Watermark - boolean
  if (typeof config.addWatermark === 'boolean') {
    imageGenerationConfig.addWatermark = config.addWatermark;
  }

  // Add imageGenerationConfig if we have any settings
  if (Object.keys(imageGenerationConfig).length > 0) {
    requestBody.generationConfig.imageGenerationConfig = imageGenerationConfig;
  }

  // Add Google Search grounding if enabled
  if (config.useGoogleSearch) {
    requestBody.tools = [
      {
        googleSearch: {},
      },
    ];
  }

  console.log('[Gemini 3 Pro Image] Sending request:', {
    model: MODEL_ID,
    prompt: fullPrompt.substring(0, 100) + '...',
    hasTarget: !!targetImage,
    refCount: activeRefs.length,
    config: {
      aspectRatio: config.aspectRatio,
      imageSize: config.imageSize,
      numberOfImages: config.numberOfImages,
      personGeneration: config.personGeneration,
      useGoogleSearch: config.useGoogleSearch,
      addWatermark: config.addWatermark,
    },
  });

  // Make API request
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData.error?.message || `API request failed with status ${response.status}`;
    console.error('[Gemini] API Error:', errorMessage);
    throw new Error(errorMessage);
  }

  const data: GeminiResponse = await response.json();

  // Check for API errors in response
  if (data.error) {
    console.error('[Gemini] Response error:', data.error);
    throw new Error(data.error.message);
  }

  // Extract images
  const images = extractImages(data);

  if (images.length === 0) {
    console.warn('[Gemini] No images in response:', data);
    throw new Error('No images were generated. The model may have refused due to content policy.');
  }

  console.log('[Gemini] Generated', images.length, 'image(s)');

  // Extract model response for conversation history
  const modelResponse = extractModelResponse(data);

  return {
    images,
    modelResponse,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  generateImages,
};
