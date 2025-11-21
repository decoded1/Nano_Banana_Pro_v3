/**
 * UI Slice
 *
 * State management for UI components.
 * Handles drawer, modals, toasts, context menu, and prompt state.
 */

import { DEFAULT_GENERATION_CONFIG } from '@/types';
import { generateId } from '@/utils/id';

import type {
  DrawerState,
  DrawerItemType,
  ModalState,
  ModalType,
  ContextMenuState,
  ToastState,
  Toast,
  ToastType,
  TopBarState,
  ProjectInfo,
  PromptState,
  PromptReference,
  GenerationConfig,
  Position,
  ContextMenuItem,
} from '@/types';
import type { StateCreator } from 'zustand';

// =============================================================================
// SLICE STATE
// =============================================================================

export interface UISliceState {
  /** Left drawer state */
  drawer: DrawerState;
  /** Current modal state */
  modal: ModalState | null;
  /** Context menu state */
  contextMenu: ContextMenuState;
  /** Toast notifications */
  toasts: ToastState;
  /** Top bar state */
  topBar: TopBarState;
  /** Prompt island state */
  prompt: PromptState;
  /** Whether UI is fully loaded */
  isInitialized: boolean;
}

// =============================================================================
// SLICE ACTIONS
// =============================================================================

export interface UISliceActions {
  // Drawer
  openDrawer: (item?: DrawerItemType) => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setActiveDrawerItem: (item: DrawerItemType | null) => void;

  // Modal
  openModal: (type: ModalType, data?: unknown) => void;
  closeModal: () => void;
  updateModalData: (data: unknown) => void;

  // Context Menu
  showContextMenu: (
    position: Position,
    items: ContextMenuItem[],
    target?: { id: string; type: 'node' | 'wire' | 'canvas' },
  ) => void;
  hideContextMenu: () => void;

  // Toasts
  showToast: (
    type: ToastType,
    message: string,
    options?: { duration?: number; action?: { label: string; onClick: () => void } },
  ) => string;
  dismissToast: (toastId: string) => void;
  clearAllToasts: () => void;

  // Top Bar
  setProjectInfo: (info: ProjectInfo | null) => void;
  setProjectModified: (isModified: boolean) => void;
  setSaveIndicator: (show: boolean) => void;

  // Prompt
  setPromptText: (text: string) => void;
  addPromptReference: (reference: Omit<PromptReference, 'id'>) => string;
  removePromptReference: (referenceId: string) => void;
  clearPromptReferences: () => void;
  setPromptConfig: (config: Partial<GenerationConfig>) => void;
  setPromptGenerating: (isGenerating: boolean) => void;
  setPromptError: (error: string | null) => void;
  resetPrompt: () => void;

  // General
  setInitialized: (value: boolean) => void;
}

export type UISlice = UISliceState & UISliceActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialDrawer: DrawerState = {
  isOpen: false,
  activeItem: null,
  items: [
    { type: 'references', label: 'References', shortcut: 'R', isActive: false },
    { type: 'styles', label: 'Styles', shortcut: 'S', isActive: false },
    { type: 'history', label: 'History', shortcut: 'H', isActive: false },
    { type: 'settings', label: 'Settings', shortcut: ',', isActive: false },
  ],
};

const initialContextMenu: ContextMenuState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  items: [],
  targetId: undefined,
  targetType: undefined,
};

const initialToasts: ToastState = {
  toasts: [],
  maxVisible: 5,
};

const initialTopBar: TopBarState = {
  brandName: 'Nano Banana Pro',
  projectInfo: null,
  showSaveIndicator: false,
};

const initialPrompt: PromptState = {
  text: '',
  references: [],
  targetImage: null,
  config: { ...DEFAULT_GENERATION_CONFIG },
  isGenerating: false,
  errorMessage: null,
};

const initialState: UISliceState = {
  drawer: initialDrawer,
  modal: null,
  contextMenu: initialContextMenu,
  toasts: initialToasts,
  topBar: initialTopBar,
  prompt: initialPrompt,
  isInitialized: false,
};

// =============================================================================
// SLICE CREATOR
// =============================================================================

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set, get) => ({
  ...initialState,

  // ---------------------------------------------------------------------------
  // Drawer
  // ---------------------------------------------------------------------------

  openDrawer: (item) => {
    set((state) => ({
      drawer: {
        ...state.drawer,
        isOpen: true,
        activeItem: item ?? state.drawer.activeItem ?? 'references',
        items: state.drawer.items.map((i) => ({
          ...i,
          isActive: i.type === (item ?? state.drawer.activeItem ?? 'references'),
        })),
      },
    }));
  },

  closeDrawer: () => {
    set((state) => ({
      drawer: {
        ...state.drawer,
        isOpen: false,
        items: state.drawer.items.map((i) => ({ ...i, isActive: false })),
      },
    }));
  },

  toggleDrawer: () => {
    const state = get();
    if (state.drawer.isOpen) {
      get().closeDrawer();
    } else {
      get().openDrawer();
    }
  },

  setActiveDrawerItem: (item) => {
    set((state) => ({
      drawer: {
        ...state.drawer,
        activeItem: item,
        items: state.drawer.items.map((i) => ({
          ...i,
          isActive: i.type === item,
        })),
      },
    }));
  },

  // ---------------------------------------------------------------------------
  // Modal
  // ---------------------------------------------------------------------------

  openModal: (type, data) => {
    const titles: Record<ModalType, string> = {
      settings: 'Settings',
      export: 'Export',
      confirm: 'Confirm',
      error: 'Error',
      'image-preview': 'Image Preview',
      'node-details': 'Node Details',
    };

    set({
      modal: {
        type,
        isOpen: true,
        title: titles[type],
        data,
      },
    });
  },

  closeModal: () => {
    set({ modal: null });
  },

  updateModalData: (data) => {
    set((state) => {
      if (!state.modal) return state;
      return {
        modal: { ...state.modal, data },
      };
    });
  },

  // ---------------------------------------------------------------------------
  // Context Menu
  // ---------------------------------------------------------------------------

  showContextMenu: (position, items, target) => {
    set({
      contextMenu: {
        isOpen: true,
        position,
        items,
        targetId: target?.id,
        targetType: target?.type,
      },
    });
  },

  hideContextMenu: () => {
    set({
      contextMenu: {
        ...initialContextMenu,
        isOpen: false,
      },
    });
  },

  // ---------------------------------------------------------------------------
  // Toasts
  // ---------------------------------------------------------------------------

  showToast: (type, message, options = {}) => {
    const id = generateId('toast');
    const duration = options.duration ?? (type === 'error' ? 8000 : 5000);

    // Build toast object, only including action if defined
    const toast: Toast = options.action
      ? {
          id,
          type,
          message,
          duration,
          dismissible: true,
          action: options.action,
        }
      : {
          id,
          type,
          message,
          duration,
          dismissible: true,
        };

    set((state) => {
      // Keep only maxVisible - 1 toasts to make room for new one
      const existingToasts = state.toasts.toasts.slice(-(state.toasts.maxVisible - 1));
      return {
        toasts: {
          ...state.toasts,
          toasts: [...existingToasts, toast],
        },
      };
    });

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }

    return id;
  },

  dismissToast: (toastId) => {
    set((state) => ({
      toasts: {
        ...state.toasts,
        toasts: state.toasts.toasts.filter((t) => t.id !== toastId),
      },
    }));
  },

  clearAllToasts: () => {
    set((state) => ({
      toasts: {
        ...state.toasts,
        toasts: [],
      },
    }));
  },

  // ---------------------------------------------------------------------------
  // Top Bar
  // ---------------------------------------------------------------------------

  setProjectInfo: (info) => {
    set((state) => ({
      topBar: { ...state.topBar, projectInfo: info },
    }));
  },

  setProjectModified: (isModified) => {
    set((state) => {
      if (!state.topBar.projectInfo) return state;
      return {
        topBar: {
          ...state.topBar,
          projectInfo: { ...state.topBar.projectInfo, isModified },
        },
      };
    });
  },

  setSaveIndicator: (show) => {
    set((state) => ({
      topBar: { ...state.topBar, showSaveIndicator: show },
    }));
  },

  // ---------------------------------------------------------------------------
  // Prompt
  // ---------------------------------------------------------------------------

  setPromptText: (text) => {
    set((state) => ({
      prompt: { ...state.prompt, text },
    }));
  },

  addPromptReference: (reference) => {
    const id = generateId('pref');
    const newReference: PromptReference = {
      ...reference,
      id,
    };

    set((state) => ({
      prompt: {
        ...state.prompt,
        references: [...state.prompt.references, newReference],
      },
    }));

    return id;
  },

  removePromptReference: (referenceId) => {
    set((state) => ({
      prompt: {
        ...state.prompt,
        references: state.prompt.references.filter((ref) => ref.id !== referenceId),
      },
    }));
  },

  clearPromptReferences: () => {
    set((state) => ({
      prompt: {
        ...state.prompt,
        references: [],
      },
    }));
  },

  setPromptConfig: (config) => {
    set((state) => ({
      prompt: {
        ...state.prompt,
        config: { ...state.prompt.config, ...config },
      },
    }));
  },

  setPromptGenerating: (isGenerating) => {
    set((state) => ({
      prompt: { ...state.prompt, isGenerating },
    }));
  },

  setPromptError: (errorMessage) => {
    set((state) => ({
      prompt: { ...state.prompt, errorMessage },
    }));
  },

  resetPrompt: () => {
    set({ prompt: initialPrompt });
  },

  // ---------------------------------------------------------------------------
  // General
  // ---------------------------------------------------------------------------

  setInitialized: (value) => {
    set({ isInitialized: value });
  },
});
