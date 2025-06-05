import { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasEdge, CanvasNode } from '../D3NldTypes';
import { computeColorForId } from '../D3NldUtils';

export function useForceGraphState(cyDataNodes: any[], cyDataEdges: any[]) {
  const [d3Nodes, setD3Nodes] = useState<CanvasNode[]>([]);
  const [d3Edges, setD3Edges] = useState<CanvasEdge[]>([]);

  const hiddenNodesRef = useRef<Set<string>>(new Set());
  const originRef = useRef<Record<string, string | null>>({});
  const nodeMapRef = useRef<Record<string, CanvasNode>>({});
  const savedPositionsRef = useRef<Record<string, { x?: number; y?: number }>>({});

  const convertData = useCallback(() => {
    const visibleNodeData = cyDataNodes.filter(
      (n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id),
    );
    const visibleIds = new Set(visibleNodeData.map((n) => n.data.id));

    const visibleEdgeData = cyDataEdges.filter(
      (e) =>
        e.data.visible &&
        visibleIds.has(e.data.source) &&
        visibleIds.has(e.data.target),
    );

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
    convertData();
  }, [convertData]);

  const recomputeEdgeVisibility = useCallback(() => {
    const visible = new Set(
      cyDataNodes
        .filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id))
        .map((n) => n.data.id),
    );
    cyDataEdges.forEach((edge) => {
      edge.data.visible = visible.has(edge.data.source) && visible.has(edge.data.target);
    });
  }, [cyDataNodes, cyDataEdges]);

  return {
    d3Nodes,
    d3Edges,
    convertData,
    recomputeEdgeVisibility,
    hiddenNodesRef,
    originRef,
    nodeMapRef,
    savedPositionsRef,
    setD3Nodes,
    setD3Edges,
  };
}
