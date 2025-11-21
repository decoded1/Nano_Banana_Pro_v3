/**
 * EventTypes
 *
 * String constants for all event names.
 * Using constants prevents typos and enables IDE autocomplete.
 */

// =============================================================================
// NODE EVENTS
// =============================================================================

export const NODE_EVENTS = {
  CREATED: 'node:created',
  DELETED: 'node:deleted',
  UPDATED: 'node:updated',
  SELECTED: 'node:selected',
  DESELECTED: 'node:deselected',
  DRAG_START: 'node:drag-start',
  DRAG_MOVE: 'node:drag-move',
  DRAG_END: 'node:drag-end',
  SELECTION_CHANGED: 'nodes:selection-changed',
  CREATE_REQUESTED: 'node:create-requested',
  EXPORT_REQUESTED: 'node:export-requested',
} as const;

// =============================================================================
// CANVAS EVENTS
// =============================================================================

export const CANVAS_EVENTS = {
  PAN_START: 'canvas:pan-start',
  PAN_MOVE: 'canvas:pan-move',
  PAN_END: 'canvas:pan-end',
  ZOOM: 'canvas:zoom',
  ZOOM_IN: 'canvas:zoom-in',
  ZOOM_OUT: 'canvas:zoom-out',
  ZOOM_TO_FIT: 'canvas:zoom-to-fit',
  RESET_ZOOM: 'canvas:reset-zoom',
  TRANSFORM_CHANGED: 'canvas:transform-changed',
  CLICK: 'canvas:click',
  CONTEXT_MENU: 'canvas:context-menu',
} as const;

// =============================================================================
// CONNECTION EVENTS
// =============================================================================

export const CONNECTION_EVENTS = {
  STARTED: 'connection:started',
  DRAG: 'connection:drag',
  COMPLETED: 'connection:completed',
  CANCELLED: 'connection:cancelled',
  DELETED: 'connection:deleted',
  VALIDATION: 'connection:validation',
} as const;

// =============================================================================
// GENERATION EVENTS
// =============================================================================

export const GENERATION_EVENTS = {
  REQUESTED: 'generation:requested',
  STARTED: 'generation:started',
  PROGRESS: 'generation:progress',
  COMPLETED: 'generation:completed',
  FAILED: 'generation:failed',
  CANCELLED: 'generation:cancelled',
  REGENERATE_REQUESTED: 'generation:regenerate-requested',
} as const;

// =============================================================================
// UI EVENTS
// =============================================================================

export const UI_EVENTS = {
  DRAWER_ITEM_CLICKED: 'drawer:item-clicked',
  MODAL_OPENED: 'modal:opened',
  MODAL_CLOSED: 'modal:closed',
  TOAST_SHOWN: 'toast:shown',
  TOAST_DISMISSED: 'toast:dismissed',
  PROMPT_CHANGED: 'prompt:changed',
  REFERENCE_ADDED: 'reference:added',
  REFERENCE_REMOVED: 'reference:removed',
  FOCUS_PROMPT: 'ui:focus-prompt',
  CONTEXT_MENU_SHOW: 'ui:context-menu-show',
  CONTEXT_MENU_HIDE: 'ui:context-menu-hide',
} as const;

// =============================================================================
// SELECTION EVENTS
// =============================================================================

export const SELECTION_EVENTS = {
  CHANGED: 'selection:changed',
  SELECT_ALL: 'selection:select-all',
  CLEAR: 'selection:clear',
  DELETE_REQUESTED: 'selection:delete-requested',
} as const;

// =============================================================================
// CLIPBOARD EVENTS
// =============================================================================

export const CLIPBOARD_EVENTS = {
  COPY: 'clipboard:copy',
  PASTE: 'clipboard:paste',
  CUT: 'clipboard:cut',
} as const;

// =============================================================================
// PROJECT EVENTS
// =============================================================================

export const PROJECT_EVENTS = {
  LOADED: 'project:loaded',
  SAVED: 'project:saved',
  MODIFIED: 'project:modified',
  NEW_REQUESTED: 'project:new-requested',
  OPEN_REQUESTED: 'project:open-requested',
  SAVE_REQUESTED: 'project:save-requested',
} as const;

// =============================================================================
// HISTORY EVENTS
// =============================================================================

export const HISTORY_EVENTS = {
  UNDO: 'history:undo',
  REDO: 'history:redo',
  PUSHED: 'history:pushed',
} as const;

// =============================================================================
// ALL EVENTS (Combined)
// =============================================================================

export const EVENTS = {
  NODE: NODE_EVENTS,
  CANVAS: CANVAS_EVENTS,
  CONNECTION: CONNECTION_EVENTS,
  GENERATION: GENERATION_EVENTS,
  UI: UI_EVENTS,
  SELECTION: SELECTION_EVENTS,
  CLIPBOARD: CLIPBOARD_EVENTS,
  PROJECT: PROJECT_EVENTS,
  HISTORY: HISTORY_EVENTS,
} as const;

// =============================================================================
// TYPE HELPERS
// =============================================================================

/** All node event names */
export type NodeEventName = (typeof NODE_EVENTS)[keyof typeof NODE_EVENTS];

/** All canvas event names */
export type CanvasEventName = (typeof CANVAS_EVENTS)[keyof typeof CANVAS_EVENTS];

/** All connection event names */
export type ConnectionEventName = (typeof CONNECTION_EVENTS)[keyof typeof CONNECTION_EVENTS];

/** All generation event names */
export type GenerationEventName = (typeof GENERATION_EVENTS)[keyof typeof GENERATION_EVENTS];

/** All UI event names */
export type UIEventName = (typeof UI_EVENTS)[keyof typeof UI_EVENTS];

/** All project event names */
export type ProjectEventName = (typeof PROJECT_EVENTS)[keyof typeof PROJECT_EVENTS];

/** All history event names */
export type HistoryEventName = (typeof HISTORY_EVENTS)[keyof typeof HISTORY_EVENTS];

/** All selection event names */
export type SelectionEventName = (typeof SELECTION_EVENTS)[keyof typeof SELECTION_EVENTS];

/** All clipboard event names */
export type ClipboardEventName = (typeof CLIPBOARD_EVENTS)[keyof typeof CLIPBOARD_EVENTS];
