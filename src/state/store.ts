/**
 * Main State Store
 *
 * Central state management using Zustand with slice pattern.
 * Combines all slices into a unified store with devtools support.
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import { createCanvasSlice, type CanvasSlice } from './slices/canvasSlice';
import { createGenerationSlice, type GenerationSlice } from './slices/generationSlice';
import { createNodesSlice, type NodesSlice } from './slices/nodesSlice';
import { createSelectionSlice, type SelectionSlice } from './slices/selectionSlice';
import { createUISlice, type UISlice } from './slices/uiSlice';

// =============================================================================
// COMBINED STORE TYPE
// =============================================================================

export type AppState = NodesSlice & CanvasSlice & SelectionSlice & GenerationSlice & UISlice;

// =============================================================================
// STORE CREATION
// =============================================================================

/**
 * Main application store
 *
 * Uses the slice pattern to compose multiple state domains:
 * - nodes: Canvas nodes (CRUD, position, selection)
 * - canvas: Viewport (pan, zoom, transform)
 * - selection: Node selection (single, multi, box)
 * - generation: Image generation (queue, config, API)
 * - ui: UI state (drawer, modals, toasts)
 */
export const useStore = create<AppState>()(
  devtools(
    subscribeWithSelector((...args) => ({
      ...createNodesSlice(...args),
      ...createCanvasSlice(...args),
      ...createSelectionSlice(...args),
      ...createGenerationSlice(...args),
      ...createUISlice(...args),
    })),
    {
      name: 'NanoBananaPro',
      enabled: import.meta.env.DEV,
    },
  ),
);

// =============================================================================
// SELECTOR HELPERS
// =============================================================================

/**
 * Get a node by ID
 */
export const selectNode = (nodeId: string) => (state: AppState) => state.nodes[nodeId];

/**
 * Get all selected nodes
 */
export const selectSelectedNodes = (state: AppState) =>
  state.selectedIds.map((id) => state.nodes[id]).filter(Boolean);

/**
 * Get visible nodes
 */
export const selectVisibleNodes = (state: AppState) =>
  Object.values(state.nodes).filter((node) => node.isVisible);

/**
 * Get nodes sorted by z-index
 */
export const selectNodesByZIndex = (state: AppState) =>
  Object.values(state.nodes).sort((a, b) => a.zIndex - b.zIndex);

/**
 * Get pending generation requests
 */
export const selectPendingGenerations = (state: AppState) =>
  state.queue.filter((item) => item.status === 'pending' || item.status === 'queued');

/**
 * Get active generation
 */
export const selectActiveGeneration = (state: AppState) =>
  state.queue.find((item) => item.requestId === state.activeRequestId);

/**
 * Get total active references count
 */
export const selectActiveReferencesCount = (state: AppState) =>
  state.references.filter((ref) => ref.isActive).length;

/**
 * Check if can add more references
 */
export const selectCanAddReference = (state: AppState) => state.canAddReference();

// =============================================================================
// STORE ACTIONS (Direct access)
// =============================================================================

/**
 * Get store actions without subscribing to state
 */
export const getStoreActions = () => {
  const state = useStore.getState();

  return {
    // Nodes
    addNode: state.addNode,
    removeNode: state.removeNode,
    updateNode: state.updateNode,
    setNodePosition: state.setNodePosition,
    addGhostNode: state.addGhostNode,
    convertGhostToNode: state.convertGhostToNode,

    // Canvas
    setTransform: state.setTransform,
    setScale: state.setScale,
    startPan: state.startPan,
    updatePan: state.updatePan,
    endPan: state.endPan,
    zoomIn: state.zoomIn,
    zoomOut: state.zoomOut,
    zoomToFit: state.zoomToFit,
    resetZoom: state.resetZoom,
    setMode: state.setMode,
    screenToWorld: state.screenToWorld,
    worldToScreen: state.worldToScreen,

    // Selection
    selectNode: state.selectNode,
    deselectNode: state.deselectNode,
    selectNodes: state.selectNodes,
    clearSelection: state.clearSelection,
    startBoxSelection: state.startBoxSelection,
    updateBoxSelection: state.updateBoxSelection,
    endBoxSelection: state.endBoxSelection,

    // Generation
    queueGeneration: state.queueGeneration,
    cancelGeneration: state.cancelGeneration,
    setDefaultConfig: state.setDefaultConfig,
    addReference: state.addReference,
    removeReference: state.removeReference,

    // UI
    openDrawer: state.openDrawer,
    closeDrawer: state.closeDrawer,
    openModal: state.openModal,
    closeModal: state.closeModal,
    showToast: state.showToast,
    dismissToast: state.dismissToast,
    setPromptText: state.setPromptText,
    setPromptConfig: state.setPromptConfig,
  };
};

// =============================================================================
// STORE SUBSCRIPTION HELPERS
// =============================================================================

/**
 * Subscribe to specific state changes
 */
export const subscribeToStore = <T>(
  selector: (state: AppState) => T,
  callback: (value: T, prevValue: T) => void,
) => {
  return useStore.subscribe(selector, callback);
};

/**
 * Subscribe to node changes
 */
export const subscribeToNodes = (callback: (nodes: AppState['nodes']) => void) => {
  return useStore.subscribe((state) => state.nodes, callback);
};

/**
 * Subscribe to selection changes
 */
export const subscribeToSelection = (callback: (selectedIds: string[]) => void) => {
  return useStore.subscribe((state) => state.selectedIds, callback);
};

/**
 * Subscribe to generation queue changes
 */
export const subscribeToQueue = (callback: (queue: AppState['queue']) => void) => {
  return useStore.subscribe((state) => state.queue, callback);
};

// =============================================================================
// EXPORTS
// =============================================================================

// Re-export slice types for convenience
export type { NodesSlice } from './slices/nodesSlice';
export type { CanvasSlice } from './slices/canvasSlice';
export type { SelectionSlice } from './slices/selectionSlice';
export type { GenerationSlice } from './slices/generationSlice';
export type { UISlice } from './slices/uiSlice';
