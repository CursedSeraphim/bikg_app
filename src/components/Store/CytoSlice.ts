// CytoSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
  selected: boolean;
}

interface Edge {
  data: {
    id: string;
    source: string;
    target: string;
    label?: string;
  };
}

export interface CytoSliceState {
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
        const data = JSON.parse(action.payload);
        state.nodes = data.data.nodes;
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
