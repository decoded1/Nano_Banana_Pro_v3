# Nano Banana Pro - Infinite Canvas: Project Roadmap

**Document Version:** 1.0.0
**Model:** Gemini 3 Pro Image (gemini-3-pro-image-preview)
**Codename:** Nano Banana Pro
**Architecture Pattern:** Circular Refinement System

---

## Table of Contents

1. [Current State Overview](#1-current-state-overview)
2. [Target Architecture](#2-target-architecture)
3. [Directory Structure](#3-directory-structure)
4. [Phase Structure Checklist](#4-phase-structure-checklist)
5. [Active To-Do List (30 Items)](#5-active-to-do-list-30-items)
6. [Circular Refinement Protocol](#6-circular-refinement-protocol)
7. [Module Decomposition Plan](#7-module-decomposition-plan)
8. [Integration Patterns](#8-integration-patterns)
9. [Expansion Guidelines](#9-expansion-guidelines)

---

## 1. Current State Overview

### 1.1 File Inventory

| File | Lines | Purpose | Coupling Level |
|------|-------|---------|----------------|
| `index.html` | 591 | Monolithic demo (UI + Logic + Styles) | **Critical - Must Decompose** |
| `services/geminiService.ts` | 483 | Gemini API service layer | **Low - Well Structured** |
| `*.md` (Guide) | 471 | API documentation | **None - Reference Only** |

### 1.2 index.html Responsibilities (Entangled Concerns)

The current `index.html` violates separation of concerns by combining:

#### A. Presentation Layer (Lines 7-250)
- **CSS Variables/Theming** (~10 lines): Design tokens for colors, spacing
- **Global Resets** (~10 lines): Base element styling
- **Workspace Styles** (~30 lines): Canvas, grid, transforms
- **Node Component Styles** (~80 lines): Cards, images, badges, ports
- **UI Overlay Styles** (~50 lines): Top bar, drawer, prompt island
- **Animation Keyframes** (~10 lines): Pulse effects

#### B. Structure Layer (Lines 252-280)
- **UI Layer Container**: Fixed overlay for interface elements
- **Top Bar Component**: Branding, project name
- **Left Drawer Component**: Tool palette (R, S, H buttons)
- **Prompt Island Component**: Reference dropzone, text input, generate button
- **Workspace Container**: Canvas mounting point

#### C. Logic Layer (Lines 282-590)
- **NodeSystem Class** (~120 lines): Canvas engine, pan/zoom, connections
- **Node Class** (~100 lines): Individual node entity, drag handling
- **Demo Initialization** (~50 lines): Hardcoded test data
- **Event Handlers**: Wheel, mouse, click events
- **Simulation Functions**: Ghost node creation/completion

### 1.3 Identified Code Smells

| Smell | Location | Impact |
|-------|----------|--------|
| God File | `index.html` | Cannot scale, test, or maintain |
| Inline Styles | `<style>` block | No theming, no reusability |
| Inline Scripts | `<script>` block | No module system, no tree-shaking |
| Hardcoded Demo Data | Lines 514-558 | Blocks real data integration |
| Mixed Abstractions | NodeSystem + Node | Tight coupling prevents extension |
| No Type Safety | Vanilla JS | Runtime errors, no autocomplete |
| No State Management | Class properties | Cannot persist, sync, or undo |
| No Event Bus | Direct DOM events | Components cannot communicate |

### 1.4 Existing Good Patterns (geminiService.ts)

The service file demonstrates target patterns:
- TypeScript with strict typing
- Interface-driven design
- Clear function responsibilities
- JSDoc documentation
- Modular exports
- Error handling
- Configuration objects

---

## 2. Target Architecture

### 2.1 Architectural Principles

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │  Components │ │   Styles    │ │   Themes    │              │
│  │  (Modular)  │ │  (Scoped)   │ │  (Tokens)   │              │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘              │
└─────────┼───────────────┼───────────────┼──────────────────────┘
          │               │               │
┌─────────▼───────────────▼───────────────▼──────────────────────┐
│                    APPLICATION LAYER                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │    State    │ │   Events    │ │  Commands   │              │
│  │  (Stores)   │ │    (Bus)    │ │  (Actions)  │              │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘              │
└─────────┼───────────────┼───────────────┼──────────────────────┘
          │               │               │
┌─────────▼───────────────▼───────────────▼──────────────────────┐
│                      DOMAIN LAYER                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │   Entities  │ │    Engine   │ │   Canvas    │              │
│  │ (Node,Wire) │ │ (NodeSystem)│ │ (Viewport)  │              │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘              │
└─────────┼───────────────┼───────────────┼──────────────────────┘
          │               │               │
┌─────────▼───────────────▼───────────────▼──────────────────────┐
│                   INFRASTRUCTURE LAYER                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │   Services  │ │   Storage   │ │    Utils    │              │
│  │ (Gemini API)│ │ (IndexedDB) │ │  (Helpers)  │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Core Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Type safety, IDE support, refactoring |
| Build Tool | Vite | Fast HMR, native ESM, simple config |
| Styling | CSS Modules + Variables | Scoped styles, design tokens |
| State | Zustand or Signals | Lightweight, TypeScript native |
| Testing | Vitest | Vite-native, fast, compatible |
| Components | Vanilla TS + Web Components | No framework lock-in, portable |

---

## 3. Directory Structure

```
Nano_Banana_Pro_v3/
├── index.html                      # Minimal shell (< 50 lines)
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Build configuration
├── .env.local                      # API keys (gitignored)
├── ROADMAP.md                      # This document
│
├── src/
│   ├── main.ts                     # Application entry point
│   ├── app.ts                      # App initialization
│   │
│   ├── types/
│   │   ├── index.ts                # Re-exports all types
│   │   ├── node.types.ts           # Node entity types
│   │   ├── canvas.types.ts         # Canvas/viewport types
│   │   ├── connection.types.ts     # Wire/connection types
│   │   ├── generation.types.ts     # Image generation types
│   │   ├── ui.types.ts             # UI component types
│   │   └── events.types.ts         # Event payload types
│   │
│   ├── core/
│   │   ├── engine/
│   │   │   ├── NodeSystem.ts       # Main canvas engine
│   │   │   ├── ViewportManager.ts  # Pan, zoom, transform
│   │   │   ├── ConnectionManager.ts # Wire rendering
│   │   │   └── SelectionManager.ts # Multi-select, box select
│   │   │
│   │   ├── entities/
│   │   │   ├── Node.ts             # Node entity class
│   │   │   ├── NodeFactory.ts      # Node creation patterns
│   │   │   ├── Connection.ts       # Connection entity
│   │   │   └── Port.ts             # Input/output ports
│   │   │
│   │   └── events/
│   │       ├── EventBus.ts         # Pub/sub system
│   │       ├── EventTypes.ts       # Event constants
│   │       └── EventHandlers.ts    # Global handlers
│   │
│   ├── state/
│   │   ├── store.ts                # Main state store
│   │   ├── slices/
│   │   │   ├── nodesSlice.ts       # Node state management
│   │   │   ├── canvasSlice.ts      # Viewport state
│   │   │   ├── selectionSlice.ts   # Selection state
│   │   │   ├── generationSlice.ts  # Generation queue
│   │   │   └── uiSlice.ts          # UI state (modals, drawers)
│   │   │
│   │   └── persistence/
│   │       ├── StorageAdapter.ts   # IndexedDB abstraction
│   │       ├── ProjectManager.ts   # Save/load projects
│   │       └── HistoryManager.ts   # Undo/redo stack
│   │
│   ├── services/
│   │   ├── geminiService.ts        # [EXISTS] API communication
│   │   ├── imageService.ts         # Image processing utils
│   │   ├── exportService.ts        # Export to PNG, JSON
│   │   └── analyticsService.ts     # Usage tracking (optional)
│   │
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── Canvas.ts           # Main canvas component
│   │   │   ├── Grid.ts             # Dot matrix background
│   │   │   ├── Minimap.ts          # Navigation minimap
│   │   │   └── canvas.css          # Canvas styles
│   │   │
│   │   ├── nodes/
│   │   │   ├── NodeCard.ts         # Visual node component
│   │   │   ├── NodeImage.ts        # Image display area
│   │   │   ├── NodeFooter.ts       # Prompt/title display
│   │   │   ├── NodePorts.ts        # Port UI elements
│   │   │   ├── GhostNode.ts        # Loading placeholder
│   │   │   └── nodes.css           # Node styles
│   │   │
│   │   ├── connections/
│   │   │   ├── Wire.ts             # SVG wire component
│   │   │   ├── WirePreview.ts      # Drag-to-connect preview
│   │   │   └── connections.css     # Wire styles
│   │   │
│   │   ├── ui/
│   │   │   ├── TopBar.ts           # Header/branding
│   │   │   ├── LeftDrawer.ts       # Tool palette
│   │   │   ├── PromptIsland.ts     # Main input area
│   │   │   ├── ReferenceDropzone.ts # Image drop target
│   │   │   ├── SettingsPanel.ts    # Generation settings
│   │   │   ├── ContextMenu.ts      # Right-click menu
│   │   │   └── ui.css              # UI overlay styles
│   │   │
│   │   └── shared/
│   │       ├── Button.ts           # Reusable button
│   │       ├── Input.ts            # Text input
│   │       ├── Badge.ts            # Meta badges
│   │       ├── Modal.ts            # Dialog wrapper
│   │       └── shared.css          # Shared styles
│   │
│   ├── styles/
│   │   ├── tokens.css              # Design tokens (CSS vars)
│   │   ├── reset.css               # CSS reset/normalize
│   │   ├── typography.css          # Font styles
│   │   ├── animations.css          # Keyframe animations
│   │   └── main.css                # Style imports
│   │
│   └── utils/
│       ├── dom.ts                  # DOM helper functions
│       ├── math.ts                 # Vector, bezier math
│       ├── debounce.ts             # Performance utils
│       ├── id.ts                   # ID generation
│       └── validation.ts           # Input validation
│
├── tests/
│   ├── unit/
│   │   ├── entities/
│   │   ├── services/
│   │   └── utils/
│   │
│   └── integration/
│       ├── canvas.test.ts
│       └── generation.test.ts
│
└── docs/
    ├── api-guide.md                # [EXISTS] Moved from root
    ├── architecture.md             # Technical decisions
    └── contributing.md             # Development guide
```

---

## 4. Phase Structure Checklist

The Phase Structure guides which items populate the To-Do List. Complete phases sequentially; each phase unlocks the next tier of refinement.

### Phase 0: Foundation (Unlocks Phase 1)
- [ ] **0.1** Initialize package.json with Vite + TypeScript
- [ ] **0.2** Configure tsconfig.json with strict mode
- [ ] **0.3** Create vite.config.ts with dev/build settings
- [ ] **0.4** Set up .env.local with VITE_GEMINI_API_KEY
- [ ] **0.5** Create src/ directory structure skeleton
- [ ] **0.6** Create minimal index.html shell (mount point only)
- [ ] **0.7** Create src/main.ts entry point
- [ ] **0.8** Verify dev server runs with hot reload

### Phase 1: Type System (Unlocks Phase 2)
- [ ] **1.1** Define node.types.ts (NodeConfig, NodeState, NodePosition)
- [ ] **1.2** Define canvas.types.ts (ViewportState, Transform, Bounds)
- [ ] **1.3** Define connection.types.ts (Wire, Port, ConnectionPoint)
- [ ] **1.4** Define generation.types.ts (already partially in geminiService)
- [ ] **1.5** Define ui.types.ts (DrawerState, ModalState, PromptState)
- [ ] **1.6** Define events.types.ts (all event payloads)
- [ ] **1.7** Create types/index.ts barrel export
- [ ] **1.8** Update geminiService.ts to import shared types

### Phase 2: Style Extraction (Unlocks Phase 3)
- [ ] **2.1** Extract CSS variables to styles/tokens.css
- [ ] **2.2** Create styles/reset.css from global resets
- [ ] **2.3** Create styles/typography.css
- [ ] **2.4** Extract keyframes to styles/animations.css
- [ ] **2.5** Create styles/main.css with imports
- [ ] **2.6** Update index.html to reference compiled CSS
- [ ] **2.7** Remove all inline styles from index.html
- [ ] **2.8** Verify visual parity with original demo

### Phase 3: Core Engine (Unlocks Phase 4)
- [ ] **3.1** Create core/engine/ViewportManager.ts from pan/zoom logic
- [ ] **3.2** Create core/engine/ConnectionManager.ts from wire logic
- [ ] **3.3** Create core/engine/SelectionManager.ts (new feature)
- [ ] **3.4** Create core/engine/NodeSystem.ts as orchestrator
- [ ] **3.5** Create core/entities/Node.ts from Node class
- [ ] **3.6** Create core/entities/Connection.ts
- [ ] **3.7** Create core/entities/Port.ts
- [ ] **3.8** Create core/entities/NodeFactory.ts

### Phase 4: Event System (Unlocks Phase 5)
- [ ] **4.1** Create core/events/EventBus.ts (pub/sub)
- [ ] **4.2** Define core/events/EventTypes.ts constants
- [ ] **4.3** Create core/events/EventHandlers.ts
- [ ] **4.4** Refactor NodeSystem to emit events
- [ ] **4.5** Refactor Node to emit events
- [ ] **4.6** Remove direct DOM event coupling
- [ ] **4.7** Add event debugging/logging
- [ ] **4.8** Document event flow diagram

### Phase 5: State Management (Unlocks Phase 6)
- [ ] **5.1** Create state/store.ts main store
- [ ] **5.2** Create state/slices/nodesSlice.ts
- [ ] **5.3** Create state/slices/canvasSlice.ts
- [ ] **5.4** Create state/slices/selectionSlice.ts
- [ ] **5.5** Create state/slices/generationSlice.ts
- [ ] **5.6** Create state/slices/uiSlice.ts
- [ ] **5.7** Connect EventBus to state mutations
- [ ] **5.8** Add state change subscriptions to UI

### Phase 6: Component Extraction (Unlocks Phase 7)
- [ ] **6.1** Create components/canvas/Canvas.ts
- [ ] **6.2** Create components/canvas/Grid.ts
- [ ] **6.3** Create components/nodes/NodeCard.ts
- [ ] **6.4** Create components/nodes/GhostNode.ts
- [ ] **6.5** Create components/connections/Wire.ts
- [ ] **6.6** Create components/ui/TopBar.ts
- [ ] **6.7** Create components/ui/LeftDrawer.ts
- [ ] **6.8** Create components/ui/PromptIsland.ts

### Phase 7: Service Integration (Unlocks Phase 8)
- [ ] **7.1** Move geminiService.ts to src/services/
- [ ] **7.2** Create services/imageService.ts (base64, resize)
- [ ] **7.3** Create services/exportService.ts (PNG, JSON)
- [ ] **7.4** Connect PromptIsland to generationSlice
- [ ] **7.5** Connect generationSlice to geminiService
- [ ] **7.6** Implement generation queue system
- [ ] **7.7** Add error handling UI
- [ ] **7.8** Add loading states to nodes

### Phase 8: Persistence (Unlocks Phase 9)
- [ ] **8.1** Create state/persistence/StorageAdapter.ts
- [ ] **8.2** Create state/persistence/ProjectManager.ts
- [ ] **8.3** Create state/persistence/HistoryManager.ts
- [ ] **8.4** Implement auto-save on state change
- [ ] **8.5** Implement undo/redo commands
- [ ] **8.6** Add project save/load UI
- [ ] **8.7** Add keyboard shortcuts (Ctrl+Z, Ctrl+S)
- [ ] **8.8** Test persistence across browser refresh

### Phase 9: Advanced Features (Unlocks Phase 10)
- [ ] **9.1** Create components/canvas/Minimap.ts
- [ ] **9.2** Create components/ui/ContextMenu.ts
- [ ] **9.3** Implement box selection
- [ ] **9.4** Implement multi-node drag
- [ ] **9.5** Implement node copy/paste
- [ ] **9.6** Implement node grouping
- [ ] **9.7** Implement branch comparison view
- [ ] **9.8** Add keyboard navigation

### Phase 10: Polish & Testing (Continuous)
- [ ] **10.1** Write unit tests for entities
- [ ] **10.2** Write unit tests for services
- [ ] **10.3** Write integration tests for canvas
- [ ] **10.4** Write integration tests for generation flow
- [ ] **10.5** Performance audit (Lighthouse)
- [ ] **10.6** Accessibility audit (a11y)
- [ ] **10.7** Mobile responsive adjustments
- [ ] **10.8** Documentation completion

---

## 5. Active To-Do List (30 Items)

**Current Phase:** Phase 0 - Foundation
**Last Updated:** [Auto-update on checklist changes]

The To-Do List maintains exactly 30 active items. As items complete, new items flow in from the Phase Checklist based on the Circular Refinement Protocol.

### Infrastructure (Items 1-10)
| # | Status | Task | Phase | File(s) Affected |
|---|--------|------|-------|------------------|
| 1 | [ ] | Initialize package.json with dependencies | 0.1 | `package.json` |
| 2 | [ ] | Configure TypeScript strict mode | 0.2 | `tsconfig.json` |
| 3 | [ ] | Create Vite configuration | 0.3 | `vite.config.ts` |
| 4 | [ ] | Set up environment variables | 0.4 | `.env.local`, `.env.example` |
| 5 | [ ] | Create src/ directory skeleton | 0.5 | `src/**/*` |
| 6 | [ ] | Reduce index.html to minimal shell | 0.6 | `index.html` |
| 7 | [ ] | Create application entry point | 0.7 | `src/main.ts` |
| 8 | [ ] | Verify hot reload functionality | 0.8 | N/A (verification) |
| 9 | [ ] | Define NodeConfig interface | 1.1 | `src/types/node.types.ts` |
| 10 | [ ] | Define ViewportState interface | 1.2 | `src/types/canvas.types.ts` |

### Type Definitions (Items 11-15)
| # | Status | Task | Phase | File(s) Affected |
|---|--------|------|-------|------------------|
| 11 | [ ] | Define Wire and Port interfaces | 1.3 | `src/types/connection.types.ts` |
| 12 | [ ] | Consolidate generation types | 1.4 | `src/types/generation.types.ts` |
| 13 | [ ] | Define UI state interfaces | 1.5 | `src/types/ui.types.ts` |
| 14 | [ ] | Define event payload types | 1.6 | `src/types/events.types.ts` |
| 15 | [ ] | Create types barrel export | 1.7 | `src/types/index.ts` |

### Style Extraction (Items 16-22)
| # | Status | Task | Phase | File(s) Affected |
|---|--------|------|-------|------------------|
| 16 | [ ] | Extract CSS custom properties | 2.1 | `src/styles/tokens.css` |
| 17 | [ ] | Create CSS reset file | 2.2 | `src/styles/reset.css` |
| 18 | [ ] | Extract typography styles | 2.3 | `src/styles/typography.css` |
| 19 | [ ] | Extract animation keyframes | 2.4 | `src/styles/animations.css` |
| 20 | [ ] | Create main CSS import file | 2.5 | `src/styles/main.css` |
| 21 | [ ] | Update index.html CSS reference | 2.6 | `index.html` |
| 22 | [ ] | Remove inline styles completely | 2.7 | `index.html` |

### Core Engine Preparation (Items 23-30)
| # | Status | Task | Phase | File(s) Affected |
|---|--------|------|-------|------------------|
| 23 | [ ] | Extract ViewportManager class | 3.1 | `src/core/engine/ViewportManager.ts` |
| 24 | [ ] | Extract ConnectionManager class | 3.2 | `src/core/engine/ConnectionManager.ts` |
| 25 | [ ] | Create SelectionManager class | 3.3 | `src/core/engine/SelectionManager.ts` |
| 26 | [ ] | Refactor NodeSystem as orchestrator | 3.4 | `src/core/engine/NodeSystem.ts` |
| 27 | [ ] | Extract Node entity class | 3.5 | `src/core/entities/Node.ts` |
| 28 | [ ] | Create Connection entity | 3.6 | `src/core/entities/Connection.ts` |
| 29 | [ ] | Create Port entity | 3.7 | `src/core/entities/Port.ts` |
| 30 | [ ] | Create NodeFactory | 3.8 | `src/core/entities/NodeFactory.ts` |

---

## 6. Circular Refinement Protocol

### 6.1 The 30-Item Invariant

The To-Do List must **always contain exactly 30 items**. This constraint ensures:
- Predictable workload visibility
- Continuous forward momentum
- No paralysis from overwhelming backlogs
- Clear scope boundaries

### 6.2 Item Flow Rules

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE CHECKLIST                          │
│  (Backlog organized by architectural phases)               │
│                                                             │
│   Phase 0 ──► Phase 1 ──► Phase 2 ──► ... ──► Phase N      │
│      │           │           │                    │         │
│      ▼           ▼           ▼                    ▼         │
│   ┌─────────────────────────────────────────────────┐      │
│   │         ACTIVE TO-DO LIST (30 Items)            │      │
│   │                                                  │      │
│   │  When item completes:                           │      │
│   │  1. Mark [x] in To-Do                           │      │
│   │  2. Pull next item from current Phase           │      │
│   │  3. If Phase empty, pull from next Phase        │      │
│   │  4. If adding new feature, add to future Phase  │      │
│   └──────────────────────────────────────────────────┘      │
│                           │                                 │
│                           ▼                                 │
│                    ┌──────────────┐                        │
│                    │   COMPLETED  │                        │
│                    │    ARCHIVE   │                        │
│                    └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Refinement Triggers

| Trigger | Action |
|---------|--------|
| Task Completed | Pull next from Phase Checklist |
| Bug Discovered | Insert as high-priority item, push lowest-priority item back to Phase |
| Scope Change | Evaluate against Phase goals, add to appropriate Phase |
| Blocker Found | Split task, add sub-tasks, adjust To-Do accordingly |
| Phase Complete | Celebrate milestone, pull 8 items from next Phase |

### 6.4 Priority Weighting

Items in the To-Do List are ordered by:
1. **Blockers** (items that unblock others)
2. **Current Phase** (items from active phase)
3. **Look-Ahead** (items from next phase for parallelism)
4. **Technical Debt** (items that reduce complexity)

### 6.5 Weekly Refinement Ceremony

Every week (or every 10 completed items):
1. Review completed items
2. Validate remaining items are still relevant
3. Check Phase progress
4. Rebalance To-Do if phases shifted
5. Document lessons learned

---

## 7. Module Decomposition Plan

### 7.1 index.html Extraction Map

```
index.html (591 lines)
│
├─── LINES 7-17: CSS Variables
│    └──► src/styles/tokens.css
│
├─── LINES 19-28: Global Resets
│    └──► src/styles/reset.css
│
├─── LINES 30-72: Workspace/Wire Styles
│    └──► src/components/canvas/canvas.css
│
├─── LINES 74-206: Node Component Styles
│    └──► src/components/nodes/nodes.css
│
├─── LINES 208-249: UI Overlay Styles
│    └──► src/components/ui/ui.css
│
├─── LINES 252-277: HTML Structure (UI Layer)
│    ├──► src/components/ui/TopBar.ts
│    ├──► src/components/ui/LeftDrawer.ts
│    └──► src/components/ui/PromptIsland.ts
│
├─── LINES 279-280: HTML Structure (Workspace)
│    └──► src/components/canvas/Canvas.ts
│
├─── LINES 285-402: NodeSystem Class
│    ├──► src/core/engine/NodeSystem.ts
│    ├──► src/core/engine/ViewportManager.ts
│    └──► src/core/engine/ConnectionManager.ts
│
├─── LINES 404-507: Node Class
│    ├──► src/core/entities/Node.ts
│    ├──► src/components/nodes/NodeCard.ts
│    └──► src/components/nodes/GhostNode.ts
│
├─── LINES 509-561: Demo Initialization
│    └──► DELETE (replaced by real data flow)
│
└─── LINES 563-588: Simulation Functions
     └──► MIGRATE to src/state/slices/generationSlice.ts
```

### 7.2 Dependency Graph (Post-Extraction)

```
                    ┌─────────────┐
                    │   main.ts   │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  store   │◄───│   app    │───►│ services │
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │               │
         │         ┌─────┴─────┐         │
         │         ▼           ▼         │
         │   ┌──────────┐ ┌──────────┐   │
         │   │  Canvas  │ │    UI    │   │
         │   │Components│ │Components│   │
         │   └────┬─────┘ └────┬─────┘   │
         │        │            │         │
         │        └─────┬──────┘         │
         │              │                │
         ▼              ▼                ▼
    ┌─────────────────────────────────────────┐
    │           core/engine + entities        │
    │  (NodeSystem, Node, Connection, etc.)   │
    └─────────────────────────────────────────┘
                        │
                        ▼
               ┌─────────────────┐
               │     types/*     │
               └─────────────────┘
```

---

## 8. Integration Patterns

### 8.1 Component Communication

```typescript
// Pattern: Event-Driven Loose Coupling

// components/ui/PromptIsland.ts
class PromptIsland {
  private eventBus: EventBus;

  onGenerate() {
    this.eventBus.emit('generation:requested', {
      prompt: this.getPromptValue(),
      referenceImages: this.getReferences(),
      config: this.getConfig()
    });
  }
}

// state/slices/generationSlice.ts
eventBus.on('generation:requested', async (payload) => {
  store.setState({ status: 'generating' });
  const result = await geminiService.generateImages(payload);
  store.setState({ latestResult: result, status: 'complete' });
  eventBus.emit('generation:complete', result);
});

// core/engine/NodeSystem.ts
eventBus.on('generation:complete', (result) => {
  this.replaceGhostWithResult(result);
});
```

### 8.2 State Subscription Pattern

```typescript
// Pattern: Selective Re-rendering

// components/nodes/NodeCard.ts
class NodeCard {
  constructor(nodeId: string) {
    // Only re-render when THIS node changes
    store.subscribe(
      (state) => state.nodes[nodeId],
      (nodeState) => this.render(nodeState)
    );
  }
}
```

### 8.3 Service Injection Pattern

```typescript
// Pattern: Dependency Injection for Testability

// services/index.ts
export const createServices = (config: AppConfig) => ({
  gemini: new GeminiService(config.apiKey),
  image: new ImageService(),
  export: new ExportService(),
  storage: new StorageAdapter(config.dbName)
});

// main.ts
const services = createServices(getConfig());
const app = new App(services);
```

---

## 9. Expansion Guidelines

### 9.1 Adding a New Feature

When a new feature is proposed:

1. **Classify the Feature**
   - UI Component? → Add to Phase 6 or new UI phase
   - Core Engine? → Add to Phase 3 or 4
   - Service? → Add to Phase 7
   - New Capability? → Create new Phase 11+

2. **Define the Integration Points**
   - Which types need extending?
   - Which events need adding?
   - Which state slices are affected?
   - Which components need updating?

3. **Add to Phase Checklist**
   - Create sub-items under appropriate phase
   - Link dependencies between items
   - Estimate complexity (S/M/L)

4. **Wait for Circular Flow**
   - Items will flow into To-Do List naturally
   - Don't jump ahead of current phase unless critical

### 9.2 Example: Adding "Branch Comparison View"

```markdown
### Phase 9.7: Branch Comparison View

**Objective:** Allow users to compare two branches of the generation tree side-by-side.

**Type Additions:**
- `src/types/comparison.types.ts`
  - `ComparisonPair { leftNodeId: string, rightNodeId: string }`
  - `ComparisonState { active: boolean, pairs: ComparisonPair[] }`

**State Additions:**
- `src/state/slices/comparisonSlice.ts`
  - Actions: `startComparison`, `addPair`, `exitComparison`

**Event Additions:**
- `comparison:started`
- `comparison:pair-added`
- `comparison:exited`

**Component Additions:**
- `src/components/ui/ComparisonPanel.ts`
  - Split-view container
  - Sync scrolling
  - Diff highlighting

**Integration:**
- LeftDrawer: Add "Compare" button
- NodeCard: Add "Add to Comparison" context menu option
- Canvas: Highlight compared nodes
```

### 9.3 Scaling Rules

| Scale Factor | Approach |
|--------------|----------|
| More node types | Extend NodeFactory, add to types |
| More services | Follow existing service pattern |
| More UI panels | Create in components/ui/, connect to uiSlice |
| Performance issues | Profile, memoize, virtualize |
| Team growth | Split phases across contributors |

---

## Appendix A: Quick Reference

### File Responsibility Matrix

| Concern | File(s) | Owner Phase |
|---------|---------|-------------|
| Design Tokens | `styles/tokens.css` | Phase 2 |
| Type Definitions | `types/*.ts` | Phase 1 |
| Engine Logic | `core/engine/*.ts` | Phase 3 |
| Entity Models | `core/entities/*.ts` | Phase 3 |
| Event System | `core/events/*.ts` | Phase 4 |
| State Management | `state/**/*.ts` | Phase 5 |
| UI Components | `components/ui/*.ts` | Phase 6 |
| Canvas Components | `components/canvas/*.ts` | Phase 6 |
| Node Components | `components/nodes/*.ts` | Phase 6 |
| API Services | `services/*.ts` | Phase 7 |
| Persistence | `state/persistence/*.ts` | Phase 8 |

### Command Cheat Sheet

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Lint code
npm run typecheck    # Type checking

# Git Workflow
git checkout -b feature/phase-X-item
# ... make changes ...
git commit -m "feat(phase-X): description"
git push -u origin feature/phase-X-item
```

---

**Document Maintenance:** This roadmap is a living document. Update the Phase Checklist and To-Do List as work progresses. The 30-item invariant must be maintained at all times.
