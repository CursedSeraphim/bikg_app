// CombinedSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import * as N3 from 'n3';
import { NamedNode, Store } from 'n3';
import { ScatterData, dataToScatterDataArray } from '../EmbeddingView/csvToPlotlyScatterData';
import { CsvData } from './types';
import { fetchSelectedNodesAndValueCountsGivenFeatureCategorySelection as fetchFeatureCategorySelection } from '../../api';

interface CytoNode {
  data: {
    id: string;
    label?: string;
    selected?: boolean;
    visible?: boolean;
    permanent?: boolean;
  };
  position?: {
    x: number;
    y: number;
  };
  grabbable?: boolean;
  locked?: boolean;
}

interface CytoEdge {
  data: {
    id: string;
    source: string;
    target: string;
    label?: string;
    visible?: boolean;
    permanent?: boolean;
  };
}

interface CytoData {
  nodes: CytoNode[];
  edges: CytoEdge[];
}

export interface RdfState {
  rdfString: string;
}

interface CombinedState {
  samples: CsvData[];
  selectedNodes: string[];
  selectedTypes: string[];
  selectedViolations: string[];
  rdfString: string;
  violations: string[]; // list of possible violation source shapes
}

const initialState: CombinedState = {
  samples: [],
  selectedNodes: [],
  selectedTypes: [],
  selectedViolations: [],
  rdfString: '',
  violations: [],
};

const combinedSlice = createSlice({
  name: 'combined',
  initialState,
  reducers: {
    setViolations: (state, action) => {
      console.log('setViolations');
      state.violations = JSON.parse(action.payload);
    },
    setCsvData: (state, action) => {
      console.log('setCsvData');
      state.samples = action.payload;
    },
    setSelectedFocusNodesUsingFeatureCategories: (state, action) => {
      console.log('setSelectedFocusNodesUsingFeatureCategories');
      const { selectedNodes, valueCounts } = action.payload;
      state.selectedNodes = selectedNodes;

      // Use a Set to store keys with value > 1
      const selectedViolations = new Set();

      // Iterate through violations and check if any of their corresponding values in valueCounts is non-zero
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

      // Set state.selectedViolations to the new list (convert Set to Array)
      state.selectedViolations = Array.from(selectedViolations) as string[];

      // convert valueCoutns['rdf:type'] from a dictionary of coutns per category, to a list of categories with > 1 counts
      const typeCounts = valueCounts['rdf:type'];
      state.selectedTypes = Object.entries(typeCounts)
        .filter(([category, count]) => (count as number) > 1)
        .map(([category, count]) => category);
    },

    setSelectedFocusNodes: (state, action) => {
      console.log('setSelectedFocusNodes');
      state.selectedNodes = action.payload;

      // Initiate an empty array to hold types of selected nodes
      state.selectedTypes = []; // use the state field instead of a local variable

      // create map from state.violations array, initialized with 0 at each violation key
      const violationMap = new Map();
      state.violations.forEach((violation) => {
        violationMap.set(violation, 0);
      });

      // Iterate over each selected node
      state.selectedNodes.forEach((selectedNode) => {
        // Find the corresponding sample for the selected node
        const correspondingSample = state.samples.find((sample) => sample.focus_node === selectedNode);

        // check all violations in state.violations, if a violation is found, increment the value in the map
        state.violations.forEach((violation) => {
          if (correspondingSample && correspondingSample[`${violation}`]) {
            violationMap.set(violation, violationMap.get(violation) + 1);
          }
        });

        if (correspondingSample) {
          // If the sample has a type, add it to the selectedTypes array
          const sampleType = String(correspondingSample['rdf:type']);
          if (sampleType && !state.selectedTypes.includes(sampleType)) {
            console.log('New Sample Type:', sampleType); // Log new sample type
            state.selectedTypes.push(sampleType);
          }
        }
      });

      // set state.selectedViolations to the keys of the map with value > 0
      state.selectedViolations = [];
      violationMap.forEach((value, key) => {
        if (value > 0) {
          state.selectedViolations.push(key);
        }
      });
    },
    setSelectedViolations: (state, action) => {
      console.log('setSelectedViolations');
      state.selectedViolations = action.payload;
    },
    setSelectedTypes: (state, action) => {
      console.log('setSelectedTypes');
      state.selectedTypes = action.payload;

      // if selectedTypes is empty, set selectedNodes to empty
      if (state.selectedTypes.length === 0) {
        state.selectedNodes = [];
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
    },
    setRdfString: (state, action) => {
      console.log('setRdfString');
      state.rdfString = action.payload;
    },
  },
});

export const selectBarPlotData = (state: { combined: CombinedState }): CombinedState => {
  return {
    selectedNodes: state.combined.selectedNodes,
    selectedTypes: state.combined.selectedTypes,
    samples: state.combined.samples,
    rdfString: state.combined.rdfString,
    violations: state.combined.violations,
    selectedViolations: state.combined.selectedViolations,
  };
};

export const selectCsvDataForPlotly = (state: { combined: CombinedState }): ScatterData[] => {
  return dataToScatterDataArray(state.combined.samples);
};

export const selectSelectedViolations = (state: { combined: CombinedState }) => state.combined.selectedViolations;

export const selectViolations = (state: { combined: CombinedState }) => state.combined.violations; // Add a selector for violations

export const selectCsvData = (state: { combined: CombinedState }) => state.combined.samples;

export const selectSelectedFocusNodes = (state: { combined: CombinedState }) => state.combined.selectedNodes;

export const selectSelectedTypes = (state: { combined: CombinedState }) => state.combined.selectedTypes;

export const selectRdfData = (state: { combined: CombinedState }) => state.combined.rdfString;

function shortenURI(uri: string, prefixes: { [key: string]: string }): string {
  for (const [prefix, prefixURI] of Object.entries(prefixes)) {
    if (uri.startsWith(prefixURI)) {
      return uri.replace(prefixURI, `${prefix}:`);
    }
  }
  return uri;
}

const mapQuadToShortenedResult = (quad: any, prefixes: { [key: string]: string }) => {
  return {
    subject: shortenURI(quad.subject.id, prefixes),
    predicate: shortenURI(quad.predicate.id, prefixes),
    object: shortenURI(quad.object.id, prefixes),
  };
};

export const selectSubClassesAndViolations = async (state: { combined: CombinedState }): Promise<any[]> => {
  const { samples, selectedNodes, selectedTypes, selectedViolations, rdfString, violations } = state.combined;
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

export const selectSubClassOfTuples = async (state: { rdf: RdfState }): Promise<any[]> => {
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
      subject: shortenURI(quad.subject.id, prefixes),
      predicate: shortenURI(quad.predicate.id, prefixes),
      object: shortenURI(quad.object.id, prefixes),
    };
  });
};

export const selectAllTriples = async (state: { combined: CombinedState }): Promise<any> => {
  const { samples, selectedNodes, selectedTypes, selectedViolations, rdfString, violations } = state.combined;
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
      subject: shortenURI(quad.subject.id, prefixes),
      predicate: shortenURI(quad.predicate.id, prefixes),
      object: shortenURI(quad.object.id, prefixes),
    };
  });
  const hiddenTriples = allHiddenTuples.map((quad) => {
    return {
      subject: shortenURI(quad.subject.id, prefixes),
      predicate: shortenURI(quad.predicate.id, prefixes),
      object: shortenURI(quad.object.id, prefixes),
    };
  });
  return { visibleTriples, hiddenTriples };
};

// TODO, if this is needed again add the prefix logic from selectSubClassOfTuples
export const selectSubClassOrObjectPropertyTuples = async (state: { rdf: RdfState }): Promise<any[]> => {
  const { rdfString } = state.rdf;
  const store: Store = new N3.Store();
  const parser: N3.Parser = new N3.Parser();
  await new Promise<void>((resolve, reject) => {
    parser.parse(rdfString, (error, quad, _prefixes) => {
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
      subject: quad.subject.id,
      predicate: quad.predicate.id,
      object: quad.object.id,
    };
  });
};

/**
 * Function that serves as glue between the Cytoscape component and the N3 data from the CombinedSlice Redux store.
 * @param state The Redux store state.
 * @returns The Cytoscape data.
 */
export const selectCytoData = async (state: { combined: CombinedState }): Promise<CytoData> => {
  const { visibleTriples, hiddenTriples } = await selectAllTriples(state);
  const nodes: CytoNode[] = [];
  const edges: CytoEdge[] = [];

  // Function to add or update a node
  const addOrUpdateNode = (id: string, visible: boolean) => {
    const node = nodes.find((n) => n.data.id === id);

    if (node) {
      // If the node already exists, update its visible property
      node.data.visible = visible;
      node.data.permanent = visible;
    } else {
      // If the node does not exist, create it
      nodes.push({ data: { id, visible, permanent: visible } });
    }
  };

  // Iterate over the hidden triples and add or update nodes
  hiddenTriples.forEach((t) => {
    addOrUpdateNode(t.subject, false);
    addOrUpdateNode(t.object, false);

    edges.push({
      data: {
        id: `${t.subject}_${t.object}`,
        source: t.subject,
        target: t.object,
        label: t.predicate,
        visible: false,
        permanent: false,
      },
    });
  });

  // Iterate over the visible triples and add or update nodes
  visibleTriples.forEach((t) => {
    addOrUpdateNode(t.subject, true);
    addOrUpdateNode(t.object, true);

    edges.push({
      data: {
        id: `${t.subject}_${t.object}`,
        source: t.subject,
        target: t.object,
        label: t.predicate,
        visible: true,
        permanent: true,
      },
    });
  });

  return { nodes, edges };
};

export default combinedSlice.reducer;

export const {
  setSelectedViolations,
  setViolations,
  setCsvData,
  setSelectedFocusNodesUsingFeatureCategories,
  setSelectedFocusNodes,
  setSelectedTypes,
  setRdfString,
} = combinedSlice.actions;
