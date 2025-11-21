/**
 * Canvas Component
 *
 * The infinite canvas workspace with pan/zoom capabilities.
 * Handles viewport transformations and contains all nodes.
 */

import { eventBus, EVENTS } from '@/core/events';
import { useStore } from '@/state';
import { generateId } from '@/utils/id';

import { Component, createElement } from '../shared/Component';

import type { Position, Transform } from '@/types';

/**
 * Canvas component for the infinite workspace
 */
export class Canvas extends Component {
  readonly id = generateId('canvas');

  private _workspace: HTMLElement | null = null;
  private _viewTransform: HTMLElement | null = null;
  private _connectionSvg: SVGSVGElement | null = null;
  private _nodesContainer: HTMLElement | null = null;

  private _isPanning = false;
  private _panStart: Position = { x: 0, y: 0 };
  private _lastTransform: Transform = { offset: { x: 0, y: 0 }, scale: 1 };

  /**
   * Get the view transform wrapper element
   */
  get viewTransform(): HTMLElement | null {
    return this._viewTransform;
  }

  /**
   * Get the nodes container element
   */
  get nodesContainer(): HTMLElement | null {
    return this._nodesContainer;
  }

  /**
   * Get the connection SVG element
   */
  get connectionSvg(): SVGSVGElement | null {
    return this._connectionSvg;
  }

  /**
   * Render the canvas
   */
  protected render(): HTMLElement {
    // Create workspace container
    this._workspace = createElement('div', { className: 'workspace' });
    this._workspace.id = this.id;

    // Create view transform wrapper
    this._viewTransform = createElement('div', { className: 'view-transform-wrapper' });

    // Create connection SVG layer
    this._connectionSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this._connectionSvg.classList.add('connection-svg');
    this._connectionSvg.setAttribute('width', '100%');
    this._connectionSvg.setAttribute('height', '100%');

    // Create nodes container (within view transform for proper scaling)
    this._nodesContainer = createElement('div', { className: 'nodes-container' });

    // Assemble DOM structure
    this._viewTransform.appendChild(this._connectionSvg);
    this._viewTransform.appendChild(this._nodesContainer);
    this._workspace.appendChild(this._viewTransform);

    return this._workspace;
  }

  /**
   * Setup event handlers on mount
   */
  protected onMount(): void {
    this.setupPanHandlers();
    this.setupZoomHandler();
    this.subscribeToStore();

    // Set initial viewport size
    this.updateViewportSize();

    // Listen for window resize
    this.addEventListener(window, 'resize', this.handleResize.bind(this));
  }

  /**
   * Setup pan event handlers
   */
  private setupPanHandlers(): void {
    if (!this._workspace) return;

    this.addEventListener(this._workspace, 'mousedown', this.handlePanStart.bind(this));
    this.addEventListener(window, 'mousemove', this.handlePanMove.bind(this));
    this.addEventListener(window, 'mouseup', this.handlePanEnd.bind(this));
  }

  /**
   * Setup zoom (wheel) handler
   */
  private setupZoomHandler(): void {
    if (!this._workspace) return;

    this.addEventListener(this._workspace, 'wheel', this.handleWheel.bind(this), {
      passive: false,
    });
  }

  /**
   * Subscribe to store changes
   */
  private subscribeToStore(): void {
    // Subscribe to transform changes
    useStore.subscribe(
      (state) => state.transform,
      (transform) => {
        this.applyTransform(transform);
      },
    );
  }

  /**
   * Handle pan start
   */
  private handlePanStart(e: MouseEvent): void {
    // Only pan on direct workspace click (not on nodes)
    if (e.target !== this._workspace) return;

    // Only pan with left mouse button
    if (e.button !== 0) return;

    this._isPanning = true;
    this._panStart = { x: e.clientX, y: e.clientY };
    this._lastTransform = { ...useStore.getState().transform };

    useStore.getState().startPan({ x: e.clientX, y: e.clientY });

    // Emit event
    eventBus.emit(EVENTS.CANVAS.PAN_START, {
      startOffset: this._lastTransform.offset,
      mousePosition: this._panStart,
    });
  }

  /**
   * Handle pan move
   */
  private handlePanMove(e: MouseEvent): void {
    if (!this._isPanning) return;

    const dx = e.clientX - this._panStart.x;
    const dy = e.clientY - this._panStart.y;

    const newOffset = {
      x: this._lastTransform.offset.x + dx,
      y: this._lastTransform.offset.y + dy,
    };

    useStore.getState().setOffset(newOffset);
  }

  /**
   * Handle pan end
   */
  private handlePanEnd(): void {
    if (!this._isPanning) return;

    this._isPanning = false;
    useStore.getState().endPan();

    // Emit event
    eventBus.emit(EVENTS.CANVAS.PAN_END, {
      finalOffset: useStore.getState().transform.offset,
    });
  }

  /**
   * Handle mouse wheel for zoom
   */
  private handleWheel(e: WheelEvent): void {
    e.preventDefault();

    const state = useStore.getState();
    const { transform } = state;

    // Calculate zoom delta
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = transform.scale * delta;

    // Zoom towards cursor position
    const rect = this._workspace?.getBoundingClientRect();
    if (!rect) return;

    const center = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    state.setScale(newScale, center);

    // Emit zoom event
    eventBus.emit(EVENTS.CANVAS.ZOOM, {
      scale: state.transform.scale,
      previousScale: transform.scale,
      center,
    });
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    this.updateViewportSize();
  }

  /**
   * Update viewport size in store
   */
  private updateViewportSize(): void {
    if (!this._workspace) return;

    const rect = this._workspace.getBoundingClientRect();
    useStore.getState().setViewportSize({
      width: rect.width,
      height: rect.height,
    });
  }

  /**
   * Apply transform to view
   */
  private applyTransform(transform: Transform): void {
    if (!this._viewTransform) return;

    this._viewTransform.style.transform = `translate(${transform.offset.x}px, ${transform.offset.y}px) scale(${transform.scale})`;
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screen: Position): Position {
    return useStore.getState().screenToWorld(screen);
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(world: Position): Position {
    return useStore.getState().worldToScreen(world);
  }

  /**
   * Add a node element to the canvas
   */
  addNodeElement(element: HTMLElement): void {
    this._nodesContainer?.appendChild(element);
  }

  /**
   * Remove a node element from the canvas
   */
  removeNodeElement(element: HTMLElement): void {
    element.remove();
  }

  /**
   * Add a wire to the SVG layer
   */
  addWire(path: SVGPathElement): void {
    this._connectionSvg?.appendChild(path);
  }

  /**
   * Remove a wire from the SVG layer
   */
  removeWire(path: SVGPathElement): void {
    path.remove();
  }

  /**
   * Cleanup on destroy
   */
  protected onDestroy(): void {
    this._workspace = null;
    this._viewTransform = null;
    this._connectionSvg = null;
    this._nodesContainer = null;
  }
}
