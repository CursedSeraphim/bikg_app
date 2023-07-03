// Store.ts
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import combinedReducer from './CombinedSlice';

const rootReducer = combineReducers({
  combined: combinedReducer,
});

const store = configureStore({
  reducer: rootReducer,
});

export default store;
