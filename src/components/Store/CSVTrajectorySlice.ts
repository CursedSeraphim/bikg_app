import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as d3 from 'd3';

interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface CSVSliceState {
  edges: Edge[];
}

const initialState: CSVSliceState = {
  // initialize such that the initial state is not undefined
  edges: [],
};

const CSVTrajectorySlice = createSlice({
  name: 'csv2',
  initialState,
  reducers: {
    addEdge: (state, action: PayloadAction<Edge>) => {
      state.edges.push(action.payload);
    },
    loadEdges: (state, action) => {
      // only if not undefined
      if (action.payload !== undefined) {
        // action.payload comes as a json string
        const parsed = JSON.parse(action.payload);
        const data = parsed.data
        for (let i = 0; i < data.length; i++) {
          const edge = { x1: data[i].x1, y1: data[i].y1, x2: data[i].x2, y2: data[i].y2 };
          state.edges.push(edge);
        }
      }
    },
  },
});

// log during selectEdges
export const selectEdges = (state: { csv2: CSVSliceState }) => {
  return state.csv2.edges;
};
// export const selectEdges = (state: { csv: CSVSliceState }) => {state.csv.edges};

export const { addEdge, loadEdges } = CSVTrajectorySlice.actions;

export default CSVTrajectorySlice.reducer;
