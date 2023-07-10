// Store.ts
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import combinedReducer, { CombinedState } from './CombinedSlice';

const rootReducer = combineReducers({
  combined: combinedReducer,
});

export interface RootState {
  combined: CombinedState;
}

const store = configureStore<RootState>({
  reducer: rootReducer,
});

export default store;
