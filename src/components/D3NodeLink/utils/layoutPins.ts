import type { CanvasNode } from '../D3NldTypes';

export type LayoutPinOptions = {
  movableNodeIds?: Iterable<string>;
};

export type LayoutCycleOptions = {
  getNodes: () => CanvasNode[];
  movableNodeIds?: Iterable<string>;
  freezeAfterMs?: number | null;
  onStart?: () => void;
  onFreeze?: () => void;
  schedule?: (handler: () => void, timeout: number) => ReturnType<typeof setTimeout>;
};

export function applyLayoutPins(nodes: CanvasNode[], options: LayoutPinOptions = {}): void {
  const movableIds = new Set(options.movableNodeIds ?? []);
  const hasMovable = movableIds.size > 0;

  nodes.forEach((node) => {
    const isMovable = hasMovable && movableIds.has(node.id);
    if (isMovable) {
      node.fx = null;
      node.fy = null;
    } else {
      node.fx = node.x ?? null;
      node.fy = node.y ?? null;
    }
    node.vx = 0;
    node.vy = 0;
  });
}

export function freezeNodes(nodes: CanvasNode[]): void {
  applyLayoutPins(nodes);
}

export function runLayoutCycle(options: LayoutCycleOptions): void {
  const { getNodes, movableNodeIds, freezeAfterMs = 1000, onStart, onFreeze, schedule = setTimeout } = options;

  applyLayoutPins(getNodes(), { movableNodeIds });
  onStart?.();

  if (freezeAfterMs && freezeAfterMs > 0) {
    schedule(() => {
      freezeNodes(getNodes());
      onFreeze?.();
    }, freezeAfterMs);
  }
}
