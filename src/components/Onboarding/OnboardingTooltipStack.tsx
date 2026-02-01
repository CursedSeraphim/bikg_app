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
  const [isDismissing, setIsDismissing] = React.useState(false);

  // Hover previews should only trigger after an actual mouse-enter on the toggle button.
  // This prevents "instant opposite preview" when the icon/class flips under the cursor after clicking.
  const [isToggleHovered, setIsToggleHovered] = React.useState(false);
  const [isTogglePreviewArmed, setIsTogglePreviewArmed] = React.useState(false);

  const hasOpenTooltips = onboardingTooltipSteps.some((step) => !events[step.id]);
  const dismissTimeoutRef = React.useRef<number | null>(null);
  const DISMISS_TRANSITION_MS = 300;

  React.useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current !== null) {
        window.clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  if (!ONBOARDING_ENABLED || !hasOpenTooltips) {
    return null;
  }

  const isPreviewingMinimize = isToggleHovered && isTogglePreviewArmed && !isMinimized;
  const isPreviewingMaximize = isToggleHovered && isTogglePreviewArmed && isMinimized;

  // Visual state includes hover preview. This keeps the class stable when clicking during preview,
  // so the 0.3s transition does not restart from the beginning.
  const isMinimizedVisual = isPreviewingMaximize ? false : isMinimized || isPreviewingMinimize;

  const stack = (
    <div
      className={clsx('onboarding-tooltip-stack', {
        'is-hovered': isHovered,
        'is-dismiss-hovered': isDismissHovered,
        'is-minimized': isMinimizedVisual,
        'is-dismissing': isDismissing,
      })}
      style={{ '--onboarding-tooltip-dismiss-duration': `${DISMISS_TRANSITION_MS}ms` } as React.CSSProperties}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsDismissHovered(false);

        // Leaving the stack also cancels any pending preview arming.
        setIsToggleHovered(false);
        setIsTogglePreviewArmed(false);
      }}
    >
      <button
        type="button"
        className={clsx('onboarding-tooltip-toggle', {
          'is-maximize': isMinimized,
          'is-minimize': !isMinimized,
        })}
        aria-label={isMinimized ? 'Maximize onboarding tips' : 'Minimize onboarding tips'}
        onMouseEnter={() => {
          setIsToggleHovered(true);
          setIsTogglePreviewArmed(true);
        }}
        onMouseLeave={() => {
          setIsToggleHovered(false);
          setIsTogglePreviewArmed(false);
        }}
        onClick={() => {
          // Disarm so swapping the icon under the cursor does NOT immediately trigger the opposite preview
          // until the mouse exits and re-enters the toggle button.
          setIsTogglePreviewArmed(false);
          setIsMinimized((v) => !v);
        }}
      />

      {hasOpenTooltips ? (
        <button
          type="button"
          className="onboarding-tooltip-dismiss"
          aria-label="Dismiss all onboarding tips"
          onMouseEnter={() => setIsDismissHovered(true)}
          onMouseLeave={() => setIsDismissHovered(false)}
          onClick={() => {
            if (isDismissing) {
              return;
            }
            setIsDismissing(true);
            setIsDismissHovered(false);
            setIsToggleHovered(false);
            setIsTogglePreviewArmed(false);
            dismissTimeoutRef.current = window.setTimeout(() => {
              dispatch(completeAllOnboardingEvents());
            }, DISMISS_TRANSITION_MS);
          }}
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
