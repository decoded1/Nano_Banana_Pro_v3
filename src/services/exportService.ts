/**
 * Export Service
 *
 * Handles exporting canvas content to various formats:
 * - PNG: Full canvas or selected nodes
 * - JSON: Project data for save/restore
 * - Clipboard: Copy images
 */

import { useStore } from '@/state';

import { base64ToBlob } from './imageService';

import type { NodeState, Transform, GenerationConfig } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface ProjectExport {
  version: string;
  exportedAt: string;
  project: {
    name: string;
  };
  canvas: {
    transform: Transform;
  };
  nodes: ExportedNode[];
  settings: {
    generationConfig: GenerationConfig;
  };
}

export interface ExportedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  parentId: string | null;
  title: string;
  prompt: string;
  badge: string;
  image?: string;
}

export interface ExportedConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePortId: string;
  targetPortId: string;
}

export interface ExportOptions {
  includeImages?: boolean;
  selectedNodesOnly?: boolean;
}

export interface CanvasExportOptions {
  scale?: number;
  backgroundColor?: string;
  padding?: number;
  selectedOnly?: boolean;
}

// =============================================================================
// PROJECT EXPORT (JSON)
// =============================================================================

/**
 * Export the current project state to JSON
 */
export function exportProjectToJSON(options: ExportOptions = {}): ProjectExport {
  const state = useStore.getState();
  const { includeImages = true, selectedNodesOnly = false } = options;

  // Get nodes to export
  const nodesToExport = selectedNodesOnly
    ? Object.values(state.nodes).filter((node) => state.selectedIds.includes(node.config.id))
    : Object.values(state.nodes);

  // Build exported nodes
  const exportedNodes: ExportedNode[] = nodesToExport.map((node) => {
    const exported: ExportedNode = {
      id: node.config.id,
      type: node.config.type ?? 'generation',
      position: node.position,
      parentId: node.config.parentId ?? null,
      title: node.config.title ?? '',
      prompt: node.config.prompt ?? '',
      badge: node.config.badge ?? '',
    };

    if (includeImages && node.config.image) {
      exported.image = node.config.image;
    }

    return exported;
  });

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    project: {
      name: state.topBar.projectInfo?.name ?? 'Untitled Project',
    },
    canvas: {
      transform: state.transform,
    },
    nodes: exportedNodes,
    settings: {
      generationConfig: state.defaultConfig,
    },
  };
}

/**
 * Download project as JSON file
 */
export function downloadProjectJSON(filename?: string): void {
  const project = exportProjectToJSON({ includeImages: true });
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  const name = filename ?? `${project.project.name || 'project'}-${formatDate()}.json`;
  downloadBlob(blob, name);
}

/**
 * Import project from JSON
 */
export function importProjectFromJSON(json: string): ProjectExport | null {
  try {
    const data = JSON.parse(json) as ProjectExport;

    // Validate version
    if (!data.version) {
      throw new Error('Invalid project file: missing version');
    }

    // Validate required fields
    if (!data.nodes || !Array.isArray(data.nodes)) {
      throw new Error('Invalid project file: missing nodes');
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to import project:', message);
    return null;
  }
}

// =============================================================================
// IMAGE EXPORT (PNG)
// =============================================================================

/**
 * Export a single node's image as PNG
 */
export async function exportNodeImage(nodeId: string): Promise<Blob | null> {
  const state = useStore.getState();
  const node = state.nodes[nodeId];

  if (!node?.config.image) {
    return null;
  }

  // Image is stored as data URL
  const dataUrl = node.config.image;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const mimeType = match[1] ?? 'image/png';
  const base64Data = match[2] ?? '';

  return base64ToBlob(base64Data, mimeType);
}

/**
 * Download a node's image
 */
export async function downloadNodeImage(nodeId: string, filename?: string): Promise<void> {
  const blob = await exportNodeImage(nodeId);
  if (!blob) {
    throw new Error('Node has no image to export');
  }

  const state = useStore.getState();
  const node = state.nodes[nodeId];
  const name = filename ?? `${node?.config.title || nodeId}-${formatDate()}.png`;

  downloadBlob(blob, name);
}

/**
 * Export canvas as PNG (captures visible area)
 */
export async function exportCanvasAsPNG(options: CanvasExportOptions = {}): Promise<Blob> {
  const { scale = 2, backgroundColor = '#0f0f0f', padding = 50, selectedOnly = false } = options;

  const state = useStore.getState();

  // Get nodes to render
  const nodes = selectedOnly
    ? Object.values(state.nodes).filter((node) => state.selectedIds.includes(node.config.id))
    : Object.values(state.nodes);

  if (nodes.length === 0) {
    throw new Error('No nodes to export');
  }

  // Calculate bounding box
  const bounds = calculateNodesBounds(nodes);

  // Create canvas
  const canvas = document.createElement('canvas');
  const canvasWidth = (bounds.width + padding * 2) * scale;
  const canvasHeight = (bounds.height + padding * 2) * scale;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Render nodes
  for (const node of nodes) {
    if (!node.config.image) continue;

    const x = (node.position.x - bounds.minX + padding) * scale;
    const y = (node.position.y - bounds.minY + padding) * scale;

    // Load and draw image
    const img = await loadImageFromUrl(node.config.image);

    // Node dimensions (default or from image)
    const nodeWidth = 260 * scale;
    const nodeHeight = (img.naturalHeight / img.naturalWidth) * nodeWidth;

    ctx.drawImage(img, x, y, nodeWidth, nodeHeight);

    // Draw title
    if (node.config.title) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `${14 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText(node.config.title, x, y + nodeHeight + 20 * scale);
    }
  }

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create image blob'));
        }
      },
      'image/png',
      1.0,
    );
  });
}

/**
 * Download canvas as PNG
 */
export async function downloadCanvasPNG(
  filename?: string,
  options?: CanvasExportOptions,
): Promise<void> {
  const blob = await exportCanvasAsPNG(options);
  const name = filename ?? `canvas-export-${formatDate()}.png`;
  downloadBlob(blob, name);
}

// =============================================================================
// CLIPBOARD OPERATIONS
// =============================================================================

/**
 * Copy node image to clipboard
 */
export async function copyNodeImageToClipboard(nodeId: string): Promise<boolean> {
  const blob = await exportNodeImage(nodeId);
  if (!blob) {
    return false;
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);
    return true;
  } catch {
    console.error('Failed to copy to clipboard');
    return false;
  }
}

/**
 * Copy image data URL to clipboard
 */
export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return false;
    }

    const mimeType = match[1] ?? 'image/png';
    const base64Data = match[2] ?? '';

    const blob = base64ToBlob(base64Data, mimeType);
    await navigator.clipboard.write([
      new ClipboardItem({
        [mimeType]: blob,
      }),
    ]);
    return true;
  } catch {
    console.error('Failed to copy to clipboard');
    return false;
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Calculate bounding box for a set of nodes
 */
function calculateNodesBounds(nodes: NodeState[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  const nodeWidth = 260;
  const nodeHeight = 320;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + nodeWidth);
    maxY = Math.max(maxY, node.position.y + nodeHeight);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Load an image from URL
 */
function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Format date for filenames
 */
function formatDate(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}
