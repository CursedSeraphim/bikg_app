// CsvSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import { Data } from 'plotly.js';
import { ScatterData, ScatterCsvData, dataToScatterDataArray } from '../EmbeddingView/csvToPlotlyScatterData';
import { FeatureCsvData, csvDataToBarPlotDataGivenFeature } from '../FeatureDistributionView/csvToPlotlyFeatureData';
import { CsvData } from './types';

export interface CsvState {
  samples: CsvData[];
  selectedFocusNodes: string[];
}

const initialState: CsvState = {
  samples: [],
  selectedFocusNodes: [],
};

const csvSlice = createSlice({
  name: 'csv',
  initialState,
  reducers: {
    setCsvData: (state, action) => {
      state.samples = action.payload;
    },
    setSelectedFocusNodes: (state, action) => {
      state.selectedFocusNodes = action.payload;
    },
  },
});

export const selectBarPlotData = (state: { csv: CsvState }): any => {
  return { selectedNodes: state.csv.selectedFocusNodes, samples: state.csv.samples };
};

export const selectCsvDataForPlotly = (state: { csv: CsvState }): ScatterData[] => {
  return dataToScatterDataArray(state.csv.samples);
};

export const selectCsvData = (state: { csv: CsvState }) => state.csv.samples;

export const selectSelectedFocusNodes = (state: { csv: CsvState }) => state.csv.selectedFocusNodes;

export default csvSlice.reducer;

export const { setCsvData, setSelectedFocusNodes } = csvSlice.actions;
