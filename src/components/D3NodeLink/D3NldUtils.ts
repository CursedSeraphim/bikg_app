// File: src/components/D3NodeLink/D3NldUtils.ts

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
const REPORT_OR_UNKNOWN_COLOR = '#DA5700';
const DEFAULT_NODE_COLOR = '#999999';

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

  if (hasSource('report') || hasSource('unknown')) {
    return REPORT_OR_UNKNOWN_COLOR;
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
