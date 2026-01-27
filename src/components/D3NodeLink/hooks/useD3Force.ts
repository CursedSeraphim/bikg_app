// File: src/components/D3NodeLink/hooks/useD3Force.ts

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { getViolationCountsForNode } from '../../../utils/violations';
import { CanvasEdge, CanvasNode } from '../D3NldTypes';
import { D3_FORCE_EDGE_LABEL_FONT_SIZE_PX, D3_FORCE_LABEL_FONT_SIZE_PX, D3_FORCE_SEMANTIC_ZOOM_NODE_EDGE_SIZES, getNodeRadiusPx } from '../D3NldUtils';
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
 *                         after the given timeout (defaults to ~1000 ms).
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
  const nodeLabelFont = `${D3_FORCE_LABEL_FONT_SIZE_PX}px sans-serif`;
  const edgeLabelFont = `${D3_FORCE_EDGE_LABEL_FONT_SIZE_PX}px sans-serif`;
  const nodeLabelOffsetPx = D3_FORCE_LABEL_FONT_SIZE_PX;
  const edgeLabelOffsetPx = D3_FORCE_EDGE_LABEL_FONT_SIZE_PX / 2;
  const edgeBundlingCompatibilityThreshold = 0.4;
  const edgeBundlingStiffness = 60;
  const edgeBundlingStepSize = 0.2;

  type EdgeLayout = {
    edge: CanvasEdge;
    source: CanvasNode;
    target: CanvasNode;
    control: { x: number; y: number };
    label: { x: number; y: number };
  };

  function quadraticPoint(p0: number, p1: number, p2: number, t: number) {
    const oneMinusT = 1 - t;
    return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * t * p1 + t * t * p2;
  }

  function computeBundledEdges(allNodes: CanvasNode[], allEdges: CanvasEdge[]): EdgeLayout[] {
    const edgeEntries = allEdges
      .map((edge) => {
        const sourceNode =
          allNodes.find((n) => n.id === (typeof edge.source === 'object' ? edge.source.id : edge.source)) ||
          (typeof edge.source === 'object' ? edge.source : undefined);
        const targetNode =
          allNodes.find((n) => n.id === (typeof edge.target === 'object' ? edge.target.id : edge.target)) ||
          (typeof edge.target === 'object' ? edge.target : undefined);
        if (!sourceNode || !targetNode) {
          return null;
        }
        const sx = sourceNode.x ?? 0;
        const sy = sourceNode.y ?? 0;
        const tx = targetNode.x ?? 0;
        const ty = targetNode.y ?? 0;
        const dx = tx - sx;
        const dy = ty - sy;
        const length = Math.hypot(dx, dy);
        const mid = { x: (sx + tx) / 2, y: (sy + ty) / 2 };

        return {
          edge,
          source: sourceNode,
          target: targetNode,
          sx,
          sy,
          tx,
          ty,
          dx,
          dy,
          length,
          mid,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    const compatMidpoints: { x: number; y: number }[] = edgeEntries.map((entry) => entry.mid);
    if (edgeEntries.length <= 1) {
      return edgeEntries.map((entry) => {
        const control = entry.mid;
        const label = {
          x: quadraticPoint(entry.sx, control.x, entry.tx, 0.5),
          y: quadraticPoint(entry.sy, control.y, entry.ty, 0.5),
        };
        return { edge: entry.edge, source: entry.source, target: entry.target, control, label };
      });
    }

    edgeEntries.forEach((entry, index) => {
      const { length, dx, dy } = entry;
      if (length === 0) {
        compatMidpoints[index] = entry.mid;
        return;
      }
      const dirx = dx / length;
      const diry = dy / length;
      let sumX = entry.mid.x;
      let sumY = entry.mid.y;
      let count = 1;

      edgeEntries.forEach((other, otherIndex) => {
        if (otherIndex === index) return;
        if (other.length === 0) return;
        const otherDirx = other.dx / other.length;
        const otherDiry = other.dy / other.length;
        const angleCompatibility = Math.abs(dirx * otherDirx + diry * otherDiry);
        if (angleCompatibility >= edgeBundlingCompatibilityThreshold) {
          sumX += other.mid.x;
          sumY += other.mid.y;
          count += 1;
        }
      });

      const avgMid = { x: sumX / count, y: sumY / count };
      const vx = avgMid.x - entry.mid.x;
      const vy = avgMid.y - entry.mid.y;
      const dot = vx * dirx + vy * diry;
      const perpX = vx - dot * dirx;
      const perpY = vy - dot * diry;
      const scale = edgeBundlingStepSize * (edgeBundlingStiffness / 60);
      const maxOffset = length * 0.35;
      const offsetMagnitude = Math.min(maxOffset, Math.hypot(perpX, perpY) * scale);
      const perpLength = Math.hypot(perpX, perpY) || 1;
      const offsetX = (perpX / perpLength) * offsetMagnitude;
      const offsetY = (perpY / perpLength) * offsetMagnitude;
      compatMidpoints[index] = { x: entry.mid.x + offsetX, y: entry.mid.y + offsetY };
    });

    return edgeEntries.map((entry, index) => {
      const control = compatMidpoints[index];
      const label = {
        x: quadraticPoint(entry.sx, control.x, entry.tx, 0.5),
        y: quadraticPoint(entry.sy, control.y, entry.ty, 0.5),
      };
      return { edge: entry.edge, source: entry.source, target: entry.target, control, label };
    });
  }

  function drawPolygon(context: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, rotation = -Math.PI / 2) {
    context.beginPath();
    for (let i = 0; i < sides; i += 1) {
      const angle = rotation + (i * 2 * Math.PI) / sides;
      const px = x + radius * Math.cos(angle);
      const py = y + radius * Math.sin(angle);
      if (i === 0) {
        context.moveTo(px, py);
      } else {
        context.lineTo(px, py);
      }
    }
    context.closePath();
  }

  function drawNodeShape(context: CanvasRenderingContext2D, node: CanvasNode, radius: number) {
    const x = node.x ?? 0;
    const y = node.y ?? 0;

    switch (node.shape) {
      case 'rectangle':
        context.beginPath();
        context.rect(x - radius, y - radius, radius * 2, radius * 2);
        break;
      case 'diamond':
        drawPolygon(context, x, y, radius, 4, Math.PI / 4);
        break;
      case 'triangle':
        drawPolygon(context, x, y, radius, 3);
        break;
      case 'pentagon':
        drawPolygon(context, x, y, radius, 5);
        break;
      case 'hexagon':
        drawPolygon(context, x, y, radius, 6, Math.PI / 6);
        break;
      case 'circle':
      default:
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI);
        break;
    }
  }

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
    const semanticScale = D3_FORCE_SEMANTIC_ZOOM_NODE_EDGE_SIZES ? 1 / t.k : 1;

    // Clear entire viewport (transformed)
    context.clearRect(-t.x / t.k, -t.y / t.k, dimensions.width / t.k, dimensions.height / t.k);

    // Common styles for edges
    context.strokeStyle = '#AAA';
    context.fillStyle = '#000';
    context.font = nodeLabelFont;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    const bundledEdges = computeBundledEdges(allNodes, allEdges);

    const hasSelection = allNodes.some((node) => node.selected) || allEdges.some((edge) => edge.selected);

    // Draw edges
    bundledEdges.forEach(({ edge, source, target, control, label }) => {
      const sx = source.x ?? 0;
      const sy = source.y ?? 0;
      const tx = target.x ?? 0;
      const ty = target.y ?? 0;
      const dimNonSelected = hasSelection && !edge.selected;

      context.save();
      context.globalAlpha = dimNonSelected ? 0.1 : 1;

      // Draw curve
      if (edge.previewRemoval) {
        context.strokeStyle = 'rgba(255,0,0,0.6)';
      } else if (edge.ghost) {
        context.strokeStyle = 'rgba(170,170,170,0.5)';
      } else {
        context.strokeStyle = edge.color ?? '#AAA';
      }
      const baseEdgeWidth = 2;
      context.lineWidth = baseEdgeWidth * semanticScale;
      context.beginPath();
      context.moveTo(sx, sy);
      context.quadraticCurveTo(control.x, control.y, tx, ty);
      context.stroke();

      // Draw arrowhead
      const dx = tx - control.x;
      const dy = ty - control.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 1) {
        const targetCount = getViolationCountsForNode(target.id).cumulativeViolations;
        const targetRadius = getNodeRadiusPx(targetCount, target.shape) * semanticScale;
        const targetOutline = 1.25 * semanticScale;
        const arrowPadding = 1 * semanticScale;
        const arrowSize = 10 * semanticScale;
        const arrowWidth = 5 * semanticScale;
        const tipOffset = Math.min(targetRadius + targetOutline + arrowPadding, length - 1);
        const tOffset = Math.min(0.15, tipOffset / length);
        const tArrow = 1 - tOffset;
        const tipx = quadraticPoint(sx, control.x, tx, tArrow);
        const tipy = quadraticPoint(sy, control.y, ty, tArrow);
        const tangentDx = 2 * (1 - tArrow) * (control.x - sx) + 2 * tArrow * (tx - control.x);
        const tangentDy = 2 * (1 - tArrow) * (control.y - sy) + 2 * tArrow * (ty - control.y);
        const tangentLength = Math.hypot(tangentDx, tangentDy) || 1;
        const backx = tipx - (arrowSize * tangentDx) / tangentLength;
        const backy = tipy - (arrowSize * tangentDy) / tangentLength;

        context.beginPath();
        context.moveTo(tipx, tipy);
        context.lineTo(backx + (arrowWidth * -tangentDy) / tangentLength, backy + (arrowWidth * tangentDx) / tangentLength);
        context.lineTo(backx - (arrowWidth * -tangentDy) / tangentLength, backy - (arrowWidth * tangentDx) / tangentLength);
        context.closePath();
        if (edge.previewRemoval) {
          context.fillStyle = 'rgba(255,0,0,0.6)';
        } else if (edge.ghost) {
          context.fillStyle = 'rgba(170,170,170,0.5)';
        } else {
          context.fillStyle = edge.color ?? '#AAA';
        }
        context.fill();
      }

      // Draw edge label (if present)
      if (edge.label) {
        const labelText = mapEdgeLabel(edge.label);
        context.save();
        const t = transformRef.current;
        const screenX = label.x * t.k;
        const screenY = label.y * t.k - edgeLabelOffsetPx;
        context.scale(1 / t.k, 1 / t.k);
        context.font = edgeLabelFont;
        context.lineWidth = 3;
        context.strokeStyle = '#fff';
        context.strokeText(labelText, screenX, screenY);
        context.fillStyle = '#858585';
        context.fillText(labelText, screenX, screenY);
        context.restore();
      }

      context.restore();
    });

    // Draw nodes
    allNodes.forEach((node) => {
      const count = getViolationCountsForNode(node.id).cumulativeViolations;
      const radius = getNodeRadiusPx(count, node.shape) * semanticScale;
      const dimNonSelected = hasSelection && !node.selected;
      context.save();
      context.globalAlpha = dimNonSelected ? 0.1 : 1;
      drawNodeShape(context, node, radius);
      if (node.ghost) {
        context.fillStyle = 'rgba(0,0,0,0.2)';
      } else {
        context.fillStyle = node.color;
      }
      context.fill();

      context.strokeStyle = '#FFF';
      const baseNodeStrokeWidth = 2.5;
      context.lineWidth = baseNodeStrokeWidth * semanticScale;
      context.stroke();
      context.lineWidth = 1;

      context.save();
      const label = mapNodeLabel(node.label);
      const t = transformRef.current;
      const screenX = (node.x ?? 0) * t.k;
      const screenY = (node.y ?? 0) * t.k - nodeLabelOffsetPx;
      context.scale(1 / t.k, 1 / t.k);
      context.font = nodeLabelFont;
      context.lineWidth = 3;
      context.strokeStyle = '#fff';
      context.strokeText(label, screenX, screenY);
      context.fillStyle = '#000';
      context.fillText(label, screenX, screenY);
      context.restore();

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
    const labelPadding = 20;

    let sim = simulationRef.current;

    if (!sim) {
      sim = d3.forceSimulation<CanvasNode>(nodes);
      sim.force('center', d3.forceCenter(width / 2, height / 2));
      const GRAVITY_STRENGTH = 0.08; // try 0.02..0.2
      sim.force('x', d3.forceX(width / 2).strength(GRAVITY_STRENGTH));
      sim.force('y', d3.forceY(height / 2).strength(GRAVITY_STRENGTH));

      // No timer / removal
      if (centerTimerRef.current) {
        clearTimeout(centerTimerRef.current);
        centerTimerRef.current = null;
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
        .distance(30)
        .strength(0.25);
      sim.force('link', linkForce);
    } else {
      linkForce.links(edgesForSim).distance(30).strength(0.25);
    }

    // Mild, local-ish charge (Observable-like)
    sim.force('charge', d3.forceManyBody<CanvasNode>().strength(-120).distanceMax(400));

    // Gentle collision (avoid “never settles”)
    const COLLIDE_PADDING = 4; // try 2..10
    const COLLIDE_STRENGTH = 0.9; // try 0.6..1.0
    const COLLIDE_ITERATIONS = 2; // try 1..4

    sim.force(
      'collision',
      d3
        .forceCollide<CanvasNode>((node) => {
          const count = getViolationCountsForNode(node.id).cumulativeViolations;
          return getNodeRadiusPx(count, node.shape) + COLLIDE_PADDING;
        })
        .strength(COLLIDE_STRENGTH)
        .iterations(COLLIDE_ITERATIONS),
    );

    sim.velocityDecay(0.5);

    // Draw only edges that are valid for the current node set
    drawRef.current = () => drawCanvas(nodes, edgesForSim);
    drawRef.current();

    sim.on('tick', () => {
      if (boundingBox === 'on') {
        nodes.forEach((node) => {
          // eslint-disable-next-line no-param-reassign
          const count = getViolationCountsForNode(node.id).cumulativeViolations;
          const nodeRadius = getNodeRadiusPx(count, node.shape);
          node.x = Math.max(nodeRadius, Math.min(width - nodeRadius, node.x ?? 0));
          // eslint-disable-next-line no-param-reassign
          node.y = Math.max(nodeRadius, Math.min(height - nodeRadius, node.y ?? 0));
        });
      }
      drawCanvas(nodes, edgesForSim);
    });

    if (autoRestart) {
      sim.alpha(0.5).restart();
    }

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
      return undefined;
    }
    const selection = d3.select(canvas);

    const zoomBehavior = d3
      .zoom<HTMLCanvasElement, unknown>()
      // d3 events really are typed as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    selection.call(zoomBehavior);
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
