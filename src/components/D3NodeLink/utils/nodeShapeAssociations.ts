export const NODE_SHAPE_CLASS = 'sh:NodeShape';

export function isNodeShapeClass(value?: string | null): boolean {
  return value === NODE_SHAPE_CLASS;
}

export function getViolationIdsForNodeShape(nodeShapeId: string, violationTypesMap: Record<string, string[]>): string[] {
  const violationIds = new Set<string>();
  Object.entries(violationTypesMap).forEach(([violationId, relatedIds]) => {
    if (relatedIds?.includes(nodeShapeId)) {
      violationIds.add(violationId);
    }
  });
  return Array.from(violationIds);
}

export function getFocusNodesForNodeShape(
  nodeShapeId: string,
  violationTypesMap: Record<string, string[]>,
  violationMap: Record<string, { nodes: string[] }>,
): { violationIds: string[]; focusNodeIds: string[] } {
  const violationIds = getViolationIdsForNodeShape(nodeShapeId, violationTypesMap);
  const focusNodeIds = new Set<string>();

  violationIds.forEach((violationId) => {
    const entry = violationMap[violationId];
    entry?.nodes?.forEach((nodeId) => focusNodeIds.add(nodeId));
  });

  return { violationIds, focusNodeIds: Array.from(focusNodeIds) };
}
