/**
 * NodeSystem
 *
 * Orchestrates the node-based canvas system, coordinating between
 * ViewportManager, ConnectionManager, SelectionManager, and node entities.
 */

import { nodeFactory } from '../entities';

import { ConnectionManager } from './ConnectionManager';
import { SelectionManager } from './SelectionManager';
import { ViewportManager } from './ViewportManager';

import type { Node, Connection, NodeFactory } from '../entities';
import type { CreateNodeOptions } from '../entities';
import type { NodeConfig, Position, PortRef, NodeInteractionState, Bounds } from '@/types';

/**
 * Node system event types
 */
export type NodeSystemEvent =
  | 'node:created'
  | 'node:removed'
  | 'node:moved'
  | 'node:selected'
  | 'connection:created'
  | 'connection:removed'
  | 'viewport:changed';

/**
 * Event callback type
 */
export type NodeSystemEventCallback = (data: unknown) => void;

/**
 * NodeSystem class - main orchestrator
 */
export class NodeSystem {
  readonly viewport: ViewportManager;
  readonly connections: ConnectionManager;
  readonly selection: SelectionManager;

  private _nodes = new Map<string, Node>();
  private _factory: NodeFactory;
  private _containerElement: HTMLElement | null = null;
  private _nodesContainer: HTMLElement | null = null;
  private _eventListeners = new Map<NodeSystemEvent, Set<NodeSystemEventCallback>>();

  constructor(factory: NodeFactory = nodeFactory) {
    this._factory = factory;
    this.viewport = new ViewportManager();
    this.connections = new ConnectionManager();
    this.selection = new SelectionManager();

    // Wire up selection change to connection highlighting
    this.selection.onSelectionChange((selectedIds) => {
      this.connections.highlightConnectionsForNodes(new Set(selectedIds));
      this.emit('node:selected', { selectedIds });
    });
  }

  /**
   * Initialize the node system with DOM elements
   */
  init(container: HTMLElement, nodesContainer: HTMLElement, svgLayer: SVGSVGElement): void {
    this._containerElement = container;
    this._nodesContainer = nodesContainer;

    this.viewport.init(container);
    this.connections.init(svgLayer);
  }

  /**
   * Get all nodes
   */
  get nodes(): Node[] {
    return Array.from(this._nodes.values());
  }

  /**
   * Get node count
   */
  get nodeCount(): number {
    return this._nodes.size;
  }

  /**
   * Get node by ID
   */
  getNode(id: string): Node | undefined {
    return this._nodes.get(id);
  }

  /**
   * Get selected nodes
   */
  getSelectedNodes(): Node[] {
    return this.selection.selectedIds
      .map((id) => this._nodes.get(id))
      .filter((node): node is Node => node !== undefined);
  }

  // ===========================================================================
  // NODE CREATION
  // ===========================================================================

  /**
   * Create a new node
   */
  createNode(options: CreateNodeOptions = {}): Node {
    const node = this._factory.createNode(options);
    this._nodes.set(node.id, node);

    // Add to DOM
    if (this._nodesContainer) {
      const element = node.createElement();
      this._nodesContainer.appendChild(element);
    }

    this.emit('node:created', { node });
    return node;
  }

  /**
   * Create a ghost (loading) node
   */
  createGhostNode(position: Position): Node {
    const node = this._factory.createGhostNode(position);
    this._nodes.set(node.id, node);

    if (this._nodesContainer) {
      const element = node.createElement();
      this._nodesContainer.appendChild(element);
    }

    this.emit('node:created', { node, isGhost: true });
    return node;
  }

  /**
   * Create node from configuration
   */
  createNodeFromConfig(config: NodeConfig): Node {
    const node = this._factory.createFromConfig(config);
    this._nodes.set(node.id, node);

    if (this._nodesContainer) {
      const element = node.createElement();
      this._nodesContainer.appendChild(element);
    }

    this.emit('node:created', { node });
    return node;
  }

  // ===========================================================================
  // NODE REMOVAL
  // ===========================================================================

  /**
   * Remove a node
   */
  removeNode(nodeId: string): boolean {
    const node = this._nodes.get(nodeId);
    if (!node) return false;

    // Remove connections
    this.connections.removeConnectionsForNode(nodeId);

    // Remove from selection
    this.selection.removeFromSelection(nodeId);

    // Remove from DOM
    node.removeElement();

    // Remove from map
    this._nodes.delete(nodeId);

    this.emit('node:removed', { nodeId });
    return true;
  }

  /**
   * Remove selected nodes
   */
  removeSelectedNodes(): string[] {
    const removedIds: string[] = [];

    for (const nodeId of this.selection.selectedIds) {
      if (this.removeNode(nodeId)) {
        removedIds.push(nodeId);
      }
    }

    return removedIds;
  }

  /**
   * Clear all nodes
   */
  clearNodes(): void {
    for (const node of this._nodes.values()) {
      node.removeElement();
    }
    this._nodes.clear();
    this.connections.clear();
    this.selection.clearSelection();
  }

  // ===========================================================================
  // NODE MOVEMENT
  // ===========================================================================

  /**
   * Move a node to a position
   */
  moveNode(nodeId: string, position: Position): void {
    const node = this._nodes.get(nodeId);
    if (!node) return;

    node.position = position;
    this.updateConnectionsForNode(nodeId);
    this.emit('node:moved', { nodeId, position });
  }

  /**
   * Move selected nodes by delta
   */
  moveSelectedNodes(delta: Position): void {
    for (const nodeId of this.selection.selectedIds) {
      const node = this._nodes.get(nodeId);
      if (node) {
        node.position = {
          x: node.position.x + delta.x,
          y: node.position.y + delta.y,
        };
      }
    }

    // Update connections for all selected nodes
    this.updateConnectionsForSelectedNodes();
  }

  /**
   * Set interaction state for a node
   */
  setNodeInteraction(nodeId: string, state: NodeInteractionState): void {
    const node = this._nodes.get(nodeId);
    if (node) {
      node.interaction = state;
    }
  }

  // ===========================================================================
  // CONNECTIONS
  // ===========================================================================

  /**
   * Create connection between nodes
   */
  createConnection(sourceNodeId: string, targetNodeId: string): Connection | null {
    const sourceNode = this._nodes.get(sourceNodeId);
    const targetNode = this._nodes.get(targetNodeId);

    if (!sourceNode?.outputPort || !targetNode) return null;

    const source: PortRef = {
      nodeId: sourceNodeId,
      portId: sourceNode.outputPort.id,
      direction: 'output',
    };

    const target: PortRef = {
      nodeId: targetNodeId,
      portId: targetNode.inputPort.id,
      direction: 'input',
    };

    const connection = this.connections.createConnection(source, target);

    if (connection) {
      // Register connection with ports
      sourceNode.outputPort.addConnection(connection.id);
      targetNode.inputPort.addConnection(connection.id);

      // Update path positions
      this.updateConnectionPositions(connection);

      this.emit('connection:created', { connection });
    }

    return connection;
  }

  /**
   * Remove connection
   */
  removeConnection(connectionId: string): boolean {
    const connection = this.connections.getConnection(connectionId);
    if (!connection) return false;

    // Remove from ports
    const sourceNode = this._nodes.get(connection.source.nodeId);
    const targetNode = this._nodes.get(connection.target.nodeId);

    sourceNode?.outputPort?.removeConnection(connectionId);
    targetNode?.inputPort.removeConnection(connectionId);

    const removed = this.connections.removeConnection(connectionId);

    if (removed) {
      this.emit('connection:removed', { connectionId });
    }

    return removed;
  }

  /**
   * Update connections for a specific node
   */
  updateConnectionsForNode(nodeId: string): void {
    this.connections.updateConnectionsForNode(nodeId, (nId, pId) => {
      return this.getPortPosition(nId, pId);
    });
  }

  /**
   * Update connections for selected nodes
   */
  updateConnectionsForSelectedNodes(): void {
    for (const nodeId of this.selection.selectedIds) {
      this.updateConnectionsForNode(nodeId);
    }
  }

  /**
   * Update all connection positions
   */
  updateAllConnections(): void {
    this.connections.updateConnectionPositions((nodeId, portId) => {
      return this.getPortPosition(nodeId, portId);
    });
  }

  /**
   * Update positions for a single connection
   */
  private updateConnectionPositions(connection: Connection): void {
    const sourcePos = this.getPortPosition(connection.source.nodeId, connection.source.portId);
    const targetPos = this.getPortPosition(connection.target.nodeId, connection.target.portId);

    if (sourcePos && targetPos) {
      connection.updatePositions(sourcePos, targetPos);
    }
  }

  /**
   * Get port position
   */
  getPortPosition(nodeId: string, portId: string): Position | null {
    const node = this._nodes.get(nodeId);
    if (!node) return null;

    const port = node.getPort(portId);
    return port?.position ?? null;
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  /**
   * Add event listener
   */
  on(event: NodeSystemEvent, callback: NodeSystemEventCallback): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event: NodeSystemEvent, callback: NodeSystemEventCallback): void {
    this._eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: NodeSystemEvent, data: unknown): void {
    this._eventListeners.get(event)?.forEach((callback) => callback(data));
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Update port positions for all nodes
   */
  updateAllPortPositions(): void {
    if (!this._containerElement) return;
    const rect = this._containerElement.getBoundingClientRect();

    for (const node of this._nodes.values()) {
      node.updatePortPositions(rect);
    }
  }

  /**
   * Get bounding box of all nodes
   */
  getContentBounds(): Bounds | null {
    if (this._nodes.size === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of this._nodes.values()) {
      const pos = node.position;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      // Assume node width ~200, height ~250 for bounds
      maxX = Math.max(maxX, pos.x + 200);
      maxY = Math.max(maxY, pos.y + 250);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Fit all content to viewport
   */
  fitToContent(padding = 50): void {
    const bounds = this.getContentBounds();
    if (bounds) {
      this.viewport.fitToContent(bounds, padding);
    }
  }

  /**
   * Reset the entire system
   */
  reset(): void {
    this.clearNodes();
    this.viewport.reset();
    this._factory.resetCounter();
  }
}

/**
 * Create a singleton instance
 */
export const nodeSystem = new NodeSystem();
