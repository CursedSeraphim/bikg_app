export interface PreviewEdge {
  id?: string;
  source: string;
  target: string;
  label?: string;
}

export interface AssociatedHoverPreviewInput {
  selectionScope: { idsToSelect: Set<string>; visibleEdgeIds: Set<string> } | null;
  cyDataNodes: Array<{ data: { id: string; visible: boolean; label?: string } }>;
  cyDataEdges: Array<{ data: { id: string; source: string; target: string; label?: string } }>;
  hiddenNodes: Set<string>;
  isLabelBlacklisted: (label?: string) => boolean;
  isIdBlacklisted: (id: string) => boolean;
}

export interface AssociatedHoverPreviewResult {
  nodeIds: string[];
  edges: PreviewEdge[];
}

export function getAssociatedHoverPreviewTargets({
  selectionScope,
  cyDataNodes,
  cyDataEdges,
  hiddenNodes,
  isLabelBlacklisted,
  isIdBlacklisted,
}: AssociatedHoverPreviewInput): AssociatedHoverPreviewResult {
  if (!selectionScope) {
    return { nodeIds: [], edges: [] };
  }

  const visibleSet = new Set(
    cyDataNodes.filter((node) => node.data.visible && !hiddenNodes.has(node.data.id) && !isLabelBlacklisted(node.data.label)).map((node) => node.data.id),
  );
  const nodesById = new Map(cyDataNodes.map((node) => [node.data.id, node]));

  const nodeIds = Array.from(selectionScope.idsToSelect).filter((id) => {
    if (isIdBlacklisted(id)) {
      return false;
    }
    const node = nodesById.get(id);
    return Boolean(node) && !visibleSet.has(id);
  });

  const edges = cyDataEdges
    .filter((edge) => selectionScope.visibleEdgeIds.has(edge.data.id))
    .map((edge) => ({
      id: edge.data.id,
      source: edge.data.source,
      target: edge.data.target,
      label: edge.data.label,
    }));

  return { nodeIds, edges };
}
