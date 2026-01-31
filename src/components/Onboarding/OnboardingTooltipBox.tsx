import React from 'react';
import './onboardingTooltips.css';

interface OnboardingTooltipBoxProps {
  label: string;
}

export function OnboardingTooltipBox({ label }: OnboardingTooltipBoxProps) {
  return <div className="onboarding-tooltip-box">{label}</div>;
}
