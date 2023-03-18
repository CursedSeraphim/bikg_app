import React from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Data, Layout } from 'plotly.js';

const Plot = createPlotlyComponent(Plotly);

function BarPlotSample() {
  const sampleData = [
    { category: 'A', value: 10 },
    { category: 'B', value: 15 },
    { category: 'C', value: 12 },
    { category: 'D', value: 20 },
    { category: 'E', value: 8 },
  ];

  const plotData: Data[] = [
    {
      x: sampleData.map((d) => d.category),
      y: sampleData.map((d) => d.value),
      type: 'bar',
      marker: {
        color: 'steelblue',
      },
    },
  ];

  const plotLayout: Partial<Layout> = {
    title: 'Sample Bar Plot',
    xaxis: { title: 'Category' },
    yaxis: { title: 'Value' },
  };

  return <Plot data={plotData} layout={plotLayout} config={{ displayModeBar: false }} />;
}

export default BarPlotSample;
