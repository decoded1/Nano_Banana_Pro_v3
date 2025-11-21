/**
 * Project Manager
 *
 * Manages project persistence - saving, loading, and auto-save functionality.
 * Connects Zustand store to IndexedDB storage.
 */

import { generateId } from '@/utils/id';

import { useStore } from '../store';

import { initStorage, type StorageAdapter } from './StorageAdapter';

import type { NodeState, Transform, GenerationConfig } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface Project {
  /** Unique project ID */
  id: string;
  /** Project display name */
  name: string;
  /** Project description */
  description?: string | undefined;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Project thumbnail (data URL) */
  thumbnail?: string | undefined;
  /** Project data */
  data: ProjectData;
}

export interface ProjectData {
  /** All nodes */
  nodes: Record<string, NodeState>;
  /** Node order for z-index */
  nodeOrder: string[];
  /** Next z-index */
  nextZIndex: number;
  /** Canvas transform */
  transform: Transform;
  /** Generation config */
  generationConfig: GenerationConfig;
}

export interface ProjectSummary {
  /** Project ID */
  id: string;
  /** Project name */
  name: string;
  /** Project description */
  description?: string | undefined;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Project thumbnail */
  thumbnail?: string | undefined;
  /** Node count */
  nodeCount: number;
}

export interface ProjectManagerConfig {
  /** Auto-save interval in ms (0 to disable) */
  autoSaveInterval: number;
  /** Debounce delay for state changes (ms) */
  saveDebounce: number;
  /** Maximum number of recent projects to keep */
  maxRecentProjects: number;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: ProjectManagerConfig = {
  autoSaveInterval: 30000, // 30 seconds
  saveDebounce: 2000, // 2 seconds
  maxRecentProjects: 10,
};

// =============================================================================
// PROJECT MANAGER CLASS
// =============================================================================

/**
 * Manages project persistence and auto-save
 */
export class ProjectManager {
  private config: ProjectManagerConfig;
  private storage: StorageAdapter | null = null;
  private currentProjectId: string | null = null;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void) | null = null;
  private isDirty = false;
  private isInitialized = false;

  constructor(config: Partial<ProjectManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Initialize the project manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Initialize storage
    this.storage = await initStorage();

    // Start auto-save if configured
    if (this.config.autoSaveInterval > 0) {
      this.startAutoSave();
    }

    // Subscribe to state changes for dirty tracking
    this.subscribeToChanges();

    this.isInitialized = true;

    if (import.meta.env.DEV) {
      console.log('[ProjectManager] Initialized');
    }
  }

  /**
   * Cleanup and stop the project manager
   */
  cleanup(): void {
    this.stopAutoSave();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.isInitialized = false;

    if (import.meta.env.DEV) {
      console.log('[ProjectManager] Cleaned up');
    }
  }

  /**
   * Check if initialized
   */
  get ready(): boolean {
    return this.isInitialized && this.storage !== null;
  }

  // ---------------------------------------------------------------------------
  // Project CRUD
  // ---------------------------------------------------------------------------

  /**
   * Create a new project from current state
   */
  async createProject(name: string, description?: string): Promise<string> {
    const storage = this.ensureInitialized();

    const state = useStore.getState();
    const now = Date.now();
    const id = generateId('project');

    const project: Project = {
      id,
      name,
      description,
      createdAt: now,
      updatedAt: now,
      thumbnail: this.generateThumbnail(),
      data: this.extractProjectData(state),
    };

    await storage.put('projects', project);
    this.currentProjectId = id;
    this.isDirty = false;

    // Update project info in UI
    state.setProjectInfo({ id, name });

    if (import.meta.env.DEV) {
      console.log(`[ProjectManager] Created project: ${name}`);
    }

    return id;
  }

  /**
   * Save current state to existing project
   */
  async saveProject(projectId?: string): Promise<void> {
    const storage = this.ensureInitialized();

    const id = projectId ?? this.currentProjectId;
    if (!id) {
      throw new Error('No project ID provided and no current project');
    }

    const existing = await storage.get<Project>('projects', id);
    if (!existing) {
      throw new Error(`Project not found: ${id}`);
    }

    const state = useStore.getState();
    const project: Project = {
      ...existing,
      updatedAt: Date.now(),
      thumbnail: this.generateThumbnail(),
      data: this.extractProjectData(state),
    };

    await storage.put('projects', project);
    this.isDirty = false;

    // Show success toast
    state.showToast('success', 'Project saved');

    if (import.meta.env.DEV) {
      console.log(`[ProjectManager] Saved project: ${existing.name}`);
    }
  }

  /**
   * Load a project into state
   */
  async loadProject(projectId: string): Promise<void> {
    const storage = this.ensureInitialized();

    const project = await storage.get<Project>('projects', projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Apply project data to state
    this.applyProjectData(project.data);
    this.currentProjectId = projectId;
    this.isDirty = false;

    // Update project info in UI
    const state = useStore.getState();
    state.setProjectInfo({ id: projectId, name: project.name });
    state.showToast('info', `Loaded: ${project.name}`);

    if (import.meta.env.DEV) {
      console.log(`[ProjectManager] Loaded project: ${project.name}`);
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    const storage = this.ensureInitialized();

    await storage.delete('projects', projectId);

    // Clear current if deleted
    if (this.currentProjectId === projectId) {
      this.currentProjectId = null;
      useStore.getState().setProjectInfo(null);
    }

    if (import.meta.env.DEV) {
      console.log(`[ProjectManager] Deleted project: ${projectId}`);
    }
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string): Promise<Project | undefined> {
    const storage = this.ensureInitialized();
    return storage.get<Project>('projects', projectId);
  }

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<Project[]> {
    const storage = this.ensureInitialized();
    return storage.getAll<Project>('projects');
  }

  /**
   * Get project summaries (lightweight list)
   */
  async getProjectSummaries(): Promise<ProjectSummary[]> {
    const projects = await this.getAllProjects();

    return projects
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        thumbnail: p.thumbnail,
        nodeCount: Object.keys(p.data.nodes).length,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // ---------------------------------------------------------------------------
  // Auto-Save
  // ---------------------------------------------------------------------------

  /**
   * Start auto-save timer
   */
  startAutoSave(): void {
    if (this.autoSaveTimer) return;

    this.autoSaveTimer = setInterval(() => {
      if (this.currentProjectId && this.isDirty) {
        this.saveProject().catch((error) => {
          console.error('[ProjectManager] Auto-save failed:', error);
        });
      }
    }, this.config.autoSaveInterval);

    if (import.meta.env.DEV) {
      console.log('[ProjectManager] Auto-save started');
    }
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
  }

  /**
   * Subscribe to state changes for dirty tracking
   */
  private subscribeToChanges(): void {
    // Track nodes changes
    this.unsubscribe = useStore.subscribe(
      (state) => ({
        nodes: state.nodes,
        transform: state.transform,
        defaultConfig: state.defaultConfig,
      }),
      () => {
        this.markDirty();
      },
    );
  }

  /**
   * Mark project as dirty (unsaved changes)
   */
  private markDirty(): void {
    if (!this.currentProjectId) return;

    this.isDirty = true;

    // Debounced auto-save
    if (this.config.saveDebounce > 0) {
      if (this.saveDebounceTimer) {
        clearTimeout(this.saveDebounceTimer);
      }
      this.saveDebounceTimer = setTimeout(() => {
        if (this.currentProjectId && this.isDirty) {
          this.saveProject().catch((error) => {
            console.error('[ProjectManager] Debounced save failed:', error);
          });
        }
      }, this.config.saveDebounce);
    }
  }

  // ---------------------------------------------------------------------------
  // State Extraction / Application
  // ---------------------------------------------------------------------------

  /**
   * Extract project data from current state
   */
  private extractProjectData(state: ReturnType<typeof useStore.getState>): ProjectData {
    return {
      nodes: state.nodes,
      nodeOrder: state.nodeOrder,
      nextZIndex: state.nextZIndex,
      transform: state.transform,
      generationConfig: state.defaultConfig,
    };
  }

  /**
   * Apply project data to state
   */
  private applyProjectData(data: ProjectData): void {
    // Clear current state and apply new data
    useStore.setState({
      nodes: data.nodes,
      nodeOrder: data.nodeOrder,
      nextZIndex: data.nextZIndex,
      transform: data.transform,
      defaultConfig: data.generationConfig,
      // Reset selection
      selectedIds: [],
      isBoxSelecting: false,
      boxStart: null,
      boxCurrent: null,
    });
  }

  /**
   * Generate a thumbnail from current canvas state
   */
  private generateThumbnail(): string | undefined {
    const state = useStore.getState();
    const nodes = Object.values(state.nodes);

    // Find first node with an image
    for (const node of nodes) {
      if (node.config.image) {
        // Return a smaller version or just the reference
        return node.config.image;
      }
    }

    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /**
   * Ensure manager is initialized and return storage
   */
  private ensureInitialized(): StorageAdapter {
    if (!this.isInitialized || !this.storage) {
      throw new Error('ProjectManager not initialized. Call initialize() first.');
    }
    return this.storage;
  }

  /**
   * Get current project ID
   */
  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.isDirty;
  }

  /**
   * Create new empty project (clears canvas)
   */
  newProject(): void {
    const state = useStore.getState();

    // Clear all nodes
    state.clearAllNodes();

    // Reset canvas
    useStore.setState({
      transform: { offset: { x: 0, y: 0 }, scale: 1 },
      selectedIds: [],
    });

    // Clear current project
    this.currentProjectId = null;
    this.isDirty = false;

    state.setProjectInfo(null);
    state.showToast('info', 'New project created');

    if (import.meta.env.DEV) {
      console.log('[ProjectManager] Created new project');
    }
  }

  /**
   * Duplicate a project
   */
  async duplicateProject(projectId: string, newName?: string): Promise<string> {
    const storage = this.ensureInitialized();

    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const now = Date.now();
    const id = generateId('project');
    const name = newName ?? `${project.name} (Copy)`;

    const newProject: Project = {
      ...project,
      id,
      name,
      createdAt: now,
      updatedAt: now,
    };

    await storage.put('projects', newProject);

    if (import.meta.env.DEV) {
      console.log(`[ProjectManager] Duplicated project: ${name}`);
    }

    return id;
  }

  /**
   * Rename a project
   */
  async renameProject(projectId: string, newName: string): Promise<void> {
    const storage = this.ensureInitialized();

    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    project.name = newName;
    project.updatedAt = Date.now();

    await storage.put('projects', project);

    // Update UI if current project
    if (this.currentProjectId === projectId) {
      useStore.getState().setProjectInfo({ id: projectId, name: newName });
    }

    if (import.meta.env.DEV) {
      console.log(`[ProjectManager] Renamed project to: ${newName}`);
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let managerInstance: ProjectManager | null = null;

/**
 * Get the project manager instance
 */
export function getProjectManager(config?: Partial<ProjectManagerConfig>): ProjectManager {
  if (!managerInstance) {
    managerInstance = new ProjectManager(config);
  }
  return managerInstance;
}

/**
 * Initialize and start the project manager
 */
export async function initProjectManager(
  config?: Partial<ProjectManagerConfig>,
): Promise<ProjectManager> {
  const manager = getProjectManager(config);
  await manager.initialize();
  return manager;
}

/**
 * Cleanup the project manager
 */
export function cleanupProjectManager(): void {
  managerInstance?.cleanup();
  managerInstance = null;
}

export default ProjectManager;
