/**
 * Core Events - Barrel Export
 *
 * Event bus system for decoupled component communication.
 */

export { EventBus, eventBus } from './EventBus';
export type { EventBusOptions, EventHistoryEntry } from './EventBus';

export {
  EVENTS,
  NODE_EVENTS,
  CANVAS_EVENTS,
  CONNECTION_EVENTS,
  GENERATION_EVENTS,
  UI_EVENTS,
  SELECTION_EVENTS,
  CLIPBOARD_EVENTS,
  PROJECT_EVENTS,
  HISTORY_EVENTS,
} from './EventTypes';
export type {
  NodeEventName,
  CanvasEventName,
  ConnectionEventName,
  GenerationEventName,
  UIEventName,
  SelectionEventName,
  ClipboardEventName,
  ProjectEventName,
  HistoryEventName,
} from './EventTypes';

export {
  registerGlobalHandlers,
  unregisterGlobalHandlers,
  enableEventLogging,
  getEventStats,
} from './EventHandlers';

export {
  KeyboardShortcuts,
  getKeyboardShortcuts,
  initKeyboardShortcuts,
  cleanupKeyboardShortcuts,
} from './KeyboardShortcuts';
export type { ShortcutDefinition, KeyboardShortcutsConfig } from './KeyboardShortcuts';
