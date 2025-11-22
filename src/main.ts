import { useStore } from './state';
import { initGenerationService } from './services';
import { Canvas } from './components/canvas/Canvas';
import { PromptIsland } from './components/ui/PromptIsland';

// Initialize Application
const initApp = () => {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  console.log('🍌 Nano Banana Pro initializing...');

  // Initialize Services
  initGenerationService();

  // Create Canvas Layer (Background + Nodes + Connections)
  // We will pass the container to the Canvas component
  const canvas = new Canvas(appContainer);

  // Create UI Layer (Prompt Island, Panels)
  const uiContainer = document.createElement('div');
  uiContainer.id = 'ui-layer';
  uiContainer.style.position = 'absolute';
  uiContainer.style.inset = '0';
  uiContainer.style.pointerEvents = 'none'; // Allow clicks to pass through to canvas
  uiContainer.style.zIndex = '100';
  appContainer.appendChild(uiContainer);

  // Add Prompt Island
  const promptIsland = new PromptIsland();
  uiContainer.appendChild(promptIsland.element);

  // Initial debug log
  useStore.subscribe((state) => state.nodes, (nodes) => {
    console.log('Nodes updated:', Object.keys(nodes).length);
  });
};

// Start
initApp();
