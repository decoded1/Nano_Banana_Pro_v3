/**
 * Selection Slice
 *
 * State management for node selection.
 * Handles single, multi, and box selection.
 */

import type { Position, Bounds } from '@/types';
import type { StateCreator } from 'zustand';

// =============================================================================
// SLICE STATE
// =============================================================================

export interface SelectionSliceState {
  /** Currently selected node IDs */
  selectedIds: string[];
  /** Primary selected node (for single operations) */
  primarySelectedId: string | null;
  /** Box selection state */
  isBoxSelecting: boolean;
  /** Box selection start position (world coordinates) */
  boxStart: Position | null;
  /** Box selection current position (world coordinates) */
  boxCurrent: Position | null;
  /** Last clicked node (for shift-click range) */
  lastClickedId: string | null;
}

// =============================================================================
// SLICE ACTIONS
// =============================================================================

export interface SelectionSliceActions {
  // Single selection
  selectNode: (nodeId: string, additive?: boolean) => void;
  deselectNode: (nodeId: string) => void;
  toggleNodeSelection: (nodeId: string) => void;

  // Multi selection
  selectNodes: (nodeIds: string[], additive?: boolean) => void;
  selectAll: (allNodeIds: string[]) => void;
  clearSelection: () => void;

  // Box selection
  startBoxSelection: (position: Position) => void;
  updateBoxSelection: (position: Position) => void;
  endBoxSelection: (nodesInBox: string[], additive?: boolean) => void;
  cancelBoxSelection: () => void;
  getBoxBounds: () => Bounds | null;

  // Utilities
  isSelected: (nodeId: string) => boolean;
  getSelectedCount: () => number;
  setPrimarySelected: (nodeId: string | null) => void;
}

export type SelectionSlice = SelectionSliceState & SelectionSliceActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: SelectionSliceState = {
  selectedIds: [],
  primarySelectedId: null,
  isBoxSelecting: false,
  boxStart: null,
  boxCurrent: null,
  lastClickedId: null,
};

// =============================================================================
// SLICE CREATOR
// =============================================================================

export const createSelectionSlice: StateCreator<SelectionSlice, [], [], SelectionSlice> = (
  set,
  get,
) => ({
  ...initialState,

  // ---------------------------------------------------------------------------
  // Single Selection
  // ---------------------------------------------------------------------------

  selectNode: (nodeId, additive = false) => {
    set((state) => {
      if (additive) {
        // Add to existing selection
        if (state.selectedIds.includes(nodeId)) {
          return { lastClickedId: nodeId };
        }
        return {
          selectedIds: [...state.selectedIds, nodeId],
          primarySelectedId: nodeId,
          lastClickedId: nodeId,
        };
      }

      // Replace selection
      return {
        selectedIds: [nodeId],
        primarySelectedId: nodeId,
        lastClickedId: nodeId,
      };
    });
  },

  deselectNode: (nodeId) => {
    set((state) => {
      const newSelectedIds = state.selectedIds.filter((id) => id !== nodeId);
      const newPrimaryId =
        state.primarySelectedId === nodeId
          ? (newSelectedIds[newSelectedIds.length - 1] ?? null)
          : state.primarySelectedId;

      return {
        selectedIds: newSelectedIds,
        primarySelectedId: newPrimaryId,
      };
    });
  },

  toggleNodeSelection: (nodeId) => {
    const state = get();
    if (state.selectedIds.includes(nodeId)) {
      get().deselectNode(nodeId);
    } else {
      get().selectNode(nodeId, true);
    }
  },

  // ---------------------------------------------------------------------------
  // Multi Selection
  // ---------------------------------------------------------------------------

  selectNodes: (nodeIds, additive = false) => {
    set((state) => {
      if (additive) {
        const existingSet = new Set(state.selectedIds);
        const newIds = nodeIds.filter((id) => !existingSet.has(id));
        const combinedIds = [...state.selectedIds, ...newIds];

        return {
          selectedIds: combinedIds,
          primarySelectedId: combinedIds[combinedIds.length - 1] ?? null,
        };
      }

      return {
        selectedIds: nodeIds,
        primarySelectedId: nodeIds[nodeIds.length - 1] ?? null,
      };
    });
  },

  selectAll: (allNodeIds) => {
    set({
      selectedIds: allNodeIds,
      primarySelectedId: allNodeIds[allNodeIds.length - 1] ?? null,
    });
  },

  clearSelection: () => {
    set({
      selectedIds: [],
      primarySelectedId: null,
    });
  },

  // ---------------------------------------------------------------------------
  // Box Selection
  // ---------------------------------------------------------------------------

  startBoxSelection: (position) => {
    set({
      isBoxSelecting: true,
      boxStart: position,
      boxCurrent: position,
    });
  },

  updateBoxSelection: (position) => {
    set((state) => {
      if (!state.isBoxSelecting) return state;
      return { boxCurrent: position };
    });
  },

  endBoxSelection: (nodesInBox, additive = false) => {
    const state = get();
    if (!state.isBoxSelecting) return;

    get().selectNodes(nodesInBox, additive);

    set({
      isBoxSelecting: false,
      boxStart: null,
      boxCurrent: null,
    });
  },

  cancelBoxSelection: () => {
    set({
      isBoxSelecting: false,
      boxStart: null,
      boxCurrent: null,
    });
  },

  getBoxBounds: () => {
    const state = get();
    if (!state.boxStart || !state.boxCurrent) return null;

    const x = Math.min(state.boxStart.x, state.boxCurrent.x);
    const y = Math.min(state.boxStart.y, state.boxCurrent.y);
    const width = Math.abs(state.boxCurrent.x - state.boxStart.x);
    const height = Math.abs(state.boxCurrent.y - state.boxStart.y);

    return { x, y, width, height };
  },

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  isSelected: (nodeId) => {
    return get().selectedIds.includes(nodeId);
  },

  getSelectedCount: () => {
    return get().selectedIds.length;
  },

  setPrimarySelected: (nodeId) => {
    set({ primarySelectedId: nodeId });
  },
});
