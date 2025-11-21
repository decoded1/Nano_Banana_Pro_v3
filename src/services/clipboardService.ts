/**
 * Clipboard Service
 *
 * Manages copy, cut, and paste operations for nodes.
 * Stores copied node data in memory and handles paste positioning.
 */

import { eventBus, EVENTS } from '@/core/events';
import { useStore } from '@/state';
import { generateId } from '@/utils/id';

import type { NodeConfig, Position } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface ClipboardEntry {
  /** Original node configs */
  nodes: NodeConfig[];
  /** Relative positions from centroid */
  relativePositions: Position[];
  /** When the copy was made */
  timestamp: number;
}

// =============================================================================
// CLIPBOARD MANAGER CLASS
// =============================================================================

/**
 * Manages clipboard operations for nodes
 */
export class ClipboardManager {
  private clipboard: ClipboardEntry | null = null;
  private pasteOffset = 0;
  private isInitialized = false;

  /**
   * Initialize the clipboard manager
   */
  initialize(): void {
    if (this.isInitialized) return;

    this.subscribeToEvents();
    this.isInitialized = true;

    if (import.meta.env.DEV) {
      console.log('[ClipboardManager] Initialized');
    }
  }

  /**
   * Cleanup the clipboard manager
   */
  cleanup(): void {
    this.clipboard = null;
    this.isInitialized = false;
  }

  /**
   * Subscribe to clipboard events
   */
  private subscribeToEvents(): void {
    eventBus.on(EVENTS.CLIPBOARD.COPY, () => {
      this.copy();
    });

    eventBus.on(EVENTS.CLIPBOARD.CUT, () => {
      this.cut();
    });

    eventBus.on(EVENTS.CLIPBOARD.PASTE, (data?: { position?: Position | undefined }) => {
      this.paste(data?.position);
    });
  }

  /**
   * Copy selected nodes to clipboard
   */
  copy(): boolean {
    const state = useStore.getState();
    const selectedIds = state.selectedIds;

    if (selectedIds.length === 0) {
      return false;
    }

    // Get node configs for selected nodes (excluding ghost nodes)
    const nodes: NodeConfig[] = [];
    const positions: Position[] = [];

    for (const id of selectedIds) {
      const nodeState = state.nodes[id];
      if (nodeState && !nodeState.config.isGhost) {
        nodes.push({ ...nodeState.config });
        positions.push({ ...nodeState.position });
      }
    }

    if (nodes.length === 0) {
      return false;
    }

    // Calculate centroid
    const centroid = this.calculateCentroid(positions);

    // Store relative positions
    const relativePositions = positions.map((pos) => ({
      x: pos.x - centroid.x,
      y: pos.y - centroid.y,
    }));

    this.clipboard = {
      nodes,
      relativePositions,
      timestamp: Date.now(),
    };

    // Reset paste offset for new copy
    this.pasteOffset = 0;

    if (import.meta.env.DEV) {
      console.log(`[ClipboardManager] Copied ${nodes.length} node(s)`);
    }

    return true;
  }

  /**
   * Cut selected nodes (copy + delete)
   */
  cut(): boolean {
    const copied = this.copy();

    if (copied) {
      const state = useStore.getState();
      const selectedIds = [...state.selectedIds];

      // Remove the selected nodes
      state.removeNodes(selectedIds);
      state.clearSelection();

      if (import.meta.env.DEV) {
        console.log(`[ClipboardManager] Cut ${selectedIds.length} node(s)`);
      }
    }

    return copied;
  }

  /**
   * Paste nodes from clipboard
   */
  paste(position?: Position): boolean {
    if (!this.clipboard || this.clipboard.nodes.length === 0) {
      return false;
    }

    const state = useStore.getState();
    const newIds: string[] = [];

    // Determine paste position
    let pastePosition: Position;

    if (position) {
      // Paste at specified position (e.g., from context menu)
      pastePosition = position;
    } else {
      // Paste at center of viewport with offset
      const { viewportSize, transform } = state;
      const centerX = (viewportSize.width / 2 - transform.offset.x) / transform.scale;
      const centerY = (viewportSize.height / 2 - transform.offset.y) / transform.scale;

      // Add offset for each paste
      this.pasteOffset += 30;
      pastePosition = {
        x: centerX + this.pasteOffset,
        y: centerY + this.pasteOffset,
      };
    }

    // Create new nodes
    for (let i = 0; i < this.clipboard.nodes.length; i++) {
      const originalConfig = this.clipboard.nodes[i];
      const relativePos = this.clipboard.relativePositions[i];

      // Skip if data is missing
      if (!originalConfig || !relativePos) continue;

      const newPosition = {
        x: pastePosition.x + relativePos.x,
        y: pastePosition.y + relativePos.y,
      };

      const newId = state.addNode({
        ...originalConfig,
        id: generateId('node'),
        position: newPosition,
        // Reset parent reference since we're creating a copy
        parentId: undefined,
        createdAt: Date.now(),
      });

      newIds.push(newId);
    }

    // Select the pasted nodes
    if (newIds.length > 0) {
      state.selectNodes(newIds, false);
    }

    if (import.meta.env.DEV) {
      console.log(`[ClipboardManager] Pasted ${newIds.length} node(s)`);
    }

    return true;
  }

  /**
   * Check if clipboard has content
   */
  hasContent(): boolean {
    return this.clipboard !== null && this.clipboard.nodes.length > 0;
  }

  /**
   * Get clipboard content count
   */
  getContentCount(): number {
    return this.clipboard?.nodes.length ?? 0;
  }

  /**
   * Clear the clipboard
   */
  clear(): void {
    this.clipboard = null;
    this.pasteOffset = 0;
  }

  /**
   * Calculate centroid of positions
   */
  private calculateCentroid(positions: Position[]): Position {
    if (positions.length === 0) {
      return { x: 0, y: 0 };
    }

    let sumX = 0;
    let sumY = 0;

    for (const pos of positions) {
      sumX += pos.x;
      sumY += pos.y;
    }

    return {
      x: sumX / positions.length,
      y: sumY / positions.length,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clipboardInstance: ClipboardManager | null = null;

/**
 * Get the clipboard manager instance
 */
export function getClipboardManager(): ClipboardManager {
  if (!clipboardInstance) {
    clipboardInstance = new ClipboardManager();
  }
  return clipboardInstance;
}

/**
 * Initialize clipboard service
 */
export function initClipboardService(): ClipboardManager {
  const manager = getClipboardManager();
  manager.initialize();
  return manager;
}

/**
 * Cleanup clipboard service
 */
export function cleanupClipboardService(): void {
  clipboardInstance?.cleanup();
  clipboardInstance = null;
}

export default ClipboardManager;
