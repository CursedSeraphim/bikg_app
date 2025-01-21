// src/components/D3NodeLink/D3NLDIslandForce.tsx
import * as d3 from 'd3';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

// Redux-based data selectors, same as before:
import { selectCumulativeNumberViolationsPerNode, selectTypes, selectViolations } from '../Store/CombinedSlice';

// Our hook for fetching the node/edge data from Redux + selectCytoData:
import { useD3Data } from './useD3Data';

interface CanvasNode {
  id: string;
  label: string;
  color: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface CanvasEdge {
  source: string | CanvasNode;
  target: string | CanvasNode;
  label?: string;
  visible: boolean;
}

type Props = {
  rdfOntology: string;
  onLoaded?: () => void;
};

function extractNamespace(uri: string) {
  const match = uri.match(/^([^:]+):/);
  return match ? match[1] : '';
}

/**
 * Returns a color based on the node's namespace.
 *
 *  - If namespace is sh => #669900
 *  - If namespace is ex => #DA5700
 *  - Else => #007C45
 */
function computeColorForId(id: string): string {
  const ns = extractNamespace(id).toLowerCase();
  if (ns === 'sh') return '#669900';
  if (ns === 'ex') return '#DA5700';
  return '#007C45';
}

/**
 * Main D3-based MVP that:
 * 1) Displays a force-directed graph for the Redux data pipeline.
 * 2) Allows dragging of nodes.
 * 3) Hides nodes that are marked invisible from Redux.
 * 4) Double-click toggles the entire subtree of a node.
 */
export default function D3NLDView({ rdfOntology, onLoaded }: Props) {
  // Grab relevant store data
  const violations = useSelector(selectViolations);
  const types = useSelector(selectTypes);
  const cumulativeNumberViolationsPerType = useSelector(selectCumulativeNumberViolationsPerNode);

  // Get raw node/edge data from the Redux pipeline
  const { loading, cyDataNodes, cyDataEdges } = useD3Data({
    rdfOntology,
    violations,
    types,
    cumulativeNumberViolationsPerType,
    onLoaded,
  });

  // The final arrays for D3 once we filter out hidden nodes, etc.
  const [d3Nodes, setD3Nodes] = useState<CanvasNode[]>([]);
  const [d3Edges, setD3Edges] = useState<CanvasEdge[]>([]);

  // We track a set of node IDs hidden by double-click toggling. Redux might also hide nodes,
  // so we combine both sets of hide logic (Redux + local toggles).
  const hiddenNodesRef = useRef<Set<string>>(new Set());

  // A reference to the force simulation
  const simulationRef = useRef<d3.Simulation<CanvasNode, CanvasEdge> | null>(null);

  // Canvas + layout
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const dpi = window.devicePixelRatio ?? 1;

  /**
   * Build a total adjacency map from edges, for subtree toggling.
   * If an edge is (source => target), we consider `source`'s child to be `target`.
   * We'll use BFS from a node to hide or show all its descendants.
   */
  const adjacency = useMemo(() => {
    const adj: Record<string, string[]> = {};
    // We gather adjacency from **all** edges, ignoring the visible/invisible flag,
    // so that toggled nodes can appear/disappear even if Redux was hiding them previously.
    cyDataEdges.forEach((edge) => {
      const s = edge.data.source;
      const t = edge.data.target;
      if (!adj[s]) adj[s] = [];
      adj[s].push(t);
    });
    return adj;
  }, [cyDataEdges]);

  /**
   * Convert the current Redux data into final arrays for the D3 graph,
   * ignoring nodes hidden by Redux or local toggles.
   */
  const convertData = useCallback(() => {
    // Filter out hidden nodes from Redux, then also filter out if in hiddenNodesRef
    const visibleNodeData = cyDataNodes.filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id));

    // Collect visible IDs in a set for quick membership checks
    const visibleIds = new Set(visibleNodeData.map((n) => n.data.id));

    // Filter edges to those that are also visible
    const visibleEdgeData = cyDataEdges.filter((e) => e.data.visible && visibleIds.has(e.data.source) && visibleIds.has(e.data.target));

    // Build final CanvasNode array
    const newNodes: CanvasNode[] = visibleNodeData.map((n) => ({
      id: n.data.id,
      label: n.data.label,
      color: computeColorForId(n.data.id),
    }));

    // Build final CanvasEdge array
    const newEdges: CanvasEdge[] = visibleEdgeData.map((e) => ({
      source: e.data.source,
      target: e.data.target,
      label: e.data.label,
      visible: true,
    }));

    setD3Nodes(newNodes);
    setD3Edges(newEdges);
  }, [cyDataNodes, cyDataEdges]);

  // Whenever the underlying Redux data changes, re-convert to final D3 arrays
  useEffect(() => {
    if (!loading) {
      convertData();
    }
  }, [convertData, loading]);

  /**
   * The main rendering routine on <canvas>.
   */
  const drawCanvas = useCallback(
    (allNodes: CanvasNode[], allEdges: CanvasEdge[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      context.save();
      context.setTransform(dpi, 0, 0, dpi, 0, 0);
      context.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw edges
      context.strokeStyle = '#AAA';
      context.fillStyle = '#000';
      context.font = '12px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      allEdges.forEach((edge) => {
        const sourceNode = typeof edge.source === 'object' ? edge.source : allNodes.find((n) => n.id === edge.source);
        const targetNode = typeof edge.target === 'object' ? edge.target : allNodes.find((n) => n.id === edge.target);

        if (!sourceNode || !targetNode) return;

        context.beginPath();
        context.moveTo(sourceNode.x ?? 0, sourceNode.y ?? 0);
        context.lineTo(targetNode.x ?? 0, targetNode.y ?? 0);
        context.stroke();

        // Edge label near midpoint
        if (edge.label) {
          const midX = ((sourceNode.x ?? 0) + (targetNode.x ?? 0)) / 2;
          const midY = ((sourceNode.y ?? 0) + (targetNode.y ?? 0)) / 2 - 5;
          context.save();
          context.fillStyle = '#333';
          context.fillText(edge.label, midX, midY);
          context.restore();
        }
      });

      // Draw nodes
      allNodes.forEach((node) => {
        context.beginPath();
        context.fillStyle = node.color;
        const radius = 6;
        context.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
        context.fill();

        context.strokeStyle = '#FFF';
        context.stroke();

        // Node label above the node
        context.save();
        context.fillStyle = '#000';
        context.fillText(node.label, node.x ?? 0, (node.y ?? 0) - 12);
        context.restore();
      });

      context.restore();
    },
    [dimensions, dpi],
  );

  /**
   * Build / update the simulation with the requested forces.
   */
  const initializeSimulation = useCallback(
    (allNodes: CanvasNode[], allEdges: CanvasEdge[]) => {
      if (!allNodes.length) {
        if (simulationRef.current) {
          simulationRef.current.stop();
          simulationRef.current = null;
        }
        return;
      }

      const { width } = dimensions;
      const { height } = dimensions;
      const r = 12; // Adjust as needed for the radius of nodes

      // Build new simulation
      const sim = d3
        .forceSimulation<CanvasNode>(allNodes)
        .force(
          'link',
          d3.forceLink<CanvasNode, CanvasEdge>(allEdges).id((d) => d.id),
        )
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide(r))
        .on('tick', () => {
          // Constrain nodes to stay within bounds
          allNodes.forEach((node) => {
            node.x = Math.max(r, Math.min(width - r, node.x ?? 0));
            node.y = Math.max(r, Math.min(height - r, node.y ?? 0));
          });

          drawCanvas(allNodes, allEdges);
        });

      simulationRef.current = sim;
    },
    [dimensions, drawCanvas],
  );

  /**
   * D3 drag: allows user to drag nodes around while simulation is ongoing.
   */
  const handleDrag = d3
    .drag<HTMLCanvasElement, CanvasNode>()
    .subject((event) => {
      if (!simulationRef.current) return null;
      const [px, py] = d3.pointer(event, canvasRef.current);
      return d3.least(d3Nodes, (node) => {
        const dx = (node.x ?? 0) - px;
        const dy = (node.y ?? 0) - py;
        return dx * dx + dy * dy;
      });
    })
    .on('start', (event) => {
      if (!simulationRef.current) return;
      if (!event.active) simulationRef.current.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    })
    .on('drag', (event) => {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    })
    .on('end', (event) => {
      if (!simulationRef.current) return;
      if (!event.active) simulationRef.current.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    });

  /**
   * Double-click => toggle subtree (children) of the nearest node.
   * We'll do BFS from the double-clicked node to either hide or unhide
   * all of its descendants.
   */
  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      if (!simulationRef.current) return;
      // Find nearest node:
      const [px, py] = d3.pointer(event, canvasRef.current);
      let closestNode: CanvasNode | null = null;
      let minDist = Infinity;

      d3Nodes.forEach((node) => {
        const dx = (node.x ?? 0) - px;
        const dy = (node.y ?? 0) - py;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < minDist) {
          minDist = dist2;
          closestNode = node;
        }
      });

      // If it's reasonably close to a node, toggle that subtree
      if (closestNode && minDist < 100) {
        const nodeId = closestNode.id;
        const isHidden = hiddenNodesRef.current.has(nodeId);

        // BFS over adjacency to hide or show
        const queue = [nodeId];
        while (queue.length) {
          const current = queue.shift();
          if (!current) continue;

          if (isHidden) {
            // show
            hiddenNodesRef.current.delete(current);
          } else {
            // hide
            hiddenNodesRef.current.add(current);
          }

          const children = adjacency[current] || [];
          children.forEach((childId) => {
            // only continue BFS on child if it's not in Redux-hidden or we might re-show it
            // We'll always proceed so we can maintain local toggles:
            queue.push(childId);
          });
        }

        // Now re-convert data to reflect changes
        convertData();
      }
    },
    [d3Nodes, adjacency, convertData],
  );

  // Initialize or update the force simulation whenever d3Nodes/d3Edges changes
  useEffect(() => {
    initializeSimulation(d3Nodes, d3Edges);
  }, [initializeSimulation, d3Nodes, d3Edges]);

  // Handle container resizing
  const handleResize = useCallback(() => {
    if (!canvasRef.current?.parentElement) return;
    const { width, height } = canvasRef.current.parentElement.getBoundingClientRect();
    setDimensions({ width, height });
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => handleResize());
    if (canvasRef.current?.parentElement) {
      observer.observe(canvasRef.current.parentElement);
    }
    return () => observer.disconnect();
  }, [handleResize]);

  // Attach our single drag listener + double-click logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const selection = d3.select(canvas);
    selection.call(handleDrag as any);

    // For double-click toggling:
    canvas.addEventListener('dblclick', handleDoubleClick);

    return () => {
      selection.on('.drag', null);
      canvas.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [handleDoubleClick, handleDrag]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        width={dimensions.width * dpi}
        height={dimensions.height * dpi}
        style={{
          width: '100%',
          height: '100%',
          border: '1px solid #ccc',
          display: 'block',
        }}
      />
    </div>
  );
}
