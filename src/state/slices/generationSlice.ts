/**
 * Generation Slice
 *
 * State management for image generation with Gemini API.
 * Handles generation queue, configuration, multi-turn editing, and rate limiting.
 *
 * API Reference: Gemini 3 Pro Image (gemini-3-pro-image-preview)
 * - Max 14 reference images, thoughtSignature for multi-turn editing
 * - Resolution: 1K, 2K, 4K (uppercase required)
 * - Rate limits: 15 RPM (free), 1000 RPM (paid)
 */

import { DEFAULT_GENERATION_CONFIG, API_LIMITS } from '@/types';
import { generateId } from '@/utils/id';

import type {
  GenerationConfig,
  GenerationQueueItem,
  GenerationResult,
  GenerationStatus,
  ImageData,
  ReferenceImage,
  ThoughtSignature,
  EditingSession,
  CharacterReference,
  ObjectReference,
  ApiError,
} from '@/types';
import type { StateCreator } from 'zustand';

// =============================================================================
// SLICE STATE
// =============================================================================

export interface GenerationSliceState {
  /** Generation queue */
  queue: GenerationQueueItem[];
  /** Currently processing request ID */
  activeRequestId: string | null;
  /** Default generation configuration */
  defaultConfig: GenerationConfig;
  /** Reference images */
  references: ReferenceImage[];
  /** Character references for consistency */
  characters: CharacterReference[];
  /** Object references for composition */
  objects: ObjectReference[];
  /** Active editing sessions (thoughtSignature tracking) */
  editingSessions: Record<string, EditingSession>;
  /** Rate limit tracking */
  rateLimiter: {
    /** Requests in current minute window */
    requestsThisMinute: number;
    /** Window start timestamp */
    minuteWindowStart: number;
    /** Whether we're currently rate limited */
    isLimited: boolean;
    /** When rate limit expires */
    limitExpiresAt: number | null;
  };
  /** Last API error */
  lastError: ApiError | null;
  /** Total generations count */
  totalGenerations: number;
}

// =============================================================================
// SLICE ACTIONS
// =============================================================================

export interface GenerationSliceActions {
  // Queue management
  queueGeneration: (
    prompt: string,
    options?: {
      references?: ImageData[];
      config?: Partial<GenerationConfig>;
      targetNodeId?: string;
      thoughtSignature?: string;
    },
  ) => string;
  cancelGeneration: (requestId: string) => void;
  clearQueue: () => void;

  // Queue processing
  startProcessing: (requestId: string) => void;
  updateProgress: (requestId: string, progress: number) => void;
  completeGeneration: (requestId: string, result: GenerationResult) => void;
  failGeneration: (requestId: string, error: string) => void;
  retryGeneration: (requestId: string) => void;

  // Configuration
  setDefaultConfig: (config: Partial<GenerationConfig>) => void;
  resetConfig: () => void;

  // Reference images
  addReference: (reference: Omit<ReferenceImage, 'id' | 'order'>) => string;
  removeReference: (referenceId: string) => void;
  updateReference: (referenceId: string, updates: Partial<ReferenceImage>) => void;
  reorderReferences: (referenceIds: string[]) => void;
  clearReferences: () => void;

  // Character consistency (max 5)
  addCharacter: (name: string, images: ReferenceImage[]) => string | null;
  removeCharacter: (characterId: string) => void;
  updateCharacter: (characterId: string, updates: Partial<CharacterReference>) => void;

  // Object composition (max 6)
  addObject: (name: string, image: ReferenceImage) => string | null;
  removeObject: (objectId: string) => void;

  // Multi-turn editing
  startEditingSession: (sourceNodeId: string) => string;
  updateThoughtSignature: (sessionId: string, signature: ThoughtSignature) => void;
  endEditingSession: (sessionId: string) => void;
  getActiveSession: (nodeId: string) => EditingSession | null;

  // Rate limiting
  checkRateLimit: () => boolean;
  recordRequest: () => void;
  setRateLimited: (expiresAt: number) => void;
  clearRateLimit: () => void;

  // Error handling
  setLastError: (error: ApiError | null) => void;
  clearError: () => void;

  // Utilities
  getQueuedCount: () => number;
  getPendingRequest: () => GenerationQueueItem | null;
  getReferenceCount: () => number;
  canAddReference: () => boolean;
}

export type GenerationSlice = GenerationSliceState & GenerationSliceActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: GenerationSliceState = {
  queue: [],
  activeRequestId: null,
  defaultConfig: { ...DEFAULT_GENERATION_CONFIG },
  references: [],
  characters: [],
  objects: [],
  editingSessions: {},
  rateLimiter: {
    requestsThisMinute: 0,
    minuteWindowStart: Date.now(),
    isLimited: false,
    limitExpiresAt: null,
  },
  lastError: null,
  totalGenerations: 0,
};

// =============================================================================
// SLICE CREATOR
// =============================================================================

export const createGenerationSlice: StateCreator<GenerationSlice, [], [], GenerationSlice> = (
  set,
  get,
) => ({
  ...initialState,

  // ---------------------------------------------------------------------------
  // Queue Management
  // ---------------------------------------------------------------------------

  queueGeneration: (prompt, options = {}) => {
    const requestId = generateId('gen');
    const state = get();

    // Merge config with defaults
    const config: GenerationConfig = {
      ...state.defaultConfig,
      ...options.config,
    };

    const item: GenerationQueueItem = {
      requestId,
      prompt,
      references: options.references ?? [],
      config,
      targetNodeId: options.targetNodeId ?? null,
      thoughtSignature: options.thoughtSignature ?? null,
      status: 'pending',
      progress: 0,
      error: null,
      queuedAt: Date.now(),
      startedAt: null,
      completedAt: null,
      result: null,
      retryCount: 0,
    };

    set((state) => ({
      queue: [...state.queue, item],
    }));

    return requestId;
  },

  cancelGeneration: (requestId) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.requestId === requestId ? { ...item, status: 'cancelled' as GenerationStatus } : item,
      ),
      activeRequestId: state.activeRequestId === requestId ? null : state.activeRequestId,
    }));
  },

  clearQueue: () => {
    set({
      queue: [],
      activeRequestId: null,
    });
  },

  // ---------------------------------------------------------------------------
  // Queue Processing
  // ---------------------------------------------------------------------------

  startProcessing: (requestId) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.requestId === requestId
          ? { ...item, status: 'processing' as GenerationStatus, startedAt: Date.now() }
          : item,
      ),
      activeRequestId: requestId,
    }));
  },

  updateProgress: (requestId, progress) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.requestId === requestId ? { ...item, progress } : item,
      ),
    }));
  },

  completeGeneration: (requestId, result) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.requestId === requestId
          ? {
              ...item,
              status: 'completed' as GenerationStatus,
              completedAt: Date.now(),
              result,
              progress: 100,
            }
          : item,
      ),
      activeRequestId: state.activeRequestId === requestId ? null : state.activeRequestId,
      totalGenerations: state.totalGenerations + 1,
    }));
  },

  failGeneration: (requestId, error) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.requestId === requestId
          ? {
              ...item,
              status: 'failed' as GenerationStatus,
              completedAt: Date.now(),
              error,
            }
          : item,
      ),
      activeRequestId: state.activeRequestId === requestId ? null : state.activeRequestId,
    }));
  },

  retryGeneration: (requestId) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.requestId === requestId
          ? {
              ...item,
              status: 'pending' as GenerationStatus,
              error: null,
              startedAt: null,
              completedAt: null,
              progress: 0,
              retryCount: item.retryCount + 1,
            }
          : item,
      ),
    }));
  },

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  setDefaultConfig: (config) => {
    set((state) => ({
      defaultConfig: { ...state.defaultConfig, ...config },
    }));
  },

  resetConfig: () => {
    set({ defaultConfig: { ...DEFAULT_GENERATION_CONFIG } });
  },

  // ---------------------------------------------------------------------------
  // Reference Images
  // ---------------------------------------------------------------------------

  addReference: (reference) => {
    const state = get();
    if (state.references.length >= API_LIMITS.MAX_REFERENCE_IMAGES) {
      return '';
    }

    const id = generateId('ref');
    const newReference: ReferenceImage = {
      ...reference,
      id,
      order: state.references.length,
    };

    set((state) => ({
      references: [...state.references, newReference],
    }));

    return id;
  },

  removeReference: (referenceId) => {
    set((state) => ({
      references: state.references
        .filter((ref) => ref.id !== referenceId)
        .map((ref, index) => ({ ...ref, order: index })),
    }));
  },

  updateReference: (referenceId, updates) => {
    set((state) => ({
      references: state.references.map((ref) =>
        ref.id === referenceId ? { ...ref, ...updates } : ref,
      ),
    }));
  },

  reorderReferences: (referenceIds) => {
    set((state) => {
      const refMap = new Map(state.references.map((ref) => [ref.id, ref]));
      const reordered = referenceIds
        .map((id, index) => {
          const ref = refMap.get(id);
          return ref ? { ...ref, order: index } : null;
        })
        .filter((ref): ref is ReferenceImage => ref !== null);

      return { references: reordered };
    });
  },

  clearReferences: () => {
    set({ references: [] });
  },

  // ---------------------------------------------------------------------------
  // Character Consistency (max 5)
  // ---------------------------------------------------------------------------

  addCharacter: (name, images) => {
    const state = get();
    if (state.characters.length >= API_LIMITS.MAX_CHARACTERS) {
      return null;
    }

    const id = generateId('char');
    const character: CharacterReference = {
      id,
      name,
      images,
    };

    set((state) => ({
      characters: [...state.characters, character],
    }));

    return id;
  },

  removeCharacter: (characterId) => {
    set((state) => ({
      characters: state.characters.filter((char) => char.id !== characterId),
    }));
  },

  updateCharacter: (characterId, updates) => {
    set((state) => ({
      characters: state.characters.map((char) =>
        char.id === characterId ? { ...char, ...updates } : char,
      ),
    }));
  },

  // ---------------------------------------------------------------------------
  // Object Composition (max 6)
  // ---------------------------------------------------------------------------

  addObject: (name, image) => {
    const state = get();
    if (state.objects.length >= API_LIMITS.MAX_OBJECTS) {
      return null;
    }

    const id = generateId('obj');
    const object: ObjectReference = {
      id,
      name,
      image,
    };

    set((state) => ({
      objects: [...state.objects, object],
    }));

    return id;
  },

  removeObject: (objectId) => {
    set((state) => ({
      objects: state.objects.filter((obj) => obj.id !== objectId),
    }));
  },

  // ---------------------------------------------------------------------------
  // Multi-turn Editing
  // ---------------------------------------------------------------------------

  startEditingSession: (sourceNodeId) => {
    const sessionId = generateId('edit');
    const session: EditingSession = {
      sessionId,
      sourceNodeId,
      thoughtSignature: null,
      editHistory: [],
      isActive: true,
    };

    set((state) => ({
      editingSessions: {
        ...state.editingSessions,
        [sessionId]: session,
      },
    }));

    return sessionId;
  },

  updateThoughtSignature: (sessionId, signature) => {
    set((state) => {
      const session = state.editingSessions[sessionId];
      if (!session) return state;

      return {
        editingSessions: {
          ...state.editingSessions,
          [sessionId]: {
            ...session,
            thoughtSignature: signature,
          },
        },
      };
    });
  },

  endEditingSession: (sessionId) => {
    set((state) => {
      const session = state.editingSessions[sessionId];
      if (!session) return state;

      return {
        editingSessions: {
          ...state.editingSessions,
          [sessionId]: { ...session, isActive: false },
        },
      };
    });
  },

  getActiveSession: (nodeId) => {
    const state = get();
    for (const session of Object.values(state.editingSessions)) {
      if (session.sourceNodeId === nodeId && session.isActive) {
        return session;
      }
    }
    return null;
  },

  // ---------------------------------------------------------------------------
  // Rate Limiting
  // ---------------------------------------------------------------------------

  checkRateLimit: () => {
    const state = get();
    const now = Date.now();

    // Check if in rate limited state
    if (state.rateLimiter.isLimited) {
      if (state.rateLimiter.limitExpiresAt && now > state.rateLimiter.limitExpiresAt) {
        get().clearRateLimit();
        return true;
      }
      return false;
    }

    // Check minute window
    const minuteAgo = now - 60000;
    if (state.rateLimiter.minuteWindowStart < minuteAgo) {
      // Reset window
      set({
        rateLimiter: {
          ...state.rateLimiter,
          requestsThisMinute: 0,
          minuteWindowStart: now,
        },
      });
      return true;
    }

    // Check if under limit (using free tier limit as default)
    return state.rateLimiter.requestsThisMinute < API_LIMITS.FREE_RPM;
  },

  recordRequest: () => {
    set((state) => ({
      rateLimiter: {
        ...state.rateLimiter,
        requestsThisMinute: state.rateLimiter.requestsThisMinute + 1,
      },
    }));
  },

  setRateLimited: (expiresAt) => {
    set((state) => ({
      rateLimiter: {
        ...state.rateLimiter,
        isLimited: true,
        limitExpiresAt: expiresAt,
      },
    }));
  },

  clearRateLimit: () => {
    set((state) => ({
      rateLimiter: {
        ...state.rateLimiter,
        isLimited: false,
        limitExpiresAt: null,
        requestsThisMinute: 0,
        minuteWindowStart: Date.now(),
      },
    }));
  },

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------

  setLastError: (error) => {
    set({ lastError: error });
  },

  clearError: () => {
    set({ lastError: null });
  },

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  getQueuedCount: () => {
    return get().queue.filter((item) => item.status === 'pending' || item.status === 'queued')
      .length;
  },

  getPendingRequest: () => {
    return get().queue.find((item) => item.status === 'pending') ?? null;
  },

  getReferenceCount: () => {
    return get().references.length;
  },

  canAddReference: () => {
    return get().references.length < API_LIMITS.MAX_REFERENCE_IMAGES;
  },
});
