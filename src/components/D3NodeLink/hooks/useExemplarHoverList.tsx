import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../Store/Store';
import { CanvasNode } from '../D3NldTypes';
import { getNearNodeThreshold } from './hoverRadius';

interface HoverState {
  visible: boolean;
  x: number;
  y: number;
  focusNodes: string[];
}

/**
 * Displays a floating list of focus nodes when hovering over a violation exemplar node.
 * The list is positioned near the node and appears on top of the UI.
 */
export default function useExemplarHoverList(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  nodes: CanvasNode[],
  transformRef: React.MutableRefObject<d3.ZoomTransform>,
) {
  const exemplarMap = useSelector((state: RootState) => state.combined.exemplarMap);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const overTooltipRef = useRef(false);
  const leaveTimeoutRef = useRef<number>();
  const [state, setState] = useState<HoverState>({ visible: false, x: 0, y: 0, focusNodes: [] });

  const clearLeaveTimeout = useCallback(() => {
    if (leaveTimeoutRef.current !== undefined) {
      window.clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = undefined;
    }
  }, []);

  const hide = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  const handleMove = useCallback(
    (event: MouseEvent) => {
      if (!canvasRef.current) return;
      clearLeaveTimeout();
      const [pxRaw, pyRaw] = d3.pointer(event, canvasRef.current);
      const [px, py] = transformRef.current.invert([pxRaw, pyRaw]);

      const threshold = getNearNodeThreshold(transformRef.current);

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
        const data = exemplarMap?.[closest.id];
        if (data?.nodes?.length && canvasRef.current) {
          const canvasRect = canvasRef.current.getBoundingClientRect();
          const [sx, sy] = transformRef.current.apply([closest.x ?? 0, closest.y ?? 0]);
          setState({
            visible: true,
            x: canvasRect.left + sx,
            y: canvasRect.top + sy,
            focusNodes: data.nodes,
          });
          return;
        }
      }
      hide();
    },
    [canvasRef, nodes, transformRef, exemplarMap, hide, clearLeaveTimeout],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const handleLeave = () => {
      leaveTimeoutRef.current = window.setTimeout(() => {
        if (!overTooltipRef.current) hide();
      }, 50);
    };
    const handleEnter = () => {
      clearLeaveTimeout();
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseleave', handleLeave);
    canvas.addEventListener('mouseenter', handleEnter);
    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseleave', handleLeave);
      canvas.removeEventListener('mouseenter', handleEnter);
      clearLeaveTimeout();
    };
  }, [canvasRef, handleMove, hide, clearLeaveTimeout]);

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
      onMouseEnter={() => {
        overTooltipRef.current = true;
        clearLeaveTimeout();
      }}
      onMouseLeave={() => {
        overTooltipRef.current = false;
        hide();
      }}
      style={{
        position: 'fixed',
        top: state.y,
        left: state.x,
        maxHeight: '10em',
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
