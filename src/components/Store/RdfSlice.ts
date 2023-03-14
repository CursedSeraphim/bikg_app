import { createSlice } from '@reduxjs/toolkit';
import * as N3 from 'n3';
import { NamedNode } from 'n3';
import type { Store } from 'n3';
import type { Reducer } from 'redux';

export interface RdfState {
  rdfString: string;
  rdfGraph?: Store;
}

const initialState: RdfState = {
  rdfString: '',
  rdfGraph: null,
};

const rdfSlice = createSlice({
  name: 'rdf',
  initialState,
  reducers: {
    setRdfString: (state, action) => {
      state.rdfString = action.payload;
    },
    setTtlData: (state, action) => {
      const { payload } = action;

      // Create a new RDF graph
      const store = new N3.Store();

      // Parse the Turtle string into an RDF graph
      const parser = new N3.Parser({ format: 'text/turtle' });

      // Parse the Turtle string into an RDF graph
      parser.parse(payload, (error, quad) => { // TODO change something with this such that the parsed store gets saved in the state
        // Add the quad to the graph
        if (error) {
          console.error(error);
        } else if (quad) {
          store.addQuad(quad);
        } else {
          // end of input
          console.log(`Parsed ${store.size} triples.`);
        }
      });

      // log number of triples in the graph
      console.log(`Parsed ${store.size} triples.`);

      return state;
    },
  },
});

export const selectRdfData = (state: { rdf: RdfState }) => state.rdf.rdfString;

export default rdfSlice.reducer;

export const { setRdfString, setTtlData } = rdfSlice.actions;
