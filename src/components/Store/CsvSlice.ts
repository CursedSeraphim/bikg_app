// CsvSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import { CsvData, ScatterData, dataToScatterDataArray } from '../react-plotly/csvToPlotlyData';

export interface CsvState {
  samples: CsvData[]; // Use CsvData instead of ScatterData
}

const initialState: CsvState = {
  samples: [],
};

const csvSlice = createSlice({
  name: 'csv',
  initialState,
  reducers: {
    setCsvData: (state, action) => {
      state.samples = action.payload;
    },
  },
});

export const selectCsvDataForPlotly = (state: { csv: CsvState }): ScatterData[] => {
  return dataToScatterDataArray(state.csv.samples); // Now it should work as expected
};

export const selectCsvData = (state: { csv: CsvState }) => state.csv.samples;

export default csvSlice.reducer;

export const { setCsvData } = csvSlice.actions;
