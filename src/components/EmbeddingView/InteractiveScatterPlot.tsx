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

/** ---------- Tunables / feature flags ---------- */
const STRIP_BI_PREFIX = true;
const BI_PREFIX = 'http://data.boehringer.com/';

const MIN_ZOOM = 0.02;
const MAX_ZOOM = 1000;

const BASE_LABEL_FONT_PX = 10; // constant screen-space size (semantic zoom)
const LABEL_PADDING_PX = 2;
const LABEL_Y_OFFSET_PX = 6;
const LABEL_STROKE_WIDTH = 3;

const LABEL_FONT_FAMILY = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

/** ---------- Helpers ---------- */
function formatLabel(raw: string): string {
  if (!STRIP_BI_PREFIX) return raw;
  return raw.startsWith(BI_PREFIX) ? raw.slice(BI_PREFIX.length) : raw;
}

type Rect = { x1: number; y1: number; x2: number; y2: number };

class SpatialHash {
  private cell: number;

  private map = new Map<string, Rect[]>();

  constructor(cellSize = 32) {
    this.cell = cellSize;
  }

  private key(ix: number, iy: number): string {
    return `${ix},${iy}`;
  }

  private cellsFor(r: Rect): Array<[number, number]> {
    const cs = this.cell;
    const x1 = Math.floor(r.x1 / cs);
    const y1 = Math.floor(r.y1 / cs);
    const x2 = Math.floor(r.x2 / cs);
    const y2 = Math.floor(r.y2 / cs);
    const cells: Array<[number, number]> = [];
    for (let ix = x1; ix <= x2; ix += 1) {
      for (let iy = y1; iy <= y2; iy += 1) {
        cells.push([ix, iy]);
      }
    }
    return cells;
  }

  collides(r: Rect): boolean {
    for (const [ix, iy] of this.cellsFor(r)) {
      const bucket = this.map.get(this.key(ix, iy));
      if (!bucket) continue;
      for (const b of bucket) {
        if (!(r.x2 < b.x1 || r.x1 > b.x2 || r.y2 < b.y1 || r.y1 > b.y2)) return true;
      }
    }
    return false;
  }

  insert(r: Rect): void {
    for (const [ix, iy] of this.cellsFor(r)) {
      const k = this.key(ix, iy);
      const bucket = this.map.get(k);
      if (bucket) bucket.push(r);
      else this.map.set(k, [r]);
    }
  }
}

function InteractiveScatterPlot({ data }: IScatterPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgOverlayRef = useRef<SVGSVGElement>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const quadtreeRef = useRef<d3.Quadtree<IScatterNode>>();
  const [hoveredNode, setHoveredNode] = useState<IScatterNode | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Brush refs to clear selection on zoom/resize
  const brushRef = useRef<d3.BrushBehavior<unknown> | null>(null);
  const brushGRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  // Offscreen canvas for accurate text measurement
  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  if (!measureCanvasRef.current) measureCanvasRef.current = document.createElement('canvas');
  const measureCtx = measureCanvasRef.current.getContext('2d') as CanvasRenderingContext2D;

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

  // Cache measured widths per (text, fontPx)
  const widthCacheRef = useRef<Map<string, number>>(new Map());
  const widthKey = (txt: string, fontPx: number) => `${fontPx}::${txt}`;

  useEffect(() => {
    const q = d3
      .quadtree<IScatterNode>()
      .x((d) => xScale(d.x) + margins.left)
      .y((d) => yScale(d.y) + margins.top)
      .addAll(data);
    quadtreeRef.current = q;
  }, [data, xScale, yScale, margins]);

  const handleResize = useCallback((): void => {
    if (!canvasRef.current?.parentElement) return;
    const { width, height } = canvasRef.current.parentElement.getBoundingClientRect();
    setDimensions({ width, height });
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(handleResize);
    if (canvasRef.current?.parentElement) observer.observe(canvasRef.current.parentElement);
    return () => observer.disconnect();
  }, [handleResize]);

  /** Measures text width for given font size and family. */
  const measureTextWidth = useCallback(
    (text: string, fontPx: number): number => {
      const key = widthKey(text, fontPx);
      const cached = widthCacheRef.current.get(key);
      if (cached !== undefined) return cached;
      measureCtx.font = `${fontPx}px ${LABEL_FONT_FAMILY}`;
      const w = measureCtx.measureText(text).width;
      widthCacheRef.current.set(key, w);
      return w;
    },
    [measureCtx],
  );

  /** Clears any active brush rectangle (typed, no `any`). */
  const clearBrush = useCallback((): void => {
    if (brushGRef.current && brushRef.current) {
      brushRef.current.move(brushGRef.current as d3.Selection<SVGGElement, unknown, null, undefined>, null);
    }
  }, []);

  /** Draws points and strictly decluttered labels. */
  const renderFrame = useCallback((): void => {
    const canvas = canvasRef.current;
    const svgEl = svgOverlayRef.current;
    if (!canvas || !svgEl) return;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const { width, height } = dimensions;

    // HiDPI crispness while keeping CSS pixel coordinates
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Points (fixed 4px radius in screen space)
    for (const d of data) {
      const isSelected = selectedNodes.includes(d.text);
      const rawX = xScale(d.x) + margins.left;
      const rawY = yScale(d.y) + margins.top;
      const screenX = transformRef.current.applyX(rawX);
      const screenY = transformRef.current.applyY(rawY);

      if (screenX < -8 || screenX > width + 8 || screenY < -8 || screenY > height + 8) continue;

      ctx.beginPath();
      ctx.fillStyle = isSelected ? '#DA5700' : 'lightgrey';
      ctx.arc(screenX, screenY, 4, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Labels: constant screen-space size (semantic zoom)
    const fontPx = BASE_LABEL_FONT_PX;
    const svg = d3.select(svgEl);
    const spatial = new SpatialHash(32);

    type LabelDatum = {
      node: IScatterNode;
      sx: number;
      sy: number;
      text: string;
      rect: Rect;
    };

    const candidates: LabelDatum[] = [];
    for (const d of data) {
      const sx = transformRef.current.applyX(xScale(d.x) + margins.left);
      const sy = transformRef.current.applyY(yScale(d.y) + margins.top) - LABEL_Y_OFFSET_PX;

      if (sx < -200 || sx > width + 200 || sy < -100 || sy > height + 100) continue;

      const txt = formatLabel(d.text);
      const w = measureTextWidth(txt, fontPx) + 2 * LABEL_PADDING_PX;
      const h = fontPx + 2;

      const rect: Rect = { x1: sx - w / 2, y1: sy - h, x2: sx + w / 2, y2: sy };
      candidates.push({ node: d, sx, sy, text: txt, rect });
    }

    // Priority: selected first, then shorter labels to fit more
    candidates.sort((a, b) => {
      const aSel = selectedNodes.includes(a.node.text);
      const bSel = selectedNodes.includes(b.node.text);
      if (aSel !== bSel) return aSel ? -1 : 1;
      const aw = a.rect.x2 - a.rect.x1;
      const bw = b.rect.x2 - b.rect.x1;
      return aw - bw;
    });

    const visible: LabelDatum[] = [];
    for (const c of candidates) {
      if (c.rect.x2 < 0 || c.rect.x1 > width || c.rect.y2 < 0 || c.rect.y1 > height) continue;
      if (!spatial.collides(c.rect)) {
        spatial.insert(c.rect);
        visible.push(c);
      }
    }

    // Static labels (decluttered)
    const labels = svg.selectAll<SVGTextElement, LabelDatum>('text.static-label').data(visible, (d: LabelDatum) => d.node.text);

    labels
      .enter()
      .append('text')
      .attr('class', 'static-label')
      .attr('pointer-events', 'none')
      .merge(labels as d3.Selection<SVGTextElement, LabelDatum, SVGGElement, unknown>)
      .attr('paint-order', 'stroke')
      .attr('stroke', 'white')
      .attr('stroke-width', LABEL_STROKE_WIDTH)
      .attr('fill', 'black')
      .attr('text-anchor', 'middle')
      .attr('font-family', LABEL_FONT_FAMILY)
      .attr('font-size', fontPx)
      .attr('x', (d: LabelDatum) => d.sx)
      .attr('y', (d: LabelDatum) => d.sy)
      .text((d: LabelDatum) => d.text);

    labels.exit().remove();

    // Hover label (always visible even if overlapping)
    type HoverDatum = { node: IScatterNode; sx: number; sy: number; text: string };
    const hoverData: HoverDatum[] = hoveredNode
      ? [
          {
            node: hoveredNode,
            sx: transformRef.current.applyX(xScale(hoveredNode.x) + margins.left),
            sy: transformRef.current.applyY(yScale(hoveredNode.y) + margins.top) - LABEL_Y_OFFSET_PX,
            text: formatLabel(hoveredNode.text),
          },
        ]
      : [];

    const hoverSel = svg.selectAll<SVGTextElement, HoverDatum>('text.hover-label').data(hoverData, (d: HoverDatum) => d.node.text);

    hoverSel
      .enter()
      .append('text')
      .attr('class', 'hover-label')
      .attr('pointer-events', 'none')
      .merge(hoverSel as d3.Selection<SVGTextElement, HoverDatum, SVGGElement, unknown>)
      .attr('paint-order', 'stroke')
      .attr('stroke', 'white')
      .attr('stroke-width', LABEL_STROKE_WIDTH)
      .attr('fill', '#111')
      .attr('text-anchor', 'middle')
      .attr('font-family', LABEL_FONT_FAMILY)
      .attr('font-size', fontPx)
      .attr('x', (d: HoverDatum) => d.sx)
      .attr('y', (d: HoverDatum) => d.sy)
      .text((d: HoverDatum) => d.text)
      .raise();

    hoverSel.exit().remove();
  }, [data, dimensions, hoveredNode, margins, measureTextWidth, selectedNodes, xScale, yScale]);

  /** Schedules a render on the next animation frame. */
  const drawPoints = useCallback((): void => {
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      renderFrame();
    });
  }, [renderFrame]);

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>): void => {
    if (!quadtreeRef.current || !svgOverlayRef.current) return;
    const [mx, my] = d3.pointer(event, svgOverlayRef.current as Element);
    const searchX = transformRef.current.invertX(mx);
    const searchY = transformRef.current.invertY(my);
    const radius = 6;
    const found = quadtreeRef.current.find(searchX, searchY, radius) ?? null;
    setHoveredNode(found);
  }, []);

  const handleMouseLeave = useCallback((): void => setHoveredNode(null), []);

  // Brush (screen-space); selection rectangle cleared on zoom/resize to avoid desync
  useEffect(() => {
    if (!svgOverlayRef.current) return () => {};
    const svgOverlay = d3.select(svgOverlayRef.current);
    svgOverlay.selectAll('.brush').remove();
    svgOverlay.style('pointer-events', 'all');

    const brushG = svgOverlay.append('g').attr('class', 'brush');
    brushGRef.current = brushG;

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
            .filter((d: IScatterNode) => {
              const rawX = xScale(d.x) + margins.left;
              const rawY = yScale(d.y) + margins.top;
              const screenX = transformRef.current.applyX(rawX);
              const screenY = transformRef.current.applyY(rawY);
              return screenX >= x1 && screenX <= x2 && screenY >= y1 && screenY <= y2;
            })
            .map((d: IScatterNode) => d.text);
          dispatch(setSelectedFocusNodes(newlySelected));
        }
      });

    brushRef.current = brush;
    brushG.call(brush);

    return () => {
      brushGRef.current = null;
      brushRef.current = null;
      brushG.remove();
    };
  }, [data, dimensions, dispatch, xScale, yScale, margins]);

  // Zoom
  useEffect(() => {
    if (!svgOverlayRef.current) return () => {};
    const svgOverlay = d3.select(svgOverlayRef.current);

    const zoomed = (event: d3.D3ZoomEvent<SVGSVGElement, undefined>): void => {
      transformRef.current = event.transform;
      clearBrush(); // clear stale brush on zoom/pan
      drawPoints();
    };

    const zoomBehavior = d3
      .zoom<SVGSVGElement, undefined>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .translateExtent([
        [0, 0],
        [dimensions.width, dimensions.height],
      ])
      .extent([
        [0, 0],
        [dimensions.width, dimensions.height],
      ])
      .filter((event: KeyboardEvent | MouseEvent | TouchEvent | d3.D3ZoomEvent<SVGSVGElement, undefined>): boolean => {
        const et = (event as Event).type;
        return et === 'wheel' || et === 'dblclick' || (et === 'mousedown' && ((event as MouseEvent).ctrlKey || (event as MouseEvent).shiftKey));
      })
      .on('zoom', zoomed);

    svgOverlay.call(zoomBehavior);

    const handleDoubleClick = (): void => {
      transformRef.current = d3.zoomIdentity;
      clearBrush();
      svgOverlay.transition().duration(200).call(zoomBehavior.transform, d3.zoomIdentity);
      drawPoints();
    };

    svgOverlay.on('dblclick.zoom', handleDoubleClick);
    return () => {
      svgOverlay.on('.zoom', null);
      svgOverlay.on('dblclick.zoom', null);
    };
  }, [dimensions, drawPoints, clearBrush]);

  // Clear any lingering brush on resize (view changes in screen space)
  useEffect(() => {
    clearBrush();
  }, [dimensions, clearBrush]);

  useEffect(() => {
    drawPoints();
  }, [drawPoints]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <svg
        ref={svgOverlayRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
}

export default InteractiveScatterPlot;
