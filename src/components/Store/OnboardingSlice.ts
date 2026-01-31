import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { onboardingEventIds, type OnboardingEventId } from '../Onboarding/onboardingEvents';
import { IOnboardingState } from '../../types';

const initialState: IOnboardingState = {
  events: {
    [onboardingEventIds.nldLassoSelect]: false,
    [onboardingEventIds.nldPan]: false,
    [onboardingEventIds.nldAltDrag]: false,
    [onboardingEventIds.nldDeleteSelection]: false,
    [onboardingEventIds.nldExpandChildren]: false,
    [onboardingEventIds.nldExpandParents]: false,
    [onboardingEventIds.nldExpandAssociated]: false,
    [onboardingEventIds.nldContextMenu]: false,
    [onboardingEventIds.treeDoubleClickSelectClass]: false,
    [onboardingEventIds.projectionBrushSelect]: false,
  },
};

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    markOnboardingEventComplete: (state, action: PayloadAction<OnboardingEventId>) => {
      const eventId = action.payload;
      if (state.events[eventId]) {
        return;
      }
      state.events[eventId] = true;
    },
    resetOnboardingEvents: (state) => {
      Object.keys(state.events).forEach((key) => {
        state.events[key as OnboardingEventId] = false;
      });
    },
    completeAllOnboardingEvents: (state) => {
      Object.keys(state.events).forEach((key) => {
        state.events[key as OnboardingEventId] = true;
      });
    },
  },
});

export const { markOnboardingEventComplete, resetOnboardingEvents, completeAllOnboardingEvents } =
  onboardingSlice.actions;

export default onboardingSlice.reducer;
