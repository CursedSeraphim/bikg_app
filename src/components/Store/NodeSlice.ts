import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as d3 from 'd3';

const DEFAULT_NODE_SIZE = 3;
const DEFAULT_NODE_COLOR = 0x999999;

interface Node {
  id: string;
  x: number;
  y: number;
  size: number;
  color: number; // in hex
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
    loadNodes: (state, action) => {
      // only if not undefined
      if (action.payload !== undefined) {
        // action.payload comes as a json string
        const parsed = JSON.parse(action.payload);
        const { data } = parsed;
        for (let i = 0; i < data.length; i++) {
          const node = { id: data[i].node, x: data[i].x, y: data[i].y, size: DEFAULT_NODE_SIZE, color: DEFAULT_NODE_COLOR };
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

export const { addNode, loadNodes } = CSVSlice.actions;

export default CSVSlice.reducer;
