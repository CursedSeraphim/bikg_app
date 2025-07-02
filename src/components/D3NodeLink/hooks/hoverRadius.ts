import type { ZoomTransform } from 'd3';

export const NODE_RADIUS_PX = 200;
export const HOVER_RADIUS_MULTIPLIER = 2;

/**
 * Computes the squared distance threshold used for detecting whether a pointer
 * event is "near" a node. This matches the logic used throughout the node-link
 * diagram.
 */
export function getNearNodeThreshold(transform?: ZoomTransform): number {
  const effectiveRadius = (NODE_RADIUS_PX * HOVER_RADIUS_MULTIPLIER) / (transform?.k ?? 1);
  return effectiveRadius * effectiveRadius;
}
