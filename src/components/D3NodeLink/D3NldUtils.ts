// File: src/components/D3NodeLink/D3NldUtils.ts

import { getMaxCumulativeViolations } from '../../utils/violations';

/**
 * Extracts the namespace prefix from a URI-like string (e.g. "ex:SomeNode" → "ex").
 */
export function extractNamespace(uri: string): string {
  const match = uri.match(/^([^:]+):/);
  return match ? match[1] : '';
}

export type NodeShape = 'circle' | 'rectangle' | 'diamond' | 'pentagon' | 'hexagon' | 'triangle';

export type NodeColorContext = {
  sources?: string[];
  isAClass?: string | null;
};

const ONTOLOGY_SHACL_COLOR = '#669900';
const ONTOLOGY_COLOR = '#007C45';
const INSTANCE_COLOR = '#3366CC';
const REPORT_COLOR = '#DA5700';
const UNKNOWN_COLOR = '#999999';
const DEFAULT_NODE_COLOR = UNKNOWN_COLOR;

export const NAMESPACE_SHAPE_MAP: Record<string, NodeShape> = {
  omics: 'circle',
  lotr: 'circle',
  sh: 'rectangle',
  owl: 'diamond',
  cns: 'circle',
  // xsd: 'hexagon',
  ex: 'triangle',
  other: 'hexagon',
};

const DEFAULT_NODE_SHAPE: NodeShape = 'hexagon';

export const D3_FORCE_LABEL_FONT_SIZE_PX = 14;
export const D3_FORCE_EDGE_LABEL_FONT_SIZE_PX = 12;
export const D3_NODE_MIN_RADIUS_PX = 4;
export const D3_NODE_MAX_RADIUS_PX = 25;
export const D3_NODE_VIOLATION_RADIUS_OFFSET_PX = 3;
export const D3_EDGE_MIN_LINE_WIDTH_PX = 2.5;
export const D3_EDGE_MAX_LINE_WIDTH_PX = 12.5;
export const D3_EDGE_ARROW_BASE_SIZE_PX = 10;
export const D3_EDGE_ARROW_BASE_WIDTH_PX = 5;
export const D3_EDGE_ARROW_MIN_SCALE = 1;
export const D3_EDGE_ARROW_MAX_SCALE = 5;
export const D3_EDGE_DASH_LENGTH_PX = 8;
export const D3_EDGE_DASH_GAP_PX = 6;
export const D3_FORCE_SEMANTIC_ZOOM_NODE_EDGE_SIZES = true;

const D3_NODE_SHAPE_RADIUS_MODIFIERS_PX: Record<NodeShape, number> = {
  circle: 0,
  rectangle: 0,
  diamond: 0,
  pentagon: 0,
  hexagon: 0,
  triangle: 3,
};

export function getNodeRadiusPx(violationCount: number, shape: NodeShape): number {
  const maxViolations = getMaxCumulativeViolations();
  const minRadius = D3_NODE_MIN_RADIUS_PX + D3_NODE_VIOLATION_RADIUS_OFFSET_PX;
  const maxRadius = Math.max(D3_NODE_MAX_RADIUS_PX, minRadius);
  const normalizedViolations = maxViolations > 0 ? Math.min(Math.max(violationCount, 0), maxViolations) / maxViolations : 0;
  const baseRadius = minRadius + normalizedViolations * (maxRadius - minRadius);
  return baseRadius + (D3_NODE_SHAPE_RADIUS_MODIFIERS_PX[shape] ?? 0);
}

export function getLineWidthPx(violationCount: number): number {
  const maxViolations = getMaxCumulativeViolations();
  const minWidth = D3_EDGE_MIN_LINE_WIDTH_PX;
  const maxWidth = Math.max(D3_EDGE_MAX_LINE_WIDTH_PX, minWidth);
  const normalizedViolations = maxViolations > 0 ? Math.min(Math.max(violationCount, 0), maxViolations) / maxViolations : 0;
  return minWidth + normalizedViolations * (maxWidth - minWidth);
}

export function getArrowScaleForLineWidth(lineWidthPx: number): number {
  const minWidth = D3_EDGE_MIN_LINE_WIDTH_PX;
  const maxWidth = Math.max(D3_EDGE_MAX_LINE_WIDTH_PX, minWidth);
  const clampedWidth = Math.min(Math.max(lineWidthPx, minWidth), maxWidth);
  const normalizedWidth = maxWidth > minWidth ? (clampedWidth - minWidth) / (maxWidth - minWidth) : 0;
  return D3_EDGE_ARROW_MIN_SCALE + normalizedWidth * (D3_EDGE_ARROW_MAX_SCALE - D3_EDGE_ARROW_MIN_SCALE);
}

/**
 * Maps node sources and class metadata to its node color.
 */
export function getNodeColorForNode({ sources = [], isAClass }: NodeColorContext): string {
  const normalizedSources = sources.map((source) => source.toLowerCase());
  const hasSource = (source: string) => normalizedSources.includes(source);

  if (hasSource('ontology')) {
    const ns = extractNamespace(isAClass ?? '').toLowerCase();
    return ns === 'sh' ? ONTOLOGY_SHACL_COLOR : ONTOLOGY_COLOR;
  }

  if (hasSource('instance')) {
    return INSTANCE_COLOR;
  }

  if (hasSource('report') || hasSource('violation')) {
    return REPORT_COLOR;
  }

  if (hasSource('unknown')) {
    return UNKNOWN_COLOR;
  }

  return DEFAULT_NODE_COLOR;
}

/**
 * Maps a namespace prefix to its node shape.
 */
export function getNodeShapeForId(id: string): NodeShape {
  const ns = extractNamespace(id).toLowerCase();
  return NAMESPACE_SHAPE_MAP[ns] ?? DEFAULT_NODE_SHAPE;
}
