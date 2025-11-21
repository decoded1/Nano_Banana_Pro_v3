/**
 * Utilities - Barrel Export
 *
 * Helper functions used throughout the application.
 */

// Phase 3+ will populate these exports:
// export * from './dom';
// export * from './math';
// export * from './debounce';
// export * from './id';
// export * from './validation';

/**
 * Generate a unique ID
 */
export const generateId = (prefix = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};
