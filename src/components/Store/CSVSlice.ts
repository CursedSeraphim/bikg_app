import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as d3 from 'd3';

interface Node {
  id: string;
  x: number;
  y: number;
}

interface CSVSliceState {
  nodes: Node[];
}

const initialState: CSVSliceState = {
  // initialize such that the initial state is not undefined
  nodes: [],
};

const CSVSlice = createSlice({
  name: 'csv',
  initialState,
  reducers: {
    addNode: (state, action: PayloadAction<Node>) => {
      state.nodes.push(action.payload);
    },
    loadCSV: (state, action) => {
      // only if not undefined
      if (action.payload !== undefined) {
        // action.payload comes as a json string
        const parsed = JSON.parse(action.payload);
        const data = parsed.data
        for (let i = 0; i < data.length; i++) {
          const node = { id: data[i].node, x: data[i].x, y: data[i].y };
          state.nodes.push(node);
        }
      }
    },
  },
});

// log during selectNodes
export const selectNodes = (state: { csv: CSVSliceState }) => {
  return state.csv.nodes;
};
// export const selectNodes = (state: { csv: CSVSliceState }) => {state.csv.nodes};

export const { addNode, loadCSV } = CSVSlice.actions;

export default CSVSlice.reducer;
