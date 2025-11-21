/**
 * Canvas Type Definitions
 *
 * Types for the infinite canvas viewport, transforms, and spatial operations.
 */

import type { Position, Bounds } from './node.types';

// =============================================================================
// VIEWPORT & TRANSFORM
// =============================================================================

/**
 * Viewport offset (pan position)
 */
export interface ViewOffset {
  x: number;
  y: number;
}

/**
 * Scale constraints for zoom
 */
export interface ScaleConstraints {
  min: number;
  max: number;
}

/**
 * Transform state for the canvas view
 */
export interface Transform {
  /** Pan offset */
  offset: ViewOffset;
  /** Zoom scale (1.0 = 100%) */
  scale: number;
}

/**
 * Full viewport state
 */
export interface ViewportState {
  /** Current transform (pan + zoom) */
  transform: Transform;
  /** Scale constraints */
  scaleConstraints: ScaleConstraints;
  /** Visible bounds in world coordinates */
  visibleBounds: Bounds;
  /** Viewport size in screen pixels */
  viewportSize: {
    width: number;
    height: number;
  };
}

// =============================================================================
// COORDINATE SYSTEMS
// =============================================================================

/**
 * Screen coordinates (pixels from viewport origin)
 */
export interface ScreenCoordinates {
  screenX: number;
  screenY: number;
}

/**
 * World coordinates (canvas space, affected by transform)
 */
export interface WorldCoordinates {
  worldX: number;
  worldY: number;
}

/**
 * Coordinate conversion utilities type
 */
export interface CoordinateConverter {
  screenToWorld: (screen: ScreenCoordinates, transform: Transform) => WorldCoordinates;
  worldToScreen: (world: WorldCoordinates, transform: Transform) => ScreenCoordinates;
}

// =============================================================================
// CANVAS INTERACTION
// =============================================================================

/**
 * Canvas interaction mode
 */
export type CanvasMode = 'pan' | 'select' | 'connect' | 'box-select';

/**
 * Pan state during drag
 */
export interface PanState {
  isPanning: boolean;
  startOffset: ViewOffset;
  startMousePosition: Position;
}

/**
 * Zoom state
 */
export interface ZoomState {
  isZooming: boolean;
  zoomCenter: Position;
}

/**
 * Box selection state
 */
export interface BoxSelectState {
  isSelecting: boolean;
  startPosition: Position;
  currentPosition: Position;
  selectionBounds: Bounds | null;
}

/**
 * Combined canvas interaction state
 */
export interface CanvasInteractionState {
  mode: CanvasMode;
  pan: PanState;
  zoom: ZoomState;
  boxSelect: BoxSelectState;
}

// =============================================================================
// GRID & BACKGROUND
// =============================================================================

/**
 * Grid configuration
 */
export interface GridConfig {
  /** Grid cell size in pixels */
  size: number;
  /** Grid dot/line color */
  color: string;
  /** Grid dot radius (for dot grid) */
  dotRadius: number;
  /** Whether grid is visible */
  visible: boolean;
  /** Snap to grid enabled */
  snapEnabled: boolean;
}

/**
 * Background configuration
 */
export interface BackgroundConfig {
  /** Background color */
  color: string;
  /** Grid configuration */
  grid: GridConfig;
  /** Vignette shadow intensity (0-1) */
  vignetteIntensity: number;
}
