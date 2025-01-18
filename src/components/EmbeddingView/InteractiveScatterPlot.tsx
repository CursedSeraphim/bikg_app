import * as d3 from 'd3';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useStore } from 'react-redux';
import { IRootState } from '../../types';
import { setSelectedFocusNodes } from '../Store/CombinedSlice';

interface IScatterNode {
  text: string;
  x: number;
  y: number;
}

interface IScatterPlotProps {
  data: IScatterNode[];
}

function CanvasScatterPlot({ data }: IScatterPlotProps) {
  // Canvas and overlay SVG refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgOverlayRef = useRef<SVGSVGElement>(null);

  // Keep track of the container’s width/height
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // For performance, memoize margins & scales
  const margins = useMemo(() => ({ top: 20, right: 20, bottom: 20, left: 20 }), []);

  // x/y scales
  const xScale = useMemo(() => {
    const w = Math.max(dimensions.width - margins.left - margins.right, 0);
    return d3.scaleLinear().domain([-0.05, 1.05]).range([0, w]);
  }, [dimensions, margins]);

  const yScale = useMemo(() => {
    const h = Math.max(dimensions.height - margins.top - margins.bottom, 0);
    return d3.scaleLinear().domain([-0.05, 1.05]).range([h, 0]);
  }, [dimensions, margins]);

  // Redux to track selected items
  const selectedNodes = useSelector((state: IRootState) => state.combined.selectedNodes);
  const store = useStore<IRootState>();
  const { dispatch } = store;

  // Resize logic
  const handleResize = useCallback(() => {
    if (!canvasRef.current?.parentElement) return;
    const { width, height } = canvasRef.current.parentElement.getBoundingClientRect();
    setDimensions({ width, height });
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => handleResize());
    if (canvasRef.current?.parentElement) observer.observe(canvasRef.current.parentElement);

    return () => {
      observer.disconnect();
    };
  }, [handleResize]);

  // Brush logic — do this once. We'll attach it to the overlay SVG.
  useEffect(() => {
    if (!svgOverlayRef.current) return;

    const svgOverlay = d3.select(svgOverlayRef.current);
    const brushG = svgOverlay.append('g').attr('class', 'brush');

    // Define the brush
    const brush = d3
      .brush()
      .extent([
        [margins.left, margins.top],
        [dimensions.width - margins.right, dimensions.height - margins.bottom],
      ])
      .on('end', (event) => {
        if (!event.selection) return;

        const [[x1, y1], [x2, y2]] = event.selection as [[number, number], [number, number]];

        // Determine which points are in the brush
        const newlySelected = data
          .filter((d) => {
            const cx = xScale(d.x) + margins.left;
            const cy = yScale(d.y) + margins.top;
            return cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2;
          })
          .map((d) => d.text);

        dispatch(setSelectedFocusNodes(newlySelected));
      });

    brushG.call(brush);

    // Only re-init the brush if the component unmounts or changes drastically
    return () => {
      brushG.remove();
    };
  }, [data, dimensions, dispatch, xScale, yScale, margins]);

  // Redraw the canvas whenever data, selection, or dimensions change
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Scale the canvas to match container
    canvasRef.current.width = dimensions.width;
    canvasRef.current.height = dimensions.height;

    // Clear
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Draw each point
    data.forEach((d) => {
      const isSelected = selectedNodes.includes(d.text);

      ctx.beginPath();
      ctx.fillStyle = isSelected ? '#DA5700' : 'lightgrey';
      const cx = xScale(d.x) + margins.left;
      const cy = yScale(d.y) + margins.top;
      ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [data, selectedNodes, dimensions, xScale, yScale, margins]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {/* The overlay SVG is used solely for brushing (and maybe minimal overlays),
          not for drawing thousands of circles. */}
      <svg
        ref={svgOverlayRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none', // pointer events on brush group only
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}

export default CanvasScatterPlot;
