import type { CanvasNode } from '../src/components/D3NodeLink/D3NldTypes';
import { applyLayoutPins, releaseNodes, runLayoutCycle, scheduleFreezeNodes } from '../src/components/D3NodeLink/utils/layoutPins';

const createNode = (id: string, x: number, y: number): CanvasNode => ({
  id,
  label: id,
  color: '#000',
  shape: 'circle',
  x,
  y,
  vx: 5,
  vy: 5,
});

describe('layout pinning behavior', () => {
  it('pins non-movable nodes and keeps them pinned after the layout cycle', () => {
    jest.useFakeTimers();
    const nodes = [createNode('a', 10, 20), createNode('b', 30, 40), createNode('c', 50, 60)];
    const onStart = jest.fn();
    const onFreeze = jest.fn();

    runLayoutCycle({
      getNodes: () => nodes,
      movableNodeIds: ['b'],
      freezeAfterMs: 250,
      onStart,
      onFreeze,
    });

    expect(nodes[0].fx).toBe(10);
    expect(nodes[0].fy).toBe(20);
    expect(nodes[1].fx).toBeNull();
    expect(nodes[1].fy).toBeNull();
    expect(nodes[2].fx).toBe(50);
    expect(nodes[2].fy).toBe(60);
    expect(nodes[0].vx).toBe(0);
    expect(nodes[0].vy).toBe(0);

    jest.advanceTimersByTime(250);

    expect(nodes[0].fx).toBe(10);
    expect(nodes[1].fx).toBe(30);
    expect(nodes[2].fx).toBe(50);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onFreeze).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('pins all nodes when no movable ids are provided', () => {
    const nodes = [createNode('a', 1, 2), createNode('b', 3, 4)];

    applyLayoutPins(nodes);

    expect(nodes[0].fx).toBe(1);
    expect(nodes[0].fy).toBe(2);
    expect(nodes[1].fx).toBe(3);
    expect(nodes[1].fy).toBe(4);
  });

  it('releases all nodes during drag and freezes them again after the delay', () => {
    jest.useFakeTimers();
    const nodes = [createNode('a', 10, 20), createNode('b', 30, 40)];

    applyLayoutPins(nodes);
    releaseNodes(nodes);

    expect(nodes[0].fx).toBeNull();
    expect(nodes[1].fx).toBeNull();

    const onFreeze = jest.fn();
    scheduleFreezeNodes({
      getNodes: () => nodes,
      delayMs: 1000,
      onFreeze,
    });

    jest.advanceTimersByTime(1000);

    expect(nodes[0].fx).toBe(10);
    expect(nodes[1].fx).toBe(30);
    expect(onFreeze).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
