// Store.ts
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import combinedReducer from './CombinedSlice';
import { ICombinedState } from '../../types';

const rootReducer = combineReducers({
  combined: combinedReducer,
});

export interface RootState {
  combined: ICombinedState;
}

const store = configureStore<RootState>({
  reducer: rootReducer,
});

export default store;
