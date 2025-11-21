/**
 * SelectionManager
 *
 * Manages node selection state, including single selection, multi-selection,
 * and box selection operations.
 */

import type { Node } from '../entities';
import type { Position, Bounds, BoxSelectState, NodeSelectionState } from '@/types';

/**
 * Selection change callback
 */
export type SelectionChangeCallback = (selectedIds: string[]) => void;

/**
 * SelectionManager class
 */
export class SelectionManager {
  private _selectedIds = new Set<string>();
  private _boxSelectState: BoxSelectState = {
    isSelecting: false,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    selectionBounds: null,
  };

  private _onSelectionChange: SelectionChangeCallback | null = null;
  private _boxSelectElement: HTMLElement | null = null;

  /**
   * Set selection change callback
   */
  onSelectionChange(callback: SelectionChangeCallback): void {
    this._onSelectionChange = callback;
  }

  /**
   * Get selected node IDs
   */
  get selectedIds(): string[] {
    return Array.from(this._selectedIds);
  }

  /**
   * Get selected IDs as Set
   */
  get selectedIdSet(): Set<string> {
    return new Set(this._selectedIds);
  }

  /**
   * Check if any nodes are selected
   */
  get hasSelection(): boolean {
    return this._selectedIds.size > 0;
  }

  /**
   * Get selection count
   */
  get selectionCount(): number {
    return this._selectedIds.size;
  }

  /**
   * Check if a node is selected
   */
  isSelected(nodeId: string): boolean {
    return this._selectedIds.has(nodeId);
  }

  /**
   * Check if box selection is active
   */
  get isBoxSelecting(): boolean {
    return this._boxSelectState.isSelecting;
  }

  /**
   * Get box selection bounds
   */
  get boxSelectBounds(): Bounds | null {
    return this._boxSelectState.selectionBounds;
  }

  // ===========================================================================
  // SINGLE SELECTION
  // ===========================================================================

  /**
   * Select a single node (clear other selections)
   */
  select(nodeId: string): void {
    this._selectedIds.clear();
    this._selectedIds.add(nodeId);
    this.notifyChange();
  }

  /**
   * Toggle selection on a node
   */
  toggle(nodeId: string): void {
    if (this._selectedIds.has(nodeId)) {
      this._selectedIds.delete(nodeId);
    } else {
      this._selectedIds.add(nodeId);
    }
    this.notifyChange();
  }

  /**
   * Add to selection (multi-select)
   */
  addToSelection(nodeId: string): void {
    this._selectedIds.add(nodeId);
    this.notifyChange();
  }

  /**
   * Remove from selection
   */
  removeFromSelection(nodeId: string): void {
    this._selectedIds.delete(nodeId);
    this.notifyChange();
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    if (this._selectedIds.size === 0) return;
    this._selectedIds.clear();
    this.notifyChange();
  }

  /**
   * Select multiple nodes
   */
  selectMultiple(nodeIds: string[]): void {
    this._selectedIds.clear();
    for (const id of nodeIds) {
      this._selectedIds.add(id);
    }
    this.notifyChange();
  }

  /**
   * Select all nodes
   */
  selectAll(allNodeIds: string[]): void {
    this.selectMultiple(allNodeIds);
  }

  // ===========================================================================
  // BOX SELECTION
  // ===========================================================================

  /**
   * Start box selection
   */
  startBoxSelect(position: Position, container?: HTMLElement): void {
    this._boxSelectState = {
      isSelecting: true,
      startPosition: { ...position },
      currentPosition: { ...position },
      selectionBounds: null,
    };

    // Create visual box element
    if (container) {
      this.createBoxSelectElement(container);
    }
  }

  /**
   * Update box selection
   */
  updateBoxSelect(position: Position): void {
    if (!this._boxSelectState.isSelecting) return;

    this._boxSelectState.currentPosition = { ...position };
    this._boxSelectState.selectionBounds = this.calculateBoxBounds();

    this.updateBoxSelectElement();
  }

  /**
   * End box selection and select nodes within bounds
   */
  endBoxSelect(nodes: Node[], addToExisting = false): string[] {
    if (!this._boxSelectState.isSelecting || !this._boxSelectState.selectionBounds) {
      this.cancelBoxSelect();
      return [];
    }

    const bounds = this._boxSelectState.selectionBounds;
    const selected: string[] = [];

    for (const node of nodes) {
      if (this.isNodeInBounds(node, bounds)) {
        selected.push(node.id);
      }
    }

    if (addToExisting) {
      for (const id of selected) {
        this._selectedIds.add(id);
      }
    } else {
      this._selectedIds.clear();
      for (const id of selected) {
        this._selectedIds.add(id);
      }
    }

    this.cancelBoxSelect();
    this.notifyChange();

    return selected;
  }

  /**
   * Cancel box selection
   */
  cancelBoxSelect(): void {
    this._boxSelectState = {
      isSelecting: false,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      selectionBounds: null,
    };

    this.removeBoxSelectElement();
  }

  // ===========================================================================
  // NODE STATE SYNC
  // ===========================================================================

  /**
   * Get selection state for a node
   */
  getSelectionState(nodeId: string): NodeSelectionState {
    if (!this._selectedIds.has(nodeId)) {
      return 'none';
    }
    return this._selectedIds.size > 1 ? 'multi-selected' : 'selected';
  }

  /**
   * Apply selection state to nodes
   */
  applySelectionToNodes(nodes: Node[]): void {
    for (const node of nodes) {
      node.selection = this.getSelectionState(node.id);
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Notify selection change
   */
  private notifyChange(): void {
    this._onSelectionChange?.(this.selectedIds);
  }

  /**
   * Calculate box selection bounds
   */
  private calculateBoxBounds(): Bounds {
    const { startPosition, currentPosition } = this._boxSelectState;

    const x = Math.min(startPosition.x, currentPosition.x);
    const y = Math.min(startPosition.y, currentPosition.y);
    const width = Math.abs(currentPosition.x - startPosition.x);
    const height = Math.abs(currentPosition.y - startPosition.y);

    return { x, y, width, height };
  }

  /**
   * Check if node is within bounds
   */
  private isNodeInBounds(node: Node, bounds: Bounds): boolean {
    const pos = node.position;
    // Simple point-in-bounds check (could be enhanced with node dimensions)
    return (
      pos.x >= bounds.x &&
      pos.x <= bounds.x + bounds.width &&
      pos.y >= bounds.y &&
      pos.y <= bounds.y + bounds.height
    );
  }

  /**
   * Create box selection visual element
   */
  private createBoxSelectElement(container: HTMLElement): void {
    this.removeBoxSelectElement();

    const el = document.createElement('div');
    el.className = 'box-select';
    el.style.cssText = `
      position: absolute;
      border: 1px dashed var(--color-accent-primary, #7c3aed);
      background: var(--color-accent-primary-10, rgba(124, 58, 237, 0.1));
      pointer-events: none;
      z-index: 1000;
    `;

    container.appendChild(el);
    this._boxSelectElement = el;
  }

  /**
   * Update box selection visual element
   */
  private updateBoxSelectElement(): void {
    if (!this._boxSelectElement || !this._boxSelectState.selectionBounds) return;

    const bounds = this._boxSelectState.selectionBounds;

    this._boxSelectElement.style.left = `${bounds.x}px`;
    this._boxSelectElement.style.top = `${bounds.y}px`;
    this._boxSelectElement.style.width = `${bounds.width}px`;
    this._boxSelectElement.style.height = `${bounds.height}px`;
  }

  /**
   * Remove box selection visual element
   */
  private removeBoxSelectElement(): void {
    if (this._boxSelectElement) {
      this._boxSelectElement.remove();
      this._boxSelectElement = null;
    }
  }

  /**
   * Reset manager state
   */
  reset(): void {
    this.clearSelection();
    this.cancelBoxSelect();
  }
}
