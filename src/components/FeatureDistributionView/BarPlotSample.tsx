import React, { useState, useEffect } from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Data, Layout } from 'plotly.js';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedFocusNodes, selectSelectedFocusNodes, selectBarPlotData } from '../Store/CsvSlice';

import { csvDataToBarPlotDataGivenFeature } from './csvToPlotlyFeatureData';
import { replacePrefixWithUrl, replaceUrlWithPrefix } from '../../utils';

const Plot = createPlotlyComponent(Plotly);

function getBarPlotData(feature: string, selectedNodes: any, samples: any): Data[] {
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
}

function BarPlotSample(props) {
  const { feature } = props;
  const dispatch = useDispatch();
  const data = useSelector(selectBarPlotData);
  const [localSelectedFocusNodes, setLocalSelectedFocusNodes] = useState<string[]>([]);

  useEffect(() => {
    if (localSelectedFocusNodes.length) {
      // Process the selected focus nodes or pass them to a callback function
    }
  }, [localSelectedFocusNodes]);

  const plotData = getBarPlotData(feature, data.selectedNodes, data.samples);
  const plotLayout: Partial<Layout> = {
    title: replaceUrlWithPrefix(feature),
    titlefont: { size: 12 },
    xaxis: { title: null, titlefont: { size: 12 }, tickfont: { size: 10 } },
    yaxis: { title: null, titlefont: { size: 12 }, tickfont: { size: 10 } },
    dragmode: 'lasso',
    height: 100,
    margin: {
      l: 20,
      r: 20,
      b: 40,
      t: 20,
      pad: 0,
    },
  };

  const handleSelection = (eventData) => {
    if (eventData?.points && eventData.points.length > 0) {
      const selectedValues = eventData.points.map((point) => point.x);

      // Convert abbreviated values to their original form
      const originalSelectedValues = selectedValues.map((value) => replacePrefixWithUrl(value));

      // from all data samples get those where the feature value matches and retrieve their focus_node
      const matchingSamples = data.samples.filter((sample) => originalSelectedValues.includes(sample[feature]));
      const matchingFocusNodes = matchingSamples.map((sample) => sample.focus_node);

      // further filter the data.selectedNodes to only those that match the focus_node
      const updatedSelectedNodes = data.selectedNodes.filter((node) => matchingFocusNodes.includes(node));

      console.log('updatedSelectedNodes', updatedSelectedNodes);
      console.log('feature', feature);

      setLocalSelectedFocusNodes(updatedSelectedNodes);
      dispatch(setSelectedFocusNodes(updatedSelectedNodes));
    }
  };

  return (
    <div className="bar-plot-container">
      <Plot
        data={plotData}
        layout={plotLayout}
        onSelected={handleSelection}
        config={{ displayModeBar: false, responsive: true }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    </div>
  );
}

export default BarPlotSample;
