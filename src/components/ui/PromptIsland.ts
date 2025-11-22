import { useStore, getStoreActions, selectSelectedNodes } from '../../state';
import { getGenerationService } from '../../services/generationService';
import './ui.css';

export class PromptIsland {
  element: HTMLElement;
  inputElement: HTMLInputElement;
  contextElement: HTMLElement;
  actionButton: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'prompt-island-wrapper';

    this.element.innerHTML = `
      <div class="prompt-island">
        <div class="prompt-context">Creating New Root</div>

        <div class="island-icon">
          <svg class="island-sparkle" viewBox="0 0 24 24">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </div>

        <input type="text" class="island-input" placeholder="Describe your imagination..." />

        <button class="island-action">
          <span>Generate</span>
        </button>
      </div>
    `;

    this.inputElement = this.element.querySelector('.island-input') as HTMLInputElement;
    this.contextElement = this.element.querySelector('.prompt-context') as HTMLElement;
    this.actionButton = this.element.querySelector('.island-action') as HTMLElement;

    this.bindEvents();
    this.subscribe();
  }

  private bindEvents() {
    // Generate Click
    this.actionButton.addEventListener('click', () => this.handleGenerate());

    // Enter Key
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleGenerate();
      }
    });
  }

  private subscribe() {
    // Subscribe to selection to update context label and mode
    useStore.subscribe(
      (state) => state.selectedIds,
      () => this.updateContext()
    );

    // Subscribe to generation queue to show loading state on button?
    // Or we can just clear input.
  }

  private updateContext() {
    const state = useStore.getState();
    const selectedNodes = selectSelectedNodes(state);

    if (selectedNodes.length === 0) {
      this.contextElement.innerText = 'Creating New Root';
      this.contextElement.classList.remove('visible'); // Optional: hide if default
      this.inputElement.placeholder = "Describe your imagination...";
      this.setButtonLabel("Generate");
    } else if (selectedNodes.length === 1) {
      this.contextElement.innerText = `Editing: ${selectedNodes[0].config.title || 'Untitled'}`;
      this.contextElement.classList.add('visible');
      this.inputElement.placeholder = "Describe changes...";
      this.setButtonLabel("Edit");
    } else {
      this.contextElement.innerText = `Merging ${selectedNodes.length} Nodes`;
      this.contextElement.classList.add('visible');
      this.inputElement.placeholder = "Describe how to combine them...";
      this.setButtonLabel("Merge");
    }
  }

  private setButtonLabel(text: string) {
    const span = this.actionButton.querySelector('span');
    if (span) span.innerText = text;
  }

  private async handleGenerate() {
    const prompt = this.inputElement.value.trim();
    if (!prompt) return;

    const state = useStore.getState();
    const selectedNodes = selectSelectedNodes(state);
    const generationService = getGenerationService();

    // Determine Logic
    if (selectedNodes.length === 0) {
      // Root Generation
      generationService.queueGeneration(prompt, {
        config: {
          imageSize: '2K', // Default
          aspectRatio: '1:1'
        }
      });
    } else if (selectedNodes.length === 1) {
      // Edit
      const parent = selectedNodes[0];

      // We need to handle thoughtSignature here for multi-turn?
      // The service `executeGeneration` handles logic if `thoughtSignature` is in request.
      // But `queueGeneration` logic in service handles putting `targetNodeId`.
      // We should also check for previous thought signature if we are continuing a chain.
      // Ideally, the `generationService` should look up the chain.
      // But let's check `generationService.ts` logic.

      // `queueGeneration` takes `options.targetNodeId`.
      // `executeGeneration` uses that to get target image.
      // Does it handle history?
      // Looking at `generationService.ts`:
      // `executeGeneration` builds options. If `thoughtSignature` is passed, isEditMode=true.

      // We need to pass the thought signature if the PARENT has one (from its result).
      // The node config doesn't seem to store thoughtSignature directly in `NodeConfig` in `node.types.ts`.
      // Wait, `NodeState` has `config`. `NodeConfig` has... `id`, `title`, `image`.
      // We might need to store `thoughtSignature` in `NodeConfig` or fetch it from `GenerationResult` which might be stored elsewhere?

      // Let's check `geminiService.ts` again. It returns `thoughtSignature`.
      // `generationService` creates node. Does it save thoughtSignature?
      // In `createNodeFromResult`:
      // It creates node config. It does NOT seem to save thoughtSignature in the node config.

      // ISSUE: We need to store thoughtSignature on the node to enable multi-turn.
      // I should update `NodeConfig` type and `nodesSlice` or just dump it in `meta` if available.
      // `NodeConfig` has no `meta` field. It has `seed`.

      // For now, I will proceed with basic edit (which works with just image + prompt).
      // True multi-turn requires that signature.

      // Pass thoughtSignature from parent if available for multi-turn
      const thoughtSignature = parent.config.thoughtSignature;

      generationService.queueGeneration(prompt, {
        targetNodeId: parent.config.id,
        thoughtSignature: thoughtSignature,
        config: { imageSize: '2K' }
      });
    } else {
      // Merge
      // Get images from all selected nodes as references
      const references = selectedNodes
        .filter(n => n.config.image)
        .map(n => {
            // Extract data from dataURL
            const match = n.config.image!.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                return { mimeType: match[1], data: match[2] };
            }
            return null;
        })
        .filter(Boolean) as any[];

      generationService.queueGeneration(prompt, {
        references: references,
        config: { imageSize: '2K' }
      });
    }

    // Clear input
    this.inputElement.value = '';

    // Reset selection if root? No, keep context.
  }
}
