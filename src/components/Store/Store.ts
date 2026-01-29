// Store.ts
import { configureStore, combineReducers, Action } from '@reduxjs/toolkit';
import { ThunkAction } from 'redux-thunk';
import combinedReducer from './CombinedSlice';
import { ICombinedState } from '../../types';
import { setViolationStateProvider } from '../../utils/violations';

const rootReducer = combineReducers({
  combined: combinedReducer,
});

export interface RootState {
  combined: ICombinedState;
}

const store = configureStore<RootState>({
  reducer: rootReducer,
});

setViolationStateProvider(store.getState);

export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;

export type AppDispatch = typeof store.dispatch;

export default store;
