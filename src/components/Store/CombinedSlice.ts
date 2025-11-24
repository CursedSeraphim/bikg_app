// src/store/slices/combined.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as N3 from 'n3';
import { NamedNode, Store } from 'n3';
import { createSelector } from 'reselect';

import { CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING, CSV_EDGE_NOT_IN_ONTOLOGY_STRING } from '../../constants';
import {
  D3BoundingBoxSetting,
  EdgeCountDict,
  ExemplarFocusNodeDict,
  FilterType,
  FocusNodeExemplarDict,
  ICombinedState,
  ICsvData,
  IExemplarMap,
  IFocusNodeMap,
  INamespaces,
  INumberViolationsPerNodeMap,
  INumberViolationsPerNodeValue,
  IRdfState,
  IServerTreeNode,
  ITriple,
  ITypeMap,
  IViolationMap,
  MissingEdgeOptionType,
  ServerTree,
} from '../../types';
import { calculateObjectProperties, processTriples, selectAllTriples } from '../../utils/rdf/rdfGraphHelpers';
import { dataToScatterDataArray } from '../EmbeddingView/csvToScatterData';

function loadMissingEdgeLabel(): string {
  try {
    const stored = localStorage.getItem('missingEdgeLabel');
    return stored !== null ? stored : CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING;
  } catch {
    return CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING;
  }
}

// Safely load any previously stored labels
function loadFromLocalStorage(): string[] {
  try {
    const stored = localStorage.getItem('blacklistedLabels');
    return stored ? JSON.parse(stored) : [];
  } catch {
    // If parsing fails, fall back to an empty array
    return [];
  }
}

function loadHiddenLineupColumns(): string[] {
  try {
    const stored = localStorage.getItem('hiddenLineupColumns');
    return stored ? JSON.parse(stored) : ['x', 'y'];
  } catch {
    return ['x', 'y'];
  }
}

function loadHideNamespacePrefixColumns(): boolean {
  try {
    const stored = localStorage.getItem('hideNamespacePrefixColumns');
    return stored ? JSON.parse(stored) : false;
  } catch {
    return false;
  }
}

function loadHideNamespacePrefixCells(): boolean {
  try {
    const stored = localStorage.getItem('hideNamespacePrefixCells');
    return stored ? JSON.parse(stored) : false;
  } catch {
    return false;
  }
}

const initialState: ICombinedState = {
  cumulativeNumberViolationsPerNode: {},
  samples: [],
  originalSamples: [],
  originalInstanceData: '',
  originalViolationReport: '',
  selectedNodes: [],
  selectedTypes: [],
  selectedViolations: [],
  rdfString: '',
  violations: [],
  violationTypesMap: {},
  typesViolationMap: {},
  filterType: 'none',
  d3BoundingBox: 'off',
  missingEdgeOption: 'keep',
  missingEdgeLabel: loadMissingEdgeLabel(),
  edgeCountDict: {},
  focusNodeExemplarDict: {},
  exemplarFocusNodeDict: {},
  selectedViolationExemplars: [],
  namespaces: {},
  types: [],
  subClassOfTriples: [],
  numberViolationsPerNode: {},
  focusNodeSampleMap: {},
  violationMap: {},
  focusNodeMap: {},
  typeMap: {},
  exemplarMap: {},
  ontologyTree: null,
  hiddenLabels: loadFromLocalStorage(),
  hiddenLineupColumns: loadHiddenLineupColumns(),
  nodeLabels: [],
  edgeLabels: [],
  hideNamespacePrefixColumns: loadHideNamespacePrefixColumns(),
  hideNamespacePrefixCells: loadHideNamespacePrefixCells(),
};

export function createMaps(
  samples: ICsvData[],
  violations: string[],
  types: string[],
  focusNodeExemplarDict: Record<string, string[]>,
  exemplarFocusNodeDict: Record<string, string[]>,
): { violationMap: IViolationMap; typeMap: ITypeMap; exemplarMap: IExemplarMap; focusNodeMap: IFocusNodeMap } {
  // Create an empty map using a different structure to accommodate Sets for de-duplication
  const tempViolationMap: { [key: string]: { focusNodes: Set<string>; types: Set<string>; exemplars: Set<string> } } = {};
  const tempTypeMap: { [key: string]: { focusNodes: Set<string>; violations: Set<string>; exemplars: Set<string> } } = {};
  const tempExemplarMap: { [key: string]: { focusNodes: Set<string>; types: Set<string>; violations: Set<string> } } = {};
  const tempFocusNodeMap: { [key: string]: { types: Set<string>; violations: Set<string>; exemplars: Set<string> } } = {};

  // TODO transcriptomicsstudy exists in the csv instance data but is not initialized in types because it is not in the ontology?

  // Initialize the tempViolationMap with empty Sets
  violations.forEach((violation) => {
    tempViolationMap[violation] = { focusNodes: new Set(), types: new Set(), exemplars: new Set() };
  });

  // Initialize the tempTypeMap with empty Sets
  types.forEach((type) => {
    tempTypeMap[type] = { focusNodes: new Set(), violations: new Set(), exemplars: new Set() };
  });

  // Initialize the tempExemplarMap with empty Sets
  Object.keys(exemplarFocusNodeDict).forEach((exemplar) => {
    tempExemplarMap[exemplar] = { focusNodes: new Set(), types: new Set(), violations: new Set() };
  });

  // Initialize the tempFocusNodeMap with empty Sets
  Object.keys(focusNodeExemplarDict).forEach((focusNode) => {
    tempFocusNodeMap[focusNode] = { types: new Set(), violations: new Set(), exemplars: new Set() };
  });

  // Iterate through samples to populate the maps
  samples.forEach((sample) => {
    // Ensure sampleTypes is treated as an array, even if it's a single value
    // Check if sample['rdf:type'] is a string that represents an array
    // TODO this might not have to be checked if we first parse the csv as json
    let sampleTypes;
    if (typeof sample['rdf:type'] === 'string' && sample['rdf:type'].startsWith('[') && sample['rdf:type'].endsWith(']')) {
      try {
        // Attempt to parse the string as an array
        sampleTypes = JSON.parse(sample['rdf:type'].replace(/'/g, '"'));
      } catch (error) {
        // Fallback if parsing fails - treat it as a single-element array
        sampleTypes = [sample['rdf:type']];
      }
    } else {
      // Handle as before if it's not a string representation of an array
      sampleTypes = Array.isArray(sample['rdf:type']) ? sample['rdf:type'].map(String) : [String(sample['rdf:type'])];
    }
    const focusNode = sample.focus_node;
    const exemplars = focusNodeExemplarDict[focusNode] || [];

    sampleTypes.forEach((type) => {
      // Iterate over each type in sampleTypes
      // There might be types in the instance data that do not appear in the ontology
      // console.log('type from sampleTypes', type);
      if (!tempTypeMap[type]) {
        tempTypeMap[type] = { focusNodes: new Set(), violations: new Set(), exemplars: new Set() };
      }
      tempTypeMap[type].focusNodes.add(focusNode);
      exemplars.forEach((exemplar) => tempTypeMap[type].exemplars.add(exemplar));

      // Since a focus node can belong to multiple types, add all types to it
      tempFocusNodeMap[focusNode].types.add(type);
      exemplars.forEach((exemplar) => tempFocusNodeMap[focusNode].exemplars.add(exemplar));

      exemplars.forEach((exemplar) => {
        tempExemplarMap[exemplar].focusNodes.add(focusNode);
        tempExemplarMap[exemplar].types.add(type);
      });
    });

    // Handle violations
    violations.forEach((violation) => {
      if ((sample[violation] as number) > 0) {
        sampleTypes.forEach((type) => {
          // Apply violation logic for each type in sampleTypes
          tempTypeMap[type].violations.add(violation);
        });

        tempFocusNodeMap[focusNode].violations.add(violation);

        exemplars.forEach((exemplar) => tempExemplarMap[exemplar].violations.add(violation));

        // Add to the focus node list for each violation
        tempViolationMap[violation].focusNodes.add(sample.focus_node);

        // Add to the type list for each violation and type in sampleTypes
        sampleTypes.forEach((type) => {
          tempViolationMap[violation].types.add(type);
        });

        // Add to the exemplar list using FocusNodeExemplarDict for each violation
        exemplars.forEach((exemplar) => tempViolationMap[violation].exemplars.add(exemplar));
      }
    });
  });

  // Convert to correct data structures using Arrays from Sets
  const violationMap: IViolationMap = {};
  Object.keys(tempViolationMap).forEach((key) => {
    violationMap[key] = {
      nodes: Array.from(tempViolationMap[key].focusNodes),
      types: Array.from(tempViolationMap[key].types),
      exemplars: Array.from(tempViolationMap[key].exemplars),
    };
  });

  const typeMap: ITypeMap = {};
  Object.keys(tempTypeMap).forEach((key) => {
    typeMap[key] = {
      nodes: Array.from(tempTypeMap[key].focusNodes),
      violations: Array.from(tempTypeMap[key].violations),
      exemplars: Array.from(tempTypeMap[key].exemplars),
    };
  });

  const exemplarMap: IExemplarMap = {};
  Object.keys(tempExemplarMap).forEach((key) => {
    exemplarMap[key] = {
      nodes: Array.from(tempExemplarMap[key].focusNodes),
      types: Array.from(tempExemplarMap[key].types),
      violations: Array.from(tempExemplarMap[key].violations),
    };
  });

  const focusNodeMap: IFocusNodeMap = {};
  Object.keys(tempFocusNodeMap).forEach((key) => {
    focusNodeMap[key] = {
      types: Array.from(tempFocusNodeMap[key].types),
      violations: Array.from(tempFocusNodeMap[key].violations),
      exemplars: Array.from(tempFocusNodeMap[key].exemplars),
    };
  });

  return { violationMap, typeMap, exemplarMap, focusNodeMap };
}

const removeNanEdges = (data: ICsvData[]): ICsvData[] => {
  return data.map((sample: ICsvData): ICsvData => {
    const { Id, ...rest } = sample;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const filteredEntries = Object.entries(rest).filter(([key, value]) => value !== CSV_EDGE_NOT_IN_ONTOLOGY_STRING);

    return { Id, ...Object.fromEntries(filteredEntries) };
  });
};

const renameMissingEdges = (data: ICsvData[], label: string): ICsvData[] => {
  return data.map((sample: ICsvData): ICsvData => {
    const { Id, ...rest } = sample;
    const modifiedEntries = Object.entries(rest).map(([key, value]) => [key, value === CSV_EDGE_NOT_IN_ONTOLOGY_STRING ? label : value]);
    return { Id, ...Object.fromEntries(modifiedEntries) };
  });
};

// const renameNanEdges = (data: ICsvData[]): ICsvData[] => {
//   return data.map((sample: ICsvData): ICsvData => {
//     const { Id, ...rest } = sample;
//     // const filteredEntries = Object.entries(rest).filter(([key, value]) => value !== CSV_EDGE_NOT_IN_ONTOLOGY_STRING);

//     // return { Id, ...Object.fromEntries(filteredEntries) };

//     const modifiedEntries = Object.entries(rest).map(([key, value]) => [
//       key,
//       value === CSV_EDGE_NOT_IN_ONTOLOGY_STRING ? CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING : value,
//     ]);

//     return { Id, ...Object.fromEntries(modifiedEntries) };
//   });
// };

const updateSelectedViolations = (state, valueCounts) => {
  const selectedViolations = new Set();

  state.violations.forEach((violation) => {
    const violationValues = valueCounts[violation];
    if (violationValues) {
      for (const key in violationValues) {
        if (key !== '0.0') {
          selectedViolations.add(violation);
          break; // Exit the loop as soon as a non-zero value is found
        }
      }
    }
  });

  state.selectedViolations = Array.from(selectedViolations) as string[];
};

// Helper function to update selected types
const updateSelectedTypes = (state, valueCounts) => {
  const typeCounts = valueCounts['rdf:type'];
  state.selectedTypes = Object.entries(typeCounts)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([category, count]) => (count as number) > 1)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(([category, count]) => category);
};

// Helper function to update selected violation exemplars
const updateSelectedViolationExemplars = (state) => {
  const selectedViolationExemplarsSet = new Set();
  state.selectedNodes.forEach((node) => {
    const exemplars = state.focusNodeExemplarDict[node] || [];
    exemplars.forEach((exemplar) => selectedViolationExemplarsSet.add(exemplar));
  });
  state.selectedViolationExemplars = Array.from(selectedViolationExemplarsSet);
};

export function constructViolationsPerNodeValueObject(): INumberViolationsPerNodeValue {
  return {
    violations: 0,
    selected: 0,
    cumulativeViolations: 0,
    cumulativeSelected: 0,
  };
}

/**
 * Helper function to increment the value for a given key in a map.
 * Initializes the key with 0 if it's not already in the map.
 */
const incrementMapValue = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) || 0) + 1);
};

function resetCounts(numberViolationsPerNode: INumberViolationsPerNodeMap, selectionMaps: Map<string, number>[]): void {
  Object.keys(numberViolationsPerNode).forEach((key) => {
    const isSelected = selectionMaps.some((m) => m.has(key));
    if (!isSelected) {
      // eslint-disable-next-line no-param-reassign
      numberViolationsPerNode[key].cumulativeSelected = 0;
      // eslint-disable-next-line no-param-reassign
      numberViolationsPerNode[key].selected = 0;
    }
  });
}

/**
 * Main function to calculate new number of violations per node.
 */
function calculateNewNumberViolationsPerNode(
  newSelectedNodes: string[],
  focusNodeMap: IFocusNodeMap,
  numberViolationsPerNode: INumberViolationsPerNodeMap,
  ontologyTree: IServerTreeNode,
  knownTypes: Set<string>,
) {
  const newSelectedTypesMap = new Map<string, number>();
  const newSelectedViolationsMap = new Map<string, number>();
  const newSelectedExemplarsMap = new Map<string, number>();

  const selectedNodeSets = new Map<string, Set<string>>();

  const addToSet = (map: Map<string, Set<string>>, key: string, value: string) => {
    if (!map.has(key)) {
      map.set(key, new Set<string>());
    }
    map.get(key)?.add(value);
  };

  newSelectedNodes.forEach((node) => {
    const { types, violations, exemplars } = focusNodeMap[node];
    types.forEach((type: string) => {
      incrementMapValue(newSelectedTypesMap, type);
      addToSet(selectedNodeSets, type, node);
    });
    violations.forEach((violation: string) => {
      incrementMapValue(newSelectedViolationsMap, violation);
      addToSet(selectedNodeSets, violation, node);
    });
    exemplars.forEach((exemplar: string) => {
      incrementMapValue(newSelectedExemplarsMap, exemplar);
      addToSet(selectedNodeSets, exemplar, node);
    });
  });

  // Update selected counts based on unique node sets
  selectedNodeSets.forEach((set, key) => {
    if (Object.hasOwnProperty.call(numberViolationsPerNode, key)) {
      // eslint-disable-next-line no-param-reassign
      numberViolationsPerNode[key].selected = set.size;
      // eslint-disable-next-line no-param-reassign
      numberViolationsPerNode[key].cumulativeSelected = set.size;
    }
  });

  resetCounts(numberViolationsPerNode, [newSelectedTypesMap, newSelectedViolationsMap, newSelectedExemplarsMap]);

  const accumulateSets = (node: IServerTreeNode): Set<string> => {
    const currentSet = new Set<string>(selectedNodeSets.get(node.id) ?? []);
    node.children.forEach((child) => {
      const childSet = accumulateSets(child);
      childSet.forEach((fn) => currentSet.add(fn));
    });
    if (knownTypes.has(node.id) && numberViolationsPerNode[node.id]) {
      // eslint-disable-next-line no-param-reassign
      numberViolationsPerNode[node.id].cumulativeSelected = currentSet.size;
    }
    return currentSet;
  };

  accumulateSets(ontologyTree);

  return numberViolationsPerNode;
}

enum ActionTypes {
  OVERWRITE = 'overwrite',
  APPEND = 'append',
  REMOVE = 'remove',
}

const initializeViolationCount = (violations: string[], initialValue = 0): Record<string, number> => {
  return violations.reduce((acc, v) => ({ ...acc, [v]: initialValue }), {});
};

// Function to update the count of violations based on action type
const updateViolationCount = (sample, violationCount, actionType) => {
  for (const key in violationCount) {
    if (sample[key]) {
      const increment = actionType === ActionTypes.REMOVE ? -1 : 1;
      // eslint-disable-next-line no-param-reassign
      violationCount[key] += increment;
    }
  }
};

const calculateNewSelectedViolations = (newViolationCount: Record<string, number>): string[] => {
  return (
    Object.entries(newViolationCount)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([key_, value]) => value > 0)
      .map(([key]) => key)
  );
};

// Helper function to ensure the input is treated as an array
function ensureArray<T>(input: T | T[]): T[] {
  return Array.isArray(input) ? input : [input];
}

// Function to calculate new selected nodes and violations
const calculateSelectedNodesAndViolations = (selectedTypes, violations, samples, actionType, selectedNodes = []) => {
  const newSelectedNodes = actionType === ActionTypes.APPEND ? [...selectedNodes] : [];
  const newViolationCount = initializeViolationCount(violations);

  samples.forEach((sample) => {
    const sampleTypes = ensureArray(sample['rdf:type']);

    if (sampleTypes.some((type) => selectedTypes.includes(String(type)))) {
      newSelectedNodes.push(sample.focus_node);
      updateViolationCount(sample, newViolationCount, actionType);
    }
  });

  return { newSelectedNodes, newViolationCount };
};

function updateFocusNodeSampleMap(state) {
  state.samples.forEach((sample) => {
    state.focusNodeSampleMap[sample.focus_node] = sample;
  });
}

// TODO set types of payloadaction for all reducers
const combinedSlice = createSlice({
  name: 'combined',
  initialState,
  reducers: {
    clearAllSelections(state) {
      state.selectedNodes = [];
      state.selectedTypes = [];
      state.selectedViolations = [];
      state.selectedViolationExemplars = [];
    },
    addHiddenLabels: (state, action: PayloadAction<string[]>) => {
      const deduplicated = Array.from(new Set([...state.hiddenLabels, ...action.payload]));
      state.hiddenLabels = deduplicated.sort();
      localStorage.setItem('blacklistedLabels', JSON.stringify(state.hiddenLabels));
    },
    removeHiddenLabels: (state, action: PayloadAction<string[]>) => {
      state.hiddenLabels = state.hiddenLabels.filter((label) => !action.payload.includes(label));
      localStorage.setItem('blacklistedLabels', JSON.stringify(state.hiddenLabels));
    },
    clearHiddenLabels: (state) => {
      state.hiddenLabels = [];
      localStorage.setItem('blacklistedLabels', JSON.stringify([]));
    },
    addHiddenLineupColumns: (state, action: PayloadAction<string[]>) => {
      const deduplicated = Array.from(new Set([...state.hiddenLineupColumns, ...action.payload]));
      state.hiddenLineupColumns = deduplicated;
      localStorage.setItem('hiddenLineupColumns', JSON.stringify(state.hiddenLineupColumns));
    },
    removeHiddenLineupColumns: (state, action: PayloadAction<string[]>) => {
      state.hiddenLineupColumns = state.hiddenLineupColumns.filter((label) => !action.payload.includes(label));
      localStorage.setItem('hiddenLineupColumns', JSON.stringify(state.hiddenLineupColumns));
    },
    clearHiddenLineupColumns: (state) => {
      state.hiddenLineupColumns = [];
      localStorage.setItem('hiddenLineupColumns', JSON.stringify([]));
    },
    setHideNamespacePrefixColumns: (state, action: PayloadAction<boolean>) => {
      state.hideNamespacePrefixColumns = action.payload;
      localStorage.setItem('hideNamespacePrefixColumns', JSON.stringify(action.payload));
    },
    setHideNamespacePrefixCells: (state, action: PayloadAction<boolean>) => {
      state.hideNamespacePrefixCells = action.payload;
      localStorage.setItem('hideNamespacePrefixCells', JSON.stringify(action.payload));
    },
    setCumulativeNumberViolationsPerNode: (state, action: PayloadAction<INumberViolationsPerNodeMap>) => {
      state.cumulativeNumberViolationsPerNode = action.payload;

      Object.keys(state.cumulativeNumberViolationsPerNode).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(state.numberViolationsPerNode, key)) {
          state.numberViolationsPerNode[key] = constructViolationsPerNodeValueObject();
        }
        state.numberViolationsPerNode[key].cumulativeViolations = state.cumulativeNumberViolationsPerNode[key].cumulativeViolations;
        state.numberViolationsPerNode[key].cumulativeSelected = state.cumulativeNumberViolationsPerNode[key].cumulativeSelected;
        state.numberViolationsPerNode[key].violations = state.cumulativeNumberViolationsPerNode[key].violations;
      });
    },
    setNodeLabels: (state, action: PayloadAction<string[]>) => {
      state.nodeLabels = action.payload;
    },
    setEdgeLabels: (state, action: PayloadAction<string[]>) => {
      state.edgeLabels = action.payload;
    },
    setOntologyTree: (state, action: PayloadAction<ServerTree>) => {
      state.ontologyTree = action.payload;
    },
    setViolationMap: (state, action: PayloadAction<IViolationMap>) => {
      state.violationMap = action.payload;
    },
    setTypeMap: (state, action: PayloadAction<ITypeMap>) => {
      state.typeMap = action.payload;
    },
    setExemplarMap: (state, action: PayloadAction<IExemplarMap>) => {
      state.exemplarMap = action.payload;
    },
    setFocusNodeMap: (state, action: PayloadAction<IFocusNodeMap>) => {
      state.focusNodeMap = action.payload;
    },
    setSubClassOfTriples: (state, action: PayloadAction<ITriple[]>) => {
      state.subClassOfTriples = action.payload;
    },
    setTypes: (state, action: PayloadAction<string[]>) => {
      state.types = action.payload;
    },
    setNamespaces: (state, action: PayloadAction<INamespaces>) => {
      state.namespaces = action.payload;
    },
    setSelectedViolationExemplars: (state, action: PayloadAction<string[]>) => {
      // uses exemplars to select all focus nodes with those exemplars
      // then uses nodes to select all types and violations of those nodes and their exemplars

      let newSelectedExemplars = action.payload;
      let newSelectedNodes = [];
      let newSelectedTypes = [];
      let newSelectedViolations = [];

      newSelectedExemplars.forEach((exemplar) => {
        newSelectedNodes = [...newSelectedNodes, ...state.exemplarMap[exemplar].nodes];
      });

      newSelectedNodes.forEach((node) => {
        newSelectedTypes = [...newSelectedTypes, ...state.focusNodeMap[node].types];
        newSelectedViolations = [...newSelectedViolations, ...state.focusNodeMap[node].violations];
        newSelectedExemplars = [...newSelectedExemplars, ...state.focusNodeMap[node].exemplars];
      });

      // Remove duplicates by converting to a Set and then back to an array
      newSelectedNodes = [...new Set(newSelectedNodes)];
      newSelectedTypes = [...new Set(newSelectedTypes)];
      newSelectedViolations = [...new Set(newSelectedViolations)];
      newSelectedExemplars = [...new Set(newSelectedExemplars)];

      state.selectedNodes = newSelectedNodes;
      state.selectedTypes = newSelectedTypes;
      state.selectedViolations = newSelectedViolations;
      state.selectedViolationExemplars = newSelectedExemplars;

      const newNumberViolationsPerNode = calculateNewNumberViolationsPerNode(
        state.selectedNodes,
        state.focusNodeMap,
        state.numberViolationsPerNode,
        state.ontologyTree,
        new Set([...state.types, ...state.violations]),
      );
      state.numberViolationsPerNode = newNumberViolationsPerNode;
    },
    setEdgeCountDict: (state, action: PayloadAction<EdgeCountDict>) => {
      state.edgeCountDict = action.payload;
    },
    setFocusNodeExemplarDict: (state, action: PayloadAction<FocusNodeExemplarDict>) => {
      state.focusNodeExemplarDict = action.payload;
    },
    setExemplarFocusNodeDict: (state, action: PayloadAction<ExemplarFocusNodeDict>) => {
      state.exemplarFocusNodeDict = action.payload;
    },
    setMissingEdgeOption: (state, action: PayloadAction<MissingEdgeOptionType>) => {
      state.missingEdgeOption = action.payload;
      if (state.missingEdgeOption === 'remove') {
        state.samples = removeNanEdges(state.originalSamples);
      } else if (state.missingEdgeOption === 'keep') {
        state.samples = renameMissingEdges(state.originalSamples, state.missingEdgeLabel);
      }
      updateFocusNodeSampleMap(state);
    },
    setMissingEdgeLabel: (state, action: PayloadAction<string>) => {
      state.missingEdgeLabel = action.payload;
      localStorage.setItem('missingEdgeLabel', state.missingEdgeLabel);
      if (state.missingEdgeOption === 'keep') {
        state.samples = renameMissingEdges(state.originalSamples, state.missingEdgeLabel);
        updateFocusNodeSampleMap(state);
      }
    },
    setFilterType: (state, action: PayloadAction<FilterType>) => {
      state.filterType = action.payload;
    },
    setD3BoundingBox: (state, action: PayloadAction<D3BoundingBoxSetting>) => {
      state.d3BoundingBox = action.payload;
    },
    setViolationTypesMap: (state, action) => {
      state.violationTypesMap = action.payload;
    },
    setTypesViolationMap: (state, action) => {
      state.typesViolationMap = action.payload;
    },
    setViolations: (state, action) => {
      state.violations = JSON.parse(action.payload);
    },
    setCsvData: (state, action) => {
      state.originalSamples = action.payload;
      if (state.missingEdgeOption === 'remove') {
        state.samples = removeNanEdges(action.payload);
      } else if (state.missingEdgeOption === 'keep') {
        state.samples = renameMissingEdges(action.payload, state.missingEdgeLabel);
      }
      // const newTypes = [...state.types];
      // state.samples.forEach((sample) => {
      //   // if sample['rdf_type'] not in type push it to newTypes
      //   if (!newTypes.includes(sample['rdf:type'] as string)) {
      //     newTypes.push(sample['rdf:type'] as string);
      //   }
      // });
      // state.types = Object.values(newTypes);
      // console.log('state types after set csv data', state.types);
      updateFocusNodeSampleMap(state);
    },
    setSelectedFocusNodesUsingFeatureCategories: (state, action) => {
      const { selectedNodes, valueCounts } = action.payload;
      state.selectedNodes = selectedNodes;

      updateSelectedViolations(state, valueCounts);
      updateSelectedTypes(state, valueCounts);
      updateSelectedViolationExemplars(state);
      state.numberViolationsPerNode = calculateNewNumberViolationsPerNode(
        state.selectedNodes,
        state.focusNodeMap,
        state.numberViolationsPerNode,
        state.ontologyTree,
        new Set([...state.types, ...state.violations]),
      );
    },
    setSelectedFocusNodes: (state, action) => {
      const newSelectedNodes = action.payload;

      // Convert state.samples into an object for O(1) lookup
      const focusNodesSamplesMap = {};
      state.samples.forEach((sample) => {
        focusNodesSamplesMap[sample.focus_node] = sample;
      });

      // Initiate a violation map with 0 at each violation key
      const violationMap = new Map();
      state.violations.forEach((violation) => {
        violationMap.set(violation, 0);
      });

      // Use a Set to store selected types
      const selectedTypesSet = new Set();

      // Iterate over selected nodes
      newSelectedNodes.forEach((selectedNode) => {
        const correspondingSample = focusNodesSamplesMap[selectedNode];

        if (!correspondingSample) return; // if no corresponding sample is found, skip

        state.violations.forEach((violation) => {
          if (correspondingSample[violation]) {
            violationMap.set(violation, violationMap.get(violation) + 1);
          }
        });

        // Parse sample['rdf:type'] to correctly handle string representation of an array
        let sampleTypes;
        if (
          typeof correspondingSample['rdf:type'] === 'string' &&
          correspondingSample['rdf:type'].startsWith('[') &&
          correspondingSample['rdf:type'].endsWith(']')
        ) {
          try {
            // Attempt to parse the string as an array
            sampleTypes = JSON.parse(correspondingSample['rdf:type'].replace(/'/g, '"'));
          } catch (error) {
            // Fallback if parsing fails
            sampleTypes = [correspondingSample['rdf:type']];
          }
        } else {
          sampleTypes = Array.isArray(correspondingSample['rdf:type']) ? correspondingSample['rdf:type'] : [correspondingSample['rdf:type']];
        }

        // Add all types to the selectedTypes set
        sampleTypes.forEach((type) => selectedTypesSet.add(String(type)));
      });

      // Convert selectedTypes set back to array
      const newSelectedTypes = Array.from(selectedTypesSet) as string[];

      // Set state.selectedViolations to the keys of the map with value > 0
      const newSelectedViolations = Array.from(violationMap.entries())
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, value]) => value > 0)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(([key, _]) => key);

      // Now, we assign new values to the state variables.
      state.selectedNodes = newSelectedNodes;
      state.selectedTypes = newSelectedTypes;
      state.selectedViolations = newSelectedViolations;
      state.numberViolationsPerNode = calculateNewNumberViolationsPerNode(
        state.selectedNodes,
        state.focusNodeMap,
        state.numberViolationsPerNode,
        state.ontologyTree,
        new Set([...state.types, ...state.violations]),
      );

      updateSelectedViolationExemplars(state);
    },

    setSelectedViolations: (state, action) => {
      // use violations to select all focus nodes with those violations
      // then use nodes to select all types and violations of those nodes and their exemplars

      let newSelectedViolations = action.payload;
      let newSelectedNodes = [];
      let newSelectedTypes = [];
      let newSelectedViolationExemplars = [];

      newSelectedViolations.forEach((violation) => {
        newSelectedNodes = [...newSelectedNodes, ...state.violationMap[violation].nodes];
      });

      newSelectedNodes.forEach((node) => {
        newSelectedTypes = [...newSelectedTypes, ...state.focusNodeMap[node].types];
        newSelectedViolationExemplars = [...newSelectedViolationExemplars, ...state.focusNodeMap[node].exemplars];
        newSelectedViolations = [...newSelectedViolations, ...state.focusNodeMap[node].violations];
      });

      // Remove duplicates by converting to a Set and then back to an array
      newSelectedNodes = [...new Set(newSelectedNodes)];
      newSelectedTypes = [...new Set(newSelectedTypes)];
      newSelectedViolationExemplars = [...new Set(newSelectedViolationExemplars)];
      newSelectedViolations = [...new Set(newSelectedViolations)];

      state.selectedNodes = newSelectedNodes;
      state.selectedTypes = newSelectedTypes;
      state.selectedViolationExemplars = newSelectedViolationExemplars;
      state.selectedViolations = newSelectedViolations;

      const newNumberViolationsPerNode = calculateNewNumberViolationsPerNode(
        state.selectedNodes,
        state.focusNodeMap,
        state.numberViolationsPerNode,
        state.ontologyTree,
        new Set([...state.types, ...state.violations]),
      );
      state.numberViolationsPerNode = newNumberViolationsPerNode;
    },
    setSelectedTypes: (state, action) => {
      state.selectedTypes = action.payload;

      let newSelectedNodes = [];
      let newSelectedViolations = [];
      let newSelectedViolationExemplars = [];

      state.selectedTypes.forEach((type) => {
        newSelectedNodes = [...newSelectedNodes, ...state.typeMap[type].nodes];
        newSelectedViolations = [...newSelectedViolations, ...state.typeMap[type].violations];
        newSelectedViolationExemplars = [...newSelectedViolationExemplars, ...state.typeMap[type].exemplars];
      });

      // Remove duplicates by converting to a Set and then back to an array
      newSelectedNodes = [...new Set(newSelectedNodes)];
      newSelectedViolations = [...new Set(newSelectedViolations)];
      newSelectedViolationExemplars = [...new Set(newSelectedViolationExemplars)];

      state.selectedNodes = newSelectedNodes;
      state.selectedViolations = newSelectedViolations;
      state.selectedViolationExemplars = newSelectedViolationExemplars;
      state.numberViolationsPerNode = calculateNewNumberViolationsPerNode(
        state.selectedNodes,
        state.focusNodeMap,
        state.numberViolationsPerNode,
        state.ontologyTree,
        new Set([...state.types, ...state.violations]),
      );
    },
    addSingleSelectedType: (state, action) => {
      const newType = action.payload;
      if (!state.selectedTypes.includes(newType)) {
        state.selectedTypes.push(newType);
      }

      const { newSelectedNodes, newViolationCount } = calculateSelectedNodesAndViolations(
        [newType], // Only adding this new type
        state.violations,
        state.samples,
        ActionTypes.APPEND, // Append to existing

        state.selectedNodes,
      );

      // Remove duplicates by converting to Set and then back to Array
      state.selectedNodes = [...new Set([...state.selectedNodes, ...newSelectedNodes])];
      state.selectedViolations = [...new Set([...state.selectedViolations, ...calculateNewSelectedViolations(newViolationCount)])];

      updateSelectedViolationExemplars(state);

      const newNumberViolationsPerNode = calculateNewNumberViolationsPerNode(
        state.selectedNodes,
        state.focusNodeMap,
        state.numberViolationsPerNode,
        state.ontologyTree,
        new Set([...state.types, ...state.violations]),
      );
      state.numberViolationsPerNode = newNumberViolationsPerNode;
    },
    removeMultipleSelectedTypes: (state, action) => {
      const typesToRemove = action.payload;

      typesToRemove.forEach((typeToRemove) => {
        const index = state.selectedTypes.indexOf(typeToRemove);
        if (index > -1) {
          state.selectedTypes.splice(index, 1);
        }
      });

      // Recalculate selected nodes and violations
      const { newSelectedNodes, newViolationCount } = calculateSelectedNodesAndViolations(
        typesToRemove,
        state.violations,
        state.samples,
        ActionTypes.REMOVE,
        state.selectedNodes,
      );

      const nodesToRemove = new Set(newSelectedNodes);
      state.selectedNodes = state.selectedNodes.filter((node) => !nodesToRemove.has(node));

      const currentSelectedViolationsCount = initializeViolationCount(state.violations);

      // Updating violation count based on remaining selected nodes
      state.selectedNodes.forEach((node) => {
        const correspondingSample = state.focusNodeSampleMap[node];
        if (correspondingSample) {
          updateViolationCount(correspondingSample, currentSelectedViolationsCount, ActionTypes.APPEND);
        }
      });

      // Adjusting violation counts and selecting new violations
      const newSelectedViolations = [];
      for (const [key, value] of Object.entries(newViolationCount)) {
        if (currentSelectedViolationsCount[key] !== undefined) {
          currentSelectedViolationsCount[key] += value;
        }
        if (currentSelectedViolationsCount[key] > 0) {
          newSelectedViolations.push(key);
        }
      }

      state.selectedViolations = newSelectedViolations;

      updateSelectedViolationExemplars(state);
      const newNumberViolationsPerNode = calculateNewNumberViolationsPerNode(
        state.selectedNodes,
        state.focusNodeMap,
        state.numberViolationsPerNode,
        state.ontologyTree,
        new Set([...state.types, ...state.violations]),
      );
      state.numberViolationsPerNode = newNumberViolationsPerNode;
    },
    removeSingleSelectedType: (state, action) => {
      const typeToRemove = action.payload;
      const index = state.selectedTypes.indexOf(typeToRemove);
      if (index > -1) {
        state.selectedTypes.splice(index, 1);
      }

      const { newSelectedNodes, newViolationCount } = calculateSelectedNodesAndViolations(
        [typeToRemove], // Only removing this type
        state.violations,
        state.samples,
        ActionTypes.REMOVE, // Remove from existing
        state.selectedNodes,
      );

      const nodesToRemove = new Set(newSelectedNodes);
      state.selectedNodes = state.selectedNodes.filter((node) => !nodesToRemove.has(node));

      const currentSelectedViolationsCount = initializeViolationCount(state.violations);

      state.selectedNodes.forEach((node) => {
        const correspondingSample = state.focusNodeSampleMap[node];
        if (correspondingSample) {
          updateViolationCount(correspondingSample, currentSelectedViolationsCount, ActionTypes.APPEND);
        }
      });

      const newSelectedViolations = [];

      for (const [key, value] of Object.entries(newViolationCount)) {
        if (Object.prototype.hasOwnProperty.call(currentSelectedViolationsCount, key)) {
          currentSelectedViolationsCount[key] += value;
        }
        if (currentSelectedViolationsCount[key] > 0) {
          newSelectedViolations.push(key);
        }
      }

      state.selectedViolations = newSelectedViolations;

      updateSelectedViolationExemplars(state);

      const newNumberViolationsPerNode = calculateNewNumberViolationsPerNode(
        state.selectedNodes,
        state.focusNodeMap,
        state.numberViolationsPerNode,
        state.ontologyTree,
        new Set([...state.types, ...state.violations]),
      );
      state.numberViolationsPerNode = newNumberViolationsPerNode;
    },
    setRdfString: (state, action) => {
      state.rdfString = action.payload;
    },
    setOriginalInstanceData: (state, action) => {
      state.originalInstanceData = action.payload;
    },
    setOriginalViolationReport: (state, action) => {
      state.originalViolationReport = action.payload;
    },
  },
});

export const selectMissingEdgeOption = (state: { combined: ICombinedState }) => state.combined.missingEdgeOption;
export const selectMissingEdgeLabel = (state: { combined: ICombinedState }) => state.combined.missingEdgeLabel;
export const selectFilterType = (state: { combined: ICombinedState }) => state.combined.filterType;
export const selectD3BoundingBox = (state: { combined: ICombinedState }) => state.combined.d3BoundingBox;
export const selectViolationsTypeMap = (state: { combined: ICombinedState }) => state.combined.violationTypesMap;
export const selectSelectedNodes = (state: { combined: ICombinedState }) => state.combined.selectedNodes;
export const selectSamples = (state: { combined: ICombinedState }) => state.combined.samples;
export const selectRdfString = (state: { combined: ICombinedState }) => state.combined.rdfString;
export const selectViolationTypesMap = (state: { combined: ICombinedState }) => state.combined.violationTypesMap;
export const selectTypesViolationMap = (state: { combined: ICombinedState }) => state.combined.typesViolationMap;
export const selectCombinedSamples = (state: { combined: ICombinedState }) => state.combined.samples;
export const selectSelectedViolations = (state: { combined: ICombinedState }) => state.combined.selectedViolations;
export const selectViolations = (state: { combined: ICombinedState }) => state.combined.violations;
export const selectCsvData = (state: { combined: ICombinedState }) => state.combined.samples;
export const selectSelectedFocusNodes = (state: { combined: ICombinedState }) => state.combined.selectedNodes;
export const selectSelectedTypes = (state: { combined: ICombinedState }) => state.combined.selectedTypes;
export const selectRdfData = (state: { combined: ICombinedState }) => state.combined.rdfString;
export const selectOriginalInstanceData = (state: { combined: ICombinedState }) => state.combined.originalInstanceData;
export const selectOriginalViolationReport = (state: { combined: ICombinedState }) => state.combined.originalViolationReport;
export const selectSelectedViolationExemplars = (state: { combined: ICombinedState }) => state.combined.selectedViolationExemplars;
export const selectNamespaces = (state: { combined: ICombinedState }) => state.combined.namespaces;
export const selectTypes = (state: { combined: ICombinedState }) => state.combined.types;
export const selectViolationMap = (state: { combined: ICombinedState }) => state.combined.violationMap;
export const selectTypeMap = (state: { combined: ICombinedState }) => state.combined.typeMap;
export const selectExemplarMap = (state: { combined: ICombinedState }) => state.combined.exemplarMap;
export const selectFocusNodeMap = (state: { combined: ICombinedState }) => state.combined.focusNodeMap;
export const selectSubClassOfTriples = (state: { combined: ICombinedState }) => state.combined.subClassOfTriples;
export const selectCumulativeNumberViolationsPerNode = (state: { combined: ICombinedState }) => state.combined.cumulativeNumberViolationsPerNode;
export const selectHiddenLabels = (state: { combined: ICombinedState }) => state.combined.hiddenLabels;
export const selectHiddenLineupColumns = (state: { combined: ICombinedState }) => state.combined.hiddenLineupColumns;
export const selectNodeLabels = (state: { combined: ICombinedState }) => state.combined.nodeLabels;
export const selectEdgeLabels = (state: { combined: ICombinedState }) => state.combined.edgeLabels;
export const selectHideNamespacePrefixColumns = (state: { combined: ICombinedState }) => state.combined.hideNamespacePrefixColumns;
export const selectHideNamespacePrefixCells = (state: { combined: ICombinedState }) => state.combined.hideNamespacePrefixCells;

// TODO investigate why we are returning everything here
// create memoized selector
export const selectBarPlotData = createSelector(
  selectSelectedNodes,
  selectSelectedTypes,
  selectSamples,
  selectRdfString,
  selectViolations,
  selectSelectedViolations,
  selectViolationTypesMap,
  selectTypesViolationMap,
  (selectedNodes, selectedTypes, samples, rdfString, violations, selectedViolations, violationTypesMap, typesViolationMap) => {
    return {
      selectedNodes,
      selectedTypes,
      samples,
      rdfString,
      violations,
      selectedViolations,
      violationTypesMap,
      typesViolationMap,
    };
  },
);

export const selectCsvDataForPlotly = createSelector(selectCombinedSamples, (samples) => {
  return dataToScatterDataArray(samples);
});

// TODO, if this is needed again add the prefix logic from selectSubClassOfTuples
export const selectSubClassOrObjectPropertyTuples = async (state: { rdf: IRdfState }): Promise<ITriple[]> => {
  const { rdfString } = state.rdf;
  const store: Store = new N3.Store();
  const parser: N3.Parser = new N3.Parser();
  await new Promise<void>((resolve, reject) => {
    // (error, quad, _prefixes)
    parser.parse(rdfString, (error, quad) => {
      if (quad) {
        store.addQuad(quad);
      } else if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  const subClassOfPredicate = new NamedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf');
  const objectPropertyPredicate = new NamedNode('http://www.w3.org/2002/07/owl#ObjectProperty');
  const subClassOrObjectPropertyTuples = store
    .getQuads(null, subClassOfPredicate, null, null)
    .concat(store.getQuads(null, null, objectPropertyPredicate, null));
  return subClassOrObjectPropertyTuples.map((quad) => {
    return {
      s: quad.subject.id,
      p: quad.predicate.id,
      o: quad.object.id,
    };
  });
};

// The main exported function
export const selectCytoData = async (rdfString, getColorForNamespace, types, numberViolationsPerNode, violationList) => {
  const { visibleTriples, hiddenTriples } = await selectAllTriples(rdfString);
  const objectProperties = calculateObjectProperties(visibleTriples, hiddenTriples);
  const nodes = [];
  const edges = [];

  processTriples(hiddenTriples, false, nodes, edges, objectProperties, getColorForNamespace, types, numberViolationsPerNode, violationList);
  processTriples(visibleTriples, true, nodes, edges, objectProperties, getColorForNamespace, types, numberViolationsPerNode, violationList);

  return { nodes, edges };
};

export const {
  clearAllSelections,
  clearHiddenLabels,
  setSelectedViolations,
  setViolations,
  setCsvData,
  setSelectedFocusNodesUsingFeatureCategories,
  setSelectedFocusNodes,
  setSelectedTypes,
  addSingleSelectedType,
  removeMultipleSelectedTypes,
  removeSingleSelectedType,
  setRdfString,
  setOriginalInstanceData,
  setOriginalViolationReport,
  setViolationTypesMap,
  setTypesViolationMap,
  setFilterType,
  setD3BoundingBox,
  setMissingEdgeOption,
  setMissingEdgeLabel,
  setEdgeCountDict,
  setFocusNodeExemplarDict,
  setExemplarFocusNodeDict,
  setSelectedViolationExemplars,
  setNamespaces,
  setTypes,
  setSubClassOfTriples,
  setViolationMap,
  setFocusNodeMap,
  setTypeMap,
  setExemplarMap,
  setOntologyTree,
  setCumulativeNumberViolationsPerNode,
  addHiddenLabels,
  removeHiddenLabels,
  setNodeLabels,
  setEdgeLabels,
  addHiddenLineupColumns,
  removeHiddenLineupColumns,
  clearHiddenLineupColumns,
  setHideNamespacePrefixColumns,
  setHideNamespacePrefixCells,
} = combinedSlice.actions;

export default combinedSlice.reducer;
