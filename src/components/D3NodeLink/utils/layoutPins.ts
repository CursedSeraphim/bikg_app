import type { CanvasNode } from '../D3NldTypes';

export type LayoutPinOptions = {
  movableNodeIds?: Iterable<string>;
};

type TimeoutHandle = ReturnType<typeof globalThis.setTimeout>;
type ScheduleFn = (handler: () => void, timeout: number) => TimeoutHandle;

export type LayoutCycleOptions = {
  getNodes: () => CanvasNode[];
  movableNodeIds?: Iterable<string>;
  freezeAfterMs?: number | null;
  onStart?: () => void;
  onFreeze?: () => void;
  schedule?: ScheduleFn;
};

const updateNodeState = (
  node: CanvasNode,
  state: {
    fx: CanvasNode['fx'];
    fy: CanvasNode['fy'];
    vx?: CanvasNode['vx'];
    vy?: CanvasNode['vy'];
  },
): void => {
  Object.assign(node, {
    vx: 0,
    vy: 0,
    ...state,
  });
};

export function applyLayoutPins(nodes: CanvasNode[], options: LayoutPinOptions = {}): void {
  const movableIds = new Set(options.movableNodeIds ?? []);
  const hasMovable = movableIds.size > 0;

  nodes.forEach((node) => {
    const isMovable = hasMovable && movableIds.has(node.id);
    updateNodeState(node, {
      fx: isMovable ? null : node.x ?? null,
      fy: isMovable ? null : node.y ?? null,
    });
  });
}

export function freezeNodes(nodes: CanvasNode[]): void {
  applyLayoutPins(nodes);
}

export function releaseNodes(nodes: CanvasNode[]): void {
  nodes.forEach((node) => {
    updateNodeState(node, { fx: null, fy: null });
  });
}

export function scheduleFreezeNodes(
  options: {
    getNodes: () => CanvasNode[];
    delayMs?: number;
    schedule?: ScheduleFn;
    onFreeze?: () => void;
    shouldFreeze?: () => boolean;
  },
): TimeoutHandle | null {
  const { getNodes, delayMs = 1000, schedule = globalThis.setTimeout, onFreeze, shouldFreeze } = options;

  if (!delayMs || delayMs <= 0) {
    if (!shouldFreeze || shouldFreeze()) {
      freezeNodes(getNodes());
      onFreeze?.();
    }
    return null;
  }

  return schedule(() => {
    if (!shouldFreeze || shouldFreeze()) {
      freezeNodes(getNodes());
      onFreeze?.();
    }
  }, delayMs);
}

export function runLayoutCycle(options: LayoutCycleOptions): TimeoutHandle | null {
  const { getNodes, movableNodeIds, freezeAfterMs = 1000, onStart, onFreeze, schedule = globalThis.setTimeout } =
    options;

  applyLayoutPins(getNodes(), { movableNodeIds });
  onStart?.();

  if (freezeAfterMs && freezeAfterMs > 0) {
    return schedule(() => {
      freezeNodes(getNodes());
      onFreeze?.();
    }, freezeAfterMs);
  }
  return null;
}
