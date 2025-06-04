import { useEffect, useRef } from 'react';

interface CytoscapeEdge {
  data: { source: string; target: string };
}

/**
 * Build adjacency and reverse adjacency maps from a list of edges.
 */
export function useAdjacency(edges: CytoscapeEdge[]) {
  const adjacencyRef = useRef<Record<string, string[]>>({});
  const revAdjRef = useRef<Record<string, string[]>>({});

  useEffect(() => {
    const adj: Record<string, string[]> = {};
    const rev: Record<string, string[]> = {};
    edges.forEach((edge) => {
      const s = edge.data.source;
      const t = edge.data.target;
      if (!adj[s]) adj[s] = [];
      adj[s].push(t);
      if (!rev[t]) rev[t] = [];
      rev[t].push(s);
    });
    adjacencyRef.current = adj;
    revAdjRef.current = rev;
  }, [edges]);

  return { adjacencyRef, revAdjRef };
}
