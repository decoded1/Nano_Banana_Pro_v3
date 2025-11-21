/**
 * Nodes Slice
 *
 * State management for canvas nodes.
 * Handles node CRUD operations, position updates, and genealogy.
 */

import { generateId } from '@/utils/id';

import type {
  NodeConfig,
  NodeState,
  NodeSelectionState,
  NodeInteractionState,
  Position,
  NodeType,
  ImageResolution,
} from '@/types';
import type { StateCreator } from 'zustand';

// =============================================================================
// SLICE STATE
// =============================================================================

export interface NodesSliceState {
  /** All nodes indexed by ID */
  nodes: Record<string, NodeState>;
  /** Order of nodes (for z-index) */
  nodeOrder: string[];
  /** Next z-index to assign */
  nextZIndex: number;
}

// =============================================================================
// SLICE ACTIONS
// =============================================================================

export interface NodesSliceActions {
  // CRUD Operations
  addNode: (config: Partial<NodeConfig> & { position: Position }) => string;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<NodeConfig>) => void;

  // Position
  setNodePosition: (nodeId: string, position: Position) => void;
  moveNodes: (nodeIds: string[], delta: Position) => void;

  // Selection state
  setNodeSelection: (nodeId: string, state: NodeSelectionState) => void;
  setNodeInteraction: (nodeId: string, state: NodeInteractionState) => void;

  // Visibility
  setNodeVisibility: (nodeId: string, visible: boolean) => void;
  updateVisibleNodes: (visibleIds: string[]) => void;

  // Z-index
  bringToFront: (nodeId: string) => void;
  sendToBack: (nodeId: string) => void;

  // Ghost nodes (loading placeholders)
  addGhostNode: (position: Position, parentId?: string) => string;
  convertGhostToNode: (
    ghostId: string,
    data: { image: string; prompt: string; badge?: ImageResolution },
  ) => void;

  // Genealogy
  getNodeChildren: (nodeId: string) => string[];
  getNodeLineage: (nodeId: string) => string[];

  // Bulk operations
  clearAllNodes: () => void;
  removeNodes: (nodeIds: string[]) => void;
}

export type NodesSlice = NodesSliceState & NodesSliceActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: NodesSliceState = {
  nodes: {},
  nodeOrder: [],
  nextZIndex: 1,
};

// =============================================================================
// SLICE CREATOR
// =============================================================================

export const createNodesSlice: StateCreator<NodesSlice, [], [], NodesSlice> = (set, get) => ({
  ...initialState,

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  addNode: (config) => {
    const id = config.id ?? generateId('node');
    const now = Date.now();

    const nodeConfig: NodeConfig = {
      id,
      title: config.title ?? '',
      prompt: config.prompt ?? '',
      image: config.image,
      badge: config.badge,
      isGhost: config.isGhost ?? false,
      position: config.position,
      type: config.type ?? 'generation',
      parentId: config.parentId,
      seed: config.seed,
      createdAt: config.createdAt ?? now,
    };

    const nodeState: NodeState = {
      config: nodeConfig,
      position: config.position,
      selection: 'none',
      interaction: 'idle',
      isVisible: true,
      zIndex: get().nextZIndex,
    };

    set((state) => ({
      nodes: { ...state.nodes, [id]: nodeState },
      nodeOrder: [...state.nodeOrder, id],
      nextZIndex: state.nextZIndex + 1,
    }));

    return id;
  },

  removeNode: (nodeId) => {
    set((state) => {
      const { [nodeId]: _, ...remainingNodes } = state.nodes;
      return {
        nodes: remainingNodes,
        nodeOrder: state.nodeOrder.filter((id) => id !== nodeId),
      };
    });
  },

  updateNode: (nodeId, updates) => {
    set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return state;

      return {
        nodes: {
          ...state.nodes,
          [nodeId]: {
            ...node,
            config: { ...node.config, ...updates },
          },
        },
      };
    });
  },

  // ---------------------------------------------------------------------------
  // Position
  // ---------------------------------------------------------------------------

  setNodePosition: (nodeId, position) => {
    set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return state;

      return {
        nodes: {
          ...state.nodes,
          [nodeId]: { ...node, position },
        },
      };
    });
  },

  moveNodes: (nodeIds, delta) => {
    set((state) => {
      const updatedNodes = { ...state.nodes };

      for (const nodeId of nodeIds) {
        const node = updatedNodes[nodeId];
        if (node) {
          updatedNodes[nodeId] = {
            ...node,
            position: {
              x: node.position.x + delta.x,
              y: node.position.y + delta.y,
            },
          };
        }
      }

      return { nodes: updatedNodes };
    });
  },

  // ---------------------------------------------------------------------------
  // Selection & Interaction
  // ---------------------------------------------------------------------------

  setNodeSelection: (nodeId, selection) => {
    set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return state;

      return {
        nodes: {
          ...state.nodes,
          [nodeId]: { ...node, selection },
        },
      };
    });
  },

  setNodeInteraction: (nodeId, interaction) => {
    set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return state;

      return {
        nodes: {
          ...state.nodes,
          [nodeId]: { ...node, interaction },
        },
      };
    });
  },

  // ---------------------------------------------------------------------------
  // Visibility
  // ---------------------------------------------------------------------------

  setNodeVisibility: (nodeId, isVisible) => {
    set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return state;

      return {
        nodes: {
          ...state.nodes,
          [nodeId]: { ...node, isVisible },
        },
      };
    });
  },

  updateVisibleNodes: (visibleIds) => {
    set((state) => {
      const visibleSet = new Set(visibleIds);
      const updatedNodes = { ...state.nodes };

      for (const nodeId of Object.keys(updatedNodes)) {
        const node = updatedNodes[nodeId];
        if (node) {
          const shouldBeVisible = visibleSet.has(nodeId);
          if (node.isVisible !== shouldBeVisible) {
            updatedNodes[nodeId] = { ...node, isVisible: shouldBeVisible };
          }
        }
      }

      return { nodes: updatedNodes };
    });
  },

  // ---------------------------------------------------------------------------
  // Z-index
  // ---------------------------------------------------------------------------

  bringToFront: (nodeId) => {
    set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return state;

      return {
        nodes: {
          ...state.nodes,
          [nodeId]: { ...node, zIndex: state.nextZIndex },
        },
        nextZIndex: state.nextZIndex + 1,
      };
    });
  },

  sendToBack: (nodeId) => {
    set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return state;

      // Find minimum z-index and set below it
      let minZ = Infinity;
      const nodeValues = Object.values(state.nodes);
      for (const n of nodeValues) {
        if (n.zIndex < minZ) minZ = n.zIndex;
      }

      return {
        nodes: {
          ...state.nodes,
          [nodeId]: { ...node, zIndex: minZ - 1 },
        },
      };
    });
  },

  // ---------------------------------------------------------------------------
  // Ghost Nodes
  // ---------------------------------------------------------------------------

  addGhostNode: (position, parentId) => {
    const id = generateId('ghost');
    const nodeConfig: NodeConfig = {
      id,
      position,
      isGhost: true,
      type: 'ghost' as NodeType,
      parentId,
      createdAt: Date.now(),
    };

    const nodeState: NodeState = {
      config: nodeConfig,
      position,
      selection: 'none',
      interaction: 'idle',
      isVisible: true,
      zIndex: get().nextZIndex,
    };

    set((state) => ({
      nodes: { ...state.nodes, [id]: nodeState },
      nodeOrder: [...state.nodeOrder, id],
      nextZIndex: state.nextZIndex + 1,
    }));

    return id;
  },

  convertGhostToNode: (ghostId, data) => {
    set((state) => {
      const ghost = state.nodes[ghostId];
      if (!ghost || !ghost.config.isGhost) return state;

      const updatedConfig: NodeConfig = {
        ...ghost.config,
        image: data.image,
        prompt: data.prompt,
        badge: data.badge ?? '2K',
        isGhost: false,
        type: ghost.config.parentId ? 'edit' : 'generation',
      };

      return {
        nodes: {
          ...state.nodes,
          [ghostId]: {
            ...ghost,
            config: updatedConfig,
          },
        },
      };
    });
  },

  // ---------------------------------------------------------------------------
  // Genealogy
  // ---------------------------------------------------------------------------

  getNodeChildren: (nodeId) => {
    const state = get();
    return Object.values(state.nodes)
      .filter((node) => node.config.parentId === nodeId)
      .map((node) => node.config.id);
  },

  getNodeLineage: (nodeId) => {
    const state = get();
    const lineage: string[] = [];
    let currentId: string | undefined = nodeId;

    while (currentId) {
      lineage.unshift(currentId);
      const nodeState: NodeState | undefined = state.nodes[currentId];
      currentId = nodeState?.config.parentId;
    }

    return lineage;
  },

  // ---------------------------------------------------------------------------
  // Bulk Operations
  // ---------------------------------------------------------------------------

  clearAllNodes: () => {
    set(initialState);
  },

  removeNodes: (nodeIds) => {
    set((state) => {
      const nodeIdsSet = new Set(nodeIds);
      const remainingNodes: Record<string, NodeState> = {};

      for (const [id, node] of Object.entries(state.nodes)) {
        if (!nodeIdsSet.has(id)) {
          remainingNodes[id] = node;
        }
      }

      return {
        nodes: remainingNodes,
        nodeOrder: state.nodeOrder.filter((id) => !nodeIdsSet.has(id)),
      };
    });
  },
});
