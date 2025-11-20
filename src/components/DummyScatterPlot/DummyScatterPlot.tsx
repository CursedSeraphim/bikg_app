import * as d3 from 'd3';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';

function ScatterPlot() {
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const generateDummyData = () => {
    return Array.from({ length: 50 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
  };

  const [data] = useState(generateDummyData);

  // this callback will be called whenever the parent element's size changes
  const handleResize = useCallback(
    debounce(() => {
      // if the svg element or its parent element is not mounted, we don't need to do anything
      if (!svgRef.current || !svgRef.current.parentElement) return;
      // get the parent element's size
      const { width, height } = svgRef.current.parentElement.getBoundingClientRect();
      setDimensions({ width, height });
    }, 200),
    [],
  );

  const drawChart = useCallback(() => {
    const { width, height } = dimensions;
    if (width === 0 || height === 0) return;

    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Configure scales
    const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    // Add SVG group for margins
    const chart = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'none') // Ensures no overflow
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Draw X-axis
    chart
      .append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(10))
      .call((g) => g.selectAll('.domain').remove());

    // Draw Y-axis
    chart
      .append('g')
      .call(d3.axisLeft(yScale).ticks(10))
      .call((g) => g.selectAll('.domain').remove());

    // Draw gridlines
    chart.append('g').attr('class', 'grid').call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(''));

    chart.append('g').attr('class', 'grid').attr('transform', `translate(0, ${innerHeight})`).call(d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat(''));

    // Draw circles
    chart
      .selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', 4)
      .attr('fill', 'steelblue');
  }, [data, dimensions]);

  // In this useEffect, we set up a ResizeObserver to listen for changes in the parent element's size.
  useEffect(() => {
    const observer = new ResizeObserver(handleResize);
    if (svgRef.current?.parentElement) {
      // if the parent element is already mounted, we observe it
      observer.observe(svgRef.current.parentElement);
    }

    return () => {
      observer.disconnect();
      handleResize.cancel();
    };
  }, [handleResize]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  return <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />;
}

export default React.memo(ScatterPlot);
