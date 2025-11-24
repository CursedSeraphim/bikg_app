import { useCallback, useEffect, useState } from 'react';
import type { ParsedEdge, ParsedGraph, ParsedNode } from '../utils/rdf/parseRdfOntology';

export function useGraphData(parsedGraph: ParsedGraph) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [visibleNodes, setVisibleNodes] = useState<ParsedNode[]>([]);
  const [visibleEdges, setVisibleEdges] = useState<ParsedEdge[]>([]);

  // Build visible edges based on current visible nodes
  const buildVisibleEdges = useCallback((allEdges: ParsedEdge[], visible: ParsedNode[]) => {
    const visibleIds = new Set(visible.map((v) => v.id));
    return allEdges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  }, []);

  // Recompute visible nodes and edges whenever the parsedGraph changes
  useEffect(() => {
    if (!parsedGraph || !parsedGraph.nodes.length) {
      setVisibleNodes([]);
      setVisibleEdges([]);
      return;
    }

    // For simplified implementation, just make all nodes visible
    setVisibleNodes(parsedGraph.nodes);
    setVisibleEdges(buildVisibleEdges(parsedGraph.edges, parsedGraph.nodes));
  }, [parsedGraph, buildVisibleEdges]);

  // Toggles the subtree expansion/collapse
  const toggleNode = useCallback(
    (nodeId: string) => {
      const nodeData = parsedGraph.nodes.find((n) => n.id === nodeId);
      if (!nodeData) return;

      const isCurrentlyExpanded = expandedNodes.has(nodeId);
      const newExpandedSet = new Set(expandedNodes);

      if (!isCurrentlyExpanded) {
        // Expand node
        newExpandedSet.add(nodeId);
        const newVisibleNodes = [...visibleNodes];
        nodeData.children.forEach((childId) => {
          const childData = parsedGraph.nodes.find((n) => n.id === childId);
          if (childData && !newVisibleNodes.some((n) => n.id === childId)) {
            newVisibleNodes.push(childData);
          }
        });
        setExpandedNodes(newExpandedSet);
        setVisibleNodes(newVisibleNodes);
        setVisibleEdges(buildVisibleEdges(parsedGraph.edges, newVisibleNodes));
      } else {
        // Collapse node
        newExpandedSet.delete(nodeId);
        const newVisibleNodes = visibleNodes.filter((v) => !nodeData.children.includes(v.id));
        setExpandedNodes(newExpandedSet);
        setVisibleNodes(newVisibleNodes);
        setVisibleEdges(buildVisibleEdges(parsedGraph.edges, newVisibleNodes));
      }
    },
    [expandedNodes, parsedGraph, visibleNodes, buildVisibleEdges],
  );

  return {
    visibleNodes,
    visibleEdges,
    toggleNode,
  };
}
