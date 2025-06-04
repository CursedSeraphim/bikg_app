import { useCallback } from 'react';

export function useNodeVisibility(
  cyDataNodes: any[],
  cyDataEdges: any[],
  adjacencyRef: React.MutableRefObject<Record<string, string[]>>,
  revAdjRef: React.MutableRefObject<Record<string, string[]>>,
  hiddenNodesRef: React.MutableRefObject<Set<string>>,
  refresh: () => void,
) {
  const showChildren = useCallback(
    (nodeId: string) => {
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
      refresh();
    },
    [cyDataNodes, cyDataEdges, refresh, adjacencyRef],
  );

  const hideChildren = useCallback(
    (nodeId: string) => {
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
      refresh();
    },
    [cyDataNodes, cyDataEdges, refresh, adjacencyRef],
  );

  const showParents = useCallback(
    (nodeId: string) => {
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
      refresh();
    },
    [cyDataNodes, cyDataEdges, refresh, revAdjRef],
  );

  const hideParents = useCallback(
    (nodeId: string) => {
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
      refresh();
    },
    [cyDataNodes, cyDataEdges, refresh, revAdjRef],
  );

  const hideNode = useCallback(
    (nodeId: string) => {
      hiddenNodesRef.current.add(nodeId);
      refresh();
    },
    [refresh, hiddenNodesRef],
  );

  return { showChildren, hideChildren, showParents, hideParents, hideNode };
}
