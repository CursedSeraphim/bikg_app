// hooks/useBrushSelectionClear.ts
import type * as d3 from 'd3';
import type React from 'react';
import { useCallback } from 'react';

interface UseBrushSelectionClearParams {
  brushRef: React.MutableRefObject<d3.BrushBehavior<unknown> | null>;
  brushGRef: React.MutableRefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>;
}

export function useBrushSelectionClear({ brushRef, brushGRef }: UseBrushSelectionClearParams) {
  const clearBrushSelection = useCallback(() => {
    const brush = brushRef.current;
    const brushG = brushGRef.current;

    if (!brush || !brushG) {
      return;
    }

    brush.move(brushG, null);
  }, [brushRef, brushGRef]);

  return clearBrushSelection;
}
