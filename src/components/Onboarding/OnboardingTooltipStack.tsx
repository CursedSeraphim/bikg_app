import clsx from 'clsx';
import React from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { IRootState } from '../../types';
import { completeAllOnboardingEvents } from '../Store/OnboardingSlice';
import { ONBOARDING_ENABLED, onboardingTooltipSteps } from './onboardingEvents';
import { OnboardingTooltipItem } from './OnboardingTooltipItem';

export function OnboardingTooltipStack() {
  const dispatch = useDispatch();
  const events = useSelector((state: IRootState) => state.onboarding.events);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isDismissHovered, setIsDismissHovered] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);

  const hasOpenTooltips = onboardingTooltipSteps.some((step) => !events[step.id]);

  if (!ONBOARDING_ENABLED) {
    return null;
  }

  const stack = (
    <div
      className={clsx('onboarding-tooltip-stack', {
        'is-hovered': isHovered,
        'is-dismiss-hovered': isDismissHovered,
        'is-minimized': isMinimized,
      })}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsDismissHovered(false);
      }}
    >
      <button
        type="button"
        className={clsx('onboarding-tooltip-toggle', {
          'is-maximize': isMinimized,
          'is-minimize': !isMinimized,
        })}
        aria-label={isMinimized ? 'Maximize onboarding tips' : 'Minimize onboarding tips'}
        onClick={() => setIsMinimized((v) => !v)}
      />

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

      <div className="onboarding-tooltip-box onboarding-tooltip-minimized-label">Onboarding Tips</div>

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
