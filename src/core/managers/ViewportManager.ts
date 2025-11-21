/**
 * ViewportManager
 *
 * Handles canvas viewport transformations: panning, zooming, and coordinate conversions.
 */

import type {
  Transform,
  ViewOffset,
  ScaleConstraints,
  ViewportState,
  PanState,
  ScreenCoordinates,
  WorldCoordinates,
  Position,
  Bounds,
} from '@/types';

/**
 * Default scale constraints
 */
const DEFAULT_SCALE_CONSTRAINTS: ScaleConstraints = {
  min: 0.1,
  max: 3.0,
};

/**
 * Default zoom step (multiplier per scroll)
 */
const ZOOM_STEP = 0.1;

/**
 * ViewportManager class for managing canvas viewport
 */
export class ViewportManager {
  private _transform: Transform = {
    offset: { x: 0, y: 0 },
    scale: 1,
  };

  private _scaleConstraints: ScaleConstraints = { ...DEFAULT_SCALE_CONSTRAINTS };
  private _viewportSize = { width: 0, height: 0 };
  private _element: HTMLElement | null = null;

  private _panState: PanState = {
    isPanning: false,
    startOffset: { x: 0, y: 0 },
    startMousePosition: { x: 0, y: 0 },
  };

  /**
   * Initialize with a container element
   */
  init(element: HTMLElement): void {
    this._element = element;
    this.updateViewportSize();
  }

  /**
   * Get current transform
   */
  get transform(): Transform {
    return {
      offset: { ...this._transform.offset },
      scale: this._transform.scale,
    };
  }

  /**
   * Get current offset
   */
  get offset(): ViewOffset {
    return { ...this._transform.offset };
  }

  /**
   * Get current scale
   */
  get scale(): number {
    return this._transform.scale;
  }

  /**
   * Check if currently panning
   */
  get isPanning(): boolean {
    return this._panState.isPanning;
  }

  /**
   * Get viewport size
   */
  get viewportSize(): { width: number; height: number } {
    return { ...this._viewportSize };
  }

  /**
   * Get full viewport state
   */
  getState(): ViewportState {
    return {
      transform: this.transform,
      scaleConstraints: { ...this._scaleConstraints },
      visibleBounds: this.getVisibleBounds(),
      viewportSize: this.viewportSize,
    };
  }

  /**
   * Update viewport size from element
   */
  updateViewportSize(): void {
    if (!this._element) return;

    this._viewportSize = {
      width: this._element.clientWidth,
      height: this._element.clientHeight,
    };
  }

  // ===========================================================================
  // PANNING
  // ===========================================================================

  /**
   * Start panning operation
   */
  startPan(mousePosition: Position): void {
    this._panState = {
      isPanning: true,
      startOffset: { ...this._transform.offset },
      startMousePosition: { ...mousePosition },
    };
  }

  /**
   * Update pan during drag
   */
  updatePan(mousePosition: Position): void {
    if (!this._panState.isPanning) return;

    const deltaX = mousePosition.x - this._panState.startMousePosition.x;
    const deltaY = mousePosition.y - this._panState.startMousePosition.y;

    this._transform.offset = {
      x: this._panState.startOffset.x + deltaX,
      y: this._panState.startOffset.y + deltaY,
    };

    this.applyTransform();
  }

  /**
   * End panning operation
   */
  endPan(): void {
    this._panState.isPanning = false;
  }

  /**
   * Set offset directly
   */
  setOffset(offset: ViewOffset): void {
    this._transform.offset = { ...offset };
    this.applyTransform();
  }

  // ===========================================================================
  // ZOOMING
  // ===========================================================================

  /**
   * Zoom in by one step
   */
  zoomIn(center?: Position): void {
    this.zoomBy(ZOOM_STEP, center);
  }

  /**
   * Zoom out by one step
   */
  zoomOut(center?: Position): void {
    this.zoomBy(-ZOOM_STEP, center);
  }

  /**
   * Zoom by a delta amount
   */
  zoomBy(delta: number, center?: Position): void {
    const newScale = this.clampScale(this._transform.scale + delta);
    this.zoomTo(newScale, center);
  }

  /**
   * Zoom to a specific scale
   */
  zoomTo(targetScale: number, center?: Position): void {
    const clampedScale = this.clampScale(targetScale);
    if (clampedScale === this._transform.scale) return;

    // If center provided, zoom around that point
    if (center) {
      const worldBefore = this.screenToWorld({
        screenX: center.x,
        screenY: center.y,
      });

      this._transform.scale = clampedScale;

      const worldAfter = this.screenToWorld({
        screenX: center.x,
        screenY: center.y,
      });

      // Adjust offset to keep the center point stationary
      this._transform.offset.x += (worldAfter.worldX - worldBefore.worldX) * clampedScale;
      this._transform.offset.y += (worldAfter.worldY - worldBefore.worldY) * clampedScale;
    } else {
      // Zoom around viewport center
      const viewportCenter = {
        x: this._viewportSize.width / 2,
        y: this._viewportSize.height / 2,
      };
      this.zoomTo(targetScale, viewportCenter);
      return;
    }

    this.applyTransform();
  }

  /**
   * Handle mouse wheel zoom
   */
  handleWheel(event: WheelEvent): void {
    const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const center: Position = { x: event.clientX, y: event.clientY };

    // Adjust center relative to element
    if (this._element) {
      const rect = this._element.getBoundingClientRect();
      center.x -= rect.left;
      center.y -= rect.top;
    }

    this.zoomBy(delta, center);
  }

  /**
   * Reset zoom to 100%
   */
  resetZoom(): void {
    this.zoomTo(1, undefined);
  }

  /**
   * Fit content to viewport
   */
  fitToContent(contentBounds: Bounds, padding = 50): void {
    const contentWidth = contentBounds.width;
    const contentHeight = contentBounds.height;

    if (contentWidth <= 0 || contentHeight <= 0) return;

    const scaleX = (this._viewportSize.width - padding * 2) / contentWidth;
    const scaleY = (this._viewportSize.height - padding * 2) / contentHeight;
    const newScale = this.clampScale(Math.min(scaleX, scaleY));

    const contentCenterX = contentBounds.x + contentWidth / 2;
    const contentCenterY = contentBounds.y + contentHeight / 2;

    this._transform.scale = newScale;
    this._transform.offset = {
      x: this._viewportSize.width / 2 - contentCenterX * newScale,
      y: this._viewportSize.height / 2 - contentCenterY * newScale,
    };

    this.applyTransform();
  }

  // ===========================================================================
  // COORDINATE CONVERSION
  // ===========================================================================

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screen: ScreenCoordinates): WorldCoordinates {
    return {
      worldX: (screen.screenX - this._transform.offset.x) / this._transform.scale,
      worldY: (screen.screenY - this._transform.offset.y) / this._transform.scale,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(world: WorldCoordinates): ScreenCoordinates {
    return {
      screenX: world.worldX * this._transform.scale + this._transform.offset.x,
      screenY: world.worldY * this._transform.scale + this._transform.offset.y,
    };
  }

  /**
   * Convert a Position (in screen space) to world Position
   */
  screenPositionToWorld(screenPos: Position): Position {
    const world = this.screenToWorld({ screenX: screenPos.x, screenY: screenPos.y });
    return { x: world.worldX, y: world.worldY };
  }

  /**
   * Convert a Position (in world space) to screen Position
   */
  worldPositionToScreen(worldPos: Position): Position {
    const screen = this.worldToScreen({ worldX: worldPos.x, worldY: worldPos.y });
    return { x: screen.screenX, y: screen.screenY };
  }

  // ===========================================================================
  // BOUNDS & VISIBILITY
  // ===========================================================================

  /**
   * Get visible bounds in world coordinates
   */
  getVisibleBounds(): Bounds {
    const topLeft = this.screenToWorld({ screenX: 0, screenY: 0 });
    const bottomRight = this.screenToWorld({
      screenX: this._viewportSize.width,
      screenY: this._viewportSize.height,
    });

    return {
      x: topLeft.worldX,
      y: topLeft.worldY,
      width: bottomRight.worldX - topLeft.worldX,
      height: bottomRight.worldY - topLeft.worldY,
    };
  }

  /**
   * Check if a point is visible in the current viewport
   */
  isPointVisible(point: Position): boolean {
    const bounds = this.getVisibleBounds();
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  /**
   * Check if bounds intersect with visible area
   */
  areBoundsVisible(bounds: Bounds): boolean {
    const visible = this.getVisibleBounds();
    return !(
      bounds.x + bounds.width < visible.x ||
      bounds.x > visible.x + visible.width ||
      bounds.y + bounds.height < visible.y ||
      bounds.y > visible.y + visible.height
    );
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Clamp scale to constraints
   */
  private clampScale(scale: number): number {
    return Math.min(Math.max(scale, this._scaleConstraints.min), this._scaleConstraints.max);
  }

  /**
   * Apply transform to element
   */
  private applyTransform(): void {
    if (!this._element) return;

    // Find the view-transform-wrapper inside the element
    const wrapper = this._element.querySelector('.view-transform-wrapper') as HTMLElement | null;
    if (wrapper) {
      wrapper.style.transform = `translate(${this._transform.offset.x}px, ${this._transform.offset.y}px) scale(${this._transform.scale})`;
    }
  }

  /**
   * Get CSS transform string
   */
  getTransformCSS(): string {
    return `translate(${this._transform.offset.x}px, ${this._transform.offset.y}px) scale(${this._transform.scale})`;
  }

  /**
   * Update scale constraints
   */
  setScaleConstraints(constraints: ScaleConstraints): void {
    this._scaleConstraints = { ...constraints };
    // Re-clamp current scale if needed
    const clamped = this.clampScale(this._transform.scale);
    if (clamped !== this._transform.scale) {
      this._transform.scale = clamped;
      this.applyTransform();
    }
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this._transform = {
      offset: { x: 0, y: 0 },
      scale: 1,
    };
    this.applyTransform();
  }
}
