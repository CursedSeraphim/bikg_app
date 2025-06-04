import { useCallback } from 'react';

export function useNodeVisibility(
  cyDataNodes: any[],
  cyDataEdges: any[],
  adjacencyRef: React.MutableRefObject<Record<string, string[]>>,
  revAdjRef: React.MutableRefObject<Record<string, string[]>>,
  hiddenNodesRef: React.MutableRefObject<Set<string>>,
  originRef: React.MutableRefObject<Record<string, string | null>>,
  refresh: () => void,
) {
  /**
   * Helper that recalculates edge visibility based on the current set of
   * visible nodes. An edge becomes visible whenever both its source and target
   * nodes are visible.
   */
  const recomputeEdgeVisibility = useCallback(() => {
    const visible = new Set(cyDataNodes.filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id)).map((n) => n.data.id));

    cyDataEdges.forEach((edge) => {
      edge.data.visible = visible.has(edge.data.source) && visible.has(edge.data.target);
    });
  }, [cyDataNodes, cyDataEdges, hiddenNodesRef]);
  const showChildren = useCallback(
    (nodeId: string) => {
      cyDataNodes.forEach((node) => {
        if (adjacencyRef.current[nodeId]?.includes(node.data.id)) {
          if (!node.data.visible && originRef.current[node.data.id] === undefined) {
            originRef.current[node.data.id] = nodeId;
          }
          node.data.visible = true;
        }
      });

      recomputeEdgeVisibility();
      refresh();
    },
    [cyDataNodes, adjacencyRef, recomputeEdgeVisibility, refresh],
  );

  const hideChildren = useCallback(
    (nodeId: string) => {
      cyDataNodes.forEach((node) => {
        if (adjacencyRef.current[nodeId]?.includes(node.data.id)) {
          node.data.visible = false;
        }
      });

      recomputeEdgeVisibility();
      refresh();
    },
    [cyDataNodes, adjacencyRef, recomputeEdgeVisibility, refresh],
  );

  const showParents = useCallback(
    (nodeId: string) => {
      cyDataNodes.forEach((node) => {
        if (revAdjRef.current[nodeId]?.includes(node.data.id)) {
          if (!node.data.visible && originRef.current[node.data.id] === undefined) {
            originRef.current[node.data.id] = nodeId;
          }
          node.data.visible = true;
        }
      });

      recomputeEdgeVisibility();
      refresh();
    },
    [cyDataNodes, revAdjRef, recomputeEdgeVisibility, refresh],
  );

  const hideParents = useCallback(
    (nodeId: string) => {
      cyDataNodes.forEach((node) => {
        if (revAdjRef.current[nodeId]?.includes(node.data.id)) {
          node.data.visible = false;
        }
      });

      recomputeEdgeVisibility();
      refresh();
    },
    [cyDataNodes, revAdjRef, recomputeEdgeVisibility, refresh],
  );

  const hideNode = useCallback(
    (nodeId: string) => {
      hiddenNodesRef.current.add(nodeId);
      recomputeEdgeVisibility();
      refresh();
    },
    [refresh, hiddenNodesRef, recomputeEdgeVisibility],
  );

  return { showChildren, hideChildren, showParents, hideParents, hideNode };
}
