/**
 * Image Service
 *
 * Utilities for image processing: base64 encoding/decoding,
 * resizing, validation, and format conversion.
 *
 * API Reference: Gemini 3 Pro Image (gemini-3-pro-image-preview)
 * - Max single file size: 7MB
 * - Supported formats: PNG, JPEG, WEBP, HEIC, HEIF
 */

import { API_LIMITS } from '@/types';

import type { ImageData } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
}

export interface ImageDimensions {
  width: number;
  height: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate an image file for API compatibility
 */
export function validateImage(file: File): ImageValidationResult {
  const warnings: string[] = [];

  // Check file type
  if (!SUPPORTED_MIME_TYPES.includes(file.type as SupportedMimeType)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Supported: PNG, JPEG, WEBP, HEIC, HEIF`,
    };
  }

  // Check file size (7MB max per API)
  if (file.size > API_LIMITS.MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large: ${formatFileSize(file.size)}. Maximum: ${formatFileSize(API_LIMITS.MAX_IMAGE_SIZE_BYTES)}`,
    };
  }

  // Warn if file is large (may slow down upload)
  if (file.size > 5 * 1024 * 1024) {
    warnings.push('Large file may slow down processing');
  }

  if (warnings.length > 0) {
    return { valid: true, warnings };
  }
  return { valid: true };
}

/**
 * Validate ImageData for API compatibility
 */
export function validateImageData(imageData: ImageData): ImageValidationResult {
  // Check if data exists
  if (!imageData.data || imageData.data.length === 0) {
    return {
      valid: false,
      error: 'Image data is empty',
    };
  }

  // Check MIME type
  if (!SUPPORTED_MIME_TYPES.includes(imageData.mimeType as SupportedMimeType)) {
    return {
      valid: false,
      error: `Unsupported MIME type: ${imageData.mimeType}`,
    };
  }

  // Estimate size from base64 (base64 is ~4/3 the size of binary)
  const estimatedSize = (imageData.data.length * 3) / 4;
  if (estimatedSize > API_LIMITS.MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image data too large: ~${formatFileSize(estimatedSize)}`,
    };
  }

  return { valid: true };
}

// =============================================================================
// BASE64 ENCODING/DECODING
// =============================================================================

/**
 * Convert a File to base64 encoded ImageData
 */
export async function fileToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1];

      if (!base64Data) {
        reject(new Error('Failed to extract base64 data from file'));
        return;
      }

      resolve({
        data: base64Data,
        mimeType: file.type,
      });
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${reader.error?.message ?? 'Unknown error'}`));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Convert base64 ImageData to a data URL
 */
export function imageDataToDataUrl(imageData: ImageData): string {
  return `data:${imageData.mimeType};base64,${imageData.data}`;
}

/**
 * Convert a data URL to ImageData
 */
export function dataUrlToImageData(dataUrl: string): ImageData | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const mimeType = match[1];
  const data = match[2];

  if (!mimeType || !data) {
    return null;
  }

  return { data, mimeType };
}

/**
 * Convert a Blob to base64
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64 ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 to Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array<number>(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// =============================================================================
// IMAGE PROCESSING
// =============================================================================

/**
 * Load an image from a data URL
 */
export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Get image dimensions from ImageData
 */
export async function getImageDimensions(imageData: ImageData): Promise<ImageDimensions> {
  const dataUrl = imageDataToDataUrl(imageData);
  const img = await loadImage(dataUrl);
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}

/**
 * Resize an image while maintaining aspect ratio
 */
export async function resizeImage(
  imageData: ImageData,
  options: ResizeOptions = {},
): Promise<ImageData> {
  const { maxWidth = 2048, maxHeight = 2048, quality = 0.9, format = 'image/jpeg' } = options;

  const dataUrl = imageDataToDataUrl(imageData);
  const img = await loadImage(dataUrl);

  // Calculate new dimensions
  const { width, height } = calculateResizeDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxWidth,
    maxHeight,
  );

  // If no resize needed, return original
  if (width === img.naturalWidth && height === img.naturalHeight) {
    return imageData;
  }

  // Create canvas and resize
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, 0, 0, width, height);

  // Convert to base64
  const newDataUrl = canvas.toDataURL(format, quality);
  const newImageData = dataUrlToImageData(newDataUrl);

  if (!newImageData) {
    throw new Error('Failed to convert resized image to ImageData');
  }

  return newImageData;
}

/**
 * Calculate resize dimensions maintaining aspect ratio
 */
function calculateResizeDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
): ImageDimensions {
  let width = originalWidth;
  let height = originalHeight;

  // Scale down if exceeds max dimensions
  if (width > maxWidth) {
    height = Math.round(height * (maxWidth / width));
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = Math.round(width * (maxHeight / height));
    height = maxHeight;
  }

  return { width, height };
}

/**
 * Create a thumbnail from ImageData
 */
export async function createThumbnail(imageData: ImageData, size = 200): Promise<ImageData> {
  return resizeImage(imageData, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.8,
    format: 'image/jpeg',
  });
}

/**
 * Convert image to a different format
 */
export async function convertImageFormat(
  imageData: ImageData,
  targetFormat: 'image/png' | 'image/jpeg' | 'image/webp',
  quality = 0.9,
): Promise<ImageData> {
  const dataUrl = imageDataToDataUrl(imageData);
  const img = await loadImage(dataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(img, 0, 0);

  const newDataUrl = canvas.toDataURL(targetFormat, quality);
  const newImageData = dataUrlToImageData(newDataUrl);

  if (!newImageData) {
    throw new Error('Failed to convert image format');
  }

  return newImageData;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if a string is a valid data URL
 */
export function isDataUrl(str: string): boolean {
  return /^data:[^;]+;base64,/.test(str);
}

/**
 * Extract MIME type from a data URL
 */
export function getMimeTypeFromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:([^;]+);/);
  return match?.[1] ?? null;
}

/**
 * Calculate approximate file size from base64 string
 */
export function estimateBase64Size(base64: string): number {
  // Base64 is ~4/3 the size of binary, but padding can vary
  const padding = (base64.match(/=+$/) ?? [''])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}
