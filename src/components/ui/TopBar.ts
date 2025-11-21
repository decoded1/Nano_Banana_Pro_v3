/**
 * TopBar Component
 *
 * The top navigation bar with branding and project info.
 */

import { useStore } from '@/state';
import { generateId } from '@/utils/id';

import { Component, createElement } from '../shared/Component';

/**
 * TopBar component
 */
export class TopBar extends Component {
  readonly id = generateId('topbar');

  private _brandElement: HTMLElement | null = null;
  private _projectInfo: HTMLElement | null = null;
  private _actionsContainer: HTMLElement | null = null;

  /**
   * Render the top bar
   */
  protected render(): HTMLElement {
    const el = createElement('div', { className: 'top-bar ui-element' });

    // Brand section
    this._brandElement = createElement('div', { className: 'brand' });
    this._brandElement.innerHTML = `
      <div class="brand-dot"></div>
      <span class="brand-name">Nano Banana Pro</span>
    `;

    // Project info section (center)
    this._projectInfo = createElement('div', { className: 'project-info' });
    this.updateProjectInfo();

    // Actions section (right)
    this._actionsContainer = createElement('div', { className: 'top-bar-actions' });

    // Assemble
    el.appendChild(this._brandElement);
    el.appendChild(this._projectInfo);
    el.appendChild(this._actionsContainer);

    return el;
  }

  /**
   * Setup on mount
   */
  protected onMount(): void {
    // Subscribe to project info changes
    useStore.subscribe(
      (state) => state.topBar.projectInfo,
      () => this.updateProjectInfo(),
    );

    // Subscribe to save indicator changes
    useStore.subscribe(
      (state) => state.topBar.showSaveIndicator,
      (show) => this.updateSaveIndicator(show),
    );
  }

  /**
   * Update project info display
   */
  private updateProjectInfo(): void {
    if (!this._projectInfo) return;

    const { topBar } = useStore.getState();
    const { projectInfo } = topBar;

    if (!projectInfo) {
      this._projectInfo.innerHTML = '';
      return;
    }

    const modifiedIndicator = projectInfo.isModified ? ' •' : '';
    this._projectInfo.innerHTML = `
      <span class="project-name">${projectInfo.name}${modifiedIndicator}</span>
    `;
  }

  /**
   * Update save indicator
   */
  private updateSaveIndicator(show: boolean): void {
    if (!this._projectInfo) return;

    if (show) {
      this._projectInfo.classList.add('saving');
    } else {
      this._projectInfo.classList.remove('saving');
    }
  }

  /**
   * Set brand name
   */
  setBrandName(name: string): void {
    const brandName = this._brandElement?.querySelector('.brand-name');
    if (brandName) {
      brandName.textContent = name;
    }
  }
}
