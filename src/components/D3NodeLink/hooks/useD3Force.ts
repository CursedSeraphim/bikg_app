// File: src/components/D3NodeLink/hooks/useD3Force.ts

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { CanvasEdge, CanvasNode } from '../D3NldTypes';

/**
 * Hook that manages:
 * 1. A force simulation (nodes + edges) with optional bounding‐box constraints.
 * 2. A canvas‐based draw function that renders nodes and edges.
 * 3. A zoomBehavior that updates a shared transformRef and redraws on zoom.
 *
 * @param canvasRef   Ref to the <canvas> element to draw into.
 * @param nodes       Array of CanvasNode to layout and render.
 * @param edges       Array of CanvasEdge to layout and render.
 * @param boundingBox "on" or "off"; when "on", constrain nodes within canvas.
 * @param dimensions  The { width, height } of the canvas (CSS pixels).
 *
 * Returns refs that can be shared with the parent component:
 * - simulationRef: reference to the D3 forceSimulation instance.
 * - transformRef:  reference to the current ZoomTransform (translate + scale).
 * - zoomBehaviorRef: the ZoomBehavior instance (so the parent can call .transform on it).
 */
export function useD3Force(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  boundingBox: string,
  dimensions: { width: number; height: number },
): {
  simulationRef: React.MutableRefObject<d3.Simulation<CanvasNode, CanvasEdge> | null>;
  transformRef: React.MutableRefObject<d3.ZoomTransform>;
  zoomBehaviorRef: React.MutableRefObject<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>;
} {
  const simulationRef = useRef<d3.Simulation<CanvasNode, CanvasEdge> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);

  const dpi = window.devicePixelRatio ?? 1;

  /**
   * Renders all nodes and edges onto the canvas, using the latest transformRef.
   */
  function drawCanvas(allNodes: CanvasNode[], allEdges: CanvasEdge[]) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.save();
    context.setTransform(dpi, 0, 0, dpi, 0, 0);

    // Apply zoom/pan from transformRef
    const t = transformRef.current;
    context.translate(t.x, t.y);
    context.scale(t.k, t.k);

    // Clear entire viewport (transformed)
    context.clearRect(-t.x / t.k, -t.y / t.k, dimensions.width / t.k, dimensions.height / t.k);

    // Common styles for edges
    context.strokeStyle = '#AAA';
    context.fillStyle = '#000';
    context.font = '12px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Draw edges
    allEdges.forEach((edge) => {
      // Prefer lookup by id to avoid stale object references (e.g. from ghost nodes)
      const sourceNode =
        allNodes.find((n) => n.id === (typeof edge.source === 'object' ? edge.source.id : edge.source)) ||
        (typeof edge.source === 'object' ? edge.source : undefined);
      const targetNode =
        allNodes.find((n) => n.id === (typeof edge.target === 'object' ? edge.target.id : edge.target)) ||
        (typeof edge.target === 'object' ? edge.target : undefined);

      if (!sourceNode || !targetNode) {
        return;
      }

      const sx = sourceNode.x ?? 0;
      const sy = sourceNode.y ?? 0;
      const tx = targetNode.x ?? 0;
      const ty = targetNode.y ?? 0;

      // Draw line
      if (edge.previewRemoval) {
        context.strokeStyle = 'rgba(255,0,0,0.6)';
      } else if (edge.ghost) {
        context.strokeStyle = 'rgba(170,170,170,0.5)';
      } else {
        context.strokeStyle = '#AAA';
      }
      context.beginPath();
      context.moveTo(sx, sy);
      context.lineTo(tx, ty);
      context.stroke();

      // Draw arrowhead
      const dx = tx - sx;
      const dy = ty - sy;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0) {
        const arrowSize = 8;
        const arrowWidth = 4;
        const backx = tx - (arrowSize * dx) / length;
        const backy = ty - (arrowSize * dy) / length;

        context.beginPath();
        context.moveTo(tx, ty);
        context.lineTo(backx + (arrowWidth * -dy) / length, backy + (arrowWidth * dx) / length);
        context.lineTo(backx - (arrowWidth * -dy) / length, backy - (arrowWidth * dx) / length);
        context.closePath();
        if (edge.previewRemoval) {
          context.fillStyle = 'rgba(255,0,0,0.6)';
        } else if (edge.ghost) {
          context.fillStyle = 'rgba(170,170,170,0.5)';
        } else {
          context.fillStyle = '#AAA';
        }
        context.fill();
      }

      // Draw edge label (if present)
      if (edge.label) {
        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2 - 5;
        context.save();
        context.fillStyle = '#333';
        context.fillText(edge.label, midX, midY);
        context.restore();
      }
    });

    // Draw nodes
    allNodes.forEach((node) => {
      context.beginPath();
      const radius = 6;
      if (node.ghost) {
        context.fillStyle = 'rgba(0,0,0,0.2)';
      } else {
        context.fillStyle = node.color;
      }
      context.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
      context.fill();

      context.strokeStyle = '#FFF';
      context.stroke();

      context.save();
      context.fillStyle = '#000';
      context.fillText(node.label, node.x ?? 0, (node.y ?? 0) - 12);
      context.restore();
    });

    context.restore();
  }

  /**
   * Initializes the force simulation and updates it whenever nodes or edges
   * change. Existing node positions are reused to avoid large jumps.
   */
  useEffect(() => {
    if (nodes.length === 0) {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      drawCanvas([], []);
      return;
    }

    const { width, height } = dimensions;
    const nodeRadius = 12;
    const labelPadding = 20;

    let sim = simulationRef.current;

    if (!sim) {
      sim = d3.forceSimulation<CanvasNode>(nodes);
      simulationRef.current = sim;
    }

    sim.nodes(nodes);

    let linkForce = sim.force('link') as d3.ForceLink<CanvasNode, CanvasEdge> | undefined;
    if (!linkForce) {
      linkForce = d3
        .forceLink<CanvasNode, CanvasEdge>(edges)
        .id((d) => d.id)
        .distance(150)
        .strength(1);
      sim.force('link', linkForce);
    } else {
      linkForce.links(edges);
    }

    sim.force('charge', d3.forceManyBody().strength(-9999).distanceMax(9999));
    sim.force('collision', d3.forceCollide(nodeRadius + labelPadding));

    sim.on('tick', () => {
      if (boundingBox === 'on') {
        nodes.forEach((node) => {
          node.x = Math.max(nodeRadius, Math.min(width - nodeRadius, node.x ?? 0));
          node.y = Math.max(nodeRadius, Math.min(height - nodeRadius, node.y ?? 0));
        });
      }
      drawCanvas(nodes, edges);
    });

    sim.alpha(0.5).restart();

    return () => {
      // Do not stop the simulation between updates to keep smooth transitions.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, dimensions.width, dimensions.height, boundingBox]);

  // Stop the simulation when the component unmounts
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, []);

  /**
   * Sets up D3 zoom behavior on the canvas. Zoom updates transformRef and triggers redraw.
   *
   * Pan still uses left‐click (button 0). We leave right‐click alone for context menu.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const selection = d3.select(canvas);

    const zoomBehavior = d3
      .zoom<HTMLCanvasElement, unknown>()
      .filter((event: any) => {
        // allow wheel for zoom, or left-click (button 0) for pan, but skip if Ctrl or Alt is held
        return (
          event.type === 'wheel' ||
          (event.type === 'mousedown' && event.button === 0 && !event.ctrlKey && !event.altKey)
        );
      })
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        drawCanvas(nodes, edges);
      });

    zoomBehaviorRef.current = zoomBehavior;
    selection.call(zoomBehavior as any);
    selection.on('dblclick.zoom', null); // disable default double‐click zoom

    return () => {
      selection.on('.zoom', null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, dimensions.width, dimensions.height]);

  return {
    simulationRef,
    transformRef,
    zoomBehaviorRef,
  };
}
