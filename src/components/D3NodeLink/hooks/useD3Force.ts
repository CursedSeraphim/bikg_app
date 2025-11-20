// File: src/components/D3NodeLink/hooks/useD3Force.ts

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { CanvasEdge, CanvasNode } from '../D3NldTypes';
import { useLabelTransform } from './useLabelTransform';

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
 * @param initialCentering When true or a number, applies a temporary centering
 *                         force on initialization. The force is removed once
 *                         after the given timeout (defaults to ~1000 ms).
 *
 * Returns refs that can be shared with the parent component:
 * - simulationRef: reference to the D3 forceSimulation instance.
 * - transformRef:  reference to the current ZoomTransform (translate + scale).
 * - zoomBehaviorRef: the ZoomBehavior instance (so the parent can call .transform on it).
 * - redraw: function that re-renders the canvas with current nodes and edges.
 */
export function useD3Force(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  boundingBox: string,
  dimensions: { width: number; height: number },
  autoRestart: boolean = true,
  initialCentering: boolean | number = 1000,
): {
  simulationRef: React.MutableRefObject<d3.Simulation<CanvasNode, CanvasEdge> | null>;
  transformRef: React.MutableRefObject<d3.ZoomTransform>;
  zoomBehaviorRef: React.MutableRefObject<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>;
  redraw: () => void;
} {
  const simulationRef = useRef<d3.Simulation<CanvasNode, CanvasEdge> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const centerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dpi = window.devicePixelRatio ?? 1;
  const { mapNodeLabel, mapEdgeLabel } = useLabelTransform();

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
      } else if (edge.selected) {
        context.strokeStyle = '#222';
      } else {
        context.strokeStyle = '#AAA';
      }
      context.lineWidth = edge.selected ? 2 : 1;
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
        } else if (edge.selected) {
          context.fillStyle = '#222';
        } else {
          context.fillStyle = '#AAA';
        }
        context.fill();
      }

      // Draw edge label (if present)
      if (edge.label) {
        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2 - 5;
        const label = mapEdgeLabel(edge.label);
        context.save();
        context.lineWidth = 3;
        context.strokeStyle = '#fff';
        context.strokeText(label, midX, midY);
        context.fillStyle = '#333';
        context.fillText(label, midX, midY);
        context.restore();
      }
    });

    // Draw nodes
    allNodes.forEach((node) => {
      context.beginPath();
      const radius = node.selected ? 7.5 : 6;
      if (node.ghost) {
        context.fillStyle = 'rgba(0,0,0,0.2)';
      } else {
        context.fillStyle = node.color;
      }
      context.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
      context.fill();

      context.strokeStyle = node.selected ? '#222' : '#FFF';
      context.lineWidth = node.selected ? 2.5 : 1;
      context.stroke();
      context.lineWidth = 1;

      context.save();
      const label = mapNodeLabel(node.label);
      context.lineWidth = 3;
      context.strokeStyle = '#fff';
      context.strokeText(label, node.x ?? 0, (node.y ?? 0) - 12);
      context.fillStyle = '#000';
      context.fillText(label, node.x ?? 0, (node.y ?? 0) - 12);
      context.restore();
    });

    context.restore();
  }

  function toId(v: string | CanvasNode): string {
    return typeof v === 'object' ? v.id : v;
  }

  function filterEdgesByNodes(n: CanvasNode[], e: CanvasEdge[]): CanvasEdge[] {
    const set = new Set(n.map((x) => x.id));
    return e.filter((edge) => set.has(toId(edge.source)) && set.has(toId(edge.target)));
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
      if (initialCentering !== false) {
        const delay = typeof initialCentering === 'number' ? initialCentering : 1000;
        sim.force('center', d3.forceCenter(width / 2, height / 2));
        centerTimerRef.current = setTimeout(() => {
          sim.force('center', null);
          centerTimerRef.current = null;
        }, delay);
      }
      simulationRef.current = sim;
    }

    sim.nodes(nodes);

    // Ensure the link force only receives edges whose endpoints exist in the current node set
    const edgesForSim = filterEdgesByNodes(nodes, edges);

    let linkForce = sim.force('link') as d3.ForceLink<CanvasNode, CanvasEdge> | undefined;
    if (!linkForce) {
      linkForce = d3
        .forceLink<CanvasNode, CanvasEdge>(edgesForSim)
        .id((d) => d.id)
        .distance(150)
        .strength(1);
      sim.force('link', linkForce);
    } else {
      linkForce.links(edgesForSim);
    }

    sim.force('charge', d3.forceManyBody().strength(-9999).distanceMax(9999));
    sim.force('collision', d3.forceCollide(nodeRadius + labelPadding));

    // Draw only edges that are valid for the current node set
    drawRef.current = () => drawCanvas(nodes, edgesForSim);
    drawRef.current();

    sim.on('tick', () => {
      if (boundingBox === 'on') {
        nodes.forEach((node) => {
          node.x = Math.max(nodeRadius, Math.min(width - nodeRadius, node.x ?? 0));
          node.y = Math.max(nodeRadius, Math.min(height - nodeRadius, node.y ?? 0));
        });
      }
      drawCanvas(nodes, edgesForSim);
    });

    if (autoRestart) {
      sim.alpha(0.5).restart();
    }

    return () => {
      // Do not stop the simulation between updates to keep smooth transitions.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, dimensions.width, dimensions.height, boundingBox]);

  // Stop the simulation when the component unmounts
  useEffect(() => {
    return () => {
      if (centerTimerRef.current) {
        clearTimeout(centerTimerRef.current);
        centerTimerRef.current = null;
      }
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
        return event.type === 'wheel' || (event.type === 'mousedown' && event.button === 0 && !event.ctrlKey && !event.altKey);
      })
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        const edgesForDraw = filterEdgesByNodes(nodes, edges);
        drawCanvas(nodes, edgesForDraw);
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
    redraw: () => drawRef.current(),
  };
}
