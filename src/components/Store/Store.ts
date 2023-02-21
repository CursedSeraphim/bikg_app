import { configureStore, combineReducers } from '@reduxjs/toolkit';
import rdfReducer from './RdfSlice';
import csvReducer from './CSVSlice';
import csv2Reducer from './CSVTrajectorySlice';

const rootReducer = combineReducers({
  rdf: rdfReducer,
  csv: csvReducer,
  csv2: csv2Reducer,
});

const store = configureStore({
  reducer: rootReducer,
});

export default store;
