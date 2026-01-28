import type * as d3 from 'd3';
import type { CanvasEdge, CanvasNode } from '../D3NldTypes';

export type LabelKind = 'node' | 'edge';

export interface LabelCandidate {
  id: string;
  kind: LabelKind;
  text: string;
  screenX: number;
  screenY: number;
  width: number;
  height: number;
  priority: number;
  bbox: LabelBBox;
}

export interface LabelSelection {
  visibleNodeIds: Set<string>;
  visibleEdgeIds: Set<string>;
}

export interface LabelBBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface BundledEdgeLayout {
  edge: CanvasEdge;
  label: { x: number; y: number };
}

export interface SelectVisibleLabelsArgs {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  bundledEdges: BundledEdgeLayout[];
  transform: d3.ZoomTransform;
  dimensions: { width: number; height: number };
  nodeLabelFont: string;
  edgeLabelFont: string;
  nodeLabelFontSizePx: number;
  edgeLabelFontSizePx: number;
  nodeLabelOffsetPx: number;
  edgeLabelOffsetPx: number;
  mapNodeLabel: (label: string) => string;
  mapEdgeLabel: (label: string) => string;
  getNodePriority: (node: CanvasNode) => number;
  getEdgeId: (edge: CanvasEdge) => string;
  prevVisibleNodeIds: Set<string>;
  prevVisibleEdgeIds: Set<string>;
  maxNodeLabels: number;
  maxEdgeLabels: number;
  stabilityBonusNode: number;
  stabilityBonusEdge: number;
  ghostPenalty: number;
  context: CanvasRenderingContext2D;
  cellSizePx?: number;
}

const VIEWPORT_PADDING_PX = 0;

function bboxOverlaps(a: LabelBBox, b: LabelBBox): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function bboxIntersectsViewport(bbox: LabelBBox, width: number, height: number): boolean {
  return !(bbox.right < -VIEWPORT_PADDING_PX || bbox.left > width + VIEWPORT_PADDING_PX || bbox.bottom < -VIEWPORT_PADDING_PX || bbox.top > height + VIEWPORT_PADDING_PX);
}

class SpatialHash {
  private readonly cellSize: number;
  private readonly grid = new Map<string, LabelBBox[]>();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cy: number) {
    return `${cx},${cy}`;
  }

  private cellBounds(bbox: LabelBBox) {
    const minX = Math.floor(bbox.left / this.cellSize);
    const maxX = Math.floor(bbox.right / this.cellSize);
    const minY = Math.floor(bbox.top / this.cellSize);
    const maxY = Math.floor(bbox.bottom / this.cellSize);
    return { minX, maxX, minY, maxY };
  }

  hasOverlap(bbox: LabelBBox): boolean {
    const { minX, maxX, minY, maxY } = this.cellBounds(bbox);
    for (let cx = minX; cx <= maxX; cx += 1) {
      for (let cy = minY; cy <= maxY; cy += 1) {
        const cell = this.grid.get(this.key(cx, cy));
        if (!cell) continue;
        if (cell.some((other) => bboxOverlaps(bbox, other))) {
          return true;
        }
      }
    }
    return false;
  }

  insert(bbox: LabelBBox) {
    const { minX, maxX, minY, maxY } = this.cellBounds(bbox);
    for (let cx = minX; cx <= maxX; cx += 1) {
      for (let cy = minY; cy <= maxY; cy += 1) {
        const key = this.key(cx, cy);
        const bucket = this.grid.get(key);
        if (bucket) {
          bucket.push(bbox);
        } else {
          this.grid.set(key, [bbox]);
        }
      }
    }
  }
}

function buildNodeCandidate(
  node: CanvasNode,
  args: SelectVisibleLabelsArgs,
  text: string,
  width: number,
  height: number,
): LabelCandidate {
  const { transform, nodeLabelOffsetPx, getNodePriority, prevVisibleNodeIds, stabilityBonusNode, ghostPenalty } = args;
  const screenX = (node.x ?? 0) * transform.k + transform.x;
  const screenY = (node.y ?? 0) * transform.k + transform.y - nodeLabelOffsetPx;
  const left = screenX - width / 2;
  const right = screenX + width / 2;
  const top = screenY - height / 2;
  const bottom = screenY + height / 2;
  const wasVisible = prevVisibleNodeIds.has(node.id);
  const priority = getNodePriority(node) + (wasVisible ? stabilityBonusNode : 0) - (node.ghost ? ghostPenalty : 0);

  return {
    id: node.id,
    kind: 'node',
    text,
    screenX,
    screenY,
    width,
    height,
    priority,
    bbox: { left, right, top, bottom },
  };
}

function buildEdgeCandidate(
  layout: BundledEdgeLayout,
  args: SelectVisibleLabelsArgs,
  text: string,
  width: number,
  height: number,
): LabelCandidate {
  const { transform, edgeLabelOffsetPx, getEdgeId, prevVisibleEdgeIds, stabilityBonusEdge, ghostPenalty } = args;
  const edgeId = getEdgeId(layout.edge);
  const screenX = layout.label.x * transform.k + transform.x;
  const screenY = layout.label.y * transform.k + transform.y - edgeLabelOffsetPx;
  const left = screenX - width / 2;
  const right = screenX + width / 2;
  const top = screenY - height / 2;
  const bottom = screenY + height / 2;
  const wasVisible = prevVisibleEdgeIds.has(edgeId);
  const priority = (wasVisible ? stabilityBonusEdge : 0) - (layout.edge.ghost ? ghostPenalty : 0);

  return {
    id: edgeId,
    kind: 'edge',
    text,
    screenX,
    screenY,
    width,
    height,
    priority,
    bbox: { left, right, top, bottom },
  };
}

export function selectVisibleLabels({
  nodes,
  edges,
  bundledEdges,
  transform,
  dimensions,
  nodeLabelFont,
  edgeLabelFont,
  nodeLabelFontSizePx,
  edgeLabelFontSizePx,
  mapNodeLabel,
  mapEdgeLabel,
  getNodePriority,
  getEdgeId,
  prevVisibleNodeIds,
  prevVisibleEdgeIds,
  maxNodeLabels,
  maxEdgeLabels,
  stabilityBonusNode,
  stabilityBonusEdge,
  ghostPenalty,
  context,
  cellSizePx,
  nodeLabelOffsetPx,
  edgeLabelOffsetPx,
}: SelectVisibleLabelsArgs): LabelSelection {
  const args: SelectVisibleLabelsArgs = {
    nodes,
    edges,
    bundledEdges,
    transform,
    dimensions,
    nodeLabelFont,
    edgeLabelFont,
    nodeLabelFontSizePx,
    edgeLabelFontSizePx,
    nodeLabelOffsetPx,
    edgeLabelOffsetPx,
    mapNodeLabel,
    mapEdgeLabel,
    getNodePriority,
    getEdgeId,
    prevVisibleNodeIds,
    prevVisibleEdgeIds,
    maxNodeLabels,
    maxEdgeLabels,
    stabilityBonusNode,
    stabilityBonusEdge,
    ghostPenalty,
    context,
    cellSizePx,
  };
  const candidates: LabelCandidate[] = [];
  const computedCellSize = cellSizePx ?? Math.max(nodeLabelFontSizePx, edgeLabelFontSizePx) * 2;
  const hash = new SpatialHash(computedCellSize);
  const edgeIds = new Set(edges.map((edge) => getEdgeId(edge)));

  context.save();
  context.font = nodeLabelFont;
  nodes.forEach((node) => {
    if (!node.label) return;
    const text = mapNodeLabel(node.label);
    if (!text) return;
    const width = context.measureText(text).width;
    const height = nodeLabelFontSizePx;
    candidates.push(buildNodeCandidate(node, args, text, width, height));
  });

  context.font = edgeLabelFont;
  bundledEdges.forEach((layout) => {
    if (!layout.edge.label) return;
    if (!edgeIds.has(getEdgeId(layout.edge))) return;
    const text = mapEdgeLabel(layout.edge.label);
    if (!text) return;
    const width = context.measureText(text).width;
    const height = edgeLabelFontSizePx;
    candidates.push(buildEdgeCandidate(layout, args, text, width, height));
  });
  context.restore();

  candidates.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'node' ? -1 : 1;
    }
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return a.id.localeCompare(b.id);
  });

  const visibleNodeIds = new Set<string>();
  const visibleEdgeIds = new Set<string>();
  let nodeCount = 0;
  let edgeCount = 0;

  candidates.forEach((candidate) => {
    if (candidate.kind === 'node') {
      if (nodeCount >= maxNodeLabels) return;
    } else if (edgeCount >= maxEdgeLabels) {
      return;
    }

    if (!bboxIntersectsViewport(candidate.bbox, dimensions.width, dimensions.height)) {
      return;
    }

    if (hash.hasOverlap(candidate.bbox)) {
      return;
    }

    hash.insert(candidate.bbox);
    if (candidate.kind === 'node') {
      visibleNodeIds.add(candidate.id);
      nodeCount += 1;
    } else {
      visibleEdgeIds.add(candidate.id);
      edgeCount += 1;
    }
  });

  return { visibleNodeIds, visibleEdgeIds };
}
