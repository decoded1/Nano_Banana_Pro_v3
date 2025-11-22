import { useStore, getStoreActions } from '../../state';
import './nodes.css';

export class NodeCard {
  id: string;
  element: HTMLElement;
  config: any;

  // Drag state
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private initialPos = { x: 0, y: 0 };

  constructor(id: string, config: any) {
    this.id = id;
    this.config = config;

    this.element = document.createElement('div');
    this.element.className = 'node-card';
    this.element.dataset.id = id;

    this.render();
    this.bindEvents();
    this.updatePosition(config.position);
  }

  private render() {
    const isGhost = this.config.isGhost;
    const imageSrc = this.config.image;
    const prompt = this.config.prompt || 'Generating...';
    const title = this.config.title || 'Untitled';
    const badge = this.config.badge || '2K';

    // Reset content
    this.element.innerHTML = '';
    if (isGhost) this.element.classList.add('ghost');
    else this.element.classList.remove('ghost');

    // Input Port (if not root)
    if (this.config.parentId) {
      const inputPort = document.createElement('div');
      inputPort.className = 'node-port input';
      this.element.appendChild(inputPort);
    }

    // Image Container
    const imgContainer = document.createElement('div');
    imgContainer.className = 'node-image-container';

    // Aspect Ratio handling could go here via style
    // For now, CSS handles min-height.

    if (isGhost) {
      const loader = document.createElement('div');
      loader.className = 'node-loader';
      imgContainer.appendChild(loader);
    } else if (imageSrc) {
      const img = document.createElement('img');
      img.src = imageSrc;
      img.className = 'node-image';
      img.draggable = false;
      imgContainer.appendChild(img);

      // Badge
      const badgeEl = document.createElement('div');
      badgeEl.className = 'node-badge';
      badgeEl.innerText = badge;
      imgContainer.appendChild(badgeEl);
    }

    this.element.appendChild(imgContainer);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'node-footer';

    const titleEl = document.createElement('div');
    titleEl.className = 'node-title';
    titleEl.innerText = title;

    const promptEl = document.createElement('div');
    promptEl.className = 'node-prompt';
    promptEl.innerText = prompt;

    footer.appendChild(titleEl);
    footer.appendChild(promptEl);
    this.element.appendChild(footer);

    // Output Port
    const outputPort = document.createElement('div');
    outputPort.className = 'node-port output';
    this.element.appendChild(outputPort);
  }

  public update(state: any) {
    // Check for config changes that require re-render
    if (state.config.image !== this.config.image || state.config.isGhost !== this.config.isGhost) {
      this.config = state.config;
      this.render();
    }

    this.updatePosition(state.position);
    this.updateSelection(state.selection);
    this.element.style.zIndex = state.zIndex;
  }

  private updatePosition(pos: { x: number, y: number }) {
    this.element.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  }

  private updateSelection(selection: string) {
    if (selection === 'selected' || selection === 'multi-selected') {
      this.element.classList.add('selected');
    } else {
      this.element.classList.remove('selected');
    }
  }

  public destroy() {
    this.element.remove();
  }

  private bindEvents() {
    const actions = getStoreActions();

    // Click / Select
    this.element.addEventListener('pointerdown', (e) => {
      e.stopPropagation(); // Prevent canvas pan

      // Handle Selection
      if (!e.shiftKey) {
        actions.clearSelection();
        actions.selectNode(this.id);
      } else {
        actions.selectNode(this.id); // Toggle logic inside store usually, but simplistic here
      }

      // Bring to front
      actions.bringToFront(this.id);

      // Init Drag
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };

      // Get current pos from store or element
      // To be safe, let's assume element transform is sync
      // But better to use store
      // We need screen-to-world delta

      this.element.setPointerCapture(e.pointerId);
    });

    this.element.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      e.stopPropagation();

      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;

      // Get current scale to convert screen delta to world delta
      const scale = useStore.getState().canvas.transform.scale;

      // Update position in store
      actions.moveNodes([this.id], { x: dx / scale, y: dy / scale });

      // Reset start for next frame
      this.dragStart = { x: e.clientX, y: e.clientY };
    });

    this.element.addEventListener('pointerup', (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        this.element.releasePointerCapture(e.pointerId);
      }
    });

    // Context Menu
    this.element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // Show context menu
    });
  }
}
