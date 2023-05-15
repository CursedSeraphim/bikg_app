// Store.ts
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import ontologyReducer from './OntologySlice';
import cytoReducer from './CytoSlice';
import combinedReducer from './CombinedSlice';

const rootReducer = combineReducers({
  ontology: ontologyReducer,
  cyto: cytoReducer,
  combined: combinedReducer,
});

const store = configureStore({
  reducer: rootReducer,
});

export default store;
