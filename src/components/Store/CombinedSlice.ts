// CombinedSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import * as N3 from 'n3';
import { NamedNode, Store } from 'n3';
import { ScatterData, dataToScatterDataArray } from '../EmbeddingView/csvToPlotlyScatterData';
import { CsvData } from './types';

interface CytoNode {
  data: {
    id: string;
    label?: string;
    selected?: boolean;
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
  rdfString: string;
  violations: string[]; // list of possible violation source shapes
}

const initialState: CombinedState = {
  samples: [],
  selectedNodes: [],
  selectedTypes: [],
  rdfString: '',
  violations: [],
};

const combinedSlice = createSlice({
  name: 'combined',
  initialState,
  reducers: {
    setViolations: (state, action) => {
      state.violations = JSON.parse(action.payload);
    },
    setCsvData: (state, action) => {
      state.samples = action.payload;
    },
    setSelectedFocusNodes: (state, action) => {
      state.selectedNodes = action.payload;

      // Initiate an empty array to hold types of selected nodes
      state.selectedTypes = []; // use the state field instead of a local variable

      // Iterate over each selected node
      state.selectedNodes.forEach((selectedNode) => {
        // Find the corresponding sample for the selected node
        const correspondingSample = state.samples.find((sample) => sample.focus_node === selectedNode);
        if (correspondingSample) {
          // If the sample has a type, add it to the selectedTypes array
          const sampleType = String(correspondingSample['rdf:type']);
          if (sampleType && !state.selectedTypes.includes(sampleType)) {
            state.selectedTypes.push(sampleType);
          }
        }
      });
    },
    setSelectedTypes: (state, action) => {
      state.selectedTypes = action.payload;

      // if selectedTypes is empty, set selectedNodes to empty
      if (state.selectedTypes.length === 0) {
        state.selectedNodes = [];
        return;
      }

      // Initiate an empty array to hold focus nodes of selected types
      state.selectedNodes = [];

      // Iterate over each sample
      state.samples.forEach((sample) => {
        // If the sample's type is in the selected types array, add its focus node to the selectedNodes array
        if (state.selectedTypes.includes(String(sample['rdf:type']))) {
          state.selectedNodes.push(sample.focus_node);
        }
      });
    },
    setRdfString: (state, action) => {
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
  };
};

export const selectCsvDataForPlotly = (state: { combined: CombinedState }): ScatterData[] => {
  return dataToScatterDataArray(state.combined.samples);
};

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
export const selectCytoData = async (state: { rdf: RdfState }): Promise<CytoData> => {
  // const subClassOfTuples = await selectSubClassOrObjectPropertyTuples(state);
  const subClassOfTuples = await selectSubClassOfTuples(state);
  const nodes: CytoNode[] = [];
  const edges: CytoEdge[] = [];

  // Iterate over the subClassOfTuples and create a node for each unique subject and object
  // Also create an edge for each subClassOf relation
  subClassOfTuples.forEach((tuple) => {
    const sourceNode = nodes.find((node) => node.data.id === tuple.subject);
    if (!sourceNode) {
      nodes.push({ data: { id: tuple.subject } });
    }

    const targetNode = nodes.find((node) => node.data.id === tuple.object);
    if (!targetNode) {
      nodes.push({ data: { id: tuple.object } });
    }

    edges.push({
      data: {
        id: `${tuple.subject}_${tuple.object}`,
        source: tuple.subject,
        target: tuple.object,
        label: tuple.predicate,
      },
    });
  });

  return { nodes, edges };
};

export default combinedSlice.reducer;

export const { setViolations, setCsvData, setSelectedFocusNodes, setSelectedTypes, setRdfString } = combinedSlice.actions;
