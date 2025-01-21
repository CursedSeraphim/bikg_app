import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

// Redux-based data selectors
import { selectCumulativeNumberViolationsPerNode, selectD3BoundingBox, selectTypes, selectViolations } from '../Store/CombinedSlice';

// Our custom hook that fetches node/edge data from the Redux pipeline:
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
 * Sub-component for a basic context menu. Pass in menu position, node info, etc.
 */
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

  /**
   * We'll embed a small <style> block to achieve a hover effect on each menu item.
   * Alternatively, you could have a separate CSS file or use styled-components, etc.
   */
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

/**
 * Main D3-based MVP that:
 * 1) Displays a force-directed graph for the Redux data pipeline.
 * 2) Allows dragging of nodes.
 * 3) Double-click toggles entire subtree (children)
 * 4) Right-click context menu for toggling children/parents, hide node, center view
 * 5) Edge arrows to show direction (source -> target).
 */
export default function D3NLDView({ rdfOntology, onLoaded }: Props) {
  // Grab relevant store data
  const violations = useSelector(selectViolations);
  const types = useSelector(selectTypes);
  const cumulativeNumberViolationsPerType = useSelector(selectCumulativeNumberViolationsPerNode);
  const d3BoundingBox = useSelector(selectD3BoundingBox);

  // Get raw node/edge data from the Redux pipeline
  const { loading, cyDataNodes, cyDataEdges } = useD3Data({
    rdfOntology,
    violations,
    types,
    cumulativeNumberViolationsPerType,
    onLoaded,
  });

  // Final arrays for D3 once we filter out hidden nodes, etc.
  const [d3Nodes, setD3Nodes] = useState<CanvasNode[]>([]);
  const [d3Edges, setD3Edges] = useState<CanvasEdge[]>([]);

  // We track a set of node IDs hidden by local toggling; Redux might also hide nodes.
  const hiddenNodesRef = useRef<Set<string>>(new Set());

  // Refs for adjacency (children) and reverse adjacency (parents)
  const adjacencyRef = useRef<Record<string, string[]>>({});
  const revAdjRef = useRef<Record<string, string[]>>({});

  // Force simulation
  const simulationRef = useRef<d3.Simulation<CanvasNode, CanvasEdge> | null>(null);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const dpi = window.devicePixelRatio ?? 1;

  /**
   * Build adjacency and reverse adjacency from all edges (ignoring .visible).
   * This allows BFS in either direction.
   */
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

  /**
   * Convert Redux data + local toggles -> D3 data arrays.
   */
  const convertData = useCallback(() => {
    // Filter out nodes based on updated n.data.visible
    const visibleNodeData = cyDataNodes.filter((n) => n.data.visible);

    // Visible IDs
    const visibleIds = new Set(visibleNodeData.map((n) => n.data.id));

    // Filter edges
    const visibleEdgeData = cyDataEdges.filter((e) => e.data.visible && visibleIds.has(e.data.source) && visibleIds.has(e.data.target));

    // Build final node array
    const newNodes: CanvasNode[] = visibleNodeData.map((n) => ({
      id: n.data.id,
      label: n.data.label,
      color: computeColorForId(n.data.id),
    }));

    // Build final edge array
    const newEdges: CanvasEdge[] = visibleEdgeData.map((e) => ({
      source: e.data.source,
      target: e.data.target,
      label: e.data.label,
      visible: true,
    }));

    setD3Nodes(newNodes);
    setD3Edges(newEdges);
  }, [cyDataNodes, cyDataEdges]);

  // Re-run conversion whenever data changes
  useEffect(() => {
    if (!loading) {
      convertData();
    }
  }, [loading, convertData]);

  /**
   * Draw routine, including arrowheads for directed edges
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

      // Edges
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

        // Draw the line
        context.beginPath();
        context.moveTo(sx, sy);
        context.lineTo(tx, ty);
        context.stroke();

        // Draw arrowhead at target
        const dx = tx - sx;
        const dy = ty - sy;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
          const arrowSize = 8;
          const arrowWidth = 4;

          // The arrow tip is the target, we step back arrowSize
          const backx = tx - (arrowSize * dx) / length;
          const backy = ty - (arrowSize * dy) / length;

          // Build a small triangle
          context.beginPath();
          context.moveTo(tx, ty);
          // left side
          context.lineTo(backx + (arrowWidth * -dy) / length, backy + (arrowWidth * dx) / length);
          // right side
          context.lineTo(backx - (arrowWidth * -dy) / length, backy - (arrowWidth * dx) / length);
          context.closePath();
          context.fillStyle = '#AAA';
          context.fill();
        }

        // Edge label near midpoint
        if (edge.label) {
          const midX = (sx + tx) / 2;
          const midY = (sy + ty) / 2 - 5;
          context.save();
          context.fillStyle = '#333';
          context.fillText(edge.label, midX, midY);
          context.restore();
        }
      });

      // Nodes
      allNodes.forEach((node) => {
        context.beginPath();
        context.fillStyle = node.color;
        const radius = 6;
        context.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
        context.fill();

        context.strokeStyle = '#FFF';
        context.stroke();

        // Node label above node
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
   * Basic force simulation
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

      const { width, height } = dimensions;
      const nodeRadius = 12; // node size
      const labelPadding = 20; // space for label

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
        .force('charge', d3.forceManyBody().strength(-300).distanceMax(200))
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

  /**
   * Node drag
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
   * Double-click => BFS toggling of children only (not the node itself).
   */
  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      if (!simulationRef.current) return;
      const [px, py] = d3.pointer(event, canvasRef.current);
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
        // BFS toggling of children
        const queue = [...(adjacencyRef.current[closest.id] || [])];
        while (queue.length) {
          const current = queue.shift();
          if (!current) continue;
          const isHidden = hiddenNodesRef.current.has(current);

          if (isHidden) {
            hiddenNodesRef.current.delete(current);
          } else {
            hiddenNodesRef.current.add(current);
          }

          const kids = adjacencyRef.current[current] || [];
          queue.push(...kids);
        }

        convertData();
      }
    },
    [d3Nodes, convertData],
  );

  /**
   * Context menu state
   */
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuX, setMenuX] = useState(0);
  const [menuY, setMenuY] = useState(0);
  const [menuNode, setMenuNode] = useState<CanvasNode | null>(null);

  /**
   * onContextMenu handler => show custom menu at pointer
   */
  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      event.preventDefault(); // stop default browser context
      if (!simulationRef.current) return;

      // We get the pointer inside the canvas
      const [px, py] = d3.pointer(event, canvasRef.current);
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

      // If we are close enough to a node, show menu for that node
      if (closest && minDist < 100) {
        // Calculate position relative to the container
        const boundingRect = canvasRef.current?.getBoundingClientRect();
        if (boundingRect) {
          const offsetX = event.clientX - boundingRect.left;
          const offsetY = event.clientY - boundingRect.top;
          setMenuX(offsetX);
          setMenuY(offsetY);
        } else {
          setMenuX(event.clientX);
          setMenuY(event.clientY);
        }

        setMenuVisible(true);
        setMenuNode(closest);
      } else {
        // else, no context menu
        setMenuVisible(false);
        setMenuNode(null);
      }
    },
    [d3Nodes],
  );

  function showChildren(nodeId: string) {
    cyDataNodes.forEach((node) => {
      if (adjacencyRef.current[nodeId]?.includes(node.data.id)) {
        node.data.visible = true; // Set visibility to true
      }
    });

    // Ensure edges connected to children are visible
    cyDataEdges.forEach((edge) => {
      if (edge.data.source === nodeId || adjacencyRef.current[nodeId]?.includes(edge.data.target)) {
        edge.data.visible = true;
      }
    });

    convertData(); // Recompute nodes and edges
  }

  function hideChildren(nodeId: string) {
    cyDataNodes.forEach((node) => {
      if (adjacencyRef.current[nodeId]?.includes(node.data.id)) {
        node.data.visible = false; // Set visibility to false
      }
    });

    // Ensure edges connected to children are hidden
    cyDataEdges.forEach((edge) => {
      if (edge.data.source === nodeId || adjacencyRef.current[nodeId]?.includes(edge.data.target)) {
        edge.data.visible = false;
      }
    });

    convertData(); // Recompute nodes and edges
  }

  function showParents(nodeId: string) {
    cyDataNodes.forEach((node) => {
      if (revAdjRef.current[nodeId]?.includes(node.data.id)) {
        node.data.visible = true; // Set visibility to true
      }
    });

    // Ensure edges connected to parents are visible
    cyDataEdges.forEach((edge) => {
      if (edge.data.target === nodeId || revAdjRef.current[nodeId]?.includes(edge.data.source)) {
        edge.data.visible = true;
      }
    });

    convertData(); // Recompute nodes and edges
  }

  function hideParents(nodeId: string) {
    cyDataNodes.forEach((node) => {
      if (revAdjRef.current[nodeId]?.includes(node.data.id)) {
        node.data.visible = false; // Set visibility to false
      }
    });

    // Ensure edges connected to parents are hidden
    cyDataEdges.forEach((edge) => {
      if (edge.data.target === nodeId || revAdjRef.current[nodeId]?.includes(edge.data.source)) {
        edge.data.visible = false;
      }
    });

    convertData(); // Recompute nodes and edges
  }

  // Hide a single node (just that node, not children or parents)
  const hideNode = useCallback(
    (nodeId: string) => {
      hiddenNodesRef.current.add(nodeId);
      convertData();
    },
    [convertData],
  );

  // "Center View": gently nudge everything to center again
  const centerView = useCallback(() => {
    if (!simulationRef.current) return;
    simulationRef.current.alpha(1).restart();
  }, []);

  // Initialize or re-init sim on data changes
  useEffect(() => {
    initializeSimulation(d3Nodes, d3Edges);
  }, [initializeSimulation, d3Nodes, d3Edges]);

  // Canvas resizing
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

  // Attach standard event listeners: drag, doubleclick, contextmenu
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const selection = d3.select(canvas);
    selection.call(handleDrag as any);

    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      selection.on('.drag', null);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleDoubleClick, handleContextMenu, handleDrag]);

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
