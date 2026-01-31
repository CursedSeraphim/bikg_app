import React from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import clsx from 'clsx';
import { ONBOARDING_ENABLED, onboardingTooltipSteps } from './onboardingEvents';
import { OnboardingTooltipItem } from './OnboardingTooltipItem';
import { completeAllOnboardingEvents } from '../Store/OnboardingSlice';
import type { IRootState } from '../../types';

export function OnboardingTooltipStack() {
  if (!ONBOARDING_ENABLED) {
    return null;
  }

  const dispatch = useDispatch();
  const events = useSelector((state: IRootState) => state.onboarding.events);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isDismissHovered, setIsDismissHovered] = React.useState(false);
  const hasOpenTooltips = onboardingTooltipSteps.some((step) => !events[step.id]);

  const stack = (
    <div
      className={clsx('onboarding-tooltip-stack', {
        'is-hovered': isHovered,
        'is-dismiss-hovered': isDismissHovered,
      })}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsDismissHovered(false);
      }}
    >
      {hasOpenTooltips ? (
        <button
          type="button"
          className="onboarding-tooltip-dismiss"
          aria-label="Dismiss all onboarding tips"
          onMouseEnter={() => setIsDismissHovered(true)}
          onMouseLeave={() => setIsDismissHovered(false)}
          onClick={() => dispatch(completeAllOnboardingEvents())}
        />
      ) : null}
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
