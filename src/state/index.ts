/**
 * State Management - Barrel Export
 *
 * Central export for all state management utilities.
 */

// Main store
export {
  useStore,
  getStoreActions,
  subscribeToStore,
  subscribeToNodes,
  subscribeToSelection,
  subscribeToQueue,
} from './store';

export type { AppState } from './store';

// Selectors
export {
  selectNode,
  selectSelectedNodes,
  selectVisibleNodes,
  selectNodesByZIndex,
  selectPendingGenerations,
  selectActiveGeneration,
  selectActiveReferencesCount,
  selectCanAddReference,
} from './store';

// Event bridge
export { initializeEventBridge, cleanupEventBridge } from './eventBridge';

// Slice types
export type {
  NodesSlice,
  NodesSliceState,
  NodesSliceActions,
  CanvasSlice,
  CanvasSliceState,
  CanvasSliceActions,
  SelectionSlice,
  SelectionSliceState,
  SelectionSliceActions,
  GenerationSlice,
  GenerationSliceState,
  GenerationSliceActions,
  UISlice,
  UISliceState,
  UISliceActions,
} from './slices';
