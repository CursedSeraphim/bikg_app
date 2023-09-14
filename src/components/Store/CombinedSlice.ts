// CombinedSlice.ts
import { createSlice, current, PayloadAction } from '@reduxjs/toolkit';
import * as N3 from 'n3';
import { NamedNode, Store, Quad } from 'n3';
import { createSelector } from 'reselect';
import { v4 as uuidv4 } from 'uuid';
import { dataToScatterDataArray } from '../EmbeddingView/csvToPlotlyScatterData';
import {
  ICombinedState,
  IRdfState,
  ITriple,
  ICsvData,
  FilterType,
  MissingEdgeOptionType,
  EdgeCountDict,
  FocusNodeExemplarDict,
  ExemplarFocusNodeDict,
  INamespaces,
  INumberViolationsPerNodeMap,
  IViolationMap,
  ITypeMap,
  IExemplarMap,
  IFocusNodeMap,
  ServerTree,
  INumberViolationsPerNodeValue,
  IServerTreeNode,
} from '../../types';
import { CSV_EDGE_NOT_IN_ONTOLOGY_STRING } from '../../constants';

const initialState: ICombinedState = {
  cumulativeNumberViolationsPerNode: {},
  samples: [],
  originalSamples: [],
  selectedNodes: [],
  selectedTypes: [],
  selectedViolations: [],
  rdfString: '',
  violations: [],
  violationTypesMap: {},
  typesViolationMap: {},
  filterType: 'none',
  missingEdgeOption: 'keep',
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
    const type = String(sample['rdf:type']);
    const focusNode = sample.focus_node;
    const exemplars = focusNodeExemplarDict[focusNode] || [];

    tempTypeMap[type].focusNodes.add(focusNode);
    exemplars.forEach((exemplar) => tempTypeMap[type].exemplars.add(exemplar));

    tempFocusNodeMap[focusNode].types.add(type);
    exemplars.forEach((exemplar) => tempFocusNodeMap[focusNode].exemplars.add(exemplar));

    exemplars.forEach((exemplar) => {
      tempExemplarMap[exemplar].focusNodes.add(focusNode);
      tempExemplarMap[exemplar].types.add(type);
    });

    violations.forEach((violation) => {
      if ((sample[violation] as number) > 0) {
        tempTypeMap[type].violations.add(violation);

        tempFocusNodeMap[focusNode].violations.add(violation);

        exemplars.forEach((exemplar) => tempExemplarMap[exemplar].violations.add(violation));

        // Add to the focus node list
        tempViolationMap[violation].focusNodes.add(sample.focus_node);

        // Add to the type list
        tempViolationMap[violation].types.add(type);

        // Add to the exemplar list using FocusNodeExemplarDict
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

function shortenURI(uri: string, prefixes: { [key: string]: string }): string {
  for (const [prefix, prefixURI] of Object.entries(prefixes)) {
    if (uri.startsWith(prefixURI)) {
      return uri.replace(prefixURI, `${prefix}:`);
    }
  }
  return uri;
}
const mapQuadToShortenedResult = (quad, prefixes: { [key: string]: string }) => {
  return {
    s: shortenURI(quad.subject.id, prefixes),
    p: shortenURI(quad.predicate.id, prefixes),
    o: shortenURI(quad.object.id, prefixes),
  };
};

const removeNanEdges = (data: ICsvData[]): ICsvData[] => {
  return data.map((sample: ICsvData): ICsvData => {
    const { Id, ...rest } = sample;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const filteredEntries = Object.entries(rest).filter(([key, value]) => value !== CSV_EDGE_NOT_IN_ONTOLOGY_STRING);

    return { Id, ...Object.fromEntries(filteredEntries) };
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

/**
 * Helper function to update numberViolationsPerNode based on a map.
 */
const updateViolationsPerNode = (sourceMap: Map<string, number>, numberViolationsPerNode: INumberViolationsPerNodeMap) => {
  sourceMap.forEach((value, key) => {
    if (Object.hasOwnProperty.call(numberViolationsPerNode, key)) {
      // eslint-disable-next-line no-param-reassign
      numberViolationsPerNode[key].selected = value;
      // eslint-disable-next-line no-param-reassign
      numberViolationsPerNode[key].cumulativeSelected = value;
    }
  });
};

/**
 * Function to update cumulative counts in the tree hierarchy.
 */
const updateCumulativeCounts = (node: IServerTreeNode, numberViolationsPerNode: INumberViolationsPerNodeMap, knownTypes: Set<string>) => {
  if (knownTypes.has(node.id)) {
    let cumulativeCount = 0;

    for (const child of node.children) {
      updateCumulativeCounts(child, numberViolationsPerNode, knownTypes);
      if (numberViolationsPerNode[child.id] && knownTypes.has(child.id)) {
        cumulativeCount += numberViolationsPerNode[child.id].cumulativeSelected;
      }
    }

    if (numberViolationsPerNode[node.id]) {
      // eslint-disable-next-line no-param-reassign
      numberViolationsPerNode[node.id].cumulativeSelected += cumulativeCount;
    }
  } else {
    for (const child of node.children) {
      updateCumulativeCounts(child, numberViolationsPerNode, knownTypes);
    }
  }
};

function resetTypesCounts(numberViolationsPerNode: INumberViolationsPerNodeMap, selectedTypesMap: Map<string, number>, knownTypes: Set<string>): void {
  Object.keys(numberViolationsPerNode).forEach((key) => {
    if (knownTypes.has(key) && !selectedTypesMap.has(key)) {
      // eslint-disable-next-line no-param-reassign
      numberViolationsPerNode[key].cumulativeSelected = 0;
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

  newSelectedNodes.forEach((node) => {
    const { types, violations, exemplars } = focusNodeMap[node];
    types.forEach((type: string) => incrementMapValue(newSelectedTypesMap, type));
    violations.forEach((violation: string) => incrementMapValue(newSelectedViolationsMap, violation));
    exemplars.forEach((exemplar: string) => incrementMapValue(newSelectedExemplarsMap, exemplar));
  });

  updateViolationsPerNode(newSelectedTypesMap, numberViolationsPerNode);
  updateViolationsPerNode(newSelectedViolationsMap, numberViolationsPerNode);
  updateViolationsPerNode(newSelectedExemplarsMap, numberViolationsPerNode);

  resetTypesCounts(numberViolationsPerNode, newSelectedTypesMap, knownTypes);
  updateCumulativeCounts(ontologyTree, numberViolationsPerNode, knownTypes);

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

const updateViolationCount = (sample: ICsvData, violationCount: Record<string, number>, actionType: ActionTypes) => {
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

const calculateSelectedNodesAndViolations = (
  selectedTypes: string[],
  violations: string[],
  samples: ICsvData[],
  actionType: ActionTypes,
  selectedNodes: string[] = [],
): { newSelectedNodes: string[]; newViolationCount: Record<string, number> } => {
  const newSelectedNodes = actionType === ActionTypes.APPEND ? [...selectedNodes] : [];
  const newViolationCount = initializeViolationCount(violations);

  samples.forEach((sample) => {
    if (selectedTypes.includes(String(sample['rdf:type']))) {
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
      console.log('state.numberViolationsPerNode after setting cumulativeViolations', current(state.numberViolationsPerNode));
    },
    setOntologyTree: (state, action: PayloadAction<ServerTree>) => {
      state.ontologyTree = action.payload;
      console.log('setOntologyTree', state.ontologyTree);
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
      console.time('setSelectedViolationExemplars');
      // state.selectedViolationExemplars = action.payload;

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
        new Set(state.types),
      );
      state.numberViolationsPerNode = newNumberViolationsPerNode;

      console.timeEnd('setSelectedViolationExemplars');
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
        state.samples = [...state.originalSamples];
      }
      updateFocusNodeSampleMap(state);
    },
    setFilterType: (state, action: PayloadAction<FilterType>) => {
      state.filterType = action.payload;
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
        state.samples = action.payload;
      }
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
        new Set(state.types),
      );
    },
    setSelectedFocusNodes: (state, action) => {
      console.log('settings selected focus nodes');
      // TODO rework with new maps
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
      const selectedTypesSet: Set<string> = new Set();

      // Iterate over selected nodes
      newSelectedNodes.forEach((selectedNode) => {
        const correspondingSample = focusNodesSamplesMap[selectedNode];

        if (!correspondingSample) return; // if no corresponding sample is found, skip

        state.violations.forEach((violation) => {
          if (correspondingSample[violation]) {
            violationMap.set(violation, violationMap.get(violation) + 1);
          }
        });

        // If the sample has a type, add it to the selectedTypes set
        const sampleType = String(correspondingSample['rdf:type']);
        if (sampleType) {
          selectedTypesSet.add(sampleType);
        }
      });

      // Convert selectedTypes set back to array
      const newSelectedTypes = Array.from(selectedTypesSet);

      // Set state.selectedViolations to the keys of the map with value > 0
      const newSelectedViolations = Array.from(violationMap.entries())
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([key_, value]) => value > 0)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(([key, value_]) => key);

      // Now, we assign new values to the state variables.
      state.selectedNodes = newSelectedNodes;
      state.selectedTypes = newSelectedTypes;
      state.selectedViolations = newSelectedViolations;
      state.numberViolationsPerNode = calculateNewNumberViolationsPerNode(
        state.selectedNodes,
        state.focusNodeMap,
        state.numberViolationsPerNode,
        state.ontologyTree,
        new Set(state.types),
      );
      console.log('state.numberViolationsPerNode', state.numberViolationsPerNode);

      updateSelectedViolationExemplars(state);
    },

    setSelectedViolations: (state, action) => {
      // use violations to select all focus nodes with those violations
      // then use nodes to select all types and violations of those nodes and their exemplars
      console.time('setSelectedViolations');

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
        new Set(state.types),
      );
      state.numberViolationsPerNode = newNumberViolationsPerNode;

      console.timeEnd('setSelectedViolations');
    },
    setSelectedTypes: (state, action) => {
      console.time('setSelectedTypes');
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
        new Set(state.types),
      );

      console.timeEnd('setSelectedTypes');
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
        new Set(state.types),
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
        new Set(state.types),
      );
      state.numberViolationsPerNode = newNumberViolationsPerNode;
    },
    setRdfString: (state, action) => {
      state.rdfString = action.payload;
    },
  },
});

export const selectMissingEdgeOption = (state: { combined: ICombinedState }) => state.combined.missingEdgeOption;
export const selectFilterType = (state: { combined: ICombinedState }) => state.combined.filterType;
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
export const selectSelectedViolationExemplars = (state: { combined: ICombinedState }) => state.combined.selectedViolationExemplars;
export const selectNamespaces = (state: { combined: ICombinedState }) => state.combined.namespaces;
export const selectTypes = (state: { combined: ICombinedState }) => state.combined.types;
export const selectSubClassOfTriples = (state: { combined: ICombinedState }) => state.combined.subClassOfTriples;
export const selectCumulativeNumberViolationsPerNode = (state: { combined: ICombinedState }) => state.combined.cumulativeNumberViolationsPerNode;

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

export const selectSubClassesAndViolations = async (state: { combined: ICombinedState }): Promise<Quad[]> => {
  const { rdfString } = state.combined;
  const store: Store = new Store();
  const parser: N3.Parser = new N3.Parser();

  // Extract the prefixes from the rdfString
  const prefixes: { [key: string]: string } = await new Promise((resolve, reject) => {
    parser.parse(rdfString, (error, quad, pref) => {
      if (quad) {
        store.addQuad(quad);
      } else if (error) {
        reject(error);
      } else {
        resolve(pref);
      }
    });
  });

  // Define some common nodes using the extracted prefixes
  const predicates = [new NamedNode(`${prefixes.rdfs}subClassOf`)];
  const propertyShapeNode = new NamedNode(`${prefixes.sh}PropertyShape`);
  const classNode = new NamedNode(`${prefixes.sh}class`);
  const namedNode = new NamedNode(`${prefixes.omics}Donor`);

  // Start querying the store
  const initialQuads = store.getQuads(null, null, propertyShapeNode);
  const initialSubjects = [...new Set(initialQuads.map((quad) => quad.subject))];

  // Get quads where subject is from initialSubjects and object is namedNode
  const intermediateQuads = initialSubjects.flatMap((subject) => store.getQuads(subject, classNode, namedNode));
  const intermediateSubjects = [...new Set(intermediateQuads.map((quad) => quad.subject))];

  // Get all quads where subject is from intermediateSubjects
  const finalQuads = intermediateSubjects.flatMap((subject) => store.getQuads(subject, null, null));

  // Process and combine results
  const results = [];
  predicates.forEach((predicate) => {
    const tuples = store.getQuads(null, predicate, null).map((quad) => mapQuadToShortenedResult(quad, prefixes));
    results.push(...tuples);
  });

  const shortenedIntermediateQuads = intermediateQuads.map((quad) => mapQuadToShortenedResult(quad, prefixes));
  const shortenedFinalQuads = finalQuads.map((quad) => mapQuadToShortenedResult(quad, prefixes));

  results.push(...shortenedIntermediateQuads, ...shortenedFinalQuads);

  return results;
};

export const selectSubClassOfTuples = async (state: { rdf: IRdfState }): Promise<ITriple[]> => {
  console.time('time in selectSubClassoFTupless');

  const { rdfString } = state.rdf;
  const store: Store = new Store();
  const parser: N3.Parser = new N3.Parser();
  let prefixes: { [key: string]: string } = {};
  console.time('time awaiting promise');

  await new Promise<void>((resolve, reject) => {
    parser.parse(rdfString, (error, quad, _prefixes) => {
      if (quad) {
        store.addQuad(quad);
      } else if (error) {
        reject(error);
      } else {
        prefixes = _prefixes;
        resolve();
      }
    });
  });
  console.timeEnd('time awaiting promise');
  const subClassOfPredicate = new NamedNode(`${prefixes.rdfs}subClassOf`);
  const subClassOfTuples = store.getQuads(null, subClassOfPredicate, null);
  // map each quad to a tuple of subject, predicate, object in a named way (subject, predicate, object)
  // In selectSubClassOfTuples and selectSubClassOrObjectPropertyTuples functions
  console.timeEnd('time in selectSubClassoFTupless');
  return subClassOfTuples.map((quad) => {
    return {
      s: shortenURI(quad.subject.id, prefixes),
      p: shortenURI(quad.predicate.id, prefixes),
      o: shortenURI(quad.object.id, prefixes),
    };
  });
};

export const selectAllClassesAndViolations = async (state: { combined: ICombinedState }): Promise<{ visibleTriples: ITriple[]; hiddenTriples: ITriple[] }> => {
  const { rdfString } = state.combined;
  const store: Store = new Store();
  const parser: N3.Parser = new N3.Parser();
  let prefixes: { [key: string]: string } = {};

  await new Promise<void>((resolve, reject) => {
    parser.parse(rdfString, (error, quad, _prefixes) => {
      if (quad) {
        store.addQuad(quad);
      } else if (error) {
        reject(error);
      } else {
        prefixes = _prefixes;
        resolve();
      }
    });
  });

  const subClassOfPredicate = new NamedNode(`${prefixes.rdfs}subClassOf`);
  const shaclPropertyPredicate = new NamedNode(`${prefixes.sh}property`);

  const allVisibleTuples = store.getQuads(null, subClassOfPredicate, null);
  const targetClassTuples = store.getQuads(null, `${prefixes.sh}targetClass`, null);

  for (const tuple of targetClassTuples) {
    const childrenPropertyPredicate = store.getQuads(tuple.subject, shaclPropertyPredicate, null);
    const children = store.getQuads(tuple.subject, null, null);
    //  if one of the objects is `${prefixes.omics}TranscriptOmicsSamplee` then add all children to `allVisibleTuples
    for (const childTuple of children) {
      if (childTuple.object === new NamedNode(`${prefixes.omics}Sample`)) {
        allVisibleTuples.push(...childrenPropertyPredicate);
        break;
      }
    }
  }

  // append shaclPropertyTuples to allVisibleTuples
  // allVisibleTuples.push(...targetClassTuples);

  const allHiddenTuples = store.getQuads(null, null, null).filter((quad) => !allVisibleTuples.includes(quad));

  // map each quad to a tuple of subject, predicate, object in a named way (subject, predicate, object)
  const visibleTriples = allVisibleTuples.map((quad) => {
    return {
      s: shortenURI(quad.subject.id, prefixes),
      p: shortenURI(quad.predicate.id, prefixes),
      o: shortenURI(quad.object.id, prefixes),
    };
  });
  const hiddenTriples = allHiddenTuples.map((quad) => {
    return {
      s: shortenURI(quad.subject.id, prefixes),
      p: shortenURI(quad.predicate.id, prefixes),
      o: shortenURI(quad.object.id, prefixes),
    };
  });
  return { visibleTriples, hiddenTriples };
};

export const selectAllTriples = async (rdfString: string): Promise<{ visibleTriples: ITriple[]; hiddenTriples: ITriple[] }> => {
  const store: Store = new Store();
  const parser: N3.Parser = new N3.Parser();
  let prefixes: { [key: string]: string } = {};

  await new Promise<void>((resolve, reject) => {
    parser.parse(rdfString, (error, quad, _prefixes) => {
      if (quad) {
        store.addQuad(quad);
      } else if (error) {
        reject(error);
      } else {
        prefixes = _prefixes;
        resolve();
      }
    });
  });

  const subClassOfPredicate = new NamedNode(`${prefixes.rdfs}subClassOf`);
  const allVisibleTuples = store.getQuads(null, subClassOfPredicate, null);
  const allHiddenTuples = store.getQuads(null, null, null).filter((quad) => !allVisibleTuples.includes(quad));

  // map each quad to a tuple of subject, predicate, object in a named way (subject, predicate, object)
  const visibleTriples = allVisibleTuples.map((quad) => {
    return {
      s: shortenURI(quad.subject.id, prefixes),
      p: shortenURI(quad.predicate.id, prefixes),
      o: shortenURI(quad.object.id, prefixes),
    };
  });
  const hiddenTriples = allHiddenTuples.map((quad) => {
    return {
      s: shortenURI(quad.subject.id, prefixes),
      p: shortenURI(quad.predicate.id, prefixes),
      o: shortenURI(quad.object.id, prefixes),
    };
  });
  return { visibleTriples, hiddenTriples };
};

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
  const subClassOrObjectPropertyTuples = store.getQuads(null, subClassOfPredicate, null).concat(store.getQuads(null, null, objectPropertyPredicate));
  return subClassOrObjectPropertyTuples.map((quad) => {
    return {
      s: quad.subject.id,
      p: quad.predicate.id,
      o: quad.object.id,
    };
  });
};

/**
 * Calculate object properties from the visible and hidden triples.
 *
 * @param {Array} visibleTriples - Array of visible triples.
 * @param {Array} hiddenTriples - Array of hidden triples.
 * @returns {Map} objectProperties - Returns a map containing object properties.
 */
const calculateObjectProperties = (visibleTriples, hiddenTriples) => {
  const objectProperties = new Map();
  const typesToInclude = new Set(['owl:ObjectProperty', 'owl:Class', 'sh:PropertyShape', 'owl:Ontology']);
  const predicatesToInclude = new Set(['sh:value']);

  [...visibleTriples, ...hiddenTriples].forEach((t) => {
    // If the object type is in typesToInclude, or if the predicate is in predicatesToInclude
    // then consider the object as an object property.
    if (typesToInclude.has(t.o)) {
      objectProperties.set(t.s, t.o);
    }
    if (predicatesToInclude.has(t.p)) {
      objectProperties.set(t.o, true); // Just indicate that this URI should be treated as an object property.
    }
  });

  return objectProperties;
};

/**
 * Process the triples and create nodes and edges based on triples and its visibility.
 *
 * @param {Array} triples - Array of triples.
 * @param {boolean} visible - Boolean value representing the visibility of the node.
 * @param {Array} nodes - Array of Nodes.
 * @param {Array} edges - Array of Edges.
 * @param {Map} objectProperties - Map containing object properties.
 * @param {Function} getColorForNamespace - Function to get color for namespace.
 * @param {Array} violations - Array of violations.
 * @param {Array} types - Array of types.
 * @param {Object} cumulativeNumberViolationsPerNode - Object containing cumulative number of violations per type.
 */
const processTriples = (triples, visible, nodes, edges, objectProperties, getColorForNamespace, violations, types, cumulativeNumberViolationsPerNode) => {
  triples.forEach((t) => {
    const extractNamespace = (uri) => {
      const match = uri.match(/^([^:]+):/);
      return match ? match[1] : '';
    };

    const findOrAddNode = (id, label) => {
      let cumulativeSelected = null;
      let cumulativeViolations = null;

      // Check if id exists in the cumulativeNumberViolationsPerNode map
      if (
        Object.hasOwnProperty.call(cumulativeNumberViolationsPerNode, id) ||
        Object.hasOwnProperty.call(cumulativeNumberViolationsPerNode, id.split(' ')[0])
      ) {
        const { cumulativeSelected: cs, cumulativeViolations: cv } =
          cumulativeNumberViolationsPerNode[id] || cumulativeNumberViolationsPerNode[id.split(' ')[0]] || {};

        cumulativeSelected = cs;
        cumulativeViolations = cv;
      }

      let node = nodes.find((n) => n.data.id === id);
      if (!node) {
        const namespace = extractNamespace(id);
        const defaultColor = getColorForNamespace(namespace, false);
        const selectedColor = getColorForNamespace(namespace, true);
        node = {
          data: {
            id,
            label: cumulativeSelected !== null && cumulativeViolations !== null ? `${label} (${cumulativeSelected}/${cumulativeViolations})` : label,
            visible,
            permanent: visible,
            namespace,
            defaultColor,
            selectedColor,
            violation: violations.includes(id),
            exemplar: namespace === 'ex',
            type: types.includes(id),
          },
        };
        nodes.push(node);
      } else if (visible) {
        node.data.visible = visible;
        node.data.permanent = visible;
      }
    };

    findOrAddNode(t.s, t.s);

    if (objectProperties.has(t.o)) {
      findOrAddNode(t.o, t.o);
    }

    const uniqueId = objectProperties.has(t.o) ? t.o : `${t.o}_${uuidv4()}`;
    findOrAddNode(uniqueId, t.o);

    edges.push({
      data: {
        id: `${t.s}_${t.p}_${uniqueId}`,
        source: t.s,
        target: uniqueId,
        label: t.p,
        visible,
        permanent: visible,
        namespace: extractNamespace(t.p),
      },
    });
  });
};

/**
 * Method to select and create CytoData based on the provided rdfString.
 * This function creates Nodes and Edges based on visible and hidden triples and returns.
 *
 * @param {string} rdfString string in Resource Description Framework format.
 * @param {Function} getShapeForNamespace - Function to get a shape for a namespace.
 * @param {Array} violations - Array of violations.
 * @param {Array} types - Array of types.
 * @param {Object} cumulativeNumberViolationsPerNode - Object containing cumulative number of violations per type.
 * @returns {Object} An object containing array of Nodes and Edges.
 */
export const selectCytoData = async (rdfString, getShapeForNamespace, violations, types, cumulativeNumberViolationsPerNode) => {
  // ... same as before
  const { visibleTriples, hiddenTriples } = await selectAllTriples(rdfString);

  const nodes = [];
  const edges = [];

  const objectProperties = calculateObjectProperties(visibleTriples, hiddenTriples);
  processTriples(hiddenTriples, false, nodes, edges, objectProperties, getShapeForNamespace, violations, types, cumulativeNumberViolationsPerNode);
  processTriples(visibleTriples, true, nodes, edges, objectProperties, getShapeForNamespace, violations, types, cumulativeNumberViolationsPerNode);
  return { nodes, edges };
};

export const {
  setSelectedViolations,
  setViolations,
  setCsvData,
  setSelectedFocusNodesUsingFeatureCategories,
  setSelectedFocusNodes,
  setSelectedTypes,
  addSingleSelectedType,
  removeSingleSelectedType,
  setRdfString,
  setViolationTypesMap,
  setTypesViolationMap,
  setFilterType,
  setMissingEdgeOption,
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
} = combinedSlice.actions;

export default combinedSlice.reducer;
