/**
 * ConnectionManager
 *
 * Manages wire connections between nodes, including creation, validation,
 * path updates, and pending connection state.
 */

import { Connection } from '../entities';

import type {
  PortRef,
  PendingWire,
  WireState,
  WireStyle,
  ConnectionValidation,
  ConnectionRequest,
  Position,
} from '@/types';

/**
 * Default wire style
 */
const DEFAULT_WIRE_STYLE: WireStyle = 'bezier';

/**
 * Generate unique wire ID
 */
function generateWireId(): string {
  return `wire-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * ConnectionManager class
 */
export class ConnectionManager {
  private _connections = new Map<string, Connection>();
  private _pendingWire: PendingWire | null = null;
  private _svgElement: SVGSVGElement | null = null;

  /**
   * Initialize with SVG element for rendering
   */
  init(svgElement: SVGSVGElement): void {
    this._svgElement = svgElement;
  }

  /**
   * Get all connections
   */
  get connections(): Connection[] {
    return Array.from(this._connections.values());
  }

  /**
   * Get connection by ID
   */
  getConnection(id: string): Connection | undefined {
    return this._connections.get(id);
  }

  /**
   * Get pending wire state
   */
  get pendingWire(): PendingWire | null {
    return this._pendingWire;
  }

  /**
   * Check if there's an active pending connection
   */
  get isConnecting(): boolean {
    return this._pendingWire !== null;
  }

  // ===========================================================================
  // CONNECTION CREATION
  // ===========================================================================

  /**
   * Create a new connection
   */
  createConnection(
    source: PortRef,
    target: PortRef,
    style: WireStyle = DEFAULT_WIRE_STYLE,
  ): Connection | null {
    // Validate connection
    const validation = this.validateConnection({ source, target });
    if (!validation.isValid) {
      return null;
    }

    // Check for existing connection
    const existing = this.findConnection(source, target);
    if (existing) {
      return existing;
    }

    const id = generateWireId();
    const connection = new Connection(id, source, target, style);

    this._connections.set(id, connection);

    // Create and append SVG element
    if (this._svgElement) {
      const pathElement = connection.createElement();
      this._svgElement.appendChild(pathElement);
    }

    return connection;
  }

  /**
   * Remove a connection
   */
  removeConnection(id: string): boolean {
    const connection = this._connections.get(id);
    if (!connection) return false;

    connection.removeElement();
    return this._connections.delete(id);
  }

  /**
   * Remove all connections for a node
   */
  removeConnectionsForNode(nodeId: string): Connection[] {
    const removed: Connection[] = [];

    for (const connection of this._connections.values()) {
      if (connection.involvesNode(nodeId)) {
        connection.removeElement();
        this._connections.delete(connection.id);
        removed.push(connection);
      }
    }

    return removed;
  }

  /**
   * Remove all connections for a port
   */
  removeConnectionsForPort(nodeId: string, portId: string): Connection[] {
    const removed: Connection[] = [];

    for (const connection of this._connections.values()) {
      if (connection.involvesPort(nodeId, portId)) {
        connection.removeElement();
        this._connections.delete(connection.id);
        removed.push(connection);
      }
    }

    return removed;
  }

  // ===========================================================================
  // PENDING CONNECTIONS (DRAG TO CONNECT)
  // ===========================================================================

  /**
   * Start a pending connection from a port
   */
  startPendingConnection(source: PortRef, startPosition: Position): void {
    this._pendingWire = {
      source,
      currentPosition: { ...startPosition },
      validTargets: [],
      pathData: '',
    };

    this.updatePendingWirePath();

    // Create temporary SVG path for preview
    if (this._svgElement) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.classList.add('wire', 'pending');
      path.id = 'pending-wire';
      path.setAttribute('d', this._pendingWire.pathData);
      this._svgElement.appendChild(path);
    }
  }

  /**
   * Update pending connection position
   */
  updatePendingConnection(position: Position): void {
    if (!this._pendingWire) return;

    this._pendingWire.currentPosition = { ...position };
    this.updatePendingWirePath();

    // Update SVG path
    const path = this._svgElement?.getElementById('pending-wire');
    if (path) {
      path.setAttribute('d', this._pendingWire.pathData);
    }
  }

  /**
   * Complete pending connection to a target port
   */
  completePendingConnection(target: PortRef): Connection | null {
    if (!this._pendingWire) return null;

    const connection = this.createConnection(this._pendingWire.source, target);
    this.cancelPendingConnection();

    return connection;
  }

  /**
   * Cancel pending connection
   */
  cancelPendingConnection(): void {
    // Remove preview path
    const path = this._svgElement?.getElementById('pending-wire');
    if (path) {
      path.remove();
    }

    this._pendingWire = null;
  }

  /**
   * Set valid drop targets for pending connection
   */
  setValidTargets(targets: PortRef[]): void {
    if (this._pendingWire) {
      this._pendingWire.validTargets = targets;
    }
  }

  // ===========================================================================
  // VALIDATION
  // ===========================================================================

  /**
   * Validate a connection request
   */
  validateConnection(request: ConnectionRequest): ConnectionValidation {
    const { source, target } = request;

    // Can't connect to same node
    if (source.nodeId === target.nodeId) {
      return {
        isValid: false,
        errorMessage: 'Cannot connect a node to itself',
      };
    }

    // Must connect output to input
    if (source.direction !== 'output' || target.direction !== 'input') {
      return {
        isValid: false,
        errorMessage: 'Must connect output to input',
      };
    }

    // Check for duplicate connection
    if (this.findConnection(source, target)) {
      return {
        isValid: false,
        errorMessage: 'Connection already exists',
      };
    }

    return { isValid: true };
  }

  /**
   * Find existing connection between two ports
   */
  findConnection(source: PortRef, target: PortRef): Connection | undefined {
    for (const connection of this._connections.values()) {
      if (
        connection.source.nodeId === source.nodeId &&
        connection.source.portId === source.portId &&
        connection.target.nodeId === target.nodeId &&
        connection.target.portId === target.portId
      ) {
        return connection;
      }
    }
    return undefined;
  }

  /**
   * Get connections for a specific node
   */
  getConnectionsForNode(nodeId: string): Connection[] {
    return this.connections.filter((c) => c.involvesNode(nodeId));
  }

  // ===========================================================================
  // POSITION UPDATES
  // ===========================================================================

  /**
   * Update connection positions from port positions
   */
  updateConnectionPositions(
    getPortPosition: (nodeId: string, portId: string) => Position | null,
  ): void {
    for (const connection of this._connections.values()) {
      const sourcePos = getPortPosition(connection.source.nodeId, connection.source.portId);
      const targetPos = getPortPosition(connection.target.nodeId, connection.target.portId);

      if (sourcePos && targetPos) {
        connection.updatePositions(sourcePos, targetPos);
      }
    }
  }

  /**
   * Update connections for a specific node
   */
  updateConnectionsForNode(
    nodeId: string,
    getPortPosition: (nodeId: string, portId: string) => Position | null,
  ): void {
    for (const connection of this._connections.values()) {
      if (connection.involvesNode(nodeId)) {
        const sourcePos = getPortPosition(connection.source.nodeId, connection.source.portId);
        const targetPos = getPortPosition(connection.target.nodeId, connection.target.portId);

        if (sourcePos && targetPos) {
          connection.updatePositions(sourcePos, targetPos);
        }
      }
    }
  }

  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================

  /**
   * Set state for a connection
   */
  setConnectionState(id: string, state: WireState): void {
    const connection = this._connections.get(id);
    if (connection) {
      connection.state = state;
    }
  }

  /**
   * Highlight connections for selected nodes
   */
  highlightConnectionsForNodes(nodeIds: Set<string>): void {
    for (const connection of this._connections.values()) {
      const isConnected =
        nodeIds.has(connection.source.nodeId) || nodeIds.has(connection.target.nodeId);
      connection.state = isConnected ? 'active' : 'idle';
    }
  }

  /**
   * Clear all connection states
   */
  clearConnectionStates(): void {
    for (const connection of this._connections.values()) {
      connection.state = 'idle';
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Update pending wire path data
   */
  private updatePendingWirePath(): void {
    if (!this._pendingWire) return;

    // Simple bezier curve for pending wire
    // Source position would be provided by the port
    const start = this._pendingWire.currentPosition;
    const end = this._pendingWire.currentPosition;

    const dist = Math.abs(end.y - start.y);
    const controlOffset = Math.max(dist * 0.5, 50);

    this._pendingWire.pathData = `M ${start.x} ${start.y} C ${start.x} ${start.y + controlOffset}, ${end.x} ${end.y - controlOffset}, ${end.x} ${end.y}`;
  }

  /**
   * Clear all connections
   */
  clear(): void {
    for (const connection of this._connections.values()) {
      connection.removeElement();
    }
    this._connections.clear();
    this.cancelPendingConnection();
  }

  /**
   * Get connection count
   */
  get connectionCount(): number {
    return this._connections.size;
  }
}
