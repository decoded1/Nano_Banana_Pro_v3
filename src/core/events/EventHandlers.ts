/**
 * EventHandlers
 *
 * Global event handlers that wire up cross-cutting concerns.
 * These handlers connect different parts of the system without direct coupling.
 */

import { eventBus } from './EventBus';
import { EVENTS } from './EventTypes';

import type {
  NodeCreatedEvent,
  NodeDeletedEvent,
  NodesSelectionChangedEvent,
  ConnectionCompletedEvent,
  ConnectionDeletedEvent,
  GenerationCompletedEvent,
  GenerationFailedEvent,
} from '@/types';

/**
 * Handler registration status
 */
let isRegistered = false;

/**
 * Register all global event handlers
 */
export function registerGlobalHandlers(): void {
  if (isRegistered) {
    console.warn('Global event handlers already registered');
    return;
  }

  registerNodeHandlers();
  registerConnectionHandlers();
  registerGenerationHandlers();
  registerUIHandlers();

  isRegistered = true;

  if (import.meta.env.DEV) {
    console.log('[EventHandlers] Global handlers registered');
  }
}

/**
 * Unregister all global event handlers
 */
export function unregisterGlobalHandlers(): void {
  eventBus.clear();
  isRegistered = false;

  if (import.meta.env.DEV) {
    console.log('[EventHandlers] Global handlers unregistered');
  }
}

// =============================================================================
// NODE HANDLERS
// =============================================================================

function registerNodeHandlers(): void {
  // When a node is created, mark project as modified
  eventBus.on(EVENTS.NODE.CREATED, (_payload: NodeCreatedEvent) => {
    eventBus.emit(EVENTS.PROJECT.MODIFIED, { isModified: true });
  });

  // When a node is deleted, mark project as modified
  eventBus.on(EVENTS.NODE.DELETED, (_payload: NodeDeletedEvent) => {
    eventBus.emit(EVENTS.PROJECT.MODIFIED, { isModified: true });
  });

  // When selection changes, update UI state
  eventBus.on(EVENTS.NODE.SELECTION_CHANGED, (payload: NodesSelectionChangedEvent) => {
    // Could trigger UI updates, toolbar state changes, etc.
    if (import.meta.env.DEV) {
      console.log(
        `[EventHandlers] Selection changed: ${payload.selectedIds.length} node(s) selected`,
      );
    }
  });
}

// =============================================================================
// CONNECTION HANDLERS
// =============================================================================

function registerConnectionHandlers(): void {
  // When a connection is created, mark project as modified
  eventBus.on(EVENTS.CONNECTION.COMPLETED, (_payload: ConnectionCompletedEvent) => {
    eventBus.emit(EVENTS.PROJECT.MODIFIED, { isModified: true });
  });

  // When a connection is deleted, mark project as modified
  eventBus.on(EVENTS.CONNECTION.DELETED, (_payload: ConnectionDeletedEvent) => {
    eventBus.emit(EVENTS.PROJECT.MODIFIED, { isModified: true });
  });
}

// =============================================================================
// GENERATION HANDLERS
// =============================================================================

function registerGenerationHandlers(): void {
  // When generation completes, show toast notification
  eventBus.on(EVENTS.GENERATION.COMPLETED, (payload: GenerationCompletedEvent) => {
    eventBus.emit(EVENTS.UI.TOAST_SHOWN, {
      toastId: `gen-complete-${payload.requestId}`,
      type: 'success',
      message: 'Image generation complete',
    });
  });

  // When generation fails, show error toast
  eventBus.on(EVENTS.GENERATION.FAILED, (payload: GenerationFailedEvent) => {
    eventBus.emit(EVENTS.UI.TOAST_SHOWN, {
      toastId: `gen-failed-${payload.requestId}`,
      type: 'error',
      message: `Generation failed: ${payload.error}`,
    });
  });
}

// =============================================================================
// UI HANDLERS
// =============================================================================

function registerUIHandlers(): void {
  // Auto-dismiss toasts after delay
  eventBus.on(EVENTS.UI.TOAST_SHOWN, (payload) => {
    setTimeout(() => {
      eventBus.emit(EVENTS.UI.TOAST_DISMISSED, { toastId: payload.toastId });
    }, 5000);
  });
}

// =============================================================================
// DEBUGGING UTILITIES
// =============================================================================

/**
 * Enable verbose event logging
 */
export function enableEventLogging(): void {
  eventBus.onAny(({ event, payload }) => {
    console.log(`[Event] ${event}`, payload);
  });
}

/**
 * Get event statistics
 */
export function getEventStats(): {
  listenerCounts: Record<string, number>;
  totalListeners: number;
  history: unknown[];
} {
  const eventNames = eventBus.eventNames();
  const listenerCounts: Record<string, number> = {};
  let totalListeners = 0;

  for (const name of eventNames) {
    const count = eventBus.listenerCount(name);
    listenerCounts[name] = count;
    totalListeners += count;
  }

  return {
    listenerCounts,
    totalListeners,
    history: eventBus.getHistory(),
  };
}
