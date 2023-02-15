import { configureStore, combineReducers } from '@reduxjs/toolkit';
import rdfReducer from './RdfSlice';

const rootReducer = combineReducers({
  rdf: rdfReducer,
});

const store = configureStore({
  reducer: rootReducer,
});

export default store;
