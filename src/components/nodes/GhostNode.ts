/**
 * GhostNode Component
 *
 * A loading placeholder node shown during image generation.
 * Displays a pulsing animation and progress bar while waiting for the API response.
 */

import { useStore } from '@/state';

import { NodeCard, type NodeCardProps } from './NodeCard';

import type { ImageResolution, GenerationQueueItem } from '@/types';

export interface GhostNodeProps extends NodeCardProps {
  /** Associated generation request ID */
  requestId?: string;
}

/**
 * GhostNode is a specialized NodeCard for loading states
 * The visual difference is handled via CSS (.node.ghost)
 */
export class GhostNode extends NodeCard {
  private _requestId: string | null = null;
  private _progressBar: HTMLElement | null = null;
  private _statusText: HTMLElement | null = null;

  constructor(props: GhostNodeProps) {
    // Ensure isGhost is set in config
    const ghostProps: NodeCardProps = {
      nodeState: {
        ...props.nodeState,
        config: {
          ...props.nodeState.config,
          isGhost: true,
        },
      },
    };
    super(ghostProps);
    this._requestId = props.requestId ?? null;
  }

  /**
   * Get the associated request ID
   */
  get requestId(): string | null {
    return this._requestId;
  }

  /**
   * Set the associated request ID
   */
  setRequestId(requestId: string): void {
    this._requestId = requestId;
    this.subscribeToProgress();
  }

  /**
   * Setup on mount - override to add progress tracking
   */
  protected onMount(): void {
    super.onMount();
    this.createProgressUI();
    if (this._requestId) {
      this.subscribeToProgress();
    }
  }

  /**
   * Create progress UI elements
   */
  private createProgressUI(): void {
    if (!this.element) return;

    // Find or create progress container
    let progressContainer = this.element.querySelector('.ghost-progress') as HTMLElement | null;
    if (!progressContainer) {
      progressContainer = document.createElement('div');
      progressContainer.className = 'ghost-progress';

      // Progress bar
      this._progressBar = document.createElement('div');
      this._progressBar.className = 'ghost-progress-bar';
      this._progressBar.style.width = '0%';
      progressContainer.appendChild(this._progressBar);

      // Status text
      this._statusText = document.createElement('span');
      this._statusText.className = 'ghost-status';
      this._statusText.textContent = 'Generating...';
      progressContainer.appendChild(this._statusText);

      // Insert into node
      const nodeImage = this.element.querySelector('.node-image');
      if (nodeImage) {
        nodeImage.appendChild(progressContainer);
      }
    }
  }

  /**
   * Subscribe to generation progress updates
   */
  private subscribeToProgress(): void {
    if (!this._requestId) return;

    const requestId = this._requestId;

    useStore.subscribe(
      (state) => state.queue.find((q) => q.requestId === requestId),
      (queueItem) => {
        if (queueItem) {
          this.updateProgress(queueItem);
        }
      },
    );
  }

  /**
   * Update progress display
   */
  private updateProgress(queueItem: GenerationQueueItem): void {
    if (this._progressBar) {
      this._progressBar.style.width = `${queueItem.progress}%`;
    }

    if (this._statusText) {
      switch (queueItem.status) {
        case 'pending':
          this._statusText.textContent = 'Queued...';
          break;
        case 'processing':
          this._statusText.textContent = `Generating... ${queueItem.progress}%`;
          break;
        case 'completed':
          this._statusText.textContent = 'Complete!';
          break;
        case 'failed':
          this._statusText.textContent = 'Failed';
          this.element?.classList.add('generation-failed');
          break;
        default:
          this._statusText.textContent = 'Generating...';
      }
    }
  }

  /**
   * Convert ghost to regular node when generation completes
   */
  convertToNode(data: { image: string; prompt: string; badge?: ImageResolution }): void {
    useStore.getState().convertGhostToNode(this.nodeId, {
      image: data.image,
      prompt: data.prompt,
      badge: data.badge ?? '2K',
    });

    // Update content to reflect new state
    this.updateContent();
  }

  /**
   * Handle generation failure
   */
  handleFailure(error: string): void {
    if (this._statusText) {
      this._statusText.textContent = 'Failed';
    }
    this.element?.classList.add('generation-failed');
    this.element?.setAttribute('title', error);
  }
}
