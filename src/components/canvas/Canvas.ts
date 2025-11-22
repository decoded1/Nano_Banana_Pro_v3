import { useStore, getStoreActions } from '../../state';
import { NodeCard } from '../nodes/NodeCard';
import './canvas.css';

export class Canvas {
  container: HTMLElement;
  transformLayer: HTMLElement;
  connectionsLayer: SVGSVGElement;
  nodesLayer: HTMLElement;

  // Cache for node instances
  nodeInstances: Map<string, NodeCard> = new Map();

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'canvas-container';

    // Create structure
    this.transformLayer = document.createElement('div');
    this.transformLayer.className = 'canvas-transform-layer';

    // SVG Layer for wires
    this.connectionsLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.connectionsLayer.classList.add('connections-layer');
    // SVG needs to be large to cover "infinite" canvas, or just 100% of transform layer?
    // Actually, if it's inside transform layer, it just needs to cover the coordinate space.
    // A common trick is to make it huge or dynamic.
    // For simplicity in this "infinite" implementation, we will rely on the transform layer
    // handling the coordinate system, but SVG inside a transformed div might clip if not careful.
    // Better approach: SVG is 100% of viewport, and we transform the paths?
    // Or SVG is inside transform layer and we give it overflow: visible.
    this.connectionsLayer.style.overflow = 'visible';

    this.nodesLayer = document.createElement('div');
    this.nodesLayer.className = 'nodes-layer';

    this.transformLayer.appendChild(this.connectionsLayer);
    this.transformLayer.appendChild(this.nodesLayer);
    this.container.appendChild(this.transformLayer);

    parent.appendChild(this.container);

    // Add background grid
    this.setupGrid();

    // Bind events
    this.bindEvents();

    // Subscribe to state
    this.subscribe();

    // Initial resize
    this.handleResize();
  }

  private setupGrid() {
    // Simple CSS radial/dot grid or just use the css background defined in main.css / canvas.css
    // We'll use a CSS pattern on the container if we want it fixed,
    // OR on a background layer that transforms if we want it to move.
    // To make it move with pan/zoom, we should apply background-position/size to a background element.
    // For now, let's stick to the 'showcase-bg' in main.css which is fixed (for atmosphere)
    // and add a moving grid.

    const grid = document.createElement('div');
    grid.className = 'canvas-grid';
    // We will update background-position in render
    this.container.insertBefore(grid, this.transformLayer);
    (this as any).gridElement = grid;
  }

  private bindEvents() {
    const { startPan, updatePan, endPan, zoomIn, zoomOut } = getStoreActions();

    // Pan
    this.container.addEventListener('pointerdown', (e) => {
      // Only pan if clicking on empty space (target is container or grid)
      if (e.target === this.container || e.target === (this as any).gridElement || e.target === this.transformLayer) {
        e.preventDefault(); // prevent text selection
        startPan({ x: e.clientX, y: e.clientY });
        this.container.setPointerCapture(e.pointerId);
      }
    });

    this.container.addEventListener('pointermove', (e) => {
      updatePan({ x: e.clientX, y: e.clientY });
    });

    this.container.addEventListener('pointerup', (e) => {
      endPan();
      this.container.releasePointerCapture(e.pointerId);
    });

    // Zoom (Wheel)
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const actions = getStoreActions();

      // Simple zoom logic
      if (e.deltaY < 0) {
        actions.zoomIn({ x: e.clientX, y: e.clientY });
      } else {
        actions.zoomOut({ x: e.clientX, y: e.clientY });
      }
    }, { passive: false });

    // Window Resize
    window.addEventListener('resize', () => this.handleResize());
  }

  private handleResize() {
    const rect = this.container.getBoundingClientRect();
    getStoreActions().setViewportSize({ width: rect.width, height: rect.height });
  }

  private subscribe() {
    // Subscribe to Transform changes
    useStore.subscribe(
      (state) => state.canvas.transform,
      (transform) => {
        this.updateTransform(transform);
      }
    );

    // Subscribe to Nodes changes
    useStore.subscribe(
      (state) => state.nodes,
      (nodes) => {
        this.updateNodes(nodes);
        this.updateConnections(); // Update wires when nodes change
      }
    );
  }

  private updateTransform(transform: { offset: { x: number, y: number }, scale: number }) {
    const { x, y } = transform.offset;
    const s = transform.scale;

    this.transformLayer.style.transform = `translate(${x}px, ${y}px) scale(${s})`;

    // Update Grid Background
    if ((this as any).gridElement) {
      const gridSize = 20 * s;
      const gridX = x % gridSize;
      const gridY = y % gridSize;

      (this as any).gridElement.style.backgroundSize = `${gridSize}px ${gridSize}px`;
      (this as any).gridElement.style.backgroundPosition = `${gridX}px ${gridY}px`;

      // Create dot pattern
      (this as any).gridElement.style.backgroundImage = `
        radial-gradient(circle, rgba(255,255,255,0.1) ${1 * s}px, transparent ${1 * s}px)
      `;
    }
  }

  private updateNodes(nodes: Record<string, any>) {
    const currentIds = new Set(Object.keys(nodes));

    // Remove deleted nodes
    for (const [id, instance] of this.nodeInstances) {
      if (!currentIds.has(id)) {
        instance.destroy();
        this.nodeInstances.delete(id);
      }
    }

    // Add/Update nodes
    for (const id of currentIds) {
      const nodeState = nodes[id];
      let instance = this.nodeInstances.get(id);

      if (!instance) {
        // Create new node
        instance = new NodeCard(id, nodeState.config);
        this.nodesLayer.appendChild(instance.element);
        this.nodeInstances.set(id, instance);
      } else {
        // Update existing
        instance.update(nodeState);
      }
    }
  }

  private updateConnections() {
    // Simple wire rendering
    // Clear existing wires
    this.connectionsLayer.innerHTML = '';

    const state = useStore.getState();
    const nodes = state.nodes;

    Object.values(nodes).forEach(node => {
      if (node.config.parentId && nodes[node.config.parentId]) {
        const parent = nodes[node.config.parentId];
        this.drawConnection(parent, node);
      }
    });
  }

  private drawConnection(source: any, target: any) {
    const startX = source.position.x + 120; // Approximate width/2
    const startY = source.position.y + (source.config.isGhost ? 100 : 300); // Approximate height

    const endX = target.position.x + 120;
    const endY = target.position.y; // Top of target

    // Control points for Bezier
    const cp1x = startX;
    const cp1y = startY + 50;
    const cp2x = endX;
    const cp2y = endY - 50;

    const d = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'connection-path');

    this.connectionsLayer.appendChild(path);
  }
}
