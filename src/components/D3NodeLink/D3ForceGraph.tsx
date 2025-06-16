// File: src/components/D3NodeLink/D3ForceGraph.tsx

import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCumulativeNumberViolationsPerNode, selectD3BoundingBox, selectTypes, selectViolations } from '../Store/CombinedSlice';
import { useD3Data } from './useD3Data';

import { ContextMenu } from './D3NldContextMenu';
import { CanvasEdge, CanvasNode, D3NLDViewProps } from './D3NldTypes';
import { computeColorForId } from './D3NldUtils';
import { useAdjacency } from './hooks/useAdjacency';
import { useCanvasDimensions } from './hooks/useCanvasDimensions';
import { useD3Force } from './hooks/useD3Force';
import { useNodeVisibility } from './hooks/useNodeVisibility';

/** Force‐directed graph view for the D3 based node‐link diagram. */
export default function D3ForceGraph({ rdfOntology, onLoaded }: D3NLDViewProps) {
  // Redux selectors
  const violations = useSelector(selectViolations);
  const types = useSelector(selectTypes);
  const cumulativeNumberViolationsPerType = useSelector(selectCumulativeNumberViolationsPerNode);
  const d3BoundingBox = useSelector(selectD3BoundingBox);

  // Fetch Cytoscape‐like data used by the D3 view
  const { loading, cyDataNodes, cyDataEdges } = useD3Data({
    rdfOntology,
    violations,
    types,
    cumulativeNumberViolationsPerType,
    onLoaded,
  });

  const [d3Nodes, setD3Nodes] = useState<CanvasNode[]>([]);
  const [d3Edges, setD3Edges] = useState<CanvasEdge[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { dimensions } = useCanvasDimensions(canvasRef);
  const dpi = window.devicePixelRatio ?? 1;

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuX, setMenuX] = useState(0);
  const [menuY, setMenuY] = useState(0);
  const [menuNode, setMenuNode] = useState<CanvasNode | null>(null);

  const [ghostNodes, setGhostNodes] = useState<CanvasNode[]>([]);
  const [ghostEdges, setGhostEdges] = useState<CanvasEdge[]>([]);
  const activePreviewRef = useRef<{ mode: 'children' | 'parents' | null; nodeId: string | null }>({ mode: null, nodeId: null });

  const { adjacencyRef, revAdjRef } = useAdjacency(cyDataEdges);

  const hiddenNodesRef = useRef<Set<string>>(new Set());
  const originRef = useRef<Record<string, string | null>>({});
  const nodeMapRef = useRef<Record<string, CanvasNode>>({});
  const savedPositionsRef = useRef<Record<string, { x?: number; y?: number }>>({});

  const convertData = useCallback(() => {
    const visibleNodeData = cyDataNodes.filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id));
    const visibleIds = new Set(visibleNodeData.map((n) => n.data.id));

    const visibleEdgeData = cyDataEdges.filter((e) => e.data.visible && visibleIds.has(e.data.source) && visibleIds.has(e.data.target));

    const nextNodes: CanvasNode[] = [];

    visibleNodeData.forEach((n) => {
      const { id } = n.data;
      let node = nodeMapRef.current[id];
      if (!node) {
        const saved = savedPositionsRef.current[id];
        node = {
          id,
          label: n.data.label,
          color: computeColorForId(id),
          x: saved?.x,
          y: saved?.y,
        };
      } else {
        node.label = n.data.label;
        node.color = computeColorForId(id);
      }
      if (originRef.current[id] === undefined) {
        originRef.current[id] = null;
      }
      nodeMapRef.current[id] = node;
      nextNodes.push(node);
    });

    // Save positions for nodes that became hidden
    Object.keys(nodeMapRef.current).forEach((id) => {
      if (!visibleIds.has(id)) {
        const node = nodeMapRef.current[id];
        savedPositionsRef.current[id] = { x: node.x, y: node.y };
        delete nodeMapRef.current[id];
      }
    });

    const newEdges: CanvasEdge[] = visibleEdgeData.map((e) => ({
      source: e.data.source,
      target: e.data.target,
      label: e.data.label,
      visible: true,
    }));

    setD3Nodes(nextNodes);
    setD3Edges(newEdges);
  }, [cyDataNodes, cyDataEdges]);

  useEffect(() => {
    if (!loading) {
      convertData();
    }
  }, [loading, convertData]);

  const { transformRef, simulationRef, zoomBehaviorRef } = useD3Force(
    canvasRef,
    [...d3Nodes, ...ghostNodes],
    [...d3Edges, ...ghostEdges],
    d3BoundingBox,
    dimensions,
    false,
  );

  const { showChildren, hideChildren, showParents, hideParents, hideNode } = useNodeVisibility(
    cyDataNodes,
    cyDataEdges,
    adjacencyRef,
    revAdjRef,
    hiddenNodesRef,
    originRef,
    convertData,
  );

  const recomputeEdgeVisibility = useCallback(() => {
    const visible = new Set(cyDataNodes.filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id)).map((n) => n.data.id));
    cyDataEdges.forEach((edge) => {
      edge.data.visible = visible.has(edge.data.source) && visible.has(edge.data.target);
    });
  }, [cyDataNodes, cyDataEdges]);

  // Freeze nodes for a short period. By default, all currently visible nodes are
  // frozen for `otherDuration` milliseconds (500ms) while the triggering node
  // is frozen for `triggerDuration` milliseconds (1000ms). Passing `otherDuration`
  // as `0` skips freezing the other nodes. The `alphaTarget` parameter controls
  // the force simulation strength during the freeze.
  const freezeNode = useCallback(
    (
      id: string,
      otherDuration = 500,
      triggerDuration = 1000,
      alphaTarget = 0.1,
    ) => {
      const sim = simulationRef.current;
      if (!sim) return;

      const allNodes = Object.values(nodeMapRef.current);
      allNodes.forEach((node) => {
        if (otherDuration > 0 || node.id === id) {
          node.fx = node.x;
          node.fy = node.y;
        }
      });

      sim.alphaTarget(alphaTarget).restart();

      if (otherDuration > 0) {
        // Release other nodes after `otherDuration`
        setTimeout(() => {
          allNodes.forEach((node) => {
            if (node.id !== id) {
              node.fx = null;
              node.fy = null;
            }
          });
        }, otherDuration);
      }

      // Release the triggering node after `triggerDuration`
      setTimeout(() => {
        const triggerNode = nodeMapRef.current[id];
        if (triggerNode) {
          triggerNode.fx = null;
          triggerNode.fy = null;
        }
        sim.alphaTarget(0);
      }, triggerDuration);
    },
    [simulationRef],
  );

  const clearPreview = useCallback(() => {
    if (ghostNodes.length === 0 && ghostEdges.length === 0) return;
    setGhostNodes([]);
    setGhostEdges([]);
    // Reset any mutated edge references back to their id form so d3-force
    // rebinds them to the correct nodes next tick
    setD3Edges((edges) =>
      edges.map((e) => ({
        ...e,
        source: typeof e.source === 'object' ? e.source.id : e.source,
        target: typeof e.target === 'object' ? e.target.id : e.target,
      })),
    );
    Object.values(nodeMapRef.current).forEach((n) => {
      n.fx = null;
      n.fy = null;
      n.vx = 0;
      n.vy = 0;
    });
    const sim = simulationRef.current;
    if (sim) {
      sim.alpha(0);
      sim.alphaTarget(0);
    }
    activePreviewRef.current = { mode: null, nodeId: null };
  }, [ghostNodes, ghostEdges, simulationRef]);

  const collapseDescendants = useCallback(
    (id: string) => {
      freezeNode(id, 0);
      const queue = [...(adjacencyRef.current[id] || [])];
      const toHide: string[] = [];
      while (queue.length) {
        const cur = queue.shift()!;
        toHide.push(cur);
        queue.push(...(adjacencyRef.current[cur] || []));
      }
      if (toHide.length) {
        toHide.forEach((nid) => {
          const node = cyDataNodes.find((n) => n.data.id === nid);
          if (node) node.data.visible = false;
        });
        recomputeEdgeVisibility();
        convertData();
      }
    },
    [cyDataNodes, adjacencyRef, recomputeEdgeVisibility, convertData, freezeNode],
  );

  const collapseAncestors = useCallback(
    (id: string) => {
      freezeNode(id, 0);
      const queue = [...(revAdjRef.current[id] || [])];
      const toHide: string[] = [];
      while (queue.length) {
        const cur = queue.shift()!;
        toHide.push(cur);
        queue.push(...(revAdjRef.current[cur] || []));
      }
      if (toHide.length) {
        toHide.forEach((nid) => {
          const node = cyDataNodes.find((n) => n.data.id === nid);
          if (node) node.data.visible = false;
        });
        recomputeEdgeVisibility();
        convertData();
      }
    },
    [cyDataNodes, revAdjRef, recomputeEdgeVisibility, convertData, freezeNode],
  );

  const toggleChildren = useCallback(
    (id: string) => {
      if (activePreviewRef.current.mode === 'children' && activePreviewRef.current.nodeId === id) {
        ghostNodes.forEach((gn) => {
          savedPositionsRef.current[gn.id] = { x: gn.x, y: gn.y };
        });
      }
      const childIds = adjacencyRef.current[id] || [];
      const allVisible =
        childIds.length > 0 &&
        childIds.every((childId) => {
          const node = cyDataNodes.find((n) => n.data.id === childId);
          return node && node.data.visible && !hiddenNodesRef.current.has(childId);
        });

      if (allVisible) {
        collapseDescendants(id);
      } else {
        showChildren(id);
        freezeNode(id, 500, 1000, 0.3);
      }
    },
    [freezeNode, showChildren, collapseDescendants, cyDataNodes, adjacencyRef, ghostNodes],
  );

  const toggleParents = useCallback(
    (id: string) => {
      if (activePreviewRef.current.mode === 'parents' && activePreviewRef.current.nodeId === id) {
        ghostNodes.forEach((gn) => {
          savedPositionsRef.current[gn.id] = { x: gn.x, y: gn.y };
        });
      }
      const parentIds = revAdjRef.current[id] || [];
      const allVisible =
        parentIds.length > 0 &&
        parentIds.every((parentId) => {
          const node = cyDataNodes.find((n) => n.data.id === parentId);
          return node && node.data.visible && !hiddenNodesRef.current.has(parentId);
        });

      if (allVisible) {
        collapseAncestors(id);
      } else {
        showParents(id);
        freezeNode(id, 500, 1000, 0.3);
      }
    },
    [freezeNode, showParents, collapseAncestors, cyDataNodes, revAdjRef, ghostNodes],
  );

  const centerView = useCallback(() => {
    if (!zoomBehaviorRef.current || !canvasRef.current || d3Nodes.length === 0) {
      return;
    }

    const minX = Math.min(...d3Nodes.map((n) => n.x ?? 0));
    const maxX = Math.max(...d3Nodes.map((n) => n.x ?? 0));
    const minY = Math.min(...d3Nodes.map((n) => n.y ?? 0));
    const maxY = Math.max(...d3Nodes.map((n) => n.y ?? 0));

    const graphWidth = Math.max(1, maxX - minX);
    const graphHeight = Math.max(1, maxY - minY);

    const scale = Math.min(dimensions.width / graphWidth, dimensions.height / graphHeight) * 0.9;

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const transform = d3.zoomIdentity
      .translate(dimensions.width / 2 - scale * cx, dimensions.height / 2 - scale * cy)
      .scale(scale);

    d3.select(canvasRef.current).call(zoomBehaviorRef.current.transform, transform);
  }, [d3Nodes, dimensions.height, dimensions.width, zoomBehaviorRef]);

  const rightDraggingRef = useRef(false);
  const rightMouseDownRef = useRef<{ x: number; y: number } | null>(null);
  const hasCenteredRef = useRef(false);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      if (rightDraggingRef.current) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      const sim = simulationRef.current;
      if (!sim) return;

      const [pxRaw, pyRaw] = d3.pointer(event, canvasRef.current);
      const [px, py] = transformRef.current.invert([pxRaw, pyRaw]);

      // Compute "near‐node" threshold from node radius (and zoom level):
      const NODE_RADIUS_PX = 200;
      const CLICK_RADIUS_PX = NODE_RADIUS_PX * 2;
      // adjust for zoom:
      const effectiveRadius = CLICK_RADIUS_PX / (transformRef.current?.k ?? 1);
      const NEAR_NODE_DIST_SQ = effectiveRadius * effectiveRadius;

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

      if (closest && minDist < NEAR_NODE_DIST_SQ) {
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
    [d3Nodes, transformRef, simulationRef],
  );

  // Drag handler now uses Alt + left‐click (button 0 + event.altKey)
  const handleDrag = d3
    .drag<HTMLCanvasElement, CanvasNode>()
    .filter((event) => event.button === 0 && event.altKey)
    .subject((event) => {
      const sim = simulationRef.current;
      if (!sim) return null;
      const [px, py] = d3.pointer(event, canvasRef.current);
      const [tx, ty] = transformRef.current.invert([px, py]);
      return d3.least(d3Nodes, (node) => {
        const dx = (node.x ?? 0) - tx;
        const dy = (node.y ?? 0) - ty;
        return dx * dx + dy * dy;
      });
    })
    .on('start', (event) => {
      const sim = simulationRef.current;
      if (!sim) return;
      if (!event.active) sim.alphaTarget(0.3).restart();
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
      const sim = simulationRef.current;
      if (!sim) return;
      if (!event.active) sim.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    });

  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      const sim = simulationRef.current;
      if (!sim) return;

      const [pxRaw, pyRaw] = d3.pointer(event, canvasRef.current);
      const transform = transformRef.current;
      const [px, py] = transform.invert([pxRaw, pyRaw]);

      // Compute "near‐node" threshold from node radius (and zoom level):
      const NODE_RADIUS_PX = 200;
      const CLICK_RADIUS_PX = NODE_RADIUS_PX * 2;
      // adjust for zoom:
      const effectiveRadius = CLICK_RADIUS_PX / (transform?.k ?? 1);
      const NEAR_NODE_DIST_SQ = effectiveRadius * effectiveRadius;

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

      if (closest && minDist < NEAR_NODE_DIST_SQ) {
        const cid = closest.id;
        if (event.ctrlKey) {
          toggleChildren(cid);
        } else if (event.shiftKey) {
          toggleParents(cid);
        }
        clearPreview();
      }
    },
    [d3Nodes, transformRef, simulationRef, adjacencyRef, revAdjRef, toggleChildren, toggleParents, clearPreview],
  );

  const updateHoverPreview = useCallback(
    (event: MouseEvent) => {
      if (!event.ctrlKey && !event.shiftKey) {
        clearPreview();
        return;
      }
      const [pxRaw, pyRaw] = d3.pointer(event, canvasRef.current);
      const transform = transformRef.current;
      const [px, py] = transform.invert([pxRaw, pyRaw]);

      const NODE_RADIUS_PX = 200;
      const CLICK_RADIUS_PX = NODE_RADIUS_PX * 2;
      const effectiveRadius = CLICK_RADIUS_PX / (transform?.k ?? 1);
      const NEAR_NODE_DIST_SQ = effectiveRadius * effectiveRadius;

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

      if (!closest || minDist >= NEAR_NODE_DIST_SQ) {
        clearPreview();
        return;
      }

      const mode = event.ctrlKey ? 'children' : 'parents';
      if (activePreviewRef.current.mode === mode && activePreviewRef.current.nodeId === closest.id) {
        return;
      }
      activePreviewRef.current = { mode, nodeId: closest.id };

      const ids = mode === 'children' ? adjacencyRef.current[closest.id] || [] : revAdjRef.current[closest.id] || [];

      const hiddenIds: string[] = [];
      const visibleIds: string[] = [];

      ids.forEach((nid) => {
        const nodeData = cyDataNodes.find((n) => n.data.id === nid);
        if (!nodeData) return;
        const visible = nodeData.data.visible && !hiddenNodesRef.current.has(nid);
        if (visible) {
          visibleIds.push(nid);
        } else {
          hiddenIds.push(nid);
        }
      });

      const allVisible = hiddenIds.length === 0;

      const newGhostNodes: CanvasNode[] = [];
      const newGhostEdges: CanvasEdge[] = [];

      if (allVisible) {
        visibleIds.forEach((nid) => {
          const edgeData = cyDataEdges.find(
            (e) => e.data.source === (mode === 'children' ? closest.id : nid) && e.data.target === (mode === 'children' ? nid : closest.id),
          );
          if (edgeData) {
            newGhostEdges.push({
              source: edgeData.data.source,
              target: edgeData.data.target,
              label: edgeData.data.label,
              visible: true,
              previewRemoval: true,
            });
          }
        });
      } else {
        hiddenIds.forEach((nid) => {
          const nodeData = cyDataNodes.find((n) => n.data.id === nid);
          if (!nodeData) return;
          const edgeData = cyDataEdges.find(
            (e) => e.data.source === (mode === 'children' ? closest.id : nid) && e.data.target === (mode === 'children' ? nid : closest.id),
          );
          newGhostNodes.push({
            id: nid,
            label: nodeData.data.label,
            color: computeColorForId(nid),
            x: closest?.x,
            y: closest?.y,
            ghost: true,
          });
          newGhostEdges.push({
            source: mode === 'children' ? closest.id : nid,
            target: mode === 'children' ? nid : closest.id,
            label: edgeData?.data.label,
            visible: true,
            ghost: true,
          });
        });
      }

      const hasRemovalEdges = newGhostEdges.some((e) => e.previewRemoval);

      if (newGhostNodes.length > 0 || hasRemovalEdges) {
        Object.values(nodeMapRef.current).forEach((n) => {
          n.fx = n.x;
          n.fy = n.y;
          n.vx = 0;
          n.vy = 0;
        });
        setGhostNodes(newGhostNodes);
        setGhostEdges(newGhostEdges);
        simulationRef.current?.alphaTarget(0.3).restart();
      } else {
        setGhostNodes([]);
        setGhostEdges(newGhostEdges);
      }
    },
    [d3Nodes, transformRef, adjacencyRef, revAdjRef, cyDataNodes, cyDataEdges, simulationRef, clearPreview],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const selection = d3.select(canvas);

    if (zoomBehaviorRef.current) {
      selection.call(zoomBehaviorRef.current as any);
    }
    selection.on('dblclick.zoom', null);

    // Apply the new drag behavior (Alt+left) here
    selection.call(handleDrag as any);

    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 2) {
        rightDraggingRef.current = false;
        rightMouseDownRef.current = { x: event.clientX, y: event.clientY };
      }
    };
    const onMouseMove = (event: MouseEvent) => {
      // eslint-disable-next-line no-bitwise
      if ((event.buttons & 2) === 2 && rightMouseDownRef.current) {
        const dx = event.clientX - rightMouseDownRef.current.x;
        const dy = event.clientY - rightMouseDownRef.current.y;
        if (dx * dx + dy * dy > 16) {
          rightDraggingRef.current = true;
        }
      }
      updateHoverPreview(event);
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', clearPreview);
    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      selection.on('.zoom', null);
      selection.on('.drag', null);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', clearPreview);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleDrag, handleContextMenu, handleDoubleClick, zoomBehaviorRef]);

  useEffect(() => {
    if (ghostNodes.length === 0 && ghostEdges.length === 0) {
      const sim = simulationRef.current;
      if (sim) {
        sim.alphaTarget(0);
        sim.alpha(0);
      }
    }
  }, [ghostNodes.length, ghostEdges.length, simulationRef]);

  useEffect(() => {
    if (!hasCenteredRef.current && zoomBehaviorRef.current && d3Nodes.length > 0) {
      centerView();
      hasCenteredRef.current = true;
    }
  }, [centerView, d3Nodes.length, zoomBehaviorRef]);

  useEffect(() => {
    window.addEventListener('keyup', clearPreview);
    return () => {
      window.removeEventListener('keyup', clearPreview);
    };
  }, [clearPreview]);

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
        onToggleChildren={() => menuNode && toggleChildren(menuNode.id)}
        onToggleParents={() => menuNode && toggleParents(menuNode.id)}
        onHideNode={hideNode}
        onCenterView={centerView}
      />
    </div>
  );
}
