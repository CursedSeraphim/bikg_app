// CsvSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import { ScatterData, dataToScatterDataArray } from '../EmbeddingView/csvToPlotlyScatterData';
import { CsvData } from './types';

export interface CsvState {
  samples: CsvData[];
  selectedNodes: string[];
}

const initialState: CsvState = {
  samples: [],
  selectedNodes: [],
};

const csvSlice = createSlice({
  name: 'csv',
  initialState,
  reducers: {
    setCsvData: (state, action) => {
      state.samples = action.payload;
    },
    setSelectedFocusNodes: (state, action) => {
      state.selectedNodes = action.payload;
    },
  },
});

export const selectBarPlotData = (state: { csv: CsvState }): any => {
  return { selectedNodes: state.csv.selectedNodes, samples: state.csv.samples };
};

export const selectCsvDataForPlotly = (state: { csv: CsvState }): ScatterData[] => {
  return dataToScatterDataArray(state.csv.samples);
};

export const selectCsvData = (state: { csv: CsvState }) => state.csv.samples;

export const selectSelectedFocusNodes = (state: { csv: CsvState }) => state.csv.selectedNodes;

export default csvSlice.reducer;

export const { setCsvData, setSelectedFocusNodes } = csvSlice.actions;
