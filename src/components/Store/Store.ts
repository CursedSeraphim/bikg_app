// Store.ts
import { configureStore, combineReducers, Action } from '@reduxjs/toolkit';
import { ThunkAction } from 'redux-thunk';
import combinedReducer from './CombinedSlice';
import onboardingReducer from './OnboardingSlice';
import { ICombinedState, IOnboardingState } from '../../types';
import { setViolationStateProvider } from '../../utils/violations';

const rootReducer = combineReducers({
  combined: combinedReducer,
  onboarding: onboardingReducer,
});

export interface RootState {
  combined: ICombinedState;
  onboarding: IOnboardingState;
}

const store = configureStore<RootState>({
  reducer: rootReducer,
});

setViolationStateProvider(store.getState);

export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;

export type AppDispatch = typeof store.dispatch;

export default store;
