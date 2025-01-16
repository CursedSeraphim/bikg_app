import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'react-redux';
import { UNSELECTED_EXEMPLAR_NODE_COLOR } from '../../constants';
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

function ScatterPlot({ data }: IScatterPlotProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const store = useStore<IRootState>();
  const { dispatch } = store;
  const prevSelectedNodesRef = useRef<string[]>([]); // Ref to hold previous selected nodes
  const brushRef = useRef<d3.BrushBehavior<[number, number]>>(null);

  // Debounced resize observer callback
  const handleResize = useCallback(
    _.debounce(() => {
      if (!svgRef.current) return;
      const { width, height } = svgRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }, 200), // 200ms debounce
    [svgRef],
  );

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => handleResize());

    if (svgRef.current) {
      resizeObserver.observe(svgRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      handleResize.cancel(); // Cancel any pending debounced calls
    };
  }, [handleResize]);

  useEffect(() => {
    if (!dimensions || !svgRef.current) return;

    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const { selectedNodes } = state.combined;

      if (_.isEqual(selectedNodes, prevSelectedNodesRef.current)) return;

      prevSelectedNodesRef.current = selectedNodes;

      d3.select(svgRef.current)
        .selectAll('circle')
        .classed('selected', (d: IScatterNode) => selectedNodes.includes(d.text));
    });

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);

    const xMin = d3.min(data, (d) => d.x) ?? 0;
    const xMax = d3.max(data, (d) => d.x) ?? 0;
    const yMin = d3.min(data, (d) => d.y) ?? 0;
    const yMax = d3.max(data, (d) => d.y) ?? 0;

    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, width]);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([height, 0]);

    const circles = svg.selectAll('circle').data(data);

    circles
      .enter()
      .append('circle')
      .attr('r', 2)
      .merge(circles)
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('fill', UNSELECTED_EXEMPLAR_NODE_COLOR);

    circles.exit().remove();

    brushRef.current = d3
      .brush()
      .extent([
        [0, 0],
        [width, height],
      ])
      .on('end', (event) => {
        const { selection } = event;
        if (!selection) return;

        const [[x1, y1], [x2, y2]] = selection as [[number, number], [number, number]];
        const selectedNodes: IScatterNode[] = [];

        svg.selectAll('circle').classed('selected', (d) => {
          const isSelected = xScale(d.x) >= x1 && xScale(d.x) <= x2 && yScale(d.y) >= y1 && yScale(d.y) <= y2;
          if (isSelected) {
            selectedNodes.push(d.text);
          }
          return isSelected;
        });

        dispatch(setSelectedFocusNodes(selectedNodes));
      });

    svg.select('.brush').remove();
    svg.append('g').attr('class', 'brush').call(brushRef.current);

    return () => {
      unsubscribe();
      d3.select(svgRef.current).selectAll('*').remove(); // Clear SVG on unmount
    };
  }, [data, dimensions, dispatch, store]);

  return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />;
}

export default React.memo(ScatterPlot);
