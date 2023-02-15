import { createSlice, createSelector } from '@reduxjs/toolkit';

// write a state for a string object
export interface RdfState {
  data: string;
}

// set the initial state
const initialState: RdfState = {
  data: '',
};

// create a slice
const rdfSlice = createSlice({
  name: 'rdf',
  initialState,
  reducers: {
    setRdfData: (state, action) => {
      state.data = action.payload;
    },
  },
});

// export the state
export const selectRdfData = (state: { rdf: RdfState }) => state.rdf.data;

// export the reducer
export default rdfSlice.reducer;

// export the actions
export const { setRdfData } = rdfSlice.actions;
