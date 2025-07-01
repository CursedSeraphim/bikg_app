import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { CanvasNode } from '../D3NldTypes';

interface HoverState {
  visible: boolean;
  x: number;
  y: number;
  focusNodes: string[];
}

/**
 * Displays a floating list of focus nodes when hovering over a violation group node.
 * The list is rendered as a fixed overlay so it is always visible on screen.
 */
export default function useViolationGroupHoverList(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  nodes: CanvasNode[],
  transformRef: React.MutableRefObject<d3.ZoomTransform>,
) {
  const violationMap = useSelector((state: any) => state.combined.violationMap as Record<string, { nodes: string[] }>);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<HoverState>({ visible: false, x: 0, y: 0, focusNodes: [] });

  const hide = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  const handleMove = useCallback(
    (event: MouseEvent) => {
      if (!canvasRef.current) return;
      const [pxRaw, pyRaw] = d3.pointer(event, canvasRef.current);
      const [px, py] = transformRef.current.invert([pxRaw, pyRaw]);

      const RADIUS = 200 * 2; // match detection radius used elsewhere
      const threshold = (RADIUS / (transformRef.current.k || 1)) ** 2;

      let closest: CanvasNode | null = null;
      let minDist = Infinity;
      nodes.forEach((n) => {
        const dx = (n.x ?? 0) - px;
        const dy = (n.y ?? 0) - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < minDist) {
          minDist = d2;
          closest = n;
        }
      });

      if (closest && minDist < threshold) {
        const data = violationMap?.[closest.id];
        if (data?.nodes?.length) {
          setState({ visible: true, x: event.clientX + 10, y: event.clientY + 10, focusNodes: data.nodes });
          return;
        }
      }
      hide();
    },
    [canvasRef, nodes, transformRef, violationMap, hide],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseleave', hide);
    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseleave', hide);
    };
  }, [canvasRef, handleMove, hide]);

  useEffect(() => {
    if (state.visible && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      let { x, y } = state;
      if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width;
      if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height;
      if (x !== state.x || y !== state.y) {
        setState((s) => ({ ...s, x, y }));
      }
    }
  }, [state]);

  const tooltip = state.visible ? (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: state.y,
        left: state.x,
        maxHeight: '50vh',
        overflowY: 'auto',
        background: '#fff',
        border: '1px solid #ccc',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        padding: '4px 8px',
        zIndex: 2000,
        fontSize: '12px',
      }}
    >
      <strong>Focus Nodes</strong>
      <ul style={{ margin: 0, paddingLeft: '1em' }}>
        {state.focusNodes.map((fn) => (
          <li key={fn}>{fn}</li>
        ))}
      </ul>
    </div>
  ) : null;

  return tooltip;
}
