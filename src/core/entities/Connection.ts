/**
 * Connection Entity
 *
 * Represents a wire connection between two ports.
 */

import type {
  WireConfig,
  Wire,
  WireState,
  WireStyle,
  PortRef,
  Position,
  BezierControlPoints,
} from '@/types';

/**
 * Default wire style
 */
const DEFAULT_WIRE_STYLE: WireStyle = 'bezier';

/**
 * Default control offset factor for bezier curves
 */
const DEFAULT_CONTROL_OFFSET_FACTOR = 0.5;
const MIN_CONTROL_OFFSET = 50;

/**
 * Connection class representing a wire between two nodes
 */
export class Connection {
  readonly config: WireConfig;

  private _state: WireState = 'idle';
  private _pathData = '';
  private _sourcePosition: Position = { x: 0, y: 0 };
  private _targetPosition: Position = { x: 0, y: 0 };
  private _element: SVGPathElement | null = null;

  constructor(id: string, source: PortRef, target: PortRef, style: WireStyle = DEFAULT_WIRE_STYLE) {
    this.config = {
      id,
      source,
      target,
      style,
    };
  }

  /**
   * Get the connection ID
   */
  get id(): string {
    return this.config.id;
  }

  /**
   * Get source port reference
   */
  get source(): PortRef {
    return this.config.source;
  }

  /**
   * Get target port reference
   */
  get target(): PortRef {
    return this.config.target;
  }

  /**
   * Get current wire state
   */
  get state(): WireState {
    return this._state;
  }

  /**
   * Set wire state
   */
  set state(value: WireState) {
    this._state = value;
    this.updateElementState();
  }

  /**
   * Get the SVG path data
   */
  get pathData(): string {
    return this._pathData;
  }

  /**
   * Get source position
   */
  get sourcePosition(): Position {
    return { ...this._sourcePosition };
  }

  /**
   * Get target position
   */
  get targetPosition(): Position {
    return { ...this._targetPosition };
  }

  /**
   * Get the SVG path element
   */
  get element(): SVGPathElement | null {
    return this._element;
  }

  /**
   * Set the SVG path element
   */
  set element(el: SVGPathElement | null) {
    this._element = el;
    this.updateElementState();
  }

  /**
   * Get wire as Wire state object
   */
  getWireState(): Wire {
    return {
      config: { ...this.config },
      state: this._state,
      pathData: this._pathData,
      sourcePosition: this.sourcePosition,
      targetPosition: this.targetPosition,
    };
  }

  /**
   * Update positions and recalculate path
   */
  updatePositions(sourcePos: Position, targetPos: Position): void {
    this._sourcePosition = { ...sourcePos };
    this._targetPosition = { ...targetPos };
    this.calculatePath();
  }

  /**
   * Calculate the SVG path based on style
   */
  private calculatePath(): void {
    switch (this.config.style) {
      case 'straight':
        this._pathData = this.calculateStraightPath();
        break;
      case 'step':
        this._pathData = this.calculateStepPath();
        break;
      case 'bezier':
      default:
        this._pathData = this.calculateBezierPath();
        break;
    }

    if (this._element) {
      this._element.setAttribute('d', this._pathData);
    }
  }

  /**
   * Calculate bezier curve path (default)
   */
  private calculateBezierPath(): string {
    const { x: startX, y: startY } = this._sourcePosition;
    const { x: endX, y: endY } = this._targetPosition;

    const controlPoints = this.calculateBezierControlPoints();

    return `M ${startX} ${startY} C ${controlPoints.controlPoint1.x} ${controlPoints.controlPoint1.y}, ${controlPoints.controlPoint2.x} ${controlPoints.controlPoint2.y}, ${endX} ${endY}`;
  }

  /**
   * Calculate bezier control points
   */
  private calculateBezierControlPoints(): BezierControlPoints {
    const start = this._sourcePosition;
    const end = this._targetPosition;

    const dist = Math.abs(end.y - start.y);
    const controlOffset = Math.max(dist * DEFAULT_CONTROL_OFFSET_FACTOR, MIN_CONTROL_OFFSET);

    return {
      start,
      controlPoint1: { x: start.x, y: start.y + controlOffset },
      controlPoint2: { x: end.x, y: end.y - controlOffset },
      end,
    };
  }

  /**
   * Calculate straight line path
   */
  private calculateStraightPath(): string {
    const { x: startX, y: startY } = this._sourcePosition;
    const { x: endX, y: endY } = this._targetPosition;

    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  /**
   * Calculate step path (orthogonal lines)
   */
  private calculateStepPath(): string {
    const { x: startX, y: startY } = this._sourcePosition;
    const { x: endX, y: endY } = this._targetPosition;

    const midY = (startY + endY) / 2;

    return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
  }

  /**
   * Update element classes based on state
   */
  private updateElementState(): void {
    if (!this._element) return;

    // Remove all state classes
    this._element.classList.remove('active', 'highlighted', 'invalid', 'pending');

    // Add current state class
    if (this._state !== 'idle') {
      this._element.classList.add(this._state);
    }
  }

  /**
   * Check if connection involves a specific node
   */
  involvesNode(nodeId: string): boolean {
    return this.config.source.nodeId === nodeId || this.config.target.nodeId === nodeId;
  }

  /**
   * Check if connection involves a specific port
   */
  involvesPort(nodeId: string, portId: string): boolean {
    return (
      (this.config.source.nodeId === nodeId && this.config.source.portId === portId) ||
      (this.config.target.nodeId === nodeId && this.config.target.portId === portId)
    );
  }

  /**
   * Create SVG path element
   */
  createElement(): SVGPathElement {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('wire');
    path.setAttribute('d', this._pathData);
    this._element = path;
    this.updateElementState();
    return path;
  }

  /**
   * Remove element from DOM
   */
  removeElement(): void {
    if (this._element?.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
    this._element = null;
  }
}
