import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCumulativeNumberViolationsPerNode, selectD3BoundingBox, selectTypes, selectViolations } from '../Store/CombinedSlice';
import { useD3Data } from './useD3Data';

import { ContextMenu } from './D3NldContextMenu';
import { CanvasEdge, CanvasNode, D3NLDViewProps } from './D3NldTypes';
import { computeColorForId } from './D3NldUtils';
import { useD3Force } from './hooks/useD3Force';
import { useAdjacency } from './hooks/useAdjacency';
import { useCanvasDimensions } from './hooks/useCanvasDimensions';
import { useNodeVisibility } from './hooks/useNodeVisibility';

/** Force-directed graph view for the D3 based node-link diagram. */
export default function D3ForceGraph({ rdfOntology, onLoaded }: D3NLDViewProps) {
  // Redux selectors
  const violations = useSelector(selectViolations);
  const types = useSelector(selectTypes);
  const cumulativeNumberViolationsPerType = useSelector(selectCumulativeNumberViolationsPerNode);
  const d3BoundingBox = useSelector(selectD3BoundingBox);

  // Fetch Cytoscape-like data used by the D3 view
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

  const { adjacencyRef, revAdjRef } = useAdjacency(cyDataEdges);

  const hiddenNodesRef = useRef<Set<string>>(new Set());
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
    d3Nodes,
    d3Edges,
    d3BoundingBox,
    dimensions,
  );

  const { showChildren, hideChildren, showParents, hideParents, hideNode } = useNodeVisibility(
    cyDataNodes,
    cyDataEdges,
    adjacencyRef,
    revAdjRef,
    hiddenNodesRef,
    convertData,
  );
  const freezeNode = useCallback(
    (id: string, duration = 1000) => {
      const node = nodeMapRef.current[id];
      if (!node || !simulationRef.current) return;
      node.fx = node.x;
      node.fy = node.y;
      simulationRef.current.alphaTarget(0.1).restart();
      setTimeout(() => {
        node.fx = null;
        node.fy = null;
        simulationRef.current?.alphaTarget(0);
      }, duration);
    },
    [simulationRef],
  );

  const toggleChildren = useCallback(
    (id: string) => {
      freezeNode(id);

      const childIds = adjacencyRef.current[id] || [];
      const anyVisible = childIds.some((childId) => {
        const node = cyDataNodes.find((n) => n.data.id === childId);
        return node && node.data.visible && !hiddenNodesRef.current.has(childId);
      });

      if (anyVisible) {
        hideChildren(id);
      } else {
        showChildren(id);
      }
    },
    [freezeNode, showChildren, hideChildren, cyDataNodes, adjacencyRef],
  );

  const toggleParents = useCallback(
    (id: string) => {
      freezeNode(id);

      const parentIds = revAdjRef.current[id] || [];
      const anyVisible = parentIds.some((parentId) => {
        const node = cyDataNodes.find((n) => n.data.id === parentId);
        return node && node.data.visible && !hiddenNodesRef.current.has(parentId);
      });

      if (anyVisible) {
        hideParents(id);
      } else {
        showParents(id);
      }
    },
    [freezeNode, showParents, hideParents, cyDataNodes, revAdjRef],
  );

  const centerView = useCallback(() => {
    if (!simulationRef.current) return;
    simulationRef.current.alpha(1).restart();
  }, []);

  const rightDraggingRef = useRef(false);
  const rightMouseDownRef = useRef<{ x: number; y: number } | null>(null);

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
    [d3Nodes, transformRef, simulationRef],
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
  }, [zoomBehaviorRef, transformRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const selection = d3.select(canvas);

    if (zoomBehaviorRef.current) {
      selection.call(zoomBehaviorRef.current as any);
    }
    selection.on('dblclick.zoom', null);

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
  }, [handleDrag, handleContextMenu, handleDoubleClick, zoomBehaviorRef]);

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
