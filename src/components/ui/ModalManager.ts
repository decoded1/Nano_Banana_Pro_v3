/**
 * ModalManager Component
 *
 * Renders modals based on state.
 * Handles all modal types: settings, export, confirm, error, image-preview, node-details.
 */

import { useStore } from '@/state';
import { generateId } from '@/utils/id';

import { Component, createElement } from '../shared/Component';

import type {
  ModalState,
  ConfirmModalData,
  ErrorModalData,
  ImagePreviewModalData,
  ImageSize,
} from '@/types';

// =============================================================================
// ICONS
// =============================================================================

const ICONS = {
  close:
    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  error:
    '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="3"/><path d="M24 14v12M24 30v4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  check:
    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  warning:
    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L1 18h18L10 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 8v4M10 14v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

// =============================================================================
// MODAL MANAGER COMPONENT
// =============================================================================

/**
 * Manages and renders all modal dialogs
 */
export class ModalManager extends Component {
  readonly id = generateId('modal-manager');

  private _backdropEl: HTMLElement | null = null;
  private _modalEl: HTMLElement | null = null;
  private _currentModal: ModalState | null = null;

  // Settings state
  private _settingsState = {
    apiKey: '',
    autoSave: true,
    showGrid: true,
    snapToGrid: false,
    imageSize: '1K' as ImageSize,
  };

  // Export state
  private _exportState = {
    format: 'png' as 'png' | 'jpg' | 'webp',
    quality: 90,
    includeMetadata: true,
  };

  /**
   * Render the modal container
   */
  protected render(): HTMLElement {
    const el = createElement('div', { className: 'modal-manager' });
    return el;
  }

  /**
   * Setup on mount
   */
  protected onMount(): void {
    this.subscribeToModal();
    this.setupKeyboardHandler();
  }

  /**
   * Subscribe to modal state changes
   */
  private subscribeToModal(): void {
    useStore.subscribe(
      (state) => state.modal,
      (modal) => this.updateModal(modal),
    );
  }

  /**
   * Setup keyboard handler for Escape key
   */
  private setupKeyboardHandler(): void {
    this.addEventListener(document, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this._currentModal) {
        this.handleClose();
      }
    });
  }

  /**
   * Update modal based on state
   */
  private updateModal(modal: ModalState | null): void {
    if (modal?.isOpen) {
      this._currentModal = modal;
      this.showModal(modal);
    } else {
      this.hideModal();
      this._currentModal = null;
    }
  }

  /**
   * Show modal
   */
  private showModal(modal: ModalState): void {
    // Create backdrop
    this._backdropEl = createElement('div', { className: 'modal-backdrop' });
    this.addEventListener(this._backdropEl, 'click', (e) => {
      if (e.target === this._backdropEl) {
        this.handleClose();
      }
    });

    // Create modal based on type
    this._modalEl = this.createModal(modal);
    this._backdropEl.appendChild(this._modalEl);
    this._element?.appendChild(this._backdropEl);

    // Focus first focusable element
    requestAnimationFrame(() => {
      const focusable = this._modalEl?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    });
  }

  /**
   * Hide modal
   */
  private hideModal(): void {
    if (this._backdropEl) {
      this._backdropEl.remove();
      this._backdropEl = null;
      this._modalEl = null;
    }
  }

  /**
   * Handle modal close
   */
  private handleClose(): void {
    useStore.getState().closeModal();
  }

  /**
   * Create modal based on type
   */
  private createModal(modal: ModalState): HTMLElement {
    const sizeClass = this.getModalSizeClass(modal.type);
    const el = createElement('div', { className: `modal ${sizeClass}` });
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'modal-title');

    // Header
    const header = this.createHeader(modal.title);
    el.appendChild(header);

    // Body
    const body = createElement('div', { className: 'modal-body' });
    body.appendChild(this.createContent(modal));
    el.appendChild(body);

    // Footer (for some modal types)
    const footer = this.createFooter(modal);
    if (footer) {
      el.appendChild(footer);
    }

    return el;
  }

  /**
   * Get modal size class based on type
   */
  private getModalSizeClass(type: string): string {
    switch (type) {
      case 'settings':
      case 'export':
        return 'modal-md';
      case 'image-preview':
      case 'node-details':
        return 'modal-lg';
      case 'confirm':
      case 'error':
      default:
        return 'modal-sm';
    }
  }

  /**
   * Create modal header
   */
  private createHeader(title: string): HTMLElement {
    const header = createElement('div', { className: 'modal-header' });

    const titleEl = createElement('h2', { className: 'modal-title' });
    titleEl.id = 'modal-title';
    titleEl.textContent = title;
    header.appendChild(titleEl);

    const closeBtn = createElement('button', { className: 'modal-close' }) as HTMLButtonElement;
    closeBtn.innerHTML = ICONS.close;
    closeBtn.setAttribute('aria-label', 'Close');
    this.addEventListener(closeBtn, 'click', () => this.handleClose());
    header.appendChild(closeBtn);

    return header;
  }

  /**
   * Create modal content based on type
   */
  private createContent(modal: ModalState): HTMLElement {
    switch (modal.type) {
      case 'settings':
        return this.createSettingsContent();
      case 'export':
        return this.createExportContent();
      case 'confirm':
        return this.createConfirmContent(modal.data as ConfirmModalData);
      case 'error':
        return this.createErrorContent(modal.data as ErrorModalData);
      case 'image-preview':
        return this.createImagePreviewContent(modal.data as ImagePreviewModalData);
      case 'node-details':
        return this.createNodeDetailsContent(modal.data);
      default:
        return createElement('div');
    }
  }

  /**
   * Create modal footer based on type
   */
  private createFooter(modal: ModalState): HTMLElement | null {
    switch (modal.type) {
      case 'settings':
        return this.createSettingsFooter();
      case 'export':
        return this.createExportFooter();
      case 'confirm':
        return this.createConfirmFooter(modal.data as ConfirmModalData);
      case 'error':
        return this.createErrorFooter(modal.data as ErrorModalData);
      case 'image-preview':
        return this.createImagePreviewFooter(modal.data as ImagePreviewModalData);
      default:
        return null;
    }
  }

  // ===========================================================================
  // SETTINGS MODAL
  // ===========================================================================

  private createSettingsContent(): HTMLElement {
    const content = createElement('div', { className: 'settings-content' });

    // API Section
    const apiSection = this.createSettingsSection('API Configuration', [
      this.createFormGroup('Gemini API Key', () => {
        const input = createElement('input', { className: 'form-input' }) as HTMLInputElement;
        input.type = 'password';
        input.placeholder = 'Enter your API key';
        input.value = this._settingsState.apiKey;
        this.addEventListener(input, 'input', () => {
          this._settingsState.apiKey = input.value;
        });
        return input;
      }),
    ]);
    content.appendChild(apiSection);

    // Generation Section
    const genSection = this.createSettingsSection('Generation', [
      this.createSettingsRow('Default Image Size', 'Size for new generations', () => {
        const select = createElement('select', { className: 'form-select' }) as HTMLSelectElement;
        const options: { value: ImageSize; label: string }[] = [
          { value: '1K', label: '1K (1024 x 1024)' },
          { value: '2K', label: '2K (2048 x 2048)' },
          { value: '4K', label: '4K (4096 x 4096)' },
        ];
        for (const opt of options) {
          const option = createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          if (opt.value === this._settingsState.imageSize) {
            option.selected = true;
          }
          select.appendChild(option);
        }
        this.addEventListener(select, 'change', () => {
          this._settingsState.imageSize = select.value as ImageSize;
        });
        return select;
      }),
    ]);
    content.appendChild(genSection);

    // Canvas Section
    const canvasSection = this.createSettingsSection('Canvas', [
      this.createSettingsRow('Show Grid', 'Display grid lines on canvas', () =>
        this.createToggle(this._settingsState.showGrid, (checked) => {
          this._settingsState.showGrid = checked;
        }),
      ),
      this.createSettingsRow('Snap to Grid', 'Snap nodes to grid when moving', () =>
        this.createToggle(this._settingsState.snapToGrid, (checked) => {
          this._settingsState.snapToGrid = checked;
        }),
      ),
      this.createSettingsRow('Auto Save', 'Automatically save project changes', () =>
        this.createToggle(this._settingsState.autoSave, (checked) => {
          this._settingsState.autoSave = checked;
        }),
      ),
    ]);
    content.appendChild(canvasSection);

    return content;
  }

  private createSettingsSection(title: string, rows: HTMLElement[]): HTMLElement {
    const section = createElement('div', { className: 'settings-section' });

    const titleEl = createElement('h3', { className: 'settings-section-title' });
    titleEl.textContent = title;
    section.appendChild(titleEl);

    for (const row of rows) {
      section.appendChild(row);
    }

    return section;
  }

  private createSettingsRow(
    title: string,
    description: string,
    controlFactory: () => HTMLElement,
  ): HTMLElement {
    const row = createElement('div', { className: 'settings-row' });

    const labelContainer = createElement('div', { className: 'settings-row-label' });
    const titleEl = createElement('span', { className: 'settings-row-title' });
    titleEl.textContent = title;
    labelContainer.appendChild(titleEl);

    const descEl = createElement('span', { className: 'settings-row-description' });
    descEl.textContent = description;
    labelContainer.appendChild(descEl);

    row.appendChild(labelContainer);
    row.appendChild(controlFactory());

    return row;
  }

  private createFormGroup(label: string, inputFactory: () => HTMLElement): HTMLElement {
    const group = createElement('div', { className: 'form-group' });

    const labelEl = createElement('label', { className: 'form-label' });
    labelEl.textContent = label;
    group.appendChild(labelEl);
    group.appendChild(inputFactory());

    return group;
  }

  private createToggle(initialValue: boolean, onChange: (checked: boolean) => void): HTMLElement {
    const toggle = createElement('label', { className: 'toggle' });

    const input = createElement('input', { className: 'toggle-input' }) as HTMLInputElement;
    input.type = 'checkbox';
    input.checked = initialValue;
    this.addEventListener(input, 'change', () => {
      onChange(input.checked);
    });
    toggle.appendChild(input);

    const track = createElement('span', { className: 'toggle-track' });
    const thumb = createElement('span', { className: 'toggle-thumb' });
    track.appendChild(thumb);
    toggle.appendChild(track);

    return toggle;
  }

  private createSettingsFooter(): HTMLElement {
    const footer = createElement('div', { className: 'modal-footer' });

    const cancelBtn = createElement('button', {
      className: 'btn btn-secondary',
    }) as HTMLButtonElement;
    cancelBtn.textContent = 'Cancel';
    this.addEventListener(cancelBtn, 'click', () => this.handleClose());
    footer.appendChild(cancelBtn);

    const saveBtn = createElement('button', { className: 'btn btn-primary' }) as HTMLButtonElement;
    saveBtn.textContent = 'Save Changes';
    this.addEventListener(saveBtn, 'click', () => {
      // Save settings to store
      const state = useStore.getState();
      if (this._settingsState.apiKey) {
        // Store API key in localStorage for persistence
        localStorage.setItem('gemini_api_key', this._settingsState.apiKey);
      }
      state.setPromptConfig({
        imageSize: this._settingsState.imageSize,
      });
      state.showToast('success', 'Settings saved successfully');
      this.handleClose();
    });
    footer.appendChild(saveBtn);

    return footer;
  }

  // ===========================================================================
  // EXPORT MODAL
  // ===========================================================================

  private createExportContent(): HTMLElement {
    const content = createElement('div', { className: 'export-options' });

    // Format selection
    const formatLabel = createElement('label', { className: 'form-label' });
    formatLabel.textContent = 'Export Format';
    content.appendChild(formatLabel);

    const formatGrid = createElement('div', { className: 'export-format-grid' });
    const formats = [
      { value: 'png', label: 'PNG', icon: '🖼️' },
      { value: 'jpg', label: 'JPEG', icon: '📷' },
      { value: 'webp', label: 'WebP', icon: '🌐' },
    ] as const;

    for (const format of formats) {
      const btn = createElement('button', {
        className: `export-format-btn ${this._exportState.format === format.value ? 'selected' : ''}`,
      }) as HTMLButtonElement;
      btn.type = 'button';
      btn.innerHTML = `
        <div class="export-format-icon">${format.icon}</div>
        <div class="export-format-label">${format.label}</div>
      `;
      this.addEventListener(btn, 'click', () => {
        this._exportState.format = format.value;
        // Update selection state
        formatGrid
          .querySelectorAll('.export-format-btn')
          .forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        // Show/hide quality slider based on format
        const qualityGroup = content.querySelector('.quality-group');
        if (qualityGroup) {
          (qualityGroup as HTMLElement).style.display = format.value === 'png' ? 'none' : 'block';
        }
      });
      formatGrid.appendChild(btn);
    }
    content.appendChild(formatGrid);

    // Quality slider (for JPG/WebP)
    const qualityGroup = createElement('div', { className: 'form-group quality-group' });
    qualityGroup.style.display = this._exportState.format === 'png' ? 'none' : 'block';

    const qualityLabel = createElement('label', { className: 'form-label' });
    qualityLabel.textContent = `Quality: ${this._exportState.quality}%`;
    qualityGroup.appendChild(qualityLabel);

    const qualityInput = createElement('input', { className: 'form-input' }) as HTMLInputElement;
    qualityInput.type = 'range';
    qualityInput.min = '10';
    qualityInput.max = '100';
    qualityInput.value = String(this._exportState.quality);
    qualityInput.style.padding = '0';
    this.addEventListener(qualityInput, 'input', () => {
      this._exportState.quality = parseInt(qualityInput.value, 10);
      qualityLabel.textContent = `Quality: ${this._exportState.quality}%`;
    });
    qualityGroup.appendChild(qualityInput);
    content.appendChild(qualityGroup);

    // Include metadata checkbox
    const metadataGroup = this.createCheckbox(
      'Include prompt metadata',
      this._exportState.includeMetadata,
      (checked) => {
        this._exportState.includeMetadata = checked;
      },
    );
    content.appendChild(metadataGroup);

    return content;
  }

  private createCheckbox(
    label: string,
    initialValue: boolean,
    onChange: (checked: boolean) => void,
  ): HTMLElement {
    const checkbox = createElement('label', { className: 'checkbox' });

    const input = createElement('input', { className: 'checkbox-input' }) as HTMLInputElement;
    input.type = 'checkbox';
    input.checked = initialValue;
    this.addEventListener(input, 'change', () => {
      onChange(input.checked);
    });
    checkbox.appendChild(input);

    const box = createElement('span', { className: 'checkbox-box' });
    const icon = createElement('span', { className: 'checkbox-icon' });
    icon.innerHTML = ICONS.check;
    box.appendChild(icon);
    checkbox.appendChild(box);

    const labelEl = createElement('span', { className: 'checkbox-label' });
    labelEl.textContent = label;
    checkbox.appendChild(labelEl);

    return checkbox;
  }

  private createExportFooter(): HTMLElement {
    const footer = createElement('div', { className: 'modal-footer' });

    const cancelBtn = createElement('button', {
      className: 'btn btn-secondary',
    }) as HTMLButtonElement;
    cancelBtn.textContent = 'Cancel';
    this.addEventListener(cancelBtn, 'click', () => this.handleClose());
    footer.appendChild(cancelBtn);

    const exportBtn = createElement('button', {
      className: 'btn btn-primary',
    }) as HTMLButtonElement;
    exportBtn.textContent = 'Export';
    this.addEventListener(exportBtn, 'click', () => {
      // Trigger export - this would be wired to the export service
      useStore
        .getState()
        .showToast('info', `Exporting as ${this._exportState.format.toUpperCase()}...`);
      this.handleClose();
    });
    footer.appendChild(exportBtn);

    return footer;
  }

  // ===========================================================================
  // CONFIRM DIALOG
  // ===========================================================================

  private createConfirmContent(data: ConfirmModalData): HTMLElement {
    const content = createElement('div', { className: 'confirm-content' });

    const message = createElement('p', { className: 'confirm-message' });
    message.textContent = data.message;
    content.appendChild(message);

    if (data.isDangerous) {
      const warning = createElement('div', { className: 'confirm-warning' });
      warning.innerHTML = ICONS.warning;
      const warningText = createElement('span');
      warningText.textContent = 'This action cannot be undone.';
      warning.appendChild(warningText);
      content.appendChild(warning);
    }

    return content;
  }

  private createConfirmFooter(data: ConfirmModalData): HTMLElement {
    const footer = createElement('div', { className: 'modal-footer' });

    const cancelBtn = createElement('button', {
      className: 'btn btn-secondary',
    }) as HTMLButtonElement;
    cancelBtn.textContent = data.cancelLabel;
    this.addEventListener(cancelBtn, 'click', () => {
      data.onCancel?.();
      this.handleClose();
    });
    footer.appendChild(cancelBtn);

    const confirmBtn = createElement('button', {
      className: `btn ${data.isDangerous ? 'btn-danger' : 'btn-primary'}`,
    }) as HTMLButtonElement;
    confirmBtn.textContent = data.confirmLabel;
    this.addEventListener(confirmBtn, 'click', () => {
      data.onConfirm();
      this.handleClose();
    });
    footer.appendChild(confirmBtn);

    return footer;
  }

  // ===========================================================================
  // ERROR MODAL
  // ===========================================================================

  private createErrorContent(data: ErrorModalData): HTMLElement {
    const content = createElement('div', { className: 'error-content' });

    const iconEl = createElement('div', { className: 'error-icon' });
    iconEl.innerHTML = ICONS.error;
    content.appendChild(iconEl);

    const message = createElement('p', { className: 'error-message' });
    message.textContent = data.message;
    content.appendChild(message);

    if (data.details) {
      const details = createElement('pre', { className: 'error-details' });
      details.textContent = data.details;
      content.appendChild(details);
    }

    return content;
  }

  private createErrorFooter(data: ErrorModalData): HTMLElement {
    const footer = createElement('div', { className: 'modal-footer' });

    if (data.retryAction) {
      const retryBtn = createElement('button', {
        className: 'btn btn-secondary',
      }) as HTMLButtonElement;
      retryBtn.textContent = 'Retry';
      this.addEventListener(retryBtn, 'click', () => {
        data.retryAction?.();
        this.handleClose();
      });
      footer.appendChild(retryBtn);
    }

    const closeBtn = createElement('button', { className: 'btn btn-primary' }) as HTMLButtonElement;
    closeBtn.textContent = 'Close';
    this.addEventListener(closeBtn, 'click', () => this.handleClose());
    footer.appendChild(closeBtn);

    return footer;
  }

  // ===========================================================================
  // IMAGE PREVIEW MODAL
  // ===========================================================================

  private createImagePreviewContent(data: ImagePreviewModalData): HTMLElement {
    const content = createElement('div', { className: 'image-preview' });

    const img = createElement('img', { className: 'image-preview-img' }) as HTMLImageElement;
    img.src = data.imageUrl;
    img.alt = data.title;
    content.appendChild(img);

    const info = createElement('div', { className: 'image-preview-info' });
    if (data.prompt) {
      const promptEl = createElement('p');
      promptEl.textContent = `Prompt: ${data.prompt}`;
      info.appendChild(promptEl);
    }
    if (data.resolution) {
      const resEl = createElement('p');
      resEl.textContent = `Resolution: ${data.resolution}`;
      info.appendChild(resEl);
    }
    if (info.children.length > 0) {
      content.appendChild(info);
    }

    return content;
  }

  private createImagePreviewFooter(data: ImagePreviewModalData): HTMLElement {
    const footer = createElement('div', { className: 'modal-footer' });

    const downloadBtn = createElement('button', {
      className: 'btn btn-secondary',
    }) as HTMLButtonElement;
    downloadBtn.textContent = 'Download';
    this.addEventListener(downloadBtn, 'click', () => {
      // Create download link
      const link = document.createElement('a');
      link.href = data.imageUrl;
      link.download = `${data.title}.png`;
      link.click();
    });
    footer.appendChild(downloadBtn);

    const closeBtn = createElement('button', { className: 'btn btn-primary' }) as HTMLButtonElement;
    closeBtn.textContent = 'Close';
    this.addEventListener(closeBtn, 'click', () => this.handleClose());
    footer.appendChild(closeBtn);

    return footer;
  }

  // ===========================================================================
  // NODE DETAILS MODAL
  // ===========================================================================

  private createNodeDetailsContent(data: unknown): HTMLElement {
    const content = createElement('div', { className: 'node-details' });
    const nodeData = data as { nodeId?: string; prompt?: string; imageUrl?: string } | undefined;

    if (!nodeData) {
      const message = createElement('p');
      message.textContent = 'No node selected';
      content.appendChild(message);
      return content;
    }

    // Display node information
    if (nodeData.imageUrl) {
      const img = createElement('img', { className: 'image-preview-img' }) as HTMLImageElement;
      img.src = nodeData.imageUrl;
      img.alt = 'Node image';
      content.appendChild(img);
    }

    if (nodeData.prompt) {
      const promptGroup = this.createFormGroup('Prompt', () => {
        const textarea = createElement('textarea', {
          className: 'form-input',
        }) as HTMLTextAreaElement;
        textarea.value = nodeData.prompt ?? '';
        textarea.rows = 3;
        textarea.readOnly = true;
        textarea.style.height = 'auto';
        textarea.style.resize = 'vertical';
        return textarea;
      });
      content.appendChild(promptGroup);
    }

    return content;
  }

  /**
   * Cleanup on destroy
   */
  protected onDestroy(): void {
    this._backdropEl = null;
    this._modalEl = null;
    this._currentModal = null;
  }
}
