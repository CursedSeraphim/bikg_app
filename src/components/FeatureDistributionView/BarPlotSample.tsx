import React from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Data, Layout } from 'plotly.js';
import { useSelector } from 'react-redux';
import { selectSelectedFocusNodes, selectBarPlotData } from '../Store/CsvSlice';
import { csvDataToBarPlotDataGivenFeature } from './csvToPlotlyFeatureData';

const Plot = createPlotlyComponent(Plotly);

interface SampleDataItem {
  category: string;
  value: number;
}

interface BarPlotDataState {
  selectedNodes: any;
  samples: any;
}

const getBarPlotData = (feature: string, selectedNodes: any, samples: any): Data[] => {
  const barPlotData = csvDataToBarPlotDataGivenFeature(feature, selectedNodes, samples);

  return [
    {
      x: barPlotData.x,
      y: barPlotData.y,
      type: 'bar',
      marker: {
        color: 'steelblue',
      },
    },
  ];
};

function BarPlotSample(props) {
  const { feature } = props;
  const data = useSelector(selectBarPlotData) as BarPlotDataState;
  const plotData = getBarPlotData(feature, data.selectedNodes, data.samples);
  const plotLayout: Partial<Layout> = {
    title: feature,
    titlefont: { size: 12 },
    xaxis: { title: null, titlefont: { size: 12 }, tickfont: { size: 10 } },
    yaxis: { title: null, titlefont: { size: 12 }, tickfont: { size: 10 } },
    height: 100,
    margin: {
      l: 20,
      r: 20,
      b: 20,
      t: 20,
      pad: 0,
    },
  };

  return (
    <div className="bar-plot-container">
      <Plot data={plotData} layout={plotLayout} config={{ displayModeBar: false, responsive: true }} useResizeHandler style={{ width: '100%' }} />
    </div>
  );
}

export default BarPlotSample;
