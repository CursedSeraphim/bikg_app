import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as d3 from 'd3';

// TODO add x y coordinates to nodes
interface Node {
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

interface Edge {
  data: {
    id: string;
    source: string;
    target: string;
    label?: string;
  };
}

interface CytoSliceState {
  nodes: Node[];
  edges: Edge[];
}

const initialState: CytoSliceState = {
  // initialize such that the initial state is not undefined
  nodes: [],
  edges: [],
};

const CytoSlice = createSlice({
  name: 'cyto',
  initialState,
  reducers: {
    addData: (state, action: PayloadAction<CytoSliceState>) => {
      // efficiently append nodes and edges using ...
      state.nodes = [...state.nodes, ...action.payload.nodes];
      state.edges = [...state.edges, ...action.payload.edges];
    },
    loadCytoData: (state, action) => {
      if (action.payload !== undefined) {
        // const data = JSON.parse(action.payload);
        // state.data.nodes = data.nodes;
        // state.data.edges = data.edges;
        const data = JSON.parse(action.payload);
        state.nodes = data.data.nodes;
        console.log('state.nodes', state.nodes)
        state.edges = data.data.edges;
      }
    },
  },
});

export const selectCytoData = (state: { cyto: CytoSliceState }) => {
  return {
    nodes: state.cyto.nodes,
    edges: state.cyto.edges,
  };
};

export const { addData, loadCytoData } = CytoSlice.actions;

export default CytoSlice.reducer;
