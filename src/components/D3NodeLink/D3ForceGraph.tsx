// File: src/components/D3NodeLink/D3ForceGraph.tsx

import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCumulativeNumberViolationsPerNode, selectD3BoundingBox, selectTypes, selectViolations } from '../Store/CombinedSlice';
import { useD3Data } from './useD3Data';

import { CanvasEdge, CanvasNode, D3NLDViewProps } from './D3NldTypes';
import { computeColorForId } from './D3NldUtils';
import { useAdjacency } from './hooks/useAdjacency';
import { useCanvasDimensions } from './hooks/useCanvasDimensions';
import { useD3Force } from './hooks/useD3Force';
import { useNodeVisibility } from './hooks/useNodeVisibility';
import { useD3ContextMenu } from './hooks/useD3ContextMenu';
import { GraphState } from './services/GraphState';
import { PreviewService } from './services/PreviewService';
import { CommitService } from './services/CommitService';
import { LayoutService } from './services/LayoutService';
import { InteractionController } from './services/InteractionController';

/** Force‐directed graph view for the D3 based node‐link diagram. */
export default function D3ForceGraph({ rdfOntology, onLoaded, initialCentering = true }: D3NLDViewProps) {
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

  const [ghostNodes, setGhostNodes] = useState<CanvasNode[]>([]);
  const [ghostEdges, setGhostEdges] = useState<CanvasEdge[]>([]);
  const activePreviewRef = useRef<{ mode: 'children' | 'parents' | null; nodeId: string | null }>({ mode: null, nodeId: null });

  const { adjacencyRef, revAdjRef } = useAdjacency(cyDataEdges);

  const hiddenNodesRef = useRef<Set<string>>(new Set());
  const hiddenEdgesRef = useRef<Set<string>>(new Set());
  const originRef = useRef<Record<string, string | null>>({});
  const nodeMapRef = useRef<Record<string, CanvasNode>>({});
  const savedPositionsRef = useRef<Record<string, { x?: number; y?: number }>>({});

  const graphStateRef = useRef<GraphState | null>(null);
  const previewServiceRef = useRef<PreviewService | null>(null);
  const commitServiceRef = useRef<CommitService | null>(null);
  const layoutServiceRef = useRef<LayoutService | null>(null);
  const interactionControllerRef = useRef<InteractionController | null>(null);

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
      const nodes = cyDataNodes.map((n) => ({ id: n.data.id, visible: n.data.visible && !hiddenNodesRef.current.has(n.data.id) }));
      const edges = cyDataEdges.map((e) => ({
        id: e.data.id,
        source: e.data.source,
        target: e.data.target,
        visible: e.data.visible && !hiddenEdgesRef.current.has(e.data.id),
      }));
      graphStateRef.current = new GraphState(nodes, edges, adjacencyRef.current, revAdjRef.current);
      const edgeMap: Record<string, CanvasEdge> = {};
      d3Edges.forEach((e) => {
        edgeMap[e.label ?? `${e.source}->${e.target}`] = e;
      });
      previewServiceRef.current = new PreviewService(nodeMapRef.current, edgeMap);
      commitServiceRef.current = new CommitService(graphStateRef.current);
      layoutServiceRef.current = new LayoutService(simulationRef);
      interactionControllerRef.current = new InteractionController(
        graphStateRef.current,
        previewServiceRef.current,
        commitServiceRef.current,
        layoutServiceRef.current,
      );
    }
  }, [loading, convertData]);

  const { transformRef, simulationRef, zoomBehaviorRef } = useD3Force(
    canvasRef,
    [...d3Nodes, ...ghostNodes],
    [...d3Edges, ...ghostEdges],
    d3BoundingBox,
    dimensions,
    false,
    initialCentering,
  );

  const centerView = useCallback(() => {
    if (!zoomBehaviorRef.current || !canvasRef.current) return;

    const nodesToFit = [...d3Nodes, ...ghostNodes];
    if (nodesToFit.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    nodesToFit.forEach((n) => {
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const padding = 40;
    const boundsWidth = maxX - minX || 1;
    const boundsHeight = maxY - minY || 1;
    const scale = Math.min(dimensions.width / (boundsWidth + padding * 2), dimensions.height / (boundsHeight + padding * 2), 10);

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const transform = d3.zoomIdentity.translate(dimensions.width / 2 - scale * cx, dimensions.height / 2 - scale * cy).scale(scale);

    transformRef.current = transform;
    d3.select(canvasRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.transform, transform as any);
  }, [zoomBehaviorRef, canvasRef, d3Nodes, ghostNodes, dimensions, transformRef]);

  const { menu: contextMenu } = useD3ContextMenu(canvasRef, d3Nodes, transformRef, centerView);

  useNodeVisibility(cyDataNodes, cyDataEdges, adjacencyRef, revAdjRef, hiddenNodesRef, hiddenEdgesRef, originRef, convertData);

  // Freeze nodes for a short period. By default, all currently visible nodes are
  // frozen for `otherDuration` milliseconds (500ms) while the triggering node
  // is frozen for `triggerDuration` milliseconds (1000ms). Passing `otherDuration`
  // as `0` skips freezing the other nodes. The `alphaTarget` parameter controls
  // the force simulation strength during the freeze.
  const freezeNode = useCallback(
    (id: string, otherDuration = 500, triggerDuration = 1000, alphaTarget = 0.1) => {
      const sim = simulationRef.current;
      if (!sim) return;

      const allNodes = Object.values(nodeMapRef.current);
      allNodes.forEach((node) => {
        if (otherDuration > 0 || node.id === id) {
          // eslint-disable-next-line no-param-reassign
          node.fx = node.x;
          // eslint-disable-next-line no-param-reassign
          node.fy = node.y;
        }
      });

      sim.alphaTarget(alphaTarget).restart();

      if (otherDuration > 0) {
        // Release other nodes after `otherDuration`
        setTimeout(() => {
          allNodes.forEach((node) => {
            if (node.id !== id) {
              // eslint-disable-next-line no-param-reassign
              node.fx = null;
              // eslint-disable-next-line no-param-reassign
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
    previewServiceRef.current?.clearPreview();
    setGhostNodes(previewServiceRef.current?.ghostNodes ?? []);
    setGhostEdges(previewServiceRef.current?.ghostEdges ?? []);
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
      // eslint-disable-next-line no-param-reassign
      n.fx = null;
      // eslint-disable-next-line no-param-reassign
      n.fy = null;
      // eslint-disable-next-line no-param-reassign
      n.vx = 0;
      // eslint-disable-next-line no-param-reassign
      n.vy = 0;
    });
    const sim = simulationRef.current;
    if (sim) {
      sim.alpha(0);
      sim.alphaTarget(0);
    }
    activePreviewRef.current = { mode: null, nodeId: null };
  }, [simulationRef, previewServiceRef]);

  const rightDraggingRef = useRef(false);
  const rightMouseDownRef = useRef<{ x: number; y: number } | null>(null);

  // Drag handler now uses Alt + left‐click (button 0 + event.altKey)
  const handleDrag = d3
    .drag<HTMLCanvasElement, CanvasNode>()
    .filter((event) => event.button === 0 && event.altKey)
    .subject((event) => {
      const sim = simulationRef.current;
      if (!sim) return null;
      const [px, py] = d3.pointer(event, canvasRef.current);
      const [tx, ty] = transformRef.current.invert([px, py]);
      return d3.least([...d3Nodes, ...ghostNodes], (node: CanvasNode) => {
        const dx = (node.x ?? 0) - tx;
        const dy = (node.y ?? 0) - ty;
        return dx * dx + dy * dy;
      });
    })
    .on('start', (event) => {
      const sim = simulationRef.current;
      if (!sim) return;
      interactionControllerRef.current?.onDragStart();
      if (!event.active) sim.alphaTarget(0.3).restart();
      // eslint-disable-next-line no-param-reassign
      event.subject.fx = event.subject.x;
      // eslint-disable-next-line no-param-reassign
      event.subject.fy = event.subject.y;
    })
    .on('drag', (event) => {
      const [px, py] = d3.pointer(event, canvasRef.current);
      const [tx, ty] = transformRef.current.invert([px, py]);
      // eslint-disable-next-line no-param-reassign
      event.subject.fx = tx;
      // eslint-disable-next-line no-param-reassign
      event.subject.fy = ty;
    })
    .on('end', (event) => {
      const sim = simulationRef.current;
      if (!sim) return;
      if (!event.active) sim.alphaTarget(0);
      // eslint-disable-next-line no-param-reassign
      event.subject.fx = null;
      // eslint-disable-next-line no-param-reassign
      event.subject.fy = null;
    });

  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      if (!interactionControllerRef.current) return;
      const [pxRaw, pyRaw] = d3.pointer(event, canvasRef.current);
      const transform = transformRef.current;
      const [px, py] = transform.invert([pxRaw, pyRaw]);

      const NODE_RADIUS_PX = 200;
      const CLICK_RADIUS_PX = NODE_RADIUS_PX * 2;
      const effectiveRadius = CLICK_RADIUS_PX / (transform?.k ?? 1);
      const NEAR_NODE_DIST_SQ = effectiveRadius * effectiveRadius;

      let closest: CanvasNode | null = null;
      let minDist = Infinity;

      [...d3Nodes, ...ghostNodes].forEach((node) => {
        const dx = (node.x ?? 0) - px;
        const dy = (node.y ?? 0) - py;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < minDist) {
          minDist = dist2;
          closest = node;
        }
      });

      if (closest && minDist < NEAR_NODE_DIST_SQ) {
        interactionControllerRef.current.onDoubleClick(closest.id, { ctrl: event.ctrlKey, shift: event.shiftKey });
        convertData();
        setD3Nodes([...d3Nodes]);
        setD3Edges([...d3Edges]);
        setGhostNodes([]);
        setGhostEdges([]);
      }
    },
    [d3Nodes, d3Edges, ghostNodes, transformRef, convertData, interactionControllerRef],
  );

  const updateHoverPreview = useCallback(
    (event: MouseEvent) => {
      if (!interactionControllerRef.current) return;
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
        interactionControllerRef.current.onHoverEnd();
        return;
      }

      interactionControllerRef.current.onHover(closest.id, { ctrl: event.ctrlKey, shift: event.shiftKey });
      setGhostNodes((previewServiceRef.current?.ghostNodes ?? []) as CanvasNode[]);
      setGhostEdges((previewServiceRef.current?.ghostEdges ?? []) as CanvasEdge[]);
    },
    [d3Nodes, transformRef, interactionControllerRef, previewServiceRef],
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

    return () => {
      selection.on('.zoom', null);
      selection.on('.drag', null);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', clearPreview);
      canvas.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [handleDrag, handleDoubleClick, zoomBehaviorRef, updateHoverPreview, clearPreview, interactionControllerRef]);

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
      {contextMenu}
    </div>
  );
}
