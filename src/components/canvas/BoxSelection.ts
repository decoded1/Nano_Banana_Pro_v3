/**
 * Box Selection Component
 *
 * Visual component for box/marquee selection on the canvas.
 * Draws the selection rectangle and handles node detection.
 */

import { useStore } from '@/state';
import { generateId } from '@/utils/id';

import { Component, createElement } from '../shared/Component';

import type { Position, Bounds, NodeState } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface BoxSelectionConfig {
  /** Fill color of selection box */
  fillColor: string;
  /** Border color of selection box */
  borderColor: string;
  /** Border width */
  borderWidth: number;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: BoxSelectionConfig = {
  fillColor: 'rgba(251, 191, 36, 0.1)',
  borderColor: 'rgba(251, 191, 36, 0.6)',
  borderWidth: 1,
};

// =============================================================================
// BOX SELECTION COMPONENT
// =============================================================================

/**
 * Box selection overlay for the canvas
 */
export class BoxSelection extends Component {
  readonly id = generateId('box-selection');

  private config: BoxSelectionConfig;
  private _boxElement: HTMLElement | null = null;
  private _unsubscribe: (() => void) | null = null;
  private _nodeSize = { width: 260, height: 320 };

  constructor(config: Partial<BoxSelectionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Render the selection box container
   */
  protected render(): HTMLElement {
    const container = createElement('div', { className: 'box-selection-container' });
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 50;
    `;

    this._boxElement = createElement('div', { className: 'box-selection' });
    this._boxElement.style.cssText = `
      position: absolute;
      background: ${this.config.fillColor};
      border: ${this.config.borderWidth}px dashed ${this.config.borderColor};
      display: none;
      pointer-events: none;
    `;

    container.appendChild(this._boxElement);
    return container;
  }

  /**
   * Setup on mount
   */
  protected onMount(): void {
    this.subscribeToState();
  }

  /**
   * Cleanup on destroy
   */
  protected onDestroy(): void {
    this._unsubscribe?.();
    this._boxElement = null;
  }

  // ---------------------------------------------------------------------------
  // State Subscription
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to box selection state changes
   */
  private subscribeToState(): void {
    this._unsubscribe = useStore.subscribe(
      (state) => ({
        isBoxSelecting: state.isBoxSelecting,
        boxStart: state.boxStart,
        boxCurrent: state.boxCurrent,
        transform: state.transform,
      }),
      (selection) => {
        if (selection.isBoxSelecting && selection.boxStart && selection.boxCurrent) {
          this.showBox(selection.boxStart, selection.boxCurrent, selection.transform);
        } else {
          this.hideBox();
        }
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Box Rendering
  // ---------------------------------------------------------------------------

  /**
   * Show and position the selection box
   */
  private showBox(
    start: Position,
    current: Position,
    transform: { offset: Position; scale: number },
  ): void {
    if (!this._boxElement) return;

    // Convert world coordinates to screen coordinates
    const screenStart = {
      x: start.x * transform.scale + transform.offset.x,
      y: start.y * transform.scale + transform.offset.y,
    };
    const screenCurrent = {
      x: current.x * transform.scale + transform.offset.x,
      y: current.y * transform.scale + transform.offset.y,
    };

    // Calculate box bounds
    const x = Math.min(screenStart.x, screenCurrent.x);
    const y = Math.min(screenStart.y, screenCurrent.y);
    const width = Math.abs(screenCurrent.x - screenStart.x);
    const height = Math.abs(screenCurrent.y - screenStart.y);

    this._boxElement.style.display = 'block';
    this._boxElement.style.left = `${x}px`;
    this._boxElement.style.top = `${y}px`;
    this._boxElement.style.width = `${width}px`;
    this._boxElement.style.height = `${height}px`;
  }

  /**
   * Hide the selection box
   */
  private hideBox(): void {
    if (!this._boxElement) return;
    this._boxElement.style.display = 'none';
  }

  // ---------------------------------------------------------------------------
  // Node Detection
  // ---------------------------------------------------------------------------

  /**
   * Get IDs of nodes within the selection box
   */
  getNodesInBox(): string[] {
    const state = useStore.getState();
    const bounds = state.getBoxBounds();

    if (!bounds) return [];

    const nodes = Object.values(state.nodes);
    return nodes
      .filter((node: NodeState) => !node.config.isGhost && this.nodeIntersectsBox(node, bounds))
      .map((node: NodeState) => node.config.id);
  }

  /**
   * Check if a node intersects with the selection box
   */
  private nodeIntersectsBox(node: NodeState, box: Bounds): boolean {
    const nodeBox: Bounds = {
      x: node.position.x,
      y: node.position.y,
      width: this._nodeSize.width,
      height: this._nodeSize.height,
    };

    // AABB intersection test
    return !(
      nodeBox.x + nodeBox.width < box.x ||
      box.x + box.width < nodeBox.x ||
      nodeBox.y + nodeBox.height < box.y ||
      box.y + box.height < nodeBox.y
    );
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Update node size for intersection detection
   */
  setNodeSize(width: number, height: number): void {
    this._nodeSize = { width, height };
  }
}

export default BoxSelection;
