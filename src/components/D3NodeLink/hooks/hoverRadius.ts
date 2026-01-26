import type { ZoomTransform } from 'd3';
import { D3_FORCE_SEMANTIC_ZOOM_NODE_EDGE_SIZES } from '../D3NldUtils';

export const NODE_RADIUS_PX = 50;
export const HOVER_RADIUS_MULTIPLIER = 2;

/**
 * Computes the squared distance threshold used for detecting whether a pointer
 * event is "near" a node. This matches the logic used throughout the node-link
 * diagram.
 */
export function getNearNodeThreshold(transform?: ZoomTransform): number {
  const semanticScale = D3_FORCE_SEMANTIC_ZOOM_NODE_EDGE_SIZES ? 1 / (transform?.k ?? 1) : 1;
  const effectiveRadius = NODE_RADIUS_PX * HOVER_RADIUS_MULTIPLIER * semanticScale;
  return effectiveRadius * effectiveRadius;
}
