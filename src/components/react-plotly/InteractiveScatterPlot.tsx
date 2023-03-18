import React, { useState, useEffect } from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Data, Layout } from 'plotly.js';

const Plot = createPlotlyComponent(Plotly);

interface InteractiveScatterPlotProps {
  data: any[];
  onDataSelected?: (data: any[]) => void;
}

function InteractiveScatterPlot({ data, onDataSelected }: InteractiveScatterPlotProps) {
  const [selectedData, setSelectedData] = useState([]);

  const plotData: Data[] = [
    {
      x: data.map((d) => d.x),
      y: data.map((d) => d.y),
      mode: 'markers',
      type: 'scatter',
      marker: { color: 'steelblue', size: 6 },
    },
  ];

  const plotLayout: Partial<Layout> = {
    hovermode: 'closest',
    dragmode: 'lasso',
    xaxis: { title: 'X-axis' },
    yaxis: { title: 'Y-axis' },
  };

  const handleSelection = (eventData) => {
    if (eventData?.points) {
      const selectedPoints = eventData.points.map((point) => data[point.pointIndex]);
      setSelectedData(selectedPoints);
    }
  };

  useEffect(() => {
    if (selectedData.length) {
      // Process the selected data or pass it to a callback function
      console.log('Selected data:', selectedData);
      if (onDataSelected) {
        onDataSelected(selectedData);
      }
    }
  }, [selectedData, onDataSelected]);

  return <Plot data={plotData} layout={plotLayout} onSelected={handleSelection} config={{ displayModeBar: false }} />;
}

export default InteractiveScatterPlot;
