/**
 * Persistence - Barrel Export
 *
 * Exports all persistence-related functionality:
 * - StorageAdapter: IndexedDB abstraction
 * - ProjectManager: Project save/load
 * - HistoryManager: Undo/redo
 */

// Storage Adapter
export { StorageAdapter, getStorageAdapter, initStorage, closeStorage } from './StorageAdapter';

export type { StorageConfig, StoreDefinition, IndexDefinition } from './StorageAdapter';

// Project Manager
export {
  ProjectManager,
  getProjectManager,
  initProjectManager,
  cleanupProjectManager,
} from './ProjectManager';

export type { Project, ProjectData, ProjectSummary, ProjectManagerConfig } from './ProjectManager';

// History Manager
export { HistoryManager, getHistoryManager, clearHistoryManager } from './HistoryManager';

export type {
  HistoryActionType,
  HistoryEntry,
  HistoryManagerConfig,
  NodeAddEntry,
  NodeRemoveEntry,
  NodeUpdateEntry,
  NodeMoveEntry,
  NodesMoveEntry,
  NodeDeleteBatchEntry,
  CanvasTransformEntry,
} from './HistoryManager';
