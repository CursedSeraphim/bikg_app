// src/components/D3NodeLink/D3NodeLinkView.tsx
import * as d3 from 'd3';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGraphData } from '../../hooks/useGraphData';
import { parseRdfOntology } from '../../utils/parseRdfOntology';

interface D3NodeLinkViewProps {
  rdfOntology: string; // The raw TTL string
}

interface CanvasNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface CanvasEdge {
  source: string | CanvasNode;
  target: string | CanvasNode;
  label?: string;
}

/**
 * Minimal D3 node-link on canvas that shows node labels above nodes and edge labels near edges.
 * Supports double-click toggling for subtrees.
 */
export default function D3NodeLinkView({ rdfOntology }: D3NodeLinkViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const dpi = window.devicePixelRatio ?? 1;

  // 1) Parse the TTL => full graph
  const parsedGraph = useMemo(() => parseRdfOntology(rdfOntology), [rdfOntology]);
  console.log('Parsed graph:', parsedGraph);

  // 2) Use graph data hook to handle expansions
  const { visibleNodes, visibleEdges, toggleNode } = useGraphData(parsedGraph);
  console.log(visibleNodes, visibleEdges);

  // We maintain a local copy of nodes/edges in the shape that D3 requires
  const [d3Nodes, setD3Nodes] = useState<CanvasNode[]>([]);
  const [d3Edges, setD3Edges] = useState<CanvasEdge[]>([]);

  const simulationRef = useRef<d3.Simulation<CanvasNode, CanvasEdge> | null>(null);

  // Layout
  const handleResize = useCallback(() => {
    if (!canvasRef.current?.parentElement) return;
    const { width, height } = canvasRef.current.parentElement.getBoundingClientRect();
    setDimensions({ width, height });
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => handleResize());
    if (canvasRef.current?.parentElement) observer.observe(canvasRef.current.parentElement);
    return () => observer.disconnect();
  }, [handleResize]);

  // Whenever visible nodes/edges change, update local D3 arrays
  useEffect(() => {
    // Transform into the shape needed by D3
    const nodeMap: Record<string, CanvasNode> = {};
    visibleNodes.forEach((n) => {
      nodeMap[n.id] = {
        id: n.id,
        label: n.label,
      };
    });

    const newEdges: CanvasEdge[] = visibleEdges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label,
    }));

    const newNodes = Object.values(nodeMap);
    setD3Nodes(newNodes);
    setD3Edges(newEdges);
  }, [visibleNodes, visibleEdges]);

  // Initialize or re-initialize the simulation
  const initializeSimulation = useCallback(
    (allNodes: CanvasNode[], allEdges: CanvasEdge[]) => {
      const sim = d3
        .forceSimulation<CanvasNode>(allNodes)
        .force(
          'link',
          d3.forceLink<CanvasNode, CanvasEdge>(allEdges).id((d) => d.id),
        )
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
        .on('tick', () => {
          drawCanvas(allNodes, allEdges);
        });

      simulationRef.current = sim;
    },
    [dimensions],
  );

  // The actual drawing method
  const drawCanvas = useCallback(
    (allNodes: CanvasNode[], allEdges: CanvasEdge[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      context.save();
      context.scale(dpi, dpi);
      context.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw edges
      context.strokeStyle = '#aaa';
      context.fillStyle = '#000';
      context.font = '12px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      allEdges.forEach((edge) => {
        const sourceNode = typeof edge.source === 'string' ? allNodes.find((n) => n.id === edge.source) : edge.source;
        const targetNode = typeof edge.target === 'string' ? allNodes.find((n) => n.id === edge.target) : edge.target;
        if (!sourceNode || !targetNode) return;

        context.beginPath();
        context.moveTo(sourceNode.x ?? 0, sourceNode.y ?? 0);
        context.lineTo(targetNode.x ?? 0, targetNode.y ?? 0);
        context.stroke();

        // Edge label (draw it near the midpoint)
        if (edge.label) {
          const midX = ((sourceNode.x ?? 0) + (targetNode.x ?? 0)) / 2;
          const midY = ((sourceNode.y ?? 0) + (targetNode.y ?? 0)) / 2 - 5; // slightly above the line
          context.save();
          context.fillStyle = '#333';
          context.fillText(edge.label, midX, midY);
          context.restore();
        }
      });

      // Draw nodes & node labels
      allNodes.forEach((node) => {
        context.beginPath();
        context.fillStyle = 'steelblue';
        const radius = 6;
        context.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
        context.fill();
        context.strokeStyle = '#fff';
        context.stroke();

        // Node label: above the node
        context.save();
        context.fillStyle = '#000';
        if (node.y !== undefined) {
          context.fillText(node.label, node.x ?? 0, (node.y ?? 0) - 12);
        }
        context.restore();
      });

      context.restore();
    },
    [dpi, dimensions],
  );

  // Double-click behavior
  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      if (!simulationRef.current) return;
      const [px, py] = d3.pointer(event, canvasRef.current);

      // Find nearest node
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

      // If it's a fairly close double-click, toggle
      const threshold = 100; // px^2 = 10^2
      if (closestNode && minDist < threshold) {
        toggleNode(closestNode.id);
      }
    },
    [d3Nodes, toggleNode],
  );

  // D3 drag
  const handleDrag = d3
    .drag<HTMLCanvasElement, CanvasNode>()
    // Require a small mouse movement before a drag actually starts so that
    // merely pressing the mouse button doesn't kick off the simulation.
    .clickDistance(5)
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

  // Re-initialize simulation whenever the visible set changes
  useEffect(() => {
    if (d3Nodes.length === 0) {
      // Clear any existing sim
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      return;
    }
    initializeSimulation(d3Nodes, d3Edges);
  }, [d3Nodes, d3Edges, initializeSimulation]);

  // Attach drag + double-click
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const selection = d3.select(canvas);
    selection.call(handleDrag as any);

    // For double-click we can do:
    canvas.addEventListener('dblclick', handleDoubleClick);
    return () => {
      selection.on('.drag', null);
      canvas.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [handleDoubleClick, handleDrag, d3Nodes]);

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
