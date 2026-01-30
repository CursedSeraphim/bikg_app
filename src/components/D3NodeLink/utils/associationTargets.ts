import { IExemplarMap, IFocusNodeMap, ITypeMap, IViolationMap } from '../../../types';
import { getFocusNodesForNodeShape, isNodeShapeClass, NodeShapeViolationMap } from './nodeShapeAssociations';

export interface AssociationTargetInput {
  nodeId: string;
  focusNodeMap: IFocusNodeMap;
  typeMap: ITypeMap;
  violationMap: IViolationMap;
  exemplarMap: IExemplarMap;
  violationTypesMap: Record<string, string[]>;
  typesViolationMap: Record<string, string[]>;
  nodeShapeViolationMap?: NodeShapeViolationMap;
  cyDataNodes: Array<{ data: { id: string; visible: boolean; label?: string; isAClass?: string | null } }>;
  cyDataEdges: Array<{ data: { id: string; source: string; target: string; label?: string } }>;
  hiddenNodes: Set<string>;
  hiddenEdges: Set<string>;
  isLabelBlacklisted: (label?: string) => boolean;
  isIdBlacklisted: (id: string) => boolean;
}

export interface AssociationTargetResult {
  nodeIds: string[];
  allIds: string[];
  edges: { id: string; source: string; target: string; label?: string }[];
}

export function computeAssociationTargets({
  nodeId,
  focusNodeMap,
  typeMap,
  violationMap,
  exemplarMap,
  violationTypesMap,
  typesViolationMap,
  nodeShapeViolationMap,
  cyDataNodes,
  cyDataEdges,
  hiddenNodes,
  hiddenEdges,
  isLabelBlacklisted,
  isIdBlacklisted,
}: AssociationTargetInput): AssociationTargetResult {
  const assoc = new Set<string>();

  if (focusNodeMap[nodeId]) {
    focusNodeMap[nodeId].types.forEach((t: string) => assoc.add(t));
    focusNodeMap[nodeId].violations.forEach((v: string) => assoc.add(v));
    focusNodeMap[nodeId].exemplars.forEach((e: string) => assoc.add(e));
  }

  if (typeMap[nodeId]) {
    typeMap[nodeId].nodes.forEach((n: string) => assoc.add(n));
    typeMap[nodeId].violations.forEach((v: string) => assoc.add(v));
    typeMap[nodeId].exemplars.forEach((e: string) => assoc.add(e));
    const extra = typesViolationMap[nodeId] || [];
    extra.forEach((n: string) => assoc.add(n));
  }

  if (violationMap[nodeId]) {
    violationMap[nodeId].nodes.forEach((n: string) => assoc.add(n));
    violationMap[nodeId].types.forEach((t: string) => assoc.add(t));
    violationMap[nodeId].exemplars.forEach((e: string) => assoc.add(e));
  }

  const nodeMetadata = cyDataNodes.find((node) => node.data.id === nodeId);
  if (nodeMetadata && isNodeShapeClass(nodeMetadata.data.isAClass)) {
    const { violationIds, focusNodeIds } = getFocusNodesForNodeShape(nodeId, nodeShapeViolationMap ?? {}, violationMap);
    violationIds.forEach((violationId) => {
      assoc.add(violationId);
      violationMap[violationId]?.types?.forEach((t: string) => assoc.add(t));
      violationMap[violationId]?.exemplars?.forEach((e: string) => assoc.add(e));
    });
    focusNodeIds.forEach((focusId) => assoc.add(focusId));
  }

  if (exemplarMap[nodeId]) {
    exemplarMap[nodeId].nodes.forEach((n: string) => assoc.add(n));
    exemplarMap[nodeId].types.forEach((t: string) => assoc.add(t));
    exemplarMap[nodeId].violations.forEach((v: string) => assoc.add(v));
  }

  if (violationTypesMap[nodeId]) {
    violationTypesMap[nodeId].forEach((n: string) => assoc.add(n));
  }

  const allIds = new Set<string>([nodeId, ...Array.from(assoc)]);

  // Only treat as visible if not blacklisted as well
  const visibleSet = new Set(
    cyDataNodes.filter((n) => n.data.visible && !hiddenNodes.has(n.data.id) && !isLabelBlacklisted(n.data.label)).map((n) => n.data.id),
  );

  const nodeIds: string[] = [];
  allIds.forEach((nid) => {
    if (isIdBlacklisted(nid)) return;
    const nodeData = cyDataNodes.find((n) => n.data.id === nid);
    if (nodeData && !visibleSet.has(nid)) {
      nodeIds.push(nid);
    }
  });

  const edges: { id: string; source: string; target: string; label?: string }[] = [];
  const added = new Set<string>();

  cyDataEdges.forEach((edge) => {
    const { source, target } = edge.data;
    if (isIdBlacklisted(source) || isIdBlacklisted(target)) return;

    const sourceIn = allIds.has(source);
    const targetIn = allIds.has(target);
    const sourceVisible = visibleSet.has(source);
    const targetVisible = visibleSet.has(target);

    if (
      (sourceIn && targetIn) ||
      (sourceIn && targetVisible) ||
      (targetIn && sourceVisible) ||
      (hiddenEdges.has(edge.data.id) && (sourceIn || targetIn))
    ) {
      const sourceExists = cyDataNodes.some((n) => n.data.id === source);
      const targetExists = cyDataNodes.some((n) => n.data.id === target);
      if (sourceExists && targetExists) {
        const key = `${source}->${target}`;
        if (!added.has(key)) {
          added.add(key);
          edges.push({ id: edge.data.id, source, target, label: edge.data.label });
        }
      }
    }
  });

  return { nodeIds, allIds: Array.from(allIds), edges };
}
