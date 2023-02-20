import { configureStore, combineReducers } from '@reduxjs/toolkit';
import rdfReducer from './RdfSlice';
import csvReducer from './CSVSlice';

const rootReducer = combineReducers({
  rdf: rdfReducer,
  csv: csvReducer,
});

const store = configureStore({
  reducer: rootReducer,
});

export default store;
