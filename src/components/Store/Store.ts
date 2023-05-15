// Store.ts
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import rdfReducer from './RdfSlice';
import ontologyReducer from './OntologySlice';
import csvReducer from './CsvSlice';
import cytoReducer from './CytoSlice';

const rootReducer = combineReducers({
  rdf: rdfReducer,
  csv: csvReducer,
  ontology: ontologyReducer,
  cyto: cytoReducer,
});

const store = configureStore({
  reducer: rootReducer,
});

export default store;
