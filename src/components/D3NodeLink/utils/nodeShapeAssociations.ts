export const NODE_SHAPE_CLASS = 'sh:NodeShape';

export function isNodeShapeClass(value?: string | null): boolean {
  return value === NODE_SHAPE_CLASS;
}

export type NodeShapeViolationMap = Record<string, string[]>;

export function buildNodeShapeViolationMap(violationTypesMap: Record<string, string[]>): NodeShapeViolationMap {
  const nodeShapeViolationMap: NodeShapeViolationMap = {};
  Object.entries(violationTypesMap).forEach(([violationId, relatedIds]) => {
    relatedIds?.forEach((relatedId) => {
      if (!nodeShapeViolationMap[relatedId]) {
        nodeShapeViolationMap[relatedId] = [];
      }
      nodeShapeViolationMap[relatedId].push(violationId);
    });
  });
  return nodeShapeViolationMap;
}

export function getViolationIdsForNodeShape(nodeShapeId: string, nodeShapeViolationMap: NodeShapeViolationMap): string[] {
  return nodeShapeViolationMap[nodeShapeId] ?? [];
}

export function getFocusNodesForNodeShape(
  nodeShapeId: string,
  nodeShapeViolationMap: NodeShapeViolationMap,
  violationMap: Record<string, { nodes: string[] }>,
): { violationIds: string[]; focusNodeIds: string[] } {
  const violationIds = getViolationIdsForNodeShape(nodeShapeId, nodeShapeViolationMap);
  const focusNodeIds = new Set<string>();

  violationIds.forEach((violationId) => {
    const entry = violationMap[violationId];
    entry?.nodes?.forEach((nodeId) => focusNodeIds.add(nodeId));
  });

  return { violationIds, focusNodeIds: Array.from(focusNodeIds) };
}
