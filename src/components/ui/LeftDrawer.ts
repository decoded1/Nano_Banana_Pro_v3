/**
 * LeftDrawer Component
 *
 * The left side drawer with tool buttons.
 */

import { eventBus, EVENTS } from '@/core/events';
import { useStore } from '@/state';
import { generateId } from '@/utils/id';

import { Component, createElement } from '../shared/Component';

import type { DrawerItemType } from '@/types';

interface DrawerItemConfig {
  type: DrawerItemType;
  icon: string;
  label: string;
  shortcut?: string;
}

const DRAWER_ITEMS: DrawerItemConfig[] = [
  { type: 'references', icon: '📷', label: 'References', shortcut: 'R' },
  { type: 'styles', icon: '🎨', label: 'Styles', shortcut: 'S' },
  { type: 'history', icon: '📜', label: 'History', shortcut: 'H' },
  { type: 'settings', icon: '⚙️', label: 'Settings', shortcut: ',' },
];

/**
 * LeftDrawer component
 */
export class LeftDrawer extends Component {
  readonly id = generateId('drawer');

  private _items = new Map<DrawerItemType, HTMLElement>();

  /**
   * Render the drawer
   */
  protected render(): HTMLElement {
    const el = createElement('div', { className: 'left-drawer ui-element' });

    // Create drawer items
    for (const config of DRAWER_ITEMS) {
      const item = this.createDrawerItem(config);
      this._items.set(config.type, item);
      el.appendChild(item);
    }

    return el;
  }

  /**
   * Create a single drawer item
   */
  private createDrawerItem(config: DrawerItemConfig): HTMLElement {
    const item = createElement('button', {
      className: 'drawer-item',
    });
    item.setAttribute('data-type', config.type);
    item.setAttribute('title', `${config.label}${config.shortcut ? ` (${config.shortcut})` : ''}`);
    item.setAttribute('tabindex', '0');
    item.innerHTML = config.icon;

    return item;
  }

  /**
   * Setup on mount
   */
  protected onMount(): void {
    // Add click handlers to items
    for (const [type, element] of this._items) {
      this.addEventListener(element, 'click', () => this.handleItemClick(type));
    }

    // Subscribe to drawer state
    useStore.subscribe(
      (state) => state.drawer.activeItem,
      (activeItem) => this.updateActiveItem(activeItem),
    );

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  /**
   * Handle item click
   */
  private handleItemClick(type: DrawerItemType): void {
    const { drawer, openDrawer, closeDrawer } = useStore.getState();

    if (drawer.isOpen && drawer.activeItem === type) {
      // Close if clicking same item
      closeDrawer();
    } else {
      // Open or switch to this item
      openDrawer(type);
    }

    // Emit event
    eventBus.emit(EVENTS.UI.DRAWER_ITEM_CLICKED, { itemType: type });
  }

  /**
   * Update active item visual state
   */
  private updateActiveItem(activeItem: DrawerItemType | null): void {
    for (const [type, element] of this._items) {
      element.classList.toggle('active', type === activeItem);
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    this.addEventListener(document, 'keydown', (e: KeyboardEvent) => {
      // Ignore if typing in input
      if ((e.target as HTMLElement).matches('input, textarea')) return;

      const key = e.key.toUpperCase();

      for (const config of DRAWER_ITEMS) {
        if (config.shortcut?.toUpperCase() === key) {
          e.preventDefault();
          this.handleItemClick(config.type);
          break;
        }
      }
    });
  }
}
