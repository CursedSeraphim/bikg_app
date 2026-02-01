import type { CanvasNode } from '../D3NldTypes';

export type LayoutPinOptions = {
  movableNodeIds?: Iterable<string>;
};

const DEFAULT_MAX_WAIT_MS = 5000;
const DEFAULT_CHECK_INTERVAL_MS = 100;
const DEFAULT_ALPHA_THRESHOLD = 0.02;
const DEFAULT_STABLE_CHECKS = 3;

type TimeoutHandle = ReturnType<typeof setTimeout> | number;
type ScheduleFn = (handler: () => void, timeout: number) => TimeoutHandle;

export type LayoutFreezeHandle = { cancel: () => void };

type SimulationLike = {
  alpha: () => number;
};

export type LayoutCycleOptions = {
  getNodes: () => CanvasNode[];
  movableNodeIds?: Iterable<string>;
  /**
   * Freeze when layout converges; if convergence takes too long, freeze after this max wait.
   * Defaults to 5000ms (per requirement).
   */
  maxWaitMs?: number | null;
  onStart?: () => void;
  onFreeze?: () => void;
  schedule?: ScheduleFn;
  simulation?: SimulationLike | null;
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
      fx: isMovable ? null : (node.x ?? null),
      fy: isMovable ? null : (node.y ?? null),
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

export function scheduleFreezeNodes(options: {
  getNodes: () => CanvasNode[];
  /**
   * Backward-compatible alias (previous behavior). If provided, treated as maxWaitMs.
   * Prefer maxWaitMs going forward.
   */
  delayMs?: number;
  maxWaitMs?: number;
  schedule?: ScheduleFn;
  onFreeze?: () => void;
  shouldFreeze?: () => boolean;
  simulation?: SimulationLike | null;
  checkIntervalMs?: number;
  alphaThreshold?: number;
  stableChecks?: number;
}): LayoutFreezeHandle | null {
  const {
    getNodes,
    schedule = globalThis.setTimeout,
    onFreeze,
    shouldFreeze,
    simulation = null,
    checkIntervalMs = DEFAULT_CHECK_INTERVAL_MS,
    alphaThreshold = DEFAULT_ALPHA_THRESHOLD,
    stableChecks = DEFAULT_STABLE_CHECKS,
  } = options;

  const maxWaitMs = options.maxWaitMs ?? options.delayMs ?? DEFAULT_MAX_WAIT_MS;

  let cancelled = false;
  let checkHandle: TimeoutHandle | null = null;
  let maxWaitHandle: TimeoutHandle | null = null;

  let stableBelow = 0;

  const doFreeze = () => {
    if (cancelled) return;
    if (shouldFreeze && !shouldFreeze()) return;

    cancelled = true;
    if (checkHandle) globalThis.clearTimeout(checkHandle);
    if (maxWaitHandle) globalThis.clearTimeout(maxWaitHandle);

    freezeNodes(getNodes());
    onFreeze?.();
  };

  if (!maxWaitMs || maxWaitMs <= 0) {
    // immediate (still gate via shouldFreeze)
    doFreeze();
    return null;
  }

  // Hard fallback: freeze after maxWaitMs regardless of convergence.
  maxWaitHandle = schedule(doFreeze, maxWaitMs);

  const check = () => {
    if (cancelled) return;

    if (shouldFreeze && !shouldFreeze()) {
      stableBelow = 0;
      checkHandle = schedule(check, checkIntervalMs);
      return;
    }

    if (!simulation) {
      // No simulation to observe; rely on maxWait fallback.
      checkHandle = schedule(check, checkIntervalMs);
      return;
    }

    const a = simulation.alpha();
    if (a <= alphaThreshold) {
      stableBelow += 1;
      if (stableBelow >= stableChecks) {
        doFreeze();
        return;
      }
    } else {
      stableBelow = 0;
    }

    checkHandle = schedule(check, checkIntervalMs);
  };

  checkHandle = schedule(check, checkIntervalMs);

  return {
    cancel: () => {
      cancelled = true;
      if (checkHandle) globalThis.clearTimeout(checkHandle);
      if (maxWaitHandle) globalThis.clearTimeout(maxWaitHandle);
    },
  };
}

export function runLayoutCycle(options: LayoutCycleOptions): LayoutFreezeHandle | null {
  const { getNodes, movableNodeIds, maxWaitMs = DEFAULT_MAX_WAIT_MS, onStart, onFreeze, schedule = globalThis.setTimeout, simulation = null } = options;

  applyLayoutPins(getNodes(), { movableNodeIds });
  onStart?.();

  return scheduleFreezeNodes({
    getNodes,
    maxWaitMs: maxWaitMs ?? DEFAULT_MAX_WAIT_MS,
    schedule,
    onFreeze,
    simulation,
  });
}
