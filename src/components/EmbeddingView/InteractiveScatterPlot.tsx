import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { UNSELECTED_EXEMPLAR_NODE_COLOR } from '../../constants';

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
    if (!dimensions || !svgRef.current) return;

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
    const brush = d3
      .brush()
      .extent([
        [0, 0],
        [width, height],
      ])
      .on('end', (event) => {
        const { selection } = event;
        if (!selection) return;

        const [[x1, y1], [x2, y2]] = selection as [[number, number], [number, number]];

        svg.selectAll('circle').classed('selected', (d) => {
          return xScale(d.x) >= x1 && xScale(d.x) <= x2 && yScale(d.y) >= y1 && yScale(d.y) <= y2;
        });
      });

    // Clear existing brush elements before adding new ones
    svg.select('.brush').remove();

    // Append brush to SVG
    svg.append('g').attr('class', 'brush').call(brush);
  }, [data, dimensions]);

  return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />;
}

export default ScatterPlot;
