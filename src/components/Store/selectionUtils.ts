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
  let newSelectedViolations = [...selectedViolations];
  let newSelectedNodes: string[] = [];
  let newSelectedTypes: string[] = [];
  let newSelectedViolationExemplars: string[] = [];

  newSelectedViolations.forEach((violation) => {
    const entry = violationMap[violation];
    if (entry) {
      newSelectedNodes = [...newSelectedNodes, ...entry.nodes];
    }
  });

  newSelectedNodes.forEach((node) => {
    const entry = focusNodeMap[node];
    if (!entry) return;
    newSelectedTypes = [...newSelectedTypes, ...entry.types];
    newSelectedViolationExemplars = [...newSelectedViolationExemplars, ...entry.exemplars];
    newSelectedViolations = [...newSelectedViolations, ...entry.violations];
  });

  return {
    selectedNodes: unique(newSelectedNodes),
    selectedTypes: unique(newSelectedTypes),
    selectedViolations: unique(newSelectedViolations),
    selectedViolationExemplars: unique(newSelectedViolationExemplars),
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
