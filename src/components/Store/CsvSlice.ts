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

export const selectBarPlotData = (state: { csv: CsvState }): Data[] => {
  // TODO set this dynamically
  const feature = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
  const barPlotData = csvDataToBarPlotDataGivenFeature(feature, state.csv.selectedFocusNodes, state.csv.samples);

  return [
    {
      x: barPlotData.x,
      y: barPlotData.y,
      type: 'bar',
      marker: {
        color: 'steelblue',
      },
    },
  ];
};

export const selectCsvDataForPlotly = (state: { csv: CsvState }): ScatterData[] => {
  return dataToScatterDataArray(state.csv.samples);
};

export const selectCsvData = (state: { csv: CsvState }) => state.csv.samples;

export const selectSelectedFocusNodes = (state: { csv: CsvState }) => state.csv.selectedFocusNodes;

export default csvSlice.reducer;

export const { setCsvData, setSelectedFocusNodes } = csvSlice.actions;
