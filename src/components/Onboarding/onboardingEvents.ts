export const onboardingEventIds = {
  nldLassoSelect: 'nldLassoSelect',
  nldPan: 'nldPan',
  nldAltDrag: 'nldAltDrag',
} as const;

export type OnboardingEventId = (typeof onboardingEventIds)[keyof typeof onboardingEventIds];

export const onboardingTooltipSteps: { id: OnboardingEventId; label: string }[] = [
  {
    id: onboardingEventIds.nldLassoSelect,
    label: 'Ctrl-LMB to drag a lasso around nodes to select them.',
  },
  {
    id: onboardingEventIds.nldPan,
    label: 'LMB to drag and pan in the NLD.',
  },
  {
    id: onboardingEventIds.nldAltDrag,
    label: 'Alt-LMB to drag a node in the NLD and to run the force-directed layout.',
  },
];
