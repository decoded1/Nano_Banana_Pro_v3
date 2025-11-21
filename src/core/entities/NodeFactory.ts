/**
 * NodeFactory
 *
 * Factory for creating Node instances with sensible defaults.
 */

import { Node } from './Node';

import type { NodeConfig, Position, ImageResolution, NodeType } from '@/types';

/**
 * Default position for new nodes
 */
const DEFAULT_POSITION: Position = { x: 100, y: 100 };

/**
 * Resolution badge options
 */
const RESOLUTION_BADGES: ImageResolution[] = ['1K', '2K', '4K'];

/**
 * Node creation options (subset of NodeConfig)
 */
export interface CreateNodeOptions {
  position?: Position;
  title?: string;
  prompt?: string;
  image?: string;
  badge?: ImageResolution;
  isGhost?: boolean;
  type?: NodeType;
}

/**
 * Generate a unique node ID
 */
function generateNodeId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * NodeFactory class for creating nodes
 */
export class NodeFactory {
  private _nodeCounter = 0;

  /**
   * Create a new generation node
   */
  createNode(options: CreateNodeOptions = {}): Node {
    this._nodeCounter++;

    const config: NodeConfig = {
      id: generateNodeId(),
      position: options.position ?? { ...DEFAULT_POSITION },
      title: options.title ?? `Generation ${this._nodeCounter}`,
      prompt: options.prompt ?? '',
      image: options.image,
      badge: options.badge ?? ('2K' as ImageResolution),
      isGhost: options.isGhost ?? false,
      type: options.type ?? ('generation' as NodeType),
      createdAt: Date.now(),
    };

    return new Node(config);
  }

  /**
   * Create a ghost (loading) node
   */
  createGhostNode(position: Position): Node {
    return this.createNode({
      position,
      isGhost: true,
      title: 'Generating...',
    });
  }

  /**
   * Create a node from saved configuration
   */
  createFromConfig(config: NodeConfig): Node {
    return new Node(config);
  }

  /**
   * Create multiple nodes from configurations
   */
  createMultiple(configs: NodeConfig[]): Node[] {
    return configs.map((config) => this.createFromConfig(config));
  }

  /**
   * Create a node at a specific grid-snapped position
   */
  createAtGridPosition(gridX: number, gridY: number, gridSize = 20): Node {
    const position: Position = {
      x: gridX * gridSize,
      y: gridY * gridSize,
    };
    return this.createNode({ position });
  }

  /**
   * Create a node with a random resolution badge
   */
  createWithRandomBadge(options: Omit<CreateNodeOptions, 'badge'> = {}): Node {
    const index = Math.floor(Math.random() * RESOLUTION_BADGES.length);
    const badge = RESOLUTION_BADGES[index] ?? ('2K' as ImageResolution);
    return this.createNode({ ...options, badge });
  }

  /**
   * Get the current node count
   */
  get nodeCount(): number {
    return this._nodeCounter;
  }

  /**
   * Reset the node counter
   */
  resetCounter(): void {
    this._nodeCounter = 0;
  }
}

/**
 * Singleton factory instance
 */
export const nodeFactory = new NodeFactory();
