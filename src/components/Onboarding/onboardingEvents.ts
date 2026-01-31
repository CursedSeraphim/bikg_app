export const onboardingEventIds = {
  nldLassoSelect: 'nldLassoSelect',
  nldPan: 'nldPan',
  nldAltDrag: 'nldAltDrag',
  nldDeleteSelection: 'nldDeleteSelection',
  nldExpandChildren: 'nldExpandChildren',
  nldExpandParents: 'nldExpandParents',
  nldExpandAssociated: 'nldExpandAssociated',
  nldContextMenu: 'nldContextMenu',
  treeDoubleClickSelectClass: 'treeDoubleClickSelectClass',
  projectionBrushSelect: 'projectionBrushSelect',
} as const;

export const ONBOARDING_ENABLED = true;

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
  {
    id: onboardingEventIds.nldDeleteSelection,
    label: 'Press delete to hide selected parts of the NLD.',
  },
  {
    id: onboardingEventIds.nldExpandChildren,
    label: 'Ctrl-click a node to expand its children.',
  },
  {
    id: onboardingEventIds.nldExpandParents,
    label: 'Shift-click a node to expand its parents.',
  },
  {
    id: onboardingEventIds.nldExpandAssociated,
    label: 'Ctrl-Shift-click a node to expand the paths associated to its violating focus nodes.',
  },
  {
    id: onboardingEventIds.nldContextMenu,
    label: 'Right-click in the NLD to open the context menu.',
  },
  {
    id: onboardingEventIds.treeDoubleClickSelectClass,
    label: 'Doubleclick an entry in the tree to select the corresponding class.',
  },
  {
    id: onboardingEventIds.projectionBrushSelect,
    label: 'Drag a brush to make a selection in the Projection View.',
  },
];
