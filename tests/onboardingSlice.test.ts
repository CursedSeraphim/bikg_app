import onboardingReducer, { markOnboardingEventComplete, resetOnboardingEvents } from '../src/components/Store/OnboardingSlice';
import { onboardingEventIds } from '../src/components/Onboarding/onboardingEvents';

describe('onboardingSlice', () => {
  it('initializes all onboarding events to false', () => {
    const state = onboardingReducer(undefined, { type: 'init' });

    expect(state.events[onboardingEventIds.nldLassoSelect]).toBe(false);
    expect(state.events[onboardingEventIds.nldPan]).toBe(false);
    expect(state.events[onboardingEventIds.nldAltDrag]).toBe(false);
  });

  it('marks onboarding events as complete and keeps other events untouched', () => {
    const state = onboardingReducer(undefined, { type: 'init' });
    const nextState = onboardingReducer(state, markOnboardingEventComplete(onboardingEventIds.nldPan));

    expect(nextState.events[onboardingEventIds.nldPan]).toBe(true);
    expect(nextState.events[onboardingEventIds.nldLassoSelect]).toBe(false);
    expect(nextState.events[onboardingEventIds.nldAltDrag]).toBe(false);
  });

  it('does not update state when marking an already completed event', () => {
    const state = onboardingReducer(undefined, markOnboardingEventComplete(onboardingEventIds.nldPan));
    const nextState = onboardingReducer(state, markOnboardingEventComplete(onboardingEventIds.nldPan));

    expect(nextState).toBe(state);
  });

  it('resets onboarding events', () => {
    const state = onboardingReducer(undefined, markOnboardingEventComplete(onboardingEventIds.nldAltDrag));
    const nextState = onboardingReducer(state, resetOnboardingEvents());

    expect(nextState.events[onboardingEventIds.nldAltDrag]).toBe(false);
  });
});
