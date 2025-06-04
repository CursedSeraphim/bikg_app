import { useCallback, useEffect, useState } from 'react';

/**
 * Track the size of the canvas parent element using a ResizeObserver.
 */
export function useCanvasDimensions(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const updateDimensions = useCallback(() => {
    if (!canvasRef.current?.parentElement) return;
    const { width, height } = canvasRef.current.parentElement.getBoundingClientRect();
    setDimensions({ width, height });
  }, [canvasRef]);

  useEffect(() => {
    const observer = new ResizeObserver(updateDimensions);
    if (canvasRef.current?.parentElement) {
      observer.observe(canvasRef.current.parentElement);
    }
    return () => observer.disconnect();
  }, [updateDimensions, canvasRef]);

  return { dimensions };
}
