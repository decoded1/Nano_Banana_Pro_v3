/**
 * Connection Type Definitions
 *
 * Types for wires (connections) between nodes and their ports.
 * Connections form the genealogy tree of image generations.
 */

import type { Position } from './node.types';

// =============================================================================
// PORTS
// =============================================================================

/**
 * Port direction (input receives, output sends)
 */
export type PortDirection = 'input' | 'output';

/**
 * Port data type (for future extensibility)
 */
export type PortDataType = 'image' | 'reference' | 'style';

/**
 * Port configuration
 */
export interface PortConfig {
  /** Port identifier within node */
  id: string;
  /** Port direction */
  direction: PortDirection;
  /** Data type this port accepts/provides */
  dataType: PortDataType;
  /** Human-readable label */
  label?: string | undefined;
  /** Maximum connections (null = unlimited) */
  maxConnections?: number | null | undefined;
}

/**
 * Port runtime state
 */
export interface PortState {
  /** Port configuration */
  config: PortConfig;
  /** Parent node ID */
  nodeId: string;
  /** Current position in world coordinates */
  position: Position;
  /** Connected wire IDs */
  connectedWireIds: string[];
  /** Whether port is currently hovered */
  isHovered: boolean;
  /** Whether port can accept a new connection */
  canConnect: boolean;
}

/**
 * Port reference (for identifying a specific port)
 */
export interface PortRef {
  nodeId: string;
  portId: string;
  direction: PortDirection;
}

// =============================================================================
// WIRES (CONNECTIONS)
// =============================================================================

/**
 * Wire visual style
 */
export type WireStyle = 'bezier' | 'straight' | 'step';

/**
 * Wire state
 */
export type WireState = 'idle' | 'active' | 'highlighted' | 'invalid';

/**
 * Wire configuration
 */
export interface WireConfig {
  /** Unique wire identifier */
  id: string;
  /** Source port reference */
  source: PortRef;
  /** Target port reference */
  target: PortRef;
  /** Visual style */
  style?: WireStyle | undefined;
}

/**
 * Wire runtime state
 */
export interface Wire {
  /** Wire configuration */
  config: WireConfig;
  /** Current visual state */
  state: WireState;
  /** SVG path data */
  pathData: string;
  /** Source position (computed) */
  sourcePosition: Position;
  /** Target position (computed) */
  targetPosition: Position;
}

/**
 * Pending wire (during drag-to-connect)
 */
export interface PendingWire {
  /** Source port reference */
  source: PortRef;
  /** Current mouse position (target not yet determined) */
  currentPosition: Position;
  /** Valid drop targets */
  validTargets: PortRef[];
  /** SVG path data for preview */
  pathData: string;
}

// =============================================================================
// BEZIER CURVE UTILITIES
// =============================================================================

/**
 * Control points for bezier curve
 */
export interface BezierControlPoints {
  start: Position;
  controlPoint1: Position;
  controlPoint2: Position;
  end: Position;
}

/**
 * Wire path calculation options
 */
export interface WirePathOptions {
  /** Wire visual style */
  style: WireStyle;
  /** Control point offset factor */
  controlOffset: number;
  /** Minimum control offset distance */
  minControlOffset: number;
}

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

/**
 * Connection validation result
 */
export interface ConnectionValidation {
  /** Whether connection is valid */
  isValid: boolean;
  /** Error message if invalid */
  errorMessage?: string | undefined;
  /** Warning message (connection allowed but not recommended) */
  warningMessage?: string | undefined;
}

/**
 * Connection request (before validation)
 */
export interface ConnectionRequest {
  source: PortRef;
  target: PortRef;
}

/**
 * Map of wire IDs to wire states
 */
export type WireMap = Map<string, Wire>;

/**
 * Wire lookup by ID
 */
export type WireLookup = Record<string, Wire>;
