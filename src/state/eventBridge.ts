/**
 * Event Bridge
 *
 * Connects the EventBus to Zustand store mutations.
 * This enables decoupled communication between components while
 * maintaining a single source of truth in the store.
 */

import { eventBus, EVENTS } from '@/core/events';

import { useStore } from './store';

import type {
  NodeCreatedEvent,
  NodeDeletedEvent,
  NodeUpdatedEvent,
  NodesSelectionChangedEvent,
  ConnectionCompletedEvent,
  ConnectionDeletedEvent,
  GenerationRequestedEvent,
  GenerationCompletedEvent,
  GenerationFailedEvent,
  CanvasTransformChangedEvent,
  ProjectModifiedEvent,
  ToastShownEvent,
  ToastDismissedEvent,
  ToastType,
} from '@/types';

// =============================================================================
// EVENT -> STORE HANDLERS
// =============================================================================

/**
 * Register all event handlers that update the store
 */
export function registerEventBridge(): () => void {
  const unsubscribers: (() => void)[] = [];

  // ---------------------------------------------------------------------------
  // Node Events -> Store
  // ---------------------------------------------------------------------------

  // When a node:created event is emitted, the node is already in the store
  // This handler is for external components that emit node:created directly
  unsubscribers.push(
    eventBus.on(EVENTS.NODE.CREATED, (payload: NodeCreatedEvent) => {
      // The node is passed in the event, check if it already exists
      const { nodes, addNode } = useStore.getState();
      const nodeId = payload.node.config.id;
      if (!nodes[nodeId]) {
        addNode({
          id: nodeId,
          position: payload.node.position,
          type: payload.node.config.type,
          parentId: payload.node.config.parentId,
          title: payload.node.config.title,
          prompt: payload.node.config.prompt,
          image: payload.node.config.image,
          badge: payload.node.config.badge,
          isGhost: payload.node.config.isGhost,
        });
      }
    }),
  );

  // When a node:deleted event is emitted, remove from store
  unsubscribers.push(
    eventBus.on(EVENTS.NODE.DELETED, (payload: NodeDeletedEvent) => {
      const { removeNode } = useStore.getState();
      removeNode(payload.nodeId);
    }),
  );

  // When a node:updated event is emitted, update in store
  unsubscribers.push(
    eventBus.on(EVENTS.NODE.UPDATED, (payload: NodeUpdatedEvent) => {
      const { updateNode } = useStore.getState();
      updateNode(payload.nodeId, payload.changes);
    }),
  );

  // When selection changes, update store
  unsubscribers.push(
    eventBus.on(EVENTS.NODE.SELECTION_CHANGED, (payload: NodesSelectionChangedEvent) => {
      const { selectNodes, clearSelection } = useStore.getState();
      if (payload.selectedIds.length === 0) {
        clearSelection();
      } else {
        selectNodes(payload.selectedIds);
      }
    }),
  );

  // ---------------------------------------------------------------------------
  // Connection Events -> Store
  // ---------------------------------------------------------------------------

  unsubscribers.push(
    eventBus.on(EVENTS.CONNECTION.COMPLETED, (_payload: ConnectionCompletedEvent) => {
      // Mark project as modified
      const { setProjectModified } = useStore.getState();
      setProjectModified(true);
    }),
  );

  unsubscribers.push(
    eventBus.on(EVENTS.CONNECTION.DELETED, (_payload: ConnectionDeletedEvent) => {
      // Mark project as modified
      const { setProjectModified } = useStore.getState();
      setProjectModified(true);
    }),
  );

  // ---------------------------------------------------------------------------
  // Generation Events -> Store
  // ---------------------------------------------------------------------------

  unsubscribers.push(
    eventBus.on(EVENTS.GENERATION.REQUESTED, (payload: GenerationRequestedEvent) => {
      const { queueGeneration } = useStore.getState();
      // Only include targetNodeId if it's defined (exactOptionalPropertyTypes)
      const options: {
        config: typeof payload.config;
        targetNodeId?: string;
      } = { config: payload.config };
      if (payload.parentNodeId) {
        options.targetNodeId = payload.parentNodeId;
      }
      queueGeneration(payload.prompt, options);
    }),
  );

  unsubscribers.push(
    eventBus.on(EVENTS.GENERATION.COMPLETED, (payload: GenerationCompletedEvent) => {
      const { completeGeneration } = useStore.getState();
      completeGeneration(payload.requestId, payload.result);
    }),
  );

  unsubscribers.push(
    eventBus.on(EVENTS.GENERATION.FAILED, (payload: GenerationFailedEvent) => {
      const { failGeneration } = useStore.getState();
      failGeneration(payload.requestId, payload.error);
    }),
  );

  // ---------------------------------------------------------------------------
  // Canvas Events -> Store
  // ---------------------------------------------------------------------------

  unsubscribers.push(
    eventBus.on(EVENTS.CANVAS.TRANSFORM_CHANGED, (payload: CanvasTransformChangedEvent) => {
      const { setTransform } = useStore.getState();
      setTransform(payload.transform);
    }),
  );

  // ---------------------------------------------------------------------------
  // Project Events -> Store
  // ---------------------------------------------------------------------------

  unsubscribers.push(
    eventBus.on(EVENTS.PROJECT.MODIFIED, (payload: ProjectModifiedEvent) => {
      const { setProjectModified } = useStore.getState();
      setProjectModified(payload.isModified);
    }),
  );

  // ---------------------------------------------------------------------------
  // UI Events -> Store
  // ---------------------------------------------------------------------------

  unsubscribers.push(
    eventBus.on(EVENTS.UI.TOAST_SHOWN, (payload: ToastShownEvent) => {
      const { showToast } = useStore.getState();
      // Cast string type to ToastType (validated at event emission)
      showToast(payload.type as ToastType, payload.message);
    }),
  );

  unsubscribers.push(
    eventBus.on(EVENTS.UI.TOAST_DISMISSED, (payload: ToastDismissedEvent) => {
      const { dismissToast } = useStore.getState();
      dismissToast(payload.toastId);
    }),
  );

  // Return cleanup function
  return () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
  };
}

// =============================================================================
// STORE -> EVENT EMITTERS
// =============================================================================

/**
 * Track previous transform for change events
 */
let previousTransform = { offset: { x: 0, y: 0 }, scale: 1 };

/**
 * Subscribe to store changes and emit corresponding events
 */
export function registerStoreEmitters(): () => void {
  const unsubscribers: (() => void)[] = [];

  // When nodes change, emit node events
  unsubscribers.push(
    useStore.subscribe(
      (state) => state.nodes,
      (nodes, prevNodes) => {
        // Detect new nodes
        for (const nodeId of Object.keys(nodes)) {
          if (!prevNodes[nodeId]) {
            const node = nodes[nodeId];
            if (node) {
              eventBus.emit(EVENTS.NODE.CREATED, {
                node,
              });
            }
          }
        }

        // Detect removed nodes
        for (const nodeId of Object.keys(prevNodes)) {
          if (!nodes[nodeId]) {
            eventBus.emit(EVENTS.NODE.DELETED, {
              nodeId,
            });
          }
        }
      },
    ),
  );

  // When selection changes, emit selection event
  unsubscribers.push(
    useStore.subscribe(
      (state) => state.selectedIds,
      (selectedIds, prevSelectedIds) => {
        if (
          selectedIds.length !== prevSelectedIds.length ||
          selectedIds.some((id, i) => id !== prevSelectedIds[i])
        ) {
          eventBus.emit(EVENTS.NODE.SELECTION_CHANGED, {
            selectedIds,
            previousSelectedIds: prevSelectedIds,
          });
        }
      },
    ),
  );

  // When transform changes, emit canvas event
  unsubscribers.push(
    useStore.subscribe(
      (state) => state.transform,
      (transform) => {
        eventBus.emit(EVENTS.CANVAS.TRANSFORM_CHANGED, {
          transform,
          previousTransform,
        });
        previousTransform = transform;
      },
    ),
  );

  // Return cleanup function
  return () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
  };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

let cleanupBridge: (() => void) | null = null;
let cleanupEmitters: (() => void) | null = null;

/**
 * Initialize the event bridge (call once at app startup)
 */
export function initializeEventBridge(): void {
  if (cleanupBridge || cleanupEmitters) {
    console.warn('[EventBridge] Already initialized');
    return;
  }

  cleanupBridge = registerEventBridge();
  cleanupEmitters = registerStoreEmitters();

  if (import.meta.env.DEV) {
    console.log('[EventBridge] Initialized');
  }
}

/**
 * Cleanup the event bridge
 */
export function cleanupEventBridge(): void {
  cleanupBridge?.();
  cleanupEmitters?.();
  cleanupBridge = null;
  cleanupEmitters = null;

  if (import.meta.env.DEV) {
    console.log('[EventBridge] Cleaned up');
  }
}
