// src/components/D3NodeLink/D3NodeLinkView.tsx
import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface D3NodeLinkViewProps {
  rdfOntology: string;
}

interface D3Node {
  id: string;
  group?: number;
  fx?: number | null;
  fy?: number | null;
  x?: number;
  y?: number;
}

interface D3Link {
  source: string | D3Node;
  target: string | D3Node;
  confidence?: number;
}

function processRdfOntology(rdfOntology: string): { nodes: D3Node[]; links: D3Link[] } {
  console.log('Processing RDF ontology:', rdfOntology);
  return {
    nodes: [
      { id: 'NodeA', group: 1 },
      { id: 'NodeB', group: 2 },
    ],
    links: [{ source: 'NodeA', target: 'NodeB', confidence: 0.8 }],
  };
}

export default function D3NodeLinkView({ rdfOntology }: D3NodeLinkViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nodes, setNodes] = useState<D3Node[]>([]);
  const [links, setLinks] = useState<D3Link[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const dpi = window.devicePixelRatio ?? 1;
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);

  const handleResize = useCallback(() => {
    if (!canvasRef.current?.parentElement) return;
    const { width, height } = canvasRef.current.parentElement.getBoundingClientRect();
    setDimensions({ width, height });
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => handleResize());
    if (canvasRef.current?.parentElement) observer.observe(canvasRef.current.parentElement);

    return () => {
      observer.disconnect();
    };
  }, [handleResize]);

  const initializeSimulation = useCallback(
    (allNodes: D3Node[], allLinks: D3Link[]) => {
      const sim = d3
        .forceSimulation<D3Node>(allNodes)
        .force(
          'link',
          d3.forceLink<D3Node, D3Link>(allLinks).id((d: D3Node) => d.id),
        )
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
        .on('tick', () => {
          drawCanvas(allNodes, allLinks);
        });

      simulationRef.current = sim;
    },
    [dimensions],
  );

  const drawCanvas = useCallback(
    (allNodes: D3Node[], allLinks: D3Link[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      context.save();
      context.scale(dpi, dpi);
      context.clearRect(0, 0, dimensions.width, dimensions.height);

      context.strokeStyle = '#000';
      context.globalAlpha = 1.0;
      allLinks.forEach((link) => {
        context.beginPath();
        const conf = link.confidence ?? 1;
        context.globalAlpha = conf;
        if (conf < 1) {
          context.setLineDash([5, 5]);
        } else {
          context.setLineDash([]);
        }

        const sourceNode = link.source as D3Node;
        const targetNode = link.target as D3Node;
        context.moveTo(sourceNode.x ?? 0, sourceNode.y ?? 0);
        context.lineTo(targetNode.x ?? 0, targetNode.y ?? 0);
        context.stroke();
      });

      context.globalAlpha = 1;
      allNodes.forEach((node) => {
        context.beginPath();
        context.setLineDash([]);
        context.fillStyle = 'steelblue';
        context.arc(node.x ?? 0, node.y ?? 0, 6, 0, 2 * Math.PI);
        context.fill();
        context.stroke();
      });

      context.restore();
    },
    [dpi, dimensions],
  );

  const handleDrag = d3
    .drag<HTMLCanvasElement, D3Node>()
    .subject((event) => {
      if (!simulationRef.current) return null;
      const [px, py] = d3.pointer(event, canvasRef.current);
      return d3.least(nodes, (d) => {
        const dx = (d.x ?? 0) - px;
        const dy = (d.y ?? 0) - py;
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

  useEffect(() => {
    const { nodes: newNodes, links: newLinks } = processRdfOntology(rdfOntology);
    setNodes(newNodes);
    setLinks(newLinks);
  }, [rdfOntology]);

  useEffect(() => {
    if (nodes.length === 0 || links.length === 0) return;
    initializeSimulation(nodes, links);
  }, [nodes, links, initializeSimulation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    d3.select(canvas).call(handleDrag as any);
    return () => {
      d3.select(canvas).on('.drag', null);
    };
  }, [nodes, handleDrag]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        width={dimensions.width * dpi}
        height={dimensions.height * dpi}
        style={{ width: '100%', height: '100%', border: '1px solid #ccc', display: 'block' }}
      />
    </div>
  );
}
