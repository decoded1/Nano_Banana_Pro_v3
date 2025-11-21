/**
 * Port Entity
 *
 * Represents a connection point on a node (input or output).
 */

import type { PortConfig, PortState, PortDirection, PortDataType, Position } from '@/types';

/**
 * Default port configuration
 */
const DEFAULT_PORT_CONFIG: Partial<PortConfig> = {
  dataType: 'image',
  maxConnections: null,
};

/**
 * Port class representing a connection point on a node
 */
export class Port {
  readonly config: PortConfig;
  readonly nodeId: string;

  private _position: Position = { x: 0, y: 0 };
  private _connectedWireIds = new Set<string>();
  private _isHovered = false;
  private _element: HTMLElement | null = null;

  constructor(
    nodeId: string,
    id: string,
    direction: PortDirection,
    options: Partial<PortConfig> = {},
  ) {
    this.nodeId = nodeId;
    this.config = {
      id,
      direction,
      ...DEFAULT_PORT_CONFIG,
      ...options,
    } as PortConfig;
  }

  /**
   * Get the port's unique identifier (combines node and port IDs)
   */
  get id(): string {
    return this.config.id;
  }

  /**
   * Get the port direction
   */
  get direction(): PortDirection {
    return this.config.direction;
  }

  /**
   * Get the port data type
   */
  get dataType(): PortDataType {
    return this.config.dataType;
  }

  /**
   * Get current position in world coordinates
   */
  get position(): Position {
    return { ...this._position };
  }

  /**
   * Set position (called when node moves or viewport updates)
   */
  set position(pos: Position) {
    this._position = { ...pos };
  }

  /**
   * Get connected wire IDs
   */
  get connectedWireIds(): string[] {
    return Array.from(this._connectedWireIds);
  }

  /**
   * Check if port is hovered
   */
  get isHovered(): boolean {
    return this._isHovered;
  }

  /**
   * Set hover state
   */
  set isHovered(value: boolean) {
    this._isHovered = value;
  }

  /**
   * Get the DOM element for this port
   */
  get element(): HTMLElement | null {
    return this._element;
  }

  /**
   * Set the DOM element for this port
   */
  set element(el: HTMLElement | null) {
    this._element = el;
  }

  /**
   * Check if port can accept a new connection
   */
  get canConnect(): boolean {
    const max = this.config.maxConnections;
    if (max === null || max === undefined) {
      return true;
    }
    return this._connectedWireIds.size < max;
  }

  /**
   * Get the current state as a PortState object
   */
  getState(): PortState {
    return {
      config: { ...this.config },
      nodeId: this.nodeId,
      position: this.position,
      connectedWireIds: this.connectedWireIds,
      isHovered: this._isHovered,
      canConnect: this.canConnect,
    };
  }

  /**
   * Add a connection to this port
   */
  addConnection(wireId: string): boolean {
    if (!this.canConnect) {
      return false;
    }
    this._connectedWireIds.add(wireId);
    return true;
  }

  /**
   * Remove a connection from this port
   */
  removeConnection(wireId: string): boolean {
    return this._connectedWireIds.delete(wireId);
  }

  /**
   * Check if port has a specific connection
   */
  hasConnection(wireId: string): boolean {
    return this._connectedWireIds.has(wireId);
  }

  /**
   * Get connection count
   */
  get connectionCount(): number {
    return this._connectedWireIds.size;
  }

  /**
   * Clear all connections
   */
  clearConnections(): void {
    this._connectedWireIds.clear();
  }

  /**
   * Update position from DOM element
   */
  updatePositionFromElement(workspaceRect: DOMRect): void {
    if (!this._element) return;

    const rect = this._element.getBoundingClientRect();
    this._position = {
      x: rect.left + rect.width / 2 - workspaceRect.left,
      y: rect.top + rect.height / 2 - workspaceRect.top,
    };
  }
}
