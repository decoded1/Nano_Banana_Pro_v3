/**
 * Nano Banana Pro - Application Entry Point
 *
 * This is the main entry point for the Vite application.
 * It initializes the app and mounts all components to the DOM.
 */

import './styles/main.css';

import { Canvas, TopBar, LeftDrawer, PromptIsland, ToastContainer } from './components';
import { initGenerationService, stopGenerationService } from './services';
import { initializeEventBridge, cleanupEventBridge } from './state';

// Component instances
let canvas: Canvas | null = null;
let topBar: TopBar | null = null;
let leftDrawer: LeftDrawer | null = null;
let promptIsland: PromptIsland | null = null;
let toastContainer: ToastContainer | null = null;

/**
 * Application initialization
 */
const initApp = (): void => {
  const appElement = document.getElementById('app');

  if (!appElement) {
    throw new Error('App mount point (#app) not found in DOM');
  }

  // Initialize event bridge (connects EventBus to Zustand store)
  initializeEventBridge();

  // Create UI layer for floating elements
  const uiLayer = document.createElement('div');
  uiLayer.className = 'ui-layer';

  // Initialize components
  canvas = new Canvas();
  topBar = new TopBar();
  leftDrawer = new LeftDrawer();
  promptIsland = new PromptIsland();
  toastContainer = new ToastContainer();

  // Mount canvas directly to app
  canvas.mount(appElement);

  // Mount UI components to UI layer
  topBar.mount(uiLayer);
  leftDrawer.mount(uiLayer);
  promptIsland.mount(uiLayer);
  toastContainer.mount(uiLayer);

  // Add UI layer to app
  appElement.appendChild(uiLayer);

  // Initialize generation service (queue processor)
  initGenerationService();

  // Log initialization
  if (import.meta.env.DEV) {
    console.log('[Nano Banana Pro] Application initialized');
    console.log('[Nano Banana Pro] Phase 7: Services integrated');
  }
};

/**
 * Application cleanup
 */
const cleanupApp = (): void => {
  // Stop generation service
  stopGenerationService();

  // Destroy components
  canvas?.destroy();
  topBar?.destroy();
  leftDrawer?.destroy();
  promptIsland?.destroy();
  toastContainer?.destroy();

  // Cleanup event bridge
  cleanupEventBridge();

  // Reset references
  canvas = null;
  topBar = null;
  leftDrawer = null;
  promptIsland = null;
  toastContainer = null;
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanupApp);

// Hot Module Replacement support
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('[HMR] Module updated');
    cleanupApp();
    initApp();
  });
}

// Export for external access (useful for debugging)
export { canvas, topBar, leftDrawer, promptIsland, toastContainer };
