/**
 * ToastContainer Component
 *
 * Renders toast notifications from state.
 * Handles auto-dismissal and action buttons.
 */

import { useStore } from '@/state';
import { generateId } from '@/utils/id';

import { Component, createElement } from '../shared/Component';

import type { Toast, ToastType } from '@/types';

// =============================================================================
// TOAST ICONS
// =============================================================================

const TOAST_ICONS: Record<ToastType, string> = {
  success:
    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 18a8 8 0 100-16 8 8 0 000 16z" fill="#10b981"/><path d="M7 10l2 2 4-4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  error:
    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 18a8 8 0 100-16 8 8 0 000 16z" fill="#ef4444"/><path d="M12.5 7.5l-5 5M7.5 7.5l5 5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
  warning:
    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 18a8 8 0 100-16 8 8 0 000 16z" fill="#f59e0b"/><path d="M10 6v4M10 14h.01" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
  info: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 18a8 8 0 100-16 8 8 0 000 16z" fill="#3b82f6"/><path d="M10 14v-4M10 6h.01" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
};

// =============================================================================
// TOAST CONTAINER COMPONENT
// =============================================================================

/**
 * Container that renders toast notifications
 */
export class ToastContainer extends Component {
  readonly id = generateId('toast-container');

  private _toastsEl: HTMLElement | null = null;
  private _toastElements = new Map<string, HTMLElement>();

  /**
   * Render the toast container
   */
  protected render(): HTMLElement {
    const el = createElement('div', { className: 'toast-container' });

    // Container for toasts
    this._toastsEl = createElement('div', { className: 'toasts-list' });
    el.appendChild(this._toastsEl);

    return el;
  }

  /**
   * Setup on mount
   */
  protected onMount(): void {
    this.subscribeToToasts();
  }

  /**
   * Subscribe to toast state changes
   */
  private subscribeToToasts(): void {
    useStore.subscribe(
      (state) => state.toasts.toasts,
      (toasts) => this.updateToasts(toasts),
    );
  }

  /**
   * Update rendered toasts
   */
  private updateToasts(toasts: Toast[]): void {
    if (!this._toastsEl) return;

    const currentIds = new Set(toasts.map((t) => t.id));

    // Remove toasts that are no longer in state
    for (const [id, element] of this._toastElements) {
      if (!currentIds.has(id)) {
        element.classList.add('toast-exit');
        setTimeout(() => {
          element.remove();
          this._toastElements.delete(id);
        }, 300);
      }
    }

    // Add new toasts
    for (const toast of toasts) {
      if (!this._toastElements.has(toast.id)) {
        const toastEl = this.createToastElement(toast);
        this._toastsEl.appendChild(toastEl);
        this._toastElements.set(toast.id, toastEl);

        // Trigger enter animation
        requestAnimationFrame(() => {
          toastEl.classList.add('toast-enter');
        });
      }
    }
  }

  /**
   * Create a toast element
   */
  private createToastElement(toast: Toast): HTMLElement {
    const el = createElement('div', {
      className: `toast toast-${toast.type}`,
    });
    el.setAttribute('data-toast-id', toast.id);
    el.setAttribute('role', 'alert');

    // Icon
    const iconEl = createElement('span', { className: 'toast-icon' });
    iconEl.innerHTML = TOAST_ICONS[toast.type];
    el.appendChild(iconEl);

    // Content
    const contentEl = createElement('div', { className: 'toast-content' });

    // Message
    const messageEl = createElement('p', { className: 'toast-message' });
    messageEl.textContent = toast.message;
    contentEl.appendChild(messageEl);

    // Action button if provided
    if (toast.action) {
      const actionBtn = createElement('button', { className: 'toast-action' }) as HTMLButtonElement;
      actionBtn.textContent = toast.action.label;
      this.addEventListener(actionBtn, 'click', () => {
        toast.action?.onClick();
        useStore.getState().dismissToast(toast.id);
      });
      contentEl.appendChild(actionBtn);
    }

    el.appendChild(contentEl);

    // Close button
    const closeBtn = createElement('button', { className: 'toast-close' }) as HTMLButtonElement;
    closeBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    closeBtn.setAttribute('aria-label', 'Dismiss');
    this.addEventListener(closeBtn, 'click', () => {
      useStore.getState().dismissToast(toast.id);
    });
    el.appendChild(closeBtn);

    return el;
  }

  /**
   * Cleanup on destroy
   */
  protected onDestroy(): void {
    this._toastElements.clear();
    this._toastsEl = null;
  }
}
