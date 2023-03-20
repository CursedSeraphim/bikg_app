import React from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Data, Layout } from 'plotly.js';
import { useSelector } from 'react-redux';
import { selectSelectedFocusNodes, selectBarPlotData } from '../Store/CsvSlice';

const Plot = createPlotlyComponent(Plotly);

interface SampleDataItem {
  category: string;
  value: number;
}

function BarPlotSample() {
  const plotData = useSelector(selectBarPlotData) as SampleDataItem[];
  const plotLayout: Partial<Layout> = {
    title: 'Sample Bar Plot',
    xaxis: { title: 'Category' },
    yaxis: { title: 'Value' },
  };

  return <Plot data={plotData} layout={plotLayout} config={{ displayModeBar: false }} />;
}

export default BarPlotSample;
