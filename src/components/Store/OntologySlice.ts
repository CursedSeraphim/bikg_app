import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as d3 from 'd3';

export interface RDFTuple {
  subject: string;
  predicate: string;
  object: string;
}

export interface OntologySliceState {
  tuples: RDFTuple[];
}

const initialState: OntologySliceState = {
  tuples: [],
};

const OntologySlice = createSlice({
  name: 'ontology',
  initialState,
  reducers: {
    addData: (state, action: PayloadAction<OntologySliceState>) => {
      // efficiently append tuples and edges using ...
      state.tuples = [...state.tuples, ...action.payload.tuples];
    },
    loadOntology: (state, action) => {
      if (action.payload !== undefined) {
        const data = JSON.parse(action.payload);
        state.tuples = data.data;
      }
    },
  },
});

export const selectOntology = (state: { ontology: OntologySliceState }) => {
  return {
    tuples: state.ontology.tuples,
  };
};

export const { addData, loadOntology } = OntologySlice.actions;

export default OntologySlice.reducer;
