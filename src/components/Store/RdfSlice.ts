import { createSlice } from '@reduxjs/toolkit';
import * as N3 from 'n3';
import { NamedNode } from 'n3';
import type { Store } from 'n3';
import type { Reducer } from 'redux';

export const selectSubClassOfTuples = (state: { rdf: RdfState }) => {
  const { rdfString } = state.rdf;
  const store: Store = new N3.Store();
  const parser: N3.Parser = new N3.Parser();
  parser.parse(rdfString, (error, quad, _prefixes) => {
    if (quad) {
      store.addQuad(quad);
    } else {
      console.log('Finished parsing!');
      console.log('store before filtering', store);
      const subClassOfPredicate = new NamedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf');
      const subClassOfTuples = store.getQuads(null, subClassOfPredicate, null);
      console.log('store after filtering', subClassOfTuples);
      return subClassOfTuples;
    }
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
      console.log('Finished parsing!');
      console.log('store before filtering', store);
      const subClassOfPredicate = new NamedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf');
      const objectPropertyPredicate = new NamedNode('http://www.w3.org/2002/07/owl#ObjectProperty');
      const subClassOrObjectPropertyTuples = store.getQuads(null, subClassOfPredicate, null).concat(store.getQuads(null, null, objectPropertyPredicate));
      console.log('store after filtering', subClassOrObjectPropertyTuples);
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
