// hooks/useOnSelectionCleared.ts
import { useEffect, useRef } from 'react';

export function useOnSelectionCleared(selectedCount: number, onCleared: () => void): void {
  const previousCountRef = useRef<number>(selectedCount);

  useEffect(() => {
    const previous = previousCountRef.current;

    if (previous > 0 && selectedCount === 0) {
      onCleared();
    }

    previousCountRef.current = selectedCount;
  }, [selectedCount, onCleared]);
}
