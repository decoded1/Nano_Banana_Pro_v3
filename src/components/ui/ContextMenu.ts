/**
 * Context Menu Component
 *
 * A floating context menu that appears on right-click.
 * Provides quick access to common actions like copy, paste, delete.
 */

import { eventBus, EVENTS } from '@/core/events';
import { useStore } from '@/state';
import { generateId } from '@/utils/id';

import { Component, createElement } from '../shared/Component';

import type { Position } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface MenuAction {
  /** Unique action identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon (emoji or icon class) */
  icon?: string | undefined;
  /** Keyboard shortcut hint */
  shortcut?: string | undefined;
  /** Whether action is disabled */
  disabled?: boolean | undefined;
  /** Whether this is a separator */
  separator?: boolean | undefined;
  /** Action handler */
  action?: () => void;
}

export interface ContextMenuConfig {
  /** Minimum menu width */
  minWidth: number;
  /** Animation duration */
  animationDuration: number;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: ContextMenuConfig = {
  minWidth: 180,
  animationDuration: 150,
};

// =============================================================================
// CONTEXT MENU COMPONENT
// =============================================================================

/**
 * Context menu for quick actions
 */
export class ContextMenu extends Component {
  readonly id = generateId('context-menu');

  private config: ContextMenuConfig;
  private _menuElement: HTMLElement | null = null;
  private _isVisible = false;
  private _position: Position = { x: 0, y: 0 };
  private _contextNodeId: string | null = null;

  constructor(config: Partial<ContextMenuConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Render the context menu container
   */
  protected render(): HTMLElement {
    const container = createElement('div', { className: 'context-menu-container' });
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10000;
    `;

    this._menuElement = createElement('div', { className: 'context-menu' });
    this._menuElement.style.cssText = `
      position: absolute;
      min-width: ${this.config.minWidth}px;
      background: rgba(30, 30, 30, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      padding: 4px 0;
      opacity: 0;
      transform: scale(0.95);
      transition: opacity ${this.config.animationDuration}ms ease, transform ${this.config.animationDuration}ms ease;
      pointer-events: auto;
      display: none;
    `;

    container.appendChild(this._menuElement);
    return container;
  }

  /**
   * Setup on mount
   */
  protected onMount(): void {
    this.setupEventListeners();
    this.subscribeToEvents();
  }

  /**
   * Cleanup on destroy
   */
  protected onDestroy(): void {
    this._menuElement = null;
  }

  // ---------------------------------------------------------------------------
  // Event Handling
  // ---------------------------------------------------------------------------

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // Close on click outside
    this.addEventListener(document, 'mousedown', (e: MouseEvent) => {
      if (this._isVisible && this._menuElement && !this._menuElement.contains(e.target as Node)) {
        this.hide();
      }
    });

    // Close on escape
    this.addEventListener(document, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this._isVisible) {
        this.hide();
      }
    });

    // Close on scroll
    this.addEventListener(window, 'scroll', () => {
      if (this._isVisible) {
        this.hide();
      }
    });
  }

  /**
   * Subscribe to event bus events
   */
  private subscribeToEvents(): void {
    eventBus.on(
      EVENTS.UI.CONTEXT_MENU_SHOW,
      (data: { position: Position; nodeId?: string | undefined }) => {
        this._contextNodeId = data.nodeId ?? null;
        this.show(data.position);
      },
    );

    eventBus.on(EVENTS.UI.CONTEXT_MENU_HIDE, () => {
      this.hide();
    });
  }

  // ---------------------------------------------------------------------------
  // Menu Actions
  // ---------------------------------------------------------------------------

  /**
   * Get menu actions based on context
   */
  private getMenuActions(): MenuAction[] {
    const state = useStore.getState();
    const hasSelection = state.selectedIds.length > 0;
    const hasMultipleSelected = state.selectedIds.length > 1;

    const actions: MenuAction[] = [];

    // Add node action (always available on canvas right-click)
    if (!this._contextNodeId) {
      actions.push({
        id: 'add-node',
        label: 'Add Node Here',
        icon: '+',
        action: () => {
          eventBus.emit(EVENTS.NODE.CREATE_REQUESTED, { position: this._position });
          this.hide();
        },
      });
      actions.push({ id: 'sep-1', label: '', separator: true });
    }

    // Clipboard actions
    actions.push({
      id: 'copy',
      label: 'Copy',
      icon: '',
      shortcut: 'Ctrl+C',
      disabled: !hasSelection,
      action: () => {
        eventBus.emit(EVENTS.CLIPBOARD.COPY, {});
        this.hide();
      },
    });

    actions.push({
      id: 'cut',
      label: 'Cut',
      icon: '',
      shortcut: 'Ctrl+X',
      disabled: !hasSelection,
      action: () => {
        eventBus.emit(EVENTS.CLIPBOARD.CUT, {});
        this.hide();
      },
    });

    actions.push({
      id: 'paste',
      label: 'Paste',
      icon: '',
      shortcut: 'Ctrl+V',
      action: () => {
        eventBus.emit(EVENTS.CLIPBOARD.PASTE, { position: this._position });
        this.hide();
      },
    });

    actions.push({ id: 'sep-2', label: '', separator: true });

    // Selection actions
    actions.push({
      id: 'select-all',
      label: 'Select All',
      shortcut: 'Ctrl+A',
      action: () => {
        eventBus.emit(EVENTS.SELECTION.SELECT_ALL, {});
        this.hide();
      },
    });

    if (hasSelection) {
      actions.push({
        id: 'deselect',
        label: 'Deselect All',
        shortcut: 'Esc',
        action: () => {
          eventBus.emit(EVENTS.SELECTION.CLEAR, {});
          this.hide();
        },
      });
    }

    actions.push({ id: 'sep-3', label: '', separator: true });

    // Delete action
    actions.push({
      id: 'delete',
      label: hasMultipleSelected ? 'Delete Selected' : 'Delete',
      icon: '',
      shortcut: 'Del',
      disabled: !hasSelection,
      action: () => {
        eventBus.emit(EVENTS.SELECTION.DELETE_REQUESTED, {});
        this.hide();
      },
    });

    // Node-specific actions
    if (this._contextNodeId) {
      const node = state.nodes[this._contextNodeId];
      if (node) {
        actions.push({ id: 'sep-4', label: '', separator: true });

        // Regenerate action
        actions.push({
          id: 'regenerate',
          label: 'Regenerate',
          icon: '',
          action: () => {
            eventBus.emit(EVENTS.GENERATION.REGENERATE_REQUESTED, { nodeId: this._contextNodeId });
            this.hide();
          },
        });

        // Export action if node has image
        if (node.config.image) {
          actions.push({
            id: 'export',
            label: 'Export Image',
            icon: '',
            action: () => {
              eventBus.emit(EVENTS.NODE.EXPORT_REQUESTED, { nodeId: this._contextNodeId });
              this.hide();
            },
          });
        }
      }
    }

    return actions;
  }

  /**
   * Render menu items
   */
  private renderMenuItems(): void {
    if (!this._menuElement) return;

    this._menuElement.innerHTML = '';
    const actions = this.getMenuActions();

    for (const action of actions) {
      if (action.separator) {
        const separator = createElement('div', { className: 'context-menu-separator' });
        separator.style.cssText = `
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 4px 8px;
        `;
        this._menuElement.appendChild(separator);
        continue;
      }

      const item = createElement('div', { className: 'context-menu-item' });
      item.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        cursor: ${action.disabled ? 'default' : 'pointer'};
        opacity: ${action.disabled ? '0.4' : '1'};
        font-size: 13px;
        color: #fff;
        transition: background 0.1s ease;
        user-select: none;
      `;

      // Left side (icon + label)
      const leftSide = createElement('div', { className: 'context-menu-item-left' });
      leftSide.style.cssText = 'display: flex; align-items: center; gap: 8px;';

      if (action.icon) {
        const icon = createElement('span', { className: 'context-menu-icon' });
        icon.textContent = action.icon;
        icon.style.cssText = 'width: 16px; text-align: center;';
        leftSide.appendChild(icon);
      }

      const label = createElement('span', { className: 'context-menu-label' });
      label.textContent = action.label;
      leftSide.appendChild(label);

      item.appendChild(leftSide);

      // Shortcut hint
      if (action.shortcut) {
        const shortcut = createElement('span', { className: 'context-menu-shortcut' });
        shortcut.textContent = action.shortcut;
        shortcut.style.cssText = `
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          margin-left: 24px;
        `;
        item.appendChild(shortcut);
      }

      // Hover effect
      if (!action.disabled) {
        item.addEventListener('mouseenter', () => {
          item.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'transparent';
        });
        item.addEventListener('click', () => {
          action.action?.();
        });
      }

      this._menuElement.appendChild(item);
    }
  }

  // ---------------------------------------------------------------------------
  // Show/Hide
  // ---------------------------------------------------------------------------

  /**
   * Show the context menu at position
   */
  show(position: Position): void {
    if (!this._menuElement) return;

    this._position = position;
    this.renderMenuItems();

    // Position menu
    this._menuElement.style.display = 'block';
    this._menuElement.style.left = `${position.x}px`;
    this._menuElement.style.top = `${position.y}px`;

    // Adjust if menu would go off screen
    requestAnimationFrame(() => {
      if (!this._menuElement) return;

      const rect = this._menuElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = position.x;
      let y = position.y;

      if (rect.right > viewportWidth) {
        x = viewportWidth - rect.width - 8;
      }

      if (rect.bottom > viewportHeight) {
        y = viewportHeight - rect.height - 8;
      }

      this._menuElement.style.left = `${Math.max(8, x)}px`;
      this._menuElement.style.top = `${Math.max(8, y)}px`;

      // Animate in
      this._menuElement.style.opacity = '1';
      this._menuElement.style.transform = 'scale(1)';
    });

    this._isVisible = true;
  }

  /**
   * Hide the context menu
   */
  hide(): void {
    if (!this._menuElement || !this._isVisible) return;

    this._menuElement.style.opacity = '0';
    this._menuElement.style.transform = 'scale(0.95)';

    setTimeout(() => {
      if (this._menuElement) {
        this._menuElement.style.display = 'none';
      }
    }, this.config.animationDuration);

    this._isVisible = false;
    this._contextNodeId = null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Check if menu is visible
   */
  get isVisible(): boolean {
    return this._isVisible;
  }

  /**
   * Get current position
   */
  get position(): Position {
    return this._position;
  }
}

export default ContextMenu;
