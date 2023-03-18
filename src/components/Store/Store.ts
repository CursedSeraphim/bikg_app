import { configureStore, combineReducers } from '@reduxjs/toolkit';
import rdfReducer from './RdfSlice';
import ontologyReducer from './OntologySlice';
import csvReducer from './CsvSlice';

const rootReducer = combineReducers({
  rdf: rdfReducer,
  csv: csvReducer,
  ontology: ontologyReducer,
});

const store = configureStore({
  reducer: rootReducer,
});

export default store;
