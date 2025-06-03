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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgOverlayRef = useRef<SVGSVGElement>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const margins = useMemo(() => ({ top: 20, right: 20, bottom: 20, left: 20 }), []);

  const xScale = useMemo(() => {
    const w = Math.max(dimensions.width - margins.left - margins.right, 0);
    return d3.scaleLinear().domain([-0.05, 1.05]).range([0, w]);
  }, [dimensions, margins]);

  const yScale = useMemo(() => {
    const h = Math.max(dimensions.height - margins.top - margins.bottom, 0);
    return d3.scaleLinear().domain([-0.05, 1.05]).range([h, 0]);
  }, [dimensions, margins]);

  const selectedNodes = useSelector((state: IRootState) => state.combined.selectedNodes);
  const store = useStore<IRootState>();
  const { dispatch } = store;

  const handleResize = useCallback(() => {
    if (!canvasRef.current?.parentElement) {
      // No cleanup or return needed here; the effect itself handles resize
    } else {
      const { width, height } = canvasRef.current.parentElement.getBoundingClientRect();
      setDimensions({ width, height });
    }
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(handleResize);
    if (canvasRef.current?.parentElement) {
      observer.observe(canvasRef.current.parentElement);
    }
    return () => {
      observer.disconnect();
    };
  }, [handleResize]);

  const drawPoints = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    data.forEach((d) => {
      const isSelected = selectedNodes.includes(d.text);
      const rawX = xScale(d.x) + margins.left;
      const rawY = yScale(d.y) + margins.top;
      const screenX = transformRef.current.applyX(rawX);
      const screenY = transformRef.current.applyY(rawY);

      ctx.beginPath();
      ctx.fillStyle = isSelected ? '#DA5700' : 'lightgrey';
      // Radius fixed at 4px even when zooming
      ctx.arc(screenX, screenY, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [data, selectedNodes, dimensions, xScale, yScale, margins]);

  // ---------- Brush setup with consistent cleanup return ----------
  useEffect(() => {
    if (!svgOverlayRef.current) {
      // Always return a cleanup function to satisfy consistent-return
      return () => {};
    }

    const svgOverlay = d3.select(svgOverlayRef.current);
    svgOverlay.selectAll('*').remove();
    svgOverlay.style('pointer-events', 'all');

    const brushG = svgOverlay.append('g').attr('class', 'brush');

    const brush = d3
      .brush<unknown>()
      .extent([
        [margins.left, margins.top],
        [dimensions.width - margins.right, dimensions.height - margins.bottom],
      ])
      .on('end', (event: d3.D3BrushEvent<unknown>) => {
        if (event.selection) {
          const [[x1, y1], [x2, y2]] = event.selection as [[number, number], [number, number]];

          const newlySelected = data
            .filter((d) => {
              const rawX = xScale(d.x) + margins.left;
              const rawY = yScale(d.y) + margins.top;
              const screenX = transformRef.current.applyX(rawX);
              const screenY = transformRef.current.applyY(rawY);
              return screenX >= x1 && screenX <= x2 && screenY >= y1 && screenY <= y2;
            })
            .map((d) => d.text);

          dispatch(setSelectedFocusNodes(newlySelected));
        }
        // No cleanup here; the effect’s return handles brush removal
      });

    brushG.call(brush);

    return () => {
      brushG.remove();
    };
  }, [data, dimensions, dispatch, xScale, yScale, margins]);

  // ---------- Zoom setup with consistent cleanup return and no-explicit-any fixed ----------
  useEffect(() => {
    if (!svgOverlayRef.current) {
      // Return a no-op cleanup function to satisfy consistent-return
      return () => {};
    }

    const svgOverlay = d3.select(svgOverlayRef.current);

    const zoomed = (event: d3.D3ZoomEvent<SVGSVGElement, undefined>) => {
      transformRef.current = event.transform;
      drawPoints();
    };

    const zoomBehavior = d3
      .zoom<SVGSVGElement, undefined>()
      .scaleExtent([0.5, 10])
      .translateExtent([
        [0, 0],
        [dimensions.width, dimensions.height],
      ])
      .extent([
        [0, 0],
        [dimensions.width, dimensions.height],
      ])
      // Only allow zoom via wheel, dblclick, or ctrl/shift + mousedown
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((event: KeyboardEvent | MouseEvent | TouchEvent | d3.D3ZoomEvent<SVGSVGElement, undefined>) => {
        // D3 always passes a D3ZoomEvent here; use Event to read the type string
        const et = (event as Event).type;
        return et === 'wheel' || et === 'dblclick' || (et === 'mousedown' && ((event as MouseEvent).ctrlKey || (event as MouseEvent).shiftKey));
      })
      .on('zoom', zoomed);

    svgOverlay.call(zoomBehavior);

    const handleDoubleClick = () => {
      transformRef.current = d3.zoomIdentity;
      svgOverlay.transition().duration(300).call(zoomBehavior.transform, d3.zoomIdentity);
      drawPoints();
    };

    svgOverlay.on('dblclick.zoom', () => {
      handleDoubleClick();
    });

    return () => {
      svgOverlay.on('.zoom', null);
      svgOverlay.on('dblclick.zoom', null);
    };
  }, [dimensions, drawPoints]);

  useEffect(() => {
    drawPoints();
  }, [drawPoints]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <svg
        ref={svgOverlayRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}

export default CanvasScatterPlot;
