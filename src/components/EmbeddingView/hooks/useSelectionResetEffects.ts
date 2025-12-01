// hooks/useSelectionResetEffects.ts
import type * as d3 from 'd3';
import type React from 'react';
import { useCallback } from 'react';
import { useBrushSelectionClear } from './useBrushSelectionClear';

interface UseSelectionResetEffectsParams {
  clearHover: () => void;
  brushRef: React.MutableRefObject<d3.BrushBehavior<unknown> | null>;
  brushGRef: React.MutableRefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>;
}

export function useSelectionResetEffects({ clearHover, brushRef, brushGRef }: UseSelectionResetEffectsParams) {
  const clearBrushSelection = useBrushSelectionClear({ brushRef, brushGRef });

  const resetSelectionEffects = useCallback(() => {
    clearHover();
    clearBrushSelection();
  }, [clearHover, clearBrushSelection]);

  return { resetSelectionEffects, clearBrushSelection };
}
