// File: src/components/D3NodeLink/D3NldUtils.ts

/**
 * Extracts the namespace prefix from a URI-like string (e.g. "ex:SomeNode" → "ex").
 */
export function extractNamespace(uri: string): string {
  const match = uri.match(/^([^:]+):/);
  return match ? match[1] : '';
}

export type NodeShape = 'circle' | 'rectangle' | 'diamond' | 'pentagon' | 'hexagon' | 'triangle';

const NAMESPACE_COLOR_MAP: Record<string, string> = {
  sh: '#669900',
  ex: '#DA5700',
};

const DEFAULT_NODE_COLOR = '#007C45';

export const NAMESPACE_SHAPE_MAP: Record<string, NodeShape> = {
  omics: 'circle',
  lotr: 'circle',
  sh: 'rectangle',
  owl: 'diamond',
  cns: 'pentagon',
  // xsd: 'hexagon',
  ex: 'triangle',
  other: 'hexagon',
};

const DEFAULT_NODE_SHAPE: NodeShape = 'triangle';

export const D3_FORCE_LABEL_FONT_SIZE_PX = 12;
export const D3_FORCE_NODE_MIN_RADIUS = 6;
export const D3_FORCE_NODE_MAX_RADIUS = 18;
export const D3_FORCE_NODE_SELECTED_RADIUS_BOOST = 1.5;

/**
 * Maps a namespace prefix to its node color.
 */
export function getNodeColorForId(id: string): string {
  const ns = extractNamespace(id).toLowerCase();
  return NAMESPACE_COLOR_MAP[ns] ?? DEFAULT_NODE_COLOR;
}

/**
 * Maps a namespace prefix to its node shape.
 */
export function getNodeShapeForId(id: string): NodeShape {
  const ns = extractNamespace(id).toLowerCase();
  return NAMESPACE_SHAPE_MAP[ns] ?? DEFAULT_NODE_SHAPE;
}

export function getScaledNodeRadius(totalViolations: number | undefined, selected: boolean): number {
  const violations = Math.max(0, totalViolations ?? 0);
  const scaledRadius = Math.min(D3_FORCE_NODE_MAX_RADIUS, Math.sqrt(violations));
  const baseRadius = Math.max(D3_FORCE_NODE_MIN_RADIUS, scaledRadius);
  return selected ? baseRadius + D3_FORCE_NODE_SELECTED_RADIUS_BOOST : baseRadius;
}
