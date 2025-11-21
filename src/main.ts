/**
 * Nano Banana Pro - Application Entry Point
 *
 * This is the main entry point for the Vite application.
 * It initializes the app and mounts all components to the DOM.
 */

import './styles/main.css';

import {
  Canvas,
  TopBar,
  LeftDrawer,
  PromptIsland,
  ToastContainer,
  ContextMenu,
  Minimap,
  BoxSelection,
} from './components';
import { initKeyboardShortcuts, cleanupKeyboardShortcuts } from './core/events';
import {
  initGenerationService,
  stopGenerationService,
  initClipboardService,
  cleanupClipboardService,
} from './services';
import {
  initializeEventBridge,
  cleanupEventBridge,
  initProjectManager,
  cleanupProjectManager,
} from './state';

// Component instances
let canvas: Canvas | null = null;
let topBar: TopBar | null = null;
let leftDrawer: LeftDrawer | null = null;
let promptIsland: PromptIsland | null = null;
let toastContainer: ToastContainer | null = null;
let contextMenu: ContextMenu | null = null;
let minimap: Minimap | null = null;
let boxSelection: BoxSelection | null = null;

/**
 * Application initialization
 */
const initApp = async (): Promise<void> => {
  const appElement = document.getElementById('app');

  if (!appElement) {
    throw new Error('App mount point (#app) not found in DOM');
  }

  // Initialize event bridge (connects EventBus to Zustand store)
  initializeEventBridge();

  // Initialize keyboard shortcuts
  initKeyboardShortcuts();

  // Initialize persistence (async)
  try {
    await initProjectManager();
  } catch (error) {
    console.error('[Nano Banana Pro] Failed to initialize persistence:', error);
    // Continue without persistence - app can still work
  }

  // Create UI layer for floating elements
  const uiLayer = document.createElement('div');
  uiLayer.className = 'ui-layer';

  // Initialize components
  canvas = new Canvas();
  topBar = new TopBar();
  leftDrawer = new LeftDrawer();
  promptIsland = new PromptIsland();
  toastContainer = new ToastContainer();
  contextMenu = new ContextMenu();
  minimap = new Minimap();
  boxSelection = new BoxSelection();

  // Mount canvas directly to app
  canvas.mount(appElement);

  // Mount canvas overlay components (inside canvas for proper positioning)
  const canvasElement = canvas.element;
  minimap.mount(canvasElement);
  boxSelection.mount(canvasElement);

  // Mount UI components to UI layer
  topBar.mount(uiLayer);
  leftDrawer.mount(uiLayer);
  promptIsland.mount(uiLayer);
  toastContainer.mount(uiLayer);
  contextMenu.mount(uiLayer);

  // Add UI layer to app
  appElement.appendChild(uiLayer);

  // Initialize services
  initGenerationService();
  initClipboardService();

  // Log initialization
  if (import.meta.env.DEV) {
    console.log('[Nano Banana Pro] Application initialized');
    console.log('[Nano Banana Pro] Phase 9: Advanced features integrated');
  }
};

/**
 * Application cleanup
 */
const cleanupApp = (): void => {
  // Stop services
  stopGenerationService();
  cleanupClipboardService();

  // Cleanup persistence
  cleanupProjectManager();

  // Cleanup keyboard shortcuts
  cleanupKeyboardShortcuts();

  // Destroy components
  canvas?.destroy();
  topBar?.destroy();
  leftDrawer?.destroy();
  promptIsland?.destroy();
  toastContainer?.destroy();
  contextMenu?.destroy();
  minimap?.destroy();
  boxSelection?.destroy();

  // Cleanup event bridge
  cleanupEventBridge();

  // Reset references
  canvas = null;
  topBar = null;
  leftDrawer = null;
  promptIsland = null;
  toastContainer = null;
  contextMenu = null;
  minimap = null;
  boxSelection = null;
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
    void initApp();
  });
}

// Export for external access (useful for debugging)
export {
  canvas,
  topBar,
  leftDrawer,
  promptIsland,
  toastContainer,
  contextMenu,
  minimap,
  boxSelection,
};
