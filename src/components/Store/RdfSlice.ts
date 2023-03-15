import { createSlice } from '@reduxjs/toolkit';
import * as N3 from 'n3';
import { NamedNode } from 'n3';
import type { Store } from 'n3';
import type { Reducer } from 'redux';

// export const selectSubClassOfTuples = async (state: { rdf: RdfState }): Promise<any[]> => {
//   const { rdfString } = state.rdf;
//   const store: Store = new Store();
//   const parser: N3.Parser = new N3.Parser();
//   await new Promise<void>((resolve, reject) => {
//     parser.parse((error, quad, _prefixes) => {
//       if (quad) {
//         store.addQuad(quad);
//       } else if (error) {
//         reject(error);
//       } else {
//         resolve();
//       }
//     });
//   });
//   const subClassOfPredicate = new NamedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf');
//   const subClassOfTuples = store.getQuads(null, subClassOfPredicate, null);
//   return subClassOfTuples.map((quad) => [quad.subject.value, quad.object.value]);
// };

export const selectSubClassOfTuples = (state: { rdf: RdfState }) => {
  const { rdfString } = state.rdf;
  const store: Store = new N3.Store();
  const parser: N3.Parser = new N3.Parser();
  console.log('rdfString in slice', rdfString);
  parser.parse(rdfString, (error, quad, _prefixes) => {
    if (quad) {
      console.log('quad in parser', quad);
      store.addQuad(quad);
    } else if (error) {
      console.log('error in parser', error);
    } else {
      console.log('end of quads, now filtering');
      const subClassOfPredicate = new NamedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf');
      const subClassOfTuples = store.getQuads(null, subClassOfPredicate, null);
      console.log('returning subClassOfTuples', subClassOfTuples);
      return subClassOfTuples;
    }
  });
  return [];
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
