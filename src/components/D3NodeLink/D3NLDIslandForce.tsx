import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

// Redux-based data selectors
import { selectCumulativeNumberViolationsPerNode, selectD3BoundingBox, selectTypes, selectViolations } from '../Store/CombinedSlice';

// Custom hook that fetches node/edge data
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

function computeColorForId(id: string): string {
  const ns = extractNamespace(id).toLowerCase();
  if (ns === 'sh') return '#669900';
  if (ns === 'ex') return '#DA5700';
  return '#007C45';
}

function ContextMenu({
  menuX,
  menuY,
  node,
  show,
  onClose,
  onToggleChildren,
  onToggleParents,
  onHideNode,
  onCenterView,
}: {
  menuX: number;
  menuY: number;
  node: CanvasNode | null;
  show: boolean;
  onClose: () => void;
  onToggleChildren: (nodeId: string) => void;
  onToggleParents: (nodeId: string) => void;
  onHideNode: (nodeId: string) => void;
  onCenterView: () => void;
}) {
  if (!show || !node) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: menuY,
        left: menuX,
        padding: '6px',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        zIndex: 9999,
      }}
    >
      <style>
        {`
          .d3-context-menu {
            list-style: none;
            margin: 0;
            padding: 0;
            width: 160px;
          }
          .d3-context-menu-item {
            margin: 4px 0;
            cursor: pointer;
            padding: 4px 8px;
          }
          .d3-context-menu-item:hover {
            background-color: #eee;
          }
        `}
      </style>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Node: {node.label}</div>
      <ul className="d3-context-menu">
        <li
          className="d3-context-menu-item"
          onClick={() => {
            onToggleChildren(node.id);
            onClose();
          }}
        >
          Toggle Hide/Show Children
        </li>
        <li
          className="d3-context-menu-item"
          onClick={() => {
            onToggleParents(node.id);
            onClose();
          }}
        >
          Toggle Hide/Show Parents
        </li>
        <li
          className="d3-context-menu-item"
          onClick={() => {
            onHideNode(node.id);
            onClose();
          }}
        >
          Hide Node
        </li>
        <li
          className="d3-context-menu-item"
          onClick={() => {
            onCenterView();
            onClose();
          }}
        >
          Center View
        </li>
      </ul>
    </div>
  );
}

export default function D3NLDView({ rdfOntology, onLoaded }: Props) {
  const violations = useSelector(selectViolations);
  const types = useSelector(selectTypes);
  const cumulativeNumberViolationsPerType = useSelector(selectCumulativeNumberViolationsPerNode);
  const d3BoundingBox = useSelector(selectD3BoundingBox);

  const { loading, cyDataNodes, cyDataEdges } = useD3Data({
    rdfOntology,
    violations,
    types,
    cumulativeNumberViolationsPerType,
    onLoaded,
  });

  const [d3Nodes, setD3Nodes] = useState<CanvasNode[]>([]);
  const [d3Edges, setD3Edges] = useState<CanvasEdge[]>([]);

  const hiddenNodesRef = useRef<Set<string>>(new Set());
  const adjacencyRef = useRef<Record<string, string[]>>({});
  const revAdjRef = useRef<Record<string, string[]>>({});

  const simulationRef = useRef<d3.Simulation<CanvasNode, CanvasEdge> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const dpi = window.devicePixelRatio ?? 1;

  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);

  // Track right-button dragging state
  const rightDraggingRef = useRef(false);
  const rightMouseDownRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const adj: Record<string, string[]> = {};
    const revAdj: Record<string, string[]> = {};

    cyDataEdges.forEach((edge) => {
      const s = edge.data.source;
      const t = edge.data.target;

      if (!adj[s]) adj[s] = [];
      adj[s].push(t);

      if (!revAdj[t]) revAdj[t] = [];
      revAdj[t].push(s);
    });

    adjacencyRef.current = adj;
    revAdjRef.current = revAdj;
  }, [cyDataEdges]);

  const convertData = useCallback(() => {
    const visibleNodeData = cyDataNodes.filter((n) => n.data.visible);
    const visibleIds = new Set(visibleNodeData.map((n) => n.data.id));

    const visibleEdgeData = cyDataEdges.filter((e) => e.data.visible && visibleIds.has(e.data.source) && visibleIds.has(e.data.target));

    const newNodes: CanvasNode[] = visibleNodeData.map((n) => ({
      id: n.data.id,
      label: n.data.label,
      color: computeColorForId(n.data.id),
    }));

    const newEdges: CanvasEdge[] = visibleEdgeData.map((e) => ({
      source: e.data.source,
      target: e.data.target,
      label: e.data.label,
      visible: true,
    }));

    setD3Nodes(newNodes);
    setD3Edges(newEdges);
  }, [cyDataNodes, cyDataEdges]);

  useEffect(() => {
    if (!loading) {
      convertData();
    }
  }, [loading, convertData]);

  const drawCanvas = useCallback(
    (allNodes: CanvasNode[], allEdges: CanvasEdge[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      context.save();
      context.setTransform(dpi, 0, 0, dpi, 0, 0);

      const t = transformRef.current;
      context.translate(t.x, t.y);
      context.scale(t.k, t.k);

      context.clearRect(-t.x / t.k, -t.y / t.k, dimensions.width / t.k, dimensions.height / t.k);

      context.strokeStyle = '#AAA';
      context.fillStyle = '#000';
      context.font = '12px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      allEdges.forEach((edge) => {
        const sourceNode = typeof edge.source === 'object' ? edge.source : allNodes.find((n) => n.id === edge.source);
        const targetNode = typeof edge.target === 'object' ? edge.target : allNodes.find((n) => n.id === edge.target);

        if (!sourceNode || !targetNode) return;

        const sx = sourceNode.x ?? 0;
        const sy = sourceNode.y ?? 0;
        const tx = targetNode.x ?? 0;
        const ty = targetNode.y ?? 0;

        context.beginPath();
        context.moveTo(sx, sy);
        context.lineTo(tx, ty);
        context.stroke();

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
          context.fillStyle = '#AAA';
          context.fill();
        }

        if (edge.label) {
          const midX = (sx + tx) / 2;
          const midY = (sy + ty) / 2 - 5;
          context.save();
          context.fillStyle = '#333';
          context.fillText(edge.label, midX, midY);
          context.restore();
        }
      });

      allNodes.forEach((node) => {
        context.beginPath();
        context.fillStyle = node.color;
        const radius = 6;
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
    },
    [dimensions, dpi],
  );

  const initializeSimulation = useCallback(
    (allNodes: CanvasNode[], allEdges: CanvasEdge[]) => {
      if (!allNodes.length) {
        simulationRef.current?.stop();
        simulationRef.current = null;
        return;
      }

      const { width, height } = dimensions;
      const nodeRadius = 12;
      const labelPadding = 20;

      const sim = d3
        .forceSimulation<CanvasNode>(allNodes)
        .force(
          'link',
          d3
            .forceLink<CanvasNode, CanvasEdge>(allEdges)
            .id((d) => d.id)
            .distance(150)
            .strength(1),
        )
        .force('charge', d3.forceManyBody().strength(-9999).distanceMax(9999))
        .force('collision', d3.forceCollide(nodeRadius + labelPadding))
        .force('x', d3.forceX(width / 2).strength(0.01))
        .force('y', d3.forceY(height / 2).strength(0.01))
        .on('tick', () => {
          if (d3BoundingBox === 'on') {
            allNodes.forEach((node) => {
              node.x = Math.max(nodeRadius, Math.min(width - nodeRadius, node.x ?? 0));
              node.y = Math.max(nodeRadius, Math.min(height - nodeRadius, node.y ?? 0));
            });
          }
          drawCanvas(allNodes, allEdges);
        });

      simulationRef.current = sim;
    },
    [dimensions, drawCanvas, d3BoundingBox],
  );

  const handleDrag = d3
    .drag<HTMLCanvasElement, CanvasNode>()
    .subject((event) => {
      if (!simulationRef.current) return null;
      const [px, py] = d3.pointer(event, canvasRef.current);
      const [tx, ty] = transformRef.current.invert([px, py]);
      return d3.least(d3Nodes, (node) => {
        const dx = (node.x ?? 0) - tx;
        const dy = (node.y ?? 0) - ty;
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
      const [px, py] = d3.pointer(event, canvasRef.current);
      const [tx, ty] = transformRef.current.invert([px, py]);
      event.subject.fx = tx;
      event.subject.fy = ty;
    })
    .on('end', (event) => {
      if (!simulationRef.current) return;
      if (!event.active) simulationRef.current.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    });

  const handleDoubleClick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !zoomBehaviorRef.current) return;
    const selection = d3.select(canvas);
    transformRef.current = d3.zoomIdentity;
    selection.transition().call(
      // @ts-ignore
      zoomBehaviorRef.current.transform,
      d3.zoomIdentity,
    );
  }, []);

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuX, setMenuX] = useState(0);
  const [menuY, setMenuY] = useState(0);
  const [menuNode, setMenuNode] = useState<CanvasNode | null>(null);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      if (rightDraggingRef.current) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      if (!simulationRef.current) return;

      const [pxRaw, pyRaw] = d3.pointer(event, canvasRef.current);
      const [px, py] = transformRef.current.invert([pxRaw, pyRaw]);

      let closest: CanvasNode | null = null;
      let minDist = Infinity;

      d3Nodes.forEach((node) => {
        const dx = (node.x ?? 0) - px;
        const dy = (node.y ?? 0) - py;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < minDist) {
          minDist = dist2;
          closest = node;
        }
      });

      if (closest && minDist < 100) {
        const boundingRect = canvasRef.current?.getBoundingClientRect();
        if (boundingRect) {
          setMenuX(event.clientX - boundingRect.left);
          setMenuY(event.clientY - boundingRect.top);
        } else {
          setMenuX(event.clientX);
          setMenuY(event.clientY);
        }

        setMenuVisible(true);
        setMenuNode(closest);
      } else {
        setMenuVisible(false);
        setMenuNode(null);
      }
    },
    [d3Nodes],
  );

  function showChildren(nodeId: string) {
    cyDataNodes.forEach((node) => {
      if (adjacencyRef.current[nodeId]?.includes(node.data.id)) {
        node.data.visible = true;
      }
    });

    cyDataEdges.forEach((edge) => {
      if (edge.data.source === nodeId || adjacencyRef.current[nodeId]?.includes(edge.data.target)) {
        edge.data.visible = true;
      }
    });

    convertData();
  }

  function hideChildren(nodeId: string) {
    cyDataNodes.forEach((node) => {
      if (adjacencyRef.current[nodeId]?.includes(node.data.id)) {
        node.data.visible = false;
      }
    });

    cyDataEdges.forEach((edge) => {
      if (edge.data.source === nodeId || adjacencyRef.current[nodeId]?.includes(edge.data.target)) {
        edge.data.visible = false;
      }
    });

    convertData();
  }

  function showParents(nodeId: string) {
    cyDataNodes.forEach((node) => {
      if (revAdjRef.current[nodeId]?.includes(node.data.id)) {
        node.data.visible = true;
      }
    });

    cyDataEdges.forEach((edge) => {
      if (edge.data.target === nodeId || revAdjRef.current[nodeId]?.includes(edge.data.source)) {
        edge.data.visible = true;
      }
    });

    convertData();
  }

  function hideParents(nodeId: string) {
    cyDataNodes.forEach((node) => {
      if (revAdjRef.current[nodeId]?.includes(node.data.id)) {
        node.data.visible = false;
      }
    });

    cyDataEdges.forEach((edge) => {
      if (edge.data.target === nodeId || revAdjRef.current[nodeId]?.includes(edge.data.source)) {
        edge.data.visible = false;
      }
    });

    convertData();
  }

  const hideNode = useCallback(
    (nodeId: string) => {
      hiddenNodesRef.current.add(nodeId);
      convertData();
    },
    [convertData],
  );

  const centerView = useCallback(() => {
    if (!simulationRef.current) return;
    simulationRef.current.alpha(1).restart();
  }, []);

  useEffect(() => {
    initializeSimulation(d3Nodes, d3Edges);
  }, [initializeSimulation, d3Nodes, d3Edges]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const selection = d3.select(canvas);

    const zoomBehavior = d3
      .zoom<HTMLCanvasElement, unknown>()
      .filter((event: any) => {
        return event.type === 'wheel' || (event.type === 'mousedown' && event.button === 2);
      })
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        drawCanvas(d3Nodes, d3Edges);
      });

    zoomBehaviorRef.current = zoomBehavior;

    selection.call(zoomBehavior as any);
    selection.on('dblclick.zoom', null);

    selection.call(handleDrag as any);

    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 2) {
        rightDraggingRef.current = false;
        rightMouseDownRef.current = { x: event.clientX, y: event.clientY };
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if ((event.buttons & 2) === 2 && rightMouseDownRef.current) {
        const dx = event.clientX - rightMouseDownRef.current.x;
        const dy = event.clientY - rightMouseDownRef.current.y;
        if (dx * dx + dy * dy > 16) {
          rightDraggingRef.current = true;
        }
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      selection.on('.zoom', null);
      selection.on('.drag', null);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [drawCanvas, d3Nodes, d3Edges, handleDrag, handleDoubleClick, handleContextMenu]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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
      <ContextMenu
        menuX={menuX}
        menuY={menuY}
        node={menuNode}
        show={menuVisible}
        onClose={() => setMenuVisible(false)}
        onToggleChildren={() => {
          if (menuNode) showChildren(menuNode.id);
        }}
        onToggleParents={() => {
          if (menuNode) showParents(menuNode.id);
        }}
        onHideNode={hideNode}
        onCenterView={centerView}
      />
    </div>
  );
}
