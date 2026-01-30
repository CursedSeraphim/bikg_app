export interface CoordinatedSelections {
  selectedNodes: string[];
  selectedTypes: string[];
  selectedViolations: string[];
  selectedViolationExemplars: string[];
}

const unique = (values: string[]) => Array.from(new Set(values));

export function deriveSelectionsFromViolations(
  selectedViolations: string[],
  violationMap: Record<string, { nodes: string[] }>,
  focusNodeMap: Record<string, { types: string[]; exemplars: string[]; violations: string[] }>,
): CoordinatedSelections {
  const selectedViolationSet = new Set<string>();
  const selectedNodeSet = new Set<string>();
  const selectedTypeSet = new Set<string>();
  const selectedExemplarSet = new Set<string>();

  const addValues = (target: Set<string>, values?: string[]) => {
    if (!values) return;
    values.forEach((value) => {
      if (value) {
        target.add(value);
      }
    });
  };

  selectedViolations.forEach((violation) => {
    if (!violation) return;
    selectedViolationSet.add(violation);
    const entry = violationMap[violation];
    addValues(selectedNodeSet, entry?.nodes);
  });

  selectedNodeSet.forEach((node) => {
    const entry = focusNodeMap[node];
    if (!entry) return;
    addValues(selectedTypeSet, entry.types);
    addValues(selectedExemplarSet, entry.exemplars);
    addValues(selectedViolationSet, entry.violations);
  });

  return {
    selectedNodes: Array.from(selectedNodeSet),
    selectedTypes: Array.from(selectedTypeSet),
    selectedViolations: Array.from(selectedViolationSet),
    selectedViolationExemplars: Array.from(selectedExemplarSet),
  };
}

export function deriveSelectionsFromTypes(
  selectedTypes: string[],
  typeMap: Record<string, { nodes: string[]; violations: string[]; exemplars: string[] }>,
): CoordinatedSelections {
  let newSelectedNodes: string[] = [];
  let newSelectedViolations: string[] = [];
  let newSelectedViolationExemplars: string[] = [];

  selectedTypes.forEach((type) => {
    const entry = typeMap[type];
    if (!entry) return;
    newSelectedNodes = [...newSelectedNodes, ...entry.nodes];
    newSelectedViolations = [...newSelectedViolations, ...entry.violations];
    newSelectedViolationExemplars = [...newSelectedViolationExemplars, ...entry.exemplars];
  });

  return {
    selectedNodes: unique(newSelectedNodes),
    selectedTypes,
    selectedViolations: unique(newSelectedViolations),
    selectedViolationExemplars: unique(newSelectedViolationExemplars),
  };
}

export function deriveSelectionsFromExemplars(
  selectedExemplars: string[],
  exemplarMap: Record<string, { nodes: string[] }>,
  focusNodeMap: Record<string, { types: string[]; exemplars: string[]; violations: string[] }>,
): CoordinatedSelections {
  let newSelectedExemplars = [...selectedExemplars];
  let newSelectedNodes: string[] = [];
  let newSelectedTypes: string[] = [];
  let newSelectedViolations: string[] = [];

  newSelectedExemplars.forEach((exemplar) => {
    const entry = exemplarMap[exemplar];
    if (entry) {
      newSelectedNodes = [...newSelectedNodes, ...entry.nodes];
    }
  });

  newSelectedNodes.forEach((node) => {
    const entry = focusNodeMap[node];
    if (!entry) return;
    newSelectedTypes = [...newSelectedTypes, ...entry.types];
    newSelectedViolations = [...newSelectedViolations, ...entry.violations];
    newSelectedExemplars = [...newSelectedExemplars, ...entry.exemplars];
  });

  return {
    selectedNodes: unique(newSelectedNodes),
    selectedTypes: unique(newSelectedTypes),
    selectedViolations: unique(newSelectedViolations),
    selectedViolationExemplars: unique(newSelectedExemplars),
  };
}

export function deriveSelectionsFromFocusNodes(
  selectedNodes: string[],
  focusNodeMap: Record<string, { types: string[]; exemplars: string[]; violations: string[] }>,
): CoordinatedSelections {
  let newSelectedTypes: string[] = [];
  let newSelectedViolations: string[] = [];
  let newSelectedViolationExemplars: string[] = [];

  selectedNodes.forEach((node) => {
    const entry = focusNodeMap[node];
    if (!entry) return;
    newSelectedTypes = [...newSelectedTypes, ...entry.types];
    newSelectedViolations = [...newSelectedViolations, ...entry.violations];
    newSelectedViolationExemplars = [...newSelectedViolationExemplars, ...entry.exemplars];
  });

  return {
    selectedNodes,
    selectedTypes: unique(newSelectedTypes),
    selectedViolations: unique(newSelectedViolations),
    selectedViolationExemplars: unique(newSelectedViolationExemplars),
  };
}
