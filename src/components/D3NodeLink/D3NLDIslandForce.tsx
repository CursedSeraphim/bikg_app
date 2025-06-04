// File: src/components/D3NLDIslandForce.tsx
import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCumulativeNumberViolationsPerNode, selectD3BoundingBox, selectTypes, selectViolations } from '../Store/CombinedSlice';
import { useD3Data } from './useD3Data';

import { ContextMenu } from './D3NldContextMenu';
import { CanvasEdge, CanvasNode, D3NLDViewProps } from './D3NldTypes';
import { computeColorForId } from './D3NldUtils';
import { useD3Force } from './hooks/useD3Force';

export default function D3NLDView({ rdfOntology, onLoaded }: D3NLDViewProps) {
  // ─────────────────────────────────────────────────────────────────────────────
  // Redux selectors for violations, types, bounding‐box setting
  // ─────────────────────────────────────────────────────────────────────────────
  const violations = useSelector(selectViolations);
  const types = useSelector(selectTypes);
  const cumulativeNumberViolationsPerType = useSelector(selectCumulativeNumberViolationsPerNode);
  const d3BoundingBox = useSelector(selectD3BoundingBox);

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom hook to fetch Cytoscape‐like data (nodes & edges)
  // ─────────────────────────────────────────────────────────────────────────────
  const { loading, cyDataNodes, cyDataEdges } = useD3Data({
    rdfOntology,
    violations,
    types,
    cumulativeNumberViolationsPerType,
    onLoaded,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Transformed nodes/edges to feed into D3 force layout
  // ─────────────────────────────────────────────────────────────────────────────
  const [d3Nodes, setD3Nodes] = useState<CanvasNode[]>([]);
  const [d3Edges, setD3Edges] = useState<CanvasEdge[]>([]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Canvas ref + dimensions
  // ─────────────────────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const dpi = window.devicePixelRatio ?? 1;

  // ─────────────────────────────────────────────────────────────────────────────
  // State for context menu (right‐click)
  // ─────────────────────────────────────────────────────────────────────────────
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuX, setMenuX] = useState(0);
  const [menuY, setMenuY] = useState(0);
  const [menuNode, setMenuNode] = useState<CanvasNode | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Track hidden nodes so they persist across rerenders
  // ─────────────────────────────────────────────────────────────────────────────
  const hiddenNodesRef = useRef<Set<string>>(new Set());

  // ─────────────────────────────────────────────────────────────────────────────
  // Adjacency lists (forward and reverse) for toggling visibility
  // ─────────────────────────────────────────────────────────────────────────────
  const adjacencyRef = useRef<Record<string, string[]>>({});
  const revAdjRef = useRef<Record<string, string[]>>({});

  // ─────────────────────────────────────────────────────────────────────────────
  // Grab D3 references (simulation, transform, zoom) from our custom hook
  // ─────────────────────────────────────────────────────────────────────────────
  const { transformRef, simulationRef, zoomBehaviorRef } = useD3Force(canvasRef, d3Nodes, d3Edges, d3BoundingBox, dimensions);

  // ─────────────────────────────────────────────────────────────────────────────
  // Rebuild adjacency + reverse‐adjacency whenever edges change
  // ─────────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Converts Cytoscape‐style data → CanvasNode[] / CanvasEdge[], respecting visibility
  // ─────────────────────────────────────────────────────────────────────────────
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

  // Whenever loading completes, rebuild d3Nodes / d3Edges
  useEffect(() => {
    if (!loading) {
      convertData();
    }
  }, [loading, convertData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // ResizeObserver to update canvas dimensions on parent resizes
  // ─────────────────────────────────────────────────────────────────────────────
  const handleResize = useCallback(() => {
    if (!canvasRef.current?.parentElement) return;
    const { width, height } = canvasRef.current.parentElement.getBoundingClientRect();
    setDimensions({ width, height });
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(handleResize);
    if (canvasRef.current?.parentElement) {
      observer.observe(canvasRef.current.parentElement);
    }
    return () => {
      observer.disconnect();
    };
  }, [handleResize]);

  // ─────────────────────────────────────────────────────────────────────────────
  // show/hide immediate children or parents of a node
  // ─────────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Hides a single node (adds to hiddenNodesRef, then rebuilds layout)
  // ─────────────────────────────────────────────────────────────────────────────
  const hideNode = useCallback(
    (nodeId: string) => {
      hiddenNodesRef.current.add(nodeId);
      convertData();
    },
    [convertData],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Restarts the simulation with full alpha so that nodes “snap” back to center
  // ─────────────────────────────────────────────────────────────────────────────
  const centerView = useCallback(() => {
    if (!simulationRef.current) return;
    simulationRef.current.alpha(1).restart();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Right‐button dragging detection (to suppress context menu while panning)
  // ─────────────────────────────────────────────────────────────────────────────
  const rightDraggingRef = useRef(false);
  const rightMouseDownRef = useRef<{ x: number; y: number } | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Determine closest node on right‐click, then show context menu if within threshold
  // ─────────────────────────────────────────────────────────────────────────────
  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      if (rightDraggingRef.current) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      if (!simulationRef.current) return;

      // Convert screen coords → graph coords
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

      // If closest is within squared distance < 100 → show menu
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

  // ─────────────────────────────────────────────────────────────────────────────
  // *** FIX: define handleDrag here (not in a useRef) so it always “sees” latest d3Nodes
  // ─────────────────────────────────────────────────────────────────────────────
  const handleDrag = d3
    .drag<HTMLCanvasElement, CanvasNode>()
    .subject((event) => {
      if (!simulationRef.current) return null;
      const [px, py] = d3.pointer(event, canvasRef.current);
      const [tx, ty] = transformRef.current.invert([px, py]);
      // Find the closest node in d3Nodes
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Resets zoom/pan to identity when user double‐clicks on the canvas
  // ─────────────────────────────────────────────────────────────────────────────
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
  }, [zoomBehaviorRef]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Attach D3 event listeners to <canvas> (zoom, node‐drag, mouse, contextmenu)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const selection = d3.select(canvas);

    // Attach zoom behavior (initialized in useD3Force)
    if (zoomBehaviorRef.current) {
      selection.call(zoomBehaviorRef.current as any);
    }
    // Disable default double‐click‐zoom (we handle double‐click manually)
    selection.on('dblclick.zoom', null);

    // Attach node drag to the canvas
    selection.call(handleDrag as any);

    // Right‐button dragging detection
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
  }, [
    handleDrag, // now sees the latest d3Nodes on each render
    handleContextMenu,
    handleDoubleClick,
    zoomBehaviorRef,
  ]);

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
