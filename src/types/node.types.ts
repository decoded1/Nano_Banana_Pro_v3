/**
 * Node Type Definitions
 *
 * Types for image generation nodes on the infinite canvas.
 * Each node represents a generation or edit step in the workflow.
 */

// =============================================================================
// POSITION & GEOMETRY
// =============================================================================

/**
 * 2D position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Size dimensions
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Bounding box (position + size)
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// =============================================================================
// NODE CONFIGURATION
// =============================================================================

/**
 * Image resolution badge options
 */
export type ImageResolution = '1K' | '2K' | '4K';

/**
 * Node type variants
 */
export type NodeType = 'generation' | 'edit' | 'variation' | 'ghost';

/**
 * Configuration for creating a new node
 */
export interface NodeConfig {
  /** Unique identifier */
  id: string;
  /** Node display title */
  title?: string | undefined;
  /** Generation prompt text */
  prompt?: string | undefined;
  /** Image URL or data URL */
  image?: string | undefined;
  /** Resolution badge (1K, 2K, 4K) */
  badge?: ImageResolution | undefined;
  /** Whether this is a loading placeholder */
  isGhost?: boolean | undefined;
  /** Initial position on canvas */
  position: Position;
  /** Node type classification */
  type?: NodeType | undefined;
  /** Parent node ID (for genealogy) */
  parentId?: string | undefined;
  /** Generation seed (if applicable) */
  seed?: number | undefined;
  /** Timestamp of creation */
  createdAt?: number | undefined;
}

// =============================================================================
// NODE STATE
// =============================================================================

/**
 * Node selection state
 */
export type NodeSelectionState = 'none' | 'selected' | 'multi-selected';

/**
 * Node interaction state
 */
export type NodeInteractionState = 'idle' | 'dragging' | 'connecting' | 'editing';

/**
 * Runtime state of a node
 */
export interface NodeState {
  /** Node configuration */
  config: NodeConfig;
  /** Current position (may differ from config during drag) */
  position: Position;
  /** Selection state */
  selection: NodeSelectionState;
  /** Interaction state */
  interaction: NodeInteractionState;
  /** Whether node is currently visible in viewport */
  isVisible: boolean;
  /** Z-index for layering */
  zIndex: number;
}

// =============================================================================
// NODE COLLECTIONS
// =============================================================================

/**
 * Map of node IDs to node states
 */
export type NodeMap = Map<string, NodeState>;

/**
 * Array of node IDs (for ordering, selection, etc.)
 */
export type NodeIdList = string[];

/**
 * Node lookup by ID
 */
export type NodeLookup = Record<string, NodeState>;
