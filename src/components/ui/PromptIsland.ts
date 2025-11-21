/**
 * PromptIsland Component
 *
 * The floating prompt input for image generation.
 * Includes reference image dropzone, text input, and generate button.
 */

import { eventBus, EVENTS } from '@/core/events';
import { useStore } from '@/state';
import { generateId } from '@/utils/id';

import { Component, createElement } from '../shared/Component';

// Types imported from state slice definitions

/**
 * PromptIsland component
 */
export class PromptIsland extends Component {
  readonly id = generateId('prompt');

  private _dropzone: HTMLElement | null = null;
  private _input: HTMLInputElement | null = null;
  private _generateBtn: HTMLButtonElement | null = null;
  private _configBtn: HTMLButtonElement | null = null;

  /**
   * Render the prompt island
   */
  protected render(): HTMLElement {
    const el = createElement('div', { className: 'prompt-island ui-element' });

    // Reference dropzone
    this._dropzone = createElement('div', { className: 'ref-dropzone' });
    this._dropzone.setAttribute('tabindex', '0');
    this._dropzone.setAttribute('title', 'Add reference image');
    this._dropzone.innerHTML = '+';

    // Text input
    this._input = document.createElement('input');
    this._input.type = 'text';
    this._input.className = 'prompt-input';
    this._input.placeholder = 'Describe the image you want to create...';

    // Config button (optional)
    this._configBtn = createElement('button', { className: 'config-btn' }) as HTMLButtonElement;
    this._configBtn.innerHTML = '⚙';
    this._configBtn.title = 'Generation settings';
    this._configBtn.style.cssText =
      'background: transparent; border: none; color: var(--color-text-muted); cursor: pointer; padding: 8px;';

    // Generate button
    this._generateBtn = createElement('button', {
      className: 'generate-btn',
    }) as HTMLButtonElement;
    this._generateBtn.textContent = 'Generate';

    // Assemble
    el.appendChild(this._dropzone);
    el.appendChild(this._input);
    el.appendChild(this._configBtn);
    el.appendChild(this._generateBtn);

    return el;
  }

  /**
   * Setup on mount
   */
  protected onMount(): void {
    this.setupInputHandlers();
    this.setupDropzoneHandlers();
    this.setupGenerateHandler();
    this.setupConfigHandler();
    this.subscribeToState();
  }

  /**
   * Setup input event handlers
   */
  private setupInputHandlers(): void {
    if (!this._input) return;

    // Sync input with store
    this.addEventListener(this._input, 'input', () => {
      const text = this._input?.value ?? '';
      useStore.getState().setPromptText(text);

      // Emit event
      eventBus.emit(EVENTS.UI.PROMPT_CHANGED, {
        text,
        previousText: useStore.getState().prompt.text,
      });
    });

    // Handle Enter key to generate
    this.addEventListener(this._input, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleGenerate();
      }
    });
  }

  /**
   * Setup dropzone handlers
   */
  private setupDropzoneHandlers(): void {
    if (!this._dropzone) return;

    // Click to open file picker
    this.addEventListener(this._dropzone, 'click', () => {
      this.openFilePicker();
    });

    // Keyboard support
    this.addEventListener(this._dropzone, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openFilePicker();
      }
    });

    // Drag and drop
    this.addEventListener(this._dropzone, 'dragover', (e: DragEvent) => {
      e.preventDefault();
      this._dropzone?.classList.add('drag-over');
    });

    this.addEventListener(this._dropzone, 'dragleave', () => {
      this._dropzone?.classList.remove('drag-over');
    });

    this.addEventListener(this._dropzone, 'drop', (e: DragEvent) => {
      e.preventDefault();
      this._dropzone?.classList.remove('drag-over');

      const files = e.dataTransfer?.files;
      const firstFile = files?.[0];
      if (firstFile) {
        this.handleFileSelect(firstFile);
      }
    });
  }

  /**
   * Open file picker
   */
  private openFilePicker(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/heic,image/heif';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) {
        this.handleFileSelect(file);
      }
    });

    input.click();
  }

  /**
   * Handle file selection
   */
  private handleFileSelect(file: File): void {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type)) {
      useStore.getState().showToast('error', 'Invalid file type. Please use PNG, JPEG, or WebP.');
      return;
    }

    // Validate file size (7MB max per API)
    const maxSize = 7 * 1024 * 1024;
    if (file.size > maxSize) {
      useStore.getState().showToast('error', 'File too large. Maximum size is 7MB.');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      // Add reference to prompt
      const base64Data = dataUrl.split(',')[1] ?? '';
      useStore.getState().addPromptReference({
        imageData: {
          data: base64Data,
          mimeType: file.type,
        },
        thumbnail: dataUrl,
      });

      // Update dropzone visual
      this.updateDropzonePreview(dataUrl);

      // Emit event
      eventBus.emit(EVENTS.UI.REFERENCE_ADDED, {
        reference: {
          data: dataUrl.split(',')[1],
          mimeType: file.type,
        },
      });
    };

    reader.readAsDataURL(file);
  }

  /**
   * Update dropzone with image preview
   */
  private updateDropzonePreview(dataUrl: string): void {
    if (!this._dropzone) return;

    this._dropzone.classList.add('has-image');
    this._dropzone.innerHTML = `<img src="${dataUrl}" alt="Reference">`;
  }

  /**
   * Clear dropzone preview
   */
  private clearDropzonePreview(): void {
    if (!this._dropzone) return;

    this._dropzone.classList.remove('has-image');
    this._dropzone.innerHTML = '+';
  }

  /**
   * Setup generate button handler
   */
  private setupGenerateHandler(): void {
    if (!this._generateBtn) return;

    this.addEventListener(this._generateBtn, 'click', () => {
      this.handleGenerate();
    });
  }

  /**
   * Setup config button handler
   */
  private setupConfigHandler(): void {
    if (!this._configBtn) return;

    this.addEventListener(this._configBtn, 'click', () => {
      useStore.getState().openModal('settings', { tab: 'generation' });
    });
  }

  /**
   * Handle generate action
   */
  private handleGenerate(): void {
    const state = useStore.getState();
    const { prompt } = state;

    // Validate prompt
    if (!prompt.text.trim()) {
      state.showToast('warning', 'Please enter a prompt');
      this._input?.focus();
      return;
    }

    // Check if already generating
    if (prompt.isGenerating) {
      state.showToast('info', 'Generation already in progress');
      return;
    }

    // Get references
    const references = prompt.references.map((ref) => ref.imageData);

    // Emit generation requested event
    eventBus.emit(EVENTS.GENERATION.REQUESTED, {
      prompt: prompt.text,
      referenceImages: references,
      config: prompt.config,
    });

    // Update UI state
    state.setPromptGenerating(true);
  }

  /**
   * Subscribe to state changes
   */
  private subscribeToState(): void {
    // Sync prompt text
    useStore.subscribe(
      (state) => state.prompt.text,
      (text) => {
        if (this._input && this._input.value !== text) {
          this._input.value = text;
        }
      },
    );

    // Sync generating state
    useStore.subscribe(
      (state) => state.prompt.isGenerating,
      (isGenerating) => {
        if (this._generateBtn) {
          this._generateBtn.disabled = isGenerating;
          this._generateBtn.textContent = isGenerating ? 'Generating...' : 'Generate';
        }
      },
    );

    // Handle errors
    useStore.subscribe(
      (state) => state.prompt.errorMessage,
      (error) => {
        if (error) {
          useStore.getState().showToast('error', error);
          useStore.getState().setPromptError(null);
        }
      },
    );

    // Handle references cleared
    useStore.subscribe(
      (state) => state.prompt.references.length,
      (length) => {
        if (length === 0) {
          this.clearDropzonePreview();
        }
      },
    );
  }

  /**
   * Set prompt text programmatically
   */
  setPromptText(text: string): void {
    if (this._input) {
      this._input.value = text;
    }
    useStore.getState().setPromptText(text);
  }

  /**
   * Focus the input
   */
  focus(): void {
    this._input?.focus();
  }

  /**
   * Clear the prompt
   */
  clear(): void {
    this.setPromptText('');
    useStore.getState().clearPromptReferences();
    this.clearDropzonePreview();
  }
}
