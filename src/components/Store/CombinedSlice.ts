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
  ICytoData,
  ICytoNode,
  ICytoEdge,
  ICsvData,
  FilterType,
  MissingEdgeOptionType,
  EdgeCountDict,
  FocusNodeExemplarDict,
  ExemplarFocusNodeDict,
} from '../../types';
// import { CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING, CSV_EDGE_NOT_IN_ONTOLOGY_STRING } from '../../constants';
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
};

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

// TODO set types of payloadaction for all reducers
const combinedSlice = createSlice({
  name: 'combined',
  initialState,
  reducers: {
    setSelectedViolationExemplars: (state, action: PayloadAction<string[]>) => {
      state.selectedViolationExemplars = action.payload;
    },
    setEdgeCountDict: (state, action: PayloadAction<EdgeCountDict>) => {
      state.edgeCountDict = action.payload;
      console.log('setEdgeCountDict', action.payload);
    },
    setFocusNodeExemplarDict: (state, action: PayloadAction<FocusNodeExemplarDict>) => {
      state.focusNodeExemplarDict = action.payload;
      console.log('setFocusNodeExemplarDict', action.payload);
    },
    setExemplarFocusNodeDict: (state, action: PayloadAction<ExemplarFocusNodeDict>) => {
      state.exemplarFocusNodeDict = action.payload;
      console.log('setExemplarFocusNodeDict', action.payload);
    },
    setMissingEdgeOption: (state, action: PayloadAction<MissingEdgeOptionType>) => {
      state.missingEdgeOption = action.payload;
      if (state.missingEdgeOption === 'remove') {
        state.samples = removeNanEdges(state.originalSamples);
      } else if (state.missingEdgeOption === 'keep') {
        state.samples = [...state.originalSamples];
      }
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
    },
    setSelectedFocusNodesUsingFeatureCategories: (state, action) => {
      console.log('setSelectedFocusNodesUsingFeatureCategories', action.payload);
      const { selectedNodes, valueCounts } = action.payload;
      state.selectedNodes = selectedNodes;

      updateSelectedViolations(state, valueCounts);
      updateSelectedTypes(state, valueCounts);
      updateSelectedViolationExemplars(state);
    },
    setSelectedFocusNodes: (state, action) => {
      console.log('setSelectedFocusNodes', action.payload);
      state.selectedNodes = action.payload;

      // Convert state.samples into an object for O(1) lookup
      const samplesMap = {};
      state.samples.forEach((sample) => {
        samplesMap[sample.focus_node] = sample;
      });

      // Initiate a violation map with 0 at each violation key
      const violationMap = new Map();
      state.violations.forEach((violation) => {
        violationMap.set(violation, 0);
      });

      // Use a Set to store selected types
      const selectedTypes = new Set();

      // Iterate over selected nodes
      state.selectedNodes.forEach((selectedNode) => {
        const correspondingSample = samplesMap[selectedNode];

        if (!correspondingSample) return; // if no corresponding sample is found, skip

        state.violations.forEach((violation) => {
          if (correspondingSample[violation]) {
            violationMap.set(violation, violationMap.get(violation) + 1);
          }
        });

        // If the sample has a type, add it to the selectedTypes set
        const sampleType = String(correspondingSample['rdf:type']);
        if (sampleType) selectedTypes.add(sampleType);
      });

      // Convert selectedTypes set back to array
      state.selectedTypes = Array.from(selectedTypes) as string[];

      // Set state.selectedViolations to the keys of the map with value > 0
      state.selectedViolations = Array.from(violationMap.entries())
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([key, value]) => value > 0)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(([key, value]) => key);

      console.log('udpating selected violation exemplars');
      updateSelectedViolationExemplars(state);
    },
    setSelectedViolations: (state, action) => {
      console.log('setSelectedViolations');
      state.selectedViolations = action.payload;
    },
    setSelectedTypes: (state, action) => {
      state.selectedTypes = action.payload;

      // if selectedTypes is empty, set selectedNodes to empty
      if (state.selectedTypes.length === 0) {
        state.selectedNodes = [];
        state.selectedViolations = [];
        return;
      }

      // Initiate an empty array to hold focus nodes of selected types
      state.selectedNodes = [];

      // create map from state.violations array, initialized with 0 at each violation key
      const violationMap = new Map();
      state.violations.forEach((violation) => {
        violationMap.set(violation, 0);
      });

      // Iterate over each sample
      state.samples.forEach((sample) => {
        // If the sample's type is in the selected types array, add its focus node to the selectedNodes array
        if (state.selectedTypes.includes(String(sample['rdf:type']))) {
          state.selectedNodes.push(sample.focus_node);
          state.violations.forEach((violation) => {
            if (sample && sample[`${violation}`]) {
              violationMap.set(violation, violationMap.get(violation) + 1);
            }
          });
        }
      });
      // set state.selectedViolations to the keys of the map with value > 0
      state.selectedViolations = [];
      violationMap.forEach((value, key) => {
        if (value > 0) {
          state.selectedViolations.push(key);
        }
      });

      updateSelectedViolationExemplars(state);
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
  const { rdfString } = state.rdf;
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
  const subClassOfTuples = store.getQuads(null, subClassOfPredicate, null);
  // map each quad to a tuple of subject, predicate, object in a named way (subject, predicate, object)
  // In selectSubClassOfTuples and selectSubClassOrObjectPropertyTuples functions
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
  const typesToInclude = new Set(['owl:ObjectProperty', 'owl:Class', 'sh:PropertyShape']);

  [...visibleTriples, ...hiddenTriples].forEach((t) => {
    if (typesToInclude.has(t.o)) {
      objectProperties.set(t.s, t.o);
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
 */
const processTriples = (triples, visible, nodes, edges, objectProperties) => {
  triples.forEach((t) => {
    const findOrAddNode = (id, label) => {
      let node = nodes.find((n) => n.data.id === id);
      if (!node) {
        node = { data: { id, label, visible, permanent: visible } };
        nodes.push(node);
      } else if (visible) {
        node.data.visible = node.data.permanent = visible;
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
      },
    });
  });
};

/**
 * Method to select and create CytoData based on the provided rdfString.
 * This function creates Nodes and Edges based on visible and hidden triples and returns.
 *
 * @param {string} rdfString string in Resource Description Framework format.
 * @returns {Object} An object containing array of Nodes and Edges.
 */
export const selectCytoData = async (rdfString) => {
  const { visibleTriples, hiddenTriples } = await selectAllTriples(rdfString);

  const nodes = [];
  const edges = [];

  const objectProperties = calculateObjectProperties(visibleTriples, hiddenTriples);

  processTriples(hiddenTriples, false, nodes, edges, objectProperties);
  processTriples(visibleTriples, true, nodes, edges, objectProperties);

  return { nodes, edges };
};

export const {
  setSelectedViolations,
  setViolations,
  setCsvData,
  setSelectedFocusNodesUsingFeatureCategories,
  setSelectedFocusNodes,
  setSelectedTypes,
  setRdfString,
  setViolationTypesMap,
  setTypesViolationMap,
  setFilterType,
  setMissingEdgeOption,
  setEdgeCountDict,
  setFocusNodeExemplarDict,
  setExemplarFocusNodeDict,
  setSelectedViolationExemplars,
} = combinedSlice.actions;

export default combinedSlice.reducer;
