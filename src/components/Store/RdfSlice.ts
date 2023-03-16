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

export const selectSubClassOrObjectPropertyTuples = (state: { rdf: RdfState }) => {
  const { rdfString } = state.rdf;
  const store: Store = new N3.Store();
  const parser: N3.Parser = new N3.Parser();
  parser.parse(rdfString, (error, quad, _prefixes) => {
    if (quad) {
      store.addQuad(quad);
    } else {
      const subClassOfPredicate = new NamedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf');
      const objectPropertyPredicate = new NamedNode('http://www.w3.org/2002/07/owl#ObjectProperty');
      const subClassOrObjectPropertyTuples = store.getQuads(null, subClassOfPredicate, null).concat(store.getQuads(null, null, objectPropertyPredicate));
      return subClassOrObjectPropertyTuples;
    }
  });
  return [];
};

export interface RdfState {
  rdfString: string;
}

const initialState: RdfState = {
  rdfString: '',
};

const rdfSlice = createSlice({
  name: 'rdf',
  initialState,
  reducers: {
    setRdfString: (state, action) => {
      state.rdfString = action.payload;
    },
  },
});

export const selectRdfData = (state: { rdf: RdfState }) => state.rdf.rdfString;

export default rdfSlice.reducer;

export const { setRdfString } = rdfSlice.actions;
