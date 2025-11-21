/**
 * Wire Component
 *
 * SVG path representing a connection between two nodes.
 * Renders as a bezier curve between output and input ports.
 */

import { generateId } from '@/utils/id';

import { Component } from '../shared/Component';

import type { Position } from '@/types';

export interface WireProps {
  wireId: string;
  startPosition: Position;
  endPosition: Position;
  isActive?: boolean;
  isPending?: boolean;
  isInvalid?: boolean;
}

/**
 * Wire component for node connections
 */
export class Wire extends Component {
  readonly id: string;

  private _wireId: string;
  private _path: SVGPathElement | null = null;
  private _startPosition: Position;
  private _endPosition: Position;
  private _isActive: boolean;
  private _isPending: boolean;
  private _isInvalid: boolean;

  constructor(props: WireProps) {
    super();
    this.id = generateId('wire-comp');
    this._wireId = props.wireId;
    this._startPosition = props.startPosition;
    this._endPosition = props.endPosition;
    this._isActive = props.isActive ?? false;
    this._isPending = props.isPending ?? false;
    this._isInvalid = props.isInvalid ?? false;
  }

  /**
   * Get the wire ID
   */
  get wireId(): string {
    return this._wireId;
  }

  /**
   * Get the SVG path element
   */
  get path(): SVGPathElement | null {
    return this._path;
  }

  /**
   * Render the wire (SVG path)
   */
  protected render(): HTMLElement {
    // Create SVG path element
    this._path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this._path.id = this._wireId;
    this._path.classList.add('wire');

    // Apply state classes
    if (this._isActive) this._path.classList.add('active');
    if (this._isPending) this._path.classList.add('pending');
    if (this._isInvalid) this._path.classList.add('invalid');

    // Set initial path
    this.updatePath();

    // Return a wrapper div (but the path is what we use)
    const wrapper = document.createElement('div');
    wrapper.style.display = 'none';
    return wrapper;
  }

  /**
   * Get the SVG path for use in canvas
   */
  getPathElement(): SVGPathElement {
    if (!this._path) {
      this.render();
    }
    // Path is guaranteed to exist after render()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._path!;
  }

  /**
   * Update wire positions
   */
  updatePositions(start: Position, end: Position): void {
    this._startPosition = start;
    this._endPosition = end;
    this.updatePath();
  }

  /**
   * Update the bezier curve path
   */
  private updatePath(): void {
    if (!this._path) return;

    const pathD = this.calculateBezierPath(this._startPosition, this._endPosition);
    this._path.setAttribute('d', pathD);
  }

  /**
   * Calculate bezier curve path between two points
   */
  private calculateBezierPath(start: Position, end: Position): string {
    // Control point offset (more offset for longer distances)
    const dx = Math.abs(end.x - start.x);
    const offset = Math.min(dx / 2, 100);

    // For vertical connections (output to input), use vertical bezier
    const cp1x = start.x;
    const cp1y = start.y + offset;
    const cp2x = end.x;
    const cp2y = end.y - offset;

    return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
  }

  /**
   * Set active state
   */
  setActive(active: boolean): void {
    this._isActive = active;
    this._path?.classList.toggle('active', active);
  }

  /**
   * Set pending state
   */
  setPending(pending: boolean): void {
    this._isPending = pending;
    this._path?.classList.toggle('pending', pending);
  }

  /**
   * Set invalid state
   */
  setInvalid(invalid: boolean): void {
    this._isInvalid = invalid;
    this._path?.classList.toggle('invalid', invalid);
  }

  /**
   * Cleanup
   */
  protected onDestroy(): void {
    this._path?.remove();
    this._path = null;
  }
}

/**
 * Create a temporary wire for drag connection preview
 */
export function createPendingWire(startPosition: Position): Wire {
  return new Wire({
    wireId: generateId('pending-wire'),
    startPosition,
    endPosition: startPosition,
    isPending: true,
  });
}
