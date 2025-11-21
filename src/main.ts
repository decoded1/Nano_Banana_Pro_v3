/**
 * Nano Banana Pro - Application Entry Point
 *
 * This is the main entry point for the Vite application.
 * It initializes the app and mounts it to the DOM.
 */

import './styles/main.css';

// Application initialization
const initApp = (): void => {
  const appElement = document.getElementById('app');

  if (!appElement) {
    throw new Error('App mount point (#app) not found in DOM');
  }

  // Phase 0: Basic verification that the build system works
  // This will be replaced with proper app initialization in Phase 6
  appElement.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 16px;
    ">
      <div style="
        width: 12px;
        height: 12px;
        background: var(--accent-primary);
        border-radius: 50%;
        box-shadow: 0 0 20px var(--accent-primary);
        animation: pulse 2s infinite;
      "></div>
      <h1 style="font-size: 24px; font-weight: 600;">Nano Banana Pro</h1>
      <p style="color: var(--text-muted); font-size: 14px;">
        Gemini 3 Pro Image - Infinite Canvas
      </p>
      <p style="color: var(--text-muted); font-size: 12px; margin-top: 24px;">
        Phase 0 Complete - Build System Verified
      </p>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.7; }
      }
    </style>
  `;

  console.log('[Nano Banana Pro] Application initialized');
  console.log('[Nano Banana Pro] Phase 0: Foundation complete');
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Hot Module Replacement support
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('[HMR] Module updated');
  });
}
