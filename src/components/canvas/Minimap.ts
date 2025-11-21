/**
 * Minimap Component
 *
 * A miniature overview of the canvas showing node positions.
 * Allows quick navigation by clicking to pan the viewport.
 */

import { useStore } from '@/state';
import { generateId } from '@/utils/id';

import { Component, createElement } from '../shared/Component';

import type { Position, Bounds, NodeState } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface MinimapConfig {
  /** Minimap width in pixels */
  width: number;
  /** Minimap height in pixels */
  height: number;
  /** Background color */
  backgroundColor: string;
  /** Node color */
  nodeColor: string;
  /** Selected node color */
  selectedNodeColor: string;
  /** Viewport indicator color */
  viewportColor: string;
  /** Border radius */
  borderRadius: number;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: MinimapConfig = {
  width: 180,
  height: 120,
  backgroundColor: 'rgba(17, 17, 17, 0.9)',
  nodeColor: 'rgba(255, 255, 255, 0.4)',
  selectedNodeColor: '#fbbf24',
  viewportColor: 'rgba(251, 191, 36, 0.3)',
  borderRadius: 8,
};

// =============================================================================
// MINIMAP COMPONENT
// =============================================================================

/**
 * Canvas minimap for navigation overview
 */
export class Minimap extends Component {
  readonly id = generateId('minimap');

  private config: MinimapConfig;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _unsubscribe: (() => void) | null = null;
  private _isDragging = false;
  private _worldBounds: Bounds = { x: 0, y: 0, width: 1000, height: 1000 };

  constructor(config: Partial<MinimapConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Render the minimap container
   */
  protected render(): HTMLElement {
    const container = createElement('div', { className: 'minimap-container' });

    // Apply inline styles for positioning
    container.style.cssText = `
      position: absolute;
      bottom: 16px;
      right: 16px;
      width: ${this.config.width}px;
      height: ${this.config.height}px;
      background: ${this.config.backgroundColor};
      border-radius: ${this.config.borderRadius}px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
      cursor: pointer;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    // Create canvas for drawing
    this._canvas = document.createElement('canvas');
    this._canvas.width = this.config.width;
    this._canvas.height = this.config.height;
    this._canvas.style.cssText = 'display: block;';
    this._ctx = this._canvas.getContext('2d');

    container.appendChild(this._canvas);

    return container;
  }

  /**
   * Setup on mount
   */
  protected onMount(): void {
    this.setupInteraction();
    this.subscribeToState();
    this.redraw();
  }

  /**
   * Cleanup on destroy
   */
  protected onDestroy(): void {
    this._unsubscribe?.();
    this._canvas = null;
    this._ctx = null;
  }

  // ---------------------------------------------------------------------------
  // State Subscription
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to state changes
   */
  private subscribeToState(): void {
    // Subscribe to nodes and transform changes
    this._unsubscribe = useStore.subscribe(
      (state) => ({
        nodes: state.nodes,
        transform: state.transform,
        selectedIds: state.selectedIds,
        viewportSize: state.viewportSize,
      }),
      () => this.redraw(),
    );
  }

  // ---------------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------------

  /**
   * Setup mouse interaction
   */
  private setupInteraction(): void {
    if (!this._canvas) return;

    this.addEventListener(this._canvas, 'mousedown', this.handleMouseDown.bind(this));
    this.addEventListener(this._canvas, 'mousemove', this.handleMouseMove.bind(this));
    this.addEventListener(this._canvas, 'mouseup', this.handleMouseUp.bind(this));
    this.addEventListener(this._canvas, 'mouseleave', this.handleMouseUp.bind(this));
  }

  /**
   * Handle mouse down
   */
  private handleMouseDown(e: MouseEvent): void {
    this._isDragging = true;
    this.navigateToPosition(e);
  }

  /**
   * Handle mouse move
   */
  private handleMouseMove(e: MouseEvent): void {
    if (this._isDragging) {
      this.navigateToPosition(e);
    }
  }

  /**
   * Handle mouse up
   */
  private handleMouseUp(): void {
    this._isDragging = false;
  }

  /**
   * Navigate to clicked position
   */
  private navigateToPosition(e: MouseEvent): void {
    if (!this._canvas) return;

    const rect = this._canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert minimap position to world coordinates
    const worldX = this._worldBounds.x + (x / this.config.width) * this._worldBounds.width;
    const worldY = this._worldBounds.y + (y / this.config.height) * this._worldBounds.height;

    // Center viewport on clicked position
    const state = useStore.getState();
    const centerOffsetX = state.viewportSize.width / 2 / state.transform.scale;
    const centerOffsetY = state.viewportSize.height / 2 / state.transform.scale;

    state.setTransform({
      ...state.transform,
      offset: {
        x: -(worldX - centerOffsetX) * state.transform.scale,
        y: -(worldY - centerOffsetY) * state.transform.scale,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  /**
   * Redraw the minimap
   */
  private redraw(): void {
    if (!this._canvas || !this._ctx) return;

    const ctx = this._ctx;
    const state = useStore.getState();
    const nodes = Object.values(state.nodes);

    // Calculate world bounds
    this._worldBounds = this.calculateWorldBounds(nodes);

    // Clear canvas
    ctx.clearRect(0, 0, this.config.width, this.config.height);

    // Draw background
    ctx.fillStyle = this.config.backgroundColor;
    ctx.fillRect(0, 0, this.config.width, this.config.height);

    // Draw nodes
    this.drawNodes(ctx, nodes, state.selectedIds);

    // Draw viewport indicator
    this.drawViewport(ctx, state.transform, state.viewportSize);
  }

  /**
   * Calculate bounds encompassing all nodes
   */
  private calculateWorldBounds(nodes: NodeState[]): Bounds {
    if (nodes.length === 0) {
      return { x: 0, y: 0, width: 2000, height: 2000 };
    }

    const nodeWidth = 260;
    const nodeHeight = 320;
    const padding = 200;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + nodeWidth);
      maxY = Math.max(maxY, node.position.y + nodeHeight);
    }

    // Add padding
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    // Ensure minimum size
    const width = Math.max(maxX - minX, 1000);
    const height = Math.max(maxY - minY, 800);

    return { x: minX, y: minY, width, height };
  }

  /**
   * Draw nodes on minimap
   */
  private drawNodes(
    ctx: CanvasRenderingContext2D,
    nodes: NodeState[],
    selectedIds: string[],
  ): void {
    const nodeWidth = 260;
    const nodeHeight = 320;

    for (const node of nodes) {
      if (node.config.isGhost) continue;

      // Convert world to minimap coordinates
      const x = this.worldToMinimap(node.position.x, 'x');
      const y = this.worldToMinimap(node.position.y, 'y');
      const w = (nodeWidth / this._worldBounds.width) * this.config.width;
      const h = (nodeHeight / this._worldBounds.height) * this.config.height;

      // Set color based on selection
      ctx.fillStyle = selectedIds.includes(node.config.id)
        ? this.config.selectedNodeColor
        : this.config.nodeColor;

      // Draw node rectangle
      ctx.fillRect(x, y, Math.max(w, 3), Math.max(h, 4));
    }
  }

  /**
   * Draw viewport indicator
   */
  private drawViewport(
    ctx: CanvasRenderingContext2D,
    transform: { offset: Position; scale: number },
    viewportSize: { width: number; height: number },
  ): void {
    // Calculate visible area in world coordinates
    const visibleX = -transform.offset.x / transform.scale;
    const visibleY = -transform.offset.y / transform.scale;
    const visibleWidth = viewportSize.width / transform.scale;
    const visibleHeight = viewportSize.height / transform.scale;

    // Convert to minimap coordinates
    const x = this.worldToMinimap(visibleX, 'x');
    const y = this.worldToMinimap(visibleY, 'y');
    const w = (visibleWidth / this._worldBounds.width) * this.config.width;
    const h = (visibleHeight / this._worldBounds.height) * this.config.height;

    // Draw viewport rectangle
    ctx.strokeStyle = this.config.viewportColor;
    ctx.lineWidth = 2;
    ctx.fillStyle = this.config.viewportColor;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  }

  /**
   * Convert world coordinate to minimap coordinate
   */
  private worldToMinimap(value: number, axis: 'x' | 'y'): number {
    const origin = axis === 'x' ? this._worldBounds.x : this._worldBounds.y;
    const size = axis === 'x' ? this._worldBounds.width : this._worldBounds.height;
    const minimapSize = axis === 'x' ? this.config.width : this.config.height;

    return ((value - origin) / size) * minimapSize;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Force a redraw
   */
  forceRedraw(): void {
    this.redraw();
  }

  /**
   * Show/hide the minimap
   */
  setVisible(visible: boolean): void {
    if (this._element) {
      this._element.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Check if minimap is visible
   */
  get isVisible(): boolean {
    return this._element?.style.display !== 'none';
  }
}

export default Minimap;
