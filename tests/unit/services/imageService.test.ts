/**
 * Image Service Tests
 */

import { describe, it, expect } from 'vitest';

import {
  isDataUrl,
  getMimeTypeFromDataUrl,
  formatFileSize,
  estimateBase64Size,
} from '@/services/imageService';

describe('Image Service', () => {
  describe('isDataUrl', () => {
    it('should identify valid data URLs', () => {
      expect(isDataUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
      expect(isDataUrl('data:image/jpeg;base64,/9j/4AAQ=')).toBe(true);
      expect(isDataUrl('data:text/plain;base64,SGVsbG8=')).toBe(true);
    });

    it('should reject invalid data URLs', () => {
      expect(isDataUrl('https://example.com/image.png')).toBe(false);
      expect(isDataUrl('/images/photo.jpg')).toBe(false);
      expect(isDataUrl('')).toBe(false);
      expect(isDataUrl('not a url')).toBe(false);
    });
  });

  describe('getMimeTypeFromDataUrl', () => {
    it('should extract MIME type from data URL', () => {
      expect(getMimeTypeFromDataUrl('data:image/png;base64,iVBORw0=')).toBe('image/png');
      expect(getMimeTypeFromDataUrl('data:image/jpeg;base64,/9j/4A=')).toBe('image/jpeg');
      expect(getMimeTypeFromDataUrl('data:image/webp;base64,UklGR=')).toBe('image/webp');
    });

    it('should return null for invalid data URLs', () => {
      expect(getMimeTypeFromDataUrl('https://example.com/image.png')).toBeNull();
      expect(getMimeTypeFromDataUrl('')).toBeNull();
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(10240)).toBe('10.0 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(5242880)).toBe('5.0 MB');
    });

    it('should format large files as MB', () => {
      // 1GB = 1073741824 bytes, but function only goes up to MB
      expect(formatFileSize(1073741824)).toBe('1024.0 MB');
    });
  });

  describe('estimateBase64Size', () => {
    it('should estimate size of base64 string', () => {
      // A simple base64 string "SGVsbG8=" encodes "Hello" (5 bytes)
      const base64 = 'SGVsbG8='; // "Hello"
      const size = estimateBase64Size(base64);

      // Should be approximately 5 bytes
      expect(size).toBe(5);
    });

    it('should handle base64 without padding', () => {
      // "YQ" encodes "a" (1 byte) - no padding
      const base64 = 'YQ';
      const size = estimateBase64Size(base64);

      // Floor((2 * 3) / 4) - 0 = 1
      expect(size).toBe(1);
    });

    it('should handle longer base64 strings', () => {
      // "SGVsbG8gV29ybGQh" encodes "Hello World!" (12 bytes)
      const base64 = 'SGVsbG8gV29ybGQh';
      const size = estimateBase64Size(base64);

      expect(size).toBe(12);
    });

    it('should handle empty string', () => {
      expect(estimateBase64Size('')).toBe(0);
    });
  });
});
