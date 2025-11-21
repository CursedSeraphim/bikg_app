import { useCallback, useEffect, useState } from 'react';
import { IGraphEdge, IGraphNode } from '../../../types';

export const visibilityId = {
  node: (id: string) => id,
  edge: (source: string, target: string) => `${source}->${target}`,
};

export interface Visibility {
  nodes: Record<string, boolean>;
  edges: Record<string, boolean>;
}

export interface UseVisibilityProps {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
  loading: boolean;
}

export function useVisibility({ nodes: cyDataNodes, edges: cyDataEdges, loading }: UseVisibilityProps) {
  const [visibility, setVisibility] = useState<Visibility>({ nodes: {}, edges: {} });

  useEffect(() => {
    if (loading) return;

    const nodes = Object.fromEntries(cyDataNodes.map((n) => [visibilityId.node(n.data.id), n.data.visible]));
    const edges = Object.fromEntries(cyDataEdges.map((e) => [visibilityId.edge(e.data.source, e.data.target), e.data.visible]));

    setVisibility({ nodes, edges });
  }, [loading, cyDataNodes, cyDataEdges]);

  const isNodeVisible = useCallback((nodeId: string) => visibility.nodes[nodeId] ?? false, [visibility.nodes]);

  const isEdgeVisible = useCallback(
    (sourceId: string, targetId: string) => visibility.edges[visibilityId.edge(sourceId, targetId)] ?? false,
    [visibility.edges],
  );

  const setNodeVisibility = useCallback((nodeId: string, isVisible: boolean) => {
    setVisibility((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: isVisible,
      },
    }));
  }, []);

  const setEdgeVisibility = useCallback((sourceId: string, targetId: string, isVisible: boolean) => {
    setVisibility((prev) => ({
      ...prev,
      edges: {
        ...prev.edges,
        [visibilityId.edge(sourceId, targetId)]: isVisible,
      },
    }));
  }, []);

  return {
    visibility,
    isNodeVisible,
    isEdgeVisible,
    setNodeVisibility,
    setEdgeVisibility,
  };
}
