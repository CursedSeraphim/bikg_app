// CombinedSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
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
  INumberViolationsPerTypeMap,
  IViolationMap,
  ITypeMap,
  IExemplarMap,
  IFocusNodeMap,
  OntologyTree,
  INumberViolationsPerTypeValue,
} from '../../types';
import { CSV_EDGE_NOT_IN_ONTOLOGY_STRING } from '../../constants';

const initialState: ICombinedState = {
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
  numberViolationsPerType: {},
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

function constructViolationsPerTypeValueObject(): INumberViolationsPerTypeValue {
  return {
    violations: 0,
    selected: 0,
    cumulativeViolations: 0,
    cumulativeSelected: 0,
  };
}

function setNumberViolationsPerType(state: ICombinedState): void {
  const numberViolationsPerType: INumberViolationsPerTypeMap = {};
  state.samples.forEach((sample: ICsvData) => {
    const sampleType = String(sample['rdf:type']);
    if (!sampleType) return; // Skip if no type is found

    if (!numberViolationsPerType[sampleType]) {
      numberViolationsPerType[sampleType] = constructViolationsPerTypeValueObject(); // Initialize if necessary
    }

    numberViolationsPerType[sampleType].violations += 1; // Increment the total count of violations
  });

  state.numberViolationsPerType = numberViolationsPerType;
}

function setNumberViolationsPerTypeGivenType(state: ICombinedState): void {
  // Create a new object to store the updated numberViolationsPerType
  const newNumberViolationsPerType: INumberViolationsPerTypeMap = { ...state.numberViolationsPerType };

  // Loop through all the keys in numberViolationsPerType to reset 'selected' count to zero
  Object.keys(newNumberViolationsPerType).forEach((type) => {
    newNumberViolationsPerType[type].selected = 0;
  });

  // Update 'selected' count in the new object based on new selected types
  state.selectedTypes.forEach((type) => {
    if (newNumberViolationsPerType[type]) {
      newNumberViolationsPerType[type].selected = newNumberViolationsPerType[type].violations;
    }
  });

  // Now, we update the state all at once
  state.numberViolationsPerType = newNumberViolationsPerType;
}

function calculateNewNumberViolationsPerType(samples, existingNumberViolationsPerType, newSelectedNodes) {
  const focusNodesSamplesMap = {};
  samples.forEach((sample) => {
    focusNodesSamplesMap[sample.focus_node] = sample;
  });

  // Initialize newNumberViolationsPerType based on existing state
  const newNumberViolationsPerType = { ...existingNumberViolationsPerType };

  // Reset the 'selected' counts to 0
  Object.keys(newNumberViolationsPerType).forEach((type) => {
    newNumberViolationsPerType[type].selected = 0;
  });

  newSelectedNodes.forEach((selectedNode) => {
    const correspondingSample = focusNodesSamplesMap[selectedNode];

    if (!correspondingSample) return;

    const sampleType = String(correspondingSample['rdf:type']);
    if (sampleType && newNumberViolationsPerType[sampleType]) {
      newNumberViolationsPerType[sampleType].selected++;
    }
  });

  return newNumberViolationsPerType;
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
      .filter(([_, value]) => value > 0)
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
    setOntologyTree: (state, action: PayloadAction<OntologyTree>) => {
      state.ontologyTree = action.payload;
      console.log('setOntologyTree', state.ontologyTree);
    },
    setViolationMap: (state, action: PayloadAction<IViolationMap>) => {
      state.violationMap = action.payload;
      console.log('setViolationMap', state.violationMap);
    },
    setTypeMap: (state, action: PayloadAction<ITypeMap>) => {
      state.typeMap = action.payload;
      console.log('setTypeMap', state.typeMap);
    },
    setExemplarMap: (state, action: PayloadAction<IExemplarMap>) => {
      state.exemplarMap = action.payload;
      console.log('setExemplarMap', state.exemplarMap);
    },
    setFocusNodeMap: (state, action: PayloadAction<IFocusNodeMap>) => {
      state.focusNodeMap = action.payload;
      console.log('setFocusNodeMap', state.focusNodeMap);
    },
    setSubClassOfTriples: (state, action: PayloadAction<ITriple[]>) => {
      state.subClassOfTriples = action.payload;
      console.log('setSubClassOfTriples');
    },
    setTypes: (state, action: PayloadAction<string[]>) => {
      state.types = action.payload;
      console.log('set types');
    },
    setNamespaces: (state, action: PayloadAction<INamespaces>) => {
      state.namespaces = action.payload;
      console.log('set namespaces');
    },
    setSelectedViolationExemplars: (state, action: PayloadAction<string[]>) => {
      // uses exemplars to select all focus nodes with those exemplars
      // then uses nodes to select all types and violations of those nodes and their exemplars
      console.log('selectedViolationExemplars', action.payload);
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

      const newNumberViolationsPerType = calculateNewNumberViolationsPerType(state.samples, state.numberViolationsPerType, state.selectedNodes);
      state.numberViolationsPerType = newNumberViolationsPerType;

      console.timeEnd('setSelectedViolationExemplars');
    },
    setEdgeCountDict: (state, action: PayloadAction<EdgeCountDict>) => {
      state.edgeCountDict = action.payload;
      console.log('setEdgeCountDict');
    },
    setFocusNodeExemplarDict: (state, action: PayloadAction<FocusNodeExemplarDict>) => {
      console.log('setFocusNodeExemplarDict');
      state.focusNodeExemplarDict = action.payload;
    },
    setExemplarFocusNodeDict: (state, action: PayloadAction<ExemplarFocusNodeDict>) => {
      console.log('setExemplarFocusNodeDict');
      state.exemplarFocusNodeDict = action.payload;
    },
    setMissingEdgeOption: (state, action: PayloadAction<MissingEdgeOptionType>) => {
      state.missingEdgeOption = action.payload;
      if (state.missingEdgeOption === 'remove') {
        state.samples = removeNanEdges(state.originalSamples);
      } else if (state.missingEdgeOption === 'keep') {
        state.samples = [...state.originalSamples];
      }
      setNumberViolationsPerType(state);
      updateFocusNodeSampleMap(state);
    },
    setFilterType: (state, action: PayloadAction<FilterType>) => {
      state.filterType = action.payload;
    },
    setViolationTypesMap: (state, action) => {
      console.log('setViolationTypesMap');
      state.violationTypesMap = action.payload;
    },
    setTypesViolationMap: (state, action) => {
      console.log('setTypesViolationMap');
      state.typesViolationMap = action.payload;
    },
    setViolations: (state, action) => {
      console.log('setViolations');
      state.violations = JSON.parse(action.payload);
    },
    setCsvData: (state, action) => {
      console.log('setCsvData');
      state.originalSamples = action.payload;
      if (state.missingEdgeOption === 'remove') {
        state.samples = removeNanEdges(action.payload);
      } else if (state.missingEdgeOption === 'keep') {
        state.samples = action.payload;
      }
      setNumberViolationsPerType(state);
      updateFocusNodeSampleMap(state);
    },
    setSelectedFocusNodesUsingFeatureCategories: (state, action) => {
      console.log('setSelectedFocusNodesUsingFeatureCategories');
      const { selectedNodes, valueCounts } = action.payload;
      state.selectedNodes = selectedNodes;

      updateSelectedViolations(state, valueCounts);
      updateSelectedTypes(state, valueCounts);
      updateSelectedViolationExemplars(state);
      setNumberViolationsPerTypeGivenType(state);
    },
    setSelectedFocusNodes: (state, action) => {
      // TODO rework with new maps
      console.log('setSelectedFocusNodes');
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

      // Prepare a new object for updating numberViolationsPerType
      const newNumberViolationsPerType: INumberViolationsPerTypeMap = { ...state.numberViolationsPerType };

      // Reset the 'selected' counts to 0
      Object.keys(newNumberViolationsPerType).forEach((type) => {
        newNumberViolationsPerType[type][1] = 0;
      });

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

          // Update the 'selected' count in the new object based on new selected nodes
          if (newNumberViolationsPerType[sampleType]) {
            newNumberViolationsPerType[sampleType][1]++;
          }
        }
      });

      // Convert selectedTypes set back to array
      const newSelectedTypes = Array.from(selectedTypesSet);

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
      state.numberViolationsPerType = newNumberViolationsPerType;

      console.log('updating selected violation exemplars');
      updateSelectedViolationExemplars(state);
    },

    setSelectedViolations: (state, action) => {
      // use violations to select all focus nodes with those violations
      // then use nodes to select all types and violations of those nodes and their exemplars
      console.log('selectedViolations', action.payload);
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

      const newNumberViolationsPerType = calculateNewNumberViolationsPerType(state.samples, state.numberViolationsPerType, state.selectedNodes);
      state.numberViolationsPerType = newNumberViolationsPerType;

      console.timeEnd('setSelectedViolations');
    },
    setSelectedTypes: (state, action) => {
      console.log('selectedTypes', action.payload);
      console.time('setSelectedTypes');
      state.selectedTypes = action.payload;
      setNumberViolationsPerTypeGivenType(state);

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

      const newNumberViolationsPerType = calculateNewNumberViolationsPerType(state.samples, state.numberViolationsPerType, state.selectedNodes);
      state.numberViolationsPerType = newNumberViolationsPerType;
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

      const newNumberViolationsPerType = calculateNewNumberViolationsPerType(state.samples, state.numberViolationsPerType, state.selectedNodes);
      state.numberViolationsPerType = newNumberViolationsPerType;
    },
    setRdfString: (state, action) => {
      console.log('setRdfString');
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
 */
const processTriples = (triples, visible, nodes, edges, objectProperties, getColorForNamespace, violations, types) => {
  triples.forEach((t) => {
    const extractNamespace = (uri) => {
      const match = uri.match(/^([^:]+):/);
      return match ? match[1] : '';
    };

    const findOrAddNode = (id, label) => {
      let node = nodes.find((n) => n.data.id === id);
      if (!node) {
        const namespace = extractNamespace(id);
        const defaultColor = getColorForNamespace(namespace, false);
        const selectedColor = getColorForNamespace(namespace, true);
        node = {
          data: {
            id,
            label,
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
 * @returns {Object} An object containing array of Nodes and Edges.
 */
export const selectCytoData = async (rdfString, getShapeForNamespace, violations, types) => {
  // ... same as before
  const { visibleTriples, hiddenTriples } = await selectAllTriples(rdfString);

  const nodes = [];
  const edges = [];

  const objectProperties = calculateObjectProperties(visibleTriples, hiddenTriples);
  processTriples(hiddenTriples, false, nodes, edges, objectProperties, getShapeForNamespace, violations, types);
  processTriples(visibleTriples, true, nodes, edges, objectProperties, getShapeForNamespace, violations, types);

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
} = combinedSlice.actions;

export default combinedSlice.reducer;
