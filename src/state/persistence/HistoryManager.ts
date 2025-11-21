/**
 * History Manager
 *
 * Manages undo/redo functionality using a command-based history stack.
 * Tracks state snapshots for reversible operations.
 */

import { useStore } from '../store';

import type { NodeState, Position, Transform } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

/** Types of actions that can be undone/redone */
export type HistoryActionType =
  | 'node_add'
  | 'node_remove'
  | 'node_update'
  | 'node_move'
  | 'nodes_move'
  | 'node_delete_batch'
  | 'canvas_transform'
  | 'selection_change';

/** Base history entry */
export interface HistoryEntry {
  /** Unique entry ID */
  id: number;
  /** Action type */
  type: HistoryActionType;
  /** Timestamp */
  timestamp: number;
  /** Human-readable description */
  description: string;
  /** Data needed to undo the action */
  undoData: unknown;
  /** Data needed to redo the action */
  redoData: unknown;
}

/** Node add action */
export interface NodeAddEntry extends HistoryEntry {
  type: 'node_add';
  undoData: { nodeId: string };
  redoData: { node: NodeState };
}

/** Node remove action */
export interface NodeRemoveEntry extends HistoryEntry {
  type: 'node_remove';
  undoData: { node: NodeState; index: number };
  redoData: { nodeId: string };
}

/** Node update action */
export interface NodeUpdateEntry extends HistoryEntry {
  type: 'node_update';
  undoData: { nodeId: string; oldConfig: Partial<NodeState['config']> };
  redoData: { nodeId: string; newConfig: Partial<NodeState['config']> };
}

/** Node move action */
export interface NodeMoveEntry extends HistoryEntry {
  type: 'node_move';
  undoData: { nodeId: string; oldPosition: Position };
  redoData: { nodeId: string; newPosition: Position };
}

/** Multiple nodes move action */
export interface NodesMoveEntry extends HistoryEntry {
  type: 'nodes_move';
  undoData: { positions: Record<string, Position> };
  redoData: { positions: Record<string, Position> };
}

/** Batch node delete action */
export interface NodeDeleteBatchEntry extends HistoryEntry {
  type: 'node_delete_batch';
  undoData: { nodes: { node: NodeState; index: number }[] };
  redoData: { nodeIds: string[] };
}

/** Canvas transform action */
export interface CanvasTransformEntry extends HistoryEntry {
  type: 'canvas_transform';
  undoData: { transform: Transform };
  redoData: { transform: Transform };
}

/** Configuration for history manager */
export interface HistoryManagerConfig {
  /** Maximum number of history entries to keep */
  maxEntries: number;
  /** Whether to group rapid changes */
  groupingEnabled: boolean;
  /** Time window for grouping (ms) */
  groupingWindow: number;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: HistoryManagerConfig = {
  maxEntries: 100,
  groupingEnabled: true,
  groupingWindow: 500, // 500ms
};

// =============================================================================
// HISTORY MANAGER CLASS
// =============================================================================

/**
 * Manages undo/redo history
 */
export class HistoryManager {
  private config: HistoryManagerConfig;
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private nextId = 1;
  private isUndoing = false;
  private isRedoing = false;
  private lastEntryTime = 0;

  constructor(config: Partial<HistoryManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Record a new action in history
   */
  record<T extends HistoryEntry>(
    type: T['type'],
    description: string,
    undoData: T['undoData'],
    redoData: T['redoData'],
  ): void {
    // Don't record during undo/redo
    if (this.isUndoing || this.isRedoing) {
      return;
    }

    const now = Date.now();

    // Check if we should group with previous entry
    if (
      this.config.groupingEnabled &&
      this.undoStack.length > 0 &&
      now - this.lastEntryTime < this.config.groupingWindow
    ) {
      const lastEntry = this.undoStack[this.undoStack.length - 1];
      if (lastEntry && lastEntry.type === type && this.canGroup(lastEntry, type, undoData)) {
        // Update existing entry instead of creating new one
        this.updateLastEntry(lastEntry, type, redoData);
        this.lastEntryTime = now;
        return;
      }
    }

    const entry: HistoryEntry = {
      id: this.nextId++,
      type,
      timestamp: now,
      description,
      undoData,
      redoData,
    };

    this.undoStack.push(entry);
    this.lastEntryTime = now;

    // Clear redo stack on new action
    this.redoStack = [];

    // Trim history if needed
    while (this.undoStack.length > this.config.maxEntries) {
      this.undoStack.shift();
    }

    if (import.meta.env.DEV) {
      console.log(`[HistoryManager] Recorded: ${description}`);
    }
  }

  /**
   * Undo the last action
   */
  undo(): boolean {
    const entry = this.undoStack.pop();
    if (!entry) {
      return false;
    }

    this.isUndoing = true;

    try {
      this.applyUndo(entry);
      this.redoStack.push(entry);

      if (import.meta.env.DEV) {
        console.log(`[HistoryManager] Undo: ${entry.description}`);
      }

      return true;
    } finally {
      this.isUndoing = false;
    }
  }

  /**
   * Redo the last undone action
   */
  redo(): boolean {
    const entry = this.redoStack.pop();
    if (!entry) {
      return false;
    }

    this.isRedoing = true;

    try {
      this.applyRedo(entry);
      this.undoStack.push(entry);

      if (import.meta.env.DEV) {
        console.log(`[HistoryManager] Redo: ${entry.description}`);
      }

      return true;
    } finally {
      this.isRedoing = false;
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get undo stack length
   */
  get undoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get redo stack length
   */
  get redoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Get the last entry description (for UI)
   */
  getUndoDescription(): string | null {
    const entry = this.undoStack[this.undoStack.length - 1];
    return entry ? entry.description : null;
  }

  /**
   * Get the next redo description (for UI)
   */
  getRedoDescription(): string | null {
    const entry = this.redoStack[this.redoStack.length - 1];
    return entry ? entry.description : null;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.nextId = 1;

    if (import.meta.env.DEV) {
      console.log('[HistoryManager] History cleared');
    }
  }

  // ---------------------------------------------------------------------------
  // Apply Undo/Redo
  // ---------------------------------------------------------------------------

  /**
   * Apply an undo action
   */
  private applyUndo(entry: HistoryEntry): void {
    const state = useStore.getState();

    switch (entry.type) {
      case 'node_add': {
        const data = entry.undoData as NodeAddEntry['undoData'];
        state.removeNode(data.nodeId);
        break;
      }

      case 'node_remove': {
        const data = entry.undoData as NodeRemoveEntry['undoData'];
        // Re-add node with original state
        useStore.setState((current) => ({
          nodes: { ...current.nodes, [data.node.config.id]: data.node },
          nodeOrder: [
            ...current.nodeOrder.slice(0, data.index),
            data.node.config.id,
            ...current.nodeOrder.slice(data.index),
          ],
        }));
        break;
      }

      case 'node_update': {
        const data = entry.undoData as NodeUpdateEntry['undoData'];
        state.updateNode(data.nodeId, data.oldConfig);
        break;
      }

      case 'node_move': {
        const data = entry.undoData as NodeMoveEntry['undoData'];
        state.setNodePosition(data.nodeId, data.oldPosition);
        break;
      }

      case 'nodes_move': {
        const data = entry.undoData as NodesMoveEntry['undoData'];
        useStore.setState((current) => {
          const updatedNodes = { ...current.nodes };
          for (const [nodeId, position] of Object.entries(data.positions)) {
            const node = updatedNodes[nodeId];
            if (node) {
              updatedNodes[nodeId] = { ...node, position };
            }
          }
          return { nodes: updatedNodes };
        });
        break;
      }

      case 'node_delete_batch': {
        const data = entry.undoData as NodeDeleteBatchEntry['undoData'];
        // Restore all nodes
        useStore.setState((current) => {
          const newNodes = { ...current.nodes };
          const newOrder = [...current.nodeOrder];

          for (const { node, index } of data.nodes) {
            newNodes[node.config.id] = node;
            newOrder.splice(index, 0, node.config.id);
          }

          return { nodes: newNodes, nodeOrder: newOrder };
        });
        break;
      }

      case 'canvas_transform': {
        const data = entry.undoData as CanvasTransformEntry['undoData'];
        state.setTransform(data.transform);
        break;
      }
    }
  }

  /**
   * Apply a redo action
   */
  private applyRedo(entry: HistoryEntry): void {
    const state = useStore.getState();

    switch (entry.type) {
      case 'node_add': {
        const data = entry.redoData as NodeAddEntry['redoData'];
        useStore.setState((current) => ({
          nodes: { ...current.nodes, [data.node.config.id]: data.node },
          nodeOrder: [...current.nodeOrder, data.node.config.id],
        }));
        break;
      }

      case 'node_remove': {
        const data = entry.redoData as NodeRemoveEntry['redoData'];
        state.removeNode(data.nodeId);
        break;
      }

      case 'node_update': {
        const data = entry.redoData as NodeUpdateEntry['redoData'];
        state.updateNode(data.nodeId, data.newConfig);
        break;
      }

      case 'node_move': {
        const data = entry.redoData as NodeMoveEntry['redoData'];
        state.setNodePosition(data.nodeId, data.newPosition);
        break;
      }

      case 'nodes_move': {
        const data = entry.redoData as NodesMoveEntry['redoData'];
        useStore.setState((current) => {
          const updatedNodes = { ...current.nodes };
          for (const [nodeId, position] of Object.entries(data.positions)) {
            const node = updatedNodes[nodeId];
            if (node) {
              updatedNodes[nodeId] = { ...node, position };
            }
          }
          return { nodes: updatedNodes };
        });
        break;
      }

      case 'node_delete_batch': {
        const data = entry.redoData as NodeDeleteBatchEntry['redoData'];
        state.removeNodes(data.nodeIds);
        break;
      }

      case 'canvas_transform': {
        const data = entry.redoData as CanvasTransformEntry['redoData'];
        state.setTransform(data.transform);
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Grouping
  // ---------------------------------------------------------------------------

  /**
   * Check if we can group with the last entry
   */
  private canGroup(lastEntry: HistoryEntry, type: HistoryActionType, undoData: unknown): boolean {
    switch (type) {
      case 'node_move': {
        const lastData = lastEntry.undoData as NodeMoveEntry['undoData'];
        const newData = undoData as NodeMoveEntry['undoData'];
        return lastData.nodeId === newData.nodeId;
      }

      case 'nodes_move': {
        const lastData = lastEntry.undoData as NodesMoveEntry['undoData'];
        const newData = undoData as NodesMoveEntry['undoData'];
        const lastIds = Object.keys(lastData.positions).sort().join(',');
        const newIds = Object.keys(newData.positions).sort().join(',');
        return lastIds === newIds;
      }

      case 'node_update': {
        const lastData = lastEntry.undoData as NodeUpdateEntry['undoData'];
        const newData = undoData as NodeUpdateEntry['undoData'];
        return lastData.nodeId === newData.nodeId;
      }

      case 'canvas_transform':
        return true; // Always group transform changes

      default:
        return false;
    }
  }

  /**
   * Update the last entry with new redo data
   */
  private updateLastEntry(
    lastEntry: HistoryEntry,
    type: HistoryActionType,
    redoData: unknown,
  ): void {
    switch (type) {
      case 'node_move': {
        const entry = lastEntry as NodeMoveEntry;
        entry.redoData = redoData as NodeMoveEntry['redoData'];
        break;
      }

      case 'nodes_move': {
        const entry = lastEntry as NodesMoveEntry;
        entry.redoData = redoData as NodesMoveEntry['redoData'];
        break;
      }

      case 'node_update': {
        const entry = lastEntry as NodeUpdateEntry;
        entry.redoData = redoData as NodeUpdateEntry['redoData'];
        break;
      }

      case 'canvas_transform': {
        const entry = lastEntry as CanvasTransformEntry;
        entry.redoData = redoData as CanvasTransformEntry['redoData'];
        break;
      }
    }

    lastEntry.timestamp = Date.now();
  }

  // ---------------------------------------------------------------------------
  // Recording Helpers
  // ---------------------------------------------------------------------------

  /**
   * Record a node addition
   */
  recordNodeAdd(node: NodeState): void {
    this.record<NodeAddEntry>('node_add', `Add node`, { nodeId: node.config.id }, { node });
  }

  /**
   * Record a node removal
   */
  recordNodeRemove(node: NodeState, index: number): void {
    this.record<NodeRemoveEntry>(
      'node_remove',
      `Delete node`,
      { node, index },
      { nodeId: node.config.id },
    );
  }

  /**
   * Record a node update
   */
  recordNodeUpdate(
    nodeId: string,
    oldConfig: Partial<NodeState['config']>,
    newConfig: Partial<NodeState['config']>,
  ): void {
    this.record<NodeUpdateEntry>(
      'node_update',
      `Update node`,
      { nodeId, oldConfig },
      { nodeId, newConfig },
    );
  }

  /**
   * Record a node move
   */
  recordNodeMove(nodeId: string, oldPosition: Position, newPosition: Position): void {
    this.record<NodeMoveEntry>(
      'node_move',
      `Move node`,
      { nodeId, oldPosition },
      { nodeId, newPosition },
    );
  }

  /**
   * Record multiple nodes move
   */
  recordNodesMove(
    oldPositions: Record<string, Position>,
    newPositions: Record<string, Position>,
  ): void {
    const count = Object.keys(oldPositions).length;
    this.record<NodesMoveEntry>(
      'nodes_move',
      `Move ${count} nodes`,
      { positions: oldPositions },
      { positions: newPositions },
    );
  }

  /**
   * Record batch node deletion
   */
  recordNodesDelete(nodes: { node: NodeState; index: number }[]): void {
    this.record<NodeDeleteBatchEntry>(
      'node_delete_batch',
      `Delete ${nodes.length} nodes`,
      { nodes },
      { nodeIds: nodes.map((n) => n.node.config.id) },
    );
  }

  /**
   * Record a canvas transform change
   */
  recordTransformChange(oldTransform: Transform, newTransform: Transform): void {
    this.record<CanvasTransformEntry>(
      'canvas_transform',
      `Pan/Zoom`,
      { transform: oldTransform },
      { transform: newTransform },
    );
  }

  /**
   * Check if currently performing undo/redo
   */
  get isApplyingHistory(): boolean {
    return this.isUndoing || this.isRedoing;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let historyInstance: HistoryManager | null = null;

/**
 * Get the history manager instance
 */
export function getHistoryManager(config?: Partial<HistoryManagerConfig>): HistoryManager {
  if (!historyInstance) {
    historyInstance = new HistoryManager(config);
  }
  return historyInstance;
}

/**
 * Clear the history manager instance
 */
export function clearHistoryManager(): void {
  historyInstance?.clear();
  historyInstance = null;
}

export default HistoryManager;
