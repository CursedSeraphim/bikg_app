import * as d3 from 'd3';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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

/** ---------- Types & helpers ---------- */
function formatLabel(raw: string): string {
  if (!STRIP_BI_PREFIX) return raw;
  return raw.startsWith(BI_PREFIX) ? raw.slice(BI_PREFIX.length) : raw;
}

type Rect = { x1: number; y1: number; x2: number; y2: number };

/** Preprojected point used everywhere during rendering */
type Proj = {
  node: IScatterNode;
  rawX: number; // xScale(x) + margins.left  (pre-transform pixels)
  rawY: number; // yScale(y) + margins.top   (pre-transform pixels)
  label: string; // formatted once (prefix-stripped)
  labelW: number; // measured once at BASE_LABEL_FONT_PX
};

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
    for (let ix = x1; ix <= x2; ix += 1) for (let iy = y1; iy <= y2; iy += 1) cells.push([ix, iy]);
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

  const [hoveredProj, setHoveredProj] = useState<Proj | null>(null);
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
  const selectedSet = useMemo(() => new Set<string>(selectedNodes), [selectedNodes]);

  const store = useStore<IRootState>();
  const { dispatch } = store;

  /** Precompute label widths once at the base font size. */
  const widthCacheRef = useRef<Map<string, number>>(new Map());
  const measureLabelWidth = useCallback(
    (text: string): number => {
      const cached = widthCacheRef.current.get(text);
      if (cached !== undefined) return cached;
      measureCtx.font = `${BASE_LABEL_FONT_PX}px ${LABEL_FONT_FAMILY}`;
      const w = measureCtx.measureText(text).width + 2 * LABEL_PADDING_PX;
      widthCacheRef.current.set(text, w);
      return w;
    },
    [measureCtx],
  );

  /** Preproject data to raw pixel coords (pre-transform), cache label + width. */
  const preprojRef = useRef<Proj[]>([]);
  const quadtreeRef = useRef<d3.Quadtree<Proj>>();
  const buildPreprojection = useCallback(() => {
    const projs: Proj[] = new Array(data.length);
    for (let i = 0; i < data.length; i += 1) {
      const d = data[i];
      const rawX = xScale(d.x) + margins.left;
      const rawY = yScale(d.y) + margins.top;
      const label = formatLabel(d.text);
      const labelW = measureLabelWidth(label);
      projs[i] = { node: d, rawX, rawY, label, labelW };
    }
    preprojRef.current = projs;

    const qt = d3
      .quadtree<Proj>()
      .x((p) => p.rawX)
      .y((p) => p.rawY)
      .addAll(projs);
    quadtreeRef.current = qt;
  }, [data, xScale, yScale, margins, measureLabelWidth]);

  /** Resize handling */
  const handleResize = useCallback((): void => {
    if (!canvasRef.current?.parentElement) return;
    const { width, height } = canvasRef.current.parentElement.getBoundingClientRect();
    setDimensions({ width, height });
  }, []);

  // Ensure dimensions are set before first paint
  useLayoutEffect(() => {
    handleResize();
  }, [handleResize]);

  useEffect(() => {
    const observer = new ResizeObserver(handleResize);
    if (canvasRef.current?.parentElement) observer.observe(canvasRef.current.parentElement);
    return () => observer.disconnect();
  }, [handleResize]);

  /** Collect visible points using quadtree range query in raw-pixel space (pre-transform). */
  const collectVisible = useCallback((): Proj[] => {
    const qt = quadtreeRef.current;
    if (!qt) return preprojRef.current;

    const t = transformRef.current;
    const rx0 = t.invertX(0);
    const ry0 = t.invertY(0);
    const rx1 = t.invertX(dimensions.width);
    const ry1 = t.invertY(dimensions.height);

    const minX = Math.min(rx0, rx1);
    const maxX = Math.max(rx0, rx1);
    const minY = Math.min(ry0, ry1);
    const maxY = Math.max(ry0, ry1);

    const result: Proj[] = [];

    type QTNode<T> = d3.QuadtreeInternalNode<T> | d3.QuadtreeLeaf<T>;

    function isLeaf(node: QTNode<Proj>): node is d3.QuadtreeLeaf<Proj> {
      return (node as d3.QuadtreeLeaf<Proj>).data !== undefined;
    }

    qt.visit((node, x0, y0, x1, y1) => {
      if (x1 < minX || x0 > maxX || y1 < minY || y0 > maxY) return true;
      if (isLeaf(node)) {
        let leaf: d3.QuadtreeLeaf<Proj> | undefined = node;
        do {
          const p = leaf.data;
          if (p.rawX >= minX && p.rawX <= maxX && p.rawY >= minY && p.rawY <= maxY) {
            result.push(p);
          }
          leaf = leaf.next;
        } while (leaf);
      }
      return false;
    });

    return result;
  }, [dimensions.width, dimensions.height]);

  /** Draw frame: only process/draw visible points; declutter labels strictly. */
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

    const t = transformRef.current;
    const { k } = t;
    const tx = t.x;
    const ty = t.y;

    // 1) Visible set via quadtree
    const visible = collectVisible();

    // 2) Draw points batched
    ctx.fillStyle = 'lightgrey';
    ctx.beginPath();
    for (const p of visible) {
      if (selectedSet.has(p.node.text)) continue;
      const sx = k * p.rawX + tx;
      const sy = k * p.rawY + ty;
      if (sx < -8 || sx > width + 8 || sy < -8 || sy > height + 8) continue;
      ctx.moveTo(sx + 4, sy);
      ctx.arc(sx, sy, 4, 0, 2 * Math.PI);
    }
    ctx.fill();

    ctx.fillStyle = '#DA5700';
    ctx.beginPath();
    for (const p of visible) {
      if (!selectedSet.has(p.node.text)) continue;
      const sx = k * p.rawX + tx;
      const sy = k * p.rawY + ty;
      if (sx < -8 || sx > width + 8 || sy < -8 || sy > height + 8) continue;
      ctx.moveTo(sx + 4, sy);
      ctx.arc(sx, sy, 4, 0, 2 * Math.PI);
    }
    ctx.fill();

    // 3) Strict decluttering of labels (screen-space boxes, constant font size)
    const fontPx = BASE_LABEL_FONT_PX;
    const svg = d3.select(svgEl);
    const spatial = new SpatialHash(32);

    type LabelDatum = { p: Proj; sx: number; sy: number; text: string; rect: Rect };
    const candidates: LabelDatum[] = [];

    for (const p of visible) {
      const sx = k * p.rawX + tx;
      const sy = k * p.rawY + ty - LABEL_Y_OFFSET_PX;
      if (sx < -200 || sx > width + 200 || sy < -100 || sy > height + 100) continue;

      const w = p.labelW;
      const h = fontPx + 2;
      const rect: Rect = { x1: sx - w / 2, y1: sy - h, x2: sx + w / 2, y2: sy };
      candidates.push({ p, sx, sy, text: p.label, rect });
    }

    candidates.sort((a, b) => {
      const aSel = selectedSet.has(a.p.node.text);
      const bSel = selectedSet.has(b.p.node.text);
      if (aSel !== bSel) return aSel ? -1 : 1;
      const aw = a.rect.x2 - a.rect.x1;
      const bw = b.rect.x2 - b.rect.x1;
      return aw - bw;
    });

    const visibleLabels: LabelDatum[] = [];
    for (const c of candidates) {
      if (c.rect.x2 < 0 || c.rect.x1 > width || c.rect.y2 < 0 || c.rect.y1 > height) continue;
      if (!spatial.collides(c.rect)) {
        spatial.insert(c.rect);
        visibleLabels.push(c);
      }
    }

    const labels = svg.selectAll<SVGTextElement, LabelDatum>('text.static-label').data(visibleLabels, (d: LabelDatum) => d.p.node.text);

    labels
      .enter()
      .append('text')
      .attr('class', 'static-label')
      .attr('pointer-events', 'none')
      .merge(labels)
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

    // Hover label (always visible)
    type HoverDatum = { p: Proj; sx: number; sy: number; text: string };
    const hoverData: HoverDatum[] = hoveredProj
      ? [
          {
            p: hoveredProj,
            sx: k * hoveredProj.rawX + tx,
            sy: k * hoveredProj.rawY + ty - LABEL_Y_OFFSET_PX,
            text: hoveredProj.label,
          },
        ]
      : [];

    const hoverSel = svg.selectAll<SVGTextElement, HoverDatum>('text.hover-label').data(hoverData, (d: HoverDatum) => d.p.node.text);

    hoverSel
      .enter()
      .append('text')
      .attr('class', 'hover-label')
      .attr('pointer-events', 'none')
      .merge(hoverSel)
      .attr('paint-order', 'stroke')
      .attr('stroke-width', LABEL_STROKE_WIDTH)
      .attr('stroke', 'white')
      .attr('fill', '#111')
      .attr('text-anchor', 'middle')
      .attr('font-family', LABEL_FONT_FAMILY)
      .attr('font-size', fontPx)
      .attr('x', (d: HoverDatum) => d.sx)
      .attr('y', (d: HoverDatum) => d.sy)
      .text((d: HoverDatum) => d.text)
      .raise();

    hoverSel.exit().remove();
  }, [dimensions, collectVisible, hoveredProj, selectedSet]);

  /** rAF-batched redraw */
  const draw = useCallback((): void => {
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      renderFrame();
    });
  }, [renderFrame]);

  /** Build preprojection when data/scales change, then draw immediately (initial paint) */
  useEffect(() => {
    buildPreprojection();
    draw();
  }, [buildPreprojection, draw]);

  /** Pointer handling uses quadtree in raw-pixel space; radius kept in screen px */
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>): void => {
    if (!quadtreeRef.current || !svgOverlayRef.current) return;
    const [mx, my] = d3.pointer(event, svgOverlayRef.current as Element);
    const t = transformRef.current;
    const searchX = t.invertX(mx);
    const searchY = t.invertY(my);
    const r = 6 / Math.max(1e-9, t.k);
    const found = quadtreeRef.current.find(searchX, searchY, r) ?? null;
    setHoveredProj(found);
  }, []);

  const handleMouseLeave = useCallback((): void => setHoveredProj(null), []);

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
        if (!event.selection) return;
        const [[x1, y1], [x2, y2]] = event.selection as [[number, number], [number, number]];

        const t = transformRef.current;
        const newlySelected = preprojRef.current
          .filter((p) => {
            const sx = t.k * p.rawX + t.x;
            const sy = t.k * p.rawY + t.y;
            return sx >= x1 && sx <= x2 && sy >= y1 && sy <= y2;
          })
          .map((p) => p.node.text);

        dispatch(setSelectedFocusNodes(newlySelected));
      });

    brushRef.current = brush;
    brushG.call(brush);

    return () => {
      brushGRef.current = null;
      brushRef.current = null;
      brushG.remove();
    };
  }, [dimensions, dispatch, margins]);

  // Zoom: clear brush (screen-space) and rAF redraw
  useEffect(() => {
    if (!svgOverlayRef.current) return () => {};
    const svgOverlay = d3.select(svgOverlayRef.current);

    const zoomed = (event: d3.D3ZoomEvent<SVGSVGElement, undefined>): void => {
      transformRef.current = event.transform;
      if (brushGRef.current && brushRef.current) {
        brushRef.current.move(brushGRef.current as d3.Selection<SVGGElement, unknown, null, undefined>, null);
      }
      draw();
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
      if (brushGRef.current && brushRef.current) {
        brushRef.current.move(brushGRef.current as d3.Selection<SVGGElement, unknown, null, undefined>, null);
      }
      svgOverlay
        .transition()
        .duration(200)
        // wrap transform so TS knows this .call receives a Transition, not a Selection
        .call((tr: d3.Transition<SVGSVGElement, undefined, null, undefined>) => {
          zoomBehavior.transform(tr, d3.zoomIdentity);
        });
      draw();
    };

    svgOverlay.on('dblclick.zoom', handleDoubleClick);
    return () => {
      svgOverlay.on('.zoom', null);
      svgOverlay.on('dblclick.zoom', null);
    };
  }, [dimensions, draw]);

  // Clear any lingering brush on resize (view changes in screen space)
  useEffect(() => {
    if (brushGRef.current && brushRef.current) {
      brushRef.current.move(brushGRef.current as d3.Selection<SVGGElement, unknown, null, undefined>, null);
    }
  }, [dimensions]);

  // In case other deps change, ensure a redraw
  useEffect(() => {
    draw();
  }, [draw]);

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
