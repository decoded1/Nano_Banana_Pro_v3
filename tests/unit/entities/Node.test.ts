/**
 * Node Entity Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { Node } from '@/core/entities/Node';

describe('Node Entity', () => {
  describe('constructor', () => {
    it('should create a node with required config', () => {
      const node = new Node({
        id: 'test-node',
        position: { x: 100, y: 200 },
      });

      expect(node.id).toBe('test-node');
      expect(node.position).toEqual({ x: 100, y: 200 });
    });

    it('should apply default values', () => {
      const node = new Node({
        id: 'test-node',
        position: { x: 0, y: 0 },
      });

      expect(node.title).toBe('Generation');
      expect(node.badge).toBe('2K');
      expect(node.isGhost).toBe(false);
    });

    it('should accept custom config values', () => {
      const node = new Node({
        id: 'custom-node',
        position: { x: 50, y: 75 },
        title: 'My Custom Node',
        prompt: 'A beautiful sunset',
        badge: '4K',
      });

      expect(node.title).toBe('My Custom Node');
      expect(node.prompt).toBe('A beautiful sunset');
      expect(node.badge).toBe('4K');
    });

    it('should create ghost node', () => {
      const ghost = new Node({
        id: 'ghost-node',
        position: { x: 0, y: 0 },
        isGhost: true,
        type: 'ghost',
      });

      expect(ghost.isGhost).toBe(true);
      expect(ghost.outputPort).toBeNull();
    });

    it('should create ports for regular nodes', () => {
      const node = new Node({
        id: 'node-with-ports',
        position: { x: 0, y: 0 },
      });

      expect(node.inputPort).toBeDefined();
      expect(node.outputPort).toBeDefined();
    });
  });

  describe('position', () => {
    let node: Node;

    beforeEach(() => {
      node = new Node({
        id: 'test-node',
        position: { x: 0, y: 0 },
      });
    });

    it('should get current position', () => {
      expect(node.position).toEqual({ x: 0, y: 0 });
    });

    it('should update position', () => {
      node.position = { x: 150, y: 250 };
      expect(node.position).toEqual({ x: 150, y: 250 });
    });

    it('should return a copy of position (immutable)', () => {
      const pos = node.position;
      pos.x = 999;

      expect(node.position.x).toBe(0);
    });
  });

  describe('selection state', () => {
    let node: Node;

    beforeEach(() => {
      node = new Node({
        id: 'test-node',
        position: { x: 0, y: 0 },
      });
    });

    it('should start with no selection', () => {
      expect(node.selection).toBe('none');
      expect(node.isSelected).toBe(false);
    });

    it('should update selection state', () => {
      node.selection = 'selected';
      expect(node.selection).toBe('selected');
      expect(node.isSelected).toBe(true);
    });

    it('should recognize multi-selected state', () => {
      node.selection = 'multi-selected';
      expect(node.isSelected).toBe(true);
    });
  });

  describe('interaction state', () => {
    let node: Node;

    beforeEach(() => {
      node = new Node({
        id: 'test-node',
        position: { x: 0, y: 0 },
      });
    });

    it('should start with idle state', () => {
      expect(node.interaction).toBe('idle');
      expect(node.isDragging).toBe(false);
    });

    it('should update interaction state', () => {
      node.interaction = 'dragging';
      expect(node.interaction).toBe('dragging');
      expect(node.isDragging).toBe(true);
    });
  });

  describe('getState', () => {
    it('should return complete node state', () => {
      const node = new Node({
        id: 'test-node',
        position: { x: 100, y: 200 },
        title: 'Test',
        prompt: 'Test prompt',
      });

      const state = node.getState();

      expect(state.config.id).toBe('test-node');
      expect(state.position).toEqual({ x: 100, y: 200 });
      expect(state.selection).toBe('none');
      expect(state.interaction).toBe('idle');
      expect(state.isVisible).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should update config properties', () => {
      const node = new Node({
        id: 'test-node',
        position: { x: 0, y: 0 },
        title: 'Original',
      });

      node.updateConfig({ title: 'Updated Title', prompt: 'New prompt' });

      expect(node.title).toBe('Updated Title');
      expect(node.prompt).toBe('New prompt');
    });
  });

  describe('zIndex', () => {
    it('should get and set zIndex', () => {
      const node = new Node({
        id: 'test-node',
        position: { x: 0, y: 0 },
      });

      expect(node.zIndex).toBe(1);

      node.zIndex = 10;
      expect(node.zIndex).toBe(10);
    });
  });
});
