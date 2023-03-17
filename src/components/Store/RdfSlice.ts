import { createSlice } from '@reduxjs/toolkit';
import * as N3 from 'n3';
import { NamedNode, Store } from 'n3';
import type { Reducer } from 'redux';

export const selectSubClassOfTuples = async (state: { rdf: RdfState }): Promise<any[]> => {
  const { rdfString } = state.rdf;
  const store: Store = new Store();
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
  const subClassOfTuples = store.getQuads(null, subClassOfPredicate, null);
  // map each quad to a tuple of subject, predicate, object in a named way (subject, predicate, object)
  return subClassOfTuples.map((quad) => {
    return {
      subject: quad.subject.id,
      predicate: quad.predicate.id,
      object: quad.object.id,
    };
  });
};

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

export interface RdfState {
  rdfString: string;
}

const initialState: RdfState = {
  rdfString: '',
};

interface CytoNode {
  data: {
    id: string;
    label?: string;
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

const rdfSlice = createSlice({
  name: 'rdf',
  initialState,
  reducers: {
    setRdfString: (state, action) => {
      state.rdfString = action.payload;
    },
  },
});

/**
 * Function that serves as glue between the Cytoscape component and the N3 data form the RDFSlice Redux store.
 * @param state The Redux store state.
 * @returns The Cytoscape data.
 */
export const selectCytoData = async (state: { rdf: RdfState }): Promise<CytoData> => {
  const subClassOfTuples = await selectSubClassOrObjectPropertyTuples(state);
  // const subClassOfTuples = await selectSubClassOfTuples(state);
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

export const selectRdfData = (state: { rdf: RdfState }) => state.rdf.rdfString;

export default rdfSlice.reducer;

export const { setRdfString } = rdfSlice.actions;
