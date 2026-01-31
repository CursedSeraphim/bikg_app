import * as d3 from 'd3';
import type { MutableRefObject, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CanvasNode } from '../D3NldTypes';

interface UseLassoSelectionParams {
  canvasRef: RefObject<HTMLCanvasElement>;
  overlayRef: RefObject<SVGSVGElement>;
  nodes: CanvasNode[];
  transformRef: MutableRefObject<d3.ZoomTransform>;
  onSelection: (selectedIds: string[]) => void;
  onLassoStart?: () => void;
}

export function useLassoSelection({
  canvasRef,
  overlayRef,
  nodes,
  transformRef,
  onSelection,
  onLassoStart,
}: UseLassoSelectionParams) {
  const lassoActiveRef = useRef(false);
  const pointsRef = useRef<[number, number][]>([]);

  const lineGenerator = useMemo(() => d3.line<[number, number]>().curve(d3.curveLinear), []);

  const clearLassoPath = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    d3.select(overlay).select('path.lasso-path').attr('d', '');
  }, [overlayRef]);

  const updateLassoPath = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const path = d3.select(overlay).select('path.lasso-path');
    const points = pointsRef.current;

    if (points.length === 0) {
      path.attr('d', '');
      return;
    }

    const d = `${lineGenerator(points)}Z`;
    path.attr('d', d);
  }, [overlayRef, lineGenerator]);

  const endLasso = useCallback(() => {
    if (!lassoActiveRef.current) return;

    lassoActiveRef.current = false;
    const polygon = pointsRef.current;
    pointsRef.current = [];
    clearLassoPath();

    if (polygon.length < 3) {
      onSelection([]);
      return;
    }

    const selectedIds = nodes
      .filter((node) => node.x !== undefined && node.y !== undefined)
      .filter((node) => {
        const [sx, sy] = transformRef.current.apply([node.x ?? 0, node.y ?? 0]);
        return d3.polygonContains(polygon, [sx, sy]);
      })
      .map((node) => node.id);

    onSelection(selectedIds);
  }, [clearLassoPath, nodes, onSelection, transformRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) {
      return () => {};
    }

    const overlaySelection = d3.select(overlay);
    let path = overlaySelection.select<SVGPathElement>('path.lasso-path');

    if (path.empty()) {
      path = overlaySelection
        .append('path')
        .attr('class', 'lasso-path')
        .attr('fill', 'rgba(80,80,80,0.08)')
        .attr('stroke', 'rgb(80,80,80)')
        .attr('stroke-width', 1.5)
        .attr('pointer-events', 'none');
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || !event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      event.preventDefault();

      const [x, y] = d3.pointer(event, canvas);
      lassoActiveRef.current = true;
      pointsRef.current = [[x, y]];
      onLassoStart?.();
      updateLassoPath();
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!lassoActiveRef.current) return;

      const [x, y] = d3.pointer(event, canvas);
      pointsRef.current = [...pointsRef.current, [x, y]];
      updateLassoPath();
    };

    const handleMouseUp = () => {
      if (!lassoActiveRef.current) return;
      endLasso();
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasRef, overlayRef, updateLassoPath, endLasso, onLassoStart]);

  return { lassoActiveRef };
}
