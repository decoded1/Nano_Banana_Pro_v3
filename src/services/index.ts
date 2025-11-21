/**
 * Services - Barrel Export
 *
 * Service layer for external API communication and utilities.
 */

// Gemini API Service
export { generateImages, type GenerationOptions } from './geminiService';

// Image Processing Service
export {
  validateImage,
  validateImageData,
  fileToImageData,
  imageDataToDataUrl,
  dataUrlToImageData,
  blobToBase64,
  base64ToBlob,
  loadImage,
  getImageDimensions,
  resizeImage,
  createThumbnail,
  convertImageFormat,
  formatFileSize,
  isDataUrl,
  getMimeTypeFromDataUrl,
  estimateBase64Size,
  type ImageValidationResult,
  type ResizeOptions,
  type ImageDimensions,
} from './imageService';

// Export Service
export {
  exportProjectToJSON,
  downloadProjectJSON,
  importProjectFromJSON,
  exportNodeImage,
  downloadNodeImage,
  exportCanvasAsPNG,
  downloadCanvasPNG,
  copyNodeImageToClipboard,
  copyImageToClipboard,
  type ProjectExport,
  type ExportedNode,
  type ExportedConnection,
  type ExportOptions,
  type CanvasExportOptions,
} from './exportService';

// Generation Queue Service
export {
  GenerationService,
  getGenerationService,
  initGenerationService,
  stopGenerationService,
  type GenerationServiceConfig,
} from './generationService';

// Clipboard Service
export {
  ClipboardManager,
  getClipboardManager,
  initClipboardService,
  cleanupClipboardService,
} from './clipboardService';
