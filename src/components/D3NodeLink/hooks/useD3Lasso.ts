import * as d3 from 'd3';
import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import { CanvasNode } from '../D3NldTypes';

type LassoPoint = [number, number];

interface UseD3LassoOptions {
  canvasRef: RefObject<HTMLCanvasElement>;
  overlayCanvasRef: RefObject<HTMLCanvasElement>;
  nodes: CanvasNode[];
  transformRef: MutableRefObject<d3.ZoomTransform>;
  onSelection: (selectedNodeIds: string[]) => void;
  enabled?: boolean;
  dpi?: number;
}

export function useD3Lasso({
  canvasRef,
  overlayCanvasRef,
  nodes,
  transformRef,
  onSelection,
  enabled = true,
  dpi = window.devicePixelRatio ?? 1,
}: UseD3LassoOptions) {
  const lassoActiveRef = useRef(false);
  const lassoPointsRef = useRef<LassoPoint[]>([]);
  const nodesRef = useRef(nodes);
  const onSelectionRef = useRef(onSelection);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    onSelectionRef.current = onSelection;
  }, [onSelection]);

  const clearOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [overlayCanvasRef]);

  const drawLasso = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const points = lassoPointsRef.current;
    if (points.length === 0) return;

    ctx.save();
    ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgb(80, 80, 80)';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(80, 80, 80, 0.05)';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [overlayCanvasRef, dpi]);

  const endLasso = useCallback(() => {
    if (!lassoActiveRef.current) return;
    lassoActiveRef.current = false;

    const polygon = lassoPointsRef.current;
    lassoPointsRef.current = [];
    clearOverlay();

    if (polygon.length < 3 || Math.abs(d3.polygonArea(polygon)) < 4) {
      return;
    }

    const selectedNodeIds = nodesRef.current
      .filter((node) => !node.ghost && node.x !== undefined && node.y !== undefined)
      .filter((node) => {
        const [sx, sy] = transformRef.current.apply([node.x ?? 0, node.y ?? 0]);
        return d3.polygonContains(polygon, [sx, sy]);
      })
      .map((node) => node.id);

    onSelectionRef.current(selectedNodeIds);
  }, [clearOverlay, transformRef]);

  useEffect(() => {
    if (!enabled) return () => {};

    const canvas = canvasRef.current;
    if (!canvas) return () => {};

    const getPoint = (event: MouseEvent): LassoPoint => {
      const rect = canvas.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || !event.ctrlKey) return;
      lassoActiveRef.current = true;
      lassoPointsRef.current = [getPoint(event)];
      drawLasso();
      event.preventDefault();
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!lassoActiveRef.current) return;
      if (!event.ctrlKey) {
        endLasso();
        return;
      }

      const point = getPoint(event);
      const points = lassoPointsRef.current;
      const last = points[points.length - 1];
      if (!last || Math.hypot(point[0] - last[0], point[1] - last[1]) > 2) {
        points.push(point);
        drawLasso();
      }
    };

    const handleMouseUp = () => {
      if (!lassoActiveRef.current) return;
      endLasso();
    };

    const handleMouseLeave = () => {
      if (!lassoActiveRef.current) return;
      endLasso();
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [canvasRef, drawLasso, enabled, endLasso]);

  return {
    lassoActiveRef,
    clearLasso: clearOverlay,
  };
}
