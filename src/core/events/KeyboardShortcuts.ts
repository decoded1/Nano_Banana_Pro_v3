/**
 * Keyboard Shortcuts Handler
 *
 * Global keyboard shortcut management for the application.
 * Handles common shortcuts like Ctrl+Z (undo), Ctrl+S (save), etc.
 */

import { getHistoryManager } from '@/state/persistence';

import { eventBus } from './EventBus';
import { EVENTS } from './EventTypes';

// =============================================================================
// TYPES
// =============================================================================

export interface ShortcutDefinition {
  /** Key code or key name */
  key: string;
  /** Require Ctrl/Cmd key */
  ctrl?: boolean;
  /** Require Shift key */
  shift?: boolean;
  /** Require Alt key */
  alt?: boolean;
  /** Description for UI */
  description: string;
  /** Action to perform */
  action: () => void;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
}

export interface KeyboardShortcutsConfig {
  /** Whether shortcuts are enabled */
  enabled: boolean;
  /** Whether to log shortcuts in dev mode */
  debug: boolean;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: KeyboardShortcutsConfig = {
  enabled: true,
  debug: false,
};

// =============================================================================
// KEYBOARD SHORTCUTS CLASS
// =============================================================================

/**
 * Manages global keyboard shortcuts
 */
export class KeyboardShortcuts {
  private config: KeyboardShortcutsConfig;
  private shortcuts = new Map<string, ShortcutDefinition>();
  private boundHandler: ((e: KeyboardEvent) => void) | null = null;
  private isInitialized = false;

  constructor(config: Partial<KeyboardShortcutsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerDefaultShortcuts();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Initialize and start listening for keyboard events
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.boundHandler = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundHandler);
    this.isInitialized = true;

    if (import.meta.env.DEV) {
      console.log('[KeyboardShortcuts] Initialized');
    }
  }

  /**
   * Stop listening and cleanup
   */
  cleanup(): void {
    if (this.boundHandler) {
      window.removeEventListener('keydown', this.boundHandler);
      this.boundHandler = null;
    }
    this.isInitialized = false;

    if (import.meta.env.DEV) {
      console.log('[KeyboardShortcuts] Cleaned up');
    }
  }

  /**
   * Enable/disable shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  // ---------------------------------------------------------------------------
  // Shortcut Registration
  // ---------------------------------------------------------------------------

  /**
   * Register a new shortcut
   */
  register(shortcut: ShortcutDefinition): void {
    const key = this.createKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregister a shortcut
   */
  unregister(shortcut: Partial<ShortcutDefinition>): void {
    const key = this.createKey(shortcut as ShortcutDefinition);
    this.shortcuts.delete(key);
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values());
  }

  // ---------------------------------------------------------------------------
  // Default Shortcuts
  // ---------------------------------------------------------------------------

  /**
   * Register default application shortcuts
   */
  private registerDefaultShortcuts(): void {
    // Undo
    this.register({
      key: 'z',
      ctrl: true,
      description: 'Undo',
      preventDefault: true,
      action: () => {
        const history = getHistoryManager();
        if (history.canUndo()) {
          history.undo();
          eventBus.emit(EVENTS.HISTORY.UNDO, {});
        }
      },
    });

    // Redo (Ctrl+Shift+Z)
    this.register({
      key: 'z',
      ctrl: true,
      shift: true,
      description: 'Redo',
      preventDefault: true,
      action: () => {
        const history = getHistoryManager();
        if (history.canRedo()) {
          history.redo();
          eventBus.emit(EVENTS.HISTORY.REDO, {});
        }
      },
    });

    // Redo (Ctrl+Y)
    this.register({
      key: 'y',
      ctrl: true,
      description: 'Redo',
      preventDefault: true,
      action: () => {
        const history = getHistoryManager();
        if (history.canRedo()) {
          history.redo();
          eventBus.emit(EVENTS.HISTORY.REDO, {});
        }
      },
    });

    // Save
    this.register({
      key: 's',
      ctrl: true,
      description: 'Save project',
      preventDefault: true,
      action: () => {
        eventBus.emit(EVENTS.PROJECT.SAVE_REQUESTED, {});
      },
    });

    // New project
    this.register({
      key: 'n',
      ctrl: true,
      description: 'New project',
      preventDefault: true,
      action: () => {
        eventBus.emit(EVENTS.PROJECT.NEW_REQUESTED, {});
      },
    });

    // Open project
    this.register({
      key: 'o',
      ctrl: true,
      description: 'Open project',
      preventDefault: true,
      action: () => {
        eventBus.emit(EVENTS.PROJECT.OPEN_REQUESTED, {});
      },
    });

    // Delete selected
    this.register({
      key: 'Delete',
      description: 'Delete selected nodes',
      preventDefault: true,
      action: () => {
        eventBus.emit(EVENTS.SELECTION.DELETE_REQUESTED, {});
      },
    });

    // Backspace also deletes
    this.register({
      key: 'Backspace',
      description: 'Delete selected nodes',
      preventDefault: true,
      action: () => {
        eventBus.emit(EVENTS.SELECTION.DELETE_REQUESTED, {});
      },
    });

    // Select all
    this.register({
      key: 'a',
      ctrl: true,
      description: 'Select all nodes',
      preventDefault: true,
      action: () => {
        eventBus.emit(EVENTS.SELECTION.SELECT_ALL, {});
      },
    });

    // Deselect all
    this.register({
      key: 'Escape',
      description: 'Deselect all',
      preventDefault: false,
      action: () => {
        eventBus.emit(EVENTS.SELECTION.CLEAR, {});
      },
    });

    // Copy
    this.register({
      key: 'c',
      ctrl: true,
      description: 'Copy selected nodes',
      preventDefault: true,
      action: () => {
        eventBus.emit(EVENTS.CLIPBOARD.COPY, {});
      },
    });

    // Paste
    this.register({
      key: 'v',
      ctrl: true,
      description: 'Paste nodes',
      preventDefault: true,
      action: () => {
        eventBus.emit(EVENTS.CLIPBOARD.PASTE, {});
      },
    });

    // Cut
    this.register({
      key: 'x',
      ctrl: true,
      description: 'Cut selected nodes',
      preventDefault: true,
      action: () => {
        eventBus.emit(EVENTS.CLIPBOARD.CUT, {});
      },
    });

    // Zoom to fit
    this.register({
      key: '0',
      ctrl: true,
      description: 'Zoom to fit',
      preventDefault: true,
      action: () => {
        eventBus.emit(EVENTS.CANVAS.ZOOM_TO_FIT, {});
      },
    });

    // Reset zoom
    this.register({
      key: '1',
      ctrl: true,
      description: 'Reset zoom to 100%',
      preventDefault: true,
      action: () => {
        eventBus.emit(EVENTS.CANVAS.RESET_ZOOM, {});
      },
    });

    // Zoom in
    this.register({
      key: '=',
      ctrl: true,
      description: 'Zoom in',
      preventDefault: true,
      action: () => {
        eventBus.emit(EVENTS.CANVAS.ZOOM_IN, {});
      },
    });

    // Zoom out
    this.register({
      key: '-',
      ctrl: true,
      description: 'Zoom out',
      preventDefault: true,
      action: () => {
        eventBus.emit(EVENTS.CANVAS.ZOOM_OUT, {});
      },
    });

    // Focus prompt
    this.register({
      key: '/',
      description: 'Focus prompt input',
      preventDefault: true,
      action: () => {
        eventBus.emit(EVENTS.UI.FOCUS_PROMPT, {});
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Event Handling
  // ---------------------------------------------------------------------------

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.config.enabled) {
      return;
    }

    // Don't handle shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (this.isInputElement(target)) {
      // Allow Escape to work in inputs
      if (event.key !== 'Escape') {
        return;
      }
    }

    const key = this.createKeyFromEvent(event);
    const shortcut = this.shortcuts.get(key);

    if (shortcut) {
      if (shortcut.preventDefault !== false) {
        event.preventDefault();
      }

      if (this.config.debug && import.meta.env.DEV) {
        console.log(`[KeyboardShortcuts] Triggered: ${shortcut.description}`);
      }

      shortcut.action();
    }
  }

  /**
   * Check if element is an input
   */
  private isInputElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      element.isContentEditable
    );
  }

  // ---------------------------------------------------------------------------
  // Key Generation
  // ---------------------------------------------------------------------------

  /**
   * Create a key string from shortcut definition
   */
  private createKey(shortcut: ShortcutDefinition): string {
    const parts: string[] = [];

    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.shift) parts.push('shift');
    if (shortcut.alt) parts.push('alt');
    parts.push(shortcut.key.toLowerCase());

    return parts.join('+');
  }

  /**
   * Create a key string from keyboard event
   */
  private createKeyFromEvent(event: KeyboardEvent): string {
    const parts: string[] = [];

    // Use metaKey on Mac for Ctrl behavior
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    parts.push(event.key.toLowerCase());

    return parts.join('+');
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let shortcutsInstance: KeyboardShortcuts | null = null;

/**
 * Get the keyboard shortcuts instance
 */
export function getKeyboardShortcuts(config?: Partial<KeyboardShortcutsConfig>): KeyboardShortcuts {
  if (!shortcutsInstance) {
    shortcutsInstance = new KeyboardShortcuts(config);
  }
  return shortcutsInstance;
}

/**
 * Initialize keyboard shortcuts
 */
export function initKeyboardShortcuts(
  config?: Partial<KeyboardShortcutsConfig>,
): KeyboardShortcuts {
  const shortcuts = getKeyboardShortcuts(config);
  shortcuts.initialize();
  return shortcuts;
}

/**
 * Cleanup keyboard shortcuts
 */
export function cleanupKeyboardShortcuts(): void {
  shortcutsInstance?.cleanup();
  shortcutsInstance = null;
}

export default KeyboardShortcuts;
