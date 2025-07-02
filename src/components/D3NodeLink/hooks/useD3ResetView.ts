import { useCallback, useEffect, useRef } from 'react';
import { ICytoEdge, ICytoNode } from '../../../types';

export function useD3ResetView(
  cyDataNodes: ICytoNode[],
  cyDataEdges: ICytoEdge[],
  hiddenNodesRef: React.MutableRefObject<Set<string>>,
  hiddenEdgesRef: React.MutableRefObject<Set<string>>,
  originRef: React.MutableRefObject<Record<string, string | null>>,
  refresh: () => void,
) {
  const initialNodesRef = useRef<ICytoNode[]>([]);
  const initialEdgesRef = useRef<ICytoEdge[]>([]);
  const initialNodeIdsRef = useRef<Set<string>>(new Set());
  const initialEdgeIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (initialNodesRef.current.length === 0 && cyDataNodes.length > 0) {
      initialNodesRef.current = cyDataNodes.map((n) => ({ ...n, data: { ...n.data } }));
      initialEdgesRef.current = cyDataEdges.map((e) => ({ ...e, data: { ...e.data } }));
      initialNodeIdsRef.current = new Set(cyDataNodes.map((n) => n.data.id));
      initialEdgeIdsRef.current = new Set(cyDataEdges.map((e) => e.data.id));
    }
  }, [cyDataNodes, cyDataEdges]);

  const recomputeEdgeVisibility = useCallback(() => {
    const visible = new Set(cyDataNodes.filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id)).map((n) => n.data.id));

    cyDataEdges.forEach((edge) => {
      const hidden = hiddenEdgesRef.current.has(edge.data.id);
      edge.data.visible = !hidden && visible.has(edge.data.source) && visible.has(edge.data.target);
    });
  }, [cyDataNodes, cyDataEdges, hiddenNodesRef, hiddenEdgesRef]);

  const resetView = useCallback(() => {
    hiddenNodesRef.current.clear();
    hiddenEdgesRef.current.clear();
    originRef.current = {};

    initialNodesRef.current.forEach((n) => {
      const node = cyDataNodes.find((v) => v.data.id === n.data.id);
      if (node) {
        node.data.visible = n.data.visible;
      }
    });

    cyDataNodes.forEach((node) => {
      if (!initialNodeIdsRef.current.has(node.data.id)) {
        node.data.visible = false;
      }
    });

    initialEdgesRef.current.forEach((e) => {
      const edge = cyDataEdges.find((v) => v.data.id === e.data.id);
      if (edge) {
        edge.data.visible = e.data.visible;
      }
    });

    cyDataEdges.forEach((edge) => {
      if (!initialEdgeIdsRef.current.has(edge.data.id)) {
        edge.data.visible = false;
      }
    });

    recomputeEdgeVisibility();
    refresh();
  }, [cyDataNodes, cyDataEdges, hiddenNodesRef, hiddenEdgesRef, originRef, recomputeEdgeVisibility, refresh]);

  return { resetView };
}
