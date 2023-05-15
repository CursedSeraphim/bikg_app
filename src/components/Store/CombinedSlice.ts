// CombinedSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ScatterData, dataToScatterDataArray } from '../EmbeddingView/csvToPlotlyScatterData';
import { CsvData } from './types';

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

export interface CsvState {
  samples: CsvData[];
  selectedNodes: string[];
}

const initialState: { cyto: CytoSliceState, csv: CsvState } = {
  cyto: {
    nodes: [],
    edges: [],
  },
  csv: {
    samples: [],
    selectedNodes: [],
  },
};

const combinedSlice = createSlice({
  name: 'combined',
  initialState,
  reducers: {
    addData: (state, action: PayloadAction<CytoSliceState>) => {
      state.cyto.nodes = [...state.cyto.nodes, ...action.payload.nodes];
      state.cyto.edges = [...state.cyto.edges, ...action.payload.edges];
    },
    loadCytoData: (state, action) => {
      if (action.payload !== undefined) {
        const data = JSON.parse(action.payload);
        state.cyto.nodes = data.data.nodes;
        state.cyto.edges = data.data.edges;
      }
    },
    setCsvData: (state, action) => {
      state.csv.samples = action.payload;
    },
    setSelectedFocusNodes: (state, action) => {
      state.csv.selectedNodes = action.payload;
    },
  },
});

export const { addData, loadCytoData, setCsvData, setSelectedFocusNodes } = combinedSlice.actions;

export default combinedSlice.reducer;
