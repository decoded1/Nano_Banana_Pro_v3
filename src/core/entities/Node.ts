/**
 * Node Entity
 *
 * Represents an image generation node on the canvas.
 */

import { Port } from './Port';

import type {
  NodeConfig,
  NodeState,
  NodeSelectionState,
  NodeInteractionState,
  Position,
} from '@/types';

/**
 * Default node configuration
 */
const DEFAULT_NODE_CONFIG: Partial<NodeConfig> = {
  title: 'Generation',
  prompt: '',
  badge: '2K',
  isGhost: false,
  type: 'generation',
};

/**
 * Node class representing an image generation node
 */
export class Node {
  readonly config: NodeConfig;

  private _position: Position;
  private _selection: NodeSelectionState = 'none';
  private _interaction: NodeInteractionState = 'idle';
  private _isVisible = true;
  private _zIndex = 1;
  private _element: HTMLElement | null = null;

  readonly inputPort: Port;
  readonly outputPort: Port | null;

  constructor(config: NodeConfig) {
    this.config = {
      ...DEFAULT_NODE_CONFIG,
      ...config,
      createdAt: config.createdAt ?? Date.now(),
    };

    this._position = { ...config.position };

    // Create ports
    this.inputPort = new Port(this.id, 'input', 'input', { dataType: 'image' });

    // Ghost nodes don't have output ports
    this.outputPort = config.isGhost
      ? null
      : new Port(this.id, 'output', 'output', { dataType: 'image' });
  }

  /**
   * Get node ID
   */
  get id(): string {
    return this.config.id;
  }

  /**
   * Get node title
   */
  get title(): string {
    return this.config.title ?? 'Generation';
  }

  /**
   * Get node prompt
   */
  get prompt(): string {
    return this.config.prompt ?? '';
  }

  /**
   * Get node image URL
   */
  get image(): string | undefined {
    return this.config.image;
  }

  /**
   * Get resolution badge
   */
  get badge(): string {
    return this.config.badge ?? '2K';
  }

  /**
   * Check if this is a ghost (loading) node
   */
  get isGhost(): boolean {
    return this.config.isGhost ?? false;
  }

  /**
   * Get current position
   */
  get position(): Position {
    return { ...this._position };
  }

  /**
   * Set position
   */
  set position(pos: Position) {
    this._position = { ...pos };
    this.updateElementPosition();
  }

  /**
   * Get selection state
   */
  get selection(): NodeSelectionState {
    return this._selection;
  }

  /**
   * Set selection state
   */
  set selection(state: NodeSelectionState) {
    this._selection = state;
    this.updateElementSelection();
  }

  /**
   * Get interaction state
   */
  get interaction(): NodeInteractionState {
    return this._interaction;
  }

  /**
   * Set interaction state
   */
  set interaction(state: NodeInteractionState) {
    this._interaction = state;
    this.updateElementInteraction();
  }

  /**
   * Get visibility
   */
  get isVisible(): boolean {
    return this._isVisible;
  }

  /**
   * Set visibility
   */
  set isVisible(value: boolean) {
    this._isVisible = value;
  }

  /**
   * Get z-index
   */
  get zIndex(): number {
    return this._zIndex;
  }

  /**
   * Set z-index
   */
  set zIndex(value: number) {
    this._zIndex = value;
    if (this._element) {
      this._element.style.zIndex = String(value);
    }
  }

  /**
   * Get DOM element
   */
  get element(): HTMLElement | null {
    return this._element;
  }

  /**
   * Get node state
   */
  getState(): NodeState {
    return {
      config: { ...this.config },
      position: this.position,
      selection: this._selection,
      interaction: this._interaction,
      isVisible: this._isVisible,
      zIndex: this._zIndex,
    };
  }

  /**
   * Check if node is selected
   */
  get isSelected(): boolean {
    return this._selection === 'selected' || this._selection === 'multi-selected';
  }

  /**
   * Check if node is being dragged
   */
  get isDragging(): boolean {
    return this._interaction === 'dragging';
  }

  /**
   * Create the DOM element for this node
   */
  createElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = `node${this.isGhost ? ' ghost' : ''}`;
    el.id = this.id;

    if (this.isGhost) {
      el.innerHTML = `
        <div class="port-wrapper input"><div class="port" tabindex="0"></div></div>
        <div class="node-image-container">
          <div class="pulse-ring"></div>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="port-wrapper input"><div class="port" tabindex="0"></div></div>
        <div class="node-image-container">
          <div class="meta-badge">${this.badge}</div>
          ${this.image ? `<img src="${this.image}" draggable="false" alt="${this.title}">` : ''}
        </div>
        <div class="node-footer">
          <div class="node-title">${this.title}</div>
          <div class="node-prompt">${this.prompt}</div>
        </div>
        <div class="port-wrapper output"><div class="port" tabindex="0"></div></div>
      `;
    }

    this._element = el;
    this.updateElementPosition();
    this.cachePortElements();

    return el;
  }

  /**
   * Cache port DOM element references
   */
  private cachePortElements(): void {
    if (!this._element) return;

    const inputWrapper = this._element.querySelector('.port-wrapper.input');
    if (inputWrapper) {
      this.inputPort.element = inputWrapper as HTMLElement;
    }

    if (this.outputPort) {
      const outputWrapper = this._element.querySelector('.port-wrapper.output');
      if (outputWrapper) {
        this.outputPort.element = outputWrapper as HTMLElement;
      }
    }
  }

  /**
   * Update element position
   */
  private updateElementPosition(): void {
    if (!this._element) return;
    this._element.style.left = `${this._position.x}px`;
    this._element.style.top = `${this._position.y}px`;
  }

  /**
   * Update element selection classes
   */
  private updateElementSelection(): void {
    if (!this._element) return;

    this._element.classList.remove('selected', 'multi-selected');

    if (this._selection === 'selected') {
      this._element.classList.add('selected');
    } else if (this._selection === 'multi-selected') {
      this._element.classList.add('selected', 'multi-selected');
    }
  }

  /**
   * Update element interaction classes
   */
  private updateElementInteraction(): void {
    if (!this._element) return;

    this._element.classList.remove('is-dragging', 'is-connecting', 'is-editing');

    switch (this._interaction) {
      case 'dragging':
        this._element.classList.add('is-dragging');
        break;
      case 'connecting':
        this._element.classList.add('is-connecting');
        break;
      case 'editing':
        this._element.classList.add('is-editing');
        break;
    }
  }

  /**
   * Update port positions from DOM
   */
  updatePortPositions(workspaceRect: DOMRect): void {
    this.inputPort.updatePositionFromElement(workspaceRect);
    this.outputPort?.updatePositionFromElement(workspaceRect);
  }

  /**
   * Get port by ID
   */
  getPort(portId: string): Port | null {
    if (this.inputPort.id === portId) return this.inputPort;
    if (this.outputPort?.id === portId) return this.outputPort;
    return null;
  }

  /**
   * Remove element from DOM
   */
  removeElement(): void {
    if (this._element?.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
    this._element = null;
  }

  /**
   * Update node with new configuration
   */
  updateConfig(changes: Partial<NodeConfig>): void {
    Object.assign(this.config, changes);

    // Update DOM if element exists
    if (this._element && !this.isGhost) {
      if (changes.title !== undefined) {
        const titleEl = this._element.querySelector('.node-title');
        if (titleEl) titleEl.textContent = changes.title;
      }
      if (changes.prompt !== undefined) {
        const promptEl = this._element.querySelector('.node-prompt');
        if (promptEl) promptEl.textContent = changes.prompt;
      }
      if (changes.badge !== undefined) {
        const badgeEl = this._element.querySelector('.meta-badge');
        if (badgeEl) badgeEl.textContent = changes.badge;
      }
      if (changes.image !== undefined) {
        const imgEl = this._element.querySelector('.node-image-container img') as HTMLImageElement;
        if (imgEl) imgEl.src = changes.image;
      }
    }
  }
}
