/**
 * NodeCard Component
 *
 * Visual representation of an image generation node on the canvas.
 * Wraps the Node entity and provides interactive DOM rendering.
 */

import { eventBus, EVENTS } from '@/core/events';
import { useStore } from '@/state';
import { generateId } from '@/utils/id';

import { Component, createElement } from '../shared/Component';

import type { NodeState, Position, NodeSelectionState } from '@/types';

export interface NodeCardProps {
  nodeState: NodeState;
}

/**
 * NodeCard component for rendering nodes
 */
export class NodeCard extends Component {
  readonly id: string;

  private _nodeId: string;
  private _isDragging = false;
  private _dragStart: Position = { x: 0, y: 0 };
  private _initialPosition: Position = { x: 0, y: 0 };

  constructor(props: NodeCardProps) {
    super();
    this.id = generateId('nodecard');
    this._nodeId = props.nodeState.config.id;
  }

  /**
   * Get the node ID this card represents
   */
  get nodeId(): string {
    return this._nodeId;
  }

  /**
   * Render the node card
   */
  protected render(): HTMLElement {
    const state = this.getNodeState();
    if (!state) {
      return createElement('div', { className: 'node' });
    }

    const { config, position, selection } = state;
    const isGhost = config.isGhost ?? false;

    // Create node element
    const el = createElement('div', {
      className: `node${isGhost ? ' ghost' : ''}${this.getSelectionClass(selection)}`,
    });
    el.id = this._nodeId;

    // Set position
    el.style.left = `${position.x}px`;
    el.style.top = `${position.y}px`;
    el.style.zIndex = String(state.zIndex);

    if (isGhost) {
      el.innerHTML = this.renderGhostContent();
    } else {
      el.innerHTML = this.renderNodeContent(config);
    }

    return el;
  }

  /**
   * Render ghost node content
   */
  private renderGhostContent(): string {
    return `
      <div class="port-wrapper input"><div class="port" tabindex="0"></div></div>
      <div class="node-image-container">
        <div class="pulse-ring"></div>
      </div>
    `;
  }

  /**
   * Render regular node content
   */
  private renderNodeContent(config: NodeState['config']): string {
    const imageHtml = config.image
      ? `<img src="${config.image}" draggable="false" alt="${config.title ?? 'Generated image'}">`
      : '';

    return `
      <div class="port-wrapper input"><div class="port" tabindex="0"></div></div>
      <div class="node-image-container">
        <div class="meta-badge">${config.badge ?? '2K'}</div>
        ${imageHtml}
      </div>
      <div class="node-footer">
        <div class="node-title">${config.title ?? 'Generation'}</div>
        <div class="node-prompt">${config.prompt ?? ''}</div>
      </div>
      <div class="port-wrapper output"><div class="port" tabindex="0"></div></div>
    `;
  }

  /**
   * Get selection class
   */
  private getSelectionClass(selection: NodeSelectionState): string {
    switch (selection) {
      case 'selected':
        return ' selected';
      case 'multi-selected':
        return ' selected multi-selected';
      default:
        return '';
    }
  }

  /**
   * Setup event handlers on mount
   */
  protected onMount(): void {
    if (!this._element) return;

    // Drag handlers
    this.addEventListener(this._element, 'mousedown', this.handleMouseDown.bind(this));
    this.addEventListener(window, 'mousemove', this.handleMouseMove.bind(this));
    this.addEventListener(window, 'mouseup', this.handleMouseUp.bind(this));

    // Click handler for selection
    this.addEventListener(this._element, 'click', this.handleClick.bind(this));

    // Double-click for details
    this.addEventListener(this._element, 'dblclick', this.handleDoubleClick.bind(this));

    // Context menu
    this.addEventListener(this._element, 'contextmenu', this.handleContextMenu.bind(this));

    // Subscribe to node state changes
    useStore.subscribe(
      (state) => state.nodes[this._nodeId],
      (nodeState) => {
        if (nodeState) {
          this.updateFromState(nodeState);
        }
      },
    );
  }

  /**
   * Handle mouse down for drag
   */
  private handleMouseDown(e: MouseEvent): void {
    // Skip if clicking on port
    if ((e.target as HTMLElement).closest('.port')) {
      return;
    }

    // Only drag with left mouse button
    if (e.button !== 0) return;

    e.stopPropagation();

    this._isDragging = true;
    this._dragStart = { x: e.clientX, y: e.clientY };

    const store = useStore.getState();
    const state = this.getNodeState();

    if (state) {
      this._initialPosition = { ...state.position };
    }

    // If this node isn't selected, select it (replacing existing selection unless modifier key)
    const isAdditive = e.shiftKey || e.ctrlKey || e.metaKey;
    if (!store.selectedIds.includes(this._nodeId)) {
      store.selectNode(this._nodeId, isAdditive);
    }

    // Bring to front
    store.bringToFront(this._nodeId);

    // Add dragging class
    this._element?.classList.add('is-dragging');

    // Emit drag start
    eventBus.emit(EVENTS.NODE.DRAG_START, {
      nodeId: this._nodeId,
      startPosition: this._initialPosition,
    });
  }

  /**
   * Handle mouse move for drag
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this._isDragging) return;

    const store = useStore.getState();
    const scale = store.transform.scale;
    const dx = (e.clientX - this._dragStart.x) / scale;
    const dy = (e.clientY - this._dragStart.y) / scale;

    const delta = { x: dx, y: dy };

    // Move all selected nodes if this node is part of selection
    if (store.selectedIds.includes(this._nodeId) && store.selectedIds.length > 1) {
      // Use moveNodes for multi-node drag
      // Calculate delta from last frame instead of from start
      const currentState = this.getNodeState();
      if (currentState) {
        const frameDelta = {
          x: this._initialPosition.x + dx - currentState.position.x,
          y: this._initialPosition.y + dy - currentState.position.y,
        };
        if (frameDelta.x !== 0 || frameDelta.y !== 0) {
          store.moveNodes(store.selectedIds, frameDelta);
        }
      }
    } else {
      // Single node drag
      const newPosition = {
        x: this._initialPosition.x + dx,
        y: this._initialPosition.y + dy,
      };
      store.setNodePosition(this._nodeId, newPosition);
    }

    // Emit drag move
    eventBus.emit(EVENTS.NODE.DRAG_MOVE, {
      nodeId: this._nodeId,
      currentPosition: this.getNodeState()?.position ?? { x: 0, y: 0 },
      delta,
    });
  }

  /**
   * Handle mouse up to end drag
   */
  private handleMouseUp(): void {
    if (!this._isDragging) return;

    this._isDragging = false;
    this._element?.classList.remove('is-dragging');

    const state = this.getNodeState();
    if (state) {
      eventBus.emit(EVENTS.NODE.DRAG_END, {
        nodeId: this._nodeId,
        finalPosition: state.position,
      });
    }
  }

  /**
   * Handle click for selection
   */
  private handleClick(e: MouseEvent): void {
    e.stopPropagation();

    const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;

    if (isMultiSelect) {
      useStore.getState().selectNode(this._nodeId, true);
    } else {
      useStore.getState().selectNode(this._nodeId, false);
    }

    eventBus.emit(EVENTS.NODE.SELECTED, {
      nodeId: this._nodeId,
      isMultiSelect,
    });
  }

  /**
   * Handle double-click for node details
   */
  private handleDoubleClick(e: MouseEvent): void {
    e.stopPropagation();
    useStore.getState().openModal('node-details', { nodeId: this._nodeId });
  }

  /**
   * Handle context menu
   */
  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    // Emit context menu show event with node context
    eventBus.emit(EVENTS.UI.CONTEXT_MENU_SHOW, {
      position: { x: e.clientX, y: e.clientY },
      nodeId: this._nodeId,
    });
  }

  /**
   * Get current node state from store
   */
  private getNodeState(): NodeState | undefined {
    return useStore.getState().nodes[this._nodeId];
  }

  /**
   * Update visual from state
   */
  private updateFromState(state: NodeState): void {
    if (!this._element) return;

    // Update position
    this._element.style.left = `${state.position.x}px`;
    this._element.style.top = `${state.position.y}px`;
    this._element.style.zIndex = String(state.zIndex);

    // Update selection class
    this._element.classList.remove('selected', 'multi-selected');
    if (state.selection === 'selected') {
      this._element.classList.add('selected');
    } else if (state.selection === 'multi-selected') {
      this._element.classList.add('selected', 'multi-selected');
    }

    // Update visibility
    this._element.style.display = state.isVisible ? '' : 'none';
  }

  /**
   * Update the node content (for when image is generated)
   */
  updateContent(): void {
    const state = this.getNodeState();
    if (!state || !this._element) return;

    const isGhost = state.config.isGhost ?? false;

    // Re-render inner content
    if (isGhost) {
      this._element.innerHTML = this.renderGhostContent();
    } else {
      this._element.innerHTML = this.renderNodeContent(state.config);
    }

    // Update ghost class
    this._element.classList.toggle('ghost', isGhost);
  }
}
