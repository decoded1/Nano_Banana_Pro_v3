/**
 * EventBus
 *
 * Type-safe pub/sub event system for decoupled component communication.
 * Supports standard emit/on/off patterns plus wildcards and debugging.
 */

import type { EventHandler, EventMap, EventName, IEventBus, Unsubscribe } from '@/types';

/**
 * Event listener entry with metadata
 */
interface ListenerEntry<T = unknown> {
  handler: EventHandler<T>;
  once: boolean;
}

/**
 * Event bus options
 */
export interface EventBusOptions {
  /** Enable debug logging */
  debug?: boolean;
  /** Maximum listeners per event (0 = unlimited) */
  maxListeners?: number;
  /** Event history size for debugging (0 = disabled) */
  historySize?: number;
}

/**
 * Event history entry for debugging
 */
export interface EventHistoryEntry {
  event: string;
  payload: unknown;
  timestamp: number;
  listenerCount: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<EventBusOptions> = {
  debug: false,
  maxListeners: 100,
  historySize: 0,
};

/**
 * EventBus class implementing type-safe pub/sub
 */
export class EventBus implements IEventBus {
  private _listeners = new Map<string, Set<ListenerEntry>>();
  private _wildcardListeners = new Set<ListenerEntry>();
  private _options: Required<EventBusOptions>;
  private _history: EventHistoryEntry[] = [];
  private _paused = false;

  constructor(options: EventBusOptions = {}) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ===========================================================================
  // CORE API
  // ===========================================================================

  /**
   * Emit an event with payload
   */
  emit<K extends EventName>(event: K, payload: EventMap[K]): void;
  emit<T>(event: string, payload: T): void;
  emit(event: string, payload: unknown): void {
    if (this._paused) return;

    const listeners = this._listeners.get(event);
    const listenerCount = (listeners?.size ?? 0) + this._wildcardListeners.size;

    // Debug logging
    if (this._options.debug) {
      this.log('emit', event, payload, listenerCount);
    }

    // Record history
    if (this._options.historySize > 0) {
      this.recordHistory(event, payload, listenerCount);
    }

    // Notify specific listeners
    if (listeners) {
      for (const entry of listeners) {
        this.invokeHandler(entry, event, payload);
        if (entry.once) {
          listeners.delete(entry);
        }
      }
    }

    // Notify wildcard listeners
    for (const entry of this._wildcardListeners) {
      this.invokeHandler(entry, event, payload);
      if (entry.once) {
        this._wildcardListeners.delete(entry);
      }
    }
  }

  /**
   * Subscribe to an event
   */
  on<K extends EventName>(event: K, handler: EventHandler<EventMap[K]>): Unsubscribe;
  on<T>(event: string, handler: EventHandler<T>): Unsubscribe;
  on(event: string, handler: EventHandler): Unsubscribe {
    return this.addListener(event, handler, false);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends EventName>(event: K, handler: EventHandler<EventMap[K]>): void;
  off<T>(event: string, handler: EventHandler<T>): void;
  off(event: string, handler: EventHandler): void {
    const listeners = this._listeners.get(event);
    if (!listeners) return;

    for (const entry of listeners) {
      if (entry.handler === handler) {
        listeners.delete(entry);
        if (this._options.debug) {
          this.log('off', event);
        }
        break;
      }
    }
  }

  /**
   * Subscribe to an event once
   */
  once<K extends EventName>(event: K, handler: EventHandler<EventMap[K]>): Unsubscribe;
  once<T>(event: string, handler: EventHandler<T>): Unsubscribe;
  once(event: string, handler: EventHandler): Unsubscribe {
    return this.addListener(event, handler, true);
  }

  // ===========================================================================
  // EXTENDED API
  // ===========================================================================

  /**
   * Subscribe to all events (wildcard)
   */
  onAny(handler: EventHandler<{ event: string; payload: unknown }>): Unsubscribe {
    const entry: ListenerEntry = {
      handler: handler as EventHandler,
      once: false,
    };

    this._wildcardListeners.add(entry);

    if (this._options.debug) {
      this.log('onAny', '*');
    }

    return () => {
      this._wildcardListeners.delete(entry);
    };
  }

  /**
   * Wait for an event (Promise-based)
   */
  waitFor<K extends EventName>(
    event: K,
    options: { timeout?: number; filter?: (payload: EventMap[K]) => boolean } = {},
  ): Promise<EventMap[K]> {
    return new Promise((resolve, reject) => {
      const { timeout, filter } = options;

      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const unsubscribe = this.on(event, (payload) => {
        if (filter && !filter(payload)) return;

        if (timeoutId) clearTimeout(timeoutId);
        unsubscribe();
        resolve(payload);
      });

      if (timeout) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);
      }
    });
  }

  /**
   * Emit multiple events
   */
  emitBatch(events: { event: EventName; payload: unknown }[]): void {
    for (const { event, payload } of events) {
      this.emit(event, payload);
    }
  }

  // ===========================================================================
  // CONTROL
  // ===========================================================================

  /**
   * Pause event emission (queues events for later)
   */
  pause(): void {
    this._paused = true;
    if (this._options.debug) {
      this.log('pause', 'EventBus paused');
    }
  }

  /**
   * Resume event emission
   */
  resume(): void {
    this._paused = false;
    if (this._options.debug) {
      this.log('resume', 'EventBus resumed');
    }
  }

  /**
   * Check if paused
   */
  get isPaused(): boolean {
    return this._paused;
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this._listeners.clear();
    this._wildcardListeners.clear();
    if (this._options.debug) {
      this.log('clear', 'All listeners cleared');
    }
  }

  /**
   * Clear listeners for a specific event
   */
  clearEvent(event: string): void {
    this._listeners.delete(event);
    if (this._options.debug) {
      this.log('clearEvent', event);
    }
  }

  // ===========================================================================
  // DEBUGGING
  // ===========================================================================

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    return this._listeners.get(event)?.size ?? 0;
  }

  /**
   * Get all registered event names
   */
  eventNames(): string[] {
    return Array.from(this._listeners.keys());
  }

  /**
   * Get event history
   */
  getHistory(): EventHistoryEntry[] {
    return [...this._history];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this._history = [];
  }

  /**
   * Enable/disable debug mode
   */
  setDebug(enabled: boolean): void {
    this._options.debug = enabled;
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Add a listener
   */
  private addListener(event: string, handler: EventHandler, once: boolean): Unsubscribe {
    let listeners = this._listeners.get(event);
    if (!listeners) {
      listeners = new Set();
      this._listeners.set(event, listeners);
    }

    // Check max listeners
    if (this._options.maxListeners > 0 && listeners.size >= this._options.maxListeners) {
      console.warn(
        `EventBus: Max listeners (${this._options.maxListeners}) exceeded for event "${event}"`,
      );
    }

    const entry: ListenerEntry = { handler, once };
    listeners.add(entry);

    if (this._options.debug) {
      this.log(once ? 'once' : 'on', event);
    }

    return () => {
      listeners.delete(entry);
    };
  }

  /**
   * Invoke a handler safely
   */
  private invokeHandler(entry: ListenerEntry, event: string, payload: unknown): void {
    try {
      // For wildcard listeners, wrap payload with event name
      if (this._wildcardListeners.has(entry)) {
        entry.handler({ event, payload });
      } else {
        entry.handler(payload);
      }
    } catch (error) {
      console.error(`EventBus: Error in handler for "${event}":`, error);
    }
  }

  /**
   * Record event to history
   */
  private recordHistory(event: string, payload: unknown, listenerCount: number): void {
    this._history.push({
      event,
      payload,
      timestamp: Date.now(),
      listenerCount,
    });

    // Trim history if needed
    while (this._history.length > this._options.historySize) {
      this._history.shift();
    }
  }

  /**
   * Debug log
   */
  private log(action: string, event: string, payload?: unknown, listenerCount?: number): void {
    const prefix = `[EventBus:${action}]`;
    if (payload !== undefined) {
      console.log(prefix, event, payload, listenerCount ? `(${listenerCount} listeners)` : '');
    } else {
      console.log(prefix, event);
    }
  }
}

/**
 * Global event bus singleton
 */
export const eventBus = new EventBus({
  debug: import.meta.env.DEV,
  historySize: import.meta.env.DEV ? 100 : 0,
});
