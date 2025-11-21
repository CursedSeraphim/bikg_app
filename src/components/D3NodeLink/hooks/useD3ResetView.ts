import { useCallback, useEffect, useRef } from 'react';
import { IGraphEdge, IGraphNode } from '../../../types';

export function useD3ResetView(
  cyDataNodes: IGraphNode[],
  cyDataEdges: IGraphEdge[],
  hiddenNodesRef: React.MutableRefObject<Set<string>>,
  hiddenEdgesRef: React.MutableRefObject<Set<string>>,
  originRef: React.MutableRefObject<Record<string, string | null>>,
  refresh: () => void,
) {
  const initialVisibleNodes = useRef<Set<string>>(new Set());
  const initialVisibleEdges = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (initialVisibleNodes.current.size === 0 && initialVisibleEdges.current.size === 0 && cyDataNodes.length > 0 && cyDataEdges.length > 0) {
      initialVisibleNodes.current = new Set(cyDataNodes.filter((n) => n.data.visible !== false).map((n) => n.data.id));
      initialVisibleEdges.current = new Set(cyDataEdges.filter((e) => e.data.visible !== false).map((e) => e.data.id));
    }
  }, [cyDataNodes, cyDataEdges]);

  const resetView = useCallback(() => {
    const origin = originRef;
    origin.current = {};

    hiddenNodesRef.current.clear();
    hiddenEdgesRef.current.clear();

    const nextNodes = cyDataNodes.map((node) => {
      const shouldBeVisible = initialVisibleNodes.current.has(node.data.id);

      if (node.data.visible === shouldBeVisible) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          visible: shouldBeVisible,
        },
      };
    });

    const visibleNodeIds = new Set(nextNodes.filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id)).map((n) => n.data.id));

    const nextEdges = cyDataEdges.map((edge) => {
      const hidden = hiddenEdgesRef.current.has(edge.data.id);
      const shouldBeVisible =
        !hidden && visibleNodeIds.has(edge.data.source) && visibleNodeIds.has(edge.data.target) && initialVisibleEdges.current.has(edge.data.id);

      if (edge.data.visible === shouldBeVisible) {
        return edge;
      }

      return {
        ...edge,
        data: {
          ...edge.data,
          visible: shouldBeVisible,
        },
      };
    });

    cyDataNodes.splice(0, cyDataNodes.length, ...nextNodes);
    cyDataEdges.splice(0, cyDataEdges.length, ...nextEdges);

    refresh();
  }, [cyDataNodes, cyDataEdges, hiddenNodesRef, hiddenEdgesRef, originRef, refresh]);

  return { resetView };
}
