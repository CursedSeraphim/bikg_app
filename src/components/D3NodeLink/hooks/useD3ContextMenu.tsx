import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';
import { CanvasNode } from '../D3NldTypes';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetNode: CanvasNode | null;
}

export function useD3ContextMenu(canvasRef: React.RefObject<HTMLCanvasElement>, nodes: CanvasNode[], transformRef: React.MutableRefObject<d3.ZoomTransform>) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetNode: null,
  });

  const hideMenu = () => setState((s) => ({ ...s, visible: false }));

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    const [pxRaw, pyRaw] = d3.pointer(event, canvasRef.current);
    const transform = transformRef.current;
    const [px, py] = transform.invert([pxRaw, pyRaw]);

    const NODE_RADIUS_PX = 200;
    const CLICK_RADIUS_PX = NODE_RADIUS_PX * 2;
    const effectiveRadius = CLICK_RADIUS_PX / (transform?.k ?? 1);
    const THRESHOLD = effectiveRadius * effectiveRadius;

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
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    canvas.addEventListener('contextmenu', handleContextMenu);
    return () => canvas.removeEventListener('contextmenu', handleContextMenu);
  }, [canvasRef, nodes]);

  useEffect(() => {
    if (!state.visible) return undefined;
    const handle = () => hideMenu();
    window.addEventListener('click', handle);
    return () => window.removeEventListener('click', handle);
  }, [state.visible]);

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
  }, [state.visible, state.x, state.y]);

  const menu = state.visible ? (
    <div
      ref={menuRef}
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
          <button type="button" style={{ display: 'block', width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '4px 12px' }}>
            Node action for {state.targetNode.label}
          </button>
          <button type="button" style={{ display: 'block', width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '4px 12px' }}>
            Another node action
          </button>
        </>
      ) : (
        <button type="button" style={{ display: 'block', width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '4px 12px' }}>
          Empty space action
        </button>
      )}
    </div>
  ) : null;

  return { menu, hideMenu };
}
