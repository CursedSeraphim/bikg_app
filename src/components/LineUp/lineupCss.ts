// src/components/LineUp/lineupCss.ts

const LINEUP_CLASS_PREFIX = 'lu';

/**
 * Returns a LineUp CSS class name for a given suffix.
 * Example: getLineUpCssClass('low') returns 'lu-low'
 */
export const getLineUpCssClass = (suffix: string): string => {
  return `${LINEUP_CLASS_PREFIX}-${suffix}`;
};

export interface UpSetStyle {
  color: string;
  inactiveOpacity: number;
}

// these values are taken from LineUp's default styles which are no longer directly accessible
export const UPSET_STYLE: UpSetStyle = {
  color: '#676767',
  inactiveOpacity: 0.1,
};
