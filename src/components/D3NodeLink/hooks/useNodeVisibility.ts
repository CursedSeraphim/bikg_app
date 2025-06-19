import { useCallback } from 'react';

export function useNodeVisibility(
  cyDataNodes: any[],
  cyDataEdges: any[],
  adjacencyRef: React.MutableRefObject<Record<string, string[]>>,
  revAdjRef: React.MutableRefObject<Record<string, string[]>>,
  originRef: React.MutableRefObject<Record<string, string | null>>,
  refresh: () => void,
) {
  /**
   * Helper that recalculates edge visibility based on the current set of
   * visible nodes. An edge becomes visible whenever both its source and target
   * nodes are visible.
   */
  const recomputeEdgeVisibility = useCallback(() => {
    const visible = new Set(cyDataNodes.filter((n) => n.data.visible).map((n) => n.data.id));

    cyDataEdges.forEach((edge) => {
      edge.data.visible = edge.data.visible && visible.has(edge.data.source) && visible.has(edge.data.target);
    });
  }, [cyDataNodes, cyDataEdges]);

  const computeExpansion = useCallback(
    (nodeId: string, mode: 'children' | 'parents') => {
      const neighborIds = mode === 'children' ? adjacencyRef.current[nodeId] || [] : revAdjRef.current[nodeId] || [];

      const visibleSet = new Set(cyDataNodes.filter((n) => n.data.visible).map((n) => n.data.id));

      const nodeIds: string[] = [];
      const edges: { id: string; source: string; target: string; label?: string }[] = [];
      const addedKeys = new Set<string>();

      neighborIds.forEach((nid) => {
        const nodeData = cyDataNodes.find((n) => n.data.id === nid);
        if (!nodeData) return;
        const isVisible = visibleSet.has(nid);

        if (!isVisible) {
          nodeIds.push(nid);

          cyDataEdges.forEach((edge) => {
            const { source, target } = edge.data;
            if (
              (source === nodeId && target === nid) ||
              (source === nid && target === nodeId) ||
              (source === nid && visibleSet.has(target) && target !== nodeId) ||
              (target === nid && visibleSet.has(source) && source !== nodeId)
            ) {
              const key = `${source}->${target}`;
              if (!addedKeys.has(key)) {
                addedKeys.add(key);
                edges.push({ id: edge.data.id, source, target, label: edge.data.label });
              }
            }
          });
        }
      });

      return { nodeIds, edges };
    },
    [adjacencyRef, revAdjRef, cyDataNodes, cyDataEdges],
  );
  const showChildren = useCallback(
    (nodeId: string) => {
      const { nodeIds, edges: expansionEdges } = computeExpansion(nodeId, 'children');

      cyDataNodes.forEach((node) => {
        if (nodeIds.includes(node.data.id)) {
          if (!node.data.visible && originRef.current[node.data.id] === undefined) {
            originRef.current[node.data.id] = nodeId;
          }
          node.data.visible = true;
        }
      });

      expansionEdges.forEach((edge) => {
        const e = cyDataEdges.find((ed) => ed.data.id === edge.id);
        if (e) {
          e.data.visible = true;
        }
      });

      recomputeEdgeVisibility();
      refresh();
    },
    [cyDataNodes, cyDataEdges, computeExpansion, recomputeEdgeVisibility, refresh, originRef],
  );

  const hideChildren = useCallback(
    (nodeId: string) => {
      const visibleNodes = new Set(cyDataNodes.filter((n) => n.data.visible).map((n) => n.data.id));

      const children = adjacencyRef.current[nodeId] || [];

      children.forEach((childId) => {
        cyDataEdges.forEach((edge) => {
          if (edge.data.source === nodeId && edge.data.target === childId) {
            edge.data.visible = false;
          }
        });

        const stillConnected = cyDataEdges.some((edge) => {
          if (!edge.data.visible) return false;
          if (!visibleNodes.has(edge.data.source) || !visibleNodes.has(edge.data.target)) return false;
          if (edge.data.source === nodeId && edge.data.target === childId) return false;
          return edge.data.source === childId || edge.data.target === childId;
        });

        if (!stillConnected) {
          const childNode = cyDataNodes.find((n) => n.data.id === childId);
          if (childNode) {
            childNode.data.visible = false;
            visibleNodes.delete(childId);
          }
        }
      });

      recomputeEdgeVisibility();
      refresh();
    },
    [cyDataNodes, cyDataEdges, adjacencyRef, recomputeEdgeVisibility, refresh],
  );

  const showParents = useCallback(
    (nodeId: string) => {
      const { nodeIds, edges: expansionEdges } = computeExpansion(nodeId, 'parents');

      cyDataNodes.forEach((node) => {
        if (nodeIds.includes(node.data.id)) {
          if (!node.data.visible && originRef.current[node.data.id] === undefined) {
            originRef.current[node.data.id] = nodeId;
          }
          node.data.visible = true;
        }
      });

      expansionEdges.forEach((edge) => {
        const e = cyDataEdges.find((ed) => ed.data.id === edge.id);
        if (e) {
          e.data.visible = true;
        }
      });

      recomputeEdgeVisibility();
      refresh();
    },
    [cyDataNodes, cyDataEdges, computeExpansion, recomputeEdgeVisibility, refresh, originRef],
  );

  const hideParents = useCallback(
    (nodeId: string) => {
      const visibleNodes = new Set(cyDataNodes.filter((n) => n.data.visible).map((n) => n.data.id));

      const parents = revAdjRef.current[nodeId] || [];

      parents.forEach((parentId) => {
        cyDataEdges.forEach((edge) => {
          if (edge.data.source === parentId && edge.data.target === nodeId) {
            edge.data.visible = false;
          }
        });

        const stillConnected = cyDataEdges.some((edge) => {
          if (!edge.data.visible) return false;
          if (!visibleNodes.has(edge.data.source) || !visibleNodes.has(edge.data.target)) return false;
          if (edge.data.source === parentId && edge.data.target === nodeId) return false;
          return edge.data.source === parentId || edge.data.target === parentId;
        });

        if (!stillConnected) {
          const parentNode = cyDataNodes.find((n) => n.data.id === parentId);
          if (parentNode) {
            parentNode.data.visible = false;
            visibleNodes.delete(parentId);
          }
        }
      });

      recomputeEdgeVisibility();
      refresh();
    },
    [cyDataNodes, cyDataEdges, revAdjRef, recomputeEdgeVisibility, refresh],
  );

  const hideNode = useCallback(
    (nodeId: string) => {
      const node = cyDataNodes.find((n) => n.data.id === nodeId);
      if (node) node.data.visible = false;
      recomputeEdgeVisibility();
      refresh();
    },
    [refresh, recomputeEdgeVisibility, cyDataNodes],
  );

  return { computeExpansion, showChildren, hideChildren, showParents, hideParents, hideNode };
}
