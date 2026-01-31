import React from 'react';
import clsx from 'clsx';
import { OnboardingTooltipBox } from './OnboardingTooltipBox';

interface OnboardingTooltipItemProps {
  label: string;
  isComplete: boolean;
}

export function OnboardingTooltipItem({ label, isComplete }: OnboardingTooltipItemProps) {
  return (
    <div
      className={clsx('onboarding-tooltip-item', { 'is-complete': isComplete })}
      aria-hidden={isComplete}
    >
      <OnboardingTooltipBox label={label} />
    </div>
  );
}
