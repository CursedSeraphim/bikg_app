export interface SelectionScopeInput {
  selectedFocusNodes: string[];
  selectedTypeIds: string[];
  selectedViolationIds: string[];
  selectedExemplarIds: string[];
  focusNodeMap: Record<string, any>;
  typeMap: Record<string, any>;
  violationMap: Record<string, any>;
  exemplarMap: Record<string, any>;
  violationTypesMap: Record<string, string[]>;
  typesViolationMap: Record<string, string[]>;
  cyDataEdges: Array<{ data: { id: string; source: string; target: string } }>;
}

export interface SelectionScopeResult {
  idsToSelect: Set<string>;
  visibleEdgeIds: Set<string>;
}

export function computeSelectionScope({
  selectedFocusNodes,
  selectedTypeIds,
  selectedViolationIds,
  selectedExemplarIds,
  focusNodeMap,
  typeMap,
  violationMap,
  exemplarMap,
  violationTypesMap,
  typesViolationMap,
  cyDataEdges,
}: SelectionScopeInput): SelectionScopeResult {
  const idsToSelect = new Set<string>();
  const addIds = (values?: Iterable<string>) => {
    if (!values) return;
    for (const value of values) {
      if (value) {
        idsToSelect.add(value);
      }
    }
  };

  addIds(selectedFocusNodes);
  addIds(selectedTypeIds);
  addIds(selectedViolationIds);
  addIds(selectedExemplarIds);

  selectedFocusNodes.forEach((focusId) => {
    const entry = focusNodeMap[focusId];
    if (!entry) return;
    addIds(entry.types);
    addIds(entry.violations);
    addIds(entry.exemplars);
  });

  selectedTypeIds.forEach((typeId) => {
    const entry = typeMap[typeId];
    if (entry) {
      addIds(entry.nodes);
      addIds(entry.violations);
      addIds(entry.exemplars);
    }
    addIds(typesViolationMap[typeId]);
  });

  selectedViolationIds.forEach((violationId) => {
    const entry = violationMap[violationId];
    if (entry) {
      addIds(entry.nodes);
      addIds(entry.types);
      addIds(entry.exemplars);
    }
    addIds(violationTypesMap[violationId]);
  });

  selectedExemplarIds.forEach((exemplarId) => {
    const entry = exemplarMap[exemplarId];
    if (!entry) return;
    addIds(entry.nodes);
    addIds(entry.types);
    addIds(entry.violations);
  });

  const visibleEdgeIds = new Set<string>();
  cyDataEdges.forEach((edge) => {
    const sourceId = edge.data.source;
    const targetId = edge.data.target;
    if (idsToSelect.has(sourceId) && idsToSelect.has(targetId)) {
      visibleEdgeIds.add(edge.data.id);
    }
  });

  return { idsToSelect, visibleEdgeIds };
}
