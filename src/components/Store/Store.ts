// Store.ts
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import rdfReducer from './RdfSlice';
import ontologyReducer from './OntologySlice';
import csvReducer from './CsvSlice';
import cytoReducer from './CytoSlice';
import combinedReducer from './CombinedSlice';

const rootReducer = combineReducers({
  rdf: rdfReducer,
  csv: csvReducer,
  ontology: ontologyReducer,
  cyto: cytoReducer,
  combined: combinedReducer,
});

const store = configureStore({
  reducer: rootReducer,
});

export default store;
