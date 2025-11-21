/**
 * UI Type Definitions
 *
 * Types for UI components, panels, modals, and interaction states.
 */

import type { ImageData, GenerationConfig } from './generation.types';

// =============================================================================
// DRAWER & PANELS
// =============================================================================

/**
 * Drawer item types
 */
export type DrawerItemType = 'references' | 'styles' | 'history' | 'settings';

/**
 * Drawer item state
 */
export interface DrawerItem {
  type: DrawerItemType;
  label: string;
  shortcut: string;
  isActive: boolean;
}

/**
 * Left drawer state
 */
export interface DrawerState {
  isOpen: boolean;
  activeItem: DrawerItemType | null;
  items: DrawerItem[];
}

/**
 * Panel position
 */
export type PanelPosition = 'left' | 'right' | 'bottom' | 'floating';

/**
 * Generic panel state
 */
export interface PanelState {
  id: string;
  title: string;
  position: PanelPosition;
  isOpen: boolean;
  isCollapsed: boolean;
  width?: number | undefined;
  height?: number | undefined;
}

// =============================================================================
// PROMPT ISLAND
// =============================================================================

/**
 * Reference image in prompt island
 */
export interface PromptReference {
  id: string;
  imageData: ImageData;
  thumbnail: string;
}

/**
 * Prompt island state
 */
export interface PromptState {
  /** Current prompt text */
  text: string;
  /** Reference images */
  references: PromptReference[];
  /** Target image for editing (if any) */
  targetImage: ImageData | null;
  /** Generation configuration */
  config: GenerationConfig;
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Error message if generation failed */
  errorMessage: string | null;
}

// =============================================================================
// MODALS & DIALOGS
// =============================================================================

/**
 * Modal types
 */
export type ModalType =
  | 'settings'
  | 'export'
  | 'confirm'
  | 'error'
  | 'image-preview'
  | 'node-details';

/**
 * Base modal state
 */
export interface ModalState {
  type: ModalType;
  isOpen: boolean;
  title: string;
  data?: unknown;
}

/**
 * Confirmation modal data
 */
export interface ConfirmModalData {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel?: (() => void) | undefined;
  isDangerous?: boolean | undefined;
}

/**
 * Error modal data
 */
export interface ErrorModalData {
  message: string;
  details?: string | undefined;
  retryAction?: (() => void) | undefined;
}

/**
 * Image preview modal data
 */
export interface ImagePreviewModalData {
  imageUrl: string;
  title: string;
  prompt?: string | undefined;
  resolution?: string | undefined;
}

// =============================================================================
// CONTEXT MENU
// =============================================================================

/**
 * Context menu item
 */
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string | undefined;
  shortcut?: string | undefined;
  disabled?: boolean | undefined;
  danger?: boolean | undefined;
  separator?: boolean | undefined;
  submenu?: ContextMenuItem[] | undefined;
  action?: (() => void) | undefined;
}

/**
 * Context menu state
 */
export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  targetId?: string | undefined;
  targetType?: 'node' | 'wire' | 'canvas' | undefined;
}

// =============================================================================
// TOAST NOTIFICATIONS
// =============================================================================

/**
 * Toast notification type
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  dismissible: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Toast manager state
 */
export interface ToastState {
  toasts: Toast[];
  maxVisible: number;
}

// =============================================================================
// TOP BAR
// =============================================================================

/**
 * Project info for top bar
 */
export interface ProjectInfo {
  name: string;
  isModified: boolean;
  lastSaved?: Date | undefined;
}

/**
 * Top bar state
 */
export interface TopBarState {
  brandName: string;
  projectInfo: ProjectInfo | null;
  showSaveIndicator: boolean;
}

// =============================================================================
// COMBINED UI STATE
// =============================================================================

/**
 * Full UI state
 */
export interface UIState {
  drawer: DrawerState;
  prompt: PromptState;
  modal: ModalState | null;
  contextMenu: ContextMenuState;
  toasts: ToastState;
  topBar: TopBarState;
  panels: PanelState[];
}
