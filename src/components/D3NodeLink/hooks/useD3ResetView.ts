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
  const initialVisibleNodes = useRef<Set<string>>(new Set());
  const initialVisibleEdges = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (initialVisibleNodes.current.size === 0 && cyDataNodes.length > 0) {
      initialVisibleNodes.current = new Set(cyDataNodes.filter((n) => n.data.visible !== false).map((n) => n.data.id));
      initialVisibleEdges.current = new Set(cyDataEdges.filter((e) => e.data.visible !== false).map((e) => e.data.id));
    }
  }, [cyDataNodes, cyDataEdges]);

  const resetView = useCallback(() => {
    hiddenNodesRef.current.clear();
    hiddenEdgesRef.current.clear();
    originRef.current = {};

    cyDataNodes.forEach((node) => {
      node.data.visible = initialVisibleNodes.current.has(node.data.id);
    });

    cyDataEdges.forEach((edge) => {
      edge.data.visible = initialVisibleEdges.current.has(edge.data.id);
    });

    refresh();
  }, [cyDataNodes, cyDataEdges, hiddenNodesRef, hiddenEdgesRef, originRef, refresh]);

  return { resetView };
}
