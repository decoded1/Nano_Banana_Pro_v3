/**
 * Event Type Definitions
 *
 * Types for the event bus system and all event payloads.
 * Events enable decoupled communication between components.
 */

import type { Transform, ViewOffset } from './canvas.types';
import type { WireConfig, PortRef, ConnectionRequest } from './connection.types';
import type { GenerationConfig, GenerationResult, ImageData } from './generation.types';
import type { Position, NodeConfig, NodeState } from './node.types';

// =============================================================================
// EVENT BUS TYPES
// =============================================================================

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (payload: T) => void;

/**
 * Unsubscribe function returned by subscribe
 */
export type Unsubscribe = () => void;

/**
 * Event bus interface
 */
export interface IEventBus {
  emit<T>(event: string, payload: T): void;
  on<T>(event: string, handler: EventHandler<T>): Unsubscribe;
  off<T>(event: string, handler: EventHandler<T>): void;
  once<T>(event: string, handler: EventHandler<T>): Unsubscribe;
}

// =============================================================================
// NODE EVENTS
// =============================================================================

export interface NodeCreatedEvent {
  node: NodeState;
}

export interface NodeDeletedEvent {
  nodeId: string;
}

export interface NodeUpdatedEvent {
  nodeId: string;
  changes: Partial<NodeConfig>;
}

export interface NodeSelectedEvent {
  nodeId: string;
  isMultiSelect: boolean;
}

export interface NodeDeselectedEvent {
  nodeId: string;
}

export interface NodeDragStartEvent {
  nodeId: string;
  startPosition: Position;
}

export interface NodeDragMoveEvent {
  nodeId: string;
  currentPosition: Position;
  delta: Position;
}

export interface NodeDragEndEvent {
  nodeId: string;
  finalPosition: Position;
}

export interface NodesSelectionChangedEvent {
  selectedIds: string[];
  previousSelectedIds: string[];
}

// =============================================================================
// CANVAS EVENTS
// =============================================================================

export interface CanvasPanStartEvent {
  startOffset: ViewOffset;
  mousePosition: Position;
}

export interface CanvasPanMoveEvent {
  currentOffset: ViewOffset;
  delta: ViewOffset;
}

export interface CanvasPanEndEvent {
  finalOffset: ViewOffset;
}

export interface CanvasZoomEvent {
  scale: number;
  previousScale: number;
  center: Position;
}

export interface CanvasTransformChangedEvent {
  transform: Transform;
  previousTransform: Transform;
}

export interface CanvasClickEvent {
  position: Position;
  worldPosition: Position;
  isDoubleClick: boolean;
}

export interface CanvasContextMenuEvent {
  position: Position;
  worldPosition: Position;
}

// =============================================================================
// CONNECTION EVENTS
// =============================================================================

export interface ConnectionStartedEvent {
  source: PortRef;
  mousePosition: Position;
}

export interface ConnectionDragEvent {
  source: PortRef;
  currentPosition: Position;
  nearestValidTarget: PortRef | null;
}

export interface ConnectionCompletedEvent {
  wire: WireConfig;
}

export interface ConnectionCancelledEvent {
  source: PortRef;
  reason: 'escape' | 'invalid-target' | 'click-away';
}

export interface ConnectionDeletedEvent {
  wireId: string;
}

export interface ConnectionValidationEvent {
  request: ConnectionRequest;
  isValid: boolean;
  message?: string | undefined;
}

// =============================================================================
// GENERATION EVENTS
// =============================================================================

export interface GenerationRequestedEvent {
  prompt: string;
  targetImage?: ImageData | undefined;
  referenceImages: ImageData[];
  config: GenerationConfig;
  parentNodeId?: string | undefined;
}

export interface GenerationStartedEvent {
  requestId: string;
  ghostNodeId: string;
}

export interface GenerationProgressEvent {
  requestId: string;
  progress: number;
  status: string;
}

export interface GenerationCompletedEvent {
  requestId: string;
  result: GenerationResult;
  ghostNodeId: string;
}

export interface GenerationFailedEvent {
  requestId: string;
  error: string;
  ghostNodeId: string;
}

export interface GenerationCancelledEvent {
  requestId: string;
  ghostNodeId: string;
}

// =============================================================================
// UI EVENTS
// =============================================================================

export interface DrawerItemClickedEvent {
  itemType: string;
}

export interface ModalOpenedEvent {
  modalType: string;
  data?: unknown;
}

export interface ModalClosedEvent {
  modalType: string;
  result?: unknown;
}

export interface ToastShownEvent {
  toastId: string;
  type: string;
  message: string;
}

export interface ToastDismissedEvent {
  toastId: string;
}

export interface PromptChangedEvent {
  text: string;
  previousText: string;
}

export interface ReferenceAddedEvent {
  reference: ImageData;
}

export interface ReferenceRemovedEvent {
  referenceId: string;
}

// =============================================================================
// PROJECT EVENTS
// =============================================================================

export interface ProjectLoadedEvent {
  projectId: string;
  projectName: string;
}

export interface ProjectSavedEvent {
  projectId: string;
  timestamp: number;
}

export interface ProjectModifiedEvent {
  isModified: boolean;
}

// =============================================================================
// HISTORY EVENTS
// =============================================================================

export interface HistoryUndoEvent {
  actionType: string;
}

export interface HistoryRedoEvent {
  actionType: string;
}

export interface HistoryPushedEvent {
  actionType: string;
  description: string;
}

// =============================================================================
// EVENT MAP (for type-safe event bus)
// =============================================================================

/**
 * Map of all event names to their payload types
 */
export interface EventMap {
  // Node events
  'node:created': NodeCreatedEvent;
  'node:deleted': NodeDeletedEvent;
  'node:updated': NodeUpdatedEvent;
  'node:selected': NodeSelectedEvent;
  'node:deselected': NodeDeselectedEvent;
  'node:drag-start': NodeDragStartEvent;
  'node:drag-move': NodeDragMoveEvent;
  'node:drag-end': NodeDragEndEvent;
  'nodes:selection-changed': NodesSelectionChangedEvent;

  // Canvas events
  'canvas:pan-start': CanvasPanStartEvent;
  'canvas:pan-move': CanvasPanMoveEvent;
  'canvas:pan-end': CanvasPanEndEvent;
  'canvas:zoom': CanvasZoomEvent;
  'canvas:transform-changed': CanvasTransformChangedEvent;
  'canvas:click': CanvasClickEvent;
  'canvas:context-menu': CanvasContextMenuEvent;

  // Connection events
  'connection:started': ConnectionStartedEvent;
  'connection:drag': ConnectionDragEvent;
  'connection:completed': ConnectionCompletedEvent;
  'connection:cancelled': ConnectionCancelledEvent;
  'connection:deleted': ConnectionDeletedEvent;
  'connection:validation': ConnectionValidationEvent;

  // Generation events
  'generation:requested': GenerationRequestedEvent;
  'generation:started': GenerationStartedEvent;
  'generation:progress': GenerationProgressEvent;
  'generation:completed': GenerationCompletedEvent;
  'generation:failed': GenerationFailedEvent;
  'generation:cancelled': GenerationCancelledEvent;

  // UI events
  'drawer:item-clicked': DrawerItemClickedEvent;
  'modal:opened': ModalOpenedEvent;
  'modal:closed': ModalClosedEvent;
  'toast:shown': ToastShownEvent;
  'toast:dismissed': ToastDismissedEvent;
  'prompt:changed': PromptChangedEvent;
  'reference:added': ReferenceAddedEvent;
  'reference:removed': ReferenceRemovedEvent;

  // Project events
  'project:loaded': ProjectLoadedEvent;
  'project:saved': ProjectSavedEvent;
  'project:modified': ProjectModifiedEvent;

  // History events
  'history:undo': HistoryUndoEvent;
  'history:redo': HistoryRedoEvent;
  'history:pushed': HistoryPushedEvent;
}

/**
 * All valid event names
 */
export type EventName = keyof EventMap;
