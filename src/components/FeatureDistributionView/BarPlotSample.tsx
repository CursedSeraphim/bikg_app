import React, { useState, useEffect } from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Data, Layout } from 'plotly.js';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedFocusNodes, selectBarPlotData } from '../Store/CombinedSlice';
import { CsvData } from '../Store/types';

import { csvDataToBarPlotDataGivenFeature, csvDataToBarPlotDataGivenFeatureOverallDistribution } from './csvToPlotlyFeatureData';
import { replacePrefixWithUrl, replaceUrlWithPrefix } from '../../utils';

const Plot = createPlotlyComponent(Plotly);
// TODO control this with checkboxes and a data store
const showOverallDistribution = true;
const subSelection = false;

function getBarPlotData(feature: string, selectedNodes: string[], samples: CsvData[]): Data[] {
  const selectionBarPlotData = csvDataToBarPlotDataGivenFeature(feature, selectedNodes, samples);
  if (showOverallDistribution) {
    const overallBarPlotData = csvDataToBarPlotDataGivenFeatureOverallDistribution(feature, samples);

    return [
      {
        x: overallBarPlotData.x,
        y: overallBarPlotData.y,
        type: 'bar',
        name: 'Overall Distribution',
        marker: {
          color: 'lightgrey',
        },
      },
      {
        x: selectionBarPlotData.x,
        y: selectionBarPlotData.y,
        type: 'bar',
        name: 'Selected Nodes',
        marker: {
          color: 'steelblue',
        },
      },
    ];
  }
  return [
    {
      x: selectionBarPlotData.x,
      y: selectionBarPlotData.y,
      type: 'bar',
      name: 'Selected Nodes',
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
    showlegend: false,
    barmode: 'overlay',
  };

  const handleSelection = (eventData) => {
    if (eventData?.points && eventData.points.length > 0) {
      const selectedValues = eventData.points.map((point) => point.x);

      // Convert abbreviated values to their original form
      const originalSelectedValues = selectedValues.map((value) => replacePrefixWithUrl(value));

      // from all data samples get those where the feature value matches and retrieve their focus_node
      const matchingSamples = data.samples.filter((sample) => originalSelectedValues.includes(sample[feature]));
      const matchingFocusNodes = matchingSamples.map((sample) => sample.focus_node);

      if (!subSelection) {
        dispatch(setSelectedFocusNodes(matchingFocusNodes));
      } else {
        // further filter the data.selectedNodes to only those that match the focus_node
        const updatedSelectedNodes = data.selectedNodes.filter((node) => matchingFocusNodes.includes(node));
        dispatch(setSelectedFocusNodes(updatedSelectedNodes));
      }
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
