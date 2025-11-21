import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasNode } from '../D3NldTypes';
import { getNearNodeThreshold } from './hoverRadius';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetNode: CanvasNode | null;
}

export function useD3ContextMenu(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  nodes: CanvasNode[],
  transformRef: React.MutableRefObject<d3.ZoomTransform>,
  centerView: () => void,
  resetView: () => void,
  onSelectConnected: (node: CanvasNode | null) => void,
) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetNode: null,
  });

  const hideMenu = useCallback(() => setState((s) => ({ ...s, visible: false })), []);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      const [pxRaw, pyRaw] = d3.pointer(event, canvasRef.current);
      const transform = transformRef.current;
      const [px, py] = transform.invert([pxRaw, pyRaw]);

      const THRESHOLD = getNearNodeThreshold(transform);

      let closest: CanvasNode | null = null;
      let minDist = Infinity;
      nodes.forEach((node) => {
        const dx = (node.x ?? 0) - px;
        const dy = (node.y ?? 0) - py;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < minDist) {
          minDist = dist2;
          closest = node;
        }
      });

      const target = closest && minDist < THRESHOLD ? closest : null;

      setState({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        targetNode: target,
      });
    },
    [canvasRef, nodes, transformRef],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    canvas.addEventListener('contextmenu', handleContextMenu);
    return () => canvas.removeEventListener('contextmenu', handleContextMenu);
  }, [canvasRef, nodes, handleContextMenu]);

  useEffect(() => {
    if (!state.visible) return undefined;
    const handle = () => hideMenu();
    window.addEventListener('click', handle);
    return () => window.removeEventListener('click', handle);
  }, [state.visible, hideMenu]);

  useEffect(() => {
    if (state.visible && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let { x, y } = state;
      if (x + rect.width > window.innerWidth) {
        x = window.innerWidth - rect.width;
      }
      if (y + rect.height > window.innerHeight) {
        y = window.innerHeight - rect.height;
      }
      if (x !== state.x || y !== state.y) {
        setState((s) => ({ ...s, x, y }));
      }
    }
  }, [state]);

  const canSelect = Boolean(state.targetNode && (state.targetNode.violation || state.targetNode.exemplar || state.targetNode.type));

  const menu = state.visible ? (
    <div
      ref={menuRef}
      className="d3-context-menu"
      style={{
        position: 'fixed',
        top: state.y,
        left: state.x,
        background: '#fff',
        border: '1px solid #ccc',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        padding: '4px 0',
        zIndex: 1000,
        userSelect: 'none',
      }}
    >
      {state.targetNode ? (
        <>
          <div className="d3-context-menu-title">{state.targetNode.label}</div>
          {/* <button type="button" className="d3-context-menu-item">
            Node action for {state.targetNode.label}
          </button> */}
        </>
      ) : null}
      <button
        type="button"
        className="d3-context-menu-item"
        disabled={!canSelect}
        onClick={() => {
          if (!canSelect) return;
          onSelectConnected(state.targetNode);
          hideMenu();
        }}
      >
        Select connected focus nodes
      </button>
      <button
        type="button"
        className="d3-context-menu-item"
        onClick={() => {
          resetView();
          hideMenu();
        }}
      >
        Reset View
      </button>
      <button
        type="button"
        className="d3-context-menu-item"
        onClick={() => {
          centerView();
          hideMenu();
        }}
      >
        Center View
      </button>
    </div>
  ) : null;

  return { menu, hideMenu };
}
