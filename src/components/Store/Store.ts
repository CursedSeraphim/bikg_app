import { configureStore, combineReducers } from '@reduxjs/toolkit';
import rdfReducer from './RdfSlice';
import csvReducer from './NodeSlice';
import csv2Reducer from './EdgeSlice';
import cytoReducer from './CytoSlice';

const rootReducer = combineReducers({
  rdf: rdfReducer,
  csv: csvReducer,
  csv2: csv2Reducer,
  cyto: cytoReducer,
});

const store = configureStore({
  reducer: rootReducer,
});

export default store;
