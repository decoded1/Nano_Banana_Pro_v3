# CSS/UI Audit Report

**Project:** Nano Banana Pro v3
**Date:** 2025-11-21
**Auditor:** Frontend UI/UX Quality Engineer
**Scope:** All CSS sources (tokens, reset, typography, animations, canvas, nodes, ui)

---

## Executive Summary

The CSS architecture shows good foundational practices with design tokens, modular organization, and consistent use of CSS custom properties. However, several issues impact polish, consistency, and accessibility:

### Top Issues Impacting Polish and UX

1. **Critical: Missing focus states** - No visible focus indicators for keyboard navigation (WCAG violation)
2. **High: Inconsistent spacing scale** - Non-uniform increments break visual rhythm
3. **High: Hard-coded values** - 15+ instances of magic numbers and colors outside the token system
4. **Medium: Inconsistent animation timing** - Animations use different durations without clear rationale
5. **Medium: Missing semantic color tokens** - Success/error/warning colors are hard-coded

---

## 1. Spacing & Layout Issues

### 1.1 Non-Standard Spacing Scale

**Problem:** The current spacing scale uses arbitrary increments that don't follow a consistent ratio.

```css
/* Current (tokens.css:60-70) */
--space-2xs: 2px; /* +2 */
--space-xs: 4px; /* +2 */
--space-sm: 6px; /* +2 */
--space-md: 8px; /* +2 */
--space-lg: 10px; /* +2 */
--space-xl: 12px; /* +2 */
--space-2xl: 16px; /* +4 */
--space-3xl: 20px; /* +4 */
--space-4xl: 24px; /* +4 */
--space-5xl: 30px; /* +6 */
--space-6xl: 40px; /* +10 */
```

**Issue:** The scale lacks a mathematical relationship. Values like 6px, 10px, and 30px create visual inconsistency.

**Recommendation:** Adopt an 8px base unit with 4px for small values:

```css
/* Proposed: 4px base scale (4, 8, 12, 16, 24, 32, 48, 64) */
--space-1: 4px; /* 1x base */
--space-2: 8px; /* 2x base */
--space-3: 12px; /* 3x base */
--space-4: 16px; /* 4x base */
--space-6: 24px; /* 6x base */
--space-8: 32px; /* 8x base */
--space-12: 48px; /* 12x base */
--space-16: 64px; /* 16x base */
```

### 1.2 Hard-Coded Layout Values

**Problem:** Several one-off values exist outside the token system.

| Location        | Value   | Issue                         |
| --------------- | ------- | ----------------------------- |
| `nodes.css:157` | `40px`  | Pulse ring size not tokenized |
| `ui.css:217`    | `120px` | Toast container bottom offset |
| `ui.css:262`    | `160px` | Context menu min-width        |

**Recommendation:** Add to tokens.css:

```css
/* Component-specific sizes */
--pulse-ring-size: 40px;
--toast-bottom-offset: 120px;
--context-menu-min-width: 160px;
```

### 1.3 Border Radius Inconsistency

**Problem:** Radius scale has irregular jumps: 4px, 12px, 14px, 16px, 24px, 35px

```css
/* Current - note the 12px/14px/16px cluster */
--radius-xs: 4px;
--radius-sm: 12px;
--radius-md: 14px; /* Why 14? */
--radius-lg: 16px;
--radius-xl: 24px;
--radius-2xl: 35px; /* Why 35? */
```

**Recommendation:** Simplify to a consistent scale:

```css
--radius-xs: 4px;
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
--radius-2xl: 32px;
--radius-full: 9999px; /* Use large value for pill shapes */
```

---

## 2. Typography Issues

### 2.1 Irregular Font Size Scale

**Problem:** Font sizes don't follow a typographic scale.

```css
/* Current - irregular increments */
--font-size-2xs: 10px; /* +1 */
--font-size-xs: 11px; /* +3 */
--font-size-sm: 14px; /* +1 */
--font-size-md: 15px; /* +3 */
--font-size-lg: 18px; /* +2 */
--font-size-xl: 20px;
```

**Recommendation:** Use a modular scale (1.25 ratio from 14px base):

```css
--font-size-xs: 11px; /* 14 / 1.25 */
--font-size-sm: 13px; /* base - 1 */
--font-size-md: 14px; /* base */
--font-size-lg: 16px; /* base + 2 */
--font-size-xl: 18px; /* 14 * 1.25 */
--font-size-2xl: 22px; /* 18 * 1.25 */
```

### 2.2 Missing Font Size Variants

**Problem:** No heading sizes defined. Typography utilities exist but aren't used.

**Recommendation:** Add heading scale:

```css
--font-size-h1: 32px;
--font-size-h2: 24px;
--font-size-h3: 20px;
--font-size-h4: 18px;
```

### 2.3 Limited Line Height Options

**Problem:** Only two line heights (1.3, 1.5) may not cover all use cases.

**Recommendation:** Add one more for dense UI:

```css
--line-height-none: 1;
--line-height-tight: 1.25;
--line-height-snug: 1.375;
--line-height-normal: 1.5;
--line-height-relaxed: 1.625;
```

---

## 3. Colors & Contrast Issues

### 3.1 Hard-Coded Colors (Not Tokenized)

**Critical:** Multiple colors exist outside the design system:

| Location         | Color     | Purpose                   |
| ---------------- | --------- | ------------------------- |
| `nodes.css:73`   | `#000`    | Node image background     |
| `canvas.css:100` | `#f44`    | Invalid wire stroke       |
| `ui.css:240`     | `#4caf50` | Toast success border      |
| `ui.css:244`     | `#f44336` | Toast error border        |
| `ui.css:248`     | `#ff9800` | Toast warning border      |
| `ui.css:284`     | `#f44336` | Context menu danger color |

**Recommendation:** Add semantic color tokens:

```css
/* Semantic Colors */
--color-success: #4caf50;
--color-error: #f44336;
--color-warning: #ff9800;
--color-info: var(--color-accent-secondary);

/* Semantic Background */
--color-bg-black: #000;
```

### 3.2 Inline RGB Values

**Problem:** Multiple inline `rgb()` values create maintenance burden:

```css
/* Found in multiple files */
rgb(255 255 255 / 5%)   /* ui.css:83 */
rgb(255 255 255 / 10%)  /* ui.css:97, 280 */
rgb(68 138 255 / 10%)   /* ui.css:151 */
rgb(124 77 255 / 40%)   /* ui.css:198 */
```

**Recommendation:** Add opacity variants to tokens:

```css
--color-white-5: rgb(255 255 255 / 5%);
--color-white-10: rgb(255 255 255 / 10%);
--color-accent-secondary-10: rgb(68 138 255 / 10%);
--color-accent-primary-40: rgb(124 77 255 / 40%);
```

### 3.3 Contrast Considerations

**Observation:** The muted text color (`#8b9bb4`) on dark background (`#0f1115`) has ~4.9:1 contrast ratio, which passes WCAG AA for normal text but is borderline. Consider slightly lighter shade for better readability.

---

## 4. Animations & Transitions Issues

### 4.1 Inconsistent Animation Durations

**Problem:** Animations use different durations without clear rationale:

| Animation        | Duration | Location              |
| ---------------- | -------- | --------------------- |
| `pulse`          | `2s`     | animations.css:90     |
| `pulse` (port)   | `1s`     | nodes.css:227         |
| `spin`           | `1s`     | animations.css:110    |
| Fade/scale/slide | `0.3s`   | animations.css:95-105 |

**Issue:** The same animation (`pulse`) uses different durations in different contexts.

**Recommendation:** Standardize animation durations:

```css
/* Animation Duration Tokens */
--duration-instant: 100ms;
--duration-fast: 200ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
--duration-slower: 1000ms;
--duration-slowest: 2000ms;

/* Usage */
.animate-pulse {
  animation: pulse var(--duration-slowest) infinite;
}
.port.valid-target {
  animation: pulse var(--duration-slower) infinite;
}
```

### 4.2 Inconsistent Easing Functions

**Problem:** Mixed use of `ease`, `ease-out`, and `linear`:

```css
/* Found variations */
--transition-fast: 0.1s ease; /* tokens.css */
animation: fade-in 0.3s ease-out; /* animations.css */
animation: spin 1s linear infinite; /* animations.css */
```

**Recommendation:** Define standard easing tokens:

```css
/* Easing Functions */
--ease-default: cubic-bezier(0.4, 0, 0.2, 1); /* Standard */
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-linear: linear;

/* Update transitions */
--transition-fast: 100ms var(--ease-default);
--transition-normal: 200ms var(--ease-default);
--transition-slow: 300ms var(--ease-default);
```

### 4.3 Missing Entrance/Exit Consistency

**Problem:** Different components use different entrance animations without clear pattern.

| Component    | Animation  | Duration |
| ------------ | ---------- | -------- |
| Toast        | `slide-up` | `0.3s`   |
| Context menu | `scale-in` | `0.1s`   |

**Recommendation:** Establish animation patterns:

- **Overlays (modals, menus):** `scale-in` with fast duration
- **Notifications (toasts):** `slide-up` with normal duration
- **Elements appearing:** `fade-in` with normal duration

---

## 5. Interactive States Issues

### 5.1 CRITICAL: Missing Focus States

**Problem:** No `:focus` or `:focus-visible` styles defined anywhere. This is a WCAG 2.1 accessibility violation (2.4.7 Focus Visible - Level AA).

**Affected elements:**

- `.drawer-item` - clickable, no focus style
- `.ref-dropzone` - clickable, no focus style
- `.generate-btn` - button, no focus style
- `.prompt-input` - input, no focus style
- `.context-menu-item` - clickable, no focus style
- `.port` - interactive, no focus style

**Recommendation:** Add focus-visible styles:

```css
/* Global focus style in reset.css */
:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
}

/* Or component-specific */
.generate-btn:focus-visible {
  outline: 2px solid var(--color-text-white);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--color-accent-primary-glow);
}

.drawer-item:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: -2px;
}

.prompt-input:focus-visible {
  outline: none; /* Input is in container */
}

/* Focus indicator for prompt island when input focused */
.prompt-island:focus-within {
  border-color: var(--color-accent-primary);
  box-shadow: 0 0 0 2px var(--color-accent-primary-glow);
}
```

### 5.2 Incomplete Active States

**Problem:** Only some elements have `:active` states.

**Has active state:**

- `.workspace:active` - cursor change
- `.generate-btn:active` - transform reset

**Missing active state:**

- `.drawer-item` - should have pressed feedback
- `.ref-dropzone` - should have pressed feedback
- `.context-menu-item` - should have pressed feedback

**Recommendation:**

```css
.drawer-item:active {
  transform: scale(0.95);
}

.ref-dropzone:active {
  transform: scale(0.98);
}

.context-menu-item:active {
  background: rgb(255 255 255 / 15%);
}
```

### 5.3 Hover State Gaps

**Problem:** Some interactive elements lack hover feedback.

**Missing hover:**

- `.node-image-container img` - has hover via parent, but no direct indicator
- `.meta-badge` - could show more info on hover

**Recommendation:** Consider subtle hover enhancements for discoverability.

---

## 6. Maintainability & Redundancy Issues

### 6.1 Legacy Alias Tokens

**Problem:** `tokens.css` contains legacy aliases that duplicate values:

```css
/* Legacy aliases for backwards compatibility */
--bg-color: var(--color-bg-primary);
--grid-dot: var(--color-grid-dot);
--glass-bg: var(--color-bg-glass);
/* ... 5 more */
```

**Recommendation:**

1. Search codebase for legacy alias usage
2. Replace with semantic names
3. Remove aliases in future version

### 6.2 Repeated Style Patterns

**Problem:** Similar glass-morphism styles repeated across components:

```css
/* Pattern repeated 5+ times */
background: var(--color-bg-glass);
backdrop-filter: blur(var(--blur-md));
border: 1px solid var(--color-border-glass);
border-radius: var(--radius-...);
```

**Recommendation:** Create a glass utility class:

```css
/* In a utilities.css file */
.glass {
  background: var(--color-bg-glass);
  backdrop-filter: blur(var(--blur-md));
  border: 1px solid var(--color-border-glass);
}

.glass-lg {
  backdrop-filter: blur(var(--blur-lg));
}
```

### 6.3 Duplicated Transition Declarations

**Problem:** Multi-property transitions repeated with similar patterns:

```css
/* nodes.css */
transition:
  transform var(--transition-fast),
  box-shadow var(--transition-normal),
  border-color var(--transition-normal);

/* ui.css - similar pattern */
transition:
  background var(--transition-normal),
  color var(--transition-normal),
  border-color var(--transition-normal);
```

**Recommendation:** Create transition utilities:

```css
.transition-interactive {
  transition:
    transform var(--transition-fast),
    background var(--transition-normal),
    color var(--transition-normal),
    border-color var(--transition-normal),
    box-shadow var(--transition-normal),
    opacity var(--transition-normal);
}
```

### 6.4 Unused Typography Utilities

**Observation:** Typography utilities in `typography.css` may be unused since components define styles inline. Consider:

- Document which utilities are available
- Audit component CSS to use utilities where applicable
- Or remove if following component-scoped approach

---

## 7. Quality-of-Life UI/UX Refinements

### 7.1 Tap Target Sizes

**Current Status:** Generally good

- `.drawer-item`: 44x44px (meets 44px minimum)
- `.generate-btn`: 44px height (good)
- `.ref-dropzone`: 48x48px (good)
- `.port`: 8x8px with 20x20px wrapper (borderline)

**Recommendation:** Port click area could be larger for touch:

```css
.port-wrapper {
  width: 24px; /* Increase from 20px */
  height: 24px;
}
```

### 7.2 Visual Feedback Timing

**Issue:** The `--transition-fast` (0.1s) may be too fast for some users to perceive.

**Recommendation:** Consider 150ms as minimum perceptible duration:

```css
--transition-fast: 150ms var(--ease-default);
--transition-normal: 250ms var(--ease-default);
--transition-slow: 350ms var(--ease-default);
```

### 7.3 Disabled State Visibility

**Current:** `.generate-btn:disabled` uses `opacity: 0.5`

**Issue:** 50% opacity may not provide enough contrast on some displays.

**Recommendation:**

```css
.generate-btn:disabled {
  opacity: 0.6;
  filter: grayscale(30%);
  cursor: not-allowed;
  transform: none;
}
```

---

## Polish & Consistency Guidelines

### Standard Spacing Scale (Proposed)

| Token        | Value | Use Case                   |
| ------------ | ----- | -------------------------- |
| `--space-1`  | 4px   | Tight gaps, icon margins   |
| `--space-2`  | 8px   | Default small spacing      |
| `--space-3`  | 12px  | Component internal padding |
| `--space-4`  | 16px  | Standard padding           |
| `--space-6`  | 24px  | Section spacing            |
| `--space-8`  | 32px  | Large component gaps       |
| `--space-12` | 48px  | Page section margins       |

### Standard Font Sizes (Proposed)

| Token            | Value | Use Case             |
| ---------------- | ----- | -------------------- |
| `--font-size-xs` | 11px  | Badges, meta info    |
| `--font-size-sm` | 13px  | Secondary text       |
| `--font-size-md` | 14px  | Body text, UI labels |
| `--font-size-lg` | 16px  | Emphasized text      |
| `--font-size-xl` | 18px  | Subheadings          |

### Standard Animation Timings

| Token               | Value | Use Case                           |
| ------------------- | ----- | ---------------------------------- |
| `--duration-fast`   | 150ms | Micro-interactions (hover, active) |
| `--duration-normal` | 250ms | Standard transitions               |
| `--duration-slow`   | 350ms | Entrance animations                |
| `--duration-slower` | 500ms | Complex animations                 |

### Standard Easing

| Token            | Value                          | Use Case          |
| ---------------- | ------------------------------ | ----------------- |
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | General purpose   |
| `--ease-out`     | `cubic-bezier(0, 0, 0.2, 1)`   | Elements entering |
| `--ease-in`      | `cubic-bezier(0.4, 0, 1, 1)`   | Elements exiting  |

### Best Practices for States

1. **Hover:** Subtle visual change (border color, shadow, slight scale)
2. **Focus:** Clear outline, 2px solid, contrasting color
3. **Active:** Reduced scale (0.95-0.98) or increased opacity
4. **Disabled:** Reduced opacity (0.6), grayscale, no pointer events

---

## Implementation Priority

### P0 - Critical (Do First)

1. Add focus-visible states to all interactive elements
2. Tokenize semantic colors (success, error, warning)
3. Remove hard-coded colors

### P1 - High Priority

4. Standardize spacing scale to 4px base
5. Standardize animation durations
6. Add missing active states

### P2 - Medium Priority

7. Refactor border-radius scale
8. Create glass morphism utility class
9. Consolidate transition patterns

### P3 - Nice to Have

10. Remove legacy token aliases
11. Audit typography utility usage
12. Adjust font size scale for modular ratio

---

## Files Requiring Changes

| File             | Changes Needed                                                     |
| ---------------- | ------------------------------------------------------------------ |
| `tokens.css`     | Add semantic colors, standardize scales, add easing tokens         |
| `reset.css`      | Add `:focus-visible` global style                                  |
| `canvas.css`     | Replace `#f44` with token                                          |
| `nodes.css`      | Replace `#000` with token, tokenize 40px                           |
| `ui.css`         | Replace all hard-coded colors, add focus states, add active states |
| `animations.css` | Standardize durations, add easing tokens                           |

---

_End of Audit Report_
