/**
 * ID Utility Tests
 */

import { describe, it, expect } from 'vitest';

import { generateId, generateShortId, generateUUID } from '@/utils/id';

describe('ID Utilities', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      const id3 = generateId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should generate IDs with prefix', () => {
      const nodeId = generateId('node');
      const wireId = generateId('wire');

      expect(nodeId.startsWith('node_')).toBe(true);
      expect(wireId.startsWith('wire_')).toBe(true);
    });

    it('should include timestamp component', () => {
      const id = generateId('test');
      const parts = id.split('_');

      // Should have prefix, timestamp, and random part
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('test');
      // Timestamp should be a number
      const timestampPart = parts[1] ?? '';
      expect(timestampPart.length).toBeGreaterThan(0);
      expect(Number.isNaN(parseInt(timestampPart, 10))).toBe(false);
    });
  });

  describe('generateShortId', () => {
    it('should generate short unique IDs', () => {
      const id1 = generateShortId();
      const id2 = generateShortId();

      expect(id1).not.toBe(id2);
    });

    it('should generate 8 character IDs', () => {
      const id = generateShortId();
      expect(id.length).toBe(8);
    });

    it('should be alphanumeric', () => {
      const id = generateShortId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('generateUUID', () => {
    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();

      expect(uuid1).not.toBe(uuid2);
    });

    it('should match UUID v4 format', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should have version 4 indicator', () => {
      const uuid = generateUUID();
      const parts = uuid.split('-');
      const versionPart = parts[2] ?? '';
      expect(versionPart.length).toBeGreaterThan(0);
      expect(versionPart.charAt(0)).toBe('4');
    });
  });
});
