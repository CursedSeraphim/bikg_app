// Store.ts
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import combinedReducer from './CombinedSlice';
import { CombinedState } from './CombinedState';

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
