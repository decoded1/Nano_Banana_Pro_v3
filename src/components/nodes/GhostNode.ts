/**
 * GhostNode Component
 *
 * A loading placeholder node shown during image generation.
 * Displays a pulsing animation while waiting for the API response.
 */

import { useStore } from '@/state';

import { NodeCard, type NodeCardProps } from './NodeCard';

import type { ImageResolution } from '@/types';

/**
 * GhostNode is a specialized NodeCard for loading states
 * The visual difference is handled via CSS (.node.ghost)
 */
export class GhostNode extends NodeCard {
  constructor(props: NodeCardProps) {
    // Ensure isGhost is set in config
    const ghostProps: NodeCardProps = {
      nodeState: {
        ...props.nodeState,
        config: {
          ...props.nodeState.config,
          isGhost: true,
        },
      },
    };
    super(ghostProps);
  }

  /**
   * Convert ghost to regular node when generation completes
   */
  convertToNode(data: { image: string; prompt: string; badge?: ImageResolution }): void {
    useStore.getState().convertGhostToNode(this.nodeId, {
      image: data.image,
      prompt: data.prompt,
      badge: data.badge ?? '2K',
    });

    // Update content to reflect new state
    this.updateContent();
  }
}
