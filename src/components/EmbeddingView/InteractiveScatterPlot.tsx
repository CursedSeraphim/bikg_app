import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useStore } from 'react-redux';
import _ from 'lodash';
import { UNSELECTED_EXEMPLAR_NODE_COLOR } from '../../constants';
import { setSelectedFocusNodes } from '../Store/CombinedSlice';
import { IRootState } from '../../types';

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

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (!svgRef.current) return;

      const { width, height } = svgRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    });

    if (svgRef.current) {
      resizeObserver.observe(svgRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!dimensions || !svgRef.current) return () => {};

    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const { selectedNodes } = state.combined;

      const svg = d3.select(svgRef.current);
      // always reset brush on selection change
      if (brushRef.current) {
        brushRef.current.move(svg.select('.brush'), null);
      }

      if (_.isEqual(selectedNodes, prevSelectedNodesRef.current)) return;

      prevSelectedNodesRef.current = selectedNodes; // Update previous selected nodes

      svg.selectAll('circle').classed('selected', (d: IScatterNode) => {
        return selectedNodes.includes(d.text);
      });
    });

    const { width, height } = dimensions;

    const svg = d3.select(svgRef.current);

    const xMin = d3.min(data, (d) => d.x);
    const xMax = d3.max(data, (d) => d.x);
    const yMin = d3.min(data, (d) => d.y);
    const yMax = d3.max(data, (d) => d.y);
    // Create scales
    const xScale = d3
      .scaleLinear()
      .domain([xMin !== undefined ? xMin : 0, xMax !== undefined ? xMax : 0])
      .range([0, width]);
    const yScale = d3
      .scaleLinear()
      .domain([yMin !== undefined ? yMin : height, yMax !== undefined ? yMax : 0])
      .range([height, 0]);

    // Data Join
    const circles = svg.selectAll('circle').data(data);

    // Enter
    circles
      .enter()
      .append('circle')
      .attr('r', 2)
      // Update
      .merge(circles)
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('fill', UNSELECTED_EXEMPLAR_NODE_COLOR);

    // Exit
    circles.exit().remove();

    // Brush Logic
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

    // Clear existing brush elements before adding new ones
    d3.select(svgRef.current).select('.brush').remove();

    // Append brush to SVG
    d3.select(svgRef.current).append('g').attr('class', 'brush').call(brushRef.current);

    // Cleanup
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dimensions, dispatch]);

  return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />;
}

export default ScatterPlot;
