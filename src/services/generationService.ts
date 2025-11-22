/**
 * Generation Service
 *
 * Queue processor that connects the generation state to the Gemini API.
 * Handles rate limiting, retries, error handling, and node creation.
 */

import { eventBus, EVENTS } from '@/core/events';
import { useStore } from '@/state';
import { generateId } from '@/utils/id';

import { generateImages, type GenerationOptions } from './geminiService';

import type { GenerationQueueItem, GenerationResult, ImageData, GenerationConfig } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface GenerationServiceConfig {
  /** How often to check the queue (ms) */
  pollInterval: number;
  /** Maximum retries for failed generations */
  maxRetries: number;
  /** Delay between retries (ms) */
  retryDelay: number;
  /** Whether to auto-create nodes for completed generations */
  autoCreateNodes: boolean;
}

type GenerationCallback = (requestId: string, result: GenerationResult) => void;
type ErrorCallback = (requestId: string, error: string) => void;
type ProgressCallback = (requestId: string, progress: number) => void;

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: GenerationServiceConfig = {
  pollInterval: 1000,
  maxRetries: 3,
  retryDelay: 2000,
  autoCreateNodes: true,
};

// =============================================================================
// GENERATION SERVICE CLASS
// =============================================================================

/**
 * Service that processes the generation queue
 */
class GenerationService {
  private config: GenerationServiceConfig;
  private isRunning = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private processingRequestId: string | null = null;

  // Callbacks
  private onGenerationComplete: GenerationCallback | null = null;
  private onGenerationError: ErrorCallback | null = null;
  private onGenerationProgress: ProgressCallback | null = null;

  constructor(config: Partial<GenerationServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Start the queue processor
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.pollQueue();

    if (import.meta.env.DEV) {
      console.log('[GenerationService] Started');
    }
  }

  /**
   * Stop the queue processor
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    if (import.meta.env.DEV) {
      console.log('[GenerationService] Stopped');
    }
  }

  /**
   * Check if service is running
   */
  get running(): boolean {
    return this.isRunning;
  }

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  /**
   * Set callback for successful generation
   */
  onComplete(callback: GenerationCallback): void {
    this.onGenerationComplete = callback;
  }

  /**
   * Set callback for failed generation
   */
  onError(callback: ErrorCallback): void {
    this.onGenerationError = callback;
  }

  /**
   * Set callback for progress updates
   */
  onProgress(callback: ProgressCallback): void {
    this.onGenerationProgress = callback;
  }

  // ---------------------------------------------------------------------------
  // Queue Processing
  // ---------------------------------------------------------------------------

  /**
   * Poll the queue for pending requests
   */
  private pollQueue(): void {
    if (!this.isRunning) return;

    // Check if we can process
    if (!this.processingRequestId) {
      this.processNext();
    }

    // Schedule next poll
    this.pollTimer = setTimeout(() => this.pollQueue(), this.config.pollInterval);
  }

  /**
   * Process the next pending request
   */
  private async processNext(): Promise<void> {
    const state = useStore.getState();

    // Check rate limit
    if (!state.checkRateLimit()) {
      if (import.meta.env.DEV) {
        console.log('[GenerationService] Rate limited, waiting...');
      }
      return;
    }

    // Get next pending request
    const pendingRequest = state.getPendingRequest();
    if (!pendingRequest) {
      return;
    }

    // Start processing
    this.processingRequestId = pendingRequest.requestId;
    state.startProcessing(pendingRequest.requestId);
    state.recordRequest();

    // Emit event
    eventBus.emit(EVENTS.GENERATION.STARTED, {
      requestId: pendingRequest.requestId,
      prompt: pendingRequest.prompt,
    });

    try {
      // Process the request
      const result = await this.executeGeneration(pendingRequest);

      // Complete
      state.completeGeneration(pendingRequest.requestId, result);

      // Emit event
      eventBus.emit(EVENTS.GENERATION.COMPLETED, {
        requestId: pendingRequest.requestId,
        result,
      });

      // Create node if configured
      if (this.config.autoCreateNodes) {
        this.createNodeFromResult(pendingRequest, result);
      }

      // Callback
      this.onGenerationComplete?.(pendingRequest.requestId, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if we should retry
      if (pendingRequest.retryCount < this.config.maxRetries) {
        if (import.meta.env.DEV) {
          console.log(
            `[GenerationService] Retrying ${pendingRequest.requestId} (attempt ${pendingRequest.retryCount + 1})`,
          );
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay));

        // Queue for retry
        state.retryGeneration(pendingRequest.requestId);
      } else {
        // Mark as failed
        state.failGeneration(pendingRequest.requestId, errorMessage);

        // Emit event
        eventBus.emit(EVENTS.GENERATION.FAILED, {
          requestId: pendingRequest.requestId,
          error: errorMessage,
        });

        // Show error toast
        state.showToast('error', `Generation failed: ${errorMessage}`);

        // Callback
        this.onGenerationError?.(pendingRequest.requestId, errorMessage);
      }
    } finally {
      this.processingRequestId = null;
    }
  }

  /**
   * Execute a generation request
   */
  private async executeGeneration(request: GenerationQueueItem): Promise<GenerationResult> {
    const state = useStore.getState();

    // Build generation options
    const options: GenerationOptions = {
      prompt: request.prompt,
      config: request.config,
      referenceImages: this.convertReferencesToImageData(request.references),
    };

    // If we have a thought signature for editing, include it
    if (request.thoughtSignature) {
      options.isEditMode = true;
      // Get the source node's image if editing
      if (request.targetNodeId) {
        const targetNode = state.nodes[request.targetNodeId];
        if (targetNode?.config.image) {
          // Convert data URL to ImageData format
          const match = targetNode.config.image.match(/^data:([^;]+);base64,(.+)$/);
          if (match && match[1] && match[2]) {
            options.targetImage = {
              data: match[2],
              mimeType: match[1],
            };
          }
        }
      }
    }

    // Update progress (simulated since API doesn't provide real-time progress)
    this.simulateProgress(request.requestId);

    // Call API
    const result = await generateImages(options);

    return result;
  }

  /**
   * Convert reference array to ImageData array
   */
  private convertReferencesToImageData(references: ImageData[]): ImageData[] {
    return references.map((ref) => ({
      data: ref.data,
      mimeType: ref.mimeType,
      active: true,
    }));
  }

  /**
   * Simulate progress updates (API doesn't provide real progress)
   */
  private simulateProgress(requestId: string): void {
    const state = useStore.getState();
    const stages = [10, 30, 50, 70, 90];
    let stageIndex = 0;

    const interval = setInterval(() => {
      // Stop if no longer processing this request
      if (this.processingRequestId !== requestId) {
        clearInterval(interval);
        return;
      }

      if (stageIndex < stages.length) {
        const progress = stages[stageIndex];
        if (progress !== undefined) {
          state.updateProgress(requestId, progress);
          this.onGenerationProgress?.(requestId, progress);
        }
        stageIndex++;
      } else {
        clearInterval(interval);
      }
    }, 1500);
  }

  /**
   * Create a node from the generation result
   */
  private createNodeFromResult(request: GenerationQueueItem, result: GenerationResult): void {
    const state = useStore.getState();

    // Get first image from result (data URL string)
    const firstImage = result.images[0];
    if (!firstImage) {
      return;
    }

    // Calculate position
    let position = { x: 100, y: 100 };

    // If there's a target node (editing), position relative to it
    if (request.targetNodeId) {
      const targetNode = state.nodes[request.targetNodeId];
      if (targetNode) {
        position = {
          x: targetNode.position.x + 300,
          y: targetNode.position.y + 50,
        };
      }
    } else {
      // Position based on existing nodes
      const nodeCount = Object.keys(state.nodes).length;
      position = {
        x: 100 + (nodeCount % 4) * 300,
        y: 100 + Math.floor(nodeCount / 4) * 400,
      };
    }

    // Add node to store (image is data URL string)
    // CRITICAL: Save thoughtSignature if available for multi-turn capability
    const nodeConfig: any = {
      id: generateId('node'),
      position,
      type: request.targetNodeId ? 'edit' : 'generation',
      parentId: request.targetNodeId ?? undefined,
      title: request.prompt.slice(0, 50) + (request.prompt.length > 50 ? '...' : ''),
      prompt: request.prompt,
      image: firstImage,
      badge: request.config.imageSize ?? '1K',
      isGhost: false,
      thoughtSignature: result.thoughtSignature // Store the signature
    };

    state.addNode(nodeConfig);

    // If we have multiple images, create additional nodes
    for (let i = 1; i < result.images.length; i++) {
      const additionalImage = result.images[i];
      if (!additionalImage) continue;

      state.addNode({
        id: generateId('node'),
        position: {
          x: position.x + i * 280,
          y: position.y,
        },
        type: request.targetNodeId ? 'edit' : 'generation',
        parentId: request.targetNodeId ?? undefined,
        title: `${request.prompt.slice(0, 40)}... (${i + 1})`,
        prompt: request.prompt,
        image: additionalImage,
        badge: request.config.imageSize ?? '1K',
        isGhost: false,
      });
    }

    // Show success toast
    const imageCount = result.images.length;
    state.showToast('success', `Generated ${imageCount} image${imageCount > 1 ? 's' : ''}`);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Queue a generation request (convenience method)
   */
  queueGeneration(
    prompt: string,
    options?: {
      references?: ImageData[];
      config?: Partial<GenerationConfig>;
      targetNodeId?: string;
    },
  ): string {
    const state = useStore.getState();
    return state.queueGeneration(prompt, options);
  }

  /**
   * Cancel a generation request
   */
  cancelGeneration(requestId: string): void {
    const state = useStore.getState();
    state.cancelGeneration(requestId);

    if (this.processingRequestId === requestId) {
      // Can't actually cancel an in-flight API request,
      // but we can prevent node creation
      this.config.autoCreateNodes = false;
      setTimeout(() => {
        this.config.autoCreateNodes = DEFAULT_CONFIG.autoCreateNodes;
      }, 0);
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    currentRequestId: string | null;
  } {
    const state = useStore.getState();
    return {
      queueLength: state.getQueuedCount(),
      isProcessing: !!this.processingRequestId,
      currentRequestId: this.processingRequestId,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let serviceInstance: GenerationService | null = null;

/**
 * Get the generation service instance
 */
export function getGenerationService(config?: Partial<GenerationServiceConfig>): GenerationService {
  if (!serviceInstance) {
    serviceInstance = new GenerationService(config);
  }
  return serviceInstance;
}

/**
 * Initialize and start the generation service
 */
export function initGenerationService(
  config?: Partial<GenerationServiceConfig>,
): GenerationService {
  const service = getGenerationService(config);
  service.start();
  return service;
}

/**
 * Stop and cleanup the generation service
 */
export function stopGenerationService(): void {
  serviceInstance?.stop();
}

export { GenerationService };
