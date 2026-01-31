import React from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { ONBOARDING_ENABLED, onboardingTooltipSteps } from './onboardingEvents';
import { OnboardingTooltipItem } from './OnboardingTooltipItem';
import type { IRootState } from '../../types';

export function OnboardingTooltipStack() {
  if (!ONBOARDING_ENABLED) {
    return null;
  }

  const events = useSelector((state: IRootState) => state.onboarding.events);

  const stack = (
    <div className="onboarding-tooltip-stack" role="status" aria-live="polite">
      {onboardingTooltipSteps.map((step) => (
        <OnboardingTooltipItem key={step.id} label={step.label} isComplete={Boolean(events[step.id])} />
      ))}
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(stack, document.body);
}
