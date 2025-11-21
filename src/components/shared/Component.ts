/**
 * Base Component
 *
 * Abstract base class for all UI components.
 * Provides common functionality for lifecycle management.
 */

/**
 * Component interface for all UI components
 */
export interface IComponent {
  /** Unique identifier for this component instance */
  readonly id: string;
  /** The root DOM element */
  readonly element: HTMLElement;
  /** Mount the component to a parent element */
  mount(parent: HTMLElement): void;
  /** Unmount and cleanup the component */
  unmount(): void;
  /** Update the component (re-render if needed) */
  update(): void;
  /** Destroy the component and cleanup all resources */
  destroy(): void;
}

/**
 * Base component class with common functionality
 */
export abstract class Component implements IComponent {
  abstract readonly id: string;
  protected _element: HTMLElement | null = null;
  protected _isMounted = false;
  private _eventCleanups: (() => void)[] = [];

  /**
   * Get the root DOM element
   */
  get element(): HTMLElement {
    if (!this._element) {
      this._element = this.render();
    }
    return this._element;
  }

  /**
   * Check if component is mounted
   */
  get isMounted(): boolean {
    return this._isMounted;
  }

  /**
   * Mount the component to a parent element
   */
  mount(parent: HTMLElement): void {
    if (this._isMounted) {
      return;
    }

    parent.appendChild(this.element);
    this._isMounted = true;
    this.onMount();
  }

  /**
   * Unmount the component from the DOM
   */
  unmount(): void {
    if (!this._isMounted || !this._element) {
      return;
    }

    this._element.remove();
    this._isMounted = false;
    this.onUnmount();
  }

  /**
   * Update the component
   */
  update(): void {
    if (this._element) {
      this.onUpdate();
    }
  }

  /**
   * Destroy the component and cleanup all resources
   */
  destroy(): void {
    this.unmount();
    this.cleanupEvents();
    this._element = null;
    this.onDestroy();
  }

  /**
   * Render the component (must be implemented by subclasses)
   */
  protected abstract render(): HTMLElement;

  /**
   * Called when component is mounted (override for setup)
   */
  protected onMount(): void {
    // Override in subclass
  }

  /**
   * Called when component is unmounted (override for cleanup)
   */
  protected onUnmount(): void {
    // Override in subclass
  }

  /**
   * Called when component is updated (override for re-render logic)
   */
  protected onUpdate(): void {
    // Override in subclass
  }

  /**
   * Called when component is destroyed (override for final cleanup)
   */
  protected onDestroy(): void {
    // Override in subclass
  }

  /**
   * Add an event listener with automatic cleanup
   */
  protected addEventListener<K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Window | Document,
    event: K,
    handler: (e: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(event, handler as EventListener, options);
    this._eventCleanups.push(() => {
      target.removeEventListener(event, handler as EventListener, options);
    });
  }

  /**
   * Cleanup all event listeners
   */
  protected cleanupEvents(): void {
    for (const cleanup of this._eventCleanups) {
      cleanup();
    }
    this._eventCleanups = [];
  }
}

/**
 * Create a DOM element with attributes and children
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  ...children: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        el.className = value;
      } else {
        el.setAttribute(key, value);
      }
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  }

  return el;
}
