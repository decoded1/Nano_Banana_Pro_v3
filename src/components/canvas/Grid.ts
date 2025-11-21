/**
 * Grid Component
 *
 * Renders the background dot grid pattern.
 * Currently handled via CSS, but this component provides
 * programmatic control and optional snap-to-grid functionality.
 */

import { useStore } from '@/state';
import { generateId } from '@/utils/id';

import { Component, createElement } from '../shared/Component';

import type { Position, BackgroundConfig } from '@/types';

/**
 * Grid component for background pattern
 */
export class Grid extends Component {
  readonly id = generateId('grid');

  private _gridSize = 20;
  private _snapEnabled = false;

  /**
   * Get current grid size
   */
  get gridSize(): number {
    return this._gridSize;
  }

  /**
   * Check if snap-to-grid is enabled
   */
  get snapEnabled(): boolean {
    return this._snapEnabled;
  }

  /**
   * Render the grid (CSS handles the visual)
   */
  protected render(): HTMLElement {
    // Grid is rendered via CSS on .workspace
    // This element is just for potential future canvas-based grid
    const el = createElement('div', { className: 'grid-overlay' });
    el.style.display = 'none'; // Hidden by default, CSS handles grid
    return el;
  }

  /**
   * Setup on mount
   */
  protected onMount(): void {
    // Subscribe to background config changes
    useStore.subscribe(
      (state) => state.background,
      (background) => this.updateFromConfig(background),
    );

    // Get initial config
    const background = useStore.getState().background;
    this.updateFromConfig(background);
  }

  /**
   * Update grid from config
   */
  private updateFromConfig(config: BackgroundConfig): void {
    this._gridSize = config.grid.size;
    this._snapEnabled = config.grid.snapEnabled;
  }

  /**
   * Snap a position to the grid
   */
  snapToGrid(position: Position): Position {
    if (!this._snapEnabled) {
      return position;
    }

    return {
      x: Math.round(position.x / this._gridSize) * this._gridSize,
      y: Math.round(position.y / this._gridSize) * this._gridSize,
    };
  }

  /**
   * Set grid size
   */
  setGridSize(size: number): void {
    this._gridSize = size;
    // Use the store's background update with full grid merge
    const currentGrid = useStore.getState().background.grid;
    useStore.getState().setBackgroundConfig({
      grid: { ...currentGrid, size },
    });
  }

  /**
   * Enable/disable snap-to-grid
   */
  setSnapEnabled(enabled: boolean): void {
    this._snapEnabled = enabled;
    useStore.getState().setGridSnap(enabled);
  }

  /**
   * Toggle grid visibility
   */
  toggleVisibility(): void {
    useStore.getState().toggleGrid();
  }
}
