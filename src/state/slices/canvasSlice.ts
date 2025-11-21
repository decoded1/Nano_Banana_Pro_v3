/**
 * Canvas Slice
 *
 * State management for the canvas viewport.
 * Handles pan, zoom, transform, and visible bounds.
 */

import type {
  Transform,
  ViewOffset,
  Bounds,
  Position,
  CanvasMode,
  BackgroundConfig,
  ScaleConstraints,
} from '@/types';
import type { StateCreator } from 'zustand';

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_SCALE_CONSTRAINTS: ScaleConstraints = {
  min: 0.1,
  max: 3.0,
};

const DEFAULT_BACKGROUND: BackgroundConfig = {
  color: '#111111',
  grid: {
    size: 20,
    color: '#1a1a1a',
    dotRadius: 1,
    visible: true,
    snapEnabled: false,
  },
  vignetteIntensity: 0.3,
};

// =============================================================================
// SLICE STATE
// =============================================================================

export interface CanvasSliceState {
  /** Current transform (pan + zoom) */
  transform: Transform;
  /** Scale constraints */
  scaleConstraints: ScaleConstraints;
  /** Current canvas mode */
  mode: CanvasMode;
  /** Visible bounds in world coordinates */
  visibleBounds: Bounds;
  /** Viewport dimensions */
  viewportSize: { width: number; height: number };
  /** Background configuration */
  background: BackgroundConfig;
  /** Whether panning is active */
  isPanning: boolean;
  /** Pan start position */
  panStartPosition: Position | null;
  /** Pan start offset */
  panStartOffset: ViewOffset | null;
}

// =============================================================================
// SLICE ACTIONS
// =============================================================================

export interface CanvasSliceActions {
  // Transform
  setTransform: (transform: Transform) => void;
  setOffset: (offset: ViewOffset) => void;
  setScale: (scale: number, center?: Position) => void;

  // Pan
  startPan: (position: Position) => void;
  updatePan: (position: Position) => void;
  endPan: () => void;

  // Zoom
  zoomIn: (center?: Position) => void;
  zoomOut: (center?: Position) => void;
  zoomToFit: (bounds: Bounds, padding?: number) => void;
  resetZoom: () => void;

  // Mode
  setMode: (mode: CanvasMode) => void;

  // Viewport
  setViewportSize: (size: { width: number; height: number }) => void;
  updateVisibleBounds: () => void;

  // Background
  setBackgroundConfig: (config: Partial<BackgroundConfig>) => void;
  toggleGrid: () => void;
  setGridSnap: (enabled: boolean) => void;

  // Coordinate conversion
  screenToWorld: (screen: Position) => Position;
  worldToScreen: (world: Position) => Position;
}

export type CanvasSlice = CanvasSliceState & CanvasSliceActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: CanvasSliceState = {
  transform: {
    offset: { x: 0, y: 0 },
    scale: 1,
  },
  scaleConstraints: DEFAULT_SCALE_CONSTRAINTS,
  mode: 'pan',
  visibleBounds: { x: 0, y: 0, width: 0, height: 0 },
  viewportSize: { width: 0, height: 0 },
  background: DEFAULT_BACKGROUND,
  isPanning: false,
  panStartPosition: null,
  panStartOffset: null,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function clampScale(scale: number, constraints: ScaleConstraints): number {
  return Math.max(constraints.min, Math.min(constraints.max, scale));
}

function calculateVisibleBounds(
  offset: ViewOffset,
  scale: number,
  viewportSize: { width: number; height: number },
): Bounds {
  const worldWidth = viewportSize.width / scale;
  const worldHeight = viewportSize.height / scale;

  return {
    x: -offset.x / scale,
    y: -offset.y / scale,
    width: worldWidth,
    height: worldHeight,
  };
}

// =============================================================================
// SLICE CREATOR
// =============================================================================

export const createCanvasSlice: StateCreator<CanvasSlice, [], [], CanvasSlice> = (set, get) => ({
  ...initialState,

  // ---------------------------------------------------------------------------
  // Transform
  // ---------------------------------------------------------------------------

  setTransform: (transform) => {
    const state = get();
    const clampedScale = clampScale(transform.scale, state.scaleConstraints);
    const newTransform = { ...transform, scale: clampedScale };

    set({
      transform: newTransform,
      visibleBounds: calculateVisibleBounds(
        newTransform.offset,
        newTransform.scale,
        state.viewportSize,
      ),
    });
  },

  setOffset: (offset) => {
    const state = get();
    const newTransform = { ...state.transform, offset };

    set({
      transform: newTransform,
      visibleBounds: calculateVisibleBounds(offset, state.transform.scale, state.viewportSize),
    });
  },

  setScale: (scale, center) => {
    const state = get();
    const clampedScale = clampScale(scale, state.scaleConstraints);
    const { offset } = state.transform;
    const currentScale = state.transform.scale;

    let newOffset = offset;

    // If center point provided, zoom towards it
    if (center) {
      const scaleFactor = clampedScale / currentScale;
      newOffset = {
        x: center.x - (center.x - offset.x) * scaleFactor,
        y: center.y - (center.y - offset.y) * scaleFactor,
      };
    }

    const newTransform = { offset: newOffset, scale: clampedScale };

    set({
      transform: newTransform,
      visibleBounds: calculateVisibleBounds(newOffset, clampedScale, state.viewportSize),
    });
  },

  // ---------------------------------------------------------------------------
  // Pan
  // ---------------------------------------------------------------------------

  startPan: (position) => {
    const { transform } = get();
    set({
      isPanning: true,
      panStartPosition: position,
      panStartOffset: { ...transform.offset },
    });
  },

  updatePan: (position) => {
    const state = get();
    if (!state.isPanning || !state.panStartPosition || !state.panStartOffset) return;

    const dx = position.x - state.panStartPosition.x;
    const dy = position.y - state.panStartPosition.y;

    const newOffset: ViewOffset = {
      x: state.panStartOffset.x + dx,
      y: state.panStartOffset.y + dy,
    };

    set({
      transform: { ...state.transform, offset: newOffset },
      visibleBounds: calculateVisibleBounds(newOffset, state.transform.scale, state.viewportSize),
    });
  },

  endPan: () => {
    set({
      isPanning: false,
      panStartPosition: null,
      panStartOffset: null,
    });
  },

  // ---------------------------------------------------------------------------
  // Zoom
  // ---------------------------------------------------------------------------

  zoomIn: (center) => {
    const state = get();
    const newScale = state.transform.scale * 1.2;
    get().setScale(newScale, center);
  },

  zoomOut: (center) => {
    const state = get();
    const newScale = state.transform.scale / 1.2;
    get().setScale(newScale, center);
  },

  zoomToFit: (bounds, padding = 50) => {
    const state = get();
    const { viewportSize } = state;

    if (viewportSize.width === 0 || viewportSize.height === 0) return;

    // Calculate scale to fit bounds
    const availableWidth = viewportSize.width - padding * 2;
    const availableHeight = viewportSize.height - padding * 2;

    const scaleX = availableWidth / bounds.width;
    const scaleY = availableHeight / bounds.height;
    const scale = clampScale(Math.min(scaleX, scaleY), state.scaleConstraints);

    // Calculate offset to center bounds
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const offset: ViewOffset = {
      x: viewportSize.width / 2 - centerX * scale,
      y: viewportSize.height / 2 - centerY * scale,
    };

    set({
      transform: { offset, scale },
      visibleBounds: calculateVisibleBounds(offset, scale, viewportSize),
    });
  },

  resetZoom: () => {
    const state = get();
    const newTransform: Transform = {
      offset: { x: 0, y: 0 },
      scale: 1,
    };

    set({
      transform: newTransform,
      visibleBounds: calculateVisibleBounds({ x: 0, y: 0 }, 1, state.viewportSize),
    });
  },

  // ---------------------------------------------------------------------------
  // Mode
  // ---------------------------------------------------------------------------

  setMode: (mode) => {
    set({ mode });
  },

  // ---------------------------------------------------------------------------
  // Viewport
  // ---------------------------------------------------------------------------

  setViewportSize: (size) => {
    const state = get();
    set({
      viewportSize: size,
      visibleBounds: calculateVisibleBounds(state.transform.offset, state.transform.scale, size),
    });
  },

  updateVisibleBounds: () => {
    const state = get();
    set({
      visibleBounds: calculateVisibleBounds(
        state.transform.offset,
        state.transform.scale,
        state.viewportSize,
      ),
    });
  },

  // ---------------------------------------------------------------------------
  // Background
  // ---------------------------------------------------------------------------

  setBackgroundConfig: (config) => {
    set((state) => ({
      background: {
        ...state.background,
        ...config,
        grid: config.grid ? { ...state.background.grid, ...config.grid } : state.background.grid,
      },
    }));
  },

  toggleGrid: () => {
    set((state) => ({
      background: {
        ...state.background,
        grid: {
          ...state.background.grid,
          visible: !state.background.grid.visible,
        },
      },
    }));
  },

  setGridSnap: (enabled) => {
    set((state) => ({
      background: {
        ...state.background,
        grid: {
          ...state.background.grid,
          snapEnabled: enabled,
        },
      },
    }));
  },

  // ---------------------------------------------------------------------------
  // Coordinate Conversion
  // ---------------------------------------------------------------------------

  screenToWorld: (screen) => {
    const { transform } = get();
    return {
      x: (screen.x - transform.offset.x) / transform.scale,
      y: (screen.y - transform.offset.y) / transform.scale,
    };
  },

  worldToScreen: (world) => {
    const { transform } = get();
    return {
      x: world.x * transform.scale + transform.offset.x,
      y: world.y * transform.scale + transform.offset.y,
    };
  },
});
